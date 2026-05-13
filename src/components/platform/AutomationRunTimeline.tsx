import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { AutomationRun } from '@/types/platform'

type Props = {
  runs: AutomationRun[]
}

function StatusIcon({ status }: { status: AutomationRun['status'] }) {
  if (status === 'success') return <CheckCircle2 className="text-emerald-500" size={18} />
  if (status === 'failed') return <AlertCircle className="text-red-500" size={18} />
  return <Loader2 className="animate-spin text-customBlue" size={18} />
}

export default function AutomationRunTimeline({ runs }: Props) {
  return (
    <div className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-black text-deepBlue">سجل التشغيل</h3>
      <ul className="relative mt-6 space-y-6 before:absolute before:right-[15px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-200">
        {runs.map((r, i) => (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="relative flex gap-4 pr-10"
          >
            <span className="absolute right-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white ring-2 ring-slate-100">
              <StatusIcon status={r.status} />
            </span>
            <div className="min-w-0 flex-1 rounded-xl bg-[#F6F8FB] p-4 ring-1 ring-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-deepBlue">{r.rule_name}</p>
                <span className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-black text-slate-400 ring-1 ring-slate-100">
                  #{r.id}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-500">
                بدء {r.started_at}
                {r.finished_at && <> — انتهاء {r.finished_at}</>}
              </p>
              {r.detail && (
                <p className="mt-2 text-xs font-medium leading-6 text-red-600">{r.detail}</p>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
