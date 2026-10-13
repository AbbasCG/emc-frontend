import { Link } from 'react-router'
import { ArrowLeft, Clock } from 'lucide-react'
import type { CommandCenterItem } from '@/api/executiveCommandCenterApi'
import { cn } from '@/lib/utils'
import { PRIORITY_META, SOURCE_META, formatDateTime, formatRelative, initialOf } from './commandCenterUi'

/**
 * One actionable row of the feed: where it came from, how urgent it is, what it is, when,
 * and a single link to the page where the work is done. The link target is an internal
 * dashboard path (re-validated in the API client); the route guard still decides whether
 * the viewer may open it.
 */
export function CommandCenterItemCard({ item, upcoming = false }: { item: CommandCenterItem; upcoming?: boolean }) {
  const source = SOURCE_META[item.source]
  const priority = PRIORITY_META[item.priority]
  const SourceIcon = source.icon
  const when = upcoming ? (item.dueAt ?? item.timestamp) : item.timestamp

  return (
    <li
      className="relative flex flex-col gap-3 rounded-2xl border border-deepBlue/[0.07] bg-white p-4 pe-5 shadow-sm transition hover:border-customBlue/30 hover:shadow-md sm:flex-row sm:items-center"
      data-testid="command-center-item"
      data-source={item.source}
      data-priority={item.priority}
    >
      <span className={cn('absolute inset-y-3 end-0 w-1 rounded-full', priority.bar)} aria-hidden="true" />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black', source.badge)}>
            <SourceIcon size={11} aria-hidden="true" /> {source.label}
          </span>
          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1', priority.badge)}>{item.priorityLabel || priority.label}</span>
          {item.statusLabel ? <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">{item.statusLabel}</span> : null}
          {item.badge ? <span className="rounded-full bg-deepBlue/[0.06] px-2.5 py-0.5 text-[10px] font-bold text-deepBlue/70">{item.badge}</span> : null}
        </div>

        <h4 className="text-sm font-black leading-snug text-deepBlue">{item.title}</h4>
        {item.description ? <p className="text-xs font-semibold leading-relaxed text-deepBlue/60">{item.description}</p> : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-[11px] font-bold text-deepBlue/50">
          {item.actor ?
            <span className="inline-flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-customBlue/10 text-[10px] font-black text-customBlue" aria-hidden="true">{initialOf(item.actor.name)}</span>
              {item.actor.name}
            </span>
          : null}
          {when ?
            <span className="inline-flex items-center gap-1" title={formatDateTime(when)}>
              <Clock size={11} aria-hidden="true" />
              <time dateTime={when}>{upcoming ? `${formatDateTime(when)} · ${formatRelative(when)}` : formatRelative(when)}</time>
            </span>
          : null}
        </div>
      </div>

      <Link
        to={item.url}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-customBlue/30 bg-customBlue/[0.05] px-4 py-2 text-xs font-black text-customBlue transition hover:bg-customBlue hover:text-white"
      >
        {item.actionLabel}
        <ArrowLeft size={13} aria-hidden="true" />
      </Link>
    </li>
  )
}
