import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  X, Plus, Eye, Trash2, FileText, CheckCircle,
  Palette, Star, Copy, MoreVertical, Clock,
} from 'lucide-react'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { LmsDataPanel } from '@/components/lms/management'
import { fmtDate, fmtNum } from '@/components/lms/lmsFormatters'
import {
  fetchCertificateTemplates,
  fetchDefaultCertificateTemplate,
  createDesignerTemplate,
  deleteCertificateTemplate,
  setTemplateAsDefault,
  duplicateTemplate,
  previewTemplate,
  type CertificateTemplate,
  type CertificateType,
  type CreateTemplatePayload,
} from '@/api/certificatesApi'
import { CERT_TYPE_LABELS } from './certificateLabels'

const LANG_LABELS: Record<string, string> = {
  arabic: 'عربي',
  english: 'إنجليزي',
  bilingual: 'ثنائي اللغة',
}

const LANG_COLORS: Record<string, string> = {
  arabic: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  english: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  bilingual: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
}

const EMPTY_FORM: CreateTemplatePayload = {
  name: '',
  type: 'course_completion',
  language: 'bilingual',
}

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-[#0C2A4B]/10 bg-white p-5 shadow-sm">
      <div className="mb-3 h-3 w-1/2 rounded-full bg-slate-200" />
      <div className="mb-5 h-2 w-1/3 rounded-full bg-slate-100" />
      <div className="flex gap-2">
        <div className="h-7 w-20 rounded-lg bg-slate-100" />
        <div className="h-7 w-16 rounded-lg bg-slate-100" />
      </div>
    </div>
  )
}

