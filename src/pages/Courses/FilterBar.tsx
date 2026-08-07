import { memo } from 'react'
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

  /** Optional: page-level reset (also clears state the bar doesn't own, e.g. hero search/category). */
  onResetAll?: () => void
}

const priceFilters = [
  { value: 'all', label: 'السعر' },
  { value: 'free', label: 'مجاني' },
  { value: 'paid', label: 'مدفوع' },
]

const availabilityFilters = [
  { value: 'all', label: 'الحالة' },
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

/** Compact rounded select-pill; highlights when a non-default value is chosen. */
function SelectPill({
  label,
  value,
  options,
  onChange,
  defaultValue = 'all',
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (v: string) => void
  defaultValue?: string
}) {
  const active = value !== defaultValue
  return (
    <div className="relative shrink-0">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 max-w-[11rem] cursor-pointer appearance-none truncate rounded-full border pe-8 ps-3.5 text-xs font-bold outline-none transition-colors duration-200 focus:border-brand-400 ${
          active
            ? 'border-brand-300 bg-brand-50 text-brand-700'
            : 'border-line bg-white text-ink-500 hover:border-brand-200'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {/* A bare «الكل» first option reads ambiguously on a closed pill — show the group name instead. */}
            {opt.value === 'all' && opt.label === 'الكل' ? label : opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className={`pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
          active ? 'text-brand-600' : 'text-muted-400'
        }`}
      />
    </div>
  )
}

function FilterBar({
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
  onResetAll,
}: FilterBarProps) {
  const showProgramType = programTypeOptions && programTypeOptions.length > 1 && onProgramTypeChange && activeProgramType !== undefined
  const showCategory = categoryOptions && categoryOptions.length > 1 && onCategoryChange
  const showLanguage = languageOptions && languageOptions.length > 1 && onLanguageChange
  const showInstructor = instructorOptions && instructorOptions.length > 1 && onInstructorChange

  const hasActiveFilters =
    activePrice !== 'all' ||
    activeAvailability !== 'all' ||
    activeLevel !== 'all' ||
    activeDelivery !== 'all' ||
    (activeProgramType !== undefined && activeProgramType !== 'all') ||
    (activeCategory !== undefined && activeCategory !== 'all') ||
    (activeLanguage !== undefined && activeLanguage !== 'all') ||
    (activeInstructor !== undefined && activeInstructor !== 'all') ||
    Boolean(search && search.trim()) ||
    sortBy !== 'popular'

  function resetAll() {
    if (onResetAll) {
      onResetAll()
      return
    }
    onPriceChange('all')
    onAvailabilityChange('all')
    onLevelChange('all')
    onDeliveryChange('all')
    onProgramTypeChange?.('all')
    onCategoryChange?.('all')
    onLanguageChange?.('all')
    onInstructorChange?.('all')
    onSearchChange?.('')
    onSortChange('popular')
  }

  return (
    <div className="sticky top-[4.5rem] z-30 border-b border-line bg-white/90 shadow-emc-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        {loadError && (
          <div className="mb-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>تعذّر تحميل الكتالوج من الخادم. تحقق من الاتصال ثم أعد تحميل الصفحة.</span>
          </div>
        )}
        {apiEmpty && !loadError && (
          <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted-600">
            لا توجد دورات منشورة في الكتالوج حالياً. تُحدَّث القائمة تلقائياً عند إضافة برامج جديدة.
          </div>
        )}

        {/* Search row (only when the page routes search through the bar, e.g. /programs) */}
        {onSearchChange !== undefined && (
          <div className="relative mb-2.5">
            <Search className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-400" />
            <input
              type="search"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث بالاسم، المدرب، التصنيف..."
              className="w-full rounded-2xl border border-line bg-paper/70 py-2.5 pe-10 ps-10 text-sm text-deepBlue outline-none transition placeholder:text-muted-400 focus:border-brand-400 focus:bg-white"
              dir="rtl"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-400 hover:text-muted-600"
                aria-label="مسح البحث"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Single toolbar row — wraps on mobile */}
        <div className="flex flex-wrap items-center gap-2">
          <SelectPill label="السعر" value={activePrice} options={priceFilters} onChange={onPriceChange} />
          <SelectPill label="الحالة" value={activeAvailability} options={availabilityFilters} onChange={onAvailabilityChange} />
          <SelectPill label="المستوى" value={activeLevel} options={levelOptions} onChange={onLevelChange} />
          <SelectPill label="نمط التقديم" value={activeDelivery} options={deliveryOptions} onChange={onDeliveryChange} />
          {showProgramType && (
            <SelectPill
              label="نوع البرنامج"
              value={activeProgramType!}
              options={programTypeOptions!}
              onChange={onProgramTypeChange!}
            />
          )}
          {showCategory && (
            <SelectPill
              label="التصنيف"
              value={activeCategory ?? 'all'}
              options={categoryOptions!}
              onChange={onCategoryChange!}
            />
          )}
          {showLanguage && (
            <SelectPill
              label="اللغة"
              value={activeLanguage ?? 'all'}
              options={languageOptions!}
              onChange={onLanguageChange!}
            />
          )}
          {showInstructor && (
            <SelectPill
              label="المدرب"
              value={activeInstructor ?? 'all'}
              options={instructorOptions!}
              onChange={onInstructorChange!}
            />
          )}

          <span aria-hidden className="hidden h-5 w-px shrink-0 bg-line sm:inline-block" />

          <SelectPill
            label="ترتيب النتائج"
            value={sortBy}
            options={sortOptions}
            onChange={onSortChange}
            defaultValue="popular"
          />

          <div className="flex h-9 shrink-0 items-center overflow-hidden rounded-full border border-line">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`flex h-full items-center px-2.5 transition-colors ${
                viewMode === 'grid' ? 'bg-deepBlue text-white' : 'bg-white text-muted-500 hover:bg-slate-50'
              }`}
              aria-label="عرض شبكة"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`flex h-full items-center px-2.5 transition-colors ${
                viewMode === 'list' ? 'bg-deepBlue text-white' : 'bg-white text-muted-500 hover:bg-slate-50'
              }`}
              aria-label="عرض قائمة"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <div className="ms-auto flex items-center gap-3">
            <span className="whitespace-nowrap text-xs font-semibold text-muted-500" aria-live="polite">
              <span className="font-black tabular-nums text-deepBlue" dir="ltr">
                {resultCount.toLocaleString('en-US')}
              </span>
              {' من '}
              <span className="font-black tabular-nums text-deepBlue" dir="ltr">
                {totalCount.toLocaleString('en-US')}
              </span>
              {' دورة'}
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAll}
                className="whitespace-nowrap text-xs font-bold text-brand-600 underline-offset-4 transition-colors duration-200 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(FilterBar)
