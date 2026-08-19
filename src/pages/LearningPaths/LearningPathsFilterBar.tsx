import { AlertCircle, ChevronDown, Star } from 'lucide-react'
import { toLatinDigits } from '@/utils/publicDetailFormat'

type SelectOption = { value: string; label: string }

type Props = {
  activeLevel: string
  onLevelChange: (v: string) => void
  levelOptions: SelectOption[]
  activePrice: string
  onPriceChange: (v: string) => void
  activeFeatured: string
  onFeaturedChange: (v: string) => void
  activeEnrollment: string
  onEnrollmentChange: (v: string) => void
  resultCount: number
  totalCount: number
  loadError: boolean
  apiEmpty: boolean
}

const priceFilters = [
  { value: 'all', label: 'كل الأسعار' },
  { value: 'free', label: 'مجاني' },
  { value: 'paid', label: 'مدفوع' },
]

const enrollmentFilters = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'open', label: 'تسجيل مفتوح' },
  { value: 'closed', label: 'التسجيل مغلق' },
]

/** Text dropdown — a bare select styled as typography, no boxed control. */
function TextSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  ariaLabel: string
}) {
  return (
    <span className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="cursor-pointer appearance-none bg-transparent py-2 pe-5 text-xs font-black text-deepBlue outline-none transition-colors duration-200 hover:text-customBlue focus-visible:text-customBlue"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute end-0 h-3.5 w-3.5 text-muted-400" aria-hidden />
    </span>
  )
}

/**
 * §6.1 — one quiet hairline toolbar. The spec asks for no complex filtering to
 * distract from the choice, so this stays a single typographic line seated on a
 * hairline: text dropdowns separated by thin seams, the count as plain text.
 *
 * Identity law §1: no shadow, no orange (orange is reserved for the primary
 * action), and every digit rendered through `toLatinDigits`.
 */
export default function LearningPathsFilterBar({
  activeLevel,
  onLevelChange,
  levelOptions,
  activePrice,
  onPriceChange,
  activeFeatured,
  onFeaturedChange,
  activeEnrollment,
  onEnrollmentChange,
  resultCount,
  totalCount,
  loadError,
  apiEmpty,
}: Props) {
  const featuredOnly = activeFeatured === 'featured'

  return (
    <div className="sticky top-[4.5rem] z-30 border-b border-line bg-paper/90 backdrop-blur-md supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 lg:px-8">
        {loadError && (
          <p className="mb-2 flex items-start gap-2 text-sm font-bold text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>تعذّر تحميل المسارات. تحقق من الاتصال ثم أعد تحميل الصفحة.</span>
          </p>
        )}
        {apiEmpty && !loadError && (
          <p className="mb-2 text-sm font-semibold text-muted-500">لا توجد مسارات منشورة حالياً.</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <TextSelect value={activePrice} onChange={onPriceChange} options={priceFilters} ariaLabel="السعر" />

          <span className="h-4 w-px bg-line" aria-hidden />

          {/* Featured — text toggle. Active state in the sea family: orange is the
              primary action's colour only. */}
          <button
            type="button"
            aria-pressed={featuredOnly}
            onClick={() => onFeaturedChange(featuredOnly ? 'all' : 'featured')}
            className={`inline-flex items-center gap-1.5 py-2 text-xs font-black transition-colors duration-200 ${
              featuredOnly ? 'text-customBlue' : 'text-muted-500 hover:text-deepBlue'
            }`}
          >
            <Star className={`h-3 w-3 ${featuredOnly ? 'fill-current' : ''}`} aria-hidden />
            مميز فقط
          </button>

          <span className="h-4 w-px bg-line" aria-hidden />

          {levelOptions.length > 1 && (
            <>
              <TextSelect value={activeLevel} onChange={onLevelChange} options={levelOptions} ariaLabel="المستوى" />
              <span className="h-4 w-px bg-line" aria-hidden />
            </>
          )}

          <TextSelect
            value={activeEnrollment}
            onChange={onEnrollmentChange}
            options={enrollmentFilters}
            ariaLabel="حالة التسجيل"
          />

          {/* Count — plain text */}
          <span className="ms-auto hidden whitespace-nowrap text-xs font-medium text-muted-500 sm:block">
            <span dir="ltr" className="font-black tabular-nums text-deepBlue">
              {toLatinDigits(resultCount)}
            </span>
            {' من '}
            <span dir="ltr" className="font-black tabular-nums text-deepBlue">
              {toLatinDigits(totalCount)}
            </span>
            {' مسار'}
          </span>
        </div>
      </div>
    </div>
  )
}
