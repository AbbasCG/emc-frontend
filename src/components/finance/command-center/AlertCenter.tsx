import { motion } from 'framer-motion'
import { AlertTriangle, ChevronLeft, Info, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router'
import type { FinanceAlert } from './types'
import { SectionShell } from './shared'

const SEV: Record<FinanceAlert['severity'], { icon: React.ElementType; bg: string; border: string; text: string }> = {
  danger: {
    icon: ShieldAlert,
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-800',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
  },
  info: {
    icon: Info,
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-900',
  },
}

export default function AlertCenter({ alerts }: { alerts: FinanceAlert[] }) {
  return (
    <SectionShell
      eyebrow="التنبيهات"
      title="مركز التنبيهات المالية"
      subtitle="متابعة المخاطر والمهام العاجلة"
    >
      {alerts.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {alerts.map((alert, i) => {
            const s = SEV[alert.severity]
            const Icon = s.icon
            const inner = (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-start gap-3 rounded-xl border p-4 ${s.bg} ${s.border}`}
              >
                <Icon size={18} className={`shrink-0 ${s.text}`} />
                <div className="min-w-0 flex-1 text-right">
                  <p className={`text-[13px] font-black ${s.text}`}>{alert.title}</p>
                  <p className="mt-1 text-[11px] font-semibold opacity-80">{alert.description}</p>
                </div>
                {alert.href && <ChevronLeft size={16} className={`shrink-0 ${s.text} opacity-50`} />}
              </motion.div>
            )
            return alert.href ? (
              <Link key={alert.id} to={alert.href} className="block transition hover:opacity-90">
                {inner}
              </Link>
            ) : (
              <div key={alert.id}>{inner}</div>
            )
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 rounded-xl bg-emerald-50 py-8 text-emerald-800">
          <ShieldAlert size={20} />
          <p className="text-sm font-black">لا توجد تنبيهات عاجلة — الوضع المالي مستقر</p>
        </div>
      )}
    </SectionShell>
  )
}
