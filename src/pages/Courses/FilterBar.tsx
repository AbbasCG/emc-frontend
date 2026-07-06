import { LayoutGrid, List, ChevronDown, AlertCircle, Search, X } from 'lucide-react'

type SelectOption = { value: string; label: string }

type FilterBarProps = {
  // Search
  search?: string
  onSearchChange?: (v: string) => void

  // Price
  activePrice: string
  onPriceChange: (v: string) => void

  // Delivery
  activeDelivery: string
  onDeliveryChange: (v: string) => void
  deliveryOptions: SelectOption[]

  // Level
  activeLevel: string
  onLevelChange: (v: string) => void
  levelOptions: SelectOption[]

  // Program type (optional — only shown when multiple options)
  activeProgramType?: string
  onProgramTypeChange?: (v: string) => void
  programTypeOptions?: SelectOption[]

  // Language (optional)
  activeLanguage?: string
  onLanguageChange?: (v: string) => void
  languageOptions?: SelectOption[]

  // Instructor (optional)
  activeInstructor?: string
  onInstructorChange?: (v: string) => void
  instructorOptions?: SelectOption[]

  // Category (optional)
  activeCategory?: string
  onCategoryChange?: (v: string) => void
  categoryOptions?: SelectOption[]

  // Availability
  activeAvailability: string
  onAvailabilityChange: (v: string) => void

  // Sort + view
  sortBy: string
  onSortChange: (sort: string) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void

  // Meta
  resultCount: number
  totalCount: number
  apiEmpty: boolean
  loadError: boolean
}

const priceFilters = [
  { value: 'all', label: 'الكل' },
  { value: 'free', label: 'مجاني' },
  { value: 'paid', label: 'مدفوع' },
]

const availabilityFilters = [
  { value: 'all', label: 'الكل' },
  { value: 'active', label: 'متاحة' },
  { value: 'ended', label: 'انتهت' },
]

const sortOptions = [
  { value: 'popular', label: 'الأكثر تسجيلاً' },
  { value: 'newest', label: 'الأحدث إضافة' },
  { value: 'soonest', label: 'الأقرب انطلاقاً' },
  { value: 'price_low', label: 'السعر: الأقل' },
  { value: 'price_high', label: 'السعر: الأعلى' },
  { value: 'duration', label: 'المدة' },
  { value: 'name_az', label: 'الاسم أ-ي' },
]

