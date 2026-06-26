import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Loader2, Receipt, ShoppingBag } from 'lucide-react'
import { getStudentOrders, type Order } from '@/api/checkoutApi'
import toast from '@/lib/toast'

const STATUS_AR: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'قيد الانتظار', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'   },
  paid:     { label: 'مدفوع',        cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  failed:   { label: 'فشل الدفع',   cls: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'      },
  cancelled:{ label: 'ملغى',         cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'  },
  refunded: { label: 'مسترد',        cls: 'bg-sky-50 text-sky-600 ring-1 ring-sky-200'         },
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency }).format(amount)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function StudentOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    getStudentOrders()
      .then(setOrders)
      .catch(() => toast.error('تعذّر تحميل الطلبات.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-customBlue/10">
            <Receipt size={20} className="text-customBlue" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-deepBlue">طلباتي وفواتيري</h1>
            <p className="text-sm text-deepBlue/50">سجل مدفوعاتك وفواتيرك</p>
          </div>
        </div>

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
                  className="rounded-2xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm"
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
                      <span className="font-black text-deepBlue">
                        {fmtCurrency(order.total, order.currency)}
                      </span>
                      <span className="text-deepBlue/40">
                        {fmtDate(order.paid_at ?? order.created_at)}
                      </span>
                    </div>

                    {order.invoice && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue/[0.07] px-3 py-1.5 text-xs font-black text-customBlue"
                        title={`صادرة: ${order.invoice.issued_at ?? ''}`}
                      >
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
    </div>
  )
}
