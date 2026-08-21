import { useEffect, useRef, useState, type FormEvent } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  UserRound,
  X,
} from 'lucide-react'
import { getApiErrorMessage, getLaravelFieldErrors, withArabicValidationMessages } from '@/api/apiErrors'
import { checkoutLearningPath, enrollInLearningPath } from '@/api/learningPathsApi'
import { submitCourseRegistration } from '@/api/registrationsApi'
import CountrySelector, { COUNTRIES, type Country } from '@/components/ui/CountrySelector'
import PhoneInput from '@/components/forms/PhoneInput'
import { buildE164Phone } from '@/components/forms/phoneUtils'
import { useAuth } from '@/contexts/AuthContext'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { countryFromPhone } from '@/lib/countryFromPhone'
import type { EnrollIntent } from '@/lib/enrollIntent'
import { trackFunnelEvent } from '@/lib/funnelEvents'
import toast from '@/lib/toast'
import type { User } from '@/types'
import { normalizeRole } from '@/utils/dashboardAccess'
import { buildCourseDetailEnrollHref, isStudentUser } from '@/utils/publicEnrollAuth'
import { studentLearnHref } from '@/utils/studentLearnNavigation'

type Props = {
  intent: EnrollIntent
  onClose: () => void
}

/**
 * The flow: guest clicks enroll → three fields (name / email / password) →
 * account created → the recorded intent auto-executes (free course registration
 * or learning-path enrollment) → success state with a deep link into learning.
 * The visitor never leaves the page they were reading.
 *
 * `partial` = account is ready but the enrollment itself needs one more step on
 * the program page (e.g. profile fields the registration endpoint demands).
 * `non_student` = an authenticated non-student account clicked enroll — info
 * state that offers creating a student account instead of a dead-end toast.
 */
type Phase = 'register' | 'login' | 'executing' | 'success' | 'partial' | 'non_student'

const inputCls = (err?: string) =>
  `emc-focus-ring h-12 w-full rounded-xl border bg-paper2 px-4 text-start font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-brand-100 ${
    err ? 'border-red-400 focus:border-red-400' : 'border-line focus:border-customBlue'
  }`

const iconInputCls = (err?: string) => `${inputCls(err)} pe-11`

const PRIMARY_BTN_CLS =
  'emc-focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-sm font-black text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60'

