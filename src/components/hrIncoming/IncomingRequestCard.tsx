import { useState } from 'react'
import { Building2, CalendarDays, ChevronLeft, UserRound, Users } from 'lucide-react'
import type { IncomingRequest } from '@/api/hrIncomingRequestsApi'
import { cn } from '@/lib/utils'
import { MATCH_STATE_META, STATUS_META, formatDate, type MatchState } from './hrIncomingUi'

/**
 * One request in the workspace list. The whole summary is a button that opens the details
 * drawer, so nothing depends on hover. On a pointer device, hovering (or focusing) also shows a
 * quick preview of the details; touch and keyboard users get the same details in the drawer.
 */
export function IncomingRequestCard({ request, matchState, onOpen }: { request: IncomingRequest; matchState: MatchState; onOpen: () => void }) {
  const [preview, setPreview] = useState(false)
  const status = STATUS_META[request.status]
  const match = MATCH_STATE_META[matchState]
  const previewId = `preview-${request.id}`

  return (
    <li
      className="relative"
      data-testid="incoming-request"
      onMouseEnter={() => setPreview(true)}
      onMouseLeave={() => setPreview(false)}
      onFocus={() => setPreview(true)}
      onBlur={() => setPreview(false)}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-describedby={preview ? previewId : undefined}
        className="group flex w-full flex-col gap-3 rounded-2xl border border-deepBlue/[0.07] bg-white p-4 text-start shadow-sm transition hover:border-customBlue/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 sm:flex-row sm:items-center"
      >
        <span className="min-w-0 flex-1 space-y-2">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1', status.badge)}>{request.statusLabel || status.label}</span>
            <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black', match.badge)} data-testid="match-state">{match.label}</span>
            {request.targetAudienceLabel ? <span className="rounded-full bg-deepBlue/[0.06] px-2.5 py-0.5 text-[10px] font-bold text-deepBlue/65">موجّه إلى: {request.targetAudienceLabel}</span> : null}
          </span>

          <span className="block text-sm font-black leading-snug text-deepBlue">{request.title}</span>

          {request.skills.length > 0 ?
            <span className="flex flex-wrap gap-1.5">
              {request.skills.slice(0, 3).map((s) => <span key={s} className="rounded-lg bg-customBlue/[0.07] px-2 py-0.5 text-[11px] font-bold text-customBlue">{s}</span>)}
              {request.skills.length > 3 ? <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">+{request.skills.length - 3}</span> : null}
            </span>
          : <span className="block text-xs font-semibold text-deepBlue/45">لم تُحدَّد مهارات واضحة</span>}

          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-deepBlue/55">
            <span className="inline-flex items-center gap-1"><Building2 size={12} aria-hidden="true" />{request.department?.name ?? 'بدون قسم'}</span>
            <span className="inline-flex items-center gap-1"><Users size={12} aria-hidden="true" />المطلوب: {request.requiredCount}</span>
            <span className="inline-flex items-center gap-1"><UserRound size={12} aria-hidden="true" />{request.requester?.name ?? 'غير معروف'}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays size={12} aria-hidden="true" /><time dateTime={request.createdAt ?? undefined}>{formatDate(request.createdAt)}</time></span>
          </span>
        </span>

        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-customBlue">
          عرض التفاصيل <ChevronLeft size={14} aria-hidden="true" />
        </span>
      </button>

      {preview ?
        <div
          id={previewId}
          role="tooltip"
          data-testid="hover-preview"
          className="pointer-events-none absolute inset-x-4 top-full z-20 mt-1 hidden rounded-2xl border border-deepBlue/10 bg-white p-4 text-xs shadow-xl md:block"
        >
          <p className="font-black text-deepBlue">{request.title}</p>
          <p className="mt-1 font-semibold leading-relaxed text-deepBlue/70">{request.skillsAndSpecs || 'لا توجد مواصفات.'}</p>
          {request.notes ? <p className="mt-1.5 font-semibold text-deepBlue/55">ملاحظات: {request.notes}</p> : null}
          <p className="mt-1.5 font-bold text-deepBlue/50">{request.requester?.name ?? '—'} · {request.department?.name ?? '—'} · العدد {request.requiredCount}</p>
        </div>
      : null}
    </li>
  )
}
