import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Upload, FileText, Trash2, Building2, Crown, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import type { FinancialRequest, MyFinancialContext } from '@/api/financialRequestsApi'
import {
  createFinancialRequest,
  updateFinancialRequest,
  uploadAttachment,
  fetchMyFinancialContext,
} from '@/api/financialRequestsApi'

interface Props {
  initial?: FinancialRequest
  onClose: () => void
  onSaved: (req: FinancialRequest) => void
}

const TYPES = [
  { value: 'budget',              label: 'ميزانية' },
  { value: 'purchase',            label: 'مشتريات' },
  { value: 'invoice_payment',     label: 'دفع فاتورة' },
  { value: 'reimbursement',       label: 'استرداد مصاريف' },
  { value: 'operational_expense', label: 'مصروف تشغيلي' },
  { value: 'transfer',            label: 'تحويل' },
  { value: 'other',               label: 'أخرى' },
]

const PRIORITIES = [
  { value: 'low',    label: 'منخفضة', color: 'text-slate-500' },
  { value: 'normal', label: 'عادية',  color: 'text-blue-600' },
  { value: 'high',   label: 'عالية',  color: 'text-amber-600' },
  { value: 'urgent', label: 'عاجلة',  color: 'text-red-600' },
]

const CURRENCIES = ['SAR', 'USD', 'EUR', 'AED', 'GBP']

const INPUT_BASE = 'w-full rounded-xl border bg-white px-4 py-3 text-sm text-deepBlue transition focus:outline-none focus:ring-2 focus:ring-customBlue/40 focus:border-customBlue placeholder:text-slate-400'
const LABEL = 'block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5'

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-100" />
      <div className="text-center">
        <span className="text-[11px] font-black uppercase tracking-widest text-customOrange">{title}</span>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  )
}

