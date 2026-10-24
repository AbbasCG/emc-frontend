import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Inbox, Layers, PlayCircle, UserX, Zap } from 'lucide-react'
import type { TicketFilters, TicketStats } from '@/types/ticketOps'
import { isKpiActive, type KpiKey } from '@/utils/ticketFilters'
import { cn } from '@/lib/utils'
import { formatHours } from './ticketOpsUi'

interface CardDef {
  key: KpiKey
  label: string
  hint: string
  value: (s: TicketStats) => number
  icon: typeof Inbox
  tone: string
}

/** The figures a coordinator scans first. Each is a filter: pressing it shows exactly those tickets. */
const PRIMARY: CardDef[] = [
  { key: 'pending', label: 'بانتظار الاعتماد', hint: 'تذاكر جديدة تنتظر قرارًا', value: (s) => s.counts.pendingApproval, icon: Inbox, tone: 'text-amber-700 bg-amber-50' },
  { key: 'open', label: 'مفتوحة', hint: 'لم تُغلق بعد', value: (s) => s.counts.open, icon: Layers, tone: 'text-sky-700 bg-sky-50' },
  { key: 'overdue', label: 'متأخرة', hint: 'تجاوزت موعدها المتوقع', value: (s) => s.counts.overdue, icon: AlertTriangle, tone: 'text-rose-700 bg-rose-50' },
  { key: 'unassigned', label: 'بلا مكلف', hint: 'مفتوحة ولا مكلَّف بها', value: (s) => s.counts.unassigned, icon: UserX, tone: 'text-violet-700 bg-violet-50' },
  { key: 'highPriority', label: 'أولوية عالية', hint: 'عالية أو حرجة ومفتوحة', value: (s) => s.counts.highPriority, icon: Zap, tone: 'text-orange-700 bg-orange-50' },
]

const SECONDARY: CardDef[] = [
  { key: 'total', label: 'الإجمالي', hint: 'كل التذاكر في النطاق', value: (s) => s.counts.total, icon: Layers, tone: 'text-deepBlue bg-slate-100' },
  { key: 'inProgress', label: 'قيد المعالجة', hint: 'يعمل عليها المكلف', value: (s) => s.counts.inProgress, icon: PlayCircle, tone: 'text-violet-700 bg-violet-50' },
  { key: 'resolved', label: 'تم الحل', hint: 'حُلّت بنجاح', value: (s) => s.counts.resolved, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
  { key: 'closed', label: 'مغلقة', hint: 'حُلّت أو رُفضت أو تعذّر حلها', value: (s) => s.counts.closed, icon: Clock, tone: 'text-slate-600 bg-slate-100' },
]

function KpiButton({ def, stats, filters, onPick }: { def: CardDef; stats: TicketStats | null; filters: TicketFilters; onPick: (k: KpiKey) => void }) {
  const active = isKpiActive(filters, def.key)
  const Icon = def.icon

  return (
    <button
      type="button"
      onClick={() => onPick(def.key)}
      aria-pressed={active}
      data-kpi={def.key}
      className={cn(
        'group flex items-center gap-3 rounded-2xl border bg-white p-4 text-start shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40',
        active ? 'border-customBlue ring-2 ring-customBlue/20' : 'border-deepBlue/[0.08] hover:border-customBlue/40 hover:shadow-md',
      )}
    >
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', def.tone)}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-black leading-none text-deepBlue" data-testid={`kpi-value-${def.key}`}>
          {stats ? def.value(stats).toLocaleString('en-US') : <span className="inline-block h-6 w-10 animate-pulse rounded bg-deepBlue/[0.08]" />}
        </span>
        <span className="mt-1 block truncate text-[12px] font-black text-deepBlue/80">{def.label}</span>
        <span className="block truncate text-[10px] font-semibold text-deepBlue/45">{def.hint}</span>
      </span>
    </button>
  )
}

/**
 * KPI overview. The numbers come from the server's aggregate query over the WHOLE visible set (not the
 * page on screen) and follow the search / department / date filters; the cards' own filters are
 * ignored by the server so pressing one never zeroes the others. Pressing a card applies its filter
 * and keeps every unrelated filter.
 */
export function TicketKpiCards({
  stats,
  loading,
  filters,
  onPick,
}: {
  stats: TicketStats | null
  loading: boolean
  filters: TicketFilters
  onPick: (k: KpiKey) => void
}) {
  const [more, setMore] = useState(false)
  const t = stats?.timings

  return (
    <section aria-label="مؤشرات التذاكر" className={cn('space-y-3 transition-opacity', loading && stats && 'opacity-70')} aria-busy={loading}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {PRIMARY.map((d) => (
          <KpiButton key={d.key} def={d} stats={stats} filters={filters} onPick={onPick} />
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
          aria-controls="ticket-kpi-more"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-black text-customBlue hover:bg-customBlue/[0.06]"
        >
          <ChevronDown size={14} className={cn('transition', more && 'rotate-180')} aria-hidden="true" />
          {more ? 'إخفاء المزيد' : 'مزيد من المؤشرات والأزمنة'}
        </button>

        {more ?
          <div id="ticket-kpi-more" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {SECONDARY.map((d) => (
                <KpiButton key={d.key} def={d} stats={stats} filters={filters} onPick={onPick} />
              ))}
            </div>

            <dl className="grid gap-3 sm:grid-cols-2" data-testid="kpi-timings">
              <div className="rounded-2xl border border-deepBlue/[0.08] bg-white p-4">
                <dt className="text-[12px] font-black text-deepBlue/80">متوسط زمن الاستجابة</dt>
                <dd className="mt-1 text-xl font-black text-deepBlue">{formatHours(t?.avgResponseHours ?? null)}</dd>
                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-deepBlue/50">
                  {t ? `${t.definitions.response} آخر ${t.windowDays} يومًا، من ${t.responseSample} تذكرة.` : ''}
                </p>
              </div>
              <div className="rounded-2xl border border-deepBlue/[0.08] bg-white p-4">
                <dt className="text-[12px] font-black text-deepBlue/80">متوسط زمن الحل</dt>
                <dd className="mt-1 text-xl font-black text-deepBlue">{formatHours(t?.avgResolutionHours ?? null)}</dd>
                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-deepBlue/50">
                  {t ? `${t.definitions.resolution} آخر ${t.windowDays} يومًا، من ${t.resolutionSample} تذكرة.` : ''}
                </p>
              </div>
            </dl>
            {t?.truncated ?
              <p className="text-[11px] font-bold text-amber-700">حُسبت الأزمنة من أحدث 2000 تذكرة فقط.</p>
            : null}
            {stats?.scopeNote ? <p className="text-[11px] font-semibold text-deepBlue/45">{stats.scopeNote}</p> : null}
          </div>
        : null}
      </div>
    </section>
  )
}
