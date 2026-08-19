import { useState } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, GraduationCap, Loader2, Lock, Tag, X } from 'lucide-react'
import type { PublicEnrollCta } from '@/utils/publicCourseDetailCta'
import { PUBLIC_ENROLL_STUDENT_ONLY_MSG } from '@/utils/publicEnrollAuth'
import toast from '@/lib/toast'
import { initiateCheckout, validateCoupon, type CouponPricingPreview } from '@/api/checkoutApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { formatEuro } from '@/utils/currency'

type Props = {
  cta: PublicEnrollCta
  onScrollToEnroll?: () => void
  size?: 'md' | 'lg'
  className?: string
}

const sizeCls = {
  md: 'rounded-2xl px-6 py-3.5 text-sm',
  lg: 'rounded-2xl px-8 py-4 text-base',
}

const variantCls = {
  primary: 'bg-customOrange text-white hover:bg-accent-600',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  muted: 'cursor-not-allowed bg-slate-200 text-slate-500',
}

/** هل لديك رمز خصم؟ — apply/preview only, never trusted as the final price. Backend revalidates everything at actual checkout. */
function CouponSection({
  courseId,
  onApplied,
  onRemoved,
  applied,
}: {
  courseId: number
  onApplied: (preview: CouponPricingPreview) => void
  onRemoved: () => void
  applied: CouponPricingPreview | null
}) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  async function apply() {
    if (!code.trim()) return
    setChecking(true)
    setError('')
    try {
      const preview = await validateCoupon(courseId, code.trim())
      onApplied(preview)
      toast.success('تم تطبيق رمز الخصم بنجاح')
    } catch (err) {
      setError(getApiErrorMessage(err) || 'رمز الخصم غير صالح أو منتهي')
    } finally {
      setChecking(false)
    }
  }

  if (applied) {
    return (
      <div className="w-full max-w-xs rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-right">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => { onRemoved(); setCode(''); setOpen(false) }}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
          >
            <X size={12} /> إزالة رمز الخصم
          </button>
          <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700">
            <Check size={12} /> {applied.coupon.code}
          </span>
        </div>
        <dl className="mt-2 space-y-1 text-[11px] font-bold text-deepBlue/70">
          <div className="flex justify-between"><dt>السعر الأصلي</dt><dd>{applied.pricing.formatted_original}</dd></div>
          <div className="flex justify-between text-emerald-700"><dt>الخصم</dt><dd>- {applied.pricing.formatted_discount}</dd></div>
          <div className="flex justify-between text-sm font-black text-deepBlue"><dt>السعر النهائي</dt><dd>{applied.pricing.formatted_final}</dd></div>
        </dl>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-customBlue hover:underline"
      >
        <Tag size={12} /> هل لديك رمز خصم؟
      </button>
    )
  }

  return (
    <div className="w-full max-w-xs text-right">
      <div className="flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void apply() } }}
          placeholder="أدخل رمز الخصم"
          dir="ltr"
          className={`h-9 flex-1 rounded-lg border px-3 text-xs font-bold text-deepBlue outline-none ${error ? 'border-red-300' : 'border-slate-200 focus:border-customBlue'}`}
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={checking || !code.trim()}
          className="h-9 shrink-0 rounded-lg bg-deepBlue px-3 text-[11px] font-black text-white disabled:opacity-50"
        >
          {checking ? <Loader2 size={12} className="animate-spin" /> : 'تطبيق'}
        </button>
      </div>
      {error && <p className="mt-1 text-[10px] font-bold text-red-600">{error}</p>}
    </div>
  )
}

export default function PublicDetailCtaButton({
  cta,
  onScrollToEnroll,
  size = 'md',
  className = '',
}: Props) {
  const [checkingOut, setCheckingOut] = useState(false)
  const [coupon, setCoupon] = useState<CouponPricingPreview | null>(null)
  const cls = `inline-flex w-full items-center justify-center gap-2 font-black transition sm:w-auto ${sizeCls[size]} ${variantCls[cta.variant]} ${className}`

  if (cta.disabled) {
    return <span className={cls}>{cta.label}</span>
  }

  if (cta.checkout && cta.checkoutCourseId) {
    const courseId = cta.checkoutCourseId
    const handleCheckout = async () => {
      setCheckingOut(true)
      try {
        const result = await initiateCheckout(courseId, coupon?.coupon.code ?? null)
        if (result.free) {
          toast.success('تم إتمام تسجيلك في الدورة بنجاح — الخصم غطى كامل السعر.')
          window.location.href = '/dashboard/student/courses'
          return
        }
        if (result.checkout_url) {
          window.location.href = result.checkout_url
        }
      } catch (err) {
        // Single toast with the backend's actual reason (e.g. "already
        // enrolled" vs. "payment gateway unavailable") — initiateCheckout
        // sets skipErrorToast so the global interceptor doesn't also fire.
        toast.error(getApiErrorMessage(err) || 'تعذر بدء عملية الدفع. حاول مرة أخرى.')
        setCheckingOut(false)
      }
    }

    return (
      <div className="flex flex-col items-center gap-3">
        {cta.price != null && !coupon && (
          <div className="flex items-center gap-2 text-sm text-deepBlue/60">
            <Lock size={13} className="text-emerald-600" />
            <span className="font-black text-deepBlue">
              {formatEuro(cta.price, { locale: 'nl-NL', minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">دفع آمن</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={coupon ? 'applied' : 'input'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex w-full justify-center"
          >
            <CouponSection courseId={courseId} applied={coupon} onApplied={setCoupon} onRemoved={() => setCoupon(null)} />
          </motion.div>
        </AnimatePresence>

        <motion.button
          type="button"
          whileHover={{ scale: checkingOut ? 1 : 1.02 }}
          whileTap={{ scale: checkingOut ? 1 : 0.98 }}
          disabled={checkingOut}
          onClick={() => void handleCheckout()}
          className={`${cls} ${checkingOut ? 'opacity-70 cursor-wait' : ''}`}
        >
          {checkingOut ? (
            <>
              <Loader2 size={size === 'lg' ? 18 : 16} className="animate-spin" aria-hidden />
              جاري تحويلك إلى صفحة الدفع…
            </>
          ) : (
            <>
              <Lock size={size === 'lg' ? 18 : 16} aria-hidden />
              {cta.label}
              <ArrowLeft size={size === 'lg' ? 18 : 16} aria-hidden />
            </>
          )}
        </motion.button>
      </div>
    )
  }

  if (cta.href) {
    return (
      <Link to={cta.href} className={cls}>
        <GraduationCap size={size === 'lg' ? 20 : 18} aria-hidden />
        {cta.label}
        <ArrowLeft size={size === 'lg' ? 18 : 16} aria-hidden />
      </Link>
    )
  }

  if (cta.denyNonStudent) {
    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => toast.error(PUBLIC_ENROLL_STUDENT_ONLY_MSG)}
        className={cls}
      >
        <GraduationCap size={size === 'lg' ? 20 : 18} aria-hidden />
        {cta.label}
        <ArrowLeft size={size === 'lg' ? 18 : 16} aria-hidden />
      </motion.button>
    )
  }

  if (cta.scrollToEnroll) {
    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onScrollToEnroll}
        className={cls}
      >
        <GraduationCap size={size === 'lg' ? 20 : 18} aria-hidden />
        {cta.label}
        <ArrowLeft size={size === 'lg' ? 18 : 16} aria-hidden />
      </motion.button>
    )
  }

  return null
}
