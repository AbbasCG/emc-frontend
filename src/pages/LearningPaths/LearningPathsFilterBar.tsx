import { AlertCircle, Star } from 'lucide-react'

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
  { value: 'all', label: 'الكل' },
  { value: 'free', label: 'مجاني' },
  { value: 'paid', label: 'مدفوع' },
]

const enrollmentFilters = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'open', label: 'التسجيل مفتوح' },
  { value: 'closed', label: 'التسجيل مغلق' },
]

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
    <div className="sticky top-[4.5rem] z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        {loadError && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>تعذّر تحميل المسارات. تحقق من الاتصال ثم أعد تحميل الصفحة.</span>
          </div>
        )}
        {apiEmpty && !loadError && (
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted-600">
            لا توجد مسارات منشورة حالياً.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Price — segmented */}
          <div className="flex items-center gap-0.5 rounded-xl bg-slate-100 p-1" role="group" aria-label="السعر">
            {priceFilters.map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => onPriceChange(tag.value)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition-colors duration-200 ${
                  activePrice === tag.value ?
                    'bg-white text-deepBlue shadow-sm'
                  : 'text-slate-500 hover:text-deepBlue'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Featured — single toggle */}
          <button
            type="button"
            aria-pressed={featuredOnly}
            onClick={() => onFeaturedChange(featuredOnly ? 'all' : 'featured')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black transition-colors duration-200 ${
              featuredOnly ?
                'bg-deepBlue text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-customBlue/40 hover:text-deepBlue'
            }`}
          >
            <Star className={`h-3 w-3 ${featuredOnly ? 'fill-white' : ''}`} aria-hidden />
            مميز فقط
          </button>

          <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />

          {/* Level */}
          {levelOptions.length > 1 && (
            <select
              value={activeLevel}
              onChange={(e) => onLevelChange(e.target.value)}
              aria-label="المستوى"
              className="cursor-pointer rounded-xl border border-slate-200 bg-white py-2 pe-2 ps-7 text-[11px] font-bold text-deepBlue outline-none transition-colors duration-200 focus:border-brand-400"
            >
              {levelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Enrollment */}
          <select
            value={activeEnrollment}
            onChange={(e) => onEnrollmentChange(e.target.value)}
            aria-label="حالة التسجيل"
            className="cursor-pointer rounded-xl border border-slate-200 bg-white py-2 pe-2 ps-7 text-[11px] font-bold text-deepBlue outline-none transition-colors duration-200 focus:border-brand-400"
          >
            {enrollmentFilters.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Count */}
          <span className="ms-auto hidden whitespace-nowrap text-xs font-medium text-muted-500 sm:block">
            <span dir="ltr" className="font-black tabular-nums text-deepBlue">
              {String(resultCount)}
            </span>
            {' من '}
            <span dir="ltr" className="font-black tabular-nums text-deepBlue">
              {String(totalCount)}
            </span>
            {' مسار'}
          </span>
        </div>
      </div>
    </div>
  )
}
