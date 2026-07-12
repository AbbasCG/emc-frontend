import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Banknote, Building2, CreditCard, Loader2, Plus, TrendingUp, TrendingDown, X } from 'lucide-react'
import {
  addAccountTransaction,
  createFinanceAccount,
  fetchFinanceAccounts,
} from '@/api/financeApi'
import type { FinanceAccount } from '@/types/intelligence'
import { formatEuro, formatSAR } from '@/utils/currency'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtBalance(n: number, currency = 'EUR') {
  const c = currency.toUpperCase()
  if (c === 'EUR') return formatEuro(n, { locale: 'nl-NL', maximumFractionDigits: 2 })
  if (c === 'SAR') return formatSAR(n)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(n)
}

const ACCOUNT_ICON: Record<string, React.ElementType> = {
  bank: Building2,
  cash: Banknote,
  paypal: CreditCard,
  stripe: CreditCard,
  ing: Building2,
  other: Banknote,
}

const ACCOUNT_TYPE_AR: Record<string, string> = {
  bank: 'بنك',
  cash: 'نقدي',
  paypal: 'PayPal',
  stripe: 'Stripe',
  ing: 'ING',
  other: 'أخرى',
}

const ACCOUNT_COLORS: string[] = [
  'from-sky-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
]

// ── Account card ─────────────────────────────────────────────────────────────

function AccountCard({ account, onAddTxn }: { account: FinanceAccount; onAddTxn: (a: FinanceAccount) => void }) {
  const Icon = ACCOUNT_ICON[account.type] ?? Banknote
  const gradient = ACCOUNT_COLORS[account.id % ACCOUNT_COLORS.length]
  const diff = account.current_balance - account.opening_balance
  const isPositive = diff >= 0

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <div className="rounded-xl bg-white/20 p-2">
          <Icon size={20} className="text-white" />
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
          {ACCOUNT_TYPE_AR[account.type] ?? account.type}
        </span>
      </div>

      <p className="mt-4 text-sm font-bold opacity-80">{account.name}</p>
      <p className="mt-1 text-2xl font-black tabular-nums" dir="ltr">
        {fmtBalance(account.current_balance, account.currency)}
      </p>

      <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold opacity-70">
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span dir="ltr">{isPositive ? '+' : ''}{fmtBalance(diff, account.currency)} منذ الفتح</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3">
        <span className="text-[10px] font-semibold opacity-60">الرصيد الافتتاحي: <span dir="ltr">{fmtBalance(account.opening_balance, account.currency)}</span></span>
        <button
          type="button"
          onClick={() => onAddTxn(account)}
          className="rounded-xl bg-white/20 px-3 py-1.5 text-[11px] font-black transition hover:bg-white/30"
        >
          + عملية
        </button>
      </div>
    </div>
  )
}

// ── Add Account Modal ─────────────────────────────────────────────────────────

function AddAccountModal({ onClose, onAdded }: { onClose: () => void; onAdded: (a: FinanceAccount) => void }) {
  const [form, setForm] = useState({ name: '', type: 'bank', currency: 'EUR', opening_balance: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const acc = await createFinanceAccount({
        name: form.name,
        type: form.type,
        currency: form.currency,
        opening_balance: form.opening_balance ? Number(form.opening_balance) : 0,
        notes: form.notes || undefined,
      })
      onAdded(acc)
      onClose()
    } catch {
      setErr('تعذّر إنشاء الحساب. تحقق من البيانات وأعد المحاولة.')
    } finally {
      setBusy(false)
    }
  }

  return Modal(
    <form dir="rtl" onSubmit={submit} className="space-y-4">
      <Field label="اسم الحساب">
        <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className={inputCls} placeholder="مثال: حساب ING الرئيسي" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="نوع الحساب">
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
            <option value="bank">بنك</option>
            <option value="cash">نقدي</option>
            <option value="paypal">PayPal</option>
            <option value="stripe">Stripe</option>
            <option value="ing">ING</option>
            <option value="other">أخرى</option>
          </select>
        </Field>
        <Field label="العملة">
          <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={inputCls}>
            <option value="EUR">EUR €</option>
            <option value="USD">USD $</option>
            <option value="SAR">SAR ر.س</option>
            <option value="TRY">TRY ₺</option>
          </select>
        </Field>
      </div>
      <Field label="الرصيد الافتتاحي">
        <input type="number" step="0.01" min="0" value={form.opening_balance}
          onChange={e => setForm(f => ({ ...f, opening_balance: e.target.value }))}
          className={inputCls} placeholder="0.00" dir="ltr" />
      </Field>
      <Field label="ملاحظات (اختياري)">
        <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className={inputCls + ' resize-none'} />
      </Field>
      {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
      <ModalActions busy={busy} onClose={onClose} label="إنشاء الحساب" />
    </form>,
    'إضافة حساب مالي', onClose
  )
}

// ── Add Transaction Modal ─────────────────────────────────────────────────────

function AddTransactionModal({ account, onClose, onAdded }: {
  account: FinanceAccount; onClose: () => void; onAdded: (updated: FinanceAccount) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    type: 'revenue', category: '', amount: '', currency: account.currency,
    status: 'confirmed', description: '', payment_method: '', transaction_date: today,
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) { setErr('الرجاء إدخال مبلغ صحيح'); return }
    setErr('')
    setBusy(true)
    try {
      const updated = await addAccountTransaction(account.id, {
        type: form.type,
        category: form.category || undefined,
        amount: Number(form.amount),
        currency: form.currency,
        status: form.status,
        description: form.description || undefined,
        payment_method: form.payment_method || undefined,
        transaction_date: form.transaction_date,
      })
      onAdded(updated)
      onClose()
    } catch {
      setErr('تعذّر إضافة العملية.')
    } finally {
      setBusy(false)
    }
  }

  return Modal(
    <form dir="rtl" onSubmit={submit} className="space-y-4">
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-deepBlue">
        الحساب: <span className="text-customBlue">{account.name}</span>
        &nbsp;—&nbsp; الرصيد الحالي: <span dir="ltr">{fmtBalance(account.current_balance, account.currency)}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="نوع العملية">
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
            <option value="revenue">إيراد</option>
            <option value="expense">مصروف</option>
            <option value="transfer">تحويل</option>
            <option value="balance_adjustment">تعديل رصيد</option>
          </select>
        </Field>
        <Field label="التصنيف">
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
            <option value="">— بدون —</option>
            <option value="courses">دورات</option>
            <option value="workshops">ورش</option>
            <option value="salaries">رواتب</option>
            <option value="operations">تشغيل</option>
            <option value="marketing">تسويق</option>
            <option value="subscriptions">اشتراكات</option>
            <option value="other">أخرى</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="المبلغ">
          <input required type="number" step="0.01" min="0.01" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            className={inputCls} placeholder="0.00" dir="ltr" />
        </Field>
        <Field label="العملة">
          <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={inputCls}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="SAR">SAR</option>
            <option value="TRY">TRY</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="الحالة">
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
            <option value="confirmed">مؤكدة</option>
            <option value="pending">معلقة</option>
            <option value="cancelled">ملغية</option>
          </select>
        </Field>
        <Field label="تاريخ العملية">
          <input type="date" required value={form.transaction_date}
            onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))}
            className={inputCls} dir="ltr" />
        </Field>
      </div>
      <Field label="الوصف">
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className={inputCls} placeholder="وصف اختياري..." />
      </Field>
      {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
      <ModalActions busy={busy} onClose={onClose} label="إضافة العملية" />
    </form>,
    `إضافة عملية — ${account.name}`, onClose
  )
}

