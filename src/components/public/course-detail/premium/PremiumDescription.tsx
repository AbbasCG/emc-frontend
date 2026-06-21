import { useState } from 'react'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'
import { cn } from '@/lib/utils'

const CLAMP = 320

type Props = {
  derived: CourseDetailDerived
  shortDescription?: string | null
  requirementsItems: string[]
}

function Expandable({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const needs = text.length > CLAMP || text.split(/\r?\n/).length > 5
  return (
    <div>
      <p className={cn('whitespace-pre-line text-[13px] leading-[1.75] text-slate-700', !open && needs && 'line-clamp-5')}>
        {text}
      </p>
      {needs ?
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1.5 text-[11px] font-black text-[#0077B6] hover:underline"
        >
          {open ? 'عرض أقل' : 'عرض المزيد'}
        </button>
      : null}
    </div>
  )
}

export default function PremiumDescription({ derived, shortDescription, requirementsItems }: Props) {
  const full = derived.fullDescription?.trim() ?? ''
  const short = shortDescription?.trim() ?? ''
  const mainText = full && full !== short ? full : short || full
  const hasExtra =
    derived.targetAudience?.trim() ||
    derived.learningOutcomesBlock?.trim() ||
    requirementsItems.length > 0 ||
    derived.methodologyLines.length > 0 ||
    derived.keywordTags.length > 0

  if (!mainText && !hasExtra) return null

  return (
    <section aria-label="وصف الدورة" dir="rtl" className="rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm sm:p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-[#0C2A4B]">
        <span className="h-4 w-1 rounded-full bg-[#0077B6]" aria-hidden />
        عن البرنامج
      </h2>
      <div className="space-y-3">
        {mainText ?
          <Expandable text={mainText} />
        : null}
        {derived.learningOutcomesBlock?.trim() ?
          <div>
            <p className="mb-1 text-[10px] font-black text-slate-400">المخرجات التعليمية</p>
            <Expandable text={derived.learningOutcomesBlock.trim()} />
          </div>
        : null}
        {derived.targetAudience?.trim() ?
          <div>
            <p className="mb-1 text-[10px] font-black text-slate-400">الفئة المستهدفة</p>
            <p className="text-[13px] leading-[1.7] text-slate-700">{derived.targetAudience.trim()}</p>
          </div>
        : null}
        {requirementsItems.length > 0 ?
          <div>
            <p className="mb-1 text-[10px] font-black text-slate-400">المتطلبات</p>
            <ul className="space-y-0.5">
              {requirementsItems.map((r) => (
                <li key={r} className="text-[12px] text-slate-700">• {r}</li>
              ))}
            </ul>
          </div>
        : null}
        {derived.methodologyLines.length > 0 ?
          <div>
            <p className="mb-1 text-[10px] font-black text-slate-400">منهجية التدريب</p>
            <ul className="space-y-0.5">
              {derived.methodologyLines.map((line) => (
                <li key={line} className="text-[12px] text-slate-700">{line}</li>
              ))}
            </ul>
          </div>
        : null}
        {derived.keywordTags.length > 0 ?
          <div className="flex flex-wrap gap-1">
            {derived.keywordTags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#0077B6]/8 px-2 py-0.5 text-[10px] font-black text-[#0C2A4B]">
                {tag}
              </span>
            ))}
          </div>
        : null}
      </div>
    </section>
  )
}
