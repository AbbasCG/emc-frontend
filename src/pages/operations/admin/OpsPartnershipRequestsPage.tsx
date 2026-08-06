import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { Handshake } from 'lucide-react'
import { fetchPartnershipRequests, updatePartnershipRequest } from '@/api/partnersApi'
import type { PartnershipRequest } from '@/types/operations'

const PIPELINE = ['قيد المراجعة', 'بانتظار الرد', 'مقبول مبدئياً', 'مرفوض', 'مكتمل']

export default function OpsPartnershipRequestsPage() {
  const [items, setItems] = useState<PartnershipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      setItems(await fetchPartnershipRequests())
    } catch {
      setLoadError('تعذّر تحميل طلبات الشراكة. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function changeStatus(id: number, status: string) {
    setItems((list) => list.map((x) => (x.id === id ? { ...x, status } : x)))
    try {
      await updatePartnershipRequest(id, status)
    } catch {
      /* revert optional */
    }
  }

  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
    </div>
  )

  return (
    <div className="space-y-8">
      <header className="rounded-[1.35rem] bg-gradient-to-bl from-deepBlue to-[#162536] p-8 text-right text-white shadow-xl ring-1 ring-white/10">
        <h1 className="text-2xl font-black">خط أنابيب طلبات الشراكة</h1>
        <p className="mt-2 text-sm font-semibold text-white/70">
          تحديث الحالة، تتبع رسائل المؤسسات، وتنسيق الرد مع فريق العمليات.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState icon={Handshake} title="لا طلبات جديدة" />
      ) : (
        <motion.ul layout className="space-y-4">
          {items.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl bg-white p-6 text-right shadow-md ring-1 ring-deepBlue/[0.06]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black text-customBlue ring-1 ring-sky-100">
                  {p.status}
                </span>
                <div>
                  <h2 className="text-lg font-black text-deepBlue">{p.partner_name}</h2>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">
                    {p.contact_name} · {p.email}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-600 line-clamp-2">{p.message}</p>
                  <p className="mt-2 text-[10px] font-bold text-slate-400">{p.created_at}</p>
                </div>
              </div>
              <label className="mt-4 grid gap-2 text-xs font-black text-deepBlue">
                تحديث الحالة
                <select
                  value={p.status}
                  onChange={(e) => changeStatus(p.id, e.target.value)}
                  className="max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold"
                >
                  {PIPELINE.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {/* keep current if custom */}
                  {!PIPELINE.includes(p.status) && <option value={p.status}>{p.status}</option>}
                </select>
              </label>
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
