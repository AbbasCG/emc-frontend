import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  HeartHandshake,
  Mail,
  Ticket,
  UserCheck,
  UserPlus,
  Video,
  X,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { NotificationType, PlatformNotification } from '@/types/platform'
import { isNotificationUnread } from '@/api/notificationsApi'
import { normalizeNotificationInternalPath } from '@/utils/notificationRoutes'
import { formatNotificationDate } from '@/utils/dateTime'

const icons: Record<NotificationType, typeof Bell> = {
  registration:       UserPlus,
  course_registration: UserPlus,
  payment:            CreditCard,
  session_reminder:   Video,
  assignment_due:     ClipboardList,
  certificate_issued: Ticket,
  task_assigned:      ClipboardList,
  meeting_invite:     CalendarClock,
  support_reply:      Mail,
  partner_update:     Briefcase,
  volunteer_request:  HeartHandshake,
  course_update:      BookOpen,
  instructor_assigned: UserCheck,
  schedule_update:    CalendarClock,
  placement_result:          ClipboardCheck,
  placement_test_completed:  ClipboardCheck,
  oral_assessment_booked:    CalendarClock,
  assignment_graded:         ClipboardCheck,
  assignment_submitted:      ClipboardList,
  assignment_created:        ClipboardList,
  session_scheduled:         Video,
  attendance_marked:         UserCheck,
}

type Props = {
  open: boolean
  onClose: () => void
  items: PlatformNotification[]
  onMarkRead: (id: number) => void
  onMarkAll: () => void
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function bucketFor(iso: string): 'today' | 'yesterday' | 'older' {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'older'
  const t0 = startOfLocalDay(new Date())
  const t1 = startOfLocalDay(new Date(Date.now() - 86400000))
  const td = startOfLocalDay(d)
  if (td === t0) return 'today'
  if (td === t1) return 'yesterday'
  return 'older'
}

const BUCKET_ORDER = [
  { key: 'today' as const, label: 'اليوم' },
  { key: 'yesterday' as const, label: 'أمس' },
  { key: 'older' as const, label: 'سابق' },
]

export default function NotificationDrawer({
  open,
  onClose,
  items,
  onMarkRead,
  onMarkAll,
}: Props) {
  const navigate = useNavigate()

  const grouped = useMemo(() => {
    const map = new Map<'today' | 'yesterday' | 'older', PlatformNotification[]>()
    for (const n of items) {
      const b = bucketFor(n.created_at)
      map.set(b, [...(map.get(b) ?? []), n])
    }
    return BUCKET_ORDER.filter((x) => (map.get(x.key)?.length ?? 0) > 0).map((x) => ({
      label: x.label,
      key: x.key,
      items: map.get(x.key) ?? [],
    }))
  }, [items])

  function activate(n: PlatformNotification) {
    onMarkRead(n.id)
    if (n.href) {
      navigate(normalizeNotificationInternalPath(n.href))
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-modal-overlay bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="fixed inset-y-0 right-0 z-modal-content flex w-full max-w-md flex-col border-l border-slate-100 bg-white shadow-2xl"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">مركز الإشعارات</p>
                <p className="text-lg font-black text-deepBlue">آخر التحديثات</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onMarkAll}
                  className="rounded-lg px-3 py-1.5 text-xs font-black text-customBlue transition hover:bg-sky-50"
                >
                  <CheckCheck size={16} className="inline-block opacity-80" /> تعيين الكل كمقروء
                </button>
                <button
                  type="button"
                  aria-label="إغلاق اللوحة"
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {items.length === 0 ?
                <p className="px-2 py-8 text-center text-sm font-bold text-slate-500">لا إشعارات حالياً</p>
              : <ul className="space-y-6">
                  {grouped.map((section) => (
                    <li key={section.key}>
                      <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-wide text-slate-400">{section.label}</p>
                      <ul className="space-y-2">
                        {section.items.map((n) => {
                          const Icon = icons[n.type] ?? Bell
                          const unread = isNotificationUnread(n)
                          return (
                            <li key={n.id}>
                              <motion.div
                                layout
                                className={[
                                  'overflow-hidden rounded-xl border transition',
                                  unread ?
                                    'border-customBlue/25 bg-gradient-to-l from-sky-50/90 to-white shadow-[0_0_0_1px_rgba(0, 119, 182,0.12)]'
                                  : 'border-slate-100 bg-[#F6F8FB] hover:border-slate-200 hover:bg-white',
                                ].join(' ')}
                              >
                                <button
                                  type="button"
                                  onClick={() => activate(n)}
                                  className="flex w-full gap-3 p-4 text-right transition hover:bg-white/80"
                                >
                                  <span
                                    className={[
                                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                                      unread
                                        ? 'bg-customBlue text-white ring-customBlue/40'
                                        : 'bg-white text-slate-400 ring-slate-100',
                                    ].join(' ')}
                                  >
                                    <Icon size={18} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-start justify-between gap-2">
                                      <span className="text-sm font-black text-deepBlue">{n.title}</span>
                                      {unread ?
                                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-customOrange shadow-[0_0_0_3px_rgba(255,255,255,0.9)]" />
                                      : null}
                                    </span>
                                    {n.body ?
                                      <span className="mt-1 block text-xs font-medium leading-6 text-slate-500">{n.body}</span>
                                    : null}
                                    <span className="mt-2 block text-[11px] font-bold text-slate-400">{formatNotificationDate(n.created_at)}</span>
                                  </span>
                                </button>
                              </motion.div>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              }
            </div>
            <div className="border-t border-slate-100 p-4">
              <Link
                to="/dashboard/notifications"
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-xl bg-deepBlue py-3 text-sm font-black text-white shadow-lg transition hover:bg-deepBlue/90"
              >
                عرض كل الإشعارات
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
