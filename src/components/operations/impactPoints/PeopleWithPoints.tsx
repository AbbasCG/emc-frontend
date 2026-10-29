import { useEffect, useState } from 'react'
import { Award, ChevronLeft, ChevronRight, History, PencilLine, RefreshCw, Search, SearchX, SlidersHorizontal, Users } from 'lucide-react'
import type { PointsCapabilities, PointsMember, PointsMembersQuery } from '@/api/volunteerPointsApi'
import PersonAvatar from './PersonAvatar'
import { fieldClass, formatDate, formatNumber } from './impactPointsUi'
import type { PeopleState } from './usePeopleWithPoints'

type Props = {
  state: PeopleState
  query: PointsMembersQuery
  hasFilters: boolean
  capabilities: PointsCapabilities
  onChange: (patch: Partial<PointsMembersQuery>) => void
  onReset: () => void
  onRetry: () => void
  onHistory: (member: PointsMember) => void
  onAdjust: (member: PointsMember) => void
  onAward: (member: PointsMember) => void
}

/** One grid for both layouts: columns on md+, a stacked card below. */
const ROW_GRID = 'md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.5fr)_7rem_9rem_7rem_auto] md:items-center md:gap-4'

const SORTS: Array<{ value: NonNullable<PointsMembersQuery['sort']>; label: string }> = [
  { value: 'points', label: 'الأعلى نقاطاً' },
  { value: 'recent', label: 'آخر نشاط' },
  { value: 'department', label: 'الإدارة' },
  { value: 'name', label: 'الاسم' },
]

