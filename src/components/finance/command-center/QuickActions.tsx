import { motion } from 'framer-motion'
import {
  ArrowLeftRight,
  FileSpreadsheet,
  FileText,
  Plus,
  Receipt,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router'

const ACTIONS = [
  { icon: Plus, label: 'دفع يدوي جديد', href: 'manual-payments', color: 'from-brand-500 to-brand-600' },
  { icon: Receipt, label: 'إنشاء مصروف', href: 'transactions', color: 'from-rose-500 to-rose-600' },
  { icon: ArrowLeftRight, label: 'تحويل مالي', href: 'accounts', color: 'from-violet-500 to-violet-600' },
  { icon: FileText, label: 'إنشاء فاتورة', href: 'invoices', color: 'from-emerald-500 to-emerald-600' },
  { icon: Wallet, label: 'إنشاء حساب', href: 'accounts', color: 'from-amber-500 to-amber-600' },
  { icon: FileSpreadsheet, label: 'تصدير تقرير', href: 'transactions', color: 'from-deepBlue to-brand-700' },
] as const

export default function QuickActions({ financeBase }: { financeBase: string }) {
  return (
    <section className="rounded-2xl border border-deepBlue/[0.06] bg-white p-5 shadow-sm">
      <div className="mb-4 text-right">
        <p className="text-[10px] font-black uppercase tracking-wider text-brand-500">إجراءات سريعة</p>
        <h2 className="mt-0.5 text-base font-black text-deepBlue">عمليات مالية شائعة</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {ACTIONS.map((action, i) => {
          const Icon = action.icon
          return (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -3 }}
            >
              <Link
                to={`${financeBase}/${action.href}`}
                className={`flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br ${action.color} p-4 text-center text-white shadow-md transition hover:shadow-lg`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Icon size={18} />
                </div>
                <span className="text-[11px] font-black leading-tight">{action.label}</span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
