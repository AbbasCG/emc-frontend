import { useEffect, useState } from 'react'
import { fetchAiUsage } from '@/api/aiUsageApi'
import AiUsageChart from '@/components/ai/AiUsageChart'
import { LoadingStack } from '@/components/ai/LoadingSkeleton'

export default function AdminAiUsagePage() {
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof fetchAiUsage>> | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await fetchAiUsage()
      if (!cancelled) setUsage(data)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!usage) {
    return <LoadingStack rows={5} />
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-widest text-customOrange">AI Usage Analytics</p>
        <h1 className="text-3xl font-black text-deepBlue">تحليلات استخدام الذكاء</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card label="Requests" value={usage.requests_count.toLocaleString('en-US')} />
        <Card label="Estimated Cost" value={`$${usage.estimated_cost_usd.toFixed(2)}`} />
        <Card label="Tokens" value={usage.tokens_total.toLocaleString('en-US')} />
        <Card label="Failed" value={usage.failed_generations.toString()} />
      </div>

      <AiUsageChart usage={usage} />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-deepBlue">Top Users</h2>
          <ul className="mt-3 space-y-2">
            {usage.top_users.map((u) => (
              <li key={u.id} className="flex items-center justify-between rounded-lg bg-[#F6F8FB] px-3 py-2 text-xs font-bold">
                <span>{u.name}</span>
                <span dir="ltr">{u.requests}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-deepBlue">Most Used Prompts</h2>
          <ul className="mt-3 space-y-2">
            {usage.top_prompts.map((p) => (
              <li key={p.text} className="rounded-lg bg-[#F6F8FB] px-3 py-2 text-xs font-medium">
                <p className="font-black text-deepBlue">{p.text}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-400">الاستخدام: {p.count}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-deepBlue">{value}</p>
    </article>
  )
}
