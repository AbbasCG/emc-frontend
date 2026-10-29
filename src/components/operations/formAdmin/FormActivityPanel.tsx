import { useCallback, useEffect, useState } from 'react'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { fetchFormActivity, parseFormActionError } from '@/api/formsAdminApi'
import { formatDateTime } from '@/utils/dateTime'
import type { FormActivityRow, PagedRows } from '@/types/operations'
import { summarizeActivity } from './formAdminUi'

/** Who did what to this form, newest first. Describes the form only: it never contains an answer or a contact detail. */
export default function FormActivityPanel({ formId }: { formId: number }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PagedRows<FormActivityRow> | null>(null)
  const [loadedPage, setLoadedPage] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setData(await fetchFormActivity(formId, page))
      setLoadedPage(page)
    } catch (e) {
      setError(parseFormActionError(e))
    }
  }, [formId, page])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchFormActivity(formId, page)
        if (!cancelled) {
          setData(next)
          setLoadedPage(page)
        }
      } catch (e) {
        if (!cancelled) setError(parseFormActionError(e))
      }
    })()

    return () => { cancelled = true }
  }, [formId, page])

  if (error) {
    return (
      <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p role="alert" className="font-black text-rose-800">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-deepBlue px-5 py-2 text-xs font-black text-white">إعادة المحاولة</button>
      </div>
    )
  }
  if (!data || loadedPage !== page) return <OpsPageSkeleton />

  return (
    <section aria-label="سجل النشاط" className="text-right">
      {data.rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-sm font-bold text-slate-500 ring-1 ring-deepBlue/[0.06]">لا يوجد نشاط مسجَّل لهذا النموذج بعد.</p>
      ) : (
        <ol className="divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-deepBlue/[0.06]">
          {data.rows.map((entry) => {
            const summary = summarizeActivity(entry.action, entry.details ?? {})

            return (
              <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4" data-testid="activity-entry">
                <div className="min-w-0">
                  <p className="text-sm font-black text-deepBlue">{entry.label}</p>
                  {summary && <p className="mt-0.5 break-words text-xs font-semibold text-slate-600">{summary}</p>}
                </div>
                <div className="text-left text-[11px] font-bold text-slate-500">
                  <p>{entry.actor?.name ?? 'مستخدم محذوف'}</p>
                  <p>{formatDateTime(entry.created_at)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {data.lastPage > 1 && (
        <nav aria-label="تصفح السجل" className="mt-4 flex items-center justify-center gap-3 text-xs font-black text-deepBlue">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg px-3 py-1.5 ring-1 ring-deepBlue/10 disabled:opacity-40">السابق</button>
          <span>صفحة {data.currentPage} من {data.lastPage}</span>
          <button type="button" disabled={page >= data.lastPage} onClick={() => setPage((p) => p + 1)} className="rounded-lg px-3 py-1.5 ring-1 ring-deepBlue/10 disabled:opacity-40">التالي</button>
        </nav>
      )}
    </section>
  )
}
