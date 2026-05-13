import { useEffect, useState } from 'react'
import { fetchAiInsights } from '@/api/aiInsightsApi'
import AiInsightCard from '@/components/ai/AiInsightCard'
import EmptyState from '@/components/ai/EmptyState'
import { LoadingStack } from '@/components/ai/LoadingSkeleton'

export default function AdminAiInsightsPage() {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof fetchAiInsights>>>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await fetchAiInsights()
      if (!cancelled) {
        setInsights(data)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">AI Intelligence</p>
        <h1 className="text-3xl font-black text-deepBlue">لوحة المخاطر والرؤى</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          attendance risks، dropout predictions، engagement score، quality warnings، finance alerts، volunteer inactivity.
        </p>
      </header>

      {loading ? (
        <LoadingStack rows={4} />
      ) : insights.length === 0 ? (
        <EmptyState title="لا توجد رؤى متاحة" description="سيتم تعبئة هذه اللوحة من نموذج التحليل عند تفعيل API." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {insights.map((insight) => (
            <AiInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  )
}