export default function FilterBar({
  search,
  onSearchChange,
  activePrice,
  onPriceChange,
  activeDelivery,
  onDeliveryChange,
  deliveryOptions,
  activeLevel,
  onLevelChange,
  levelOptions,
  activeProgramType,
  onProgramTypeChange,
  programTypeOptions,
  activeLanguage,
  onLanguageChange,
  languageOptions,
  activeInstructor,
  onInstructorChange,
  instructorOptions,
  activeCategory,
  onCategoryChange,
  categoryOptions,
  activeAvailability,
  onAvailabilityChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  resultCount,
  totalCount,
  apiEmpty,
  loadError,
}: FilterBarProps) {
  const showProgramType = programTypeOptions && programTypeOptions.length > 1 && onProgramTypeChange && activeProgramType !== undefined

  return (
    <div className="sticky top-[4.5rem] z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        {loadError && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>تعذّر تحميل الكتالوج من الخادم. تحقق من الاتصال ثم أعد تحميل الصفحة.</span>
          </div>
        )}
        {apiEmpty && !loadError && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted-600">
            لا توجد دورات منشورة في الكتالوج حالياً. تُحدَّث القائمة تلقائياً عند إضافة برامج جديدة.
          </div>
        )}

        {/* Search row */}
        {onSearchChange !== undefined && (
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-400" />
              <input
                type="search"
                value={search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="ابحث بالاسم، المدرب، التصنيف..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-2.5 pr-10 pl-10 text-sm text-deepBlue outline-none transition placeholder:text-muted-400 focus:border-brand-400 focus:bg-white"
                dir="rtl"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400 hover:text-muted-600"
                  aria-label="مسح البحث"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted-500">
              <span className="font-black text-deepBlue">{resultCount.toLocaleString('en-US')}</span>
              {' / '}
              <span className="font-black text-deepBlue">{totalCount.toLocaleString('en-US')}</span>
              {' دورة'}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          {/* Chip groups */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-500">السعر</span>
              {priceFilters.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => onPriceChange(tag.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                    activePrice === tag.value
                      ? 'bg-deepBlue text-white shadow-sm'
                      : 'bg-slate-100 text-muted-600 hover:bg-slate-200 hover:text-deepBlue'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-500">الحالة</span>
              {availabilityFilters.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => onAvailabilityChange(tag.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                    activeAvailability === tag.value
                      ? 'bg-deepBlue text-white shadow-sm'
                      : 'bg-slate-100 text-muted-600 hover:bg-slate-200 hover:text-deepBlue'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selects + view toggle */}
          <div className="flex flex-1 flex-wrap items-end justify-end gap-2 md:gap-2.5">
            <div className="flex min-w-[130px] flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-500">المستوى</span>
              <select
                value={activeLevel}
                onChange={(e) => onLevelChange(e.target.value)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/90 py-2.5 pr-3 pl-8 text-xs font-semibold text-deepBlue outline-none focus:border-brand-400"
              >
                {levelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex min-w-[140px] flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-500">نمط التقديم</span>
              <select
                value={activeDelivery}
                onChange={(e) => onDeliveryChange(e.target.value)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/90 py-2.5 pr-3 pl-8 text-xs font-semibold text-deepBlue outline-none focus:border-brand-400"
              >
                {deliveryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {categoryOptions && categoryOptions.length > 1 && onCategoryChange && (
              <div className="flex min-w-[150px] flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-500">التصنيف</span>
                <select
                  value={activeCategory ?? 'all'}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/90 py-2.5 pr-3 pl-8 text-xs font-semibold text-deepBlue outline-none focus:border-brand-400"
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {languageOptions && languageOptions.length > 1 && onLanguageChange && (
              <div className="flex min-w-[120px] flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-500">اللغة</span>
                <select
                  value={activeLanguage ?? 'all'}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/90 py-2.5 pr-3 pl-8 text-xs font-semibold text-deepBlue outline-none focus:border-brand-400"
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {instructorOptions && instructorOptions.length > 1 && onInstructorChange && (
              <div className="flex min-w-[150px] flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-500">المدرب</span>
                <select
                  value={activeInstructor ?? 'all'}
                  onChange={(e) => onInstructorChange(e.target.value)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/90 py-2.5 pr-3 pl-8 text-xs font-semibold text-deepBlue outline-none focus:border-brand-400"
                >
                  {instructorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {showProgramType && (
              <div className="flex min-w-[140px] flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-500">نوع البرنامج</span>
                <select
                  value={activeProgramType}
                  onChange={(e) => onProgramTypeChange!(e.target.value)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/90 py-2.5 pr-3 pl-8 text-xs font-semibold text-deepBlue outline-none focus:border-brand-400"
                >
                  {programTypeOptions!.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative min-w-[160px]">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-xs font-semibold text-deepBlue outline-none focus:border-brand-400"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-500" />
            </div>

            <div className="flex items-center overflow-hidden rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={`p-2.5 transition-colors ${
                  viewMode === 'grid' ? 'bg-deepBlue text-white' : 'bg-white text-muted-500 hover:bg-slate-50'
                }`}
                aria-label="عرض شبكة"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`p-2.5 transition-colors ${
                  viewMode === 'list' ? 'bg-deepBlue text-white' : 'bg-white text-muted-500 hover:bg-slate-50'
                }`}
                aria-label="عرض قائمة"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Count (only when no search row above) */}
            {!onSearchChange && (
              <span className="hidden text-xs font-medium whitespace-nowrap text-muted-500 sm:block">
                <span className="font-black text-deepBlue">{resultCount.toLocaleString('en-US')}</span>
                {' من '}
                <span className="font-black text-deepBlue">{totalCount.toLocaleString('en-US')}</span>
                {' دورة'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
