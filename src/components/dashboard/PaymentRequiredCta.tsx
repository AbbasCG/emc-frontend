import { CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { Course } from '@/types'
import type { StudentCourseAccess } from '@/api/studentApi'
import toast from '@/lib/toast'

type Props = {
  access: StudentCourseAccess | null
  course: Course
}

/**
 * Production hotfix — the primary action shown on a course card whenever the
 * backend's canonical access block says payment is required and not yet
 * completed. Never shows "ابدأ التعلم"/placement-test actions in this state.
 *
 * Navigates using the real stored checkout URL from the last Payment row
 * (access.payment_url) — the backend never re-creates a checkout session
 * here (POST /courses/{id}/checkout refuses once any non-cancelled
 * registration already exists), so resuming the existing session is the
 * only correct path once a paid-course registration has been created.
 */
export default function PaymentRequiredCta({ access, course }: Props) {
  const [busy, setBusy] = useState(false)
  const slug = course.slug?.trim()
  const detailHref = slug ? `/courses/${slug}` : '/dashboard/student/registrations'

  function handleClick() {
    if (busy) return // guard against double-click duplicate navigation
    const url = access?.payment_url
    if (!url) {
      toast.error('تعذّر العثور على رابط الدفع. يرجى التواصل مع الإدارة أو إعادة المحاولة من صفحة تفاصيل الدورة.')
      return
    }
    setBusy(true)
    window.location.href = url
  }

  const label =
    access?.block_reason === 'payment_pending' ? 'الدفع قيد المراجعة'
    : access?.block_reason === 'payment_failed' ? 'إعادة محاولة الدفع'
    : 'إكمال الدفع'

  // Payment under review — no action to take yet, nothing to click.
  if (access?.block_reason === 'payment_pending') {
    return (
      <div
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-[12px] font-black text-deepBlue/60"
        aria-label="الدفع قيد المراجعة"
      >
        <CreditCard className="h-4 w-4 opacity-70" aria-hidden />
        {label}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-customOrange to-[#d97f2c] px-4 py-2.5 text-[12px] font-black text-white shadow-md shadow-customOrange/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CreditCard className="h-4 w-4" aria-hidden />
        {busy ? 'جارٍ التحويل إلى الدفع...' : label}
      </button>
      {!access?.payment_url && (
        <Link
          to={detailHref}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-customOrange/45 bg-orange-50/50 px-4 py-2.5 text-[12px] font-black text-deepBlue transition hover:border-customOrange hover:bg-orange-50"
        >
          عرض تفاصيل الدورة
        </Link>
      )}
    </>
  )
}
