import axios from 'axios'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FlaskConical,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { fakeConfirmPayment, fakeFailPayment } from '@/api/paymentsApi'

export default function FakePayment() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const [searchParams] = useSearchParams()
  const provider = searchParams.get('provider') ?? 'fake'

  const idNum = useMemo(() => Number.parseInt(paymentId ?? '', 10), [paymentId])
  const invalidId = Number.isNaN(idNum) || idNum < 1

  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'ok' | 'fail' | null>(null)
  const [message, setMessage] = useState('')

  async function confirm() {
    if (invalidId) return
    setBusy(true)
    setMessage('')
    try {
      await fakeConfirmPayment(idNum)
      setDone('ok')
      setMessage('تم تأكيد الدفع التجريبي بنجاح.')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setMessage(err.response?.data?.message ?? 'فشل الطلب.')
      } else {
        setMessage('حدث خطأ غير متوقع.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function fail() {
    if (invalidId) return
    setBusy(true)
    setMessage('')
    try {
      await fakeFailPayment(idNum)
      setDone('fail')
      setMessage('تم تسجيل فشل الدفع (وضع تجريبي).')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setMessage(err.response?.data?.message ?? 'فشل الطلب.')
      } else {
        setMessage('حدث خطأ غير متوقع.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-[70vh] bg-emcBg px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl text-right">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[1.35rem] border border-deepBlue/10 bg-white shadow-[0_28px_70px_-28px_rgba(15,42,67,0.35)]"
        >
          <div className="border-b border-deepBlue/[0.06] bg-gradient-to-l from-deepBlue via-[#1a3350] to-deepBlue px-6 py-8 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-customOrange">
                  وضع التطوير المحلي
                </p>
                <h1 className="mt-2 text-2xl font-black leading-snug">محاكاة الدفع</h1>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  هذه الصفحة مخصصة للاختبار المحلي فقط (Fake payment). لا تُستخدم في الإنتاج.
                </p>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <FlaskConical className="text-customOrange" size={22} />
              </span>
            </div>
          </div>

          <div className="space-y-5 px-6 py-8">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
              <p className="text-xs font-black text-deepBlue/45">معرّف الدفعة</p>
              <p className="mt-1 font-mono text-lg font-black text-deepBlue">{invalidId ? '—' : idNum}</p>
              <p className="mt-2 text-xs font-bold text-deepBlue/50">
                مزوّد الدفع المختار: <span className="text-customBlue">{provider}</span>
              </p>
            </div>

            {invalidId && (
              <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-100">
                <AlertTriangle className="mt-0.5 shrink-0" size={20} />
                <p className="text-sm font-bold">معرّف الدفعة غير صالح أو مفقود.</p>
              </div>
            )}

            {!invalidId && !done && (
              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirm}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 size={18} />
                  تأكيد الدفع
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={fail}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                >
                  <XCircle size={18} />
                  فشل الدفع
                </button>
              </div>
            )}

            {done && (
              <div
                className={[
                  'flex gap-3 rounded-xl p-4 ring-1',
                  done === 'ok'
                    ? 'bg-emerald-50 text-emerald-900 ring-emerald-100'
                    : 'bg-red-50 text-red-900 ring-red-100',
                ].join(' ')}
              >
                {done === 'ok' ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                <div>
                  <p className="font-black">{message}</p>
                  <p className="mt-2 text-sm font-semibold opacity-80">
                    يمكنك العودة إلى الدورات أو لوحة التحكم لمتابعة الحالة.
                  </p>
                </div>
              </div>
            )}

            {message && !done && (
              <div className="rounded-xl bg-orange-50 px-4 py-3 text-sm font-bold text-customOrange ring-1 ring-orange-100">
                {message}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:opacity-95"
              >
                <CreditCard size={16} />
                العودة إلى الدورات
              </Link>
              <Link
                to="/dashboard/student"
                className="inline-flex items-center gap-2 rounded-xl border border-deepBlue/15 px-4 py-2.5 text-xs font-black text-deepBlue transition hover:bg-slate-50"
              >
                لوحة الطالب
                <ArrowLeft size={16} />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
