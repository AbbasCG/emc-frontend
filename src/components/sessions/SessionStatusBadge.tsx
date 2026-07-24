import { SESSION_STATUS_LABEL, SESSION_STATUS_CLS } from './sessionStatusLabels'

export default function SessionStatusBadge({ status, className = '' }: { status: string; className?: string }) {
  return (
    <span className={`rounded-lg px-2 py-1 text-[9px] font-black ${SESSION_STATUS_CLS[status] ?? 'bg-slate-100 text-slate-600'} ${className}`}>
      {SESSION_STATUS_LABEL[status] ?? status}
    </span>
  )
}