// ── Shared modal helpers ──────────────────────────────────────────────────────

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-deepBlue focus:border-customBlue focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 text-right text-[11px] font-black text-deepBlue">
      {label}
      {children}
    </div>
  )
}

function ModalActions({ busy, onClose, label }: { busy: boolean; onClose: () => void; label: string }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-black text-slate-500 transition hover:text-deepBlue">
        إلغاء
      </button>
      <button type="submit" disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-customOrange px-6 text-sm font-black text-white shadow-sm transition hover:opacity-90 disabled:opacity-60">
        {busy && <Loader2 size={14} className="animate-spin" />}
        {label}
      </button>
    </div>
  )
}

function Modal(children: React.ReactNode, title: string, onClose: () => void) {
  return createPortal(
    <AnimatePresence>
      <motion.div className="fixed inset-0" style={{ zIndex: 300 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-deepBlue/30 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2"
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        >
          <div className="mb-5 flex items-center justify-between" dir="rtl">
            <h2 className="text-base font-black text-deepBlue">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 transition hover:bg-slate-100">
              <X size={18} className="text-slate-500" />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FinanceAccountsTab() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [addTxnTarget, setAddTxnTarget] = useState<FinanceAccount | null>(null)

  useEffect(() => {
    void fetchFinanceAccounts().then(a => { setAccounts(a); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  function handleAccountAdded(acc: FinanceAccount) {
    setAccounts(prev => [...prev, acc])
  }

  function handleTxnAdded(updated: FinanceAccount) {
    setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  const totalEur = accounts.filter(a => a.currency === 'EUR').reduce((s, a) => s + a.current_balance, 0)

  return (
    <div dir="rtl" className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">إجمالي النقدية (EUR)</p>
          <p className="mt-1 text-2xl font-black text-deepBlue tabular-nums" dir="ltr">
            {formatEuro(totalEur, { locale: 'nl-NL' })}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">{accounts.length} حساب نشط</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddAccount(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-customOrange px-5 text-sm font-black text-white shadow-sm transition hover:opacity-90"
        >
          <Plus size={16} />
          إضافة حساب
        </button>
      </div>

      {/* Account grid */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-sm font-bold text-slate-500">
          <Loader2 className="animate-spin text-customBlue" size={20} />
          جاري تحميل الحسابات...
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Banknote size={26} />
          </div>
          <p className="mt-4 text-sm font-black text-deepBlue">لا توجد حسابات مالية بعد</p>
          <p className="mt-1.5 text-xs font-semibold text-slate-400">أضف حسابك الأول لبدء تتبع الأرصدة.</p>
          <button
            type="button"
            onClick={() => setShowAddAccount(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-customOrange px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:opacity-90"
          >
            <Plus size={15} />
            إضافة أول حساب
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map(acc => (
            <AccountCard key={acc.id} account={acc} onAddTxn={a => setAddTxnTarget(a)} />
          ))}
        </div>
      )}

      {showAddAccount && (
        <AddAccountModal onClose={() => setShowAddAccount(false)} onAdded={handleAccountAdded} />
      )}
      {addTxnTarget && (
        <AddTransactionModal account={addTxnTarget} onClose={() => setAddTxnTarget(null)} onAdded={handleTxnAdded} />
      )}
    </div>
  )
}
