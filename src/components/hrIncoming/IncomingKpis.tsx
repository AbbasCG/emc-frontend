import { FileText, Hourglass, Inbox, Sparkles } from 'lucide-react'
import type { IncomingStats } from '@/api/hrIncomingRequestsApi'

/**
 * Only figures the server can state correctly. «تحتاج مرشحين» is deliberately absent: matching
 * is computed on demand and not stored, so no honest count of it exists yet.
 */
export function IncomingKpis({ stats }: { stats: IncomingStats }) {
  const cards = [
    { key: 'total', label: 'إجمالي الطلبات', value: stats.total, icon: Inbox, tone: 'border-deepBlue/[0.07] bg-white text-deepBlue/70' },
    { key: 'pending', label: 'طلبات جديدة', value: stats.pending, icon: Sparkles, tone: 'border-customOrange/30 bg-customOrange/[0.07] text-customOrange' },
    { key: 'in_progress', label: 'قيد المراجعة', value: stats.inProgress, icon: Hourglass, tone: 'border-customBlue/25 bg-customBlue/[0.06] text-customBlue' },
    { key: 'drafts', label: 'مسودات فرص جاهزة', value: stats.withDrafts, icon: FileText, tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-700' },
  ]

  return (
    <section aria-label="المؤشرات" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.key} data-testid={`kpi-${c.key}`} className={`rounded-2xl border p-4 shadow-sm ${c.tone}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-deepBlue/60">{c.label}</span>
            <c.icon size={15} aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-black text-deepBlue">{c.value.toLocaleString('en-US')}</p>
        </div>
      ))}
    </section>
  )
}
