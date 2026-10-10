import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  Plus,
  Search,
  RefreshCw,
  Printer,
  Trash2,
  Pencil,
  FileText,
  UploadCloud,
  CheckCircle2,
  X,
  Building2,
  Wallet,
  DollarSign,
  Eye,
  Loader2,
  Sparkles,
  Layers,
  GraduationCap,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  fetchRevenuesList,
  suggestRevenueReceiptNo,
  createRevenue,
  updateRevenue,
  deleteRevenue,
  type ManualRevenueItem,
  type RevenuesSummary,
} from '@/api/revenueApi'
import { fetchAccountsList, type ChartOfAccountItem } from '@/api/chartOfAccountsApi'
import apiClient from '@/api/axios'

interface ProgramOption {
  id: number
  title_ar?: string
  title?: string
  name?: string
}

export default function RevenueManagementPage() {
  const [revenues, setRevenues] = useState<ManualRevenueItem[]>([])
  const [summary, setSummary] = useState<RevenuesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Accounts & Programs lists
  const [revenueAccounts, setRevenueAccounts] = useState<ChartOfAccountItem[]>([])
  const [depositAccounts, setDepositAccounts] = useState<ChartOfAccountItem[]>([])
  const [programs, setPrograms] = useState<ProgramOption[]>([])

  // Filters state
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Form states
  const [editingRevenue, setEditingRevenue] = useState<ManualRevenueItem | null>(null)
  const [receiptNo, setReceiptNo] = useState('')
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [revenueAccountId, setRevenueAccountId] = useState<string>('')
  const [depositAccountId, setDepositAccountId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [currency, setCurrency] = useState<string>('USD')
  const [payerName, setPayerName] = useState<string>('')
  const [programId, setProgramId] = useState<string>('')
  const [programName, setProgramName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [status, setStatus] = useState<'posted' | 'draft'>('posted')

  // File upload state
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)

  // Print & View Receipt Modal state
  const [viewingRevenue, setViewingRevenue] = useState<ManualRevenueItem | null>(null)

  // Load initial accounts and suggest receipt number
  const loadInitialOptions = useCallback(async () => {
    try {
      const [allAccountsRes, suggestedNoRes, programsRes] = await Promise.all([
        fetchAccountsList(),
        suggestRevenueReceiptNo(),
        apiClient.get<{ success: boolean; data: ProgramOption[] }>('/programs').catch(() => ({ data: { data: [] } })),
      ])

      // Categorize accounts
      // Revenue Accounts: type='credit' or code starts with 4
      const revList = allAccountsRes.filter(
        (a) => a.is_selectable && (a.code.startsWith('4') || a.type === 'credit')
      )
      // Deposit/Cash/Bank Accounts: code starts with 11 or 1
      const depList = allAccountsRes.filter(
        (a) => a.is_selectable && (a.code.startsWith('11') || a.code.startsWith('1'))
      )

      setRevenueAccounts(revList)
      setDepositAccounts(depList)

      if (Array.isArray(programsRes.data.data)) {
        setPrograms(programsRes.data.data)
      }

      setReceiptNo(suggestedNoRes)
    } catch {
      toast.error('تعذّر تحميل بيانات الحسابات الأولية')
    }
  }, [])

  // Load revenues list
  const loadRevenues = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchRevenuesList({
        search,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setRevenues(res.items)
      setSummary(res.summary)
    } catch {
      toast.error('تعذّر تحميل سجل الإيرادات')
    } finally {
      setLoading(false)
    }
  }, [search, dateFrom, dateTo])

  useEffect(() => {
    void loadInitialOptions()
  }, [loadInitialOptions])

  useEffect(() => {
    void loadRevenues()
  }, [loadRevenues])

  // Handle file selection
  function handleFileChange(file: File | null) {
    if (!file) {
      setAttachment(null)
      setAttachmentPreview(null)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً (الأقصى 10 ميجابايت)')
      return
    }

    setAttachment(file)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setAttachmentPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setAttachmentPreview(null)
    }
  }

  // Clear form
  async function handleResetForm() {
    setEditingRevenue(null)
    setDate(new Date().toISOString().split('T')[0])
    setRevenueAccountId('')
    setDepositAccountId('')
    setAmount('')
    setCurrency('USD')
    setPayerName('')
    setProgramId('')
    setProgramName('')
    setDescription('')
    setStatus('posted')
    setAttachment(null)
    setAttachmentPreview(null)

    try {
      const nextNo = await suggestRevenueReceiptNo()
      setReceiptNo(nextNo)
    } catch {
      /* ignore */
    }
  }

  // Populate form for editing
  function handleEdit(revenue: ManualRevenueItem) {
    setEditingRevenue(revenue)
    setReceiptNo(revenue.receipt_no)
    setDate(revenue.date)
    setRevenueAccountId(String(revenue.revenue_account_id))
    setDepositAccountId(String(revenue.deposit_account_id))
    setAmount(String(revenue.amount))
    setCurrency(revenue.currency || 'USD')
    setPayerName(revenue.payer_name || '')
    setProgramId(revenue.program_id ? String(revenue.program_id) : '')
    setProgramName(revenue.program_name || '')
    setDescription(revenue.description || '')
    setStatus(revenue.status === 'cancelled' ? 'posted' : revenue.status)
    setAttachment(null)
    setAttachmentPreview(revenue.attachment_url || null)

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle Form Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!revenueAccountId) {
      toast.error('يرجى اختيار نوع الإيراد')
      return
    }
    if (!depositAccountId) {
      toast.error('يرجى اختيار حساب الإيداع / طريقة الاستلام')
      return
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح')
      return
    }
    if (!payerName.trim()) {
      toast.error('يرجى إدخال اسم المودع / الجهة الدافعة')
      return
    }
    if (!description.trim()) {
      toast.error('يرجى إدخال بيان التحصيل')
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('receipt_no', receiptNo)
      formData.append('date', date)
      formData.append('revenue_account_id', revenueAccountId)
      formData.append('deposit_account_id', depositAccountId)
      formData.append('amount', amount)
      formData.append('currency', currency)
      formData.append('payer_name', payerName)
      if (programId) formData.append('program_id', programId)
      if (programName) formData.append('program_name', programName)
      formData.append('description', description)
      formData.append('status', status)
      if (attachment) {
        formData.append('attachment', attachment)
      }

      if (editingRevenue) {
        await updateRevenue(editingRevenue.id, formData)
        toast.success('تم تحديث سند القبض وإعادة ترحيل القيد المحاسبي المزدوج')
      } else {
        await createRevenue(formData)
        toast.success('تم تسجيل سند القبض بنجاح وتوليد القيد المحاسبي آلياً')
      }

      await handleResetForm()
      await loadRevenues()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'تعذّر حفظ سند القبض'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete / Cancel
  async function handleDelete(revenue: ManualRevenueItem) {
    if (!window.confirm(`هل أنت تأكد من حذف سند القبض (${revenue.receipt_no}) وإلغاء قيوده المحاسبية؟`)) {
      return
    }

    try {
      await deleteRevenue(revenue.id)
      toast.success('تم حذف سند القبض وإلغاء القيد المحاسبي')
      await loadRevenues()
    } catch {
      toast.error('تعذّر حذف سند القبض')
    }
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 font-arabic text-slate-800" dir="rtl">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/20">
              <TrendingUp size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-deepBlue">سندات القبض والإيرادات</h1>
              <p className="text-sm font-semibold text-slate-500">
                إثبات التحصلات وإيرادات النشاط والتمويل، رفع إشعارات السداد وتوليد القيود المزدوجة آلياً
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadRevenues()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-customBlue"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الإيرادات المقبوضة</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-deepBlue font-latin">
              ${(summary?.total_amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 size={13} />
            <span>قيود إيراد متوازنة ومكتملة التحصيل</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي سندات القبض</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-customBlue/10 text-customBlue">
              <FileText size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-deepBlue font-latin">{summary?.total_count ?? 0}</span>
            <span className="mr-2 text-xs font-semibold text-slate-500">سند تحصيل مؤكد</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <TrendingUp size={13} />
            <span>موثقة بإشعارات الإيداع والتحويل</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">أعلى مصادر الإيرادات</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Layers size={20} />
            </div>
          </div>
          <div className="mt-2 space-y-1.5 max-h-20 overflow-y-auto">
            {summary?.by_category && summary.by_category.length > 0 ? (
              summary.by_category.slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-semibold">
                  <span className="truncate text-slate-700">
                    <span className="font-latin text-slate-400 font-bold ml-1">[{c.category_code}]</span>
                    {c.category_name}
                  </span>
                  <span className="font-latin font-bold text-emerald-700">
                    ${Number(c.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">لا توجد إيرادات مسجلة بعد</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 1: Receipt Voucher Form (نموذج تسجيل الإيراد) ──────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
              {editingRevenue ? <Pencil size={16} /> : <Plus size={18} />}
            </div>
            <h2 className="text-lg font-black text-deepBlue">
              {editingRevenue ? `تعديل سند القبض (${editingRevenue.receipt_no})` : 'نموذج تسجيل سند قبض وإيراد جديد'}
            </h2>
          </div>

          {editingRevenue && (
            <button
              type="button"
              onClick={() => void handleResetForm()}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline"
            >
              <X size={14} />
              <span>إلغاء التعديل</span>
            </button>
          )}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* رقم سند القبض */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم سند القبض (Receipt No) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  placeholder="RV-2026-0001"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-latin text-sm font-bold text-deepBlue focus:border-customBlue focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const no = await suggestRevenueReceiptNo()
                    setReceiptNo(no)
                  }}
                  title="توليد رقم جديد تلقائياً"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <Sparkles size={14} />
                </button>
              </div>
            </div>

            {/* التاريخ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                التاريخ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-customBlue focus:outline-none"
              />
            </div>

            {/* نوع الإيراد (بند التحصيل - كود 4) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نوع الإيراد (بند التحصيل - دائن) <span className="text-rose-500">*</span>
              </label>
              <select
                value={revenueAccountId}
                onChange={(e) => setRevenueAccountId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:border-customBlue focus:outline-none"
              >
                <option value="">-- اختر نوع الإيراد من شجرة الحسابات --</option>
                {revenueAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.name_ar} {acc.name_en ? `(${acc.name_en})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* حساب الإيداع / طريقة الاستلام (كود 11 - مدين) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                حساب الإيداع / طريقة الاستلام (مدين) <span className="text-rose-500">*</span>
              </label>
              <select
                value={depositAccountId}
                onChange={(e) => setDepositAccountId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:border-customBlue focus:outline-none"
              >
                <option value="">-- اختر حساب الإيداع (البنك / المحفظة) --</option>
                {depositAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.name_ar} {acc.name_en ? `(${acc.name_en})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* المبلغ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المبلغ <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-latin text-sm font-black text-emerald-800 focus:border-customBlue focus:outline-none"
              />
            </div>

            {/* العملة */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                العملة <span className="text-rose-500">*</span>
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-latin text-sm font-bold text-slate-800 focus:border-customBlue focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="YER">YER (ريال يمني)</option>
                <option value="SAR">SAR (ريال سعودي)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* المودع / الجهة الدافعة */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المودع / الجهة الدافعة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="اسم الطالب، أو الشركة الراعية، أو الجهة المانحة..."
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-customBlue focus:outline-none"
              />
            </div>

            {/* البرنامج / المسار المرتبط (اختياري) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                البرنامج / المسار المرتبط (اختياري)
              </label>
              {programs.length > 0 ? (
                <select
                  value={programId}
                  onChange={(e) => {
                    setProgramId(e.target.value)
                    const p = programs.find((prog) => String(prog.id) === e.target.value)
                    if (p) setProgramName(p.title_ar || p.title || p.name || '')
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-customBlue focus:outline-none"
                >
                  <option value="">-- اختر البرنامج أو المعسكر إن وجد --</option>
                  {programs.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {prog.title_ar || prog.title || prog.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="مثال: مسار الذكاء الاصطناعي، المعسكر المهني..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-customBlue focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* البيان (الوصف) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              البيان / تفاصيل التحصيل <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: رسوم اشتراك الطالب أحمد علي في مسار بايثون أو دفعة رعاية شركة X للهاكاثون"
              required
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 focus:border-customBlue focus:outline-none"
            />
          </div>

          {/* إرفاق إشعار / سند التحصيل (File Upload Dropzone) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              إرفاق إشعار / سند التحصيل (إشعار البنك، سكرينشوت المحفظة، إيصال السداد)
            </label>

            <div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 transition hover:border-emerald-500/50 hover:bg-slate-50">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="absolute inset-0 z-10 opacity-0 cursor-pointer"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-deepBlue">
                      {attachment ? attachment.name : 'انقر هنا أو اسحب إشعار التحويل البنكي / الإيداع هنا'}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {attachment
                        ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB`
                        : 'يدعم صور الحوالات، السكرينشوت، وإشعارات PDF بحد أقصى 10MB'}
                    </p>
                  </div>
                </div>

                {attachmentPreview && (
                  <div className="relative shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
                    <img src={attachmentPreview} alt="المرفق" className="h-12 w-16 object-cover rounded" />
                  </div>
                )}

                {attachment && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFileChange(null)
                    }}
                    className="relative z-20 rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* أزرار التحكم */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => void handleResetForm()}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
            >
              <RefreshCw size={15} />
              <span>مسح الحقول</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              <span>{editingRevenue ? 'حفظ التعديلات وتحديث القيد' : '💾 حفظ وترحيل سند القبض'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Section 2: Revenues Data Table (سجل الإيرادات) ────────────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-emerald-600" />
            <h2 className="text-lg font-black text-deepBlue">سجل وسندات القبض المسجلة</h2>
          </div>

          {/* Search */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم السند، المودع أو البيان..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-xs font-semibold text-slate-800 focus:border-customBlue focus:bg-white focus:outline-none"
            />
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Revenues Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold">
                <th className="py-3.5 px-3">رقم السند</th>
                <th className="py-3.5 px-3">التاريخ</th>
                <th className="py-3.5 px-3">نوع الإيراد (دائن)</th>
                <th className="py-3.5 px-3">الجهة / المودع</th>
                <th className="py-3.5 px-3">طريقة الاستلام (مدين)</th>
                <th className="py-3.5 px-3">المبلغ</th>
                <th className="py-3.5 px-3 text-center">الإشعار (المرفق)</th>
                <th className="py-3.5 px-3 text-center">الحالة</th>
                <th className="py-3.5 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <Loader2 size={24} className="mx-auto animate-spin mb-2" />
                    <span>جارٍ تحميل سجل الإيرادات...</span>
                  </td>
                </tr>
              ) : revenues.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    لا توجد سندات قبض مسجلة تطابق بحثك.
                  </td>
                </tr>
              ) : (
                revenues.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    {/* Receipt No */}
                    <td className="py-3 px-3">
                      <span className="font-latin font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        {item.receipt_no}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 font-latin">{item.date}</td>

                    {/* Revenue Account */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-deepBlue">
                          {item.revenue_account?.name_ar || 'بند إيراد'}
                        </span>
                        <span className="font-latin text-[10px] text-slate-400 font-bold">
                          [{item.revenue_account?.code}]
                        </span>
                      </div>
                    </td>

                    {/* Payer Name */}
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800">{item.payer_name}</span>
                      {item.program_name && (
                        <span className="block text-[10px] text-slate-400">({item.program_name})</span>
                      )}
                    </td>

                    {/* Deposit Account */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="text-slate-800">
                          {item.deposit_account?.name_ar || 'حساب استلام'}
                        </span>
                        <span className="font-latin text-[10px] text-slate-400 font-bold">
                          [{item.deposit_account?.code}]
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3">
                      <span className="font-latin font-black text-emerald-700 text-sm">
                        +${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] font-bold text-slate-400">{item.currency}</span>
                      </span>
                    </td>

                    {/* Attachment */}
                    <td className="py-3 px-3 text-center">
                      {item.attachment_url ? (
                        <a
                          href={item.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition border border-emerald-200"
                        >
                          <Eye size={13} />
                          <span>عرض الإشعار</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        مؤكد ومرحّل
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Print Receipt Modal Trigger */}
                        <button
                          type="button"
                          onClick={() => setViewingRevenue(item)}
                          title="عرض وطباعة سند القبض المحاسبي"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition"
                        >
                          <Printer size={14} />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          title="تعديل السند"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-customBlue hover:text-customBlue transition"
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          title="حذف وإلغاء القيد"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Printable Receipt Modal (معاينة وطباعة سند القبض) ────────── */}
      <AnimatePresence>
        {viewingRevenue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white p-6 shadow-2xl"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setViewingRevenue(null)}
                className="absolute left-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>

              {/* Printable Area Header */}
              <div className="border-b border-slate-200 pb-4 text-center">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <h3 className="text-lg font-black text-deepBlue">منصة المركز التعليمي المتقدم (EMC)</h3>
                    <p className="text-xs font-semibold text-slate-500">إدارة الشؤون المالية - قسم الإيرادات والتحصيل</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 font-latin font-bold text-sm">
                    {viewingRevenue.receipt_no}
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 py-2 font-black text-emerald-800 text-base border border-slate-200">
                  سند قبض مالي (Receipt Voucher)
                </div>
              </div>

              {/* Receipt Details Body */}
              <div className="mt-4 space-y-4 text-xs font-semibold text-slate-800">
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <div>
                    <span className="text-slate-400 block mb-0.5">تاريخ التحصيل:</span>
                    <span className="font-latin font-bold text-slate-900">{viewingRevenue.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">المودع / الجهة الدافعة:</span>
                    <span className="font-bold text-emerald-800 text-sm">{viewingRevenue.payer_name}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">المبلغ المقبوض:</span>
                    <span className="font-latin font-black text-emerald-800 text-xl">
                      +${Number(viewingRevenue.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                      <span className="text-xs">{viewingRevenue.currency}</span>
                    </span>
                  </div>
                </div>

                {/* Double Entry Ledger Details */}
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <span className="font-bold text-deepBlue block border-b border-slate-100 pb-1">
                    الأثر المحاسبي المزدوج (القيود الآلية):
                  </span>

                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400 font-bold ml-2">[من حـ / مدين]</span>
                      <span className="font-bold text-slate-800">
                        {viewingRevenue.deposit_account?.name_ar} ({viewingRevenue.deposit_account?.code})
                      </span>
                    </div>
                    <span className="font-latin font-bold text-emerald-700">
                      +${Number(viewingRevenue.amount).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400 font-bold ml-2">[إلى حـ / دائن]</span>
                      <span className="font-bold text-emerald-800">
                        {viewingRevenue.revenue_account?.name_ar} ({viewingRevenue.revenue_account?.code})
                      </span>
                    </div>
                    <span className="font-latin font-bold text-emerald-700">
                      +${Number(viewingRevenue.amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Statement / Description */}
                <div>
                  <span className="text-slate-400 block mb-1">البيان (تفاصيل الدفعة):</span>
                  <p className="rounded-xl border border-slate-200 bg-white p-3 font-medium text-slate-800">
                    {viewingRevenue.description}
                  </p>
                </div>

                {/* Signatures Footer */}
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 text-center text-[11px] font-bold text-slate-600">
                  <div>
                    <p className="mb-8">توقيع المحصل المختص</p>
                    <p className="text-slate-400 font-normal">({viewingRevenue.creator?.name || 'مدير المالية'})</p>
                  </div>
                  <div>
                    <p className="mb-8">اعتماد الشؤون المالية</p>
                    <p className="text-slate-400 font-normal"> التوقيع: ..................... </p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setViewingRevenue(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  إغلاق
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
                >
                  <Printer size={15} />
                  <span>طباعة سند القبض</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
