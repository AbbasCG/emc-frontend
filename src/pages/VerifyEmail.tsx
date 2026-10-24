import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AlertCircle, CheckCircle2, Clock, Loader2, MailCheck } from 'lucide-react'
import PublicSeo from '@/components/public/PublicSeo'
import { useAuth } from '@/contexts/AuthContext'
import { resendMyVerification } from '@/api/authApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { getDashboardPathByRole } from '@/utils/dashboardAccess'
import toast from '@/lib/toast'
import { parseVerifyEmailStatus, VERIFY_EMAIL_COPY } from '@/pages/verifyEmailStatus'

/**
 * /verify-email — where the backend sends the browser after someone opens the link in
 * their verification email. The backend does the real work (signature, expiry, hash);
 * this page only reports the outcome it put in `?status=`. It reads nothing else from
 * the URL, so there is no id, email or token here to leak or tamper with, and an unknown
 * or missing status is shown as an invalid link.
 */

const PRIMARY_BTN =
  'mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-3 font-extrabold text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const status = parseVerifyEmailStatus(searchParams.get('status'))
  const copy = VERIFY_EMAIL_COPY[status]
  const ok = status === 'success' || status === 'already'
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)

  async function requestNewLink() {
    if (requesting) return
    setRequesting(true)
    try {
      toast.success(await resendMyVerification())
      setRequested(true)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setRequesting(false)
    }
  }

  const Icon = ok ? (status === 'success' ? CheckCircle2 : MailCheck) : status === 'expired' ? Clock : AlertCircle
  const tone =
    ok ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
    : status === 'expired' ? 'bg-amber-50 text-amber-600 ring-amber-100'
    : 'bg-red-50 text-red-500 ring-red-100'

  return (
    <div className="bg-paper pt-20" dir="rtl">
      <PublicSeo title="توثيق البريد الإلكتروني" description="نتيجة توثيق البريد الإلكتروني لحسابك في منصة EMC." path="/verify-email" noIndex />
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-md rounded-3xl bg-white p-10 text-center shadow-emc-lg ring-1 ring-line"
          role="status"
          aria-live="polite"
          data-testid="verify-email-result"
          data-status={status}
        >
          <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ring-1 ${tone}`}>
            <Icon size={34} aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-xl font-black text-deepBlue">{copy.title}</h1>
          <p className="mt-2 text-base font-bold leading-relaxed text-muted-600">{copy.body}</p>

          {ok ?
            user ?
              <Link to={getDashboardPathByRole(user.role)} className={PRIMARY_BTN}>
                الانتقال إلى لوحة التحكم
              </Link>
            : <Link to="/login" className={PRIMARY_BTN}>
                تسجيل الدخول
              </Link>
          : user ?
            requested ?
              <p className="mt-6 text-sm font-bold text-emerald-700">تم إرسال رابط جديد إلى بريدك الإلكتروني.</p>
            : <button type="button" onClick={() => void requestNewLink()} disabled={requesting} aria-busy={requesting} className={PRIMARY_BTN}>
                {requesting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                طلب رابط جديد
              </button>
          : <>
              <p className="mt-6 text-sm font-bold text-muted-600">
                سجّل الدخول لطلب رابط جديد، أو تواصل مع الدعم إن احتجت مساعدة.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link to="/login" className="rounded-xl border border-ink-100 px-5 py-2.5 text-sm font-black text-deepBlue">
                  تسجيل الدخول
                </Link>
                <Link to="/contact" className="rounded-xl border border-ink-100 px-5 py-2.5 text-sm font-black text-deepBlue">
                  تواصل مع الدعم
                </Link>
              </div>
            </>
          }
        </div>
      </section>
    </div>
  )
}
