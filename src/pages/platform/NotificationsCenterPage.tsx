import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Archive, ArchiveRestore, CheckSquare, Pin, PinOff, RefreshCw, Search, SlidersHorizontal, Square, Trash2, X } from 'lucide-react'
import {
  archiveNotification,
  bulkUpdateNotifications,
  deleteNotification,
  fetchNotificationsPage,
  isNotificationUnread,
  markNotificationRead,
  pinNotification,
  unarchiveNotification,
  unpinNotification,
  type BulkNotificationAction,
  type NotificationArchivedFilter,
} from '@/api/notificationsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import type { PlatformNotification } from '@/types/platform'
import { normalizeNotificationInternalPath } from '@/utils/notificationRoutes'
import { formatNotificationDate } from '@/utils/dateTime'
import NotificationDetailModal from '@/components/platform/NotificationDetailModal'
import toast from '@/lib/toast'

const SEARCH_DEBOUNCE_MS = 400

export default function NotificationsCenterPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<PlatformNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [mutating, setMutating] = useState(false)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [archivedFilter, setArchivedFilter] = useState<NotificationArchivedFilter>('0')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [page, setPage] = useState(1)

  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: 30 })
  const [unreadCount, setUnreadCount] = useState(0)

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [detail, setDetail] = useState<PlatformNotification | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search: only the committed `search` value triggers a fetch.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

  const load = useCallback((targetPage: number = page) => {
    setLoading(true)
    setError(false)
    fetchNotificationsPage({ search: search || undefined, archived: archivedFilter, unread_only: unreadOnly, pinned_only: pinnedOnly, page: targetPage })
      .then((res) => {
        setItems(res.data)
        setMeta(res.meta)
        setUnreadCount(res.unread_count)
        setSelected(new Set())
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, archivedFilter, unreadOnly, pinnedOnly])

  useEffect(() => { load(page) }, [search, archivedFilter, unreadOnly, pinnedOnly, page]) // eslint-disable-line react-hooks/exhaustive-deps

  function resetToPageOne() {
    setPage(1)
  }

  function clearAllFilters() {
    setSearchInput('')
    setSearch('')
    setArchivedFilter('0')
    setUnreadOnly(false)
    setPinnedOnly(false)
    setPage(1)
  }

  const hasActiveFilters = search !== '' || archivedFilter !== '0' || unreadOnly || pinnedOnly

  /** After a mutation that can shrink the current page (archive/delete), refetch — falling back one page if the current page becomes empty. */
  function refetchAfterMutation(removedCount: number) {
    const remainingOnPage = items.length - removedCount
    if (remainingOnPage <= 0 && page > 1) {
      setPage((p) => p - 1)
    } else {
      load(page)
    }
  }

  async function onRead(id: number) {
    const stamp = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? stamp } : n)))
    await markNotificationRead(id)
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  async function openItem(n: PlatformNotification) {
    if (isNotificationUnread(n)) await onRead(n.id)
    if (n.meta_url) { setDetail(n); return }
    if (n.href) navigate(normalizeNotificationInternalPath(n.href))
  }

  async function onTogglePin(n: PlatformNotification, e: React.MouseEvent) {
    e.stopPropagation()
    setMutating(true)
    try {
      if (n.pinned) await unpinNotification(n.id)
      else await pinNotification(n.id)
      load(page)
    } catch {
      toast.error('تعذّر تحديث حالة التثبيت.')
    } finally {
      setMutating(false)
    }
  }

  async function onToggleArchive(n: PlatformNotification, e: React.MouseEvent) {
    e.stopPropagation()
    setMutating(true)
    try {
      if (n.archived_at) await unarchiveNotification(n.id)
      else await archiveNotification(n.id)
      refetchAfterMutation(1)
      toast.success(n.archived_at ? 'تمت الاستعادة.' : 'تمت الأرشفة.')
    } catch {
      toast.error('تعذّر تحديث حالة الأرشفة.')
    } finally {
      setMutating(false)
    }
  }

  async function onDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm('هل أنت متأكد من حذف هذا الإشعار؟')) return
    setMutating(true)
    try {
      await deleteNotification(id)
      refetchAfterMutation(1)
    } catch {
      toast.error('تعذّر حذف الإشعار.')
    } finally {
      setMutating(false)
    }
  }

  // ── Selection ──────────────────────────────────────────────────────────
  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    setSelected(new Set(items.map((n) => n.id)))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function onBulkAction(action: BulkNotificationAction) {
    if (selected.size === 0) return
    if (action === 'delete' && !window.confirm(`هل أنت متأكد من حذف ${selected.size} إشعار؟`)) return

    setMutating(true)
    try {
      const ids = Array.from(selected)
      const affected = await bulkUpdateNotifications(ids, action)
      toast.success(`تم تحديث ${affected} إشعار.`)
      const removed = action === 'delete' || action === 'archive' ? ids.length : 0
      setSelected(new Set())
      refetchAfterMutation(removed)
    } catch {
      toast.error('تعذّر تنفيذ الإجراء الجماعي.')
    } finally {
      setMutating(false)
    }
  }

  const allVisibleSelected = items.length > 0 && items.every((n) => selected.has(n.id))

  return (
    <div className="mx-auto max-w-4xl" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Notifications</p>
          <h1 className="text-2xl font-black text-deepBlue">مركز الإشعارات</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard/settings/notifications"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-deepBlue shadow-sm transition hover:border-customBlue/40"
          >
            <SlidersHorizontal size={16} className="text-customOrange" />
            تفضيلات الإشعارات
          </Link>
          <span className="rounded-xl bg-deepBlue px-4 py-2 text-xs font-black text-white shadow-md">غير مقروء: {unreadCount}</span>
        </div>
      </motion.div>

      {/* Filter/search toolbar */}
      <div className="mb-4 space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ابحث في العنوان أو النص..."
            aria-label="بحث في الإشعارات"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm font-bold text-deepBlue outline-none focus:border-customBlue/40"
          />
          {searchInput && (
            <button
              type="button"
              aria-label="مسح البحث"
              onClick={() => setSearchInput('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 p-0.5">
            {(['0', '1', 'all'] as NotificationArchivedFilter[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { setArchivedFilter(v); resetToPageOne() }}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition ${
                  archivedFilter === v ? 'bg-deepBlue text-white' : 'text-deepBlue/60 hover:bg-slate-50'
                }`}
              >
                {v === '0' ? 'النشطة' : v === '1' ? 'المؤرشفة' : 'الكل'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => { setUnreadOnly((v) => !v); resetToPageOne() }}
            className={`rounded-xl border px-3 py-1.5 text-[11px] font-black transition ${
              unreadOnly ? 'border-customOrange bg-customOrange/10 text-customOrange' : 'border-slate-200 text-deepBlue/60'
            }`}
          >
            غير مقروء فقط
          </button>

          <button
            type="button"
            onClick={() => { setPinnedOnly((v) => !v); resetToPageOne() }}
            className={`rounded-xl border px-3 py-1.5 text-[11px] font-black transition ${
              pinnedOnly ? 'border-customBlue bg-customBlue/10 text-customBlue' : 'border-slate-200 text-deepBlue/60'
            }`}
          >
            المثبتة فقط
          </button>

          {hasActiveFilters && (
            <button type="button" onClick={clearAllFilters} className="mr-auto inline-flex items-center gap-1 text-[11px] font-black text-deepBlue/40 hover:text-deepBlue/70">
              <X className="h-3.5 w-3.5" /> مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Bulk-action toolbar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-customBlue/20 bg-customBlue/5 p-3">
          <span className="text-[12px] font-black text-deepBlue">{selected.size} محدد</span>
          <button type="button" disabled={mutating} onClick={() => void onBulkAction('read')} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-deepBlue shadow-sm disabled:opacity-50">تعيين كمقروء</button>
          <button type="button" disabled={mutating} onClick={() => void onBulkAction('unread')} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-deepBlue shadow-sm disabled:opacity-50">تعيين كغير مقروء</button>
          <button type="button" disabled={mutating} onClick={() => void onBulkAction('pin')} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-deepBlue shadow-sm disabled:opacity-50">تثبيت</button>
          <button type="button" disabled={mutating} onClick={() => void onBulkAction('unpin')} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-deepBlue shadow-sm disabled:opacity-50">إلغاء التثبيت</button>
          <button type="button" disabled={mutating} onClick={() => void onBulkAction('archive')} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-deepBlue shadow-sm disabled:opacity-50">أرشفة</button>
          <button type="button" disabled={mutating} onClick={() => void onBulkAction('unarchive')} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-deepBlue shadow-sm disabled:opacity-50">استعادة</button>
          <button type="button" disabled={mutating} onClick={() => void onBulkAction('delete')} className="rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 shadow-sm disabled:opacity-50">حذف</button>
          <button type="button" onClick={clearSelection} className="mr-auto text-[11px] font-black text-deepBlue/40 hover:text-deepBlue/70">إلغاء التحديد</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 py-14 text-center">
          <p className="text-[13px] font-semibold text-red-500">تعذّر تحميل الإشعارات</p>
          <button type="button" onClick={() => load(page)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-deepBlue px-4 py-2 text-[11px] font-black text-white">
            <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
          </button>
        </div>
      ) : items.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState title="لا نتائج للفلتر الحالي" description="جرّب تغيير كلمة البحث أو الفلاتر المطبّقة." />
        ) : (
          <EmptyState title="لا إشعارات" description="ستظهر التذكيرات والمعاملات هنا فور وصولها من الخادم." />
        )
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2 px-1">
            <button type="button" onClick={allVisibleSelected ? clearSelection : selectAllVisible} className="inline-flex items-center gap-1.5 text-[11px] font-black text-deepBlue/50 hover:text-deepBlue">
              {allVisibleSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              تحديد الكل في هذه الصفحة
            </button>
          </div>

          <ul className="space-y-3">
            {items.map((n, idx) => {
              const unread = isNotificationUnread(n)
              const isArchived = !!n.archived_at
              const isSelected = selected.has(n.id)
              return (
                <motion.li
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={[
                    'rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5',
                    unread ? 'border-customBlue/25 ring-1 ring-sky-100/80' : 'border-slate-100',
                    isSelected ? 'ring-2 ring-customBlue/40' : '',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <button
                      type="button"
                      aria-label={isSelected ? 'إلغاء التحديد' : 'تحديد'}
                      onClick={(e) => { e.stopPropagation(); toggleSelect(n.id) }}
                      className="mt-0.5 shrink-0 text-deepBlue/30 hover:text-deepBlue/60"
                    >
                      {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>

                    <button type="button" onClick={() => void openItem(n)} className="min-w-0 flex-1 text-right transition hover:opacity-95">
                      <div className="flex flex-wrap items-center gap-2">
                        {n.pinned && <Pin className="h-3.5 w-3.5 text-customBlue" aria-label="مثبت" />}
                        <p className="text-sm font-black text-deepBlue">{n.title}</p>
                        {unread && <span className="rounded-full bg-customOrange/15 px-2 py-0.5 text-[10px] font-black text-customOrange">غير مقروء</span>}
                        {isArchived && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">مؤرشف</span>}
                      </div>
                      {n.body && <p className="mt-2 text-sm leading-7 text-slate-500">{n.body}</p>}
                      <p className="mt-3 text-[11px] font-bold text-slate-400">{formatNotificationDate(n.created_at)}</p>
                    </button>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {unread && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); void onRead(n.id) }} className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-[11px] font-black text-customBlue ring-1 ring-sky-100" aria-label="تعيين كمقروء">
                          قراءة
                        </button>
                      )}
                      <button type="button" onClick={(e) => void onTogglePin(n, e)} aria-label={n.pinned ? 'إلغاء التثبيت' : 'تثبيت'} className="rounded-lg border border-deepBlue/10 p-2 text-deepBlue/60 hover:border-customBlue/30">
                        {n.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" onClick={(e) => void onToggleArchive(n, e)} aria-label={isArchived ? 'استعادة' : 'أرشفة'} className="rounded-lg border border-deepBlue/10 p-2 text-deepBlue/60 hover:border-customBlue/30">
                        {isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" onClick={(e) => void onDelete(n.id, e)} aria-label="حذف" className="rounded-lg border border-rose-100 bg-rose-50 p-2 text-rose-700">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.li>
              )
            })}
          </ul>

          {meta.last_page > 1 && (
            <div className="mt-5 flex items-center justify-between text-[11px] font-bold text-deepBlue/50">
              <span>صفحة {meta.current_page} من {meta.last_page} — {meta.total} إشعار</span>
              <div className="flex gap-2">
                <button type="button" disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-30">السابق</button>
                <button type="button" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-30">التالي</button>
              </div>
            </div>
          )}
        </>
      )}
      <NotificationDetailModal notification={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
