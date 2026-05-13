import { LayoutGrid, List, ChevronDown } from 'lucide-react'

type FilterBarProps = {
  activeFilter: string
  onFilterChange: (filter: string) => void
  sortBy: string
  onSortChange: (sort: string) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  resultCount: number
  totalCount: number
}

const filterTags = [
  { value: 'all',      label: 'الكل' },
  { value: 'free',     label: 'مجاني' },
  { value: 'paid',     label: 'مدفوع' },
  { value: 'new',      label: 'جديد' },
  { value: 'upcoming', label: 'قادم' },
  { value: 'live',     label: 'نشط' },
]

const sortOptions = [
  { value: 'popular',    label: 'الأكثر شهرة' },
  { value: 'newest',     label: 'الأحدث' },
  { value: 'price_low',  label: 'السعر: الأقل' },
  { value: 'price_high', label: 'السعر: الأعلى' },
  { value: 'duration',   label: 'المدة' },
]

export default function FilterBar({
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  resultCount,
  totalCount,
}: FilterBarProps) {
  return (
    <div className="sticky top-20 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {filterTags.map(tag => (
              <button
                key={tag.value}
                onClick={() => onFilterChange(tag.value)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeFilter === tag.value
                    ? 'bg-deepBlue text-white shadow-sm'
                    : 'bg-slate-100 text-[#73777B] hover:bg-slate-200 hover:text-deepBlue'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Sort + View toggle */}
          <div className="flex items-center gap-3">
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => onSortChange(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 text-deepBlue text-xs font-semibold pl-8 pr-4 py-2 rounded-lg cursor-pointer focus:outline-none focus:border-customBlue transition-colors"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#73777B] pointer-events-none" />
            </div>

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' ? 'bg-deepBlue text-white' : 'bg-white text-[#73777B] hover:bg-slate-50'
                }`}
                aria-label="عرض شبكة"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' ? 'bg-deepBlue text-white' : 'bg-white text-[#73777B] hover:bg-slate-50'
                }`}
                aria-label="عرض قائمة"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Results count */}
            <span className="text-xs text-[#73777B] font-medium whitespace-nowrap hidden sm:block">
              <span className="text-deepBlue font-bold">{resultCount}</span>
              {' '}من{' '}
              <span className="text-deepBlue font-bold">{totalCount}</span>
              {' '}دورة
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