export default function QuickJoinModalBody({ intent, onClose }: Props) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { t } = useTranslation()
  const { user, isAuthenticated, login, registerAccount } = useAuth()

  const [phase, setPhase] = useState<Phase>(() =>
    isAuthenticated && !isStudentUser(user?.role) ? 'non_student' : 'register',
  )

  // Three-field core.
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Progressive disclosure — revealed ONLY when the register API names them in a 422.
  const [reveal, setReveal] = useState({ phone: false, city: false, gender: false })
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [localPhone, setLocalPhone] = useState('')
  const [city, setCity] = useState('')
  const [gender, setGender] = useState('')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [partialHref, setPartialHref] = useState<string | null>(null)
  const [blockedRole, setBlockedRole] = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement | null>(null)
  const busy = submitting || phase === 'executing'

  // useFocusTrap keeps the latest onEscape closure, so `busy` is always current here.
  useFocusTrap(panelRef, {
    active: true,
    onEscape: () => {
      if (!busy) onClose()
    },
  })

  // A signed-in student never needs this modal — the gate lets students straight
  // through, so an intent landing here in that state is stale: dismiss it.
  useEffect(() => {
    if (isAuthenticated && user && isStudentUser(user.role)) onClose()
    // Mount-only guard: after in-modal auth succeeds the flow owns its own phases.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Async phase switches replace the focused control (submit button unmounts) —
  // pull focus back inside so the trap and screen readers stay anchored.
  useEffect(() => {
    if (phase !== 'success' && phase !== 'partial' && phase !== 'non_student') return
    const panel = panelRef.current
    if (!panel || panel.contains(document.activeElement)) return
    const target = panel.querySelector<HTMLElement>('a[href], button:not([disabled])')
    ;(target ?? panel).focus()
  }, [phase])

  function clearField(key: string) {
    setFieldErrors((prev) => ({ ...prev, [key]: '' }))
  }

  // Same convenience as Signup: typing a full international number auto-picks the country.
  function autofillCountryFromPhone() {
    if (selectedCountry) return
    const raw = localPhone.trim()
    if (!raw) return
    const candidate = raw.startsWith('+') ? raw : `+${raw}`
    const iso = countryFromPhone(candidate)
    if (!iso) return
    const match = COUNTRIES.find((c) => c.code === iso)
    if (match) {
      setSelectedCountry(match)
      clearField('country_code')
    }
  }

  /** The one happy ending — mark the funnel conversion, then show the success state. */
  function markSuccess() {
    trackFunnelEvent('quickjoin_success', { kind: intent.kind, slug: intent.slug })
    setPhase('success')
  }

  /** After auth succeeds, finish what the visitor actually came for. */
  async function executeIntent(authedUser: User) {
    setPhase('executing')

    if (intent.kind === 'course') {
      if (!intent.isFree) {
        // Paid course — hand over to the course page CTA (checkout / payment flow).
        onClose()
        toast.success(t('quickJoin.paidToast.title'), {
          description: t('quickJoin.paidToast.description'),
        })
        navigate(buildCourseDetailEnrollHref(intent.slug))
        return
      }
      if (!intent.id) {
        // No course PK on the intent — the register page finishes the free enrollment.
        onClose()
        navigate(`/courses/${intent.slug}/register`)
        return
      }
      try {
        await submitCourseRegistration({
          course_id: intent.id,
          full_name: authedUser.name,
          email: authedUser.email,
          phone:
            authedUser.phone ||
            (selectedCountry ? buildE164Phone(selectedCountry, localPhone) : localPhone.trim()),
          city: authedUser.city || city.trim(),
          gender: authedUser.gender || gender,
          notes: '',
          ...(selectedCountry
            ? {
                country: selectedCountry.name,
                country_code: selectedCountry.code,
                phone_country_code: selectedCountry.dialCode,
              }
            : {}),
        })
        markSuccess()
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          // Already registered — same happy destination.
          markSuccess()
          return
        }
        // Account is created; the course page's own form owns whatever is missing
        // (registration code, extra profile fields, …).
        setPartialHref(`/courses/${intent.slug}/register`)
        setPhase('partial')
      }
      return
    }

    // Learning path.
    try {
      if (!intent.isFree) {
        const checkout = await checkoutLearningPath(intent.slug)
        if (checkout.checkout_url) {
          window.location.assign(checkout.checkout_url)
          return
        }
        setPartialHref(`/learning-paths/${intent.slug}`)
        setPhase('partial')
        return
      }
      const result = await enrollInLearningPath(intent.slug)
      if (result.success || result.enrolled) {
        markSuccess()
        return
      }
      setPartialHref(`/learning-paths/${intent.slug}`)
      setPhase('partial')
    } catch {
      setPartialHref(`/learning-paths/${intent.slug}`)
      setPhase('partial')
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    trackFunnelEvent('quickjoin_submit', { kind: intent.kind, slug: intent.slug, free: intent.isFree })

    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = t('quickJoin.validation.nameRequired')
    if (!email.trim()) errs.email = t('quickJoin.validation.emailRequired')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = t('quickJoin.validation.emailInvalid')
    if (!password) errs.password = t('quickJoin.validation.passwordRequired')
    else if (password.length < 8) errs.password = t('quickJoin.validation.passwordMin')
    if (reveal.phone) {
      if (!selectedCountry) errs.country_code = t('quickJoin.validation.countryRequired')
      if (!localPhone.trim()) errs.phone = t('quickJoin.validation.phoneRequired')
    }
    if (reveal.city && !city.trim()) errs.city = t('quickJoin.validation.cityRequired')
    if (reveal.gender && !gender) errs.gender = t('quickJoin.validation.genderRequired')
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setFieldErrors({})
    setSubmitting(true)
    try {
      const { user: newUser } = await registerAccount({
        name: name.trim(),
        email: email.trim(),
        password,
        // Three visible fields only — confirmation mirrors the password.
        password_confirmation: password,
        ...(selectedCountry && localPhone.trim()
          ? {
              country_code: selectedCountry.code,
              phone_country_code: selectedCountry.dialCode,
              phone: buildE164Phone(selectedCountry, localPhone),
            }
          : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(gender ? { gender } : {}),
      })
      await executeIntent(newUser)
    } catch (err) {
      const raw = getLaravelFieldErrors(err)
      if (Object.keys(raw).length > 0) {
        // Funnel: which extra fields the register API actually demanded.
        const demanded: string[] = []
        if (raw.phone || raw.phone_country_code || raw.country_code || raw.country) demanded.push('phone')
        if (raw.city) demanded.push('city')
        if (raw.gender) demanded.push('gender')
        if (demanded.length > 0) {
          trackFunnelEvent('quickjoin_fields_expanded', {
            kind: intent.kind,
            slug: intent.slug,
            fields: demanded.join(','),
          })
        }
        // Progressive disclosure: expand ONLY the fields the server truly demands.
        setReveal((prev) => ({
          phone:
            prev.phone ||
            Boolean(raw.phone || raw.phone_country_code || raw.country_code || raw.country),
          city: prev.city || Boolean(raw.city),
          gender: prev.gender || Boolean(raw.gender),
        }))
        setFieldErrors(withArabicValidationMessages(raw))
      } else {
        setFormError(getApiErrorMessage(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    const errs: Record<string, string> = {}
    if (!email.trim()) errs.email = t('quickJoin.validation.emailRequired')
    if (!password) errs.password = t('quickJoin.validation.passwordRequired')
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setFieldErrors({})
    setSubmitting(true)
    try {
      const { user: authedUser } = await login(email.trim(), password)
      if (!isStudentUser(authedUser.role)) {
        setBlockedRole(typeof authedUser.role === 'string' ? authedUser.role : null)
        setPhase('non_student')
        return
      }
      await executeIntent(authedUser)
    } catch (err) {
      setFormError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function switchToStudentSignup() {
    // Fresh student account with a different email — keep the intent alive.
    setEmail('')
    setPassword('')
    setFieldErrors({})
    setFormError('')
    setPhase('register')
  }

  const roleRaw = blockedRole ?? (typeof user?.role === 'string' ? user.role : '')
  const roleLabel = roleRaw
    ? t(`quickJoin.roles.${normalizeRole(roleRaw) ?? ''}`, { defaultValue: roleRaw })
    : ''

  const startHref =
    intent.kind === 'course'
      ? intent.id
        ? studentLearnHref(intent.id)
        : '/dashboard/student'
      : intent.id
        ? `/dashboard/student/learning-paths/${intent.id}`
        : '/dashboard/student'

  const anyRevealed = reveal.phone || reveal.city || reveal.gender
  const kindLabel = intent.kind === 'path' ? t('quickJoin.kind.path') : t('quickJoin.kind.course')

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-join-title"
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <motion.div
        ref={panelRef}
        initial={reduceMotion ? false : { y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        onClick={(ev) => ev.stopPropagation()}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-emc-xl outline-none"
        dir="rtl"
      >
        {/* Navy header strip the program the visitor is joining, always in view. */}
        <div className="bg-navy px-7 pb-6 pt-5 text-start text-white">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-black tracking-wide text-ice/85">
              {t('quickJoin.header.eyebrow', { kind: kindLabel })}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="emc-focus-ring -me-1.5 rounded-lg p-1.5 text-ice/85 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              aria-label={t('quickJoin.close')}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <h2
            id="quick-join-title"
            className="mt-2 font-display text-xl font-black leading-snug tracking-tight"
          >
            {intent.title
              ? t('quickJoin.header.titleWithProgram', { title: intent.title })
              : t('quickJoin.header.title')}
          </h2>
          <p className="mt-2 text-xs font-bold text-ice/90">
            {intent.isFree ? (
              t('quickJoin.header.freeNote')
            ) : typeof intent.price === 'number' ? (
              <span dir="ltr" className="font-latin tabular-nums">
                {!intent.currency || intent.currency === 'EUR'
                  ? `€${intent.price}`
                  : `${intent.price} ${intent.currency}`}
              </span>
            ) : (
              t('quickJoin.header.stepNote')
            )}
          </p>
        </div>

        <div className="px-7 py-6 text-start">
          {phase === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              {formError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
                  {formError}
                </p>
              )}

              <label className="grid gap-2 text-sm font-black text-deepBlue">
                {t('quickJoin.form.name')}
                <span className="relative block">
                  <UserRound
                    size={18}
                    className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted-400"
                  />
                  <input
                    value={name}
                    autoComplete="name"
                    onChange={(e) => {
                      setName(e.target.value)
                      clearField('name')
                    }}
                    className={iconInputCls(fieldErrors.name)}
                  />
                </span>
                {fieldErrors.name && (
                  <span className="text-xs font-semibold text-red-600">{fieldErrors.name}</span>
                )}
              </label>

              <label className="grid gap-2 text-sm font-black text-deepBlue">
                {t('quickJoin.form.email')}
                <span className="relative block">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted-400"
                  />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      clearField('email')
                    }}
                    className={iconInputCls(fieldErrors.email)}
                  />
                </span>
                {fieldErrors.email && (
                  <span className="text-xs font-semibold text-red-600">{fieldErrors.email}</span>
                )}
              </label>

              <label className="grid gap-2 text-sm font-black text-deepBlue">
                {t('quickJoin.form.password')}
                <span className="relative block">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted-400"
                  />
                  <input
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      clearField('password')
                    }}
                    className={iconInputCls(fieldErrors.password)}
                  />
                </span>
                {fieldErrors.password && (
                  <span className="text-xs font-semibold text-red-600">{fieldErrors.password}</span>
                )}
              </label>

              {anyRevealed && (
                <>
                  <div className="emc-hairline" aria-hidden />
                  <p className="text-xs font-bold text-muted-500">
                    {t('quickJoin.form.extraFieldsNote')}
                  </p>
                </>
              )}

              {reveal.phone && (
                <>
                  <div className="grid gap-2 text-sm font-black text-deepBlue">
                    {t('quickJoin.form.country')}
                    <CountrySelector
                      value={selectedCountry}
                      onChange={(c) => {
                        setSelectedCountry(c)
                        clearField('country_code')
                      }}
                      error={fieldErrors.country_code}
                    />
                    {fieldErrors.country_code && (
                      <span className="text-xs font-semibold text-red-600">
                        {fieldErrors.country_code}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2 text-sm font-black text-deepBlue">
                    {t('quickJoin.form.phone')}
                    <div onBlur={autofillCountryFromPhone}>
                      <PhoneInput
                        country={selectedCountry}
                        value={localPhone}
                        onChange={(v) => {
                          setLocalPhone(v)
                          clearField('phone')
                        }}
                        error={fieldErrors.phone}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <span className="text-xs font-semibold text-red-600">{fieldErrors.phone}</span>
                    )}
                  </div>
                </>
              )}

              {reveal.city && (
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  {t('quickJoin.form.city')}
                  <span className="relative block">
                    <MapPin
                      size={18}
                      className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted-400"
                    />
                    <input
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value)
                        clearField('city')
                      }}
                      className={iconInputCls(fieldErrors.city)}
                    />
                  </span>
                  {fieldErrors.city && (
                    <span className="text-xs font-semibold text-red-600">{fieldErrors.city}</span>
                  )}
                </label>
              )}

              {reveal.gender && (
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  {t('quickJoin.form.gender')}
                  <span className="relative block">
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-400"
                    />
                    <select
                      value={gender}
                      onChange={(e) => {
                        setGender(e.target.value)
                        clearField('gender')
                      }}
                      className={`${inputCls(fieldErrors.gender)} appearance-none ps-9 ${gender ? 'text-deepBlue' : 'text-muted-400'}`}
                    >
                      <option value="" disabled>
                        {t('quickJoin.form.genderPlaceholder')}
                      </option>
                      <option value="male" className="text-deepBlue">
                        {t('quickJoin.form.genderMale')}
                      </option>
                      <option value="female" className="text-deepBlue">
                        {t('quickJoin.form.genderFemale')}
                      </option>
                    </select>
                  </span>
                  {fieldErrors.gender && (
                    <span className="text-xs font-semibold text-red-600">{fieldErrors.gender}</span>
                  )}
                </label>
              )}

              <button type="submit" disabled={submitting} aria-busy={submitting} className={PRIMARY_BTN_CLS}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {t('quickJoin.form.registerSubmitting')}
                  </>
                ) : (
                  t('quickJoin.form.registerSubmit')
                )}
              </button>

              <p className="pt-1 text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    trackFunnelEvent('quickjoin_login_switch', { kind: intent.kind, slug: intent.slug })
                    setFieldErrors({})
                    setFormError('')
                    setPhase('login')
                  }}
                  className="emc-cta-line emc-focus-ring text-sm"
                >
                  {t('quickJoin.form.switchToLogin')}
                </button>
              </p>
            </form>
          )}

          {phase === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {formError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
                  {formError}
                </p>
              )}

              <label className="grid gap-2 text-sm font-black text-deepBlue">
                {t('quickJoin.form.email')}
                <span className="relative block">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted-400"
                  />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      clearField('email')
                    }}
                    className={iconInputCls(fieldErrors.email)}
                  />
                </span>
                {fieldErrors.email && (
                  <span className="text-xs font-semibold text-red-600">{fieldErrors.email}</span>
                )}
              </label>

              <label className="grid gap-2 text-sm font-black text-deepBlue">
                {t('quickJoin.form.password')}
                <span className="relative block">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted-400"
                  />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      clearField('password')
                    }}
                    className={iconInputCls(fieldErrors.password)}
                  />
                </span>
                {fieldErrors.password && (
                  <span className="text-xs font-semibold text-red-600">{fieldErrors.password}</span>
                )}
              </label>

              <button type="submit" disabled={submitting} aria-busy={submitting} className={PRIMARY_BTN_CLS}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {t('quickJoin.form.loginSubmitting')}
                  </>
                ) : (
                  t('quickJoin.form.loginSubmit')
                )}
              </button>

              <p className="pt-1 text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setFieldErrors({})
                    setFormError('')
                    setPhase('register')
                  }}
                  className="emc-cta-line emc-focus-ring text-sm"
                >
                  {t('quickJoin.form.switchToRegister')}
                </button>
              </p>
            </form>
          )}

          {phase === 'executing' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center" aria-live="polite">
              <Loader2 className="h-9 w-9 animate-spin text-customBlue" aria-hidden />
              <p className="text-sm font-black text-deepBlue">{t('quickJoin.executing')}</p>
            </div>
          )}

          {phase === 'success' && (
            <div className="flex flex-col items-center gap-5 py-4 text-center" aria-live="polite">
              <CheckCircle2 className="h-14 w-14 text-success" aria-hidden strokeWidth={1.6} />
              <p className="font-display text-xl font-black leading-snug tracking-tight text-deepBlue">
                {intent.title
                  ? t('quickJoin.success.titleWithProgram', { title: intent.title })
                  : t('quickJoin.success.title')}
              </p>
              <Link to={startHref} onClick={onClose} className={PRIMARY_BTN_CLS}>
                {t('quickJoin.success.startLearning')}
              </Link>
              <Link
                to="/dashboard/student"
                onClick={onClose}
                className="emc-cta-line emc-focus-ring text-sm"
              >
                {t('quickJoin.success.browseDashboard')}
              </Link>
            </div>
          )}

          {phase === 'partial' && (
            <div className="flex flex-col items-center gap-5 py-4 text-center" aria-live="polite">
              <CheckCircle2 className="h-12 w-12 text-success" aria-hidden strokeWidth={1.6} />
              <div>
                <p className="font-display text-lg font-black tracking-tight text-deepBlue">
                  {t('quickJoin.partial.title')}
                </p>
                <p className="mt-2 text-sm font-bold leading-7 text-muted-500">
                  {t('quickJoin.partial.body', {
                    program: intent.title || t('quickJoin.partial.programFallback'),
                  })}
                </p>
              </div>
              <Link
                to={partialHref ?? '/dashboard/student'}
                onClick={onClose}
                className={PRIMARY_BTN_CLS}
              >
                {t('quickJoin.partial.complete')}
              </Link>
              <button type="button" onClick={onClose} className="emc-cta-line emc-focus-ring text-sm">
                {t('quickJoin.partial.later')}
              </button>
            </div>
          )}

          {phase === 'non_student' && (
            <div className="space-y-5 py-2">
              <div>
                <p className="font-display text-lg font-black tracking-tight text-deepBlue">
                  {t('quickJoin.nonStudent.title', { role: roleLabel ? ` (${roleLabel})` : '' })}
                </p>
                <p className="mt-2 text-sm font-bold leading-7 text-muted-500">
                  {t('quickJoin.nonStudent.body')}
                </p>
              </div>
              <button type="button" onClick={switchToStudentSignup} className={PRIMARY_BTN_CLS}>
                {t('quickJoin.nonStudent.createStudent')}
              </button>
              <p className="text-center">
                <button type="button" onClick={onClose} className="emc-cta-line emc-focus-ring text-sm">
                  {t('quickJoin.nonStudent.stay')}
                </button>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
