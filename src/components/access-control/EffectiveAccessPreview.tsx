import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import {
  fetchUserEffectivePageAccess,
  type EffectivePageAccessRow,
  type PageAccessSource,
} from '@/api/accessControlApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { AccessSourceBadge, PageAccessScopeNotice, RiskBadge } from '@/components/access-control/AccessBadges'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '@/pages/super-admin/crud/shared/States'
import { ProtectedAuthorityNotice } from '@/components/access-control/AccessBadges'
import { cn } from '@/lib/utils'

/**
 * Phase 2D — EFFECTIVE PAGE ACCESS preview. STRICTLY READ-ONLY.
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION: this shows which pages resolve open
 * for a user and WHY, never what they may do once inside.
 *
 * This component renders the backend resolver's answer verbatim. It does NOT
 * combine role/department/override layers itself — provenance (`primary_source`,
 * `sources`, `override_state`) and even the Arabic wording for the deciding
 * layer come from the server, so the preview can never disagree with the
 * resolver it is previewing.
 *
 * There is deliberately NO write path here: effective access is derived, and is
 * changed by editing the role, department or user layers that feed it.
 */

const SOURCE_SUMMARY: { id: PageAccessSource; labelAr: string }[] = [
  { id: 'root_authority', labelAr: 'صلاحية النظام الكاملة' },
  { id: 'role', labelAr: 'من الدور' },
  { id: 'department_member', labelAr: 'من الإدارة' },
  { id: 'department_leader', labelAr: 'لأنه قائد الإدارة' },
  { id: 'user_allow', labelAr: 'إضافة خاصة' },
]

type Filter = 'all' | 'allowed' | 'denied'

export function EffectiveAccessPreview({ userId, userName }: { userId: number; userName: string }) {
  const [rows, setRows] = useState<EffectivePageAccessRow[]>([])
  const [allowedKeys, setAllowedKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setForbidden(false)
    try {
      const data = await fetchUserEffectivePageAccess(userId)
      setRows(data.pages)
      setAllowedKeys(data.allowedKeys)
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 403) setForbidden(true)
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  /** Counts per contributing layer — read straight off the resolver's own `sources`. */
  const summary = useMemo(() => {
    const counts = new Map<PageAccessSource, number>()
    for (const row of rows) {
      for (const s of row.sources) counts.set(s, (counts.get(s) ?? 0) + 1)
    }
    const denied = rows.filter((r) => r.overrideState === 'deny').length
    return { counts, denied }
  }, [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === 'allowed' && !r.allowed) return false
      if (filter === 'denied' && r.allowed) return false
      if (!needle) return true
      return (
        r.labelAr.toLowerCase().includes(needle) ||
        r.key.toLowerCase().includes(needle) ||
        r.categoryLabelAr.toLowerCase().includes(needle)
      )
    })
  }, [rows, q, filter])

  if (loading) return <LoadingPanel label="جارٍ حساب الوصول الفعلي…" />

  if (forbidden) {
    return <ProtectedAuthorityNotice>لا تملك صلاحية عرض الوصول الفعلي لهذا المستخدم.</ProtectedAuthorityNotice>
  }

  if (error) return <ErrorPanel title="تعذر تحميل الوصول الفعلي" hint={error} />

  if (rows.length === 0) {
    return <EmptyPanel title="لا توجد بيانات وصول فعلي" subtitle={`لم يُرجع الخادم أي نتيجة للمستخدم «${userName}».`} />
  }

  return (
    <div dir="rtl" className="space-y-3 text-right rtl:text-right">
      <PageAccessScopeNotice />

      <p className="text-[11px] font-bold leading-relaxed text-muted-600">
        هذه معاينة للقراءة فقط. لتغيير النتيجة، عدّل الوصول الافتراضي للدور أو الإدارة أو استثناءات المستخدم.
      </p>

      {/* Layer summary */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <SummaryTile labelAr="الصفحات المسموحة" value={allowedKeys.length} tone="allow" />
        {SOURCE_SUMMARY.map((s) => (
          <SummaryTile key={s.id} labelAr={s.labelAr} value={summary.counts.get(s.id) ?? 0} />
        ))}
        <SummaryTile labelAr="محجوبة بشكل خاص" value={summary.denied} tone="deny" />
      </div>

      {/* Filters */}
      <div className="space-y-2 rounded-2xl border border-ink-100 bg-slate-50/70 p-3">
        <div className="relative">
          <label htmlFor="effective-search" className="sr-only">
            البحث في الصفحات
          </label>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="effective-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو المعرّف…"
            className="w-full rounded-xl border border-ink-100 bg-white py-2 ps-9 pe-9 text-[12px] font-bold text-deepBlue outline-none focus:border-customBlue/40 focus:ring-2 focus:ring-customBlue/15"
          />
          {q ?
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="مسح البحث"
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-deepBlue"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'all', labelAr: 'الكل' },
              { id: 'allowed', labelAr: 'مسموحة' },
              { id: 'denied', labelAr: 'غير مسموحة' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                'rounded-lg px-2.5 py-1 text-[10px] font-black transition',
                filter === f.id ?
                  'bg-[#0C2A4B] text-white'
                : 'border border-ink-100 bg-white text-muted-600 hover:text-deepBlue',
              )}
            >
              {f.labelAr}
            </button>
          ))}
          <span className="ms-auto self-center text-[10px] font-bold text-slate-400">
            ظاهر {filtered.length} من {rows.length}
          </span>
        </div>
      </div>

      {filtered.length === 0 ?
        <EmptyPanel title="لا توجد نتائج مطابقة" subtitle="جرّب مصطلح بحث آخر أو غيّر التصفية." />
      : <ul className="divide-y divide-ink-100/70 overflow-hidden rounded-2xl border border-ink-100 bg-white">
          {filtered.map((row) => (
            <li key={row.key} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                      row.allowed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400',
                    )}
                    aria-hidden
                  >
                    {row.allowed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                  <span className="truncate text-[12px] font-black text-deepBlue">{row.labelAr || row.key}</span>
                  <span className="sr-only">{row.allowed ? 'مسموحة' : 'غير مسموحة'}</span>
                  <RiskBadge riskLevel={row.riskLevel} />
                </div>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400" dir="ltr">
                  {row.key}
                </p>
                {row.sources.length > 1 ?
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400">كل المصادر:</span>
                    {row.sources.map((s) => (
                      <AccessSourceBadge key={s} source={s} />
                    ))}
                  </div>
                : null}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                {/* Arabic wording comes from the resolver itself. */}
                <AccessSourceBadge source={row.primarySource} labelAr={row.primarySourceLabelAr} />
                {row.overrideState ?
                  <span className="text-[10px] font-bold text-slate-400">
                    استثناء: {row.overrideState === 'allow' ? 'مسموح' : 'محجوب'}
                  </span>
                : null}
              </div>
            </li>
          ))}
        </ul>
      }
    </div>
  )
}

function SummaryTile({ labelAr, value, tone }: { labelAr: string; value: number; tone?: 'allow' | 'deny' }) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-3 py-2.5',
        tone === 'allow' ? 'border-emerald-200 bg-emerald-50/60'
        : tone === 'deny' ? 'border-rose-200 bg-rose-50/60'
        : 'border-ink-100 bg-white',
      )}
    >
      <p className="text-[10px] font-black text-muted-600">{labelAr}</p>
      <p className="mt-0.5 text-[16px] font-black tabular-nums text-deepBlue">{value}</p>
    </div>
  )
}
