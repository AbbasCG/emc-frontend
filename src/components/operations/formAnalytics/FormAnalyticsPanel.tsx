import { useEffect, useState } from 'react'
import { Download, Info } from 'lucide-react'
import ResponsesOverTimeChart from './ResponsesOverTimeChart'
import QuestionAnalyticsCard from './QuestionAnalyticsCard'
import { downloadFormAnalyticsCsv, fetchFormAnalytics, parseAnalyticsError } from '@/api/formsAnalyticsApi'
import type { AnalyticsFilters, FormAnalytics } from '@/api/formsAnalyticsApi'
import { fetchResponseOptions } from '@/api/formsResponsesApi'
import { STATUS_AR } from '@/components/operations/formResponses/responsesUi'

const FIELD = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue outline-none focus:border-customBlue'

/** The last N days ending today, in the platform's calendar (YYYY-MM-DD). */
function lastDays(n: number): { from: string; to: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' })
  const now = new Date()
  return { from: fmt.format(new Date(now.getTime() - (n - 1) * 86_400_000)), to: fmt.format(now) }
}

const PRESETS: { key: string; label: string; range: () => { from?: string; to?: string } }[] = [
  { key: 'all', label: 'كل الفترات', range: () => ({}) },
  { key: '7', label: 'آخر 7 أيام', range: () => lastDays(7) },
  { key: '30', label: 'آخر 30 يوماً', range: () => lastDays(30) },
  { key: '90', label: 'آخر 90 يوماً', range: () => lastDays(90) },
]

function Tile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-right shadow-md ring-1 ring-deepBlue/[0.06]">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-deepBlue">{value}</p>
      {hint && <p className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</p>}
    </div>
  )
}

function changeText(change: number | null): string {
  if (change === null) return 'لا ردود في الفترة السابقة للمقارنة'
  if (change === 0) return 'بلا تغيير عن الفترة السابقة'
  return `${change > 0 ? '+' : '−'}${Math.abs(change)}% عن الفترة السابقة`
}

/**
 * The Analytics tab of a form: totals, responses over time, a comparison with the previous period, and a summary of every question.
 * Visible to whoever may read the form's responses; the server checks it again for every request.
 */
export default function FormAnalyticsPanel({ formId }: { formId: number }) {
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  const [preset, setPreset] = useState('all')
  const [data, setData] = useState<FormAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [versions, setVersions] = useState<{ id: number; number: number }[]>([])
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void fetchResponseOptions(formId).then((o) => { if (!cancelled) setVersions(o.versions) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [formId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchFormAnalytics(formId, filters)
        if (!cancelled) {
          setData(next)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(parseAnalyticsError(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [formId, filters, attempt])

  function update(patch: Partial<AnalyticsFilters>) {
    setLoading(true)
    setFilters((f) => ({ ...f, ...patch }))
  }

  async function exportCsv() {
    setExporting(true)
    setExportError(null)
    try {
      await downloadFormAnalyticsCsv(formId, filters)
    } catch (e) {
      setExportError(parseAnalyticsError(e))
    } finally {
      setExporting(false)
    }
  }

  const t = data?.totals

  return (
    <div className="space-y-5" dir="rtl" aria-busy={loading}>
      <section aria-label="مرشحات التحليلات" className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-md ring-1 ring-deepBlue/[0.06]">
        <div role="group" aria-label="الفترة" className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={preset === p.key}
              onClick={() => { setPreset(p.key); const r = p.range(); update({ from: r.from, to: r.to }) }}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black ${preset === p.key ? 'bg-deepBlue text-white' : 'bg-slate-50 text-deepBlue ring-1 ring-slate-200 hover:bg-white'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="grid gap-1">
          <span className="text-[10px] font-black text-slate-500">من</span>
          <input type="date" value={filters.from ?? ''} max={filters.to} onChange={(e) => { setPreset('custom'); update({ from: e.target.value || undefined }) }} className={FIELD} />
        </label>
        <label className="grid gap-1">
          <span className="text-[10px] font-black text-slate-500">إلى</span>
          <input type="date" value={filters.to ?? ''} min={filters.from} onChange={(e) => { setPreset('custom'); update({ to: e.target.value || undefined }) }} className={FIELD} />
        </label>
        <label className="grid gap-1">
          <span className="text-[10px] font-black text-slate-500">الحالة</span>
          <select value={filters.status?.[0] ?? ''} onChange={(e) => update({ status: e.target.value ? [e.target.value] : undefined })} className={FIELD}>
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        {versions.length > 1 && (
          <label className="grid gap-1">
            <span className="text-[10px] font-black text-slate-500">الإصدار</span>
            <select value={filters.version ?? ''} onChange={(e) => update({ version: e.target.value ? Number(e.target.value) : undefined })} className={FIELD}>
              <option value="">كل الإصدارات</option>
              {versions.map((v) => <option key={v.id} value={v.id}>الإصدار {v.number}</option>)}
            </select>
          </label>
        )}
        <button type="button" onClick={() => void exportCsv()} disabled={exporting || !data} className="mr-auto inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-deepBlue ring-1 ring-deepBlue/10 hover:bg-slate-50 disabled:opacity-50">
          <Download size={14} aria-hidden /> {exporting ? 'جارٍ التصدير...' : 'تصدير الملخص (CSV)'}
        </button>
      </section>
      {exportError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{exportError}</p>}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p role="alert" className="font-black text-rose-800">{error}</p>
          <button type="button" onClick={() => { setLoading(true); setAttempt((n) => n + 1) }} className="mt-4 rounded-xl bg-deepBlue px-5 py-2 text-xs font-black text-white">إعادة المحاولة</button>
        </div>
      ) : !data || !t ? (
        <p className="rounded-2xl bg-white p-10 text-center text-sm font-bold text-slate-500">جارٍ حساب التحليلات...</p>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              label="عدد الردود"
              value={t.responses}
              hint={data.comparison ? changeText(data.comparison.change_percent) : 'اختر فترة للمقارنة بالفترة السابقة'}
            />
            <Tile label="مسجّلو الدخول / بدون تسجيل" value={<>{t.signed_in} <span className="text-base text-slate-400">/</span> {t.anonymous}</>} hint={`${t.via_share_link} عبر روابط المشاركة`} />
            <Tile label="بانتظار المعالجة" value={(t.by_status.new ?? 0) + (t.by_status.in_review ?? 0) + (t.by_status.needs_followup ?? 0)} hint={`${t.by_status.completed ?? 0} مكتملة`} />
            <Tile label="نسبة الإكمال" value={data.completion.rate === null ? 'غير قابلة للقياس' : `${data.completion.rate}%`} hint={<span className="inline-flex items-start gap-1"><Info size={12} aria-hidden className="mt-0.5 flex-none" />{data.completion.note}</span>} />
          </div>

          {data.comparison && (
            <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-[11px] font-bold text-slate-600">
              الفترة السابقة ({data.comparison.previous_from} – {data.comparison.previous_to}): {data.comparison.previous} رداً، مقابل {data.comparison.current} في الفترة المختارة.
            </p>
          )}

          <ResponsesOverTimeChart series={data.series} />

          <section aria-labelledby="questions-title" className="space-y-3">
            <h3 id="questions-title" className="text-right text-sm font-black text-deepBlue">ملخص الأسئلة</h3>
            {data.questions.length === 0 ? (
              <p className="rounded-xl bg-white p-6 text-center text-xs font-bold text-slate-500 ring-1 ring-deepBlue/[0.06]">لا توجد أسئلة منشورة لتلخيصها بعد.</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {data.questions.map((q) => <QuestionAnalyticsCard key={q.id} question={q} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
