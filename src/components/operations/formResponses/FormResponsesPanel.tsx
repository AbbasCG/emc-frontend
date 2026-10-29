import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { DashboardSection } from '@/components/dashboard'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { parseFormActionError } from '@/api/formsAdminApi'
import { activeFilterCount, EMPTY_FILTERS, fetchResponseOptions, fetchResponses } from '@/api/formsResponsesApi'
import type { ExportColumn, ResponseDetail, ResponseFilters as Filters, ResponseOptions, ResponseRow, ResponsesPage } from '@/api/formsResponsesApi'
import ExportDialog from './ExportDialog'
import ResponseDetailsModal from './ResponseDetailsModal'
import ResponseFilters from './ResponseFilters'
import ResponsesTable from './ResponsesTable'
import type { Sort } from './ResponsesTable'

const PAGE_SIZES = [10, 20, 50, 100]
const NO_COLUMNS: ExportColumn[] = []
const LOAD_ERROR = 'تعذّر تحميل الإرسالات. تحقق من الاتصال وأعد المحاولة.'

/**
 * The responses of one form: a page at a time, filtered, searched and sorted by the server, each openable in full, and exportable.
 *
 * This screen only exists for someone who may read the responses; what else they can do (review, correct) is the server's answer for each
 * response. Loading keeps the last page on screen (dimmed) so filtering never makes the table jump; a failed load says so and
 * offers a retry without throwing the page away.
 */
export default function FormResponsesPanel({ formId }: { formId: number }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [sort, setSort] = useState<Sort>({ key: 'submitted_at', direction: 'desc' })
  const [data, setData] = useState<ResponsesPage | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [optionsKey, setOptionsKey] = useState(0)
  const [options, setOptions] = useState<ResponseOptions | null>(null)
  const [opened, setOpened] = useState<ResponseRow | null>(null)
  const [exporting, setExporting] = useState(false)
  const latest = useRef(0)

  // What is on screen was asked for with this key; while the key moves on, the last page stays (dimmed) until the new one arrives.
  const requestKey = JSON.stringify([formId, page, perPage, filters, sort, reload])
  const loading = loadedKey !== requestKey

  useEffect(() => {
    const ticket = ++latest.current
    void (async () => {
      try {
        const next = await fetchResponses(formId, { page, perPage, filters, sort: sort.key, direction: sort.direction })
        if (ticket !== latest.current) return
        setData(next)
        setError(null)
      } catch (e) {
        if (ticket === latest.current) setError(parseFormActionError(e).startsWith('لا تملك صلاحية') ? 'لا تملك صلاحية عرض إجابات هذا النموذج.' : LOAD_ERROR)
      } finally {
        if (ticket === latest.current) setLoadedKey(requestKey)
      }
    })()
  }, [formId, page, perPage, filters, sort, reload, requestKey])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchResponseOptions(formId)
        if (!cancelled) setOptions(next)
      } catch {
        // The filters still work with what they have; versions, links and people are simply not offered.
      }
    })()
    return () => { cancelled = true }
  }, [formId, optionsKey])

  const changeFilters = useCallback((next: Filters) => { setFilters(next); setPage(1) }, [])

  const filtered = activeFilterCount(filters) > 0
  const columns = useMemo(() => options?.columns ?? NO_COLUMNS, [options])

  function followChange(next: ResponseDetail) {
    setOpened((current) => (current && current.id === next.id ? { ...current, ...next } : current))
    setData((current) => (current ? { ...current, rows: current.rows.map((r) => (r.id === next.id ? { ...r, ...next } : r)) } : current))
    setReload((n) => n + 1)
    setOptionsKey((n) => n + 1)
  }

  if (error && !data) {
    return (
      <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
        <p className="font-black text-rose-800">{error}</p>
        <button type="button" onClick={() => setReload((n) => n + 1)} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">
          إعادة المحاولة
        </button>
      </div>
    )
  }
  if (!data) return <OpsPageSkeleton />

  return (
    <DashboardSection title="إرسالات النموذج">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-right text-xs font-bold text-slate-500" data-testid="responses-total">
          {filtered ? `النتائج المطابقة: ${data.total}` : `إجمالي الإرسالات: ${data.total}`}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setReload((n) => n + 1)} aria-label="تحديث القائمة" className="rounded-xl p-2 text-deepBlue ring-1 ring-deepBlue/10 hover:bg-slate-50">
            <RefreshCw size={14} aria-hidden className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" onClick={() => setExporting(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue px-4 py-2 text-xs font-black text-white">
            <Download size={13} aria-hidden />
            تصدير
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        <ResponseFilters filters={filters} options={options} counts={data.statusCounts} onChange={changeFilters} />

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
            {error}
            <button type="button" onClick={() => setReload((n) => n + 1)} className="rounded-lg bg-white px-3 py-1 font-black text-red-700 ring-1 ring-red-200">إعادة المحاولة</button>
          </div>
        )}

        <ResponsesTable
          rows={data.rows}
          loading={loading}
          sort={sort}
          filtered={filtered}
          onSort={(key) => { setSort((s) => (s.key === key ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'desc' })); setPage(1) }}
          onOpen={setOpened}
        />

        <nav aria-label="تصفح الإرسالات" className="flex flex-wrap items-center justify-center gap-3 text-xs font-black text-deepBlue">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg px-3 py-1.5 ring-1 ring-deepBlue/10 disabled:opacity-40">السابق</button>
          <span>صفحة {data.currentPage} من {data.lastPage}</span>
          <button type="button" disabled={page >= data.lastPage} onClick={() => setPage((p) => p + 1)} className="rounded-lg px-3 py-1.5 ring-1 ring-deepBlue/10 disabled:opacity-40">التالي</button>
          <label className="flex items-center gap-2 text-[11px] text-slate-500">
            عدد الصفوف
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-deepBlue">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </nav>
      </div>

      {opened && <ResponseDetailsModal key={opened.id} formId={formId} row={opened} options={options} onClose={() => setOpened(null)} onChanged={followChange} />}
      {exporting && <ExportDialog formId={formId} filters={filters} total={data.total} columns={columns} onClose={() => setExporting(false)} />}
    </DashboardSection>
  )
}
