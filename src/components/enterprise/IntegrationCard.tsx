import { ChevronLeft, Settings2 } from 'lucide-react'
import { Link } from 'react-router'
import IntegrationStatusBadge from '@/components/enterprise/IntegrationStatusBadge'
import type { IntegrationSummary } from '@/types/phase7'
import { cn } from '@/lib/utils'

const accent: Record<IntegrationSummary['provider'], string> = {
  stripe: 'from-[#635BFF]/15 to-indigo-50',
  paypal: 'from-sky-400/15 to-sky-50',
  whatsapp: 'from-emerald-400/15 to-emerald-50',
  email: 'from-customBlue/15 to-sky-50',
  google_calendar: 'from-orange-400/15 to-orange-50',
  outlook_calendar: 'from-blue-500/15 to-blue-50',
  webhooks: 'from-deepBlue/15 to-slate-50',
  api_tokens: 'from-customOrange/15 to-amber-50',
}

export default function IntegrationCard({ item }: { item: IntegrationSummary }) {
  return (
    <article
      dir="rtl"
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-customBlue/25 hover:shadow-xl',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-bl opacity-90',
          accent[item.provider],
        )}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-deepBlue">{item.title_ar}</h3>
            <IntegrationStatusBadge status={item.status} />
          </div>
          <p className="mt-2 max-w-xl text-sm font-medium leading-7 text-slate-600">{item.description_ar}</p>
          {item.security_note_ar && (
            <p className="mt-3 rounded-xl bg-deepBlue/5 px-3 py-2 text-xs font-bold text-deepBlue/80 ring-1 ring-deepBlue/10">
              {item.security_note_ar}
            </p>
          )}
        </div>
        <Link
          to={item.settings_path}
          className="inline-flex items-center gap-2 rounded-xl bg-deepBlue px-4 py-2 text-xs font-black text-white shadow-md shadow-deepBlue/15 transition hover:bg-deepBlue/90"
        >
          <Settings2 size={15} />
          إعدادات
          <ChevronLeft size={14} className="opacity-70" />
        </Link>
      </div>
    </article>
  )
}
