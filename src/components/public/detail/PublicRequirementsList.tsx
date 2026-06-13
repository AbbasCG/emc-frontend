import { Check } from 'lucide-react'
import PublicDetailSection from '@/components/public/detail/PublicDetailSection'

export default function PublicRequirementsList({ items }: { items: string[] }) {
  if (items.length === 0) return null

  return (
    <PublicDetailSection id="requirements" title="المتطلبات" compact>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold leading-7 text-[#0F172A]"
          >
            <Check size={16} className="mt-1 shrink-0 text-customBlue" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </PublicDetailSection>
  )
}
