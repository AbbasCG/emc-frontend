import type { ChangeEvent, ReactNode } from 'react'
import { ChevronDown, Search, SlidersHorizontal, XCircle } from 'lucide-react'
import type { PlacementStatus } from '@/api/placementApi'
import { CEFR_MAP } from '@/components/instructor/instructorStudentFormats'
import { STATUS_AR, SORT_OPTIONS, type AssignmentFilter, type SortKey } from './constants'

type Props = {
  search: string
  onSearchChange: (v: string) => void
  filterStatus: PlacementStatus | ''
  onStatusChange: (v: PlacementStatus | '') => void
  filterCourse: number | ''
  onCourseChange: (v: number | '') => void
  courses: { id: number; title: string }[]
  filterLevel: string
  onLevelChange: (v: string) => void
  filterAssignment: AssignmentFilter
  onAssignmentChange: (v: AssignmentFilter) => void
  filterDate: string
  onDateChange: (v: string) => void
  sort: SortKey
  onSortChange: (v: SortKey) => void
  onClear: () => void
  hasActiveFilters: boolean
}

const LEVELS = ['Starter', 'A1', 'A2', 'B1', 'B2', 'C1']

export function PlacementTestsFilterBar(props: Props) {
  const {
    search, onSearchChange,
    filterStatus, onStatusChange,
    filterCourse, onCourseChange, courses,
    filterLevel, onLevelChange,
    filterAssignment, onAssignmentChange,
    filterDate, onDateChange,
    sort, onSortChange,
    onClear, hasActiveFilters,
  } = props

  return (
    <div className="rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white/80 p-3 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.12)] backdrop-blur-md sm:p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-deepBlue/35">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        تصفية وترتيب
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-0 flex-1 lg:min-w-[200px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث بالاسم أو البريد أو الدورة..."
            dir="rtl"
            className="h-10 w-full rounded-xl border border-[#0C2A4B]/10 bg-[#F8FAFC]/90 pr-10 pl-3 text-[12px] font-semibold text-deepBlue outline-none focus:border-[#0077B6] focus:bg-white focus:ring-2 focus:ring-[#0077B6]/15"
          />
        </div>

        <FilterSelect value={filterStatus} onChange={(e) => onStatusChange(e.target.value as PlacementStatus | '')} label="الحالة">
          <option value="">جميع الحالات</option>
          {Object.entries(STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </FilterSelect>

        <FilterSelect value={filterCourse} onChange={(e) => onCourseChange(e.target.value ? Number(e.target.value) : '')} label="الدورة">
          <option value="">جميع الدورات</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </FilterSelect>

        <FilterSelect value={filterLevel} onChange={(e) => onLevelChange(e.target.value)} label="المستوى">
          <option value="">جميع المستويات</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l} {CEFR_MAP[l]?.arabic ?? l}</option>)}
        </FilterSelect>

        <FilterSelect value={filterAssignment} onChange={(e) => onAssignmentChange(e.target.value as AssignmentFilter)} label="الإسناد">
          <option value="">الكل</option>
          <option value="assigned">مُسند</option>
          <option value="unassigned">غير مُسند</option>
        </FilterSelect>

        <input
          type="date"
          value={filterDate}
          onChange={(e) => onDateChange(e.target.value)}
          dir="ltr"
          className="h-10 rounded-xl border border-[#0C2A4B]/10 bg-white px-3 text-[11px] font-semibold text-deepBlue outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
          title="تاريخ الإكمال"
        />

        <FilterSelect value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)} label="ترتيب">
          {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </FilterSelect>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[11px] font-black text-deepBlue/55 transition hover:bg-slate-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            مسح
          </button>
        )}
      </div>
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string | number
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void
  label?: string
  children: ReactNode
}) {
  return (
    <div className="relative min-w-[130px]">
      <select
        value={value}
        onChange={onChange}
        dir="rtl"
        title={label}
        className="h-10 w-full appearance-none rounded-xl border border-[#0C2A4B]/10 bg-white py-0 pl-8 pr-3 text-[11px] font-bold text-deepBlue/80 outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
}
