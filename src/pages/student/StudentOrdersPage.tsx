import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, FileText, Loader2, Receipt, ShoppingBag, TrendingUp, X, XCircle } from 'lucide-react'
import { getStudentOrders, type Order } from '@/api/checkoutApi'
import toast from '@/lib/toast'
import { fmtDate } from '@/components/lms/lmsFormatters'

const STATUS_AR: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'قيد الانتظار', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'   },
  paid:     { label: 'مدفوع',        cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  failed:   { label: 'فشل الدفع',   cls: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'      },
  cancelled:{ label: 'ملغى',         cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'  },
  refunded: { label: 'مسترد',        cls: 'bg-sky-50 text-sky-600 ring-1 ring-sky-200'         },
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}


function KpiCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string; accent?: string
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm border-t-[3px] ${accent ?? 'border-t-customBlue'}`}>
      <div className="flex items-center gap-2 text-deepBlue/40">
        <Icon size={15} />
        <span className="text-[11px] font-black uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-black text-deepBlue" dir="ltr">{value}</p>
    </div>
  )
}

export default function StudentOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getStudentOrders()
      .then(setOrders)
      .catch(() => toast.error('تعذّر تحميل الطلبات.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const paid      = orders.filter((o) => o.status === 'paid')
  const totalPaid = paid.reduce((s, o) => s + Number(o.total), 0)
  const defaultCurrency = orders[0]?.currency ?? 'EUR'
  const failedCount = orders.filter((o) => ['failed', 'cancelled'].includes(o.status)).length

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-customBlue/10">
            <Receipt size={20} className="text-customBlue" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-deepBlue">طلباتي وفواتيري</h1>
            <p className="text-sm text-deepBlue/50">سجل مدفوعاتك وفواتيرك</p>
          </div>
        </div>

        {!loading && orders.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <KpiCard icon={TrendingUp}   label="إجمالي المدفوع" value={fmtCurrency(totalPaid, defaultCurrency)} accent="border-t-emerald-400" />
            <KpiCard icon={CheckCircle2} label="طلبات مكتملة"   value={String(paid.length)}                      accent="border-t-customBlue"  />
            <KpiCard icon={XCircle}      label="فاشلة / ملغاة"  value={String(failedCount)}                      accent="border-t-rose-400"    />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-8 animate-spin text-customBlue" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-deepBlue/10 bg-white py-20 text-center">
            <ShoppingBag size={40} className="text-deepBlue/20" />
            <p className="font-black text-deepBlue/40">لا توجد طلبات بعد</p>
            <p className="text-sm text-deepBlue/30">عند تسجيلك في دورة مدفوعة ستظهر هنا</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order, i) => {
              const st = STATUS_AR[order.status] ?? STATUS_AR.pending
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelected(order)}
                  className="cursor-pointer rounded-2xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-deepBlue">
                        {order.course?.title ?? 'دورة'}
                      </p>
                      <p className="mt-0.5 text-xs text-deepBlue/40" dir="ltr">
                        {order.order_number}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-deepBlue/[0.05] pt-3">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-black text-deepBlue" dir="ltr">
                        {fmtCurrency(order.total, order.currency)}
                      </span>
                      <span className="text-deepBlue/40">
                        {fmtDate(order.paid_at ?? order.created_at)}
                      </span>
                    </div>

                    {order.invoice && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue/[0.07] px-3 py-1.5 text-xs font-black text-customBlue">
                        <FileText size={13} />
                        {order.invoice.invoice_number}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50" onClick={() => setSelected(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-white shadow-2xl"
              dir="rtl"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-deepBlue/[0.06] bg-white/90 p-5 backdrop-blur-sm">
                <h2 className="font-black text-deepBlue">تفاصيل الطلب</h2>
                <button onClick={() => setSelected(null)} className="flex size-8 items-center justify-center rounded-full hover:bg-slate-100">
                  <X size={16} className="text-deepBlue/50" />
                </button>
              </div>
              <div className="space-y-5 p-5">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                  <span className="text-sm text-deepBlue/50">الحالة</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${(STATUS_AR[selected.status] ?? STATUS_AR.pending).cls}`}>
                    {(STATUS_AR[selected.status] ?? STATUS_AR.pending).label}
                  </span>
                </div>
                <DrawerSection title="الطلب">
                  <DrawerRow label="رقم الطلب"  value={selected.order_number} mono />
                  <DrawerRow label="الدورة"     value={selected.course?.title ?? '—'} />
                  <DrawerRow label="المبلغ"     value={fmtCurrency(selected.total, selected.currency)} />
                  <DrawerRow label="تاريخ الدفع" value={fmtDate(selected.paid_at)} />
                </DrawerSection>
                {selected.invoice && (
                  <DrawerSection title="الفاتورة">
                    <DrawerRow label="رقم الفاتورة" value={selected.invoice.invoice_number} mono />
                    <DrawerRow label="تاريخ الإصدار" value={fmtDate(selected.invoice.issued_at)} />
                  </DrawerSection>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-deepBlue/30">{title}</p>
      <div className="divide-y divide-deepBlue/[0.05] overflow-hidden rounded-2xl border border-deepBlue/[0.07] bg-white">
        {children}
      </div>
    </div>
  )
}

function DrawerRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
      <span className="text-xs text-deepBlue/40">{label}</span>
      <span className={`text-xs font-semibold text-deepBlue ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
