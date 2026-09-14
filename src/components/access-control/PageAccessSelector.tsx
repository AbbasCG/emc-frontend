import { useId, useMemo, useState } from 'react'
import { ChevronDown, Lock, Search, X } from 'lucide-react'
import type { PageAccessRiskLevel } from '@/api/pageAccessCatalogApi'
import type { UserPageAccessState } from '@/api/accessControlApi'
import { RiskBadge } from '@/components/access-control/AccessBadges'
import { EmptyPanel, LoadingPanel } from '@/pages/super-admin/crud/shared/States'
import { cn } from '@/lib/utils'

/**
 * THE reusable Page Access selector — one component for Role defaults,
 * Department defaults (member + leader) and User overrides.
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION: selecting a page here controls whether
 * it can be opened. It grants no business capability.
 *
 * Deliberately ONE component rather than three near-identical ones. The only
 * real difference between the three screens is the per-row control:
 *   - `toggle`   — on/off (Role and Department defaults are POSITIVE ONLY:
 *                  "off" means the key is omitted, never a stored DENY)
 *   - `tristate` — DEFAULT / ALLOW / DENY (User overrides), where DEFAULT is the
 *                  ABSENCE of a key in the state map, matching the backend's
 *                  "default = no row" contract exactly.
 *
 * The component owns NO access rule. Rows, their Arabic labels, their
 * categories and their locked state are all supplied by the caller from backend
 * responses. A locked row can never be changed here — and even if the UI were
 * wrong, the backend rejects it.
 */

export type PageAccessSelectorRow = {
  key: string
  labelAr: string
  category: string
  categoryLabelAr: string
  riskLevel: PageAccessRiskLevel
  primaryRoute?: string
  routePatterns?: string[]
  /** Backend says this row cannot be configured in this context (protected, or outside the actor's authority). */
  locked: boolean
  lockedReasonAr?: string
}

type CommonProps = {
  rows: PageAccessSelectorRow[]
  loading?: boolean
  disabled?: boolean
  /** Rendered above the list — used for audience switches and contextual notices. */
  headerSlot?: React.ReactNode
  emptyTitle?: string
  emptySubtitle?: string
  /** Extra content rendered inside each row, e.g. the provenance badge in the user editor. */
  renderRowMeta?: (row: PageAccessSelectorRow) => React.ReactNode
}

type ToggleProps = CommonProps & {
  mode: 'toggle'
  /** Selected catalog keys. */
  value: string[]
  onChange: (next: string[]) => void
}

type TriStateProps = CommonProps & {
  mode: 'tristate'
  /** key -> 'allow' | 'deny'. A key ABSENT from this map is DEFAULT. */
  value: Record<string, UserPageAccessState>
  onChange: (next: Record<string, UserPageAccessState>) => void
}

export type PageAccessSelectorProps = ToggleProps | TriStateProps

type RowState = 'default' | UserPageAccessState

const TRISTATE_OPTIONS: { id: RowState; labelAr: string; cls: string }[] = [
  { id: 'default', labelAr: 'افتراضي', cls: 'data-[on=true]:bg-slate-700 data-[on=true]:text-white' },
  { id: 'allow', labelAr: 'مسموح', cls: 'data-[on=true]:bg-emerald-600 data-[on=true]:text-white' },
  { id: 'deny', labelAr: 'محجوب', cls: 'data-[on=true]:bg-rose-600 data-[on=true]:text-white' },
]

/** Search matches the Arabic label, the stable key, and every route the capability owns. */
function rowMatches(row: PageAccessSelectorRow, needle: string): boolean {
  if (!needle) return true
  const q = needle.trim().toLowerCase()
  if (!q) return true
  if (row.labelAr.toLowerCase().includes(q)) return true
  if (row.key.toLowerCase().includes(q)) return true
  if (row.categoryLabelAr.toLowerCase().includes(q)) return true
  if (row.primaryRoute && row.primaryRoute.toLowerCase().includes(q)) return true
  return (row.routePatterns ?? []).some((r) => r.toLowerCase().includes(q))
}

