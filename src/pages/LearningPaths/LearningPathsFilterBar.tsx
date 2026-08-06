import { AlertCircle } from 'lucide-react'

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
  { value: 'all', label: 'السعر: الكل' },
  { value: 'free', label: 'مجاني' },
  { value: 'paid', label: 'مدفوع' },
]

const featuredFilters = [
  { value: 'all', label: 'الكل' },
  { value: 'featured', label: 'مميز فقط' },
]

const enrollmentFilters = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'open', label: 'التسجيل مفتوح' },
  { value: 'closed', label: 'التسجيل مغلق' },
]

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
        active ?
          'bg-deepBlue text-white shadow-sm'
        : 'bg-slate-100 text-muted-600 hover:bg-slate-200 hover:text-deepBlue'
      }`}
    >
      {label}
    </button>
  )
}

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
  return (
    <div className="sticky top-[4.5rem] z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {loadError && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>تعذّر تحميل المسارات. تحقق من الاتصال ثم أعد تحميل الصفحة.</span>
          </div>
        )}
        {apiEmpty && !loadError && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted-600">
            لا توجد مسارات منشورة حالياً.
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-500">السعر</span>
            {priceFilters.map((tag) => (
              <Chip
                key={tag.value}
                label={tag.label}
                active={activePrice === tag.value}
                onClick={() => onPriceChange(tag.value)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-500">مميز</span>
            {featuredFilters.map((tag) => (
              <Chip
                key={tag.value}
                label={tag.label}
                active={activeFeatured === tag.value}
                onClick={() => onFeaturedChange(tag.value)}
              />
            ))}
          </div>

          <div className="flex flex-1 flex-wrap items-end justify-end gap-2 md:gap-3">
            <div className="flex min-w-[130px] flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-500">المستوى</span>
              <select
                value={activeLevel}
                onChange={(e) => onLevelChange(e.target.value)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/90 py-2.5 pr-3 pl-8 text-xs font-semibold text-deepBlue outline-none focus:border-brand-400"
              >
                {levelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex min-w-[140px] flex-col gap-1">
              <span className="text-[10px] font-bold text-muted-500">التسجيل</span>
              <select
                value={activeEnrollment}
                onChange={(e) => onEnrollmentChange(e.target.value)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/90 py-2.5 pr-3 pl-8 text-xs font-semibold text-deepBlue outline-none focus:border-brand-400"
              >
                {enrollmentFilters.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <span className="hidden text-xs font-medium whitespace-nowrap text-muted-500 sm:block">
              <span className="font-black text-deepBlue">{String(resultCount)}</span>
              {' من '}
              <span className="font-black text-deepBlue">{String(totalCount)}</span>
              {' مسار'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
