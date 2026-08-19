import {
  AlarmClock,
  Award,
  Briefcase,
  CalendarClock,
  CircleAlert,
  Clock,
  CreditCard,
  PauseCircle,
  PlayCircle,
  Ticket,
  UserPlus,
  Webhook,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { AutomationRule, AutomationTrigger } from '@/types/platform'

const triggerIcon: Partial<Record<AutomationTrigger, typeof Zap>> = {
  manual: PauseCircle,
  schedule: CalendarClock,
  webhook: Webhook,
  record_created: PlayCircle,
  registration_created: UserPlus,
  payment_confirmed: CreditCard,
  payment_failed: CircleAlert,
  session_starts_soon: Clock,
  assignment_due_soon: AlarmClock,
  certificate_issued: Award,
  task_overdue: AlarmClock,
  support_ticket_created: Ticket,
  partner_request_created: Briefcase,
}

type Props = {
  rule: AutomationRule
  onToggleActive?: (rule: AutomationRule, next: boolean) => void
}

export default function AutomationRuleCard({ rule, onToggleActive }: Props) {
  const TI = triggerIcon[rule.trigger] ?? Zap
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-customBlue/30 hover:shadow-lg"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-deepBlue text-white shadow-md shadow-deepBlue/20">
            <TI size={20} />
          </span>
          <div>
            <h3 className="text-base font-black text-deepBlue">{rule.name}</h3>
            <p className="mt-1 text-xs font-bold text-slate-400">
              المحفّز: <span className="font-mono text-deepBlue" dir="ltr">{rule.trigger}</span> آخر تحديث {rule.updated_at}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              'rounded-lg px-2.5 py-1 text-[11px] font-black ring-1 ring-inset',
              rule.active
                ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
                : 'bg-slate-50 text-slate-500 ring-slate-100',
            ].join(' ')}
          >
            {rule.active ? 'نشط' : 'متوقف'}
          </span>
          {onToggleActive && (
            <button
              type="button"
              onClick={() => onToggleActive(rule, !rule.active)}
              className="rounded-lg bg-[#F6F8FB] px-3 py-1 text-[11px] font-black text-deepBlue ring-1 ring-slate-100 transition hover:ring-customBlue/40"
            >
              تبديل الحالة
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-[#F6F8FB] p-3 ring-1 ring-slate-100">
          <p className="text-[11px] font-black text-slate-400">شروط JSON</p>
          <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-deepBlue" dir="ltr">
            {rule.conditions_json}
          </pre>
        </div>
        <div className="rounded-xl bg-[#F6F8FB] p-3 ring-1 ring-slate-100">
          <p className="text-[11px] font-black text-slate-400">إجراءات JSON</p>
          <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-deepBlue" dir="ltr">
            {rule.actions_json}
          </pre>
        </div>
      </div>
    </motion.article>
  )
}
