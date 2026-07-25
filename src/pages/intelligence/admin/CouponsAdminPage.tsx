import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { CouponForm, ExportButton, IntelligencePageSkeleton } from '@/components/intelligence'
import EmptyState from '@/components/dashboard/EmptyState'
import { TicketPercent } from 'lucide-react'
import { createCoupon, fetchCoupons, updateCoupon } from '@/api/couponsApi'

import type { CouponRecord } from '@/types/intelligence'
import { formatEuroInteger } from '@/utils/currency'

export default function CouponsAdminPage() {
  const [rows, setRows] = useState<CouponRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editRow, setEditRow] = useState<CouponRecord | null>(null)

  /** Imperative (re)load from an event handler or a failed mutation — outside any
   *  effect, so flipping to the loading state synchronously is allowed. */
  async function load() {
    setLoadError(null)
    setLoading(true)
    try {
      setRows(await fetchCoupons())
    } catch {
      setLoadError('تعذّر تحميل الكوبونات. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  // First load — the initial state already carries `loading: true`, so every state
  // update here happens after the await (no cascading render from the effect body).
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await fetchCoupons()
        if (!alive) return
        setRows(data)
        setLoadError(null)
      } catch {
        if (alive) setLoadError('تعذّر تحميل الكوبونات. تحقق من الاتصال وأعد المحاولة.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  async function toggleActive(c: CouponRecord) {
    const next = !c.active
    setRows((list) => list.map((x) => (x.id === c.id ? { ...x, active: next } : x)))
    try {
      await updateCoupon(c.id, { active: next })
    } catch {
      await load()
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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-2xl font-black text-deepBlue">الكوبونات</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">إنشاء وتعديل وتفعيل أكواد الخصم</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton label="تصدير placeholder" onClick={() => {}} />
          <button
            type="button"
            onClick={() => {
              setEditRow(null)
              setModal('create')
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-xs font-black text-white shadow-md"
          >
            <Plus size={16} />
            كوبون جديد
          </button>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyState icon={TicketPercent} title="لا كوبونات" />
      ) : (
        <motion.div layout className="grid gap-4 lg:grid-cols-2">
          {rows.map((c) => (
            <motion.article
              key={c.id}
              layout
              className="rounded-2xl bg-white p-6 text-right shadow-lg ring-1 ring-deepBlue/[0.06]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-black ring-1 ${
                    c.active ? 'bg-emerald-50 text-emerald-800 ring-emerald-100' : 'bg-slate-100 text-slate-600 ring-slate-200'
                  }`}
                >
                  {c.active ? 'نشط' : 'موقوف'}
                </span>
                <div>
                  <p className="font-mono text-lg font-black text-customBlue">{c.code}</p>
                  <p className="mt-1 text-sm font-black text-deepBlue">{c.name}</p>
                  <p className="mt-2 text-[11px] font-bold text-slate-500">
                    {c.discount_type === 'percent' ? `${c.value}%` : formatEuroInteger(c.value, 'ar')} · {c.applies_to}
                  </p>
                  <p className="mt-2 text-[11px] font-bold text-slate-400">
                    استخدام {c.uses_count}/{c.max_uses ?? '∞'} · حتى {c.ends_at ?? '—'}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => toggleActive(c)}
                  className="rounded-xl bg-deepBlue/[0.06] px-4 py-2 text-[11px] font-black text-deepBlue"
                >
                  {c.active ? 'تعطيل' : 'تفعيل'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditRow(c)
                    setModal('edit')
                  }}
                  className="rounded-xl bg-customOrange px-4 py-2 text-[11px] font-black text-white"
                >
                  تعديل
                </button>
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {modal && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
            />
            <motion.div
              dir="rtl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[60] max-h-[90vh] w-[min(100%-2rem,520px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.35rem] bg-white p-6 shadow-2xl ring-1 ring-deepBlue/[0.08]"
            >
              <h2 className="mb-4 text-center text-lg font-black text-deepBlue">
                {modal === 'create' ? 'كوبون جديد' : 'تعديل الكوبون'}
              </h2>
              <CouponForm
                initial={editRow}
                onCancel={() => setModal(null)}
                onSubmit={async (values) => {
                  if (modal === 'create') {
                    try {
                      const created = await createCoupon(values)
                      setRows((r) => [...r, created])
                    } catch {
                      const id = Math.max(0, ...rows.map((x) => x.id)) + 1
                      setRows((r) => [...r, { ...values, id, uses_count: 0 } as CouponRecord])
                    }
                  } else if (editRow) {
                    try {
                      const u = await updateCoupon(editRow.id, values)
                      setRows((list) => list.map((x) => (x.id === editRow.id ? u : x)))
                    } catch {
                      setRows((list) => list.map((x) => (x.id === editRow.id ? { ...x, ...values } : x)))
                    }
                  }
                  setModal(null)
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