/** Debounces typing so each keystroke is not a request. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function Skeleton() {
  return (
    <ul aria-busy="true" aria-label="جارٍ تحميل القائمة" className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="h-[4.25rem] animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </ul>
  )
}

export default function PeopleWithPoints({
  state, query, hasFilters, capabilities, onChange, onReset, onRetry, onHistory, onAdjust, onAward,
}: Props) {
  const [searchText, setSearchText] = useState(query.search ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const debouncedSearch = useDebounced(searchText, 300)

  useEffect(() => {
    const next = debouncedSearch.trim()
    if (next !== (query.search ?? '')) onChange({ search: next || undefined })
    // onChange/query.search are intentionally not dependencies: this effect
    // reacts only to the debounced text, and re-running on every query change
    // would loop (the query is what this effect writes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // "مسح الفلاتر" must also clear the box the user typed in: when the applied
  // search is cleared from outside, clear the input too (state adjusted while
  // rendering rather than from an effect).
  const [seenSearch, setSeenSearch] = useState(query.search)
  if (query.search !== seenSearch) {
    setSeenSearch(query.search)
    if (!query.search) setSearchText('')
  }

  const page = state.page
  const rows = page?.rows ?? []
  const loading = state.status === 'loading'
  const departments = page?.filters.departments ?? []
  const levels = page?.filters.levels ?? []

  return (
    <section aria-labelledby="people-heading" className="rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 id="people-heading" className="flex items-center gap-2 text-base font-black text-navy">
            <Users size={18} className="text-brand-500" aria-hidden="true" />
            المستفيدون من نقاط الأثر
          </h2>
          <p className="mt-1 text-xs font-semibold text-muted-500">
            {capabilities.scope === 'department' ? 'أعضاء الإدارات التي تقودها' : 'أعضاء فريق EMC الفعليون'} — طلاب الدورات والمدرّسون لا يظهرون هنا إلا إن كانوا أعضاء فريق.
          </p>
        </div>
        {page && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-muted-600">
            {formatNumber(page.total)} {page.total === 1 ? 'عضو' : 'أعضاء'}
          </span>
        )}
      </header>

      {/* Filters — collapsed behind a toggle on small screens. */}
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3.5 my-auto text-muted-400" />
            <input
              type="search"
              aria-label="بحث عن عضو"
              placeholder="ابحث بالاسم أو الإدارة أو المسمى…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={`${fieldClass} ps-10`}
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="people-filters"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-black text-navy hover:bg-slate-50 md:hidden"
          >
            <SlidersHorizontal size={14} aria-hidden="true" /> تصفية
          </button>
        </div>

        <div id="people-filters" className={`${filtersOpen ? 'grid' : 'hidden'} mt-3 grid-cols-1 gap-3 min-[480px]:grid-cols-3 md:grid`}>
          <select
            aria-label="الإدارة"
            value={query.department_id ?? ''}
            onChange={(e) => onChange({ department_id: e.target.value ? Number(e.target.value) : undefined })}
            className={fieldClass}
          >
            <option value="">كل الإدارات</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name ?? `إدارة #${d.id}`}</option>
            ))}
          </select>
          <select
            aria-label="المستوى"
            value={query.level ?? ''}
            onChange={(e) => onChange({ level: e.target.value || undefined })}
            className={fieldClass}
          >
            <option value="">كل المستويات</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
          <select
            aria-label="الترتيب"
            value={query.sort ?? 'points'}
            onChange={(e) => onChange({ sort: e.target.value as PointsMembersQuery['sort'], direction: undefined })}
            className={fieldClass}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4">
        {state.status === 'error' ? (
          <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center">
            <p className="text-sm font-black text-rose-700">تعذر تحميل قائمة المستفيدين</p>
            <p className="mt-1 text-xs font-semibold text-rose-600/80">تحقق من الاتصال ثم أعد المحاولة.</p>
            <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-navy ring-1 ring-rose-200 hover:bg-rose-100/50">
              <RefreshCw size={14} aria-hidden="true" /> إعادة المحاولة
            </button>
          </div>
        ) : !page ? (
          <Skeleton />
        ) : rows.length === 0 ? (
          hasFilters ? (
            <div className="py-10 text-center">
              <SearchX size={34} className="mx-auto text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-black text-navy">لا نتائج مطابقة</p>
              <p className="mt-1 text-xs font-semibold text-muted-500">جرّب كلمة بحث أخرى أو أزل الفلاتر.</p>
              <button type="button" onClick={onReset} className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-navy hover:bg-slate-50">
                مسح الفلاتر
              </button>
            </div>
          ) : (
            <div className="py-10 text-center">
              <Users size={34} className="mx-auto text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-black text-navy">لا توجد نقاط ممنوحة بعد</p>
              <p className="mt-1 text-xs font-semibold text-muted-500">
                {capabilities.can_award ? 'أول منحة تبدأ السجل — استخدم نموذج المنح السريع.' : 'ستظهر هنا أسماء الأعضاء فور منحهم نقاطاً.'}
              </p>
            </div>
          )
        ) : (
          <div aria-busy={loading} className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div aria-hidden="true" className={`${ROW_GRID} hidden px-4 pb-2 text-[11px] font-black text-muted-500`}>
              <span>العضو</span>
              <span>الإدارة</span>
              <span>النقاط</span>
              <span>المستوى</span>
              <span>آخر نشاط</span>
              <span className="w-28" />
            </div>

            <ul className="space-y-2">
              {rows.map((m) => (
                <li
                  key={m.user_id}
                  className={`${ROW_GRID} rounded-2xl border p-4 transition-colors hover:border-slate-300 ${m.is_self ? 'border-brand-200 bg-brand-50/40' : 'border-slate-100 bg-white'}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <PersonAvatar name={m.name} id={m.user_id} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-black text-navy">
                        <span className="truncate">{m.name}</span>
                        {m.is_self && <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-black text-brand-600">أنت</span>}
                      </p>
                      <p className="line-clamp-1 text-xs font-semibold text-muted-500" title={m.role_title ?? undefined}>{m.role_title ?? 'بدون مسمى'}</p>
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-2 break-words text-xs font-bold leading-5 text-muted-600 md:mt-0" title={m.department ?? undefined}>
                    <span className="text-muted-400 md:hidden">الإدارة: </span>{m.department ?? 'بدون إدارة'}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 md:mt-0 md:contents">
                    <p className="text-lg font-black tabular-nums text-navy md:text-base">
                      {formatNumber(m.lifetime_points)}
                      <span className="ms-1 text-[10px] font-bold text-muted-500">نقطة</span>
                    </p>
                    <span className="inline-flex w-fit items-center rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-black text-brand-600 ring-1 ring-brand-100">
                      {m.level.title}
                    </span>
                    <p className="text-[11px] font-semibold text-muted-500">
                      <span className="md:hidden">آخر نشاط: </span>{formatDate(m.last_activity_at)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0 md:justify-end">
                    {capabilities.can_view_history && (
                      <button type="button" onClick={() => onHistory(m)} aria-label={`سجل نقاط ${m.name}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-black text-navy transition hover:bg-slate-200">
                        <History size={13} aria-hidden="true" /> السجل
                      </button>
                    )}
                    {capabilities.can_adjust && !m.is_self && (
                      <button type="button" onClick={() => onAdjust(m)} aria-label={`تعديل نقاط ${m.name}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-[11px] font-black text-brand-600 transition hover:bg-brand-100">
                        <PencilLine size={13} aria-hidden="true" /> تعديل
                      </button>
                    )}
                    {capabilities.can_award && !m.is_self && (
                      <button type="button" onClick={() => onAward(m)} aria-label={`منح نقاط لـ ${m.name}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent-50 px-2.5 py-1.5 text-[11px] font-black text-accent-800 transition hover:bg-accent-100">
                        <Award size={13} aria-hidden="true" /> منح
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {page.lastPage > 1 && (
              <nav aria-label="التنقل بين الصفحات" className="mt-4 flex items-center justify-between gap-3">
                <button type="button" disabled={page.currentPage <= 1 || loading} onClick={() => onChange({ page: page.currentPage - 1 })}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-navy hover:bg-slate-50 disabled:opacity-40">
                  <ChevronRight size={14} aria-hidden="true" /> السابق
                </button>
                <span className="text-xs font-bold text-muted-500">صفحة {page.currentPage} من {page.lastPage}</span>
                <button type="button" disabled={page.currentPage >= page.lastPage || loading} onClick={() => onChange({ page: page.currentPage + 1 })}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-navy hover:bg-slate-50 disabled:opacity-40">
                  التالي <ChevronLeft size={14} aria-hidden="true" />
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
