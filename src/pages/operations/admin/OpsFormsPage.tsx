import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { BarChart3, ChevronLeft, FilePlus2, LayoutTemplate } from 'lucide-react'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { fetchFormDefinitions } from '@/api/formsApi'
import { FORM_STATUS_AR, FORM_TYPE_AR } from '@/data/operationsLabels'
import { VISIBILITY_AR } from '@/components/operations/formAdmin/formAdminUi'
import type { OpsFormDefinition } from '@/types/operations'

const LOAD_ERROR = 'تعذّر تحميل النماذج. تحقق من الاتصال وأعد المحاولة.'

export default function OpsFormsPage() {
  const [forms, setForms] = useState<OpsFormDefinition[]>([])
  // Starts in the loading state, so the mount effect never has to flip it synchronously.
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchFormDefinitions()
        if (!cancelled) setForms(rows)
      } catch {
        if (!cancelled) setLoadError(LOAD_ERROR)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Retry lives outside the effect, so the synchronous reset here is legitimate.
  const retry = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      setForms(await fetchFormDefinitions())
    } catch {
      setLoadError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void retry()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.35rem] bg-white p-6 shadow-lg ring-1 ring-deepBlue/[0.06]">
        <div className="text-right">
          <h1 className="text-xl font-black text-deepBlue">محرك النماذج</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">إنشاء نماذج تشغيل ذكية ومتوافقة مع العربية</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard/admin/forms/analytics"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-deepBlue shadow-sm ring-1 ring-deepBlue/10"
          >
            <BarChart3 size={16} />
            التحليلات
          </Link>
          <Link
            to="/dashboard/admin/forms/templates"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-deepBlue shadow-sm ring-1 ring-deepBlue/10"
          >
            <LayoutTemplate size={16} />
            ابدأ من قالب
          </Link>
          <Link
            to="/dashboard/admin/forms/create"
            className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-xs font-black text-white shadow-md"
          >
            <FilePlus2 size={16} />
            نموذج جديد
          </Link>
        </div>
      </header>

      {forms.length === 0 ? (
        <EmptyState
          title="لا نماذج بعد"
          description="ابدأ بنموذج فارغ، أو اختر قالباً جاهزاً من مكتبة القوالب."
          action={{ label: 'تصفح القوالب', href: '/dashboard/admin/forms/templates' }}
        />
      ) : (
        <motion.ul layout className="grid gap-4 md:grid-cols-2">
          {forms.map((f) => (
            <li key={f.id}>
              <Link
                to={`/dashboard/admin/forms/${f.id}`}
                className="block rounded-2xl bg-white p-6 text-right shadow-md ring-1 ring-deepBlue/[0.06] transition hover:-translate-y-0.5 hover:ring-customBlue/25"
              >
                <p className="text-[10px] font-black uppercase tracking-wide text-accent-700">
                  {FORM_TYPE_AR[f.form_type] ?? f.form_type}
                  {f.status && <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{FORM_STATUS_AR[f.status] ?? f.status}</span>}
                </p>
                <h2 className="mt-2 text-lg font-black text-deepBlue">{f.title}</h2>
                <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-500">{f.description}</p>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-black text-slate-500">
                  {f.owner && <span>المالك: {f.owner.name}</span>}
                  {f.visibility && <span>{VISIBILITY_AR[f.visibility].label}</span>}
                  {f.current_version != null && <span>الإصدار {f.current_version}</span>}
                  {f.has_unpublished_changes === true && f.status === 'active' && <span className="text-amber-700">تعديلات غير منشورة</span>}
                  {f.submissions_count !== undefined && <span>عدد الإرسالات: {f.submissions_count}</span>}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-customBlue">
                  فتح المحرر
                  <ChevronLeft size={14} />
                </span>
              </Link>
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
