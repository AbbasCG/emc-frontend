import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus, Eye, Power, Trash2, FileText, CheckCircle, XCircle } from 'lucide-react'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { LmsDataPanel } from '@/components/lms/management'
import { fmtDate, fmtNum } from '@/components/lms/lmsFormatters'
import {
  fetchCertificateTemplates,
  createCertificateTemplate,
  updateCertificateTemplate,
  deleteCertificateTemplate,
  toggleTemplateActive,
  previewTemplate,
  type CertificateTemplate,
  type CertificateType,
} from '@/api/certificatesApi'
import { CERT_TYPE_LABELS } from './AdminCertificatesPage'

const LANG_LABELS: Record<string, string> = {
  arabic: 'عربي',
  english: 'إنجليزي',
  bilingual: 'ثنائي اللغة',
}

const PLACEHOLDERS = [
  '{{recipient_name}}',
  '{{certificate_code}}',
  '{{issued_at}}',
  '{{course_title}}',
  '{{workshop_title}}',
  '{{track_name}}',
  '{{issued_by}}',
  '{{organization_name}}',
  '{{certificate_type}}',
]

type DrawerMode = 'create' | 'edit'

const EMPTY_FORM = {
  name: '',
  type: 'course_completion' as CertificateType,
  language: 'arabic' as 'arabic' | 'english' | 'bilingual',
  code_prefix: 'EMC-CR',
  is_active: true,
  html_template: '',
  css_template: '',
}

