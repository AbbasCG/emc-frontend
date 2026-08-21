import { useRef, useState } from 'react'
import { CheckCircle2, Download, FileSpreadsheet, ShieldCheck, Upload, X, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import apiClient from '@/api/axios'
import { unwrapData } from '@/api/unwrap'
import { downloadCatalogTemplate, parseCatalogFile, type TemplateRow } from '@/lib/catalogImportTemplate'

/**
 * «استيراد الكتالوج» — رفع الدورات والورش والمسارات دفعة واحدة من قالب إكسل:
 * حمّل القالب، عبّئه، ارفعه، عاين كل صف بنتيجته، فحص تجريبي على الخادم بلا
 * كتابة، ثم اعتماد نهائي داخل معاملة واحدة. نفس المعرف اللاتيني = تحديث لا
 * تكرار، فالملف نفسه يصلح للتصحيح وإعادة الرفع.
 */

type RowResult = { row: number; status: 'created' | 'updated' | 'error'; message: string }
type ImportSummary = { total: number; created: number; updated: number; errors: number }

async function submitImport(rows: TemplateRow[], dryRun: boolean): Promise<{ summary: ImportSummary; results: RowResult[] }> {
  const res = await apiClient.post<unknown>('/admin/catalog-import', { dry_run: dryRun, rows })
  return unwrapData(res.data)
}

const STATUS_STYLES: Record<RowResult['status'], string> = {
  created: 'bg-emerald-100 text-emerald-700',
  updated: 'bg-sky/60 text-deepBlue',
  error: 'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<RowResult['status'], string> = {
  created: 'سيُنشأ',
  updated: 'سيُحدَّث',
  error: 'خطأ',
}

export default function CatalogImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<TemplateRow[]>([])
  const [results, setResults] = useState<RowResult[]>([])
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [checked, setChecked] = useState(false)
  const [committed, setCommitted] = useState(false)
  const [busy, setBusy] = useState(false)

  async function pickFile(file: File | null) {
    if (!file) return
    setCommitted(false)
    setChecked(false)
    setResults([])
    setSummary(null)
    try {
      const parsed = await parseCatalogFile(file)
      if (parsed.length === 0) {
        toast.error('الملف لا يحتوي صفوفاً — عبّئ ورقة «المنتجات» أولاً')
        return
      }
      if (parsed.length > 300) {
        toast.error('الحد 300 صف في الملف الواحد — قسّم الملف')
        return
      }
      setRows(parsed)
      setFileName(file.name)
      toast.success(`قُرئ ${parsed.length} صفاً — افحص تجريبياً قبل الاعتماد`)
    } catch {
      toast.error('تعذر قراءة الملف — تأكد أنه ملف إكسل من القالب')
    }
  }

  async function runCheck(dryRun: boolean) {
    setBusy(true)
    try {
      const out = await submitImport(rows, dryRun)
      setResults(out.results)
      setSummary(out.summary)
      if (dryRun) {
        setChecked(true)
        if (out.summary.errors > 0) toast.error(`${out.summary.errors} صفاً به أخطاء — صحّح الملف وأعد رفعه`)
        else toast.success('الفحص سليم — يمكنك الاعتماد')
      } else {
        setCommitted(true)
        toast.success(`تم: ${out.summary.created} جديد و${out.summary.updated} محدَّث`)
      }
    } catch {
      toast.error('تعذر تنفيذ العملية')
    } finally {
      setBusy(false)
    }
  }

  const resultFor = (index: number) => results.find((r) => r.row === index + 2)

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-customOrange">تعبئة المنصة</p>
        <h1 className="mt-1 text-2xl font-black text-deepBlue">استيراد الكتالوج</h1>
        <p className="mt-1 text-sm text-deepBlue/50">
          دورات وورش ومسارات دفعة واحدة من ملف إكسل — بمعاينة وفحص قبل أي كتابة
        </p>
      </div>

      {/* الخطوات الثلاث */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-100 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
            <Download size={15} className="text-customBlue" aria-hidden />
            1. حمّل القالب
          </h2>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            ملف إكسل بكل الخانات، فيه ثلاثة أمثلة جاهزة (دورة، ورشة، مسار) وورقة
            إرشادات بالقيم المقبولة لكل عمود.
          </p>
          <button
            onClick={() => downloadCatalogTemplate()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-customBlue/30 px-4 py-2.5 text-xs font-extrabold text-customBlue transition hover:bg-sky/30"
          >
            <FileSpreadsheet size={14} aria-hidden />
            تحميل EMC-catalog-template.xlsx
          </button>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
            <Upload size={15} className="text-customBlue" aria-hidden />
            2. ارفع الملف المعبأ
          </h2>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            نفس «المعرف اللاتيني» يحدّث المنتج نفسه بدل تكراره — عدّل الملف وأعد
            رفعه متى شئت.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            onChange={(e) => void pickFile(e.target.files?.[0] ?? null)}
          />
          {fileName ? (
            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-customBlue/40 bg-sky/30 px-3 py-2.5">
              <span dir="ltr" className="min-w-0 truncate text-xs font-bold text-deepBlue">{fileName}</span>
              <button
                onClick={() => {
                  setFileName(null)
                  setRows([])
                  setResults([])
                  setSummary(null)
                  setChecked(false)
                  setCommitted(false)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                aria-label="إزالة الملف"
                className="shrink-0 rounded-lg p-1 text-ink-400 transition hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-xs font-bold text-slate-500 transition hover:border-customBlue hover:text-customBlue"
            >
              <Upload size={14} aria-hidden />
              اختر الملف…
            </button>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-deepBlue">
            <ShieldCheck size={15} className="text-customBlue" aria-hidden />
            3. افحص ثم اعتمد
          </h2>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            الفحص التجريبي يتحقق من كل صف على الخادم بلا أي كتابة؛ الاعتماد ينفذ
            الكل في معاملة واحدة — أي فشل يرجع كل شيء.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              disabled={rows.length === 0 || busy}
              onClick={() => void runCheck(true)}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-extrabold text-deepBlue transition hover:border-customBlue disabled:opacity-50"
            >
              {busy ? '…' : 'فحص تجريبي'}
            </button>
            <button
              disabled={!checked || (summary?.errors ?? 1) > 0 || committed || busy}
              onClick={() => void runCheck(false)}
              className="flex-1 rounded-xl bg-customOrange px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-ember disabled:cursor-not-allowed disabled:opacity-50"
            >
              اعتماد الاستيراد
            </button>
          </div>
        </section>
      </div>

      {/* الملخص */}
      {summary && (
        <div
          className={`flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 ${
            committed
              ? 'border-emerald-200 bg-emerald-50'
              : summary.errors > 0
                ? 'border-red-200 bg-red-50'
                : 'border-sky bg-sky/20'
          }`}
        >
          {committed ? (
            <CheckCircle2 size={18} className="text-emerald-600" aria-hidden />
          ) : summary.errors > 0 ? (
            <XCircle size={18} className="text-red-500" aria-hidden />
          ) : (
            <ShieldCheck size={18} className="text-customBlue" aria-hidden />
          )}
          <p className="text-sm font-black text-deepBlue">
            {committed ? 'اعتُمد الاستيراد: ' : 'نتيجة الفحص: '}
            {summary.total} صف — {summary.created} جديد · {summary.updated} تحديث
            {summary.errors > 0 ? ` · ${summary.errors} خطأ` : ''}
          </p>
        </div>
      )}

      {/* المعاينة */}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 text-start">#</th>
                <th className="px-4 py-3 text-start">النوع</th>
                <th className="px-4 py-3 text-start">العنوان</th>
                <th className="px-4 py-3 text-start">المعرف</th>
                <th className="px-4 py-3 text-start">السعر</th>
                <th className="px-4 py-3 text-start">الحالة</th>
                <th className="px-4 py-3 text-start">نتيجة الفحص</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const r = resultFor(i)
                return (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 text-xs tabular-nums text-slate-400">{i + 2}</td>
                    <td className="px-4 py-3 text-xs font-bold text-ink-600">{String(row['النوع'] ?? '')}</td>
                    <td className="px-4 py-3 font-black text-deepBlue">{String(row['العنوان'] ?? '')}</td>
                    <td dir="ltr" className="px-4 py-3 text-start text-xs text-slate-500">
                      {String(row['المعرف اللاتيني (slug)'] ?? '')}
                    </td>
                    <td className="px-4 py-3 text-xs font-black tabular-nums text-ink-600">
                      {Number(row['السعر باليورو'] ?? 0) > 0 ? `€${row['السعر باليورو']}` : 'مجاني'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{String(row['الحالة'] ?? 'مسودة')}</td>
                    <td className="px-4 py-3">
                      {r ? (
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-black ${STATUS_STYLES[r.status]}`}>
                          {committed && r.status !== 'error'
                            ? r.status === 'created' ? 'أُنشئ' : 'حُدِّث'
                            : STATUS_LABELS[r.status]}
                          {r.status === 'error' ? ` — ${r.message}` : ''}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-300">لم يُفحص بعد</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
