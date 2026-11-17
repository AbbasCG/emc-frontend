import type { ComponentType } from 'react'
import {
  Award,
  CheckCircle2,
  CircleDot,
  FileText,
  Gift,
  History,
  MinusCircle,
  PlusCircle,
  Shield,
  Star,
  UserPlus,
  UserRound,
} from 'lucide-react'
import type { VolunteerActivityItem } from '@/api/volunteersHubApi'
import { formatDateTime } from '@/utils/dateTime'

/** The operational status of a volunteer as a pill (shared by the drawer header and the timeline). */
export function VolunteerStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700">نشط</span>
    case 'inactive':
      return <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-700">منقطع</span>
    case 'on_leave':
      return <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-800">في إجازة</span>
    case 'withdrawn':
      return <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-black text-rose-700">انسحب</span>
    default:
      return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-600">{status}</span>
  }
}

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>

/** Icon, tint and a fallback Arabic title for each kind of event; a kind this build does not know gets the generic dot. */
const TYPE_STYLE: Record<string, { icon: IconType; tone: string; title: string }> = {
  request_submitted: { icon: FileText, tone: 'bg-sky-50 text-sky-700 ring-sky-200', title: 'تقديم طلب التطوع' },
  request_accepted: { icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', title: 'قبول طلب التطوع' },
  converted_to_member: { icon: UserPlus, tone: 'bg-teal-50 text-teal-700 ring-teal-200', title: 'التحويل إلى عضو' },
  profile_created: { icon: UserRound, tone: 'bg-indigo-50 text-indigo-700 ring-indigo-200', title: 'إنشاء الملف التعريفي' },
  status_change: { icon: History, tone: 'bg-amber-50 text-amber-700 ring-amber-200', title: 'تغيير الحالة' },
  points_awarded: { icon: PlusCircle, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', title: 'منح نقاط' },
  points_deducted: { icon: MinusCircle, tone: 'bg-rose-50 text-rose-700 ring-rose-200', title: 'خصم نقاط' },
  points_redeemed: { icon: Gift, tone: 'bg-violet-50 text-violet-700 ring-violet-200', title: 'استبدال نقاط' },
  weekly_rating: { icon: Star, tone: 'bg-amber-50 text-amber-700 ring-amber-200', title: 'تقييم أسبوعي' },
}
const GENERIC_STYLE = { icon: CircleDot as IconType, tone: 'bg-slate-100 text-slate-600 ring-slate-200', title: 'نشاط' }

const metaString = (meta: Record<string, unknown>, key: string): string | null => {
  const v = meta[key]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}
const metaNumber = (meta: Record<string, unknown>, key: string): number | null => {
  const v = Number(meta[key])
  return meta[key] != null && meta[key] !== '' && Number.isFinite(v) ? v : null
}

/** The extra figure of an event (points, score), when the server sent one. */
function figure(item: VolunteerActivityItem): string | null {
  const points = metaNumber(item.meta, 'points')
  if (points != null && item.type.startsWith('points_')) return `${Math.abs(points)} نقطة`
  const score = metaNumber(item.meta, 'avg_score')
  if (score != null && item.type === 'weekly_rating') return `${score} / 10`

  return null
}

function StatusChange({ item }: { item: VolunteerActivityItem }) {
  const oldStatus = metaString(item.meta, 'old_status')
  const newStatus = metaString(item.meta, 'new_status')
  const reason = metaString(item.meta, 'reason') ?? item.description

  return (
    <>
      {(oldStatus || newStatus) && (
        <div className="flex items-center gap-2">
          {oldStatus && <VolunteerStatusBadge status={oldStatus} />}
          {oldStatus && newStatus && <span className="text-slate-400" aria-hidden="true">←</span>}
          {newStatus && <VolunteerStatusBadge status={newStatus} />}
        </div>
      )}
      {reason && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
          <span className="mb-1 block font-black text-slate-900">السبب المسجل:</span>
          <span className="whitespace-pre-line">{reason}</span>
        </div>
      )}
    </>
  )
}

/**
 * The unified activity timeline of one volunteer (request, acceptance, conversion, status changes, points, ratings),
 * newest first. Every event shows an icon, an Arabic title, its description, who did it and when. The caller owns
 * loading, errors and the empty state.
 */
export default function VolunteerActivityTimeline({ items }: { items: VolunteerActivityItem[] }) {
  return (
    <ol className="relative ms-3 space-y-5 border-s-2 border-slate-200" aria-label="سجل نشاط المتطوع">
      {items.map((item) => {
        const style = TYPE_STYLE[item.type] ?? GENERIC_STYLE
        const Icon = style.icon
        const title = item.title || style.title
        // The browser's own time zone, like every other date in the drawer (the server's date_formatted is UTC).
        const when = item.occurred_at ? formatDateTime(item.occurred_at) : (item.date_formatted ?? null)
        const extra = figure(item)

        return (
          <li key={`${item.type}-${item.id}`} className="relative ps-6" data-activity-type={item.type}>
            <span className={`absolute -start-4 top-1 grid h-7 w-7 place-items-center rounded-full ring-4 ring-white ${style.tone}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h5 className="text-xs font-black text-slate-900" dir="auto">{title}</h5>
                <div className="flex items-center gap-2">
                  {item.meta.match === 'email' && (
                    <span
                      className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-800 ring-1 ring-amber-200"
                      title="رُبط هذا الحدث عبر البريد الإلكتروني فقط"
                    >
                      مطابقة بالبريد
                    </span>
                  )}
                  {extra && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
                      {item.type === 'weekly_rating' ? <Star className="h-3 w-3" aria-hidden="true" /> : <Award className="h-3 w-3" aria-hidden="true" />}
                      {extra}
                    </span>
                  )}
                  {when && <span className="font-mono text-[11px] text-slate-400">{when}</span>}
                </div>
              </div>

              {item.type === 'status_change' ? (
                <StatusChange item={item} />
              ) : (
                item.description && <p className="whitespace-pre-line text-xs leading-6 text-slate-600" dir="auto">{item.description}</p>
              )}

              {item.actor_name && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Shield className="h-3 w-3 text-customBlue" aria-hidden="true" />
                  <span>
                    بواسطة: <strong><bdi>{item.actor_name}</bdi></strong>
                  </span>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