export default function FinancialRequestForm({ initial, onClose, onSaved }: Props) {
  const [ctx, setCtx] = useState<MyFinancialContext | null>(null)
  const [ctxLoading, setCtxLoading] = useState(true)

  // Form state
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [type, setType] = useState(initial?.request_type ?? 'purchase')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [currency, setCurrency] = useState(initial?.currency ?? 'SAR')
  const [neededBy, setNeededBy] = useState(initial?.needed_by_date ?? '')
  const [priority, setPriority] = useState(initial?.priority ?? 'normal')
  const [departmentId, setDepartmentId] = useState<number | null>(initial?.department?.id ?? null)

  // Staged files for new request (uploaded after creation)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadCtx = useCallback(async () => {
    try {
      const data = await fetchMyFinancialContext()
      setCtx(data)
      if (!departmentId && data.primary_department) {
        setDepartmentId(data.primary_department.id)
      }
    } catch {
      toast.error('فشل تحميل بيانات القسم')
    } finally { setCtxLoading(false) }
  }, [])

  useEffect(() => { void loadCtx() }, [loadCtx])

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setStagedFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  function removeStaged(i: number) {
    setStagedFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('العنوان مطلوب'); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return }
    if (!initial && !departmentId) { toast.error('يرجى اختيار القسم'); return }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        request_type: type,
        amount: Number(amount),
        currency,
        needed_by_date: neededBy || null,
        priority,
      }
      if (!initial && departmentId) body.department_id = departmentId

      const saved = initial
        ? await updateFinancialRequest(initial.id, body)
        : await createFinancialRequest(body)

      // Upload staged attachments after creation
      if (!initial && stagedFiles.length > 0) {
        const results = await Promise.allSettled(
          stagedFiles.map(file => uploadAttachment(saved.id, file))
        )
        const failed = results.filter(r => r.status === 'rejected').length
        if (failed > 0) toast.error(`${failed} مرفقات فشل رفعها`)
      }

      toast.success(initial ? 'تم الحفظ' : 'تم إنشاء الطلب')
      onSaved(saved)
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'فشل الحفظ'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const selectedDept = ctx?.departments.find(d => d.id === departmentId)
  const canCreate = ctx?.can_create ?? false

  const modal = (
    <div className="fixed inset-0 z-modal-overlay flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="relative z-modal-content w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-deepBlue">{initial ? 'تعديل الطلب المالي' : 'طلب مالي جديد'}</h2>
            <p className="mt-0.5 text-[12px] text-deepBlue/50">
              {initial ? 'تعديل بيانات الطلب' : 'أكمل البيانات وسيُرسل الطلب إلى الإدارة المالية'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-deepBlue/40 hover:bg-slate-100 hover:text-deepBlue transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
          {ctxLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="size-8 animate-spin rounded-full border-4 border-slate-100 border-t-customOrange" />
            </div>
          ) : !canCreate ? (
            <div className="px-6 py-12 text-center">
              <Building2 size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-deepBlue">لا يمكن إنشاء طلب</p>
              <p className="mt-1 text-sm text-deepBlue/50">يجب أن تكون عضواً في قسم لإنشاء طلب مالي.</p>
            </div>
          ) : (
            <div className="space-y-6 px-6 py-6">

              {/* ── Section 1: بيانات الطلب ── */}
              <div>
                <SectionHeader title="بيانات الطلب" />
                <div className="space-y-4">
                  {/* Department */}
                  {!initial && (
                    <div>
                      <label className={LABEL}>القسم *</label>
                      {ctx && ctx.departments.length > 1 ? (
                        <div className="relative">
                          <select
                            value={departmentId ?? ''}
                            onChange={e => setDepartmentId(Number(e.target.value))}
                            className={`${INPUT_BASE} appearance-none pr-10 border-slate-200`}
                          >
                            <option value="">— اختر القسم —</option>
                            {ctx.departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}{d.is_leader ? ' (قائد)' : ''}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      ) : selectedDept ? (
                        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <Building2 size={16} className="text-customBlue shrink-0" />
                          <span className="flex-1 text-sm font-bold text-deepBlue">{selectedDept.name}</span>
                          {selectedDept.is_leader && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700">
                              <Crown size={10} /> قائد القسم
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className={LABEL}>عنوان الطلب *</label>
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className={`${INPUT_BASE} border-slate-200`}
                      placeholder="مثال: شراء أجهزة لقاعة الاجتماعات"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className={LABEL}>نوع الطلب *</label>
                    <div className="relative">
                      <select
                        value={type}
                        onChange={e => setType(e.target.value as any)}
                        className={`${INPUT_BASE} appearance-none pr-10 border-slate-200`}
                      >
                        {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className={LABEL}>الوصف والتبرير</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      className={`${INPUT_BASE} resize-none border-slate-200`}
                      placeholder="اشرح سبب الطلب والمبرر المالي…"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 2: التفاصيل المالية ── */}
              <div>
                <SectionHeader title="التفاصيل المالية" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={LABEL}>المبلغ المطلوب *</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          className={`${INPUT_BASE} border-slate-200`}
                          placeholder="0.00"
                          dir="ltr"
                        />
                      </div>
                      <div className="relative w-28">
                        <select
                          value={currency}
                          onChange={e => setCurrency(e.target.value)}
                          className={`${INPUT_BASE} appearance-none border-slate-200 pr-8`}
                          dir="ltr"
                        >
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                    {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
                      <p className="mt-1.5 text-[11px] text-customBlue font-bold">
                        {Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Section 3: الموعد والأولوية ── */}
              <div>
                <SectionHeader title="الموعد والأولوية" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={LABEL}>مطلوب بتاريخ (اختياري)</label>
                    <input
                      type="date"
                      value={neededBy}
                      onChange={e => setNeededBy(e.target.value)}
                      className={`${INPUT_BASE} border-slate-200`}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>مستوى الأولوية</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRIORITIES.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPriority(p.value as any)}
                          className={`rounded-xl border px-3 py-2.5 text-[12px] font-bold transition-all ${
                            priority === p.value
                              ? 'border-deepBlue bg-deepBlue text-white shadow-sm'
                              : 'border-slate-200 bg-slate-50 text-deepBlue/60 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section 4: المرفقات (create only) ── */}
              {!initial && (
                <div>
                  <SectionHeader title="المرفقات" subtitle="اختياري — يمكن إضافتها لاحقاً" />
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 px-4 py-4 transition-colors hover:border-customBlue hover:bg-blue-50">
                      <Upload size={18} className="text-customBlue" />
                      <div>
                        <p className="text-sm font-bold text-customBlue">اختر ملفات</p>
                        <p className="text-[11px] text-slate-400">PDF, صور, Word, Excel — حتى 20 MB</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="sr-only"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileAdd}
                      />
                    </label>
                    <AnimatePresence initial={false}>
                      {stagedFiles.map((f, i) => (
                        <motion.div
                          key={`${f.name}-${i}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                        >
                          <FileText size={16} className="shrink-0 text-deepBlue/40" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-bold text-deepBlue">{f.name}</p>
                            <p className="text-[11px] text-deepBlue/40">{formatBytes(f.size)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStaged(i)}
                            className="flex size-7 items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {canCreate && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <p className="text-[11px] text-slate-400">
              {stagedFiles.length > 0 && `${stagedFiles.length.toLocaleString('en-US')} مرفق`}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-deepBlue hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving || ctxLoading}
                className="relative flex min-w-[120px] items-center justify-center rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-bold text-white hover:bg-deepBlue/90 disabled:opacity-60 transition-all"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    جاري الحفظ…
                  </span>
                ) : initial ? 'حفظ التعديلات' : 'إنشاء الطلب'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )

  return createPortal(modal, document.body)
}
