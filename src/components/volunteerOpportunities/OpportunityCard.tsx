import { Link } from 'react-router'
import { ArrowLeft, CalendarClock, Clock, MapPin, Users } from 'lucide-react'
import type { PublicOpportunity } from '@/api/volunteerOpportunitiesApi'
import { cn } from '@/lib/utils'
import { STATUS_BADGE, deadlineText } from './opportunityUi'

export function OpportunityCard({ o }: { o: PublicOpportunity }) {
  return (
    <li data-testid="opportunity-card" className="flex h-full flex-col rounded-3xl bg-white p-6 shadow-emc-md ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-emc-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {o.field ? <span className="rounded-full bg-customBlue/10 px-3 py-1 text-[11px] font-black text-customBlue">{o.field}</span> : <span />}
        <span className={cn('rounded-full px-3 py-1 text-[11px] font-black ring-1', STATUS_BADGE[o.status])} data-testid="opportunity-status">{o.statusLabel}</span>
      </div>

      <h3 className="mt-4 text-lg font-black leading-snug text-deepBlue">{o.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm font-semibold leading-7 text-deepBlue/65">{o.summary}</p>

      <ul className="mt-4 space-y-2 text-xs font-bold text-deepBlue/60">
        {o.locationLabel ? <li className="flex items-center gap-2"><MapPin size={14} className="text-customBlue" aria-hidden="true" />{o.locationLabel}</li> : null}
        {o.commitment ? <li className="flex items-center gap-2"><Clock size={14} className="text-customBlue" aria-hidden="true" />{o.commitment}{o.duration ? ` · ${o.duration}` : ''}</li> : null}
        {o.volunteersNeeded ? <li className="flex items-center gap-2"><Users size={14} className="text-customBlue" aria-hidden="true" />المطلوب: {o.volunteersNeeded}</li> : null}
        {o.closesAt ? <li className="flex items-center gap-2"><CalendarClock size={14} className="text-customOrange" aria-hidden="true" />{deadlineText(o.closesAt, o.daysLeft)}</li> : null}
      </ul>

      <Link
        to={`/volunteer-opportunities/${o.id}`}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-5 py-3 text-sm font-extrabold text-white shadow-emc-md transition hover:brightness-105"
        aria-label={`عرض تفاصيل: ${o.title}`}
      >
        عرض التفاصيل <ArrowLeft size={15} aria-hidden="true" />
      </Link>
    </li>
  )
}