export default function AdminCertificateTemplatesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)

  const htmlRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchCertificateTemplates()
      .then(setTemplates)
      .catch(() => setError('تعذّر تحميل القوالب. تحقق من الاتصال وأعد المحاولة.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setDrawerMode('create')
    setSaveError(null)
    setDrawerOpen(true)
  }

  function openEdit(t: CertificateTemplate) {
    setForm({
      name: t.name,
      type: t.type,
      language: t.language,
      code_prefix: t.code_prefix,
      is_active: t.is_active,
      html_template: t.html_template,
      css_template: t.css_template ?? '',
    })
    setEditingId(t.id)
    setDrawerMode('edit')
    setSaveError(null)
    setDrawerOpen(true)
  }

  function insertPlaceholder(ph: string) {
    const el = htmlRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const val = form.html_template
    const next = val.slice(0, start) + ph + val.slice(end)
    setForm((f) => ({ ...f, html_template: next }))
    requestAnimationFrame(() => {
      el.setSelectionRange(start + ph.length, start + ph.length)
      el.focus()
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      if (drawerMode === 'create') {
        const t = await createCertificateTemplate(form)
        setTemplates((prev) => [t, ...prev])
      } else if (editingId != null) {
        const t = await updateCertificateTemplate(editingId, form)
        setTemplates((prev) => prev.map((x) => (x.id === editingId ? t : x)))
      }
      setDrawerOpen(false)
    } catch (err) {
      const e = err as { apiMessage?: string }
      setSaveError(e.apiMessage ?? 'حدث خطأ أثناء الحفظ.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(t: CertificateTemplate) {
    try {
      const updated = await toggleTemplateActive(t.id)
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? updated : x)))
    } catch { /* ignore */ }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return
    try {
      await deleteCertificateTemplate(id)
      setTemplates((prev) => prev.filter((x) => x.id !== id))
    } catch { /* ignore */ }
  }

  async function handlePreview(id: number) {
    setLoadingPreview(true)
    setPreviewOpen(true)
    setPreviewHtml('')
    try {
      const html = await previewTemplate(id)
      setPreviewHtml(html)
    } catch {
      setPreviewHtml('<p style="color:red;text-align:center;padding:2rem">تعذّر تحميل المعاينة</p>')
    } finally {
      setLoadingPreview(false)
    }
  }

  return (
    <AdminLmsShell
      title="قوالب الشهادات"
      description="إنشاء وتعديل قوالب الشهادات لأنواع مختلفة"
      breadcrumb="القوالب"
      kpis={[
        { label: 'إجمالي القوالب', value: fmtNum(templates.length), icon: FileText, variant: 'brand' },
        { label: 'مفعّلة', value: fmtNum(templates.filter((t) => t.is_active).length), icon: CheckCircle, variant: 'success' },
        { label: 'معطّلة', value: fmtNum(templates.filter((t) => !t.is_active).length), icon: XCircle, variant: 'muted' },
      ]}
      loading={loading}
      error={error}
      onRetry={load}
      onRefresh={load}
      action={
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#f4a320] px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-[#e0921a]"
        >
          <Plus size={14} />
          قالب جديد
        </button>
      }
    >
      <LmsDataPanel footer={`${fmtNum(templates.length)} قالب`}>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-[#0d1b2a]/[0.05] bg-[#0d1b2a]/[0.02]">
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">الاسم</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">النوع</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">اللغة</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">البادئة</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">الحالة</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">تاريخ الإنشاء</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0d1b2a]/[0.04]">
              {templates.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-[#0d1b2a]/[0.015]">
                  <td className="px-5 py-4 font-bold text-[#0d1b2a]">{t.name}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-[#2691C2]/10 px-2.5 py-1 text-[11px] font-black text-[#2691C2]">
                      {CERT_TYPE_LABELS[t.type] ?? t.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[12px] font-semibold text-[#0d1b2a]/60">{LANG_LABELS[t.language] ?? t.language}</td>
                  <td className="px-5 py-4 font-mono text-[12px] text-[#0d1b2a]/60">{t.code_prefix}</td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => void handleToggle(t)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black transition ${
                        t.is_active
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <Power size={10} />
                      {t.is_active ? 'مفعّل' : 'معطّل'}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-[12px] text-[#0d1b2a]/50">{fmtDate(t.created_at)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handlePreview(t.id)}
                        className="rounded-lg bg-[#2691C2]/10 p-1.5 text-[#2691C2] transition hover:bg-[#2691C2]/20"
                        title="معاينة"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-[#0d1b2a]/60 transition hover:bg-slate-200"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(t.id)}
                        className="rounded-lg bg-rose-50 p-1.5 text-rose-500 transition hover:bg-rose-100"
                        title="حذف"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm font-semibold text-[#0d1b2a]/30">
                    لا توجد قوالب بعد — أنشئ أول قالب
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </LmsDataPanel>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              dir="rtl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
                <h2 className="text-base font-black text-[#0d1b2a]">
                  {drawerMode === 'create' ? 'قالب جديد' : 'تعديل القالب'}
                </h2>
                <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-xl p-2 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-[12px] font-black text-[#0d1b2a]">اسم القالب</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-[#2691C2] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/20"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-[12px] font-black text-[#0d1b2a]">نوع الشهادة</span>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CertificateType }))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-[#2691C2] focus:outline-none"
                    >
                      {Object.entries(CERT_TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-[12px] font-black text-[#0d1b2a]">اللغة</span>
                    <select
                      value={form.language}
                      onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as 'arabic' | 'english' | 'bilingual' }))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-[#2691C2] focus:outline-none"
                    >
                      <option value="arabic">عربي</option>
                      <option value="english">إنجليزي</option>
                      <option value="bilingual">ثنائي اللغة</option>
                    </select>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-[12px] font-black text-[#0d1b2a]">بادئة الرمز</span>
                    <input
                      type="text"
                      value={form.code_prefix}
                      onChange={(e) => setForm((f) => ({ ...f, code_prefix: e.target.value }))}
                      placeholder="EMC-CR"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold font-mono focus:border-[#2691C2] focus:outline-none"
                    />
                  </label>
                </div>

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="accent-[#2691C2]"
                  />
                  <span className="text-[12px] font-black text-[#0d1b2a]">القالب مفعّل</span>
                </label>

                {/* HTML Template */}
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black text-[#0d1b2a]">قالب HTML</span>
                  </div>
                  {/* Placeholder chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => insertPlaceholder(ph)}
                        className="rounded-lg bg-[#2691C2]/10 px-2 py-1 font-mono text-[10px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/20"
                      >
                        {ph}
                      </button>
                    ))}
                  </div>
                  <textarea
                    ref={htmlRef}
                    value={form.html_template}
                    onChange={(e) => setForm((f) => ({ ...f, html_template: e.target.value }))}
                    rows={12}
                    placeholder="<div class='certificate'>...</div>"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-[12px] text-[#0d1b2a] focus:border-[#2691C2] focus:outline-none focus:ring-2 focus:ring-[#2691C2]/20"
                  />
                </div>

                {/* CSS Template */}
                <div className="grid gap-1.5">
                  <span className="text-[12px] font-black text-[#0d1b2a]">CSS (اختياري)</span>
                  <textarea
                    value={form.css_template}
                    onChange={(e) => setForm((f) => ({ ...f, css_template: e.target.value }))}
                    rows={6}
                    placeholder=".certificate { ... }"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-[12px] text-[#0d1b2a] focus:border-[#2691C2] focus:outline-none"
                  />
                </div>

                {saveError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    {saveError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-black text-[#0d1b2a]/60 transition hover:bg-slate-50">
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || !form.name}
                    className="rounded-xl bg-[#2691C2] px-6 py-2.5 text-sm font-black text-white shadow-md transition hover:bg-[#1e7aaa] disabled:opacity-50"
                  >
                    {saving ? 'جارٍ الحفظ...' : 'حفظ القالب'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setPreviewOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 z-[60] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="font-black text-[#0d1b2a]">معاينة القالب</h3>
                <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-xl p-2 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {loadingPreview ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2691C2] border-t-transparent" />
                  </div>
                ) : (
                  <iframe
                    srcDoc={previewHtml}
                    className="h-full w-full border-0"
                    title="معاينة الشهادة"
                    sandbox="allow-same-origin"
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminLmsShell>
  )
}
