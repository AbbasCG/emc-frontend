import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { parseFormActionError } from '@/api/formsAdminApi'
import { activeFilterCount, createResponseExport, downloadResponseExport, fetchResponseExport, fetchResponseOptions } from '@/api/formsResponsesApi'
import type { ExportColumn, ExportFormat, ExportRecord, ResponseFilters } from '@/api/formsResponsesApi'
import { EXPORT_STATUS_AR, FORMAT_AR, FORMAT_HINT, formatBytes } from './responsesUi'

const FORMATS: ExportFormat[] = ['xlsx', 'csv', 'pdf']
const POLL_MS = 1500
const POLL_MAX = 400
const PDF_MAX_COLUMNS = 12

/** "3 إرسالات", "11 إرسالاً": the Arabic count agreement. */
function countPhrase(n: number): string {
  if (n === 0) return 'لا إرسالات'
  if (n === 1) return 'إرسالاً واحداً'
  if (n === 2) return 'إرسالَين'
  return n <= 10 ? `${n} إرسالات` : `${n} إرسالاً`
}

const defaults = (columns: ExportColumn[]) => new Set(columns.filter((c) => c.default).map((c) => c.key))

/**
 * Export the responses to XLSX, CSV or PDF.
 *
 * The file holds exactly the responses the table shows for the current filters (the server builds it from the same query) and
 * only the columns chosen here, from the questions of the version(s) shown. There is no separate permission: if the table opens for
 * you, the export does. A large export is built in the background; this dialog waits for it and downloads it when ready.
 */
