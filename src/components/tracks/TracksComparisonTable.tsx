import { Link } from 'react-router'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { PROFESSIONAL_TRACKS } from '@/data/officialTracks'

/**
 * EMC-WEB-001 §6.1 — the tracks comparison, seated ABOVE the catalogue list.
 *
 * Renders the OFFICIAL five professional tracks from `src/data/officialTracks`
 * — the same approved catalogue the home «مسارات التعلّم والشهادات المعتمدة»
 * section shows — so the comparison can never disagree with the rest of the
 * site. Columns answer what a visitor asks before choosing: ماذا ستتعلم ·
 * المدة · السعر · الشهادة المعتمدة.
 *
 * Design Language 2.0: hairline rows and typography, no card, no shadow. The
 * real <table> is desktop-only and wrapped in `overflow-x-auto`; below `md` the
 * same data becomes a stacked definition list so the page never scrolls
 * sideways on a 380px screen.
 */

const COLUMNS = [
  { key: 'focus', label: 'ماذا ستتعلم' },
  { key: 'duration', label: 'المدة' },
  { key: 'price', label: 'السعر الكامل' },
  { key: 'certificate', label: 'الشهادة المعتمدة' },
] as const

export default function TracksComparisonTable() {
  return (
    <section aria-labelledby="tracks-comparison-title" className="bg-paper">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <h2
          id="tracks-comparison-title"
          className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue sm:text-3xl"
        >
          قارن المسارات
        </h2>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-400">
          المسارات المهنية الخمسة من كتالوج EMC المعتمد: ماذا ستتعلم في كل مسار، كم يستغرق، بكم،
          وما الشهادة المعتمدة التي تخرج بها.
        </p>

        {/* Desktop a real table on hairlines, scrollable inside its own container */}
        <div className="mt-9 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[46rem] border-collapse">
            <caption className="sr-only">
              مقارنة المسارات المهنية الخمسة حسب المحتوى والمدة والسعر والشهادة المعتمدة
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th
                  scope="col"
                  className="w-[26%] py-3 pe-5 text-start text-[11px] font-black tracking-[0.14em] text-ink-500"
                >
                  المسار
                </th>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="py-3 pe-5 text-start text-[11px] font-black tracking-[0.14em] text-ink-500 last:pe-0"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROFESSIONAL_TRACKS.map((track) => {
                const Icon = track.icon
                return (
                  <tr key={track.id} className="border-b border-line align-top">
                    <th scope="row" className="py-5 pe-5 text-start">
                      <span className="flex items-start gap-2.5">
                        <Icon size={17} className="mt-1 shrink-0 text-customBlue" aria-hidden />
                        <span>
                          <span className="block font-display text-base font-black leading-snug text-deepBlue">
                            {track.title}
                          </span>
                          <span className="font-latin mt-0.5 block text-[11px] font-bold text-ink-400">
                            {track.titleEn}
                          </span>
                        </span>
                      </span>
                    </th>
                    <td className="py-5 pe-5 text-sm leading-7 text-ink-500">{track.focus}</td>
                    <td className="py-5 pe-5 text-sm font-black leading-7 tabular-nums text-ink-600">
                      {track.duration}
                    </td>
                    <td className="py-5 pe-5">
                      <span dir="ltr" className="emc-stat-num text-xl text-deepBlue">{'€'}{track.price}</span>
                    </td>
                    <td className="font-latin py-5 text-[13px] font-bold leading-7 text-ink-500">
                      {track.certificate}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile the same data as a stacked definition list (no sideways scroll) */}
        <div className="mt-8 md:hidden">
          {PROFESSIONAL_TRACKS.map((track) => (
            <div key={track.id} className="border-b border-line py-6 first:border-t first:border-line">
              <p className="font-display text-lg font-black leading-snug text-deepBlue">{track.title}</p>
              <p className="font-latin mt-0.5 text-[11px] font-bold text-ink-400">{track.titleEn}</p>
              <dl className="mt-4 space-y-2.5">
                <div className="flex items-baseline gap-4">
                  <dt className="w-28 shrink-0 text-[11px] font-black tracking-[0.12em] text-ink-400">
                    ماذا ستتعلم
                  </dt>
                  <dd className="min-w-0 flex-1 text-sm leading-7 text-ink-500">{track.focus}</dd>
                </div>
                <div className="flex items-baseline gap-4">
                  <dt className="w-28 shrink-0 text-[11px] font-black tracking-[0.12em] text-ink-400">
                    المدة
                  </dt>
                  <dd className="min-w-0 flex-1 text-sm font-black leading-7 tabular-nums text-ink-600">
                    {track.duration}
                  </dd>
                </div>
                <div className="flex items-baseline gap-4">
                  <dt className="w-28 shrink-0 text-[11px] font-black tracking-[0.12em] text-ink-400">
                    السعر الكامل
                  </dt>
                  <dd dir="ltr" className="emc-stat-num min-w-0 flex-1 text-lg text-deepBlue">
                    {'€'}{track.price}
                  </dd>
                </div>
                <div className="flex items-baseline gap-4">
                  <dt className="w-28 shrink-0 text-[11px] font-black tracking-[0.12em] text-ink-400">
                    الشهادة
                  </dt>
                  <dd className="font-latin min-w-0 flex-1 text-[13px] font-bold leading-7 text-ink-500">
                    {track.certificate}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        <Link to="/courses" className="emc-cta-line mt-8 inline-flex text-sm">
          استكشف برامج المسارات في الكتالوج
          <ArrowLeftIcon size={15} />
        </Link>
      </div>
    </section>
  )
}
