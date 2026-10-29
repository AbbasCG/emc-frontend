import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import axios from 'axios'
import FormRenderer from '@/components/operations/FormRenderer'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { fetchPublicFormBySlug, submitPublicForm } from '@/api/formsApi'
import { formatDateTime } from '@/utils/dateTime'
import type { OpsFormDefinition } from '@/types/operations'

/** A form that is a draft, archived or deleted answers 404 (a closed one answers with its state): say that, rather than blaming the connection. */
function loadMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return 'هذا النموذج غير متاح حالياً. قد يكون الرابط غير صحيح أو أن استقبال الإجابات متوقف.'
  }
  return 'تعذّر تحميل النموذج. تحقق من الاتصال وأعد المحاولة.'
}

export default function PublicFormPage() {
  // `/forms/:slug` is the address every form has; `/forms/:slug/s/:token` is the same form through a share link.
  const { slug, token } = useParams<{ slug: string; token?: string }>()
  const location = useLocation()
  const [form, setForm] = useState<OpsFormDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Re-arm the loading state during render when the slug changes (react.dev
  // "adjusting state when a prop changes"), so the fetch effect below never has to
  // touch state synchronously.
  const [seenSlug, setSeenSlug] = useState(slug)
  if (seenSlug !== slug) {
    setSeenSlug(slug)
    setLoading(true)
    setLoadError(null)
  }

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      try {
        const f = await fetchPublicFormBySlug(slug, token)
        if (!cancelled) setForm(f)
      } catch (e) {
        if (!cancelled) setLoadError(loadMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, token])

  if (!slug) return <p className="py-20 text-center font-black text-deepBlue">رابط غير صالح</p>
  if (loading) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl px-4 py-16">
        <OpsPageSkeleton />
      </div>
    )
  }
  if (loadError) return (
    <div dir="rtl" className="mx-auto max-w-xl px-4 py-16 text-center">
      <p role="alert" className="font-black text-rose-800">{loadError}</p>
    </div>
  )
  if (!form) return null

  // The form can be reached but not answered right now (closed, not open yet, ended, full, or it needs a signed-in
  // respondent). The server decides which; the page says it plainly instead of showing a form that would be refused.
  const availability = form.availability
  if (availability && availability.state !== 'open') {
    return (
      <div dir="rtl" className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-[1.35rem] bg-white p-8 text-center shadow-xl ring-1 ring-deepBlue/[0.06]" data-testid={`availability-${availability.state}`}>
          <h1 className="text-xl font-black text-deepBlue">{form.title}</h1>
          <p role="status" className="mt-4 text-sm font-bold leading-7 text-slate-600">{availability.message}</p>
          {availability.state === 'not_open_yet' && availability.opens_at && (
            <p className="mt-2 text-xs font-bold text-slate-500">يفتح في {formatDateTime(availability.opens_at)}</p>
          )}
          {availability.state === 'login_required' && (
            <Link to="/login" state={{ from: location.pathname }} className="mt-5 inline-flex rounded-xl bg-customBlue px-6 py-2.5 text-sm font-black text-white shadow-md">
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="mx-auto max-w-xl px-4 py-16">
      <FormRenderer form={form} onSubmitAnswers={(answers) => submitPublicForm(slug, answers, token)} />
    </div>
  )
}
