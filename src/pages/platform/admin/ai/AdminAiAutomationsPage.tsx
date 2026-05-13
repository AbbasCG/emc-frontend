import { useEffect, useState } from 'react'
import { fetchAiAutomationRuns, fetchAiAutomations } from '@/api/aiAutomationsApi'
import AiAutomationCard from '@/components/ai/AiAutomationCard'
import { LoadingStack } from '@/components/ai/LoadingSkeleton'
import EmptyState from '@/components/ai/EmptyState'

export default function AdminAiAutomationsPage() {
  const [loading, setLoading] = useState(true)
  const [flows, setFlows] = useState<Awaited<ReturnType<typeof fetchAiAutomations>>>([])
  const [runs, setRuns] = useState<Awaited<ReturnType<typeof fetchAiAutomationRuns>>>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [f, r] = await Promise.all([fetchAiAutomations(), fetchAiAutomationRuns()])
      if (!cancelled) {
        setFlows(f)
        setRuns(r)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-widest text-customOrange">Phase 8</p>
        <h1 className="text-3xl font-black text-deepBlue">AI Automations</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">عرض التدفقات الذكية، المحفزات، الإجراءات، وسجل التنفيذ الزمني.</p>
      </header>

      {loading ? (
        <LoadingStack rows={4} />
      ) : flows.length === 0 ? (
        <EmptyState title="لا يوجد تدفقات AI" description="يمكن إنشاء أول تدفق بمجرد تفعيل endpoint الإنشاء." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {flows.map((flow) => (
            <AiAutomationCard key={flow.id} flow={flow} />
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black text-deepBlue">Execution Logs</h2>
        <div className="mt-4 space-y-2">
          {runs.map((run) => (
            <article key={run.id} className="rounded-xl bg-[#F6F8FB] p-3 ring-1 ring-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black text-deepBlue">Run #{run.id}</p>
                <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-slate-600" dir="ltr">
                  {run.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-bold text-slate-500">بدأ: {run.started_at}</p>
              <ul className="mt-2 list-disc space-y-0.5 pr-5 text-[11px] font-medium text-slate-600">
                {run.logs.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
