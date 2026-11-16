import { useEffect, useId, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AlertCircle, Eye, EyeOff, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react'
import { changePassword } from '@/api/authApi'
import { getApiErrorMessage, getLaravelFieldErrors, withArabicValidationMessages } from '@/api/apiErrors'
import { useAuth } from '@/contexts/AuthContext'
import { getPostLoginRedirect } from '@/utils/dashboardAccess'

/**
 * The only page a user with `must_change_password` can use (see ProtectedRoute / the axios 403 handler).
 *
 * The rules mirror the registration and reset-password forms: at least 8 characters, a strength hint, and a
 * confirmation that must match. The server has the final word (wrong temporary password, weak password): its 422
 * messages are shown under the field they belong to.
 */

const MIN_LENGTH = 8

type Strength = { score: 0 | 1 | 2 | 3; label: string; bar: string; text: string }

function evaluateStrength(password: string): Strength {
  if (!password) return { score: 0, label: '', bar: '', text: '' }
  let points = 0
  if (password.length >= MIN_LENGTH) points++
  if (password.length >= 12) points++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points++
  if (/\d/.test(password)) points++
  if (/[^A-Za-z0-9]/.test(password)) points++

  if (points <= 1) return { score: 1, label: 'كلمة مرور ضعيفة', bar: 'bg-red-500', text: 'text-red-600' }
  if (points <= 3) return { score: 2, label: 'كلمة مرور متوسطة', bar: 'bg-amber-500', text: 'text-amber-600' }
  return { score: 3, label: 'كلمة مرور قوية', bar: 'bg-emerald-500', text: 'text-emerald-600' }
}

type FieldKey = 'current_password' | 'password' | 'password_confirmation'

function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete,
  hint,
  onBlur,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  autoComplete: string
  hint?: React.ReactNode
  onBlur?: () => void
}) {
  const id = useId()
  const errorId = `${id}-error`
  const [visible, setVisible] = useState(false)

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-black text-deepBlue">
        {label}
      </label>
      <div className="relative">
        <LockKeyhole size={20} aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          dir="ltr"
          className={`h-14 w-full rounded-xl border bg-slate-50 pr-12 pl-12 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 ${
            error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-customBlue focus:ring-sky-100'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `إخفاء ${label}` : `إظهار ${label}`}
          aria-pressed={visible}
          className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-customBlue focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40"
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {error ?
        <p id={errorId} className="text-[12px] font-bold text-red-600" role="alert">
          {error}
        </p>
      : null}
      {hint}
    </div>
  )
}

export default function ChangePasswordRequired() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const previous = document.title
    document.title = 'تغيير كلمة المرور | EMC'
    return () => {
      document.title = previous
    }
  }, [])

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [serverErrors, setServerErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const strength = useMemo(() => evaluateStrength(next), [next])
  const tooShort = next.length > 0 && next.length < MIN_LENGTH
  const mismatch = confirmTouched && confirmation.length > 0 && next !== confirmation
  const canSubmit = current.length > 0 && next.length >= MIN_LENGTH && next === confirmation && !submitting

  const fieldErrors: Partial<Record<FieldKey, string>> = {
    ...serverErrors,
    ...(tooShort ? { password: `كلمة المرور يجب ألا تقل عن ${MIN_LENGTH} أحرف.` } : null),
    ...(mismatch ? { password_confirmation: 'تأكيد كلمة المرور غير مطابق.' } : null),
  }

  function edit(setter: (v: string) => void, field: FieldKey) {
    return (v: string) => {
      setter(v)
      setServerErrors((cur) => (cur[field] ? { ...cur, [field]: undefined } : cur))
      setFormError('')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setConfirmTouched(true)
    if (!canSubmit) return

    setSubmitting(true)
    setServerErrors({})
    setFormError('')
    try {
      await changePassword({ current_password: current, password: next, password_confirmation: confirmation })

      // The server clears the flag; /auth/me is how the app learns it. Only a user it no longer flags may leave.
      const fresh = await refreshUser()
      if (!fresh || fresh.must_change_password === true) {
        setFormError('تم تغيير كلمة المرور، لكن تعذّر تحديث الجلسة. سجّل الخروج ثم ادخل بكلمة المرور الجديدة.')
        return
      }

      const from = (location.state as { from?: string } | null)?.from
      navigate(getPostLoginRedirect(fresh, from && from.startsWith('/') && !from.startsWith('//') ? from : null), { replace: true })
    } catch (err) {
      const fields = withArabicValidationMessages(getLaravelFieldErrors(err))
      const known: Partial<Record<FieldKey, string>> = {}
      if (fields.current_password) known.current_password = fields.current_password
      if (fields.password) known.password = fields.password
      if (fields.password_confirmation) known.password_confirmation = fields.password_confirmation

      if (Object.keys(known).length > 0) setServerErrors(known)
      else setFormError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-right shadow-emc-lg ring-1 ring-line sm:p-10">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-customBlue/10 text-customBlue">
          <ShieldCheck size={28} aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-black tracking-tight text-deepBlue">اختر كلمة مرور جديدة</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          {user?.name ? `مرحبًا ${user.name}. ` : ''}
          دخلت بكلمة مرور مؤقتة أُرسلت إليك. لحماية حسابك، اختر كلمة مرور خاصة بك قبل متابعة استخدام المنصة.
        </p>

        {formError ?
          <div className="mt-5 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-700 ring-1 ring-red-100" role="alert">
            <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-bold">{formError}</p>
          </div>
        : null}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-7 grid gap-5" noValidate>
          <PasswordField
            label="كلمة المرور المؤقتة"
            value={current}
            onChange={edit(setCurrent, 'current_password')}
            error={fieldErrors.current_password}
            autoComplete="current-password"
          />

          <PasswordField
            label="كلمة المرور الجديدة"
            value={next}
            onChange={edit(setNext, 'password')}
            error={fieldErrors.password}
            autoComplete="new-password"
            hint={
              next.length > 0 && !tooShort ?
                <div aria-live="polite">
                  <div className="flex gap-1.5" aria-hidden="true">
                    {[1, 2, 3].map((step) => (
                      <span key={step} className={`h-1.5 flex-1 rounded-full transition ${strength.score >= step ? strength.bar : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <p className={`mt-1 text-[11px] font-bold ${strength.text}`}>{strength.label}</p>
                </div>
              : <p className="text-[11px] font-semibold text-slate-500">لا تقل عن {MIN_LENGTH} أحرف، والأفضل مزج الحروف والأرقام والرموز.</p>
            }
          />

          <PasswordField
            label="تأكيد كلمة المرور الجديدة"
            value={confirmation}
            onChange={edit(setConfirmation, 'password_confirmation')}
            onBlur={() => setConfirmTouched(true)}
            error={fieldErrors.password_confirmation}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            aria-busy={submitting || undefined}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-customOrange font-extrabold text-white shadow-lg transition hover:brightness-[1.03] focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:opacity-50"
          >
            {submitting ?
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                جارٍ الحفظ…
              </>
            : 'حفظ كلمة المرور والمتابعة'}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="mt-5 flex w-full items-center justify-center gap-2 text-sm font-black text-slate-500 transition hover:text-customBlue focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40"
        >
          <LogOut size={15} aria-hidden="true" />
          تسجيل الخروج
        </button>
      </div>
    </main>
  )
}
