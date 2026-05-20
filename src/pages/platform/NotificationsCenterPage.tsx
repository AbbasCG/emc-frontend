import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SlidersHorizontal, Trash2 } from 'lucide-react'
import {
  deleteNotification,
  fetchNotifications,
  isNotificationUnread,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notificationsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import type { PlatformNotification, NotificationType } from '@/types/platform'
import { normalizeNotificationInternalPath } from '@/utils/notificationRoutes'

type ReadFilter = 'all' | 'unread' | 'read'

const TYPE_LABELS: Partial<Record<NotificationType, string>> & { all: string } = {
  all: 'كل الأنواع',
  registration: 'تسجيل',
  course_registration: 'تسجيل دورة',
  payment: 'دفع',
  session_reminder: 'جلسة',
  assignment_due: 'واجب',
  certificate_issued: 'شهادة',
  task_assigned: 'مهمة',
  meeting_invite: 'اجتماع',
  support_reply: 'دعم',
  partner_update: 'شراكة',
}

export default function NotificationsCenterPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<PlatformNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const list = await fetchNotifications()
      if (!cancelled) {
        setItems(list)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const unread = useMemo(() => items.filter((n) => isNotificationUnread(n)).length, [items])

  const visible = useMemo(() => {
    return items.filter((n) => {
      if (readFilter === 'unread' && !isNotificationUnread(n)) return false
      if (readFilter === 'read' && isNotificationUnread(n)) return false
      if (typeFilter !== 'all' && n.type !== typeFilter) return false
      return true
    })
  }, [items, readFilter, typeFilter])

  const typesInUse = useMemo(() => {
    const s = new Set<NotificationType>()
    for (const n of items) s.add(n.type)
    return [...s].sort()
  }, [items])

  async function onRead(id: number) {
    const stamp = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? stamp } : n)))
    await markNotificationRead(id)
  }

  async function openItem(n: PlatformNotification) {
    if (isNotificationUnread(n)) {
      await onRead(n.id)
    }
    if (n.href) navigate(normalizeNotificationInternalPath(n.href))
  }

  async function onReadAll() {
    const stamp = new Date().toISOString()
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? stamp })))
    await markAllNotificationsRead()
  }

  async function onDelete(id: number) {
    setItems((prev) => prev.filter((n) => n.id !== id))
    await deleteNotification(id)
  }

  return (
    <div className="mx-auto max-w-3xl" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Notifications</p>
          <h1 className="text-2xl font-black text-deepBlue">مركز الإشعارات</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">تصفية حسب النوع والحالة، ومسح محلي بعد الحذف عند نجاح الخادم.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard/settings/notifications"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-deepBlue shadow-sm transition hover:border-customBlue/40"
          >
            <SlidersHorizontal size={16} className="text-customOrange" />
            تفضيلات الإشعارات
          </Link>
          <span className="rounded-xl bg-deepBlue px-4 py-2 text-xs font-black text-white shadow-md">
            غير مقروء: {unread}
          </span>
          <button
            type="button"
            onClick={() => void onReadAll()}
            className="rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white shadow-md transition hover:opacity-95"
          >
            تعيين الكل كمقروء
          </button>
        </div>
      </motion.div>

      {!loading && items.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <label className="flex flex-col text-[10px] font-black uppercase text-slate-500">
            القراءة
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
              className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-deepBlue"
            >
              <option value="all">الكل</option>
              <option value="unread">غير مقروء</option>
              <option value="read">مقروء</option>
            </select>
          </label>
          <label className="flex flex-col text-[10px] font-black uppercase text-slate-500">
            النوع
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as NotificationType | 'all')}
              className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-deepBlue"
            >
              <option value="all">{TYPE_LABELS.all}</option>
              {typesInUse.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="لا إشعارات" description="ستظهر التذكيرات والمعاملات هنا فور وصولها من الخادم." />
      ) : visible.length === 0 ? (
        <EmptyState title="لا نتائج للفلتر الحالي" description="غيّر نوع الإشعار أو حالة القراءة." />
      ) : (
        <ul className="space-y-3">
          {visible.map((n, idx) => {
            const unread = isNotificationUnread(n)
            return (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={[
                'rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md',
                unread ? 'border-customBlue/25 ring-1 ring-sky-100/80' : 'border-slate-100',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void openItem(n)}
                  className="min-w-0 flex-1 text-right transition hover:opacity-95"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-deepBlue">{n.title}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                    {unread ?
                      <span className="rounded-full bg-customOrange/15 px-2 py-0.5 text-[10px] font-black text-customOrange">غير مقروء</span>
                    : null}
                  </div>
                  {n.body && <p className="mt-2 text-sm leading-7 text-slate-500">{n.body}</p>}
                  <p className="mt-3 text-[11px] font-bold text-slate-400">{n.created_at}</p>
                  {n.href ?
                    <p className="mt-2 text-[11px] font-black text-customBlue">انقر لفتح الصفحة المرتبطة</p>
                  : null}
                </button>
                <div className="flex flex-col gap-2">
                  {unread && (
                    <button
                      type="button"
                      onClick={() => void onRead(n.id)}
                      className="rounded-lg bg-sky-50 px-3 py-1.5 text-[11px] font-black text-customBlue ring-1 ring-sky-100"
                    >
                      تعيين كمقروء
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void onDelete(n.id)
                    }}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-800"
                  >
                    <Trash2 size={14} aria-hidden />
                    حذف
                  </button>
                </div>
              </div>
            </motion.li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
