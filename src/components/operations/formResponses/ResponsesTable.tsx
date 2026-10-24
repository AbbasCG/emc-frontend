import { ArrowDown, ArrowUp, Eye } from 'lucide-react'
import type { ResponseRow, SortKey } from '@/api/formsResponsesApi'
import { formatDateTime } from '@/utils/dateTime'
import { STATUS_AR, STATUS_TONE } from './responsesUi'

export type Sort = { key: SortKey; direction: 'asc' | 'desc' }

function SortHeader({ label, k, sort, onSort }: { label: string; k: SortKey; sort: Sort; onSort: (key: SortKey) => void }) {
  const on = sort.key === k
  return (
    <th className="px-4 py-3" aria-sort={on ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 font-black uppercase">
        {label}
        {on && (sort.direction === 'asc' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />)}
      </button>
    </th>
  )
}

/** The page of responses: who, when, where from, in what state and with whom. Opening a row shows the whole response. */
export default function ResponsesTable({
  rows,
  loading,
  sort,
  filtered,
  onSort,
  onOpen,
}: {
  rows: ResponseRow[]
  loading: boolean
  sort: Sort
  filtered: boolean
  onSort: (key: SortKey) => void
  onOpen: (row: ResponseRow) => void
}) {
  return (
    <div className={`overflow-x-auto rounded-2xl bg-white ring-1 ring-deepBlue/[0.06] transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
      <table className="w-full min-w-[820px] text-right text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-[11px] text-slate-500">
          <tr>
            <SortHeader label="#" k="id" sort={sort} onSort={onSort} />
            <SortHeader label="التاريخ" k="submitted_at" sort={sort} onSort={onSort} />
            <th className="px-4 py-3 font-black">المُرسِل</th>
            <th className="px-4 py-3 font-black">المصدر</th>
            <th className="px-4 py-3 font-black">الإصدار</th>
            <SortHeader label="الحالة" k="status" sort={sort} onSort={onSort} />
            <th className="px-4 py-3 font-black">المُسنَد إليه</th>
            <th className="px-4 py-3 font-black">لمحة</th>
            <th className="px-4 py-3"><span className="sr-only">التفاصيل</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-12 text-center" data-testid="responses-empty">
                <p className="text-sm font-black text-deepBlue">{filtered ? 'لا توجد إرسالات مطابقة للتصفية.' : 'لا توجد إرسالات بعد.'}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{filtered ? 'غيّر عوامل التصفية أو امسحها لعرض كل الإرسالات.' : 'ستظهر هنا إجابات المشاركين فور وصولها.'}</p>
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 font-semibold text-deepBlue" data-testid="response-row" data-status={r.status}>
              <td className="px-4 py-3">{r.id}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{r.submitted_at ? formatDateTime(r.submitted_at) : '—'}</td>
              <td className="px-4 py-3 text-xs">{r.submitter_label ?? '—'}</td>
              <td className="px-4 py-3 text-xs">{r.source.type === 'link' ? `رابط: ${r.source.label ?? 'مشاركة'}` : 'الرابط العام'}</td>
              <td className="px-4 py-3 text-xs">{r.form_version ?? '—'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${STATUS_TONE[r.status] ?? STATUS_TONE.new}`}>{STATUS_AR[r.status] ?? r.status_label}</span>
                {r.corrected && <span className="ms-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-800 ring-1 ring-violet-200">مُصحَّح</span>}
              </td>
              <td className="px-4 py-3 text-xs">{r.assignee?.name ?? <span className="text-slate-400">—</span>}</td>
              <td className="max-w-[260px] truncate px-4 py-3 text-xs text-slate-600" title={r.answers_preview}>{r.answers_preview || '—'}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  aria-label={`عرض إجابات الإرسال ${r.id}`}
                  onClick={() => onOpen(r)}
                  className="rounded-lg p-1.5 text-customBlue ring-1 ring-deepBlue/10 hover:bg-slate-50"
                >
                  <Eye size={14} aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
