import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle, Check, FileUp, Loader2, Mail, Phone, Search, Trash2, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { createManualPayment, searchStudents, type StudentSearchResult } from '@/api/financeApi'
import { getLaravelFieldErrors } from '@/api/apiErrors'
import type { FinanceAccount } from '@/types/intelligence'
import {
  ENTITY_AR,
  PAYMENT_METHOD_AR,
  PROOF_ACCEPT,
  PROOF_MAX_BYTES,
  PURCHASABLE_MODEL,
} from './constants'
import { formatTxDateOnly } from './formatters'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import { formatFinanceCurrency, formatFinanceCurrencyInteger, formatMoney } from '@/utils/financeFormatters'
import {
  emptyManualPaymentForm,
  relationAmountLabel,
  type ManualPaymentFormValues,
  type ManualPaymentRecipient,
  type SearchablePurchasable,
} from './manualPaymentFormTypes'
import { groupPurchasables, searchPurchasablesForManualPayment } from './searchPurchasables'
import { txInitials } from './formatters'

type Section = 'recipient' | 'relation' | 'payment' | 'proof' | 'review'

const STEPS: { key: Section; label: string }[] = [
  { key: 'recipient', label: 'المستفيد' },
  { key: 'relation', label: 'الارتباط' },
  { key: 'payment', label: 'بيانات الدفع' },
  { key: 'proof', label: 'إثبات الدفع' },
  { key: 'review', label: 'المراجعة' },
]

function normalizeRecipient(u: StudentSearchResult): ManualPaymentRecipient {
  return {
    id: u.id,
    name: u.name,
    email: u.email ?? null,
    phone: u.phone ?? null,
    avatar: u.avatar,
    status: u.status,
    role: 'student',
  }
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-[11px] font-bold text-rose-600">{msg}</p>
}

function ReviewRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(110px,140px)_1fr] items-start gap-3 border-b border-slate-200 py-2.5 last:border-b-0">
      <dt className="text-[12px] font-bold text-slate-500">{label}</dt>
      <dd className={`min-w-0 text-[12px] font-semibold text-slate-900 ${ltr ? 'text-left font-mono' : 'text-left'}`} dir={ltr ? 'ltr' : 'rtl'}>
        {value}
      </dd>
    </div>
  )
}

