import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import EmptyState from '@/components/dashboard/EmptyState'
import { CheckCircle2, Handshake, Loader2, UserPlus } from 'lucide-react'
import { fetchPartnershipRequests, updatePartnershipRequest } from '@/api/partnersApi'
import type { PartnershipRequest } from '@/types/operations'
import toast from '@/lib/toast'

const STATUS_OPTIONS = [
  { value: 'new', label: 'جديد' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'archived', label: 'مؤرشف' },
] as const

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  under_review: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  archived: 'مؤرشف',
}

const LOAD_ERROR = 'تعذّر تحميل طلبات الشراكة. تحقق من الاتصال وأعد المحاولة.'

export default function OpsPartnershipRequestsPage() {
  const [items, setItems] = useState<PartnershipRequest[]>([])
  // Starts in the loading state, so the mount effect never has to flip it synchronously.
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchPartnershipRequests()
        if (!cancelled) setItems(rows)
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
      setItems(await fetchPartnershipRequests())
    } catch {
      setLoadError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  async function changeStatus(id: number, status: string) {
    const previous = items.find((item) => item.id === id)
    setUpdatingId(id)
    setItems((list) => list.map((item) => (item.id === id ? { ...item, status } : item)))
    try {
      const updated = await updatePartnershipRequest(id, status)
      setItems((list) => list.map((item) => (item.id === id ? updated : item)))
      toast.success(status === 'approved' ? 'تم اعتماد الشراكة وتجهيز حساب البوابة.' : 'تم تحديث حالة الطلب.')
    } catch (error) {
      if (previous) setItems((list) => list.map((item) => (item.id === id ? previous : item)))
      const message = error instanceof Error ? error.message : 'تعذر تحديث الطلب.'
      toast.error(message)
    } finally {
      setUpdatingId(null)
    }
  }

  function approveRequest(item: PartnershipRequest) {
    const accepted = window.confirm(
      `اعتماد طلب ${item.partner_name}؟ سيُنشأ ملف الشريك وحساب بوابته، ويضبط ممثل الجهة كلمة المرور من صفحة نسيت كلمة المرور.`,
    )
    if (accepted) void changeStatus(item.id, 'approved')
  }

  if (loading) return <OpsPageSkeleton />
  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void retry()} className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
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
                  {STATUS_LABELS[p.status] ?? p.status}
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
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
                <label className="grid gap-2 text-xs font-black text-deepBlue">
                  تحديث الحالة
                  <select
                    value={p.status === 'approved' ? 'approved' : p.status}
                    onChange={(e) => void changeStatus(p.id, e.target.value)}
                    disabled={updatingId === p.id || p.status === 'approved'}
                    className="min-w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold disabled:opacity-60"
                  >
                    {p.status === 'approved' && <option value="approved">معتمد</option>}
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </label>

                {p.status === 'approved' ? (
                  <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      ملف الشريك جاهز
                      {p.converted_user?.email && <span className="mt-1 block font-semibold" dir="ltr">{p.converted_user.email}</span>}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => approveRequest(p)}
                    disabled={updatingId === p.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-deepBlue px-4 py-2.5 text-xs font-black text-white disabled:opacity-60"
                  >
                    {updatingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
                    اعتماد وتجهيز البوابة
                  </button>
                )}
              </div>
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
