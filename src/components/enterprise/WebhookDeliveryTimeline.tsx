import { WEBHOOK_EVENT_LABELS_AR } from '@/api/webhooksApi'
import type { WebhookDelivery } from '@/types/phase7'
import { cn } from '@/lib/utils'

function statusTone(s: WebhookDelivery['status']) {
  if (s === 'success') return 'bg-emerald-500'
  if (s === 'failed') return 'bg-red-500'
  return 'bg-amber-400'
}

export default function WebhookDeliveryTimeline({ deliveries }: { deliveries: WebhookDelivery[] }) {
  return (
    <div dir="rtl" className="space-y-0">
      {deliveries.map((d, idx) => (
        <div key={d.id} className="relative flex gap-4 pb-8 last:pb-0">
          <div className="flex flex-col items-center">
            <span className={cn('mt-1 h-3 w-3 rounded-full shadow-sm ring-4 ring-white', statusTone(d.status))} />
            {idx < deliveries.length - 1 && <span className="mt-2 h-full w-px flex-1 bg-slate-200" />}
          </div>
          <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-[#F6F8FB] p-4 shadow-inner shadow-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-white px-2 py-1 text-[11px] font-black text-deepBlue ring-1 ring-slate-100" dir="ltr">
                {d.event}
              </span>
              <span className="text-[11px] font-black text-slate-400">
                {WEBHOOK_EVENT_LABELS_AR[d.event] ?? d.event}
              </span>
              {typeof d.http_status === 'number' && (
                <span
                  className={cn(
                    'rounded-lg px-2 py-1 text-[11px] font-black ring-1 ring-inset',
                    d.http_status >= 200 && d.http_status < 300
                      ? 'bg-emerald-50 text-emerald-900 ring-emerald-100'
                      : 'bg-red-50 text-red-900 ring-red-100',
                  )}
                  dir="ltr"
                >
                  HTTP {d.http_status}
                </span>
              )}
              <span className="mr-auto text-[11px] font-bold text-slate-400">
                {new Date(d.attempted_at).toLocaleString('ar-SA')}
              </span>
            </div>
            {d.duration_ms != null && (
              <p className="mt-2 text-xs font-bold text-slate-500" dir="ltr">
                المدة: {d.duration_ms} ms
              </p>
            )}
            {d.detail_ar && (
              <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-medium leading-6 text-red-800 ring-1 ring-red-100">
                {d.detail_ar}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
