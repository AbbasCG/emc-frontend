import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { CreditCard, Landmark, Loader2, Lock, Tag, Wallet, X } from 'lucide-react'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import toast from '@/lib/toast'
import PublicSeo from '@/components/public/PublicSeo'
import CheckoutSteps, { type CheckoutStep, type CheckoutStepId } from '@/components/checkout/CheckoutSteps'
import BankTransferPanel from '@/components/checkout/BankTransferPanel'
import { fetchCourseBySlug } from '@/api/coursesApi.public'
import { initiateCheckout, validateCoupon, type CouponPricingPreview } from '@/api/checkoutApi'
import { submitCourseRegistration } from '@/api/registrationsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { useAuth } from '@/contexts/AuthContext'
import { ALL_COUNTRIES } from '@/lib/countries'
import { buildPublicLoginHref } from '@/utils/publicEnrollAuth'
import { formatEuro } from '@/utils/currency'
import { formatNumberEn } from '@/utils/publicDetailFormat'
import { LAUNCH_PROMISE, OPEN_ENROLLMENT_LABEL, REFUND_LINE, seatsLine } from '@/data/webSpec'
import type { Course } from '@/types'

/**
 * /checkout/:slug — §9. Three progressive steps on ONE screen, no mandatory
 * account before payment, no dates anywhere (paid products are «تسجيل مفتوح»),
 * urgency by seats only and only when a real number exists.
 *
 * Every network call here is an EXISTING platform contract:
 *   · `fetchCourseBySlug`        GET  /courses/{slug}
 *   · `validateCoupon`           POST /courses/{id}/coupon/validate   (preview only)
 *   · `submitCourseRegistration` POST /courses/{id}/register          (carries identity + provider)
 *   · `initiateCheckout`         POST /courses/{id}/checkout          (coupon path + fallback)
 * No endpoint is invented here.
 */

type PaymentMethod = 'card' | 'paypal' | 'bank_transfer'

/** Countries where a local bank transfer replaces the card rails (§9). */
const LOCAL_TRANSFER_COUNTRIES = ['YE', 'SY', 'PS']

const STEPS: readonly CheckoutStep[] = [
  { id: 1, label: 'بياناتك' },
  { id: 2, label: 'الدفع' },
  { id: 3, label: 'التأكيد' },
]

/**
 * The public checkout session is created in the visitor's name, and the shared
 * axios interceptor signs the visitor out on a 401 — so a guest who fires the
 * call loses everything typed on this screen. Until the backend exposes a guest
 * checkout (email + WhatsApp only, per §9) we stop before that happens and offer
 * the one-step sign-in that returns straight back here.
 * SEAM: replace this branch with the guest-checkout call when it ships.
 */
const GUEST_PAYMENT_NOTICE =
  'الدفع بالبطاقة أو PayPal يتم عبر جلسة آمنة باسمك. سجّل الدخول لإكمال الدفع، وتعود إلى هذه الصفحة مباشرة.'

type FieldErrors = Partial<Record<'fullName' | 'email' | 'whatsapp' | 'country', string>>

type DisplayPrice = {
  amount: number
  formatted: string
}

/**
 * REGIONAL PRICING SEAM.
 *
 * The public course API exposes ONE price (`price` + `currency`) and no
 * per-country table, so changing the country cannot change the number today.
 * When the backend starts returning regional pricing, resolve it from
 * `_countryCode` here — this is the single place the displayed price is decided,
 * and every summary row already reads from it.
 */
