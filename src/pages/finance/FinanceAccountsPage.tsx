import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Banknote, CreditCard, Globe, Wallet, Circle,
  Plus, Pencil, RefreshCw, X, Eye, Check, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { FinanceAccount } from '@/types/intelligence'
import {
  fetchFinanceAccounts,
  createFinanceAccount,
  updateFinanceAccount,
} from '@/api/financeApi'
import { formatFinanceForeignCurrency } from '@/utils/financeFormatters'

// ── helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number, currency = 'EUR') =>
  formatFinanceForeignCurrency(amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: 'بنك',
  cash: 'نقدي',
  paypal: 'PayPal',
  stripe: 'Stripe',
  payment_gateway: 'بوابة دفع',
  wallet: 'محفظة',
  other: 'أخرى',
}

const ACCOUNT_TYPE_ICONS: Record<string, React.ElementType> = {
  bank: Building2,
  cash: Banknote,
  paypal: CreditCard,
  stripe: CreditCard,
  payment_gateway: Globe,
  wallet: Wallet,
  other: Circle,
}

const CURRENCY_COLORS: Record<string, string> = {
  EUR: 'bg-blue-100 text-blue-700',
  USD: 'bg-green-100 text-green-700',
  SAR: 'bg-teal-100 text-teal-700',
  TRY: 'bg-orange-100 text-orange-700',
  GBP: 'bg-purple-100 text-purple-700',
}

const TYPE_COLORS: Record<string, string> = {
  bank: 'bg-indigo-100 text-indigo-700',
  cash: 'bg-emerald-100 text-emerald-700',
  paypal: 'bg-blue-100 text-blue-700',
  stripe: 'bg-violet-100 text-violet-700',
  payment_gateway: 'bg-cyan-100 text-cyan-700',
  wallet: 'bg-amber-100 text-amber-700',
  other: 'bg-slate-100 text-slate-600',
}

// ── animations ───────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

// ── AccountCard ───────────────────────────────────────────────────────────────

interface AccountCardProps {
  account: FinanceAccount
  onEdit: (acc: FinanceAccount) => void
  onViewTransactions: (acc: FinanceAccount) => void
}

