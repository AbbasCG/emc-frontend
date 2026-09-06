import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, Building2, CreditCard, MoreHorizontal, Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { formatFinanceForeignCurrency } from '@/utils/financeFormatters'
import type { FinanceAccount, FinancePaymentRow } from '@/types/intelligence'
import { accountIncomingOutgoing } from './derivations'
import { providerLabelAr } from './chartConfig'
import { SectionShell } from './shared'

const TYPE_ICON: Record<string, React.ElementType> = {
  bank: Building2,
  stripe: CreditCard,
  paypal: CreditCard,
  cash: Wallet,
  ing: Building2,
  wise: Wallet,
  rabobank: Building2,
}

function fmt(n: number, currency: string) {
  return formatFinanceForeignCurrency(n, currency)
}

function AccountCard({
  account,
  payments,
  financeBase,
}: {
  account: FinanceAccount
  payments: FinancePaymentRow[]
  financeBase: string
}) {
  const Icon = TYPE_ICON[account.type.toLowerCase()] ?? Building2
  const { incoming, outgoing, pending } = accountIncomingOutgoing(account, payments)
  const diff = account.current_balance - account.opening_balance
  const positive = diff >= 0

  return (
    <motion.article
      whileHover={{ y: -4, transition: { duration: 0.22 } }}
      className="group relative overflow-hidden rounded-2xl border border-deepBlue/[0.06] bg-white p-4 shadow-sm transition-shadow hover:shadow-[0_12px_32px_-14px_rgba(12,42,75,0.18)]"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-brand-500 to-brand-600 opacity-80" />

      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="rounded-lg p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-slate-50 hover:text-slate-500"
          aria-label="المزيد"
        >
          <MoreHorizontal size={16} />
        </button>
        <div className="flex items-center gap-2">
          <div>
            <p className="text-right text-sm font-black text-deepBlue">{account.name}</p>
            <p className="text-right text-[10px] font-bold text-slate-400">
              {providerLabelAr(account.type)} · {account.currency}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
            <Icon size={18} />
          </div>
        </div>
      </div>

      <p className="mt-4 text-right font-latin text-2xl font-black tabular-nums text-deepBlue" dir="ltr">
        {fmt(account.current_balance, account.currency)}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-emerald-50/80 px-2 py-2">
          <p className="text-[9px] font-bold text-emerald-600">وارد</p>
          <p className="mt-0.5 font-latin text-[11px] font-black text-emerald-700" dir="ltr">
            {fmt(incoming, account.currency)}
          </p>
        </div>
        <div className="rounded-xl bg-rose-50/80 px-2 py-2">
          <p className="text-[9px] font-bold text-rose-600">صادر</p>
          <p className="mt-0.5 font-latin text-[11px] font-black text-rose-700" dir="ltr">
            {fmt(outgoing, account.currency)}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50/80 px-2 py-2">
          <p className="text-[9px] font-bold text-amber-600">معلق</p>
          <p className="mt-0.5 font-latin text-[11px] font-black text-amber-700" dir="ltr">
            {fmt(pending, account.currency)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
        <Link
          to={`${financeBase}/accounts`}
          className="text-[10px] font-black text-brand-600 hover:underline"
        >
          التفاصيل
        </Link>
        <span
          className={`inline-flex items-center gap-0.5 text-[10px] font-black ${
            positive ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {positive ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
          <span dir="ltr">{positive ? '+' : ''}{fmt(diff, account.currency)}</span>
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
            account.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {account.is_active ? 'نشط' : 'موقوف'}
        </span>
      </div>
    </motion.article>
  )
}

export default function AccountGrid({
  accounts,
  payments,
  financeBase,
}: {
  accounts: FinanceAccount[]
  payments: FinancePaymentRow[]
  financeBase: string
}) {
  return (
    <SectionShell
      eyebrow="الحسابات"
      title="الحسابات المالية"
      subtitle="أرصدة البنوك وبوابات الدفع والنقدية"
      action={
        <Link
          to={`${financeBase}/accounts`}
          className="rounded-xl bg-deepBlue px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-deepBlue/90"
        >
          إدارة الحسابات
        </Link>
      }
    >
      {accounts.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((acc) => (
            <AccountCard key={acc.id} account={acc} payments={payments} financeBase={financeBase} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-3xl">🏦</div>
          <p className="text-sm font-black text-deepBlue">لا توجد حسابات مالية بعد</p>
          <p className="max-w-sm text-[12px] font-semibold text-slate-500">
            أضف حسابات البنك وسترايب وباي بال لمتابعة الأرصدة والتدفقات.
          </p>
          <Link
            to={`${financeBase}/accounts`}
            className="mt-2 rounded-xl bg-brand-500 px-5 py-2.5 text-[12px] font-black text-white"
          >
            إنشاء حساب
          </Link>
        </div>
      )}
    </SectionShell>
  )
}
