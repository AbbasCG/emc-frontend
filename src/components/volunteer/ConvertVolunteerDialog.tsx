import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, Loader2, MailWarning, RefreshCw, UserCheck } from 'lucide-react'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { useRetryableLoad } from '@/hooks/useRetryableLoad'
import {
  convertVolunteerToMember,
  describeConvertError,
  describeResendError,
  resendVolunteerCredentials,
  type ConvertErrorKind,
  type ConvertVolunteerResult,
  type VolunteerRequest,
} from '@/api/volunteerApplicationApi'
import { fetchDepartmentOptions } from '@/api/volunteerOpportunitiesAdminApi'

/**
 * The ONE way to turn an accepted volunteer request into a member.
 *
 * HR confirms the department (pre-selected from the server's suggestion, or chosen by hand when the server could
 * not map what the volunteer applied for), the server creates the member AND links or creates the login account,
 * and this dialog then reports what really happened: a new account, an existing one linked (with or without a
 * re-issued temporary password), the department the member really is in, and whether the e-mail went out (with a
 * resend button only when there is a temporary password to send).
 *
 * It stays open after success so that result is seen. If the answer to the convert call is lost (network, timeout,
 * or the server saying it was already converted) the list is told to reload and the dialog says so, with the
 * resend button, instead of leaving HR guessing.
 */
export interface ConvertVolunteerDialogProps {
  request: VolunteerRequest
  onClose: () => void
  /** Called once, right after the server confirms the conversion (the dialog stays open on its result). */
  onConverted: (result: ConvertVolunteerResult) => void
  /** The parent's list is out of date (already converted elsewhere, or the answer was lost): reload it. */
  onListStale?: () => void
  /** Where focus goes when the dialog closes, if the opening control no longer exists (e.g. a row that changed). */
  returnFocusTo?: () => HTMLElement | null
}

const CONSEQUENCES = [
  'يُنشأ حساب للمتطوع بدور عضو في الإدارة المختارة، أو يُربط الحساب القائم بنفس البريد إن وُجد.',
  'يصله بريد إلكتروني ببيانات الدخول عند إنشاء حساب جديد (أو إعادة إصدار كلمة المرور المؤقتة).',
  'يظهر في قوائم «المتطوعون» و«الأعضاء» و«الفريق».',
  'يُطلب منه اختيار كلمة مرور جديدة عند أول دخول بكلمة مرور مؤقتة.',
]

type ResendOutcome = { ok: boolean; message: string } | null

type Outcome =
  | { kind: 'done'; result: ConvertVolunteerResult; chosenDepartment: string }
  | { kind: 'lost'; why: 'already_converted' | 'unknown_outcome'; message: string }

