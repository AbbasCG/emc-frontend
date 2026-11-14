import { cn } from '@/lib/utils'
import { fmtInt } from './format'
import { EmptyNote } from './ui'

/** ISO weekday index 0 = Monday, as the API sends it. */
const WEEKDAYS_AR = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'] as const

const HOURS = Array.from({ length: 24 }, (_, h) => h)

/** Five intensity steps of one hue; zero stays an empty neutral cell. */
function level(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0
  return Math.min(5, Math.max(1, Math.ceil((value / max) * 5)))
}

const LEVEL_CLASS = ['bg-slate-100', 'bg-customBlue/10', 'bg-customBlue/25', 'bg-customBlue/45', 'bg-customBlue/70', 'bg-customBlue'] as const

/**
 * Login events by weekday and hour (reporting zone). Drawn as a grid, not a chart: every cell is real data, labelled for
 * screen readers, and the figures are readable without colour.
 */
export function LoginHeatmap({ matrix, timezone }: { matrix: number[][]; timezone: string }) {
  const max = Math.max(0, ...matrix.flat())
  if (max === 0) return <EmptyNote>لا توجد تسجيلات دخول في هذه الفترة</EmptyNote>

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-1 text-xs" aria-label={`تسجيلات الدخول حسب اليوم والساعة، بتوقيت ${timezone}`}>
          <colgroup>
            <col className="w-20" />
            {HOURS.map((h) => (
              <col key={h} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">اليوم</span>
              </th>
              {/* a label every third hour, spanning its three columns so all cells stay the same width */}
              {HOURS.filter((h) => h % 3 === 0).map((h) => (
                <th key={h} scope="colgroup" colSpan={3} className="text-start font-normal tabular-nums text-slate-500" dir="ltr">
                  {String(h).padStart(2, '0')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS_AR.map((day, w) => (
              <tr key={day}>
                <th scope="row" className="whitespace-nowrap pe-2 text-start font-normal text-slate-600">
                  {day}
                </th>
                {HOURS.map((h) => {
                  const v = matrix[w]?.[h] ?? 0
                  return (
                    <td
                      key={h}
                      title={`${day} ${String(h).padStart(2, '0')}:00 — ${fmtInt(v)}`}
                      aria-label={`${day} الساعة ${h}: ${fmtInt(v)} تسجيل دخول`}
                      className={cn('h-6 rounded-md', LEVEL_CLASS[level(v, max)])}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <span>أقل</span>
        {LEVEL_CLASS.slice(1).map((c) => (
          <span key={c} aria-hidden="true" className={cn('h-3 w-5 rounded', c)} />
        ))}
        <span>أكثر</span>
        <span className="ms-auto tabular-nums">الأعلى: {fmtInt(max)} في ساعة واحدة</span>
      </p>
    </div>
  )
}
