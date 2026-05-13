import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Briefcase,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  CreditCard,
  Mail,
  Ticket,
  UserPlus,
  Video,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NotificationType, PlatformNotification } from '@/types/platform'

const icons: Record<NotificationType, typeof Bell> = {
  registration: UserPlus,
  payment: CreditCard,
  session_reminder: Video,
  assignment_due: ClipboardList,
  certificate_issued: Ticket,
  task_assigned: ClipboardList,
  meeting_invite: CalendarClock,
  support_reply: Mail,
  partner_update: Briefcase,
}

type Props = {
  open: boolean
  onClose: () => void
  items: PlatformNotification[]
  onMarkRead: (id: number) => void
  onMarkAll: () => void
}

export default function NotificationDrawer({
  open,
  onClose,
  items,
  onMarkRead,
  onMarkAll,
}: Props) {
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
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-100 bg-white shadow-2xl"
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
              <ul className="space-y-2">
                {items.map((n) => {
                  const Icon = icons[n.type] ?? Bell
                  const unread = !n.read_at
                  return (
                    <li key={n.id}>
                      <motion.div layout className="overflow-hidden rounded-xl border border-slate-100 bg-[#F6F8FB] transition hover:bg-white">
                        <button
                          type="button"
                          onClick={() => onMarkRead(n.id)}
                          className="flex w-full gap-3 p-4 text-right"
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
                              {unread && (
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-customOrange ring-2 ring-white" />
                              )}
                            </span>
                            {n.body && (
                              <span className="mt-1 block text-xs font-medium leading-6 text-slate-500">{n.body}</span>
                            )}
                            <span className="mt-2 block text-[11px] font-bold text-slate-400">{n.created_at}</span>
                          </span>
                        </button>
                        {n.href && (
                          <div className="border-t border-slate-100 px-4 py-2">
                            <Link
                              to={n.href}
                              onClick={onClose}
                              className="text-xs font-black text-customBlue hover:underline"
                            >
                              فتح التفاصيل
                            </Link>
                          </div>
                        )}
                      </motion.div>
                    </li>
                  )
                })}
              </ul>
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
