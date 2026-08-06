import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, FilePlus2 } from 'lucide-react'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { fetchFormDefinitions } from '@/api/formsApi'
import { FORM_TYPE_AR } from '@/data/operationsLabels'
import type { OpsFormDefinition } from '@/types/operations'

export default function OpsFormsPage() {
  const [forms, setForms] = useState<OpsFormDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      setForms(await fetchFormDefinitions())
    } catch {
      setLoadError('تعذّر تحميل النماذج. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.35rem] bg-white p-6 shadow-lg ring-1 ring-deepBlue/[0.06]">
        <div className="text-right">
          <h1 className="text-xl font-black text-deepBlue">محرك النماذج</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">إنشاء نماذج تشغيل ذكية ومتوافقة مع العربية</p>
        </div>
        <Link
          to="/dashboard/admin/forms/create"
          className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-xs font-black text-white shadow-md"
        >
          <FilePlus2 size={16} />
          نموذج جديد
        </Link>
      </header>

      {forms.length === 0 ? (
        <EmptyState
          title="لا نماذج بعد"
          description="ابدأ بنموذج تقييم أو تسجيل."
          action={{ label: 'إنشاء', href: '/dashboard/admin/forms/create' }}
        />
      ) : (
        <motion.ul layout className="grid gap-4 md:grid-cols-2">
          {forms.map((f) => (
            <li key={f.id}>
              <Link
                to={`/dashboard/admin/forms/${f.id}`}
                className="block rounded-2xl bg-white p-6 text-right shadow-md ring-1 ring-deepBlue/[0.06] transition hover:-translate-y-0.5 hover:ring-customBlue/25"
              >
                <p className="text-[10px] font-black uppercase tracking-wide text-customOrange">
                  {FORM_TYPE_AR[f.form_type] ?? f.form_type}
                </p>
                <h2 className="mt-2 text-lg font-black text-deepBlue">{f.title}</h2>
                <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-500">{f.description}</p>
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
