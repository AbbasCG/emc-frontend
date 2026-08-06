import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { CouponForm, ExportButton, IntelligencePageSkeleton } from '@/components/intelligence'
import EmptyState from '@/components/dashboard/EmptyState'
import { TicketPercent } from 'lucide-react'
import { createCoupon, fetchCoupon, fetchCoupons, updateCoupon } from '@/api/couponsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import toast from '@/lib/toast'

import type { CouponRecord, CouponStatus } from '@/types/intelligence'
import { formatEuroInteger } from '@/utils/currency'

const STATUS_LABEL: Record<CouponStatus, string> = { active: 'نشط', inactive: 'موقوف', draft: 'مسودة', archived: 'مؤرشف' }
const STATUS_CLS: Record<CouponStatus, string> = {
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  draft: 'bg-sky-50 text-sky-700 ring-sky-100',
  archived: 'bg-amber-50 text-amber-700 ring-amber-100',
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return d.slice(0, 10).split('-').reverse().join('-')
}

/** Locks background scroll while any modal/panel is open. */
function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [locked])
}

function CourseChips({ courses, count }: { courses?: { id: number; title: string }[]; count?: number }) {
  if (!courses || courses.length === 0) return <span className="text-[11px] font-semibold text-slate-400">جميع الدورات المدفوعة</span>
  const shown = courses.slice(0, 3)
  const remaining = (count ?? courses.length) - shown.length
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {shown.map((c) => (
        <span key={c.id} className="rounded-full bg-customBlue/10 px-2 py-0.5 text-[10px] font-black text-customBlue">{c.title}</span>
      ))}
      {remaining > 0 && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">+{remaining} أخرى</span>
      )}
    </div>
  )
}

