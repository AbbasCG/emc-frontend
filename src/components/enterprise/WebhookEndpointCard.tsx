import { Activity, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import IntegrationStatusBadge from '@/components/enterprise/IntegrationStatusBadge'
import { WEBHOOK_EVENT_LABELS_AR } from '@/api/webhooksApi'
import type { WebhookEndpoint } from '@/types/phase7'
import { cn } from '@/lib/utils'

export default function WebhookEndpointCard({ endpoint }: { endpoint: WebhookEndpoint }) {
  const pseudoStatus = endpoint.active ? 'connected' : 'needs_setup'

  return (
    <article dir="rtl" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-customBlue/30 hover:shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-deepBlue text-white shadow-md shadow-deepBlue/20">
            <Activity size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <IntegrationStatusBadge status={pseudoStatus} />
              <span className="rounded-lg bg-[#F6F8FB] px-2 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-100">
                #{endpoint.id}
              </span>
            </div>
            <p className="mt-2 break-all font-mono text-xs font-bold text-deepBlue" dir="ltr">
              {endpoint.url}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {endpoint.events.map((ev) => (
                <span
                  key={ev}
                  className={cn(
                    'rounded-lg px-2 py-1 text-[10px] font-black ring-1 ring-inset',
                    'bg-sky-50 text-deepBlue ring-sky-100',
                  )}
                  title={WEBHOOK_EVENT_LABELS_AR[ev]}
                  dir="ltr"
                >
                  {ev}
                </span>
              ))}
            </div>
          </div>
        </div>
        <Link
          to={`/dashboard/admin/webhooks/${endpoint.id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white shadow-md transition hover:opacity-95"
        >
          التفاصيل
          <ChevronLeft size={14} />
        </Link>
      </div>
    </article>
  )
}
