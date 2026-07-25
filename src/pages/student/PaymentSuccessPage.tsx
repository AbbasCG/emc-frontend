import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, FileText, GraduationCap, Loader2 } from 'lucide-react'
import api from '@/api/axios'

type Status = 'loading' | 'paid' | 'pending' | 'failed'

export default function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')
  const [status, setStatus] = useState<Status>('loading')
  const [invoiceId, setInvoiceId] = useState<number | null>(null)
  const attemptsRef = useRef(0)

  // Without a session id there is nothing to poll and the outcome can only be a
  // failure — derive it during render instead of setting it from the effect below.
  const displayStatus: Status = sessionId ? status : 'failed'

  useEffect(() => {
    if (!sessionId) return

    let cancelled = false

    async function poll() {
      try {
        const res = await api.get('/student/orders', { params: { session_id: sessionId } })
        const orders = res.data?.data ?? []
        // Find the order matching this session (by provider_session_id via order list)
        // We check the first paid order returned for this user, as the backend has it
        const paid = orders.find((o: { status: string }) => o.status === 'paid')
        const pending = orders.find((o: { status: string }) => o.status === 'pending')

        if (paid && !cancelled) {
          setStatus('paid')
          setInvoiceId(paid.invoice?.id ?? null)
          return
        }

        if (pending && attemptsRef.current < 8) {
          attemptsRef.current++
          if (!cancelled) setStatus('pending')
          setTimeout(poll, 3000)
          return
        }

        if (!cancelled) setStatus(paid ? 'paid' : 'pending')
      } catch {
        if (!cancelled) setStatus('failed')
      }
    }

    poll()
    return () => { cancelled = true }
  }, [sessionId])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl text-center"
      >
        {displayStatus === 'loading' && (
          <>
            <Loader2 className="mx-auto mb-4 size-12 animate-spin text-customBlue" />
            <h1 className="text-xl font-black text-deepBlue">جاري التحقق من الدفع…</h1>
            <p className="mt-2 text-sm text-deepBlue/50">يرجى الانتظار</p>
          </>
        )}

        {displayStatus === 'pending' && (
          <>
            <Clock className="mx-auto mb-4 size-12 text-amber-500" />
            <h1 className="text-xl font-black text-deepBlue">جاري تأكيد الدفع</h1>
            <p className="mt-2 text-sm text-deepBlue/60">
              قد يستغرق ذلك بضع ثوانٍ، سنعلمك فور اكتمال التسجيل.
            </p>
            <Loader2 className="mx-auto mt-4 size-5 animate-spin text-amber-500" />
          </>
        )}

        {displayStatus === 'paid' && (
          <>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <CheckCircle2 className="mx-auto mb-4 size-16 text-emerald-500" />
            </motion.div>
            <h1 className="text-2xl font-black text-deepBlue">تم الدفع بنجاح!</h1>
            <p className="mt-2 text-sm text-deepBlue/60">تم تسجيلك في الدورة. يمكنك البدء بالتعلم الآن.</p>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                to="/dashboard/student/courses"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-customBlue px-6 py-3.5 font-black text-white shadow-lg shadow-customBlue/25 transition hover:bg-customBlue/90"
              >
                <GraduationCap size={18} />
                الذهاب إلى دوراتي
              </Link>

              {invoiceId && (
                <Link
                  to="/dashboard/student/orders"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-deepBlue/10 bg-slate-50 px-6 py-3.5 font-black text-deepBlue transition hover:bg-slate-100"
                >
                  <FileText size={18} />
                  عرض الفاتورة
                </Link>
              )}
            </div>
          </>
        )}

        {displayStatus === 'failed' && (
          <>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-rose-50">
              <span className="text-3xl">✕</span>
            </div>
            <h1 className="text-xl font-black text-deepBlue">تعذّر تأكيد الدفع</h1>
            <p className="mt-2 text-sm text-deepBlue/60">
              إذا تم خصم المبلغ، سيتم استرداده تلقائيًا. يرجى التواصل مع الدعم إذا استمرت المشكلة.
            </p>
            <Link
              to="/courses"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-customOrange px-6 py-3.5 font-black text-white transition hover:bg-customOrange/90"
            >
              العودة إلى الدورات
            </Link>
          </>
        )}
      </motion.div>
    </div>
  )
}
