import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { Cpu, Gauge, Sparkles, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchAiRecentGenerations } from '@/api/aiApi'
import { fetchAiAutomations } from '@/api/aiAutomationsApi'
import { fetchAiInsights } from '@/api/aiInsightsApi'
import { fetchAiRecommendations } from '@/api/aiRecommendationsApi'
import { fetchAiUsage } from '@/api/aiUsageApi'
import AiAutomationCard from '@/components/ai/AiAutomationCard'
import AiInsightCard from '@/components/ai/AiInsightCard'
import AiRecommendationCard from '@/components/ai/AiRecommendationCard'
import { LoadingStack } from '@/components/ai/LoadingSkeleton'
import type { LucideIcon } from 'lucide-react'

export default function AdminAiCommandCenterPage() {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof fetchAiInsights>>>([])
  const [automations, setAutomations] = useState<Awaited<ReturnType<typeof fetchAiAutomations>>>([])
  const [recentGenerations, setRecentGenerations] = useState<Awaited<ReturnType<typeof fetchAiRecentGenerations>>>([])
  const [usage, setUsage] = useState<Awaited<ReturnType<typeof fetchAiUsage>> | null>(null)
  const [recommendations, setRecommendations] = useState<Awaited<ReturnType<typeof fetchAiRecommendations>>>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [i, a, g, u, rec] = await Promise.all([
        fetchAiInsights(),
        fetchAiAutomations(),
        fetchAiRecentGenerations(),
        fetchAiUsage(),
        fetchAiRecommendations('admin'),
      ])
      if (!cancelled) {
        setInsights(i)
        setAutomations(a)
        setRecentGenerations(g)
        setUsage(u)
        setRecommendations(rec)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-accent-700">AI Command Center</p>
            <h1 className="mt-1 text-3xl font-black text-deepBlue">مركز قيادة الذكاء المؤسسي</h1>
            <p className="mt-2 text-sm font-medium text-slate-600">مراقبة النشاط، التوليدات، الأتمتة، الاستهلاك، وتوصيات القرار في لوحة موحدة.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard/admin/ai/insights" className="rounded-xl bg-white px-3 py-2 text-xs font-black text-deepBlue ring-1 ring-slate-200">
              AI Insights
            </Link>
            <Link to="/dashboard/admin/ai/usage" className="rounded-xl bg-deepBlue px-3 py-2 text-xs font-black text-white">
              AI Usage
            </Link>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <LoadingStack rows={5} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard icon={Sparkles} label="AI Activity" value={`${usage?.requests_count.toLocaleString('en-US') ?? '0'}`} hint="إجمالي الطلبات" />
            <MetricCard icon={Cpu} label="Token Usage" value={`${usage?.tokens_total.toLocaleString('en-US') ?? '0'}`} hint="Tokens placeholder" />
            <MetricCard icon={Gauge} label="Estimated Cost" value={`$${usage?.estimated_cost_usd ?? 0}`} hint="تكلفة تقديرية" />
            <MetricCard icon={Zap} label="Failed Generations" value={`${usage?.failed_generations ?? 0}`} hint="إخفاقات التوليد" />
          </div>

          <section>
            <h2 className="mb-3 text-sm font-black text-deepBlue">AI Insights Feed</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {insights.map((insight) => (
                <AiInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-black text-deepBlue">AI Recommendation Feed</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {recommendations.map((item) => (
                <AiRecommendationCard key={item.id} recommendation={item} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-black text-deepBlue">AI Automations</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {automations.map((flow) => (
                <AiAutomationCard key={flow.id} flow={flow} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-black text-deepBlue">Recent Generations</h2>
            <div className="space-y-2">
              {recentGenerations.slice(0, 6).map((g) => (
                <div key={g.id} className="rounded-xl bg-[#F6F8FB] px-3 py-2 ring-1 ring-slate-100">
                  <p className="text-sm font-black text-deepBlue">{g.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{g.created_at}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint: string
}) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-deepBlue text-white">
          <Icon size={17} />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="text-lg font-black text-deepBlue">{value}</p>
        </div>
      </div>
      <p className="mt-2 text-xs font-bold text-slate-500">{hint}</p>
    </article>
  )
}
