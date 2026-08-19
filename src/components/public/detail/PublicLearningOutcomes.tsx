import { Sparkles } from 'lucide-react'
import PublicDetailSection from '@/components/public/detail/PublicDetailSection'

type Props = {
  title?: string
  items: string[]
}

export default function PublicLearningOutcomes({ title = 'ماذا ستتعلم', items }: Props) {
  if (items.length === 0) return null

  return (
    <PublicDetailSection id="outcomes" title={title} compact>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-start gap-3 rounded-2xl border border-emerald-100/80 bg-gradient-to-l from-emerald-50/80 to-white p-4 text-right"
          >
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Sparkles size={16} aria-hidden />
            </span>
            <p className="text-sm font-semibold leading-7 text-[#0F172A]">{item}</p>
          </div>
        ))}
      </div>
    </PublicDetailSection>
  )
}
