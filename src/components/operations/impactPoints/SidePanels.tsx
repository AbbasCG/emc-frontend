import { Activity, Info, Trophy } from 'lucide-react'
import type { PointAward, PointsSummary } from '@/api/volunteerPointsApi'
import PersonAvatar from './PersonAvatar'
import { KIND_META, categoryLabel, entryKind, formatDate, formatNumber, signed } from './impactPointsUi'

const card = 'rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm'

/** The signed-in user's own standing. Everyone sees this; it grants nothing. */
export function MySummaryCard({ summary, name, userId }: { summary: PointsSummary; name?: string; userId?: number }) {
  return (
    <section aria-label="ملخصي" className="overflow-hidden rounded-3xl bg-navy p-5 text-white shadow-sm">
      <div className="flex items-center gap-3">
        <PersonAvatar name={name ?? 'أنا'} id={userId ?? 0} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{name ?? 'ملخصي'}</p>
          <p className="mt-0.5 text-[11px] font-bold text-white/70">سديم {summary.eligible_level.sadeem}</p>
        </div>
      </div>
      <p className="mt-4 text-3xl font-black tabular-nums">{formatNumber(summary.lifetime_points)}</p>
      <p className="text-[11px] font-bold text-white/70">نقطة أثر تراكمية</p>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
        <span>{summary.eligible_level.title}</span>
        <span className="tabular-nums text-accent-200">€{formatNumber(summary.credit_eur)}</span>
      </div>
    </section>
  )
}

/** Top of the Hall of Impact — capped server-side, never a full roster. */
export function LeaderboardCard({
  rows,
}: {
  rows: Array<{ user: { id: number; name: string; role: string | null } | null; lifetime_points: number }>
}) {
  const visible = rows.filter((r) => r.user != null).slice(0, 5)

  return (
    <section aria-labelledby="leaderboard-heading" className={card}>
      <h2 id="leaderboard-heading" className="flex items-center gap-2 text-sm font-black text-navy">
        <Trophy size={16} className="text-accent-600" aria-hidden="true" /> لوحة صدارة الأثر
      </h2>
      {visible.length === 0 ? (
        <p className="mt-3 text-xs font-bold text-muted-500">لا نقاط ممنوحة بعد — أول منحة تبدأ السجل</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {visible.map((row, i) => (
            <li key={row.user!.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2.5 font-bold text-navy">
                <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${i < 3 ? 'bg-accent-100 text-accent-800' : 'bg-slate-200 text-muted-600'}`}>
                  {i + 1}
                </span>
                <span className="truncate">{row.user!.name}</span>
              </span>
              <span className="font-black tabular-nums text-brand-600">{formatNumber(row.lifetime_points)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** The user's own latest movements — a quick glance for managers, whose main column is the people list. */
export function RecentActivityCard({ awards }: { awards: PointAward[] }) {
  return (
    <section aria-labelledby="recent-heading" className={card}>
      <h2 id="recent-heading" className="flex items-center gap-2 text-sm font-black text-navy">
        <Activity size={16} className="text-brand-500" aria-hidden="true" /> نشاطي الأخير
      </h2>
      {awards.length === 0 ? (
        <p className="mt-3 text-xs font-bold text-muted-500">لا حركات على نقاطك بعد.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {awards.slice(0, 5).map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-navy">{a.reason}</p>
                <p className="text-[10.5px] font-semibold text-muted-500">{categoryLabel(a.category)} · {formatDate(a.awarded_at)}</p>
              </div>
              <span className={`shrink-0 text-sm font-black tabular-nums ${a.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">{signed(a.points)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Explains, instead of hiding, why a member has no management actions. */
export function ManagementNote() {
  return (
    <p className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold leading-6 text-muted-600">
      <Info size={15} className="mt-1 shrink-0 text-brand-500" aria-hidden="true" />
      <span>منح النقاط وتعديلها وعرض سجلات الآخرين متاحة لقيادة الموارد البشرية والإدارات المخوَّلة فقط. تظهر هنا نقاطك وسجلك.</span>
    </p>
  )
}

/** A volunteer's own full ledger. */
export function MyHistoryTable({ awards }: { awards: PointAward[] }) {
  return (
    <section aria-labelledby="my-history-heading" className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <h2 id="my-history-heading" className="text-base font-black text-navy">سجل نقاطي</h2>
      {awards.length === 0 ? (
        <p className="mt-3 text-xs font-bold text-muted-500">لا منح بعد — مساهمتك القادمة تفتح السجل</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {awards.map((a) => {
            const meta = KIND_META[entryKind(a)]
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-black ring-1 ${meta.badge}`}>{meta.label}</span>
                    <span className="text-[11px] font-bold text-muted-500">{categoryLabel(a.category)}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-navy">{a.reason}</p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-500">
                    {a.awarder?.name ?? 'النظام'} · {formatDate(a.awarded_at)}
                  </p>
                </div>
                <span className={`text-lg font-black tabular-nums ${a.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">{signed(a.points)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
