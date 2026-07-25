import { CheckCircle2, Flag, ListChecks } from 'lucide-react'
import { Link } from 'react-router'
import type { AiMeetingIntelligence } from '@/types/ai'
import RiskBadge from './RiskBadge'

export default function AiSummaryPanel({
  intelligence,
  toTaskHref,
}: {
  intelligence: AiMeetingIntelligence
  toTaskHref?: string
}) {
  return (
    <section className="rounded-2xl border border-customBlue/15 bg-gradient-to-b from-white to-sky-50/50 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black text-deepBlue">AI Meeting Intelligence</h2>
        <RiskBadge level={intelligence.risk_level} />
      </div>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-700">{intelligence.summary}</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
          <p className="mb-2 flex items-center gap-2 text-xs font-black text-deepBlue">
            <CheckCircle2 size={14} className="text-emerald-600" />
            القرارات المستخرجة
          </p>
          <ul className="list-disc space-y-1 pr-5 text-xs font-medium text-slate-600">
            {intelligence.decisions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
          <p className="mb-2 flex items-center gap-2 text-xs font-black text-deepBlue">
            <ListChecks size={14} className="text-customBlue" />
            عناصر المتابعة
          </p>
          <ul className="space-y-2 text-xs font-medium text-slate-600">
            {intelligence.action_items.map((item) => (
              <li key={item.id} className="rounded-lg bg-[#F6F8FB] px-2 py-1.5">
                {item.text}
                {item.owner && <span className="mr-2 text-slate-400">({item.owner})</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-100">
        <p className="mb-2 flex items-center gap-2 text-xs font-black text-deepBlue">
          <Flag size={14} className="text-red-500" />
          العوائق والمتابعات
        </p>
        <ul className="list-disc space-y-1 pr-5 text-xs font-medium text-slate-600">
          {intelligence.blockers.concat(intelligence.follow_ups).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {toTaskHref && (
          <Link
            to={toTaskHref}
            className="mt-3 inline-flex rounded-lg bg-customBlue px-3 py-1.5 text-xs font-black text-white"
          >
            تحويل البنود إلى مهام
          </Link>
        )}
      </div>
    </section>
  )
}
