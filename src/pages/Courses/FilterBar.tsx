import { memo, Fragment, type ReactNode } from 'react'
import { ChevronDown, AlertCircle, Search, X } from 'lucide-react'

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

  // Sort
  sortBy: string
  onSortChange: (sort: string) => void

  /** Kept for call-site compatibility (/programs passes them) — the view toggle was removed:
   *  one editorial view, fewer choices. */
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void

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

/** Minimal text-dropdown: transparent, no pill chrome — a hairline underline when idle,
 *  customBlue text + the drawn arc when a non-default value is active. */
function TextSelect({
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
    <div className={`relative shrink-0 ${active ? 'emc-cta-line after:scale-x-100' : ''}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 max-w-[11rem] cursor-pointer appearance-none truncate border-0 border-b bg-transparent pe-6 ps-0.5 text-xs font-bold outline-none transition-colors duration-200 ${
          active
            ? 'border-transparent text-customBlue'
            : 'border-line text-ink-500 hover:border-brand-200 hover:text-navy focus:border-brand-400'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {/* A bare «الكل» first option reads ambiguously when closed show the group name instead. */}
            {opt.value === 'all' && opt.label === 'الكل' ? label : opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className={`pointer-events-none absolute end-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
          active ? 'text-customBlue' : 'text-muted-400'
        }`}
      />
    </div>
  )
}

/** Dot seam between toolbar controls — the editorial separator, not borders. */
function Dot() {
  return (
    <span aria-hidden className="hidden select-none text-ink-200 sm:inline">
      ·
    </span>
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

  const selects: Array<{ key: string; node: ReactNode }> = [
    {
      key: 'price',
      node: <TextSelect label="السعر" value={activePrice} options={priceFilters} onChange={onPriceChange} />,
    },
    {
      key: 'availability',
      node: (
        <TextSelect label="الحالة" value={activeAvailability} options={availabilityFilters} onChange={onAvailabilityChange} />
      ),
    },
    {
      key: 'level',
      node: <TextSelect label="المستوى" value={activeLevel} options={levelOptions} onChange={onLevelChange} />,
    },
    {
      key: 'delivery',
      node: <TextSelect label="نمط التقديم" value={activeDelivery} options={deliveryOptions} onChange={onDeliveryChange} />,
    },
  ]
  if (showProgramType) {
    selects.push({
      key: 'programType',
      node: (
        <TextSelect label="نوع البرنامج" value={activeProgramType!} options={programTypeOptions!} onChange={onProgramTypeChange!} />
      ),
    })
  }
  if (showCategory) {
    selects.push({
      key: 'category',
      node: (
        <TextSelect label="التصنيف" value={activeCategory ?? 'all'} options={categoryOptions!} onChange={onCategoryChange!} />
      ),
    })
  }
  if (showLanguage) {
    selects.push({
      key: 'language',
      node: (
        <TextSelect label="اللغة" value={activeLanguage ?? 'all'} options={languageOptions!} onChange={onLanguageChange!} />
      ),
    })
  }
  if (showInstructor) {
    selects.push({
      key: 'instructor',
      node: (
        <TextSelect label="المدرب" value={activeInstructor ?? 'all'} options={instructorOptions!} onChange={onInstructorChange!} />
      ),
    })
  }
  selects.push({
    key: 'sort',
    node: (
      <TextSelect label="ترتيب النتائج" value={sortBy} options={sortOptions} onChange={onSortChange} defaultValue="popular" />
    ),
  })

  return (
    <div className="sticky top-[4.5rem] z-30 border-b border-line bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        {loadError && (
          <div className="mb-3 flex items-start gap-2 border-b border-line pb-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>تعذّر تحميل الكتالوج من الخادم. تحقق من الاتصال ثم أعد تحميل الصفحة.</span>
          </div>
        )}
        {apiEmpty && !loadError && (
          <p className="mb-3 border-b border-line pb-3 text-sm text-muted-600">
            لا توجد دورات منشورة في الكتالوج حالياً. تُحدَّث القائمة تلقائياً عند إضافة برامج جديدة.
          </p>
        )}

 {/* Search row (only when the page routes search through the bar, e.g. /programs) 
            a form field is functional chrome, kept as a hairline-underlined input. */}
        {onSearchChange !== undefined && (
          <div className="relative mb-2.5">
            <Search className="pointer-events-none absolute end-1 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-400" aria-hidden />
            <input
              type="search"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث بالاسم، المدرب، التصنيف..."
              className="w-full border-0 border-b border-line bg-transparent py-2.5 pe-8 ps-8 text-sm text-deepBlue outline-none transition-colors duration-200 placeholder:text-muted-400 focus:border-brand-400"
              dir="rtl"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute start-1 top-1/2 -translate-y-1/2 text-muted-400 hover:text-muted-600"
                aria-label="مسح البحث"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Single toolbar row text dropdowns seamed by dots; wraps on mobile */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {selects.map(({ key, node }, i) => (
            <Fragment key={key}>
              {i > 0 && <Dot />}
              {node}
            </Fragment>
          ))}

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
                className="whitespace-nowrap text-xs font-bold text-customBlue underline-offset-4 transition-colors duration-200 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
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
