import { useEffect, useRef, useState } from 'react'
import { Lock, RefreshCw, X } from 'lucide-react'
import { fetchMemberHistory, type PointHistoryEntry, type PointsMemberHistory } from '@/api/volunteerPointsApi'
import PersonAvatar from './PersonAvatar'
import { KIND_META, categoryLabel, entryKind, formatDateTime, formatNumber, signed } from './impactPointsUi'

type Props = {
  userId: number
  /** Shown instantly while the history loads. */
  name: string
  onClose: () => void
}

/**
 * Full ledger of one person: every award, deduction and correction with its
 * amount, reason, category, who made it and when. The internal note appears
 * only when the server includes it (staff reading someone else's history).
 */
export default function PointsHistoryDrawer({ userId, name, onClose }: Props) {
  const [data, setData] = useState<PointsMemberHistory | null>(null)
  const [entries, setEntries] = useState<PointHistoryEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadingMore, setLoadingMore] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Bumping the nonce re-runs the fetch effect (the retry button); state is only
  // ever set from the request's callbacks, never synchronously in the effect.
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true

    void fetchMemberHistory(userId, 1)
      .then((res) => {
        if (!alive) return
        setData(res)
        setEntries(res.entries)
        setStatus('ready')
      })
      .catch(() => {
        if (alive) setStatus('error')
      })

    return () => {
      alive = false
    }
  }, [userId, nonce])

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [onClose])

  function retry() {
    setStatus('loading')
    setNonce((n) => n + 1)
  }

  async function loadMore() {
    if (!data) return
    setLoadingMore(true)
    try {
      const next = await fetchMemberHistory(userId, data.currentPage + 1)
      setData(next)
      setEntries((prev) => [...prev, ...next.entries])
    } catch {
      setStatus('error')
    } finally {
      setLoadingMore(false)
    }
  }

  const user = data?.user
  const hasMore = data ? data.currentPage < data.lastPage : false

  return (
    <div className="fixed inset-0 z-50 flex bg-navy/50 backdrop-blur-sm" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`سجل نقاط ${name}`}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="ms-auto flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <PersonAvatar name={user?.name ?? name} id={userId} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-black text-navy">{user?.name ?? name}</h2>
              <p className="truncate text-xs font-semibold text-muted-500">
                {[user?.department, user?.role_title].filter(Boolean).join(' — ') || 'سجل نقاط الأثر'}
              </p>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="إغلاق" className="rounded-xl p-2 text-muted-500 hover:bg-slate-100">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {data && (
          <div className="grid grid-cols-3 gap-2 border-b border-slate-100 bg-slate-50 p-4 text-center">
            <div>
              <p className="text-lg font-black tabular-nums text-navy">{formatNumber(data.summary.lifetime_points)}</p>
              <p className="text-[10.5px] font-bold text-muted-500">التراكمي</p>
            </div>
            <div>
              <p className="text-lg font-black tabular-nums text-navy">{formatNumber(data.summary.available_points)}</p>
              <p className="text-[10.5px] font-bold text-muted-500">المتاح</p>
            </div>
            <div>
              <p className="truncate text-sm font-black text-brand-600">{data.summary.eligible_level.title}</p>
              <p className="text-[10.5px] font-bold text-muted-500">المستوى</p>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {status === 'loading' ? (
            <ul aria-busy="true" aria-label="جارٍ تحميل السجل" className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </ul>
          ) : status === 'error' && entries.length === 0 ? (
            <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center">
              <p className="text-sm font-black text-rose-700">تعذر تحميل السجل</p>
              <button type="button" onClick={retry} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-navy ring-1 ring-rose-200">
                <RefreshCw size={14} aria-hidden="true" /> إعادة المحاولة
              </button>
            </div>
          ) : entries.length === 0 ? (
            <p className="py-10 text-center text-sm font-bold text-muted-500">لا توجد حركات نقاط لهذا العضو بعد.</p>
          ) : (
            <ol className="space-y-3">
              {entries.map((e) => {
                const kind = entryKind(e)
                const meta = KIND_META[kind]
                return (
                  <li key={e.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-black ring-1 ${meta.badge}`}>{meta.label}</span>
                        <span className="text-[11px] font-bold text-muted-500">{categoryLabel(e.category)}</span>
                      </div>
                      <span className={`text-lg font-black tabular-nums ${e.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                        {signed(e.points)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold leading-6 text-navy">{e.reason}</p>

                    {e.note && (
                      <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-muted-600">
                        <Lock size={12} className="mt-1 shrink-0 text-muted-400" aria-hidden="true" />
                        <span><span className="font-black">ملاحظة داخلية: </span>{e.note}</span>
                      </p>
                    )}

                    <p className="mt-2 text-[11px] font-semibold text-muted-500">
                      بواسطة {e.awarder?.name ?? 'النظام'} · {formatDateTime(e.awarded_at)}
                      {e.source_type ? ` · المصدر: ${e.source_type}` : ''}
                    </p>
                  </li>
                )
              })}
            </ol>
          )}

          {status !== 'loading' && hasMore && (
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore}
              className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-black text-navy hover:bg-slate-50 disabled:opacity-60">
              {loadingMore ? 'جارٍ التحميل…' : 'عرض المزيد'}
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