export default function ExportDialog({
  formId,
  filters,
  total,
  columns: initialColumns,
  onClose,
}: {
  formId: number
  filters: ResponseFilters
  /** How many responses match the current filters. */
  total: number
  /** The columns for all versions; replaced by the chosen version's when a version filter is set. */
  columns: ExportColumn[]
  onClose: () => void
}) {
  const [format, setFormat] = useState<ExportFormat>('xlsx')
  const [columns, setColumns] = useState<ExportColumn[]>(initialColumns)
  const [selected, setSelected] = useState<Set<string>>(() => defaults(initialColumns))
  const [phase, setPhase] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [record, setRecord] = useState<ExportRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelled = useRef(false)

  const version = filters.version

  // Follow the version filter, whose questions are the only ones a file of it can have. (The panel mounts the dialog fresh each time it opens.)
  useEffect(() => {
    let stale = false
    cancelled.current = false
    void (async () => {
      let next = initialColumns
      if (version) {
        try {
          next = (await fetchResponseOptions(formId, Number(version))).columns
        } catch {
          next = initialColumns
        }
      }
      if (stale) return
      setColumns(next)
      setSelected(defaults(next))
    })()
    return () => { stale = true; cancelled.current = true }
  }, [formId, version, initialColumns])

  const meta = columns.filter((c) => c.group === 'meta')
  const questions = columns.filter((c) => c.group === 'question')
  const chosen = useMemo(() => columns.filter((c) => selected.has(c.key)), [columns, selected])
  const tooWide = format === 'pdf' && chosen.length > PDF_MAX_COLUMNS
  const working = phase === 'working'

  const toggle = (key: string) => setSelected((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const setGroup = (group: ExportColumn[], on: boolean) => setSelected((s) => { const n = new Set(s); group.forEach((c) => (on ? n.add(c.key) : n.delete(c.key))); return n })

  async function start() {
    setPhase('working')
    setError(null)
    setRecord(null)
    try {
      let current = await createResponseExport(formId, { format, columns: chosen.map((c) => c.key), filters })
      setRecord(current)
      for (let i = 0; i < POLL_MAX && !cancelled.current && (current.status === 'queued' || current.status === 'processing'); i++) {
        await new Promise((r) => setTimeout(r, POLL_MS))
        if (cancelled.current) return
        current = await fetchResponseExport(formId, current.id)
        setRecord(current)
      }
      if (cancelled.current) return
      if (current.status === 'ready') {
        await downloadResponseExport(formId, current.id, current.file_name ?? `responses.${format}`)
        setPhase('done')
      } else if (current.status === 'failed' || current.status === 'expired') {
        setError(current.error ?? EXPORT_STATUS_AR[current.status])
        setPhase('error')
      } else {
        setError('استغرق إنشاء الملف وقتاً أطول من المتوقع. سيبقى طلبك قائماً؛ أعد المحاولة بعد قليل أو ضيّق التصفية.')
        setPhase('error')
      }
    } catch (e) {
      setError(parseFormActionError(e))
      setPhase('error')
    }
  }

  async function again() {
    if (!record) return
    try {
      await downloadResponseExport(formId, record.id, record.file_name ?? `responses.${format}`)
    } catch (e) {
      setError(parseFormActionError(e))
      setPhase('error')
    }
  }

  const filtered = activeFilterCount(filters)

  return (
    <CenteredModal open onClose={onClose} busy={working} title="تصدير الإرسالات" subtitle="اختر الصيغة والأعمدة. يشمل الملف الإرسالات المطابقة للتصفية الحالية فقط." size="md" testId="export-dialog">
      <div className="grid gap-5 text-right" dir="rtl">
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-deepBlue" data-testid="export-scope">
          سيتضمن الملف <span className="font-black">{countPhrase(total)}</span>{filtered > 0 ? ` مطابقة لـ ${filtered} من عوامل التصفية` : ' (كل الإرسالات)'}.
          لا تُصدَّر الملاحظات الداخلية ولا سجل التصحيحات، وتظهر المرفقات بأسماء ملفاتها فقط.
        </p>

        <fieldset className="grid gap-2" disabled={working}>
          <legend className="mb-1 text-[11px] font-black text-deepBlue">الصيغة</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {FORMATS.map((f) => (
              <label key={f} className={`grid cursor-pointer gap-1 rounded-xl p-3 ring-1 ${format === f ? 'bg-brand-50 ring-2 ring-customBlue' : 'bg-white ring-deepBlue/[0.08]'}`}>
                <span className="flex items-center gap-2 text-xs font-black text-deepBlue">
                  <input type="radio" name="export-format" value={f} checked={format === f} onChange={() => setFormat(f)} className="accent-customBlue" />
                  {FORMAT_AR[f]}
                </span>
                <span className="text-[11px] font-bold leading-5 text-slate-500">{FORMAT_HINT[f]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-3" disabled={working}>
          <legend className="mb-1 flex w-full items-center justify-between text-[11px] font-black text-deepBlue">
            <span>الأعمدة ({chosen.length} من {columns.length})</span>
            <span className="flex gap-3">
              <button type="button" onClick={() => setSelected(new Set(columns.map((c) => c.key)))} className="text-customBlue hover:underline">تحديد الكل</button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-customBlue hover:underline">إلغاء التحديد</button>
            </span>
          </legend>
          {version && <p className="text-[11px] font-bold text-slate-500">الأسئلة هي أسئلة الإصدار المحدّد في التصفية.</p>}
          {[{ title: 'بيانات الإرسال', list: meta }, { title: 'أسئلة النموذج', list: questions }].map(({ title, list }) => list.length > 0 && (
            <div key={title} className="rounded-xl bg-white p-3 ring-1 ring-deepBlue/[0.06]">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-black text-slate-500">{title}</p>
                <span className="flex gap-2 text-[10px] font-black">
                  <button type="button" onClick={() => setGroup(list, true)} className="text-customBlue hover:underline">الكل</button>
                  <button type="button" onClick={() => setGroup(list, false)} className="text-customBlue hover:underline">لا شيء</button>
                </span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {list.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 text-xs font-bold text-deepBlue">
                    <input type="checkbox" checked={selected.has(c.key)} onChange={() => toggle(c.key)} className="accent-customBlue" />
                    <span className="min-w-0 truncate" title={c.label}>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        {tooWide && <p role="note" className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900">ملف PDF مخصص للطباعة ويتسع لـ {PDF_MAX_COLUMNS} عموداً كحدٍّ أقصى. اختر أعمدة أقل أو استخدم XLSX أو CSV.</p>}
        {total === 0 && <p role="note" className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900">لا توجد إرسالات مطابقة للتصفية الحالية لتصديرها.</p>}

        {working && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-900">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            {record ? EXPORT_STATUS_AR[record.status] : 'جارٍ إرسال الطلب'}... لا تغلق النافذة.
          </p>
        )}
        {phase === 'done' && record && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900" data-testid="export-done">
            <span>تم تنزيل الملف ({record.row_count ?? 0} إرسال{record.file_size ? ` · ${formatBytes(record.file_size)}` : ''}). يبقى متاحاً ٢٤ ساعة.</span>
            <button type="button" onClick={() => void again()} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 font-black text-emerald-900 ring-1 ring-emerald-200">
              <Download size={12} aria-hidden />
              تنزيل مرة أخرى
            </button>
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700" data-testid="export-error">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={working} onClick={onClose} className="rounded-xl px-5 py-2.5 text-xs font-black text-deepBlue ring-1 ring-deepBlue/10 disabled:opacity-50">إغلاق</button>
          <button
            type="button"
            disabled={working || chosen.length === 0 || tooWide || total === 0}
            onClick={() => void start()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"
          >
            <Download size={13} aria-hidden />
            {working ? 'جارٍ التصدير...' : `تصدير ${FORMAT_AR[format]}`}
          </button>
        </div>
      </div>
    </CenteredModal>
  )
}