function AccountCard({ account, onEdit, onViewTransactions }: AccountCardProps) {
  const Icon = ACCOUNT_TYPE_ICONS[account.type] ?? Circle
  const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? account.type
  const typeColor = TYPE_COLORS[account.type] ?? 'bg-slate-100 text-slate-600'
  const currColor = CURRENCY_COLORS[account.currency?.toUpperCase()] ?? 'bg-slate-100 text-slate-600'

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 flex flex-col gap-4 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">{account.name}</p>
            {account.bank_name && (
              <p className="text-xs text-slate-400 mt-0.5">{account.bank_name}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor}`}>{typeLabel}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${currColor}`}>{account.currency}</span>
          {account.is_active ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">نشط</span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">غير نشط</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Balances */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">الرصيد الحالي</span>
          <span className="text-lg font-bold text-slate-800 tabular-nums" dir="ltr">
            {formatCurrency(account.current_balance ?? 0, account.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">الرصيد الافتتاحي</span>
          <span className="text-sm text-slate-600 tabular-nums" dir="ltr">
            {formatCurrency(account.opening_balance ?? 0, account.currency)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(account)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          تعديل
        </button>
        <button
          onClick={() => onViewTransactions(account)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          عرض المعاملات
        </button>
      </div>
    </motion.div>
  )
}

// ── AccountModal ──────────────────────────────────────────────────────────────

type FormData = {
  name: string
  account_type: string
  bank_name: string
  account_holder: string
  iban: string
  account_number: string
  currency: string
  opening_balance: string
  notes: string
  is_active: boolean
}

const EMPTY_FORM: FormData = {
  name: '', account_type: 'bank', bank_name: '', account_holder: '',
  iban: '', account_number: '', currency: 'EUR', opening_balance: '0',
  notes: '', is_active: true,
}

interface AccountModalProps {
  account: FinanceAccount | null
  onClose: () => void
  onSaved: () => void
}

function AccountModal({ account, onClose, onSaved }: AccountModalProps) {
  const isEdit = !!account
  const [form, setForm] = useState<FormData>(() =>
    account
      ? {
          name: account.name,
          account_type: account.type,
          bank_name: account.bank_name ?? '',
          account_holder: account.account_holder ?? '',
          iban: account.iban ?? '',
          account_number: account.account_number ?? '',
          currency: account.currency,
          opening_balance: String(account.opening_balance ?? 0),
          notes: account.notes ?? '',
          is_active: account.is_active,
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('اسم الحساب مطلوب'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        type: form.account_type,
        bank_name: form.bank_name || undefined,
        account_holder: form.account_holder || undefined,
        iban: form.iban || undefined,
        account_number: form.account_number || undefined,
        currency: form.currency,
        opening_balance: parseFloat(form.opening_balance) || 0,
        notes: form.notes || undefined,
        is_active: form.is_active,
      }
      if (isEdit) {
        await updateFinanceAccount(account!.id, payload as Parameters<typeof updateFinanceAccount>[1])
        toast.success('تم تحديث الحساب بنجاح')
      } else {
        await createFinanceAccount(payload as Parameters<typeof createFinanceAccount>[0])
        toast.success('تم إنشاء الحساب بنجاح')
      }
      onSaved()
    } catch {
      toast.error('حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const showBankFields = form.account_type === 'bank'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          {/* Modal header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'تعديل الحساب' : 'إضافة حساب جديد'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4" dir="rtl">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">اسم الحساب *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="مثال: حساب ING الرئيسي"
              />
            </div>

            {/* Type + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">نوع الحساب</label>
                <select
                  value={form.account_type}
                  onChange={e => set('account_type', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">العملة</label>
                <select
                  value={form.currency}
                  onChange={e => set('currency', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {['EUR', 'USD', 'SAR', 'TRY', 'GBP'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bank-specific fields */}
            {showBankFields && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">اسم البنك</label>
                    <input
                      type="text"
                      value={form.bank_name}
                      onChange={e => set('bank_name', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      placeholder="ING, ABN AMRO..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">صاحب الحساب</label>
                    <input
                      type="text"
                      value={form.account_holder}
                      onChange={e => set('account_holder', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">IBAN</label>
                    <input
                      type="text"
                      value={form.iban}
                      onChange={e => set('iban', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ltr"
                      placeholder="NL91 ABNA..."
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">رقم الحساب</label>
                    <input
                      type="text"
                      value={form.account_number}
                      onChange={e => set('account_number', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      dir="ltr"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Opening balance (only for create) */}
            {!isEdit && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">الرصيد الافتتاحي *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.opening_balance}
                  onChange={e => set('opening_balance', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  dir="ltr"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              />
            </div>

            {/* is_active toggle (edit only) */}
            {isEdit && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set('is_active', !form.is_active)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_active ? 'right-0.5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm text-slate-700">{form.is_active ? 'نشط' : 'غير نشط'}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isEdit ? 'حفظ التعديلات' : 'إنشاء الحساب'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FinanceAccountsPage() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterCurrency, setFilterCurrency] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [modalAccount, setModalAccount] = useState<FinanceAccount | null | 'new'>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await fetchFinanceAccounts()
        if (alive) setAccounts(data)
      } catch {
        if (alive) toast.error('فشل تحميل الحسابات')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  /** Imperative refresh from an event handler — outside any effect, so the
   *  synchronous loading flip is allowed. */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchFinanceAccounts()
      setAccounts(data)
    } catch {
      toast.error('فشل تحميل الحسابات')
    } finally {
      setLoading(false)
    }
  }, [])

  const filtered = accounts.filter(a => {
    if (filterType && a.type !== filterType) return false
    if (filterCurrency && a.currency !== filterCurrency) return false
    if (filterActive === 'active' && !a.is_active) return false
    if (filterActive === 'inactive' && a.is_active) return false
    return true
  })

  const handleViewTransactions = (acc: FinanceAccount) => {
    window.location.href = `/dashboard/finance/transactions?account_id=${acc.id}`
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white">النقدية والحسابات</h1>
          <p className="text-slate-400 text-sm mt-1">إدارة الحسابات المصرفية والنقدية</p>
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <div className="text-center bg-white/10 rounded-xl px-4 py-2">
              <p className="text-xs text-slate-400">إجمالي الحسابات</p>
              <p className="text-lg font-bold text-white">{accounts.length}</p>
            </div>
            <div className="text-center bg-white/10 rounded-xl px-4 py-2">
              <p className="text-xs text-slate-400">حسابات نشطة</p>
              <p className="text-lg font-bold text-white">{accounts.filter(a => a.is_active).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">كل الأنواع</option>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={filterCurrency}
            onChange={e => setFilterCurrency(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">كل العملات</option>
            {['EUR', 'USD', 'SAR', 'TRY', 'GBP'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterActive}
            onChange={e => setFilterActive(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">الكل</option>
            <option value="active">نشط فقط</option>
            <option value="inactive">غير نشط</option>
          </select>
          <button
            onClick={load}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <button
          onClick={() => setModalAccount('new')}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة حساب
        </button>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد حسابات</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filtered.map(acc => (
              <AccountCard
                key={acc.id}
                account={acc}
                onEdit={a => setModalAccount(a)}
                onViewTransactions={handleViewTransactions}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Modal */}
      {modalAccount !== null && (
        <AccountModal
          account={modalAccount === 'new' ? null : modalAccount}
          onClose={() => setModalAccount(null)}
          onSaved={() => { setModalAccount(null); load() }}
        />
      )}
    </div>
  )
}