/** Modal shell — centered via flexbox (not translate), matching the pattern used by ChartOfAccountsPage's create/edit modals. */
function ModalShell({ title, onClose, children, maxWidth = 'max-w-lg' }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  useScrollLock(true)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        dir="rtl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-[1.35rem] bg-white p-6 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-black text-deepBlue">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

function CouponDetailPanel({ coupon }: { coupon: CouponRecord }) {
  return (
    <div className="space-y-5 text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-4">
        <span className={`rounded-full px-3 py-1 text-[10px] font-black ring-1 ${STATUS_CLS[coupon.status]}`}>{STATUS_LABEL[coupon.status]}</span>
        <div>
          <p className="font-mono text-xl font-black text-customBlue">{coupon.code}</p>
          <p className="text-sm font-black text-deepBlue">{coupon.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 p-3">
          <p className="text-[10px] font-black uppercase text-slate-400">الخصم</p>
          <p className="mt-1 text-lg font-black text-deepBlue">
            {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatEuroInteger(coupon.discount_value, 'ar')}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 p-3">
          <p className="text-[10px] font-black uppercase text-slate-400">الاستخدام</p>
          <p className="mt-1 text-lg font-black text-deepBlue">{coupon.used_count} / {coupon.max_uses ?? '∞'}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-black uppercase text-slate-400">ينطبق على</p>
        {coupon.eligibility_type === 'selected_courses' && coupon.courses && coupon.courses.length > 0 ? (
          <ul className="space-y-1.5">
            {coupon.courses.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-deepBlue">
                <span>{c.price != null ? formatEuroInteger(c.price, 'ar') : '—'}</span>
                <span>{c.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-deepBlue">جميع الدورات المدفوعة</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-100 p-3">
        <p className="text-[10px] font-black uppercase text-slate-400">صالح من</p>
        <div className="mt-1 flex items-center justify-center gap-2 text-sm font-black text-deepBlue">
          <span>{fmtDate(coupon.starts_at)}</span>
          <span className="text-slate-300">↓</span>
          <span>{fmtDate(coupon.expires_at)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-slate-500">
        <div>
          <p className="text-slate-400">أنشأه</p>
          <p className="text-deepBlue">{coupon.created_by?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-slate-400">آخر تعديل بواسطة</p>
          <p className="text-deepBlue">{coupon.updated_by?.name ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-slate-400">تاريخ الإنشاء</p>
          <p className="text-deepBlue">{fmtDate(coupon.created_at)}</p>
        </div>
      </div>
    </div>
  )
}

export default function CouponsAdminPage() {
  const [rows, setRows] = useState<CouponRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editRow, setEditRow] = useState<CouponRecord | null>(null)
  const [detail, setDetail] = useState<CouponRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

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

  useEffect(() => {
    load()
  }, [])

  async function toggleActive(c: CouponRecord) {
    const next: CouponStatus = c.status === 'active' ? 'inactive' : 'active'
    setRows((list) => list.map((x) => (x.id === c.id ? { ...x, status: next } : x)))
    try {
      await updateCoupon(c.id, { status: next })
    } catch {
      await load()
    }
  }

  async function openDetail(id: number) {
    setDetailLoading(true)
    try {
      setDetail(await fetchCoupon(id))
    } catch (err) {
      toast.error(getApiErrorMessage(err) || 'تعذّر تحميل تفاصيل الكوبون')
    } finally {
      setDetailLoading(false)
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
          <h1 className="text-2xl font-black text-deepBlue">الخصومات والكوبونات</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">إنشاء وتعديل وتفعيل أكواد الخصم وربطها بالدورات</p>
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
              className="cursor-pointer rounded-2xl bg-white p-6 text-right shadow-lg ring-1 ring-deepBlue/[0.06] transition hover:ring-customBlue/30"
              onClick={() => void openDetail(c.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className={`rounded-full px-3 py-1 text-[10px] font-black ring-1 ${STATUS_CLS[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
                <div>
                  <p className="font-mono text-lg font-black text-customBlue">{c.code}</p>
                  <p className="mt-1 text-sm font-black text-deepBlue">{c.name}</p>
                  <p className="mt-2 text-[11px] font-bold text-slate-500">
                    {c.discount_type === 'percentage' ? `${c.discount_value}%` : formatEuroInteger(c.discount_value, 'ar')}
                  </p>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-1.5 text-[10px] font-black uppercase text-slate-400">ينطبق على</p>
                <CourseChips courses={c.courses} count={c.courses_count} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500">
                <span>الاستخدام: <b className="text-deepBlue">{c.used_count}/{c.max_uses ?? '∞'}</b></span>
                <span>المتبقي: <b className="text-deepBlue">{c.remaining_uses ?? '∞'}</b></span>
                <span>من: <b className="text-deepBlue">{fmtDate(c.starts_at)}</b></span>
                <span>إلى: <b className="text-deepBlue">{fmtDate(c.expires_at)}</b></span>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => void toggleActive(c)}
                  className="rounded-xl bg-deepBlue/[0.06] px-4 py-2 text-[11px] font-black text-deepBlue"
                >
                  {c.status === 'active' ? 'تعطيل' : 'تفعيل'}
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
          <ModalShell title={modal === 'create' ? 'كوبون جديد' : 'تعديل الكوبون'} onClose={() => setModal(null)} maxWidth="max-w-xl">
            <CouponForm
              initial={editRow}
              onCancel={() => setModal(null)}
              onSubmit={async (values) => {
                if (modal === 'create') {
                  try {
                    const created = await createCoupon(values)
                    setRows((r) => [...r, created])
                  } catch (err) {
                    toast.error(getApiErrorMessage(err) || 'تعذّر إنشاء الكوبون')
                    return
                  }
                } else if (editRow) {
                  try {
                    const u = await updateCoupon(editRow.id, values)
                    setRows((list) => list.map((x) => (x.id === editRow.id ? u : x)))
                  } catch (err) {
                    toast.error(getApiErrorMessage(err) || 'تعذّر تحديث الكوبون')
                    return
                  }
                }
                setModal(null)
              }}
            />
          </ModalShell>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(detail || detailLoading) && (
          <ModalShell title="تفاصيل الكوبون" onClose={() => setDetail(null)}>
            {detailLoading && !detail ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-customBlue/20 border-t-customBlue" />
              </div>
            ) : detail ? (
              <CouponDetailPanel coupon={detail} />
            ) : null}
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  )
}