export default function ConvertVolunteerDialog({ request, onClose, onConverted, onListStale, returnFocusTo }: ConvertVolunteerDialogProps) {
  const selectId = useId()
  const hintId = useId()
  const errorId = useId()
  const selectRef = useRef<HTMLSelectElement>(null)
  const headingRef = useRef<HTMLParagraphElement>(null)

  // Active departments only: the endpoint refuses an inactive one.
  const departments = useRetryableLoad(fetchDepartmentOptions, 'departments')
  const options = departments.data ?? []

  const suggestedId = request.suggested_department_id ?? null
  const suggestionIsOffered = suggestedId != null && options.some((d) => d.id === suggestedId)

  // `null` = HR has not touched the select yet, so the server's suggestion (when it is offered) shows.
  const [choice, setChoice] = useState<string | null>(null)
  const selected = choice ?? (suggestionIsOffered ? String(suggestedId) : '')
  const selectedOption = options.find((d) => String(d.id) === selected) ?? null

  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [formError, setFormError] = useState<{ kind: ConvertErrorKind; message: string } | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const [resending, setResending] = useState(false)
  const resendingRef = useRef(false)
  const [resendOutcome, setResendOutcome] = useState<ResendOutcome>(null)

  const departmentsReady = !departments.loading && !departments.error

  // Keyboard: once the department list is in, the select is the next thing to do. On the result, the heading.
  useEffect(() => {
    if (departmentsReady && outcome == null) selectRef.current?.focus()
  }, [departmentsReady, outcome])
  useEffect(() => {
    if (outcome != null) headingRef.current?.focus()
  }, [outcome])

  async function confirm() {
    if (submittingRef.current || !selectedOption) return
    submittingRef.current = true
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await convertVolunteerToMember(request.id, selectedOption.id)
      setOutcome({ kind: 'done', result: res, chosenDepartment: selectedOption.name })
      onConverted(res)
    } catch (err) {
      const { kind, message } = describeConvertError(err)
      if (kind === 'already_converted' || kind === 'unknown_outcome') {
        // The conversion happened (or may have): what HR sees must be the server's list, and the e-mail status is unknown.
        setOutcome({ kind: 'lost', why: kind, message })
        onListStale?.()
      } else {
        setFormError({ kind, message })
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  async function resend() {
    if (resendingRef.current) return
    resendingRef.current = true
    setResending(true)
    setResendOutcome(null)
    try {
      const { email_sent } = await resendVolunteerCredentials(request.id)
      setResendOutcome(
        email_sent
          ? { ok: true, message: 'أُعيد إرسال بيانات الدخول بنجاح.' }
          : { ok: false, message: 'تعذّر إرسال البريد مرة أخرى. تحقق من عنوان البريد ثم أعد المحاولة.' },
      )
    } catch (err) {
      setResendOutcome({ ok: false, message: describeResendError(err) })
    } finally {
      resendingRef.current = false
      setResending(false)
    }
  }

  function refreshDepartments() {
    setChoice('')
    setFormError(null)
    departments.retry()
  }

  const done = outcome != null

  return (
    <CenteredModal
      open
      onClose={onClose}
      size="md"
      busy={submitting}
      title="تحويل المتطوع إلى عضو"
      subtitle={request.full_name}
      testId="convert-volunteer-dialog"
      returnFocusTo={returnFocusTo}
      footer={
        done ?
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-customBlue px-5 py-2.5 text-sm font-black text-white transition hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40"
            >
              إغلاق
            </button>
          </div>
        : <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={submitting || !selectedOption}
              aria-busy={submitting || undefined}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}
              اعتماد الإدارة وإنشاء الحساب
            </button>
          </div>
      }
    >
      {outcome ?
        <ResultView
          outcome={outcome}
          email={request.email}
          headingRef={headingRef}
          resending={resending}
          resendOutcome={resendOutcome}
          onResend={() => void resend()}
        />
      : <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-bold text-slate-400">المتطوع</dt>
                <dd className="mt-0.5 font-black text-deepBlue">{request.full_name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold text-slate-400">الإدارة التي تقدّم إليها</dt>
                <dd className="mt-0.5 font-black text-deepBlue" data-testid="applied-department">
                  {request.desired_department || 'لم يحدّد إدارة'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <label htmlFor={selectId} className="mb-1.5 block text-[13px] font-black text-deepBlue">
              الإدارة التي سيُضاف إليها العضو
            </label>

            {departments.loading ?
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500" role="status">
                <Loader2 size={14} className="animate-spin text-customBlue" aria-hidden="true" /> جارٍ تحميل الإدارات…
              </p>
            : departments.error ?
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5" role="alert">
                <p className="flex-1 text-xs font-bold text-red-700">تعذّر تحميل قائمة الإدارات.</p>
                <button
                  type="button"
                  onClick={departments.retry}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-black text-red-700 transition hover:bg-red-50"
                >
                  <RefreshCw size={12} aria-hidden="true" /> إعادة المحاولة
                </button>
              </div>
            : <>
                <select
                  ref={selectRef}
                  id={selectId}
                  value={selected}
                  disabled={submitting}
                  onChange={(e) => {
                    setChoice(e.target.value)
                    setFormError(null)
                  }}
                  aria-describedby={`${hintId}${formError ? ` ${errorId}` : ''}`}
                  aria-invalid={formError ? true : undefined}
                  dir="rtl"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-deepBlue outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/20 disabled:opacity-60"
                >
                  <option value="">اختر الإدارة…</option>
                  {options.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <p id={hintId} className="mt-1.5 text-[11px] font-semibold text-slate-500">
                  {suggestionIsOffered ?
                    'اقترح النظام هذه الإدارة وفق ما تقدّم إليه المتطوع. يمكنك تغييرها قبل الاعتماد.'
                  : 'يحدّد اختيارك دور الحساب وصلاحياته. يمكنك تغييره الآن فقط.'}
                </p>
              </>
            }

            {departmentsReady && !suggestionIsOffered && selectedOption ?
              <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700" role="note" data-testid="chosen-department">
                الإدارة المختارة: <strong className="text-deepBlue">{selectedOption.name}</strong>
              </p>
            : null}

            {departmentsReady && !suggestionIsOffered && !selectedOption ?
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold leading-relaxed text-amber-900" role="note">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  تعذّر ربط الإدارة المطلوبة
                  {request.desired_department ? <> («{request.desired_department}») </> : ' '}
                  بإدارة في النظام، لذلك لم يُختر شيء مسبقًا. اختر الإدارة المناسبة يدويًا.
                </span>
              </p>
            : null}

            {formError ?
              <div id={errorId} className="mt-3 flex flex-wrap items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700" role="alert">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">{formError.message}</span>
                {formError.kind === 'department' ?
                  <button
                    type="button"
                    onClick={refreshDepartments}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-black text-red-700 transition hover:bg-red-50"
                  >
                    <RefreshCw size={12} aria-hidden="true" /> تحديث القائمة
                  </button>
                : null}
              </div>
            : null}
          </section>

          <section className="rounded-2xl border border-customBlue/15 bg-customBlue/[0.04] p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-black text-deepBlue">
              <Info size={15} className="text-customBlue" aria-hidden="true" /> ماذا سيحدث عند الاعتماد؟
            </h3>
            <ul className="list-disc space-y-1.5 ps-5 text-xs font-semibold leading-relaxed text-slate-700">
              {CONSEQUENCES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {request.email ?
              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                عنوان البريد: <span dir="ltr">{request.email}</span>
              </p>
            : null}
          </section>
        </div>
      }
    </CenteredModal>
  )
}

function ResendBlock({
  resending,
  resendOutcome,
  onResend,
  children,
}: {
  resending: boolean
  resendOutcome: ResendOutcome
  onResend: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4" role="alert" data-testid="email-warning">
      <p className="flex items-start gap-2 text-sm font-black text-amber-900">
        <MailWarning size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{children}</span>
      </p>
      <button
        type="button"
        onClick={onResend}
        disabled={resending}
        aria-busy={resending || undefined}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-400 bg-white px-4 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-60"
      >
        {resending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
        إعادة إرسال بيانات الدخول
      </button>
      {resendOutcome && !resendOutcome.ok ?
        <p className="mt-2 text-xs font-bold text-red-700" role="alert">
          {resendOutcome.message}
        </p>
      : null}
    </div>
  )
}

function SentLine({ email, again }: { email: string; again: boolean }) {
  return (
    <p className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700" data-testid="email-outcome" role={again ? 'status' : undefined}>
      <CheckCircle2 size={15} className="shrink-0 text-emerald-600" aria-hidden="true" />
      <span>
        {again ? 'أُعيد إرسال بيانات الدخول إلى ' : 'أُرسلت بيانات الدخول إلى '}
        <span dir="ltr">{email}</span>.
      </span>
    </p>
  )
}

function ResultView({
  outcome,
  email,
  headingRef,
  resending,
  resendOutcome,
  onResend,
}: {
  outcome: Outcome
  email: string
  headingRef: React.RefObject<HTMLParagraphElement | null>
  resending: boolean
  resendOutcome: ResendOutcome
  onResend: () => void
}) {
  const resentOk = resendOutcome?.ok === true

  if (outcome.kind === 'lost') {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4" role="status">
          <Info size={20} className="mt-0.5 shrink-0 text-sky-600" aria-hidden="true" />
          <div>
            <p ref={headingRef} tabIndex={-1} className="text-sm font-black text-sky-900 outline-none">
              {outcome.message}
            </p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-sky-800" data-testid="lost-explainer">
              {outcome.why === 'already_converted' ?
                'حُدّثت القائمة. حالة بريد بيانات الدخول غير معروفة: إن لم يصل إلى المتطوع يمكنك إعادة إرساله.'
              : 'حُدّثت القائمة. إن ظهر الطلب «تم التحويل» فحالة بريد بيانات الدخول غير معروفة ويمكنك إعادة إرساله، وإن لم يظهر فأعد المحاولة.'}
            </p>
          </div>
        </div>
        {resentOk ?
          <SentLine email={email} again />
        : <ResendBlock resending={resending} resendOutcome={resendOutcome} onResend={onResend}>
            حالة بريد بيانات الدخول غير معروفة.
          </ResendBlock>
        }
      </div>
    )
  }

  const { member } = outcome.result
  const needsCredentials = member.account_created || member.credentials_reissued
  const emailSent = member.email_sent || resentOk

  const accountLine =
    member.account_created ? 'أُنشئ حساب جديد للمتطوع وارتبط بسجل العضو.'
    : member.account_existing && member.credentials_reissued ? 'ارتبط العضو بحساب قائم لم يُوثَّق بريده، فأُعيد إصدار كلمة مرور مؤقتة له.'
    : member.account_existing ? 'ربط بحساب قائم؛ يدخل بكلمة مروره الحالية.'
    : member.has_user_account ? 'الحساب مرتبط بسجل العضو.'
    : 'لم يُربط حساب بسجل العضو.'

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
        <div>
          <p ref={headingRef} tabIndex={-1} className="text-sm font-black text-emerald-900 outline-none">
            {outcome.result.message}
          </p>
          {member.department_name ?
            <p className="mt-1 text-xs font-semibold text-emerald-800">
              الإدارة: <strong>{member.department_name}</strong>
              {member.position_ar ? <> · المنصب: <strong>{member.position_ar}</strong></> : null}
            </p>
          : null}
        </div>
      </div>

      {member.department_kept_existing ?
        <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-900" role="note" data-testid="department-kept-note">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            العضو باقٍ في إدارته الحالية «{member.department_name ?? 'غير محددة'}» ولم يُنقل إلى الإدارة التي اخترتها («{outcome.chosenDepartment}»)،
            لأن حسابه القائم ينتمي إليها.
          </span>
        </p>
      : null}

      <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700" data-testid="account-outcome">
        {accountLine}
      </p>

      {needsCredentials ?
        emailSent ?
          <SentLine email={email} again={resentOk} />
        : <ResendBlock resending={resending} resendOutcome={resendOutcome} onResend={onResend}>
            لم يُرسل بريد بيانات الدخول. لن يعرف المتطوع كيف يدخل قبل أن تُعيد إرساله.
          </ResendBlock>
      : null}
    </div>
  )
}
