import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ExportButton,
  IntelligencePageSkeleton,
  ReportCard,
  ReportGeneratorModal,
} from '@/components/intelligence'
import EmptyState from '@/components/dashboard/EmptyState'
import { FileBarChart } from 'lucide-react'
import { fetchReports, generateReport } from '@/api/reportsApi'

import type { ReportRecord, ReportTypeSlug } from '@/types/intelligence'

export default function ReportsAdminPage() {
  const [rows, setRows] = useState<ReportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [preview, setPreview] = useState<ReportRecord | null>(null)

  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      setRows(await fetchReports())
    } catch {
      setLoadError('تعذّر تحميل التقارير. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <IntelligencePageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-2xl font-black text-deepBlue">التقارير</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">توليد، معاينة، وتصدير وثائق القيادة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton label="Excel placeholder" onClick={() => {}} />
          <button
            type="button"
            onClick={() => setModal(true)}
            className="rounded-xl bg-customBlue px-5 py-2.5 text-xs font-black text-white shadow-md"
          >
            إنشاء تقرير
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          {rows.length === 0 ? (
            <EmptyState icon={FileBarChart} title="لا تقارير بعد" />
          ) : (
            rows.map((r) => (
              <div key={r.id} onClick={() => setPreview(r)} className="cursor-pointer">
                <ReportCard r={r} />
              </div>
            ))
          )}
        </section>

        <motion.aside
          layout
          className="min-h-[320px] rounded-[1.35rem] bg-deepBlue p-8 text-right text-white shadow-xl ring-1 ring-white/10"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">معاينة</p>
          {preview ? (
            <>
              <h2 className="mt-4 text-xl font-black">{preview.title}</h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-white/75">{preview.preview_summary}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                <ExportButton label="PDF placeholder" onClick={() => {}} />
                <ExportButton label="Excel placeholder" onClick={() => {}} />
              </div>
            </>
          ) : (
            <p className="mt-12 text-center text-sm font-semibold text-white/55">اختر تقريراً لعرض المعاينة</p>
          )}
        </motion.aside>
      </div>

      <ReportGeneratorModal
        open={modal}
        onClose={() => setModal(false)}
        onGenerate={async (payload: { report_type: ReportTypeSlug; related_label?: string; title?: string }) => {
          try {
            const r = await generateReport(payload)
            setRows((x) => [r, ...x])
            setPreview(r)
          } catch {
            /* generation failed — let the modal handle the error toast */
          }
        }}
      />
    </div>
  )
}