function resolveDisplayPrice(course: Course, _countryCode: string): DisplayPrice {
  const amount = Number(course.price)
  const safeAmount = Number.isFinite(amount) ? amount : 0
  return {
    amount: safeAmount,
    formatted: formatEuro(safeAmount, { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
  }
}

/** Seats are urgency, dates are not (§1). Rendered only when both numbers are real. */
function resolveSeatsRemaining(course: Course | null): number | null {
  if (!course) return null
  const capacityRaw = course.capacity ?? course.seats_count
  const takenRaw = course.effective_enrollment_count ?? course.registrations_count
  // Both numbers must be genuinely present — a missing enrollment count would
  // turn capacity into a fabricated «seats left», which §1 forbids.
  if (capacityRaw == null || takenRaw == null) return null
  const capacity = Number(capacityRaw)
  const taken = Number(takenRaw)
  if (!Number.isFinite(capacity) || !Number.isFinite(taken)) return null
  const left = Math.trunc(capacity - taken)
  return left > 0 ? left : null
}

const labelCls = 'block text-sm font-black text-navy'
const inputCls = (invalid?: string) =>
  `mt-2 h-14 w-full rounded-xl border bg-paper2 px-4 text-right font-semibold text-navy outline-none transition duration-250 ease-emc focus:bg-white ${
    invalid ? 'border-danger' : 'border-line focus:border-customBlue'
  }`

export default function Checkout() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)

  const [step, setStep] = useState<CheckoutStepId>(1)
  const [reached, setReached] = useState<CheckoutStepId>(1)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  const [method, setMethod] = useState<PaymentMethod>('card')

  const [couponOpen, setCouponOpen] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponChecking, setCouponChecking] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPricingPreview | null>(null)

  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [transferPending, setTransferPending] = useState(false)

  // Load the program — P1 in docs/04-references/effect-patterns.md: every setState
  // happens after the await, and `fetchCourseBySlug` resolves to null on failure.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const found = slug ? await fetchCourseBySlug(slug) : null
      if (cancelled) return
      setCourse(found)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  // Prefill from the signed-in profile — render-phase adjustment (P2), never a
  // synchronous setState reachable from an effect.
  const [prefilledFor, setPrefilledFor] = useState<number | null>(null)
  if (user?.id != null && prefilledFor !== user.id) {
    setPrefilledFor(user.id)
    if (!fullName && user.name && user.name !== '—') setFullName(user.name)
    if (!email && user.email && user.email !== '—') setEmail(user.email)
    if (!whatsapp && user.phone) setWhatsapp(String(user.phone))
  }

  const selectedCountry = useMemo(
    () => ALL_COUNTRIES.find((c) => c.code === countryCode) ?? null,
    [countryCode],
  )
  const localTransferAvailable = LOCAL_TRANSFER_COUNTRIES.includes(countryCode)
  const price = course ? resolveDisplayPrice(course, countryCode) : null
  // §1.3 — the shared spec helper renders the line only for a real number.
  const seatsUrgency = seatsLine(resolveSeatsRemaining(course))
  const trainingHours = Number(course?.training_hours)
  const totalLabel =
    appliedCoupon ? appliedCoupon.pricing.formatted_final : (price?.formatted ?? '')
  const couponCoversAll = appliedCoupon != null && appliedCoupon.pricing.final_amount === 0

  function clearError(key: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validateDetails(): boolean {
    const next: FieldErrors = {}
    if (fullName.trim().length < 3) next.fullName = 'اكتب اسمك الكامل كما تريده على الشهادة'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = 'أدخل بريداً إلكترونياً صحيحاً'
    if (whatsapp.replace(/[^\d]/g, '').length < 7) next.whatsapp = 'أدخل رقم واتساب صحيحاً'
    if (!countryCode) next.country = 'اختر بلدك'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function goToPayment() {
    if (!validateDetails()) return
    setStep(2)
    setReached((r) => (r > 2 ? r : 2))
    // A country outside the local-transfer list can never keep that method selected.
    if (!LOCAL_TRANSFER_COUNTRIES.includes(countryCode) && method === 'bank_transfer') {
      setMethod('card')
    }
  }

  function goToConfirm() {
    setStep(3)
    setReached(3)
  }

  async function applyCoupon() {
    if (!course || !couponCode.trim() || couponChecking) return
    setCouponChecking(true)
    setCouponError('')
    try {
      const preview = await validateCoupon(course.id, couponCode.trim())
      setAppliedCoupon(preview)
      toast.success('تم تطبيق رمز الخصم')
    } catch (err) {
      setCouponError(getApiErrorMessage(err) || 'رمز الخصم غير صالح أو منتهي')
    } finally {
      setCouponChecking(false)
    }
  }

  /** POST /courses/{id}/checkout — the course-detail CTA path (coupon + fallback). */
  async function startCheckoutSession(code: string | null): Promise<boolean> {
    if (!course) return false
    const result = await initiateCheckout(course.id, code)
    if (result.free) {
      toast.success('تم تأكيد مقعدك — غطى رمز الخصم كامل القيمة.')
      navigate('/thank-you')
      return true
    }
    if (result.checkout_url) {
      window.location.assign(result.checkout_url)
      return true
    }
    return false
  }

  async function payNow() {
    if (!course || paying) return
    if (!isAuthenticated) {
      setPayError(GUEST_PAYMENT_NOTICE)
      return
    }
    setPaying(true)
    setPayError('')
    try {
      if (appliedCoupon) {
        // The coupon is only applied by the checkout endpoint — same call the
        // course-detail CTA makes, so the backend re-validates it once.
        const done = await startCheckoutSession(appliedCoupon.coupon.code)
        if (!done) setPayError('تعذر بدء عملية الدفع. حاول مرة أخرى.')
        return
      }

      try {
        // Preferred: the registration endpoint is the only call that carries the
        // certificate name, the contact details and the chosen provider.
        const registration = await submitCourseRegistration({
          course_id: course.id,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: `${selectedCountry?.dialCode ?? ''}${whatsapp.replace(/[^\d]/g, '')}`,
          city: '',
          gender: '',
          notes: '',
          country: selectedCountry?.name ?? '',
          country_code: countryCode,
          phone_country_code: selectedCountry?.dialCode ?? '',
          payment_provider: method === 'paypal' ? 'paypal' : 'stripe',
        })
        if (registration.checkout_url) {
          window.location.assign(registration.checkout_url)
          return
        }
        toast.success('تم تأكيد مقعدك')
        navigate('/thank-you')
        return
      } catch {
        // The lean §9 payload can be rejected for fields this screen deliberately
        // does not ask for, and an existing registration answers 409 — in both
        // cases the checkout endpoint still opens a valid paid session.
        const done = await startCheckoutSession(null)
        if (!done) setPayError('تعذر بدء عملية الدفع. حاول مرة أخرى.')
      }
    } catch (err) {
      setPayError(getApiErrorMessage(err) || 'تعذر بدء عملية الدفع. حاول مرة أخرى.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <main dir="rtl" className="bg-white pt-24">
        <div className="mx-auto w-full max-w-3xl px-4 py-20 text-right sm:px-6">
          <p className="text-sm font-black text-muted-500">جاري تجهيز طلبك</p>
        </div>
      </main>
    )
  }

  if (!course) {
    return (
      <main dir="rtl" className="bg-white pt-24">
        <PublicSeo title="إتمام الطلب" path="/checkout" noIndex />
        <div className="mx-auto w-full max-w-3xl px-4 py-20 text-right sm:px-6">
          <h1 className="font-display text-2xl font-black text-navy">لم نجد هذا البرنامج</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-ink-500">
            تأكد من الرابط، أو اختر برنامجك من الكتالوج.
          </p>
          <Link
            to="/courses"
            className="emc-focus-ring mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-navy px-6 text-sm font-black text-white"
          >
            استكشف البرامج
            <ArrowLeftIcon size={16} />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main dir="rtl" className="bg-white pb-24 pt-24">
      <PublicSeo title={`إتمام الطلب — ${course.title}`} path={`/checkout/${course.slug}`} noIndex />

      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        {/* Header — the product, its access price in context, and seats-only urgency */}
        <header className="text-right">
          <p className="text-xs font-black text-customBlue">إتمام الطلب</p>
          <h1 className="mt-2 font-display text-2xl font-black leading-snug text-navy sm:text-3xl">
            {course.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full border border-line px-3 py-1 text-xs font-black text-ink-500">
              {OPEN_ENROLLMENT_LABEL}
            </span>
            {Number.isFinite(trainingHours) && trainingHours > 0 ? (
              <span className="rounded-full border border-line px-3 py-1 text-xs font-black tabular-nums text-ink-500">
                {formatNumberEn(trainingHours)} ساعة تدريب
              </span>
            ) : null}
            {seatsUrgency ? (
              <span className="rounded-full border border-ember/40 px-3 py-1 text-xs font-black tabular-nums text-ember">
                {seatsUrgency}
              </span>
            ) : null}
          </div>
        </header>

        <div className="mt-8">
          <CheckoutSteps
            steps={STEPS}
            current={step}
            reached={reached}
            onSelect={(id) => setStep(id)}
          />
        </div>

        {/* ── Step 1 — بياناتك ───────────────────────────────────────────── */}
        <section className="mt-8 rounded-2xl border border-line bg-white p-5 text-right sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-black text-navy">بياناتك</h2>
            {step !== 1 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="emc-focus-ring text-xs font-black text-customBlue"
              >
                تعديل
              </button>
            )}
          </div>

          {step === 1 ? (
            <div className="mt-5 grid gap-5">
              <div>
                <label className={labelCls} htmlFor="checkout-full-name">
                  الاسم الكامل
                </label>
                <span className="mt-1 block text-xs font-bold text-muted-500">
                  كما سيظهر في الشهادة
                </span>
                <input
                  id="checkout-full-name"
                  value={fullName}
                  autoComplete="name"
                  onChange={(e) => {
                    setFullName(e.target.value)
                    clearError('fullName')
                  }}
                  className={inputCls(errors.fullName)}
                />
                {errors.fullName ? (
                  <p className="mt-1.5 text-xs font-bold text-danger">{errors.fullName}</p>
                ) : null}
              </div>

              <div>
                <label className={labelCls} htmlFor="checkout-email">
                  البريد الإلكتروني
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  dir="ltr"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearError('email')
                  }}
                  className={`${inputCls(errors.email)} text-left`}
                />
                {errors.email ? (
                  <p className="mt-1.5 text-xs font-bold text-danger">{errors.email}</p>
                ) : null}
              </div>

              <div>
                <label className={labelCls} htmlFor="checkout-whatsapp">
                  رقم واتساب
                </label>
                <span className="mt-1 block text-xs font-bold text-muted-500">
                  عليه يصلك تأكيد المقعد وموعد انطلاق دفعتك
                </span>
                <div
                  dir="ltr"
                  className={`mt-2 flex h-14 w-full overflow-hidden rounded-xl border bg-paper2 ${
                    errors.whatsapp ? 'border-danger' : 'border-line focus-within:border-customBlue'
                  }`}
                >
                  <span className="flex shrink-0 items-center border-r border-line px-3 text-sm font-black tabular-nums text-navy">
                    {selectedCountry?.dialCode ?? '+'}
                  </span>
                  <input
                    id="checkout-whatsapp"
                    type="tel"
                    dir="ltr"
                    value={whatsapp}
                    autoComplete="tel"
                    onChange={(e) => {
                      setWhatsapp(e.target.value)
                      clearError('whatsapp')
                    }}
                    className="min-w-0 flex-1 bg-transparent px-4 text-left font-semibold text-navy outline-none"
                  />
                </div>
                {errors.whatsapp ? (
                  <p className="mt-1.5 text-xs font-bold text-danger">{errors.whatsapp}</p>
                ) : null}
              </div>

              <div>
                <label className={labelCls} htmlFor="checkout-country">
                  البلد
                </label>
                <select
                  id="checkout-country"
                  value={countryCode}
                  onChange={(e) => {
                    setCountryCode(e.target.value)
                    clearError('country')
                  }}
                  className={`${inputCls(errors.country)} cursor-pointer appearance-none`}
                >
                  <option value="">اختر بلدك</option>
                  {ALL_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.country ? (
                  <p className="mt-1.5 text-xs font-bold text-danger">{errors.country}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={goToPayment}
                className="emc-focus-ring inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:brightness-[1.03]"
              >
                متابعة إلى الدفع
                <ArrowLeftIcon size={18} />
              </button>
            </div>
          ) : (
            <dl className="mt-4 grid gap-1 text-sm font-semibold text-ink-500">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-500">الاسم</dt>
                <dd className="truncate font-black text-navy">{fullName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-500">البريد</dt>
                <dd className="truncate font-black text-navy" dir="ltr">
                  {email}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-500">البلد</dt>
                <dd className="font-black text-navy">{selectedCountry?.name ?? ''}</dd>
              </div>
            </dl>
          )}
        </section>

        {/* ── Step 2 — الدفع ─────────────────────────────────────────────── */}
        <section className="mt-5 rounded-2xl border border-line bg-white p-5 text-right sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-black text-navy">الدفع</h2>
            {step === 3 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="emc-focus-ring text-xs font-black text-customBlue"
              >
                تعديل
              </button>
            )}
          </div>

          {step === 2 ? (
            <div className="mt-5 grid gap-3">
              {(
                [
                  { id: 'card' as const, label: 'بطاقة', icon: CreditCard, note: 'دفع آمن عبر بوابة البطاقات' },
                  { id: 'paypal' as const, label: 'PayPal', icon: Wallet, note: 'من حسابك على PayPal' },
                ]
              ).map((option) => {
                const Icon = option.icon
                const active = method === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMethod(option.id)}
                    aria-pressed={active}
                    className={`emc-focus-ring flex w-full items-center gap-3 rounded-xl border p-4 text-right transition duration-250 ease-emc ${
                      active ? 'border-customBlue bg-brand-50' : 'border-line bg-white'
                    }`}
                  >
                    <Icon size={20} className={active ? 'text-customBlue' : 'text-muted-500'} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-navy">{option.label}</span>
                      <span className="block text-xs font-bold text-muted-500">{option.note}</span>
                    </span>
                  </button>
                )
              })}

              {localTransferAvailable ? (
                <button
                  type="button"
                  onClick={() => setMethod('bank_transfer')}
                  aria-pressed={method === 'bank_transfer'}
                  className={`emc-focus-ring flex w-full items-center gap-3 rounded-xl border p-4 text-right transition duration-250 ease-emc ${
                    method === 'bank_transfer' ? 'border-customBlue bg-brand-50' : 'border-line bg-white'
                  }`}
                >
                  <Landmark
                    size={20}
                    className={method === 'bank_transfer' ? 'text-customBlue' : 'text-muted-500'}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-navy">تحويل بنكي محلي</span>
                    <span className="block text-xs font-bold text-muted-500">
                      متاح لبلدك — تأكيد المقعد بعد مطابقة التحويل
                    </span>
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={goToConfirm}
                className="emc-focus-ring mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:brightness-[1.03]"
              >
                متابعة إلى التأكيد
                <ArrowLeftIcon size={18} />
              </button>
            </div>
          ) : step === 3 ? (
            <p className="mt-4 text-sm font-black text-navy">
              {method === 'card' ? 'بطاقة' : method === 'paypal' ? 'PayPal' : 'تحويل بنكي محلي'}
            </p>
          ) : (
            <p className="mt-4 text-sm font-semibold text-muted-500">
              بطاقة أو PayPal، وتحويل بنكي محلي حيث يتوفر.
            </p>
          )}
        </section>

        {/* ── Step 3 — التأكيد ───────────────────────────────────────────── */}
        <section className="mt-5 rounded-2xl border border-line bg-white p-5 text-right sm:p-6">
          <h2 className="font-display text-lg font-black text-navy">التأكيد</h2>

          {step === 3 ? (
            <div className="mt-5 grid gap-6">
              {/* Order summary — the price never appears bare (§11) */}
              <dl className="grid gap-2 border-b border-line pb-5 text-sm font-semibold">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-500">البرنامج</dt>
                  <dd className="truncate font-black text-navy">{course.title}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-500">سعر EMC للوصول</dt>
                  <dd className="font-black tabular-nums text-navy" dir="ltr">
                    {price?.formatted}
                  </dd>
                </div>
                {appliedCoupon ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-500">رمز {appliedCoupon.coupon.code}</dt>
                    <dd className="font-black tabular-nums text-success" dir="ltr">
                      - {appliedCoupon.pricing.formatted_discount}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3 pt-2">
                  <dt className="font-black text-navy">الإجمالي</dt>
                  <dd className="font-display text-xl font-black tabular-nums text-navy" dir="ltr">
                    {totalLabel}
                  </dd>
                </div>
              </dl>

              {/* رمز الخصم — preview only; the backend re-validates at checkout */}
              <div>
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null)
                      setCouponCode('')
                      setCouponError('')
                      setCouponOpen(false)
                    }}
                    className="emc-focus-ring inline-flex items-center gap-1.5 text-xs font-black text-muted-500"
                  >
                    <X size={13} aria-hidden />
                    إزالة رمز الخصم
                  </button>
                ) : couponOpen ? (
                  <div>
                    <label className={labelCls} htmlFor="checkout-coupon">
                      رمز الخصم
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        id="checkout-coupon"
                        value={couponCode}
                        dir="ltr"
                        autoComplete="off"
                        onChange={(e) => {
                          setCouponCode(e.target.value)
                          setCouponError('')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void applyCoupon()
                          }
                        }}
                        className={`h-12 min-w-0 flex-1 rounded-xl border bg-paper2 px-3 text-left font-bold text-navy outline-none ${
                          couponError ? 'border-danger' : 'border-line focus:border-customBlue'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => void applyCoupon()}
                        disabled={couponChecking || !couponCode.trim()}
                        className="emc-focus-ring inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-navy px-5 text-xs font-black text-white disabled:opacity-50"
                      >
                        {couponChecking ? (
                          <Loader2 size={14} className="animate-spin" aria-hidden />
                        ) : (
                          'تطبيق'
                        )}
                      </button>
                    </div>
                    {couponError ? (
                      <p className="mt-1.5 text-xs font-bold text-danger">{couponError}</p>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCouponOpen(true)}
                    className="emc-cta-line text-xs"
                  >
                    <Tag size={13} aria-hidden />
                    لديك رمز خصم؟
                  </button>
                )}
              </div>

              {/* وعد الانطلاق — verbatim, from the single shared module */}
              <div className="rounded-xl border border-line bg-paper2 p-4 text-right">
                <p className="text-sm font-semibold leading-7 text-ink-500">{LAUNCH_PROMISE}</p>
                <p className="mt-3 text-sm font-black text-navy">{REFUND_LINE}</p>
              </div>

              {method === 'bank_transfer' ? (
                <BankTransferPanel
                  countryName={selectedCountry?.name ?? ''}
                  amountLabel={totalLabel}
                  programTitle={course.title}
                  payerName={fullName.trim()}
                  pending={transferPending}
                  onMarkTransferred={() => setTransferPending(true)}
                />
              ) : (
                <div>
                  {couponCoversAll ? (
                    <p className="mb-3 text-sm font-black text-success">
                      رمز الخصم يغطي كامل القيمة — لن تحتاج إلى الدفع.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void payNow()}
                    disabled={paying}
                    className="emc-focus-ring inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {paying ? (
                      <Loader2 size={18} className="animate-spin" aria-hidden />
                    ) : (
                      <Lock size={18} aria-hidden />
                    )}
                    {paying ? 'جاري تحويلك إلى الدفع' : 'ادفع وأكد مقعدك'}
                  </button>
                  {payError ? (
                    <div className="mt-3 rounded-xl border border-line bg-paper2 p-4">
                      <p className="text-sm font-bold leading-7 text-ink-500">{payError}</p>
                      {!isAuthenticated ? (
                        <Link
                          to={buildPublicLoginHref(`/checkout/${course.slug}`)}
                          className="emc-cta-line mt-2 text-xs"
                        >
                          تسجيل الدخول والعودة إلى هنا
                          <ArrowLeftIcon size={13} />
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm font-semibold text-muted-500">
              ملخص طلبك ووعد الانطلاق قبل الدفع.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
