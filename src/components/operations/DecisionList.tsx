import type { OpsMeetingDetail } from '@/types/operations'

export default function DecisionList({ decisions }: Pick<OpsMeetingDetail, 'decisions'>) {
  if (!decisions?.length) return <p className="text-sm font-semibold text-slate-400">لا قرارات مسجلة بعد.</p>
  return (
    <ol className="space-y-3 text-right">
      {decisions.map((d, i) => (
        <li
          key={d.id}
          className="rounded-xl border border-deepBlue/[0.06] bg-white px-4 py-3 text-sm font-medium leading-relaxed text-deepBlue/85 shadow-sm"
        >
          <span className="font-black text-customOrange">{i + 1}. </span>
          {d.text}
        </li>
      ))}
    </ol>
  )
}
