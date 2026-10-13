import { Activity, AlertTriangle, CalendarClock, Radio, ServerCog } from 'lucide-react'
import type { CommandCenterData } from '@/api/executiveCommandCenterApi'
import { cn } from '@/lib/utils'

export function CommandCenterKpis({ summary }: { summary: CommandCenterData['summary'] }) {
  const cards = [
    { key: 'needs_attention', label: 'يحتاج انتباه', value: String(summary.needs_attention), icon: AlertTriangle, tone: 'border-customOrange/30 bg-customOrange/[0.07] text-customOrange' },
    { key: 'upcoming', label: 'القادم', value: String(summary.upcoming), icon: CalendarClock, tone: 'border-customBlue/25 bg-customBlue/[0.06] text-customBlue' },
    { key: 'recent_updates', label: 'تحديثات حديثة', value: String(summary.recent_updates), icon: Activity, tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-700' },
    { key: 'errors', label: 'مشاكل وتنبيهات', value: String(summary.errors), icon: ServerCog, tone: summary.errors > 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-deepBlue/[0.07] bg-white text-deepBlue/70' },
    { key: 'sources', label: 'مصادر مفعلة', value: `${summary.sourcesActive}/${summary.sourcesTotal}`, icon: Radio, tone: summary.sourcesActive < summary.sourcesTotal ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-deepBlue/[0.07] bg-white text-deepBlue/70' },
  ]

  return (
    <section aria-label="المؤشرات الرئيسية" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.key} data-testid={`kpi-${c.key}`} className={cn('rounded-2xl border p-4 shadow-sm', c.tone)}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-deepBlue/60">{c.label}</span>
            <c.icon size={15} aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-black text-deepBlue">{c.value}</p>
        </div>
      ))}
    </section>
  )
}