export function PageAccessSelector(props: PageAccessSelectorProps) {
  const { rows, loading = false, disabled = false, headerSlot, emptyTitle, emptySubtitle, renderRowMeta } = props

  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const searchId = useId()

  const filtered = useMemo(() => rows.filter((r) => rowMatches(r, q)), [rows, q])

  /** Grouped by the backend's own category metadata — no second category registry exists here. */
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; labelAr: string; rows: PageAccessSelectorRow[] }>()
    for (const row of filtered) {
      const existing = map.get(row.category)
      if (existing) existing.rows.push(row)
      else map.set(row.category, { key: row.category, labelAr: row.categoryLabelAr || row.category, rows: [row] })
    }
    return [...map.values()]
  }, [filtered])

  const selectedKeys = useMemo(
    () => (props.mode === 'toggle' ? new Set(props.value) : new Set(Object.keys(props.value))),
    [props],
  )

  const stateOf = (key: string): RowState => {
    if (props.mode === 'toggle') return props.value.includes(key) ? 'allow' : 'default'
    return props.value[key] ?? 'default'
  }

  /* ── Mutations ───────────────────────────────────────────────────────── */

  function setToggle(keys: string[], on: boolean) {
    if (props.mode !== 'toggle' || disabled) return
    const next = new Set(props.value)
    for (const k of keys) {
      if (on) next.add(k)
      else next.delete(k)
    }
    props.onChange([...next])
  }

  function setTri(keys: string[], state: RowState) {
    if (props.mode !== 'tristate' || disabled) return
    const next = { ...props.value }
    for (const k of keys) {
      // DEFAULT removes the entry entirely — the backend contract is
      // "absence of a row", so a 'default' value must never be stored or sent.
      if (state === 'default') delete next[k]
      else next[k] = state
    }
    props.onChange(next)
  }

  /** Locked rows are never touched by any bulk action. */
  const editableKeys = (list: PageAccessSelectorRow[]) => list.filter((r) => !r.locked).map((r) => r.key)

  const totalEditable = useMemo(() => rows.filter((r) => !r.locked).length, [rows])
  const activeCount = useMemo(
    () =>
      props.mode === 'toggle' ?
        props.value.length
      : Object.values(props.value).filter((s) => s === 'allow').length,
    [props],
  )
  const denyCount = useMemo(
    () => (props.mode === 'tristate' ? Object.values(props.value).filter((s) => s === 'deny').length : 0),
    [props],
  )

  if (loading) return <LoadingPanel label="جارٍ تحميل صفحات النظام…" />

  if (rows.length === 0) {
    return (
      <EmptyPanel
        title={emptyTitle ?? 'لا توجد صفحات متاحة للإعداد'}
        subtitle={emptySubtitle ?? 'لم يُرجع الخادم أي صفحة قابلة للإسناد في هذا السياق.'}
      />
    )
  }

  const visibleEditable = editableKeys(filtered)

  return (
    <div dir="rtl" className="space-y-3 text-right rtl:text-right">
      {headerSlot}

      {/* Toolbar: search + counts + global bulk */}
      <div className="space-y-2.5 rounded-2xl border border-ink-100 bg-slate-50/70 p-3">
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">
            البحث في الصفحات بالاسم أو المعرّف أو المسار
          </label>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id={searchId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم العربي أو المعرّف أو المسار…"
            className="w-full rounded-xl border border-ink-100 bg-white py-2 ps-9 pe-9 text-[12px] font-bold text-deepBlue outline-none transition placeholder:font-semibold placeholder:text-slate-400 focus:border-customBlue/40 focus:ring-2 focus:ring-customBlue/15"
          />
          {q ?
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="مسح البحث"
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-deepBlue"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-black text-muted-600">
            {props.mode === 'toggle' ?
              <>
                مُفعَّلة <span className="tabular-nums text-deepBlue">{activeCount}</span> من{' '}
                <span className="tabular-nums">{totalEditable}</span>
              </>
            : <>
                مسموح <span className="tabular-nums text-emerald-700">{activeCount}</span> · محجوب{' '}
                <span className="tabular-nums text-rose-700">{denyCount}</span> · الباقي افتراضي
              </>
            }
            {q ?
              <span className="ms-2 text-slate-400">
                (ظاهر {filtered.length} من {rows.length})
              </span>
            : null}
          </p>

          {/* Global bulk applies to the CURRENTLY VISIBLE rows only — stated in the
              label so a filtered "select all" can never silently touch hidden rows. */}
          {!disabled && visibleEditable.length > 0 ?
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">على النتائج الظاهرة:</span>
              {props.mode === 'toggle' ?
                <>
                  <BulkButton onClick={() => setToggle(visibleEditable, true)}>تفعيل الكل</BulkButton>
                  <BulkButton onClick={() => setToggle(visibleEditable, false)}>إلغاء الكل</BulkButton>
                </>
              : <>
                  <BulkButton onClick={() => setTri(visibleEditable, 'allow')}>سماح الكل</BulkButton>
                  <BulkButton onClick={() => setTri(visibleEditable, 'deny')}>حجب الكل</BulkButton>
                  <BulkButton onClick={() => setTri(visibleEditable, 'default')}>إعادة الكل</BulkButton>
                </>
              }
            </div>
          : null}
        </div>
      </div>

      {groups.length === 0 ?
        <EmptyPanel title="لا توجد نتائج مطابقة" subtitle="جرّب مصطلح بحث آخر أو امسح البحث." />
      : null}

      {/* Categories */}
      <div className="space-y-2">
        {groups.map((group) => {
          const isCollapsed = collapsed[group.key] === true
          const groupEditable = editableKeys(group.rows)
          const groupActive = group.rows.filter((r) => !r.locked && selectedKeys.has(r.key)).length
          const panelId = `pa-cat-${group.key}`

          return (
            <section key={group.key} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 bg-slate-50/80 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !isCollapsed }))}
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  className="flex min-w-0 items-center gap-2 text-right"
                >
                  <ChevronDown
                    className={cn('h-4 w-4 shrink-0 text-slate-400 transition', isCollapsed && 'rotate-90 rtl:-rotate-90')}
                    aria-hidden
                  />
                  <span className="truncate text-[12px] font-black text-deepBlue">{group.labelAr}</span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black tabular-nums text-muted-600 ring-1 ring-ink-100">
                    {groupActive}/{group.rows.length}
                  </span>
                </button>

                {!disabled && groupEditable.length > 0 ?
                  <div className="flex flex-wrap items-center gap-1.5">
                    {props.mode === 'toggle' ?
                      <>
                        <BulkButton onClick={() => setToggle(groupEditable, true)}>تفعيل</BulkButton>
                        <BulkButton onClick={() => setToggle(groupEditable, false)}>إلغاء</BulkButton>
                      </>
                    : <>
                        <BulkButton onClick={() => setTri(groupEditable, 'allow')}>سماح</BulkButton>
                        <BulkButton onClick={() => setTri(groupEditable, 'deny')}>حجب</BulkButton>
                        <BulkButton onClick={() => setTri(groupEditable, 'default')}>إعادة</BulkButton>
                      </>
                    }
                  </div>
                : null}
              </div>

              {!isCollapsed ?
                <ul id={panelId} className="divide-y divide-ink-100/70">
                  {group.rows.map((row) => (
                    <li
                      key={row.key}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-2 px-3 py-2.5',
                        row.locked && 'bg-slate-50/60',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {row.locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden /> : null}
                          <span
                            className={cn(
                              'truncate text-[12px] font-black',
                              row.locked ? 'text-slate-500' : 'text-deepBlue',
                            )}
                          >
                            {row.labelAr || row.key}
                          </span>
                          <RiskBadge riskLevel={row.riskLevel} />
                          {renderRowMeta?.(row)}
                        </div>
                        <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400" dir="ltr">
                          {row.key}
                          {row.primaryRoute ? ` · ${row.primaryRoute}` : ''}
                        </p>
                        {row.locked && row.lockedReasonAr ?
                          <p className="mt-1 text-[10px] font-bold text-rose-700">{row.lockedReasonAr}</p>
                        : null}
                      </div>

                      <div className="shrink-0">
                        {props.mode === 'toggle' ?
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <span className="sr-only">{`تفعيل صفحة ${row.labelAr || row.key}`}</span>
                            <input
                              type="checkbox"
                              checked={stateOf(row.key) === 'allow'}
                              disabled={row.locked || disabled}
                              onChange={(e) => setToggle([row.key], e.target.checked)}
                              className="h-4 w-4 cursor-pointer rounded border-ink-200 text-customBlue focus:ring-2 focus:ring-customBlue/30 disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </label>
                        : <fieldset
                            className="flex items-center gap-0.5 rounded-xl bg-slate-100 p-0.5"
                            disabled={row.locked || disabled}
                          >
                            <legend className="sr-only">{`حالة الوصول لصفحة ${row.labelAr || row.key}`}</legend>
                            {TRISTATE_OPTIONS.map((opt) => {
                              const on = stateOf(row.key) === opt.id
                              return (
                                <label
                                  key={opt.id}
                                  data-on={on}
                                  className={cn(
                                    'cursor-pointer rounded-lg px-2 py-1 text-[10px] font-black text-muted-600 transition',
                                    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-customBlue/40',
                                    'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40',
                                    opt.cls,
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name={`pa-${row.key}`}
                                    className="sr-only"
                                    checked={on}
                                    disabled={row.locked || disabled}
                                    onChange={() => setTri([row.key], opt.id)}
                                  />
                                  {opt.labelAr}
                                </label>
                              )
                            })}
                          </fieldset>
                        }
                      </div>
                    </li>
                  ))}
                </ul>
              : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function BulkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-ink-100 bg-white px-2 py-1 text-[10px] font-black text-muted-600 transition hover:border-customBlue/35 hover:bg-brand-50 hover:text-customBlue focus-visible:ring-2 focus-visible:ring-customBlue/40"
    >
      {children}
    </button>
  )
}
