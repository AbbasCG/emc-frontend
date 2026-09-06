import { ChevronDown, Search } from 'lucide-react'
import type { TeachingCourseLms } from '@/types/lms'
import { CEFR_MAP } from '@/components/instructor/instructorStudentFormats'
import { CEFR_LEVELS, STATUS_FILTERS, type StatusFilter } from './constants'

type Props = {
  courses: TeachingCourseLms[]
  selectedCourse: number | null
  onCourseChange: (id: number | null) => void
  filterLevel: string
  onLevelChange: (level: string) => void
  filterStatus: StatusFilter
  onStatusChange: (status: StatusFilter) => void
  search: string
  onSearchChange: (q: string) => void
  groupSearch: string
  onGroupSearchChange: (q: string) => void
}

export function FilterToolbar({
  courses,
  selectedCourse,
  onCourseChange,
  filterLevel,
  onLevelChange,
  filterStatus,
  onStatusChange,
  search,
  onSearchChange,
  groupSearch,
  onGroupSearchChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={groupSearch}
            onChange={(e) => onGroupSearchChange(e.target.value)}
            placeholder="بحث في الصفوف..."
            dir="rtl"
            className="h-10 w-full rounded-xl border border-[#0C2A4B]/10 bg-[#F8FAFC] pr-10 pl-3 text-[13px] font-semibold text-[#0C2A4B] outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:bg-white focus:ring-2 focus:ring-[#0077B6]/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[140px]">
            <select
              value={selectedCourse ?? ''}
              onChange={(e) => onCourseChange(e.target.value ? Number(e.target.value) : null)}
              dir="rtl"
              className="h-10 w-full appearance-none rounded-xl border border-[#0C2A4B]/10 bg-white py-0 pl-8 pr-3 text-[12px] font-bold text-[#0C2A4B] outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
            >
              <option value="">جميع الدورات</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative min-w-[120px]">
            <select
              value={filterLevel}
              onChange={(e) => onLevelChange(e.target.value)}
              dir="rtl"
              className="h-10 w-full appearance-none rounded-xl border border-[#0C2A4B]/10 bg-white py-0 pl-8 pr-3 text-[12px] font-bold text-[#0C2A4B]/80 outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
            >
              <option value="">جميع المستويات</option>
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l} {CEFR_MAP[l]?.arabic ?? l}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[#0C2A4B]/[0.06] bg-white p-1 shadow-sm">
          {STATUS_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onStatusChange(id)}
              className={`rounded-lg px-3.5 py-1.5 text-[11px] font-bold transition ${
                filterStatus === id
                  ? 'bg-[#0C2A4B] text-white shadow-sm'
                  : 'text-[#0C2A4B]/55 hover:bg-[#F8FAFC] hover:text-[#0C2A4B]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث باسم الطالب..."
            dir="rtl"
            className="h-9 w-full rounded-xl border border-[#0C2A4B]/10 bg-white pr-9 pl-3 text-[12px] font-semibold text-[#0C2A4B] outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
          />
        </div>
      </div>
    </div>
  )
}
