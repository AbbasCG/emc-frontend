import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Receipt,
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
  FileCode2,
  Building2,
  Wallet,
  DollarSign,
  ArrowUpRight,
  Eye,
  Loader2,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  fetchExpensesList,
  suggestExpenseVoucherNo,
  createExpense,
  updateExpense,
  deleteExpense,
  type ManualExpenseItem,
  type ExpensesSummary,
} from '@/api/expenseApi'
import { fetchAccountsList, type ChartOfAccountItem } from '@/api/chartOfAccountsApi'
import apiClient from '@/api/axios'

interface DepartmentOption {
  id: number
  name_ar?: string
  name?: string
}

export default function ExpenseManagementPage() {
  const [expenses, setExpenses] = useState<ManualExpenseItem[]>([])
  const [summary, setSummary] = useState<ExpensesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Accounts lists
  const [expenseAccounts, setExpenseAccounts] = useState<ChartOfAccountItem[]>([])
  const [paymentAccounts, setPaymentAccounts] = useState<ChartOfAccountItem[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])

  // Filters state
  const [search, setSearch] = useState('')
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Form states
  const [editingExpense, setEditingExpense] = useState<ManualExpenseItem | null>(null)
  const [voucherNo, setVoucherNo] = useState('')
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [expenseAccountId, setExpenseAccountId] = useState<string>('')
  const [paymentAccountId, setPaymentAccountId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [currency, setCurrency] = useState<string>('USD')
  const [departmentId, setDepartmentId] = useState<string>('')
  const [departmentName, setDepartmentName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [status, setStatus] = useState<'posted' | 'draft'>('posted')

  // File upload state
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)

  // Print & View Voucher Modal state
  const [viewingExpense, setViewingExpense] = useState<ManualExpenseItem | null>(null)

  // Load initial accounts and suggest voucher number
  const loadInitialOptions = useCallback(async () => {
    try {
      const [allAccountsRes, suggestedNoRes, deptsRes] = await Promise.all([
        fetchAccountsList(),
        suggestExpenseVoucherNo(),
        apiClient.get<{ success: boolean; data: DepartmentOption[] }>('/admin/departments').catch(() => ({ data: { data: [] } })),
      ])

      // Categorize accounts
      // Expense Accounts: type='debit' or code starts with 3
      const expensesList = allAccountsRes.filter(
        (a) => a.is_selectable && (a.code.startsWith('3') || a.type === 'debit')
      )
      // Payment/Cash/Bank Accounts: code starts with 11 or 1
      const paymentsList = allAccountsRes.filter(
        (a) => a.is_selectable && (a.code.startsWith('11') || a.code.startsWith('1'))
      )

      setExpenseAccounts(expensesList)
      setPaymentAccounts(paymentsList)

      if (Array.isArray(deptsRes.data.data)) {
        setDepartments(deptsRes.data.data)
      }

      setVoucherNo(suggestedNoRes)
    } catch {
      toast.error('تعذّر تحميل بيانات الحسابات الأولية')
    }
  }, [])

  // Load expenses list
  const loadExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchExpensesList({
        search,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        department_id: selectedDeptFilter ? Number(selectedDeptFilter) : undefined,
      })
      setExpenses(res.items)
      setSummary(res.summary)
    } catch {
      toast.error('تعذّر تحميل سجل المصروفات')
    } finally {
      setLoading(false)
    }
  }, [search, dateFrom, dateTo, selectedDeptFilter])

  useEffect(() => {
    void loadInitialOptions()
  }, [loadInitialOptions])

  useEffect(() => {
    void loadExpenses()
  }, [loadExpenses])

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
    setEditingExpense(null)
    setDate(new Date().toISOString().split('T')[0])
    setExpenseAccountId('')
    setPaymentAccountId('')
    setAmount('')
    setCurrency('USD')
    setDepartmentId('')
    setDepartmentName('')
    setDescription('')
    setStatus('posted')
    setAttachment(null)
    setAttachmentPreview(null)

    try {
      const nextNo = await suggestExpenseVoucherNo()
      setVoucherNo(nextNo)
    } catch {
      /* ignore */
    }
  }

  // Populate form for editing
  function handleEdit(expense: ManualExpenseItem) {
    setEditingExpense(expense)
    setVoucherNo(expense.voucher_no)
    setDate(expense.date)
    setExpenseAccountId(String(expense.expense_account_id))
    setPaymentAccountId(String(expense.payment_account_id))
    setAmount(String(expense.amount))
    setCurrency(expense.currency || 'USD')
    setDepartmentId(expense.department_id ? String(expense.department_id) : '')
    setDepartmentName(expense.department_name || '')
    setDescription(expense.description || '')
    setStatus(expense.status === 'cancelled' ? 'posted' : expense.status)
    setAttachment(null)
    setAttachmentPreview(expense.attachment_url || null)

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle Form Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!expenseAccountId) {
      toast.error('يرجى اختيار بند المصروف')
      return
    }
    if (!paymentAccountId) {
      toast.error('يرجى اختيار طريقة الدفع (حساب الصرف)')
      return
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح')
      return
    }
    if (!description.trim()) {
      toast.error('يرجى إدخال بيان المصروف')
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('voucher_no', voucherNo)
      formData.append('date', date)
      formData.append('expense_account_id', expenseAccountId)
      formData.append('payment_account_id', paymentAccountId)
      formData.append('amount', amount)
      formData.append('currency', currency)
      if (departmentId) formData.append('department_id', departmentId)
      if (departmentName) formData.append('department_name', departmentName)
      formData.append('description', description)
      formData.append('status', status)
      if (attachment) {
        formData.append('attachment', attachment)
      }

      if (editingExpense) {
        await updateExpense(editingExpense.id, formData)
        toast.success('تم تحديث سند الصرف وإعادة ترحيل القيد المحاسبي بنجاح')
      } else {
        await createExpense(formData)
        toast.success('تم تسجيل وسند الصرف بنجاح وتوليد القيد المحاسبي المزدوج')
      }

      await handleResetForm()
      await loadExpenses()
    } catch (err: any) {
      const msg = err.response?.data?.message || 'تعذّر حفظ سند الصرف'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete / Cancel
  async function handleDelete(expense: ManualExpenseItem) {
    if (!window.confirm(`هل أنت تأكد من حذف سند الصرف (${expense.voucher_no}) وإلغاء قيوده المحاسبية؟`)) {
      return
    }

    try {
      await deleteExpense(expense.id)
      toast.success('تم حذف سند الصرف وإلغاء القيد المحاسبي')
      await loadExpenses()
    } catch {
      toast.error('تعذّر حذف سند الصرف')
    }
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 font-arabic text-slate-800" dir="rtl">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-customBlue to-deepBlue text-white shadow-md shadow-customBlue/20">
              <Receipt size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-deepBlue">سندات المصروفات اليدوية</h1>
              <p className="text-sm font-semibold text-slate-500">
                تسجيل وحفظ سندات الصرف، رفع المرفقات وتوليد القيود المحاسبية المزدوجة آلياً
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void loadExpenses()}
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
            <span className="text-xs font-bold text-slate-500">إجمالي المصروفات المرحّلة</span>
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
            <span>قيود متوازنة ومرحّلة لقاعدة البيانات</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي سندات الصرف</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-customBlue/10 text-customBlue">
              <Receipt size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-deepBlue font-latin">{summary?.total_count ?? 0}</span>
            <span className="mr-2 text-xs font-semibold text-slate-500">سند مُعتمد</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <FileText size={13} />
            <span>سجل محاسبي موثق بالمرفقات</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">أعلى بنود المصروفات</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
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
                  <span className="font-latin font-bold text-deepBlue">
                    ${Number(c.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">لا توجد حركات مسجلة بعد</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 1: Expense Entry Form (نموذج تسجيل المصروف) ──────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-customBlue/10 text-customBlue font-bold">
              {editingExpense ? <Pencil size={16} /> : <Plus size={18} />}
            </div>
            <h2 className="text-lg font-black text-deepBlue">
              {editingExpense ? `تعديل سند الصرف (${editingExpense.voucher_no})` : 'نموذج تسجيل مصروف جديد'}
            </h2>
          </div>

          {editingExpense && (
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
            {/* رقم السند */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم السند (Voucher No) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={voucherNo}
                  onChange={(e) => setVoucherNo(e.target.value)}
                  placeholder="PV-2026-0001"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-latin text-sm font-bold text-deepBlue focus:border-customBlue focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const no = await suggestExpenseVoucherNo()
                    setVoucherNo(no)
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

            {/* بند المصروف (نوع الصرف - كود 3) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                نوع الصرف / بند المصروف (حساب المصروف - مدين) <span className="text-rose-500">*</span>
              </label>
              <select
                value={expenseAccountId}
                onChange={(e) => setExpenseAccountId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:border-customBlue focus:outline-none"
              >
                <option value="">-- اختر بند المصروف من شجرة الحسابات --</option>
                {expenseAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.code}] {acc.name_ar} {acc.name_en ? `(${acc.name_en})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* طريقة الدفع / حساب الصرف (كود 11) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                طريقة الدفع (حساب الصرف - دائن) <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:border-customBlue focus:outline-none"
              >
                <option value="">-- اختر حساب الدفع (البنك / المحفظة) --</option>
                {paymentAccounts.map((acc) => (
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-latin text-sm font-black text-deepBlue focus:border-customBlue focus:outline-none"
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
            {/* الإدارة / القسم المستفيد */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الإدارة / القسم المستفيد
              </label>
              {departments.length > 0 ? (
                <select
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value)
                    const d = departments.find((dept) => String(dept.id) === e.target.value)
                    if (d) setDepartmentName(d.name_ar || d.name || '')
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-customBlue focus:outline-none"
                >
                  <option value="">-- اختر الإدارة المستفيدة --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name_ar || dept.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  placeholder="مثال: إدارة التقنية والتشغيل"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-customBlue focus:outline-none"
                />
              )}
            </div>

            {/* حالة السند */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">حالة السند</label>
              <div className="flex items-center gap-4 pt-1.5">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="posted"
                    checked={status === 'posted'}
                    onChange={() => setStatus('posted')}
                    className="accent-customBlue"
                  />
                  <span className="text-emerald-700">مُعتمد ومرحّل تلقائياً</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    className="accent-customBlue"
                  />
                  <span className="text-slate-600">مسودة (غير مرحّل)</span>
                </label>
              </div>
            </div>
          </div>

          {/* البيان (الوصف) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              البيان / تفاصيل الصرف <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: تجديد اشتراك سيرفرات المنصة وحزمت النطاقات لشهر أكتوبر 2026"
              required
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 focus:border-customBlue focus:outline-none"
            />
          </div>

          {/* إرفاق سند الصرف (File Upload Dropzone) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              إرفاق سند الصرف / الفاتورة (PNG, JPG, PDF - أقصى 10MB)
            </label>

            <div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 transition hover:border-customBlue/50 hover:bg-slate-50">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="absolute inset-0 z-10 opacity-0 cursor-pointer"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-customBlue/10 text-customBlue">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-deepBlue">
                      {attachment ? attachment.name : 'انقر هنا أو اسحب الملف المرفق هنا'}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {attachment
                        ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB`
                        : 'يدعم الفواتير الإلكترونية وصور سندات القبض والدفع'}
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
              className="flex items-center gap-2 rounded-xl bg-customBlue px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-customBlue/20 transition hover:bg-deepBlue disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              <span>{editingExpense ? 'حفظ التعديلات وتحديث القيد' : '💾 حفظ وترحيل السند'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Section 2: Expenses Data Table (سجل المصروفات) ────────────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-customBlue" />
            <h2 className="text-lg font-black text-deepBlue">سجل وسندات المصروفات المسجلة</h2>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم السند أو البيان..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-xs font-semibold text-slate-800 focus:border-customBlue focus:bg-white focus:outline-none"
              />
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Department Filter */}
            {departments.length > 0 && (
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-customBlue focus:outline-none"
              >
                <option value="">كل الإدارات</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name_ar || d.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Expenses Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold">
                <th className="py-3.5 px-3">رقم السند</th>
                <th className="py-3.5 px-3">التاريخ</th>
                <th className="py-3.5 px-3">نوع المصروف (مدين)</th>
                <th className="py-3.5 px-3">طريقة الدفع (دائن)</th>
                <th className="py-3.5 px-3">الإدارة</th>
                <th className="py-3.5 px-3">المبلغ</th>
                <th className="py-3.5 px-3 text-center">سند الصرف (المرفق)</th>
                <th className="py-3.5 px-3 text-center">الحالة</th>
                <th className="py-3.5 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <Loader2 size={24} className="mx-auto animate-spin mb-2" />
                    <span>جارٍ تحميل سجل المصروفات...</span>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    لا توجد سندات مصروفات مسجلة تطابق فلتر البحث.
                  </td>
                </tr>
              ) : (
                expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    {/* Voucher No */}
                    <td className="py-3 px-3">
                      <span className="font-latin font-bold text-deepBlue bg-slate-100 px-2 py-1 rounded-md">
                        {item.voucher_no}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 font-latin">{item.date}</td>

                    {/* Expense Account */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-deepBlue">
                          {item.expense_account?.name_ar || 'بند مصروف'}
                        </span>
                        <span className="font-latin text-[10px] text-slate-400 font-bold">
                          [{item.expense_account?.code}]
                        </span>
                      </div>
                    </td>

                    {/* Payment Account */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="text-slate-800">
                          {item.payment_account?.name_ar || 'حساب نقد/بنك'}
                        </span>
                        <span className="font-latin text-[10px] text-slate-400 font-bold">
                          [{item.payment_account?.code}]
                        </span>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        {item.department_name || item.department?.name_ar || 'عام'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3">
                      <span className="font-latin font-black text-emerald-700 text-sm">
                        ${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
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
                          className="inline-flex items-center gap-1 rounded-lg bg-customBlue/10 px-2.5 py-1 text-[11px] font-bold text-customBlue hover:bg-customBlue hover:text-white transition"
                        >
                          <Eye size={13} />
                          <span>عرض السند</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      {item.status === 'posted' ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          مُعتمد ومرحّل
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 border border-amber-200">
                          مسودة
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Print Voucher Modal Trigger */}
                        <button
                          type="button"
                          onClick={() => setViewingExpense(item)}
                          title="عرض وطباعة السند المحاسبي"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-customBlue hover:text-customBlue transition"
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

      {/* ── Section 3: Printable Voucher Modal (معاينة وطباعة سند الصرف) ────────── */}
      <AnimatePresence>
        {viewingExpense && (
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
                onClick={() => setViewingExpense(null)}
                className="absolute left-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>

              {/* Printable Area Header */}
              <div className="border-b border-slate-200 pb-4 text-center">
                <div className="flex items-center justify-between">
                  <div className="text-right">
                    <h3 className="text-lg font-black text-deepBlue">منصة المركز التعليمي المتقدم (EMC)</h3>
                    <p className="text-xs font-semibold text-slate-500">إدارة الشؤون المالية - قسم الحسابات</p>
                  </div>
                  <div className="rounded-xl bg-customBlue/10 p-3 text-customBlue font-latin font-bold text-sm">
                    {viewingExpense.voucher_no}
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 py-2 font-black text-deepBlue text-base border border-slate-200">
                  سند صرف مالي (Payment Voucher)
                </div>
              </div>

              {/* Voucher Details Body */}
              <div className="mt-4 space-y-4 text-xs font-semibold text-slate-800">
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <div>
                    <span className="text-slate-400 block mb-0.5">تاريخ الصرف:</span>
                    <span className="font-latin font-bold text-slate-900">{viewingExpense.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">الإدارة / القسم المستفيد:</span>
                    <span className="font-bold text-slate-900">
                      {viewingExpense.department_name || viewingExpense.department?.name_ar || 'عام'}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">المبلغ المدفوع:</span>
                    <span className="font-latin font-black text-emerald-800 text-xl">
                      ${Number(viewingExpense.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                      <span className="text-xs">{viewingExpense.currency}</span>
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
                      <span className="font-bold text-deepBlue">
                        {viewingExpense.expense_account?.name_ar} ({viewingExpense.expense_account?.code})
                      </span>
                    </div>
                    <span className="font-latin font-bold text-emerald-700">
                      +${Number(viewingExpense.amount).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400 font-bold ml-2">[إلى حـ / دائن]</span>
                      <span className="font-bold text-slate-800">
                        {viewingExpense.payment_account?.name_ar} ({viewingExpense.payment_account?.code})
                      </span>
                    </div>
                    <span className="font-latin font-bold text-rose-600">
                      -${Number(viewingExpense.amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Statement / Description */}
                <div>
                  <span className="text-slate-400 block mb-1">البيان (الوصف التفصيلي):</span>
                  <p className="rounded-xl border border-slate-200 bg-white p-3 font-medium text-slate-800">
                    {viewingExpense.description}
                  </p>
                </div>

                {/* Signatures Footer */}
                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-200 pt-6 text-center text-[11px] font-bold text-slate-600">
                  <div>
                    <p className="mb-8">إعداد الموظف المختص</p>
                    <p className="text-slate-400 font-normal">({viewingExpense.creator?.name || 'مدير المالية'})</p>
                  </div>
                  <div>
                    <p className="mb-8">اعتماد مدير المالية</p>
                    <p className="text-slate-400 font-normal"> التوقيع: ..................... </p>
                  </div>
                  <div>
                    <p className="mb-8">توقيع المستلم / المستفيد</p>
                    <p className="text-slate-400 font-normal"> التوقيع: ..................... </p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setViewingExpense(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  إغلاق
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-xl bg-customBlue px-5 py-2 text-xs font-bold text-white shadow-md shadow-customBlue/20 hover:bg-deepBlue"
                >
                  <Printer size={15} />
                  <span>طباعة سند الصرف</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