function CenteredStepper({
  section,
  onSelect,
}: {
  section: Section
  onSelect: (s: Section) => void
}) {
  const reduce = useReducedMotion()
  const idx = STEPS.findIndex((s) => s.key === section)

  return (
    <div className="flex justify-center overflow-x-auto pb-1">
      <div className="inline-flex items-center gap-1 rounded-2xl bg-slate-50 p-1.5">
        {STEPS.map((s, i) => {
          const isActive = s.key === section
          const isDone = i < idx
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onSelect(s.key)}
              className="relative rounded-xl px-3 py-1.5 text-[10px] font-black transition-colors"
            >
              {isActive && !reduce && (
                <motion.div
                  layoutId="manual-payment-active-step"
                  className="absolute inset-0 rounded-xl bg-[#0C2A4B]"
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                />
              )}
              <span
                className={`relative z-10 inline-flex items-center gap-1 ${
                  isActive ? 'text-white' : isDone ? 'text-[#0077B6]' : 'text-slate-500'
                }`}
              >
                {isDone && <Check className="h-3 w-3" aria-hidden />}
                {s.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CreateManualPaymentModal({
  open,
  accounts,
  onClose,
  onCreated,
}: {
  open: boolean
  accounts: FinanceAccount[]
  onClose: () => void
  onCreated: () => void
}) {
  const reduce = useReducedMotion()
  const [section, setSection] = useState<Section>('recipient')
  const [form, setForm] = useState<ManualPaymentFormValues>(emptyManualPaymentForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)

  const [studentQuery, setStudentQuery] = useState('')
  const [studentResults, setStudentResults] = useState<StudentSearchResult[]>([])
  const [studentLoading, setStudentLoading] = useState(false)

  const [relationQuery, setRelationQuery] = useState('')
  const [relationResults, setRelationResults] = useState<SearchablePurchasable[]>([])
  const [relationLoading, setRelationLoading] = useState(false)

  const patchForm = useCallback((patch: Partial<ManualPaymentFormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  const clearError = useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, saving, onClose])

  // Reset the wizard during render when the drawer opens (react.dev "adjusting state
  // when a prop changes"), so the previous draft is never painted for a frame. A fresh
  // mount already starts from these very values, so only the transition needs handling.
  const [seenOpen, setSeenOpen] = useState(open)
  if (seenOpen !== open) {
    setSeenOpen(open)
    if (open) {
      setSection('recipient')
      setForm(emptyManualPaymentForm())
      setFieldErrors({})
      setProofError(null)
      setStudentQuery('')
      setRelationQuery('')
      setStudentResults([])
      setRelationResults([])
    }
  }

  // Drop stale student matches during render as soon as the query is too short or the
  // wizard leaves the recipient step — the initial state is already empty.
  const [seenStudentQuery, setSeenStudentQuery] = useState({ studentQuery, section })
  if (seenStudentQuery.studentQuery !== studentQuery || seenStudentQuery.section !== section) {
    setSeenStudentQuery({ studentQuery, section })
    if (section !== 'recipient' || studentQuery.trim().length < 2) setStudentResults([])
  }

  useEffect(() => {
    if (section !== 'recipient' || studentQuery.trim().length < 2) return
    const timer = window.setTimeout(() => {
      setStudentLoading(true)
      void searchStudents(studentQuery.trim())
        .then(setStudentResults)
        .catch(() => setStudentResults([]))
        .finally(() => setStudentLoading(false))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [studentQuery, section])

  useEffect(() => {
    if (section !== 'relation') return
    const timer = window.setTimeout(() => {
      setRelationLoading(true)
      void searchPurchasablesForManualPayment(relationQuery, form.recipient_id)
        .then(setRelationResults)
        .catch(() => setRelationResults([]))
        .finally(() => setRelationLoading(false))
    }, relationQuery.trim() ? 350 : 0)
    return () => window.clearTimeout(timer)
  }, [relationQuery, section, form.recipient_id])

  // Follow the destination account's currency during render, so the amount is never
  // painted with the previous account's currency label.
  const [seenAccount, setSeenAccount] = useState({ id: form.destination_account_id, accounts })
  if (seenAccount.id !== form.destination_account_id || seenAccount.accounts !== accounts) {
    setSeenAccount({ id: form.destination_account_id, accounts })
    if (form.destination_account_id) {
      const acc = accounts.find((a) => a.id === form.destination_account_id)
      if (acc?.currency && acc.currency !== form.currency) patchForm({ currency: acc.currency })
    }
  }

  const selectRecipient = (user: StudentSearchResult) => {
    const recipient = normalizeRecipient(user)
    patchForm({ recipient_id: recipient.id, recipient })
    setStudentQuery('')
    setStudentResults([])
    clearError('student_id')
  }

  const clearRecipient = () => {
    patchForm({ recipient_id: null, recipient: null, relation_type: null, relation_id: null, relation: null, relation_amount: null })
    setRelationQuery('')
    setRelationResults([])
  }

  const selectRelation = (item: SearchablePurchasable) => {
    patchForm({
      relation_type: item.type,
      relation_id: item.id,
      relation: item,
      relation_amount: item.price,
    })
    setRelationQuery('')
    setRelationResults([])
    clearError('purchasable_id')
  }

  const clearRelation = () => {
    patchForm({ relation_type: null, relation_id: null, relation: null, relation_amount: null })
  }

  const diff = useMemo(() => {
    const exp = form.relation_amount ?? 0
    const paid = parseFloat(form.paid_amount || '0')
    if (!form.paid_amount || Number.isNaN(paid)) return 0
    return exp - paid
  }, [form.relation_amount, form.paid_amount])

  const validateSection = (s: Section): boolean => {
    const errs: Record<string, string> = {}
    if (s === 'recipient' && !form.recipient_id) errs.student_id = 'يرجى اختيار المستخدم'
    if (s === 'relation' && !form.relation_id) errs.purchasable_id = 'يرجى اختيار العنصر المرتبط'
    if (s === 'payment') {
      if (!form.destination_account_id) errs.finance_account_id = 'يرجى اختيار حساب المالية'
      const paid = parseFloat(form.paid_amount)
      if (!form.paid_amount || Number.isNaN(paid) || paid <= 0) errs.paid_amount = 'يرجى إدخال مبلغ صحيح'
      if (!form.payment_method) errs.payment_method = 'يرجى اختيار طريقة الدفع'
      if (!form.payment_date) errs.payment_date = 'يرجى تحديد تاريخ الدفع'
    }
    setFieldErrors((prev) => {
      const next = { ...prev, ...errs }
      if (s === 'recipient' && !errs.student_id) delete next.student_id
      if (s === 'relation' && !errs.purchasable_id) delete next.purchasable_id
      if (s === 'payment') {
        if (!errs.finance_account_id) delete next.finance_account_id
        if (!errs.paid_amount) delete next.paid_amount
        if (!errs.payment_method) delete next.payment_method
        if (!errs.payment_date) delete next.payment_date
      }
      return next
    })
    return Object.keys(errs).length === 0
  }

  const goNext = () => {
    if (!validateSection(section)) return
    const idx = STEPS.findIndex((x) => x.key === section)
    if (idx < STEPS.length - 1) setSection(STEPS[idx + 1].key)
  }

  const goBack = () => {
    const idx = STEPS.findIndex((x) => x.key === section)
    if (idx > 0) setSection(STEPS[idx - 1].key)
  }

  const handleProof = (file: File | null) => {
    setProofError(null)
    if (!file) {
      patchForm({ proof: null })
      return
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
      setProofError('نوع الملف غير مدعوم. المسموح: PDF، PNG، JPG')
      return
    }
    if (file.size > PROOF_MAX_BYTES) {
      setProofError('حجم الملف يتجاوز 5 ميجابايت')
      return
    }
    patchForm({ proof: file })
  }

  const handleSubmit = async () => {
    if (!validateSection('recipient') || !validateSection('relation') || !validateSection('payment')) {
      toast.error('يرجى إكمال جميع الحقول المطلوبة')
      return
    }
    if (!form.recipient_id || !form.relation_id || !form.relation_type || !form.destination_account_id) return

    setSaving(true)
    setFieldErrors({})
    try {
      const paid = parseFloat(form.paid_amount)
      const expected = form.relation_amount ?? paid
      const fd = new FormData()
      fd.append('student_id', String(form.recipient_id))
      fd.append('purchasable_type', PURCHASABLE_MODEL[form.relation_type])
      fd.append('purchasable_id', String(form.relation_id))
      fd.append('finance_account_id', String(form.destination_account_id))
      fd.append('payment_method', form.payment_method)
      fd.append('paid_amount', String(paid))
      fd.append('expected_amount', String(expected))
      fd.append('currency', form.currency)
      fd.append('payment_date', form.payment_date)
      if (form.external_reference.trim()) fd.append('external_reference', form.external_reference.trim())
      if (form.notes.trim()) fd.append('notes', form.notes.trim())
      if (form.proof) fd.append('proof', form.proof)

      await createManualPayment(fd)
      toast.success('تم إرسال الدفعة للمراجعة')
      onCreated()
      onClose()
    } catch (e) {
      const laravel = getLaravelFieldErrors(e)
      if (Object.keys(laravel).length > 0) {
        const mapped: Record<string, string> = {}
        for (const [k, v] of Object.entries(laravel)) {
          mapped[k] = v.includes('already been taken') ? 'رقم المرجع مستخدم مسبقاً' : v
        }
        setFieldErrors(mapped)
      } else if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string })?.message
        toast.error(msg && msg !== 'The given data was invalid.' ? msg : 'تعذر تسجيل الدفعة، يرجى المحاولة مرة أخرى')
      } else {
        toast.error('تعذر تسجيل الدفعة، يرجى المحاولة مرة أخرى')
      }
    } finally {
      setSaving(false)
    }
  }

  const groupedRelations = useMemo(() => groupPurchasables(relationResults), [relationResults])
  const amountLabel = relationAmountLabel(form.relation_type)
  const payDateLabel = formatTxDateOnly(form.payment_date)
  const selectedAccount = accounts.find((a) => a.id === form.destination_account_id)
  const accountName = selectedAccount?.name ?? '—'
  const activeCurrency = selectedAccount?.currency ?? 'EUR'

  const stepMotion = reduce
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 12 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -12 },
        transition: { duration: 0.18 },
      }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ?
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => !saving && onClose()} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="إضافة دفعة يدوية"
            dir="rtl"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 14 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative z-10 flex w-[calc(100vw-16px)] max-w-[760px] max-h-[calc(100dvh-16px)] flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-40px)] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0077B6]">دفعة جديدة</p>
                  <h2 className="mt-0.5 text-base font-black text-[#0F172A] sm:text-lg">إضافة دفعة يدوية</h2>
                  <p className="mt-1 text-[11px] font-semibold text-[#64748B]">أدخل بيانات الدفعة خطوة بخطوة</p>
                </div>
                <button type="button" onClick={onClose} disabled={saving} aria-label="إغلاق" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4">
                <CenteredStepper section={section} onSelect={setSection} />
              </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              <AnimatePresence mode="wait">
                <motion.div key={section} {...stepMotion}>
                  {section === 'recipient' && (
                    <section className="space-y-3">
                      <div>
                        <h3 className="text-[13px] font-black text-[#0C2A4B]">بيانات المستفيد</h3>
                        <p className="text-[11px] text-[#64748B]">ابحث عن الطالب أو المستخدم الذي دفع المبلغ</p>
                      </div>
                      <label className="block">
                        <div className="relative">
                          <Search className="pointer-events-none absolute end-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
                          <input
                            type="search"
                            value={studentQuery}
                            onChange={(e) => setStudentQuery(e.target.value)}
                            placeholder="ابحث بالاسم أو البريد الإلكتروني أو رقم الهاتف"
                            className="w-full rounded-xl border border-slate-200 py-2.5 pe-10 ps-3 text-[13px] font-semibold outline-none focus:border-[#0077B6]/50 focus:ring-2 focus:ring-[#0077B6]/15"
                          />
                        </div>
                        {!form.recipient && <FieldError msg={fieldErrors.student_id} />}
                      </label>
                      {studentLoading && <p className="text-[11px] font-bold text-slate-400">جاري البحث…</p>}
                      {!studentLoading && studentQuery.trim().length >= 2 && studentResults.length === 0 && !form.recipient && (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-[12px] font-semibold text-slate-500">لا توجد نتائج مطابقة</p>
                      )}
                      {studentResults.length > 0 && !form.recipient && (
                        <ul className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1">
                          {studentResults.map((s) => (
                            <li key={s.id}>
                              <button type="button" onClick={() => selectRecipient(s)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right hover:bg-slate-50">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0077B6]/10 text-[10px] font-black text-[#0077B6]">{txInitials(s.name)}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[12px] font-black text-slate-900">{s.name}</p>
                                  <p className="truncate text-[11px] text-slate-500" dir="ltr">{s.email}</p>
                                  {s.phone && <p className="truncate text-[10px] text-slate-400">{s.phone}</p>}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400" dir="ltr">#{s.id}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {form.recipient && (
                        <motion.div initial={{ scale: 0.99, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-start gap-3 rounded-xl border border-[#0077B6]/25 bg-[#0077B6]/5 px-3 py-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0077B6]/15 text-[11px] font-black text-[#0077B6]">{txInitials(form.recipient.name)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-black text-slate-900">{form.recipient.name}</p>
                            {form.recipient.email && <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-600" dir="ltr"><Mail className="h-3 w-3 shrink-0" />{form.recipient.email}</p>}
                            {form.recipient.phone && <p className="flex items-center gap-1 text-[11px] text-slate-600" dir="ltr"><Phone className="h-3 w-3 shrink-0" />{form.recipient.phone}</p>}
                            <p className="mt-1 text-[10px] font-bold text-slate-400" dir="ltr">ID: {form.recipient.id}</p>
                          </div>
                          <button type="button" onClick={clearRecipient} aria-label="إزالة المستفيد" className="text-slate-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
                        </motion.div>
                      )}
                    </section>
                  )}

                  {section === 'relation' && (
                    <section className="space-y-3">
                      <div>
                        <h3 className="text-[13px] font-black text-[#0C2A4B]">ربط الدفعة</h3>
                        <p className="text-[11px] text-[#64748B]">حدد الجهة أو البرنامج المرتبط بهذه الدفعة</p>
                      </div>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-black text-slate-500">اختر العنصر المرتبط *</span>
                        <div className="relative">
                          <Search className="pointer-events-none absolute end-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
                          <input
                            type="search"
                            value={relationQuery}
                            onChange={(e) => setRelationQuery(e.target.value)}
                            placeholder="ابحث عن دورة واخترها"
                            className="w-full rounded-xl border border-slate-200 py-2.5 pe-10 ps-3 text-[13px] font-semibold outline-none focus:border-[#0077B6]/50 focus:ring-2 focus:ring-[#0077B6]/15"
                          />
                        </div>
                        {!form.relation && <FieldError msg={fieldErrors.purchasable_id} />}
                      </label>
                      {relationLoading && (
                        <p className="text-[11px] font-bold text-slate-400">جارٍ تحميل البرامج…</p>
                      )}
                      {!relationLoading && !form.recipient_id && (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-[12px] font-semibold text-slate-500">
                          اختر المستفيد أولاً لعرض البرامج المدفوعة
                        </p>
                      )}
                      {!relationLoading && form.recipient_id && relationResults.length === 0 && !form.relation && (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-[12px] font-semibold text-slate-500">
                          {relationQuery.trim()
                            ? 'لا توجد نتائج مطابقة لعبارة البحث'
                            : 'لا توجد دورات أو ورش مدفوعة متاحة'}
                        </p>
                      )}
                      {relationResults.length > 0 && !form.relation && (
                        <div className="max-h-52 space-y-3 overflow-y-auto rounded-xl border border-slate-200 p-2">
                          {(['course', 'workshop', 'learning_path'] as const).map((type) => {
                            const items = groupedRelations[type]
                            if (!items.length) return null
                            return (
                              <div key={type}>
                                <p className="mb-1 px-1 text-[10px] font-black text-slate-400">{ENTITY_AR[type]}</p>
                                <ul className="space-y-1">
                                  {items.map((item) => (
                                    <li key={`${type}-${item.id}`}>
                                      <button type="button" onClick={() => selectRelation(item)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-right hover:bg-slate-50">
                                        <div className="min-w-0">
                                          <p className="truncate text-[12px] font-black text-slate-900">{item.title}</p>
                                          {item.subtitle && <p className="truncate text-[10px] text-slate-400">{item.subtitle}</p>}
                                        </div>
                                        {item.price != null && (
                                          <span className="shrink-0 font-mono text-[11px] font-black text-[#0077B6]" dir="ltr">
                                            {formatFinanceCurrencyInteger(item.price)}
                                          </span>
                                        )}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {form.relation && (
                        <motion.div initial={{ scale: 0.99, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-2 rounded-xl border border-[#F28C00]/25 bg-[#F28C00]/8 px-3 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[12px] font-black text-slate-900">{form.relation.title}</p>
                              <p className="text-[10px] font-bold text-slate-500" dir="ltr">#{form.relation.id}{form.relation.slug ? ` · ${form.relation.slug}` : ''}</p>
                            </div>
                            <button type="button" onClick={clearRelation} aria-label="إزالة العنصر"><X className="h-4 w-4 text-slate-500" /></button>
                          </div>
                          <p className="text-[11px] font-bold text-slate-600">
                            نوع العنصر: <span className="text-[#0C2A4B]">{ENTITY_AR[form.relation.type]}</span>
                          </p>
                          {form.relation_amount != null && (
                            <p className="text-[11px] font-bold text-slate-600">
                              {amountLabel}: <span className="font-mono text-[#0077B6]" dir="ltr">{formatFinanceCurrency(form.relation_amount)}</span>
                            </p>
                          )}
                        </motion.div>
                      )}
                    </section>
                  )}

                  {section === 'payment' && (
                    <section className="space-y-3">
                      <div>
                        <h3 className="text-[13px] font-black text-[#0C2A4B]">بيانات الدفع</h3>
                      </div>
                      {form.relation_amount != null && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <p className="text-[10px] font-black text-slate-500">{amountLabel} (EUR)</p>
                          <p className="mt-0.5 font-mono text-[14px] font-black text-[#0C2A4B]" dir="ltr">{formatFinanceCurrency(form.relation_amount)}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label>
                          <span className="mb-1 block text-[11px] font-black text-slate-500">
                            المبلغ المدفوع{activeCurrency ? ` (${activeCurrency})` : ''} *
                          </span>
                          <input type="number" min={0} step="0.01" value={form.paid_amount} onChange={(e) => { patchForm({ paid_amount: e.target.value }); clearError('paid_amount') }} dir="ltr" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-bold" />
                          <FieldError msg={fieldErrors.paid_amount} />
                        </label>
                        <EmcDatePicker
                          label="تاريخ الدفع *"
                          layout="stacked"
                          displayMode="finance"
                          value={form.payment_date}
                          onChange={(v) => patchForm({ payment_date: v })}
                          error={fieldErrors.payment_date}
                          required
                        />
                        <label>
                          <span className="mb-1 block text-[11px] font-black text-slate-500">طريقة الدفع *</span>
                          <select value={form.payment_method} onChange={(e) => patchForm({ payment_method: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-bold">
                            {Object.entries(PAYMENT_METHOD_AR).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </label>
                        <label>
                          <span className="mb-1 block text-[11px] font-black text-slate-500">الحساب المستلم *</span>
                          <select
                            value={form.destination_account_id ?? ''}
                            onChange={(e) => { patchForm({ destination_account_id: e.target.value ? Number(e.target.value) : null }); clearError('finance_account_id') }}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-bold"
                          >
                            <option value="">اختر الحساب</option>
                            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                          </select>
                          <FieldError msg={fieldErrors.finance_account_id} />
                        </label>
                      </div>
                      {/* Currency read-only badge — shown once an account is selected */}
                      {form.destination_account_id && (
                        <div className="flex items-center gap-2 rounded-xl border border-[#0077B6]/20 bg-[#0077B6]/5 px-3 py-2">
                          <span className="text-[10px] font-black text-slate-500">عملة الحساب:</span>
                          <span className="font-mono text-[13px] font-black text-[#0C2A4B]">{activeCurrency}</span>
                          <span className="text-[10px] text-slate-400">— أدخل المبلغ بهذه العملة</span>
                        </div>
                      )}
                      {form.paid_amount && form.relation_amount != null && (
                        <>
                          {activeCurrency === 'EUR' && diff !== 0 && (
                            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold ${diff > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                              {diff > 0 ? `الدفع ناقص بمقدار ${formatMoney(diff, activeCurrency)}` : `الدفع زائد بمقدار ${formatMoney(Math.abs(diff), activeCurrency)}`}
                            </div>
                          )}
                          {activeCurrency !== 'EUR' && (
                            <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-800">
                              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                              سعر العنصر {formatFinanceCurrency(form.relation_amount)} — المبلغ المدفوع بعملة مختلفة ({activeCurrency})، تحقق من سعر الصرف
                            </div>
                          )}
                        </>
                      )}
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-black text-slate-500">رقم المرجع</span>
                        <input type="text" value={form.external_reference} onChange={(e) => patchForm({ external_reference: e.target.value })} dir="ltr" placeholder="رقم التحويل أو الإيصال" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-semibold" />
                        <FieldError msg={fieldErrors.external_reference} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-black text-slate-500">ملاحظات</span>
                        <textarea value={form.notes} onChange={(e) => patchForm({ notes: e.target.value })} rows={2} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-semibold" />
                      </label>
                    </section>
                  )}

                  {section === 'proof' && (
                    <section className="space-y-3">
                      <div>
                        <h3 className="text-[13px] font-black text-[#0C2A4B]">إثبات الدفع</h3>
                        <p className="text-[11px] text-slate-500">اختياري — PDF، PNG، JPG حتى 5 ميجابايت</p>
                      </div>
                      <label
                        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 transition hover:border-[#0077B6]/40"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); handleProof(e.dataTransfer.files[0] ?? null) }}
                      >
                        <FileUp className="h-7 w-7 text-[#0077B6]" aria-hidden />
                        <span className="mt-2 text-[12px] font-black text-slate-800">اسحب الملف هنا أو اختر ملفاً</span>
                        <span className="mt-1 text-[10px] text-slate-500">PDF · PNG · JPG</span>
                        <input type="file" accept={PROOF_ACCEPT} className="sr-only" onChange={(e) => handleProof(e.target.files?.[0] ?? null)} />
                      </label>
                      <FieldError msg={proofError ?? undefined} />
                      {form.proof && (
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                          <span className="truncate text-[12px] font-bold text-slate-900" dir="ltr">{form.proof.name}</span>
                          <button type="button" onClick={() => handleProof(null)} aria-label="إزالة الملف" className="text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </section>
                  )}

                  {section === 'review' && (
                    <section className="space-y-4">
                      <div>
                        <h3 className="text-[13px] font-black text-[#0C2A4B]">مراجعة بيانات الدفعة</h3>
                        <p className="text-[11px] text-slate-500">تحقق من المعلومات قبل إرسال الدفعة للمراجعة</p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">المستفيد</p>
                        <dl>
                          <ReviewRow label="المستفيد" value={form.recipient?.name ?? '—'} />
                          {form.recipient?.email && <ReviewRow label="البريد" value={form.recipient.email} ltr />}
                          {form.recipient?.phone && <ReviewRow label="الهاتف" value={form.recipient.phone} ltr />}
                        </dl>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">العنصر المرتبط</p>
                        <dl>
                          <ReviewRow label="العنصر" value={form.relation?.title ?? '—'} />
                          <ReviewRow label="نوع العنصر" value={form.relation_type ? ENTITY_AR[form.relation_type] : '—'} />
                          {form.relation_amount != null && (
                            <ReviewRow label={amountLabel} value={formatFinanceCurrency(form.relation_amount)} ltr />
                          )}
                          {/* Course price is in EUR; paid amount will be in the account's currency */}
                        </dl>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">بيانات الدفع</p>
                        <dl>
                          <ReviewRow label={`المبلغ المدفوع (${activeCurrency})`} value={form.paid_amount ? formatMoney(parseFloat(form.paid_amount), activeCurrency) : '—'} ltr />
                          <ReviewRow label="طريقة الدفع" value={PAYMENT_METHOD_AR[form.payment_method] ?? form.payment_method} />
                          <ReviewRow label="الحساب المستلم" value={accountName} />
                          <ReviewRow label="تاريخ الدفع" value={payDateLabel} ltr />
                          {form.external_reference.trim() && <ReviewRow label="رقم المرجع" value={form.external_reference.trim()} ltr />}
                        </dl>
                      </div>

                      {form.proof && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">المرفق</p>
                          <dl>
                            <ReviewRow label="إثبات الدفع" value={form.proof.name} ltr />
                          </dl>
                        </div>
                      )}

                      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                        <p className="text-[12px] leading-relaxed text-amber-800">
                          سيتم إنشاء الدفعة بحالة «بانتظار المراجعة»، ولن يتم اعتمادها قبل المراجعة.
                        </p>
                      </div>
                    </section>
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            <footer className="shrink-0 border-t border-slate-200 px-5 py-3 sm:px-6">
              <div className={`flex items-center gap-2 ${section === 'recipient' ? 'justify-end' : 'justify-between'}`}>
                {section !== 'recipient' && (
                  <button type="button" onClick={goBack} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-black text-slate-600 hover:bg-slate-50 sm:min-w-[100px]">
                    رجوع
                  </button>
                )}
                {section !== 'review' ? (
                  <button type="button" onClick={goNext} className="rounded-xl bg-[#0C2A4B] px-5 py-2 text-[12px] font-black text-white hover:bg-[#1a2940] sm:min-w-[120px]">
                    التالي
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={saving}
                    className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-xl bg-[#F28C00] px-5 py-2 text-[12px] font-black text-white disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
                    إرسال للمراجعة
                  </button>
                )}
              </div>
            </footer>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>,
    document.body,
  )
}
