import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notificationsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import type { PlatformNotification } from '@/types/platform'

export default function NotificationsCenterPage() {
  const [items, setItems] = useState<PlatformNotification[]>([])
  const [loading, setLoading] = useState(true)

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

  const unread = useMemo(() => items.filter((n) => !n.read_at).length, [items])

  async function onRead(id: number) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString().slice(0, 10) } : n)))
    await markNotificationRead(id)
  }

  async function onReadAll() {
    const stamp = new Date().toISOString().slice(0, 10)
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? stamp })))
    await markAllNotificationsRead()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Notifications</p>
          <h1 className="text-2xl font-black text-deepBlue">مركز الإشعارات</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">كل أنواع الرسائل التشغيلية في مكان واحد.</p>
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

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="لا إشعارات" description="ستظهر التذكيرات والمعاملات هنا فور وصولها من الخادم." />
      ) : (
        <ul className="space-y-3">
          {items.map((n, idx) => (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-deepBlue">{n.title}</p>
                  {n.body && <p className="mt-2 text-sm leading-7 text-slate-500">{n.body}</p>}
                  <p className="mt-3 text-[11px] font-bold text-slate-400">{n.created_at}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {!n.read_at && (
                    <button
                      type="button"
                      onClick={() => void onRead(n.id)}
                      className="rounded-lg bg-sky-50 px-3 py-1.5 text-[11px] font-black text-customBlue ring-1 ring-sky-100"
                    >
                      تعيين كمقروء
                    </button>
                  )}
                  {n.href && (
                    <Link to={n.href} className="text-[11px] font-black text-deepBlue hover:underline">
                      فتح
                    </Link>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}
