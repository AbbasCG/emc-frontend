import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ScholarshipDecisionPanel, IntelligencePageSkeleton } from '@/components/intelligence'
import EmptyState from '@/components/dashboard/EmptyState'
import { GraduationCap } from 'lucide-react'
import { fetchScholarships, updateScholarshipStatus } from '@/api/scholarshipsApi'

import type { ScholarshipApplication, ScholarshipStatus } from '@/types/intelligence'
import { formatEuroInteger } from '@/utils/currency'

const TYPE_AR = { full: 'منحة كاملة', partial: 'منحة جزئية' } as const
const ST_AR: Record<ScholarshipStatus, string> = {
  pending: 'قيد المراجعة',
  accepted: 'مقبولة',
  rejected: 'مرفوضة',
}

export default function ScholarshipsAdminPage() {
  const [rows, setRows] = useState<ScholarshipApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      setRows(await fetchScholarships())
    } catch {
      setLoadError('تعذّر تحميل المنح. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onDecision(id: number, status: ScholarshipStatus) {
    setBusyId(id)
    setRows((list) => list.map((x) => (x.id === id ? { ...x, status } : x)))
    try {
      const u = await updateScholarshipStatus(id, status)
      setRows((list) => list.map((x) => (x.id === id ? u : x)))
    } catch {
      await load()
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <IntelligencePageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )

  return (
    <div className="space-y-8">
      <header className="text-right">
        <h1 className="text-2xl font-black text-deepBlue">المنح</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">قرارات قبول ورفض مع تتبع العربية المؤسسية</p>
      </header>

      {rows.length === 0 ? (
        <EmptyState icon={GraduationCap} title="لا طلبات منح" />
      ) : (
        <motion.ul layout className="space-y-4">
          {rows.map((s) => (
            <motion.li
              key={s.id}
              layout
              className="rounded-2xl bg-white p-6 text-right shadow-lg ring-1 ring-deepBlue/[0.06]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black text-customBlue ring-1 ring-sky-100">
                  {ST_AR[s.status]}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black text-deepBlue">{s.applicant_name}</h2>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">{s.email}</p>
                  <p className="mt-3 text-sm font-bold text-deepBlue">
                    {TYPE_AR[s.type]}
                    {s.type === 'partial' && s.discount_percent != null && (
                      <span className="mr-2 text-customOrange"> · خصم {s.discount_percent}%</span>
                    )}
                    {s.type === 'full' && s.amount != null && (
                      <span className="mr-2 text-customOrange"> · قيمة {formatEuroInteger(s.amount, 'ar')}</span>
                    )}
                  </p>
                  <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-600">{s.reason}</p>
                  <p className="mt-2 text-[10px] font-bold text-slate-400">{s.created_at}</p>
                </div>
              </div>
              <ScholarshipDecisionPanel row={s} busy={busyId === s.id} onDecision={onDecision} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
