import type { AiAutomationFlow } from '@/types/ai'

export default function AiAutomationCard({ flow }: { flow: AiAutomationFlow }) {
  const tone =
    flow.status === 'active'
      ? 'bg-emerald-50 text-emerald-900 ring-emerald-100'
      : flow.status === 'failed'
        ? 'bg-red-50 text-red-900 ring-red-100'
        : 'bg-slate-50 text-slate-600 ring-slate-100'

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-deepBlue">{flow.name}</h3>
        <span className={['rounded-lg px-2 py-1 text-[11px] font-black ring-1 ring-inset', tone].join(' ')}>
          {flow.status}
        </span>
      </div>
      <div className="mt-3 space-y-2 text-xs font-bold text-slate-600">
        <p dir="ltr">Trigger: {flow.trigger}</p>
        <p dir="ltr">Action: {flow.action}</p>
        <p>آخر تشغيل: {flow.last_run_at ?? '—'}</p>
      </div>
    </article>
  )
}