// Action dropdown per card
function CardMenu({
  template,
  onPreview,
  onSetDefault,
  onDuplicate,
  onDelete,
}: {
  template: CertificateTemplate
  onPreview: () => void
  onSetDefault: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5 text-[#0C2A4B]/40 transition hover:bg-[#0C2A4B]/5 hover:text-[#0C2A4B]"
      >
        <MoreVertical size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-8 z-[101] min-w-[160px] overflow-hidden rounded-xl border border-[#0C2A4B]/10 bg-white shadow-xl"
              dir="rtl"
            >
              <button
                type="button"
                onClick={() => { setOpen(false); onPreview() }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold text-[#0C2A4B] transition hover:bg-slate-50"
              >
                <Eye size={13} className="text-[#0077B6]" />
                معاينة
              </button>
              {!template.is_default && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onSetDefault() }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold text-[#0C2A4B] transition hover:bg-slate-50"
                >
                  <Star size={13} className="text-amber-500" />
                  تعيين كافتراضي
                </button>
              )}
              <button
                type="button"
                onClick={() => { setOpen(false); onDuplicate() }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold text-[#0C2A4B] transition hover:bg-slate-50"
              >
                <Copy size={13} className="text-emerald-500" />
                نسخ القالب
              </button>
              {!template.is_default && (
                <>
                  <div className="border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => { setOpen(false); onDelete() }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 size={13} />
                    حذف
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

const LOAD_ERROR = 'تعذّر تحميل القوالب. تحقق من الاتصال وأعد المحاولة.'

/** Pure I/O — kept outside the component so the mount effect and the imperative reload
 *  share it without either having to call a state-mutating callback.
 *  Falls back to auto-creating the default template when none exist. */
async function fetchTemplateList(): Promise<CertificateTemplate[]> {
  const list = await fetchCertificateTemplates()
  if (list.length > 0) return list
  return [await fetchDefaultCertificateTemplate()]
}

export default function AdminCertificateTemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<CertificateTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create modal
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<CreateTemplatePayload>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)

  /** Imperative refresh/retry from a button — outside any effect, so flipping to the
   *  loading state synchronously is fine here. */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTemplates(await fetchTemplateList())
    } catch {
      setError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const list = await fetchTemplateList()
        if (alive) setTemplates(list)
      } catch {
        if (alive) setError(LOAD_ERROR)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  // ESC closes modals
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (previewOpen) setPreviewOpen(false)
        else if (modalOpen) setModalOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen, previewOpen])

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const t = await createDesignerTemplate(form)
      setModalOpen(false)
      navigate(`/dashboard/admin/certificates/templates/${t.id}/designer`)
    } catch (err) {
      const e = err as { apiMessage?: string }
      setSaveError(e.apiMessage ?? 'حدث خطأ أثناء الإنشاء.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSetDefault(t: CertificateTemplate) {
    try {
      const updated = await setTemplateAsDefault(t.id)
      setTemplates((prev) =>
        prev.map((x) => ({ ...x, is_default: x.id === updated.id })),
      )
    } catch { /* ignore */ }
  }

  async function handleDuplicate(t: CertificateTemplate) {
    try {
      const clone = await duplicateTemplate(t.id)
      setTemplates((prev) => [...prev, clone])
    } catch { /* ignore */ }
  }

  async function handleDelete(id: number) {
    const t = templates.find(x => x.id === id)
    if ((t?.certificates_count ?? 0) > 0) {
      alert(`لا يمكن حذف هذا القالب لأنه مستخدم في ${t!.certificates_count} شهادة.`)
      return
    }
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return
    try {
      await deleteCertificateTemplate(id)
      setTemplates((prev) => prev.filter((x) => x.id !== id))
    } catch (err) {
      const e = err as { apiMessage?: string; response?: { data?: { message?: string } } }
      const msg = e.apiMessage ?? e.response?.data?.message ?? 'تعذّر حذف القالب.'
      alert(msg)
    }
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
      description="إنشاء وتعديل قوالب الشهادات البصرية"
      breadcrumb="القوالب"
      kpis={[
        { label: 'إجمالي القوالب', value: fmtNum(templates.length), icon: FileText, variant: 'brand' },
        { label: 'مفعّلة', value: fmtNum(templates.filter((t) => t.is_active).length), icon: CheckCircle, variant: 'success' },
        { label: 'المصمم المرئي', value: fmtNum(templates.filter((t) => t.designer_mode).length), icon: Palette, variant: 'muted' },
      ]}
      loading={false}
      error={error}
      onRetry={load}
      onRefresh={load}
      action={
        <button
          type="button"
          onClick={() => { setForm(EMPTY_FORM); setSaveError(null); setModalOpen(true) }}
          className="flex items-center gap-2 rounded-xl bg-[#F28C00] px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-[#d07e2a]"
        >
          <Plus size={14} />
          قالب جديد
        </button>
      }
    >
      <LmsDataPanel footer={`${fmtNum(templates.length)} قالب`}>
        {/* Cards grid */}
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3" dir="rtl">
          {loading && [1, 2, 3].map((k) => <SkeletonCard key={k} />)}

          {!loading && templates.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative flex flex-col rounded-2xl border border-[#0C2A4B]/10 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              {/* Header row */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-[13px] font-black text-[#0C2A4B]">{t.name}</h3>
                    {t.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 ring-1 ring-amber-300">
                        <Star size={9} className="fill-amber-500 text-amber-500" />
                        افتراضي
                      </span>
                    )}
                    {t.designer_mode && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">
                        مصمم
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#0077B6]/10 px-2 py-0.5 text-[10px] font-bold text-[#0077B6]">
                      {CERT_TYPE_LABELS[t.type] ?? t.type}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LANG_COLORS[t.language] ?? 'bg-slate-100 text-slate-600'}`}>
                      {LANG_LABELS[t.language] ?? t.language}
                    </span>
                    {t.is_active ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">مفعّل</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">معطّل</span>
                    )}
                  </div>
                </div>
                <CardMenu
                  template={t}
                  onPreview={() => void handlePreview(t.id)}
                  onSetDefault={() => void handleSetDefault(t)}
                  onDuplicate={() => void handleDuplicate(t)}
                  onDelete={() => void handleDelete(t.id)}
                />
              </div>

              {/* Usage count */}
              {t.certificates_count != null && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#06182C]/[0.03] px-3 py-2">
                  <FileText size={11} className="text-[#06182C]/30" />
                  <span className="text-[11px] font-bold text-[#06182C]/50">
                    مستخدم في{' '}
                    <span className={t.certificates_count > 0 ? 'font-black text-[#0077B6]' : ''}>
                      {fmtNum(t.certificates_count)}
                    </span>{' '}
                    شهادة
                  </span>
                </div>
              )}

              {/* Date */}
              <div className="mt-2 flex items-center gap-1 pt-1 text-[10px] text-[#0C2A4B]/40">
                <Clock size={10} />
                <span>آخر تعديل: {fmtDate(t.updated_at ?? t.created_at)}</span>
              </div>

              {/* Primary action */}
              <button
                type="button"
                onClick={() => navigate(`/dashboard/admin/certificates/templates/${t.id}/designer`)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0C2A4B] py-2 text-[12px] font-black text-white transition hover:bg-[#0077B6]"
              >
                <Palette size={13} />
                فتح المصمم
              </button>
            </motion.div>
          ))}

          {!loading && templates.length === 0 && (
            <div className="col-span-3 py-16 text-center">
              <FileText size={40} className="mx-auto mb-3 text-[#0C2A4B]/20" />
              <p className="text-sm font-bold text-[#0C2A4B]/40">لا توجد قوالب — أنشئ أول قالب</p>
            </div>
          )}
        </div>
      </LmsDataPanel>

      {/* Create modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              dir="rtl"
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
            >
            <div
              className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-[15px] font-black text-[#0C2A4B]">قالب جديد</h2>
                  <p className="mt-0.5 text-[11px] text-[#0C2A4B]/40">سيتم فتح المصمم المرئي تلقائياً بعد الإنشاء</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl p-2 text-[#0C2A4B]/40 transition hover:bg-slate-100 hover:text-[#0C2A4B]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 p-6">
                {/* Name */}
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-black text-[#0C2A4B]">اسم القالب <span className="text-rose-500">*</span></span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="مثال: شهادة إتمام دورة الصيف"
                    autoFocus
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-[#0C2A4B] placeholder:text-slate-300 focus:border-[#0077B6] focus:outline-none focus:ring-2 focus:ring-[#0077B6]/20"
                  />
                </label>

                {/* Type */}
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-black text-[#0C2A4B]">نوع الشهادة</span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CertificateType }))}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-[#0C2A4B] focus:border-[#0077B6] focus:outline-none"
                  >
                    {Object.entries(CERT_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </label>

                {/* Language */}
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-black text-[#0C2A4B]">اللغة</span>
                  <select
                    value={form.language}
                    onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as CreateTemplatePayload['language'] }))}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-[#0C2A4B] focus:border-[#0077B6] focus:outline-none"
                  >
                    <option value="bilingual">ثنائي اللغة (عربي + إنجليزي)</option>
                    <option value="arabic">عربي فقط</option>
                    <option value="english">English only</option>
                  </select>
                </label>

                {/* Base template info card */}
                <div className="flex items-start gap-3 rounded-xl bg-[#0C2A4B]/[0.03] p-3.5">
                  <Palette size={16} className="mt-0.5 shrink-0 text-violet-500" />
                  <div>
                    <p className="text-[12px] font-black text-[#0C2A4B]">قالب EMC الرسمي</p>
                    <p className="mt-0.5 text-[11px] text-[#0C2A4B]/50">
                      سيتم استخدام التصميم الافتراضي كنقطة انطلاق. يمكنك تخصيصه بالكامل من المصمم المرئي.
                    </p>
                  </div>
                </div>

                {saveError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-bold text-rose-700">
                    {saveError}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-black text-[#0C2A4B]/60 transition hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={saving || !form.name.trim()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0C2A4B] py-2.5 text-[13px] font-black text-white transition hover:bg-[#0077B6] disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Palette size={14} />
                    )}
                    {saving ? 'جارٍ الإنشاء...' : 'إنشاء وفتح المصمم'}
                  </button>
                </div>
              </div>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview modal */}
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
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4" dir="rtl">
                <h3 className="font-black text-[#0C2A4B]">معاينة القالب</h3>
                <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-xl p-2 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {loadingPreview ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0077B6] border-t-transparent" />
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
