import { Link } from 'react-router-dom'
import type { AiRecommendation } from '@/types/ai'
import PriorityIndicator from './PriorityIndicator'

export default function AiRecommendationCard({ recommendation }: { recommendation: AiRecommendation }) {
  const body = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-deepBlue">{recommendation.title}</h3>
        <PriorityIndicator priority={recommendation.priority} />
      </div>
      <p className="mt-2 text-sm font-medium leading-7 text-slate-600">{recommendation.description}</p>
    </>
  )
  if (recommendation.href) {
    return (
      <Link
        to={recommendation.href}
        className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-customBlue/30 hover:shadow-md"
      >
        {body}
      </Link>
    )
  }
  return <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">{body}</article>
}
