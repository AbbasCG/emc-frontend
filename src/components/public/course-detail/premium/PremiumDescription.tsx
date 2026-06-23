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
      <p className={cn('whitespace-pre-line text-[13px] leading-[1.8] text-foreground', !open && needs && 'line-clamp-5')}>
        {text}
      </p>
      {needs ?
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1.5 text-[11px] font-black text-customBlue underline-offset-4 transition-colors hover:text-deepBlue hover:underline"
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
    <section aria-label="وصف الدورة" dir="rtl" className="rounded-2xl border border-line bg-white p-3.5 shadow-emc sm:p-4">
      <h2 className="mb-3.5 flex items-center gap-2.5 font-display text-sm font-black tracking-tight text-deepBlue">
        <span className="h-4 w-1 rounded-full bg-customBlue" aria-hidden />
        عن البرنامج
      </h2>
      <div className="space-y-3">
        {mainText ?
          <Expandable text={mainText} />
        : null}
        {derived.learningOutcomesBlock?.trim() ?
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-muted-400">المخرجات التعليمية</p>
            <Expandable text={derived.learningOutcomesBlock.trim()} />
          </div>
        : null}
        {derived.targetAudience?.trim() ?
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-muted-400">الفئة المستهدفة</p>
            <p className="text-[13px] leading-[1.75] text-foreground">{derived.targetAudience.trim()}</p>
          </div>
        : null}
        {requirementsItems.length > 0 ?
          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-400">المتطلبات</p>
            <ul className="space-y-1">
              {requirementsItems.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[12px] leading-[1.6] text-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-customOrange" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        : null}
        {derived.methodologyLines.length > 0 ?
          <div>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-400">منهجية التدريب</p>
            <ul className="space-y-1">
              {derived.methodologyLines.map((line) => (
                <li key={line} className="flex items-start gap-2 text-[12px] leading-[1.6] text-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-customBlue" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        : null}
        {derived.keywordTags.length > 0 ?
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {derived.keywordTags.map((tag) => (
              <span key={tag} className="rounded-full border border-customBlue/12 bg-customBlue/[0.07] px-2.5 py-0.5 text-[10px] font-black text-deepBlue">
                {tag}
              </span>
            ))}
          </div>
        : null}
      </div>
    </section>
  )
}
