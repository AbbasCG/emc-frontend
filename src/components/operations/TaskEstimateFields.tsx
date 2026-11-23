import type { Ref } from 'react'
import { Clock, Info } from 'lucide-react'
import {
  type ActualDurationDraft,
  TICKET_ESTIMATE_NOTE,
  TASK_SCOPES,
  TASK_SCOPE_RULES,
  isTaskScope,
  type EstimateDraft,
  type EstimateErrors,
} from '@/lib/taskEstimate'

/**
 * The shared «حجم المهمة / نقاط المهمة / المدة التقريبية» fields. Used by the task form and by every ticket flow that
 * turns a ticket into assigned work, so the ranges, the hours/minutes toggle and the messages are identical.
 *
 * Controlled: the parent owns an {@link EstimateDraft} and the field errors (its own client validation and the
 * server's 422 `task_scope / task_points / estimated_hours`, both keyed the same way).
 */

const FIELD = 'w-full rounded-xl border bg-white px-3 py-2 text-xs font-bold text-deepBlue focus:border-customBlue focus:outline-none focus:ring-1 focus:ring-customBlue'
const border = (bad: boolean) => (bad ? 'border-rose-400' : 'border-slate-200')

interface Common {
  value: EstimateDraft
  onChange: (next: EstimateDraft) => void
  errors?: EstimateErrors
  /** Unique per form on the page: ties each label to its control. */
  idPrefix: string
  disabled?: boolean
  /** Task form behaviour: picking a scope fills the points with that scope's minimum (until «أثر استثنائي»). */
  autofillPoints?: boolean
  /** The line under the duration. The task form's default is about the volunteer's balance; tickets pass their own. */
  durationHint?: string
}

function ErrorText({ id, children }: { id: string; children?: string }) {
  if (!children) return null

  return (
    <p id={id} role="alert" className="mt-1 text-[11px] font-bold text-rose-600">
      {children}
    </p>
  )
}

/** «حجم المهمة» select. */
export function EstimateScopeSelect({ value, onChange, errors, idPrefix, disabled, autofillPoints = false }: Common) {
  const id = `${idPrefix}-scope`

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-black text-deepBlue">
        حجم المهمة <span className="text-red-500" aria-hidden="true">*</span>
      </label>
      <select
        id={id}
        value={value.scope}
        disabled={disabled}
        aria-invalid={errors?.task_scope ? true : undefined}
        aria-describedby={errors?.task_scope ? `${id}-err` : undefined}
        onChange={(e) => {
          const scope = isTaskScope(e.target.value) ? e.target.value : ''
          const exceptional = scope === 'strategic' ? value.exceptional : false
          const points = autofillPoints && scope !== '' && !exceptional ? String(TASK_SCOPE_RULES[scope].min) : value.points
          onChange({ ...value, scope, exceptional, points })
        }}
        className={`${FIELD} ${border(Boolean(errors?.task_scope))}`}
      >
        {value.scope === '' ? <option value="">-- اختر حجم المهمة --</option> : null}
        {TASK_SCOPES.map((s) => (
          <option key={s} value={s}>
            {TASK_SCOPE_RULES[s].option}
          </option>
        ))}
      </select>
      <ErrorText id={`${id}-err`}>{errors?.task_scope}</ErrorText>
    </div>
  )
}

/** The card that explains the chosen size and its approved range. */
export function EstimateScopeCard({ scope }: { scope: EstimateDraft['scope'] }) {
  if (scope === '') {
    return (
      <div className="rounded-2xl border border-dashed border-customBlue/25 bg-customBlue/[0.02] p-3.5 text-[11px] font-semibold text-slate-500" data-testid="scope-card-empty">
        اختر حجم المهمة لتظهر هنا قاعدة النقاط المعتمدة له: بسيطة 25–50، متوسطة 75–150، كبيرة 200–300، واستراتيجية من 300 فما فوق.
      </div>
    )
  }
  const rule = TASK_SCOPE_RULES[scope]

  return (
    <div className="space-y-1.5 rounded-2xl border border-customBlue/20 bg-customBlue/[0.03] p-3.5" data-testid="scope-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black text-customBlue">{rule.label}</span>
        <span className="rounded-lg bg-customBlue/10 px-2 py-0.5 text-[11px] font-black text-customBlue">
          النطاق المعتمد: {rule.min} - {rule.max} نقطة
        </span>
      </div>
      <p className="text-[11px] font-semibold text-slate-600">{rule.desc}</p>
      <p className="text-[10px] font-medium text-slate-500">
        <span className="font-bold">أمثلة: </span>
        {rule.examples}
      </p>
    </div>
  )
}

/** «نقاط المهمة» + «المدة التقريبية» (ساعات / دقائق). */
export function EstimatePointsDuration({ value, onChange, errors, idPrefix, disabled, autofillPoints = false, durationHint = 'تُضاف لرصيد المتطوع التراكمي لإصدار شهادة الساعات عند الإنجاز' }: Common) {
  const pointsId = `${idPrefix}-points`
  const durationId = `${idPrefix}-duration`
  const rule = value.scope === '' ? null : TASK_SCOPE_RULES[value.scope]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor={pointsId} className="text-xs font-black text-deepBlue">
            نقاط المهمة <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          {value.scope === 'strategic' ? (
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-purple-700">
              <input
                type="checkbox"
                checked={value.exceptional}
                disabled={disabled}
                onChange={(e) => {
                  const exceptional = e.target.checked
                  onChange({ ...value, exceptional, points: autofillPoints && !exceptional ? String(TASK_SCOPE_RULES.strategic.min) : value.points })
                }}
                className="rounded text-purple-600"
              />
              أثر استثنائي (مفتوح)
            </label>
          ) : null}
        </div>
        <input
          id={pointsId}
          type="number"
          inputMode="numeric"
          min={rule?.min}
          max={rule && !value.exceptional && !rule.open ? rule.max : undefined}
          value={value.points}
          disabled={disabled}
          aria-required="true"
          aria-invalid={errors?.task_points ? true : undefined}
          aria-describedby={errors?.task_points ? `${pointsId}-err` : `${pointsId}-hint`}
          onChange={(e) => onChange({ ...value, points: e.target.value })}
          placeholder={rule ? undefined : 'اختر الحجم أولًا'}
          className={`${FIELD} ${border(Boolean(errors?.task_points))} font-black`}
        />
        <ErrorText id={`${pointsId}-err`}>{errors?.task_points}</ErrorText>
        <span id={`${pointsId}-hint`} className="mt-1 block text-[10px] text-slate-400">
          {rule === null
            ? 'تُحدَّد النقاط ضمن نطاق الحجم المختار'
            : value.exceptional
              ? 'الحقل مفتوح لكمية نقاط غير محدودة للأثر الاستثنائي'
              : rule.open
                ? `من ${rule.min} نقطة فما فوق`
                : `مقيدة آلياً بين ${rule.min} و ${rule.max} نقطة`}
        </span>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor={durationId} className="text-xs font-black text-deepBlue">
            المدة التقريبية
          </label>
          <div className="flex gap-1" role="group" aria-label="وحدة المدة">
            {(['hours', 'minutes'] as const).map((u) => (
              <button
                key={u}
                type="button"
                disabled={disabled}
                aria-pressed={value.unit === u}
                onClick={() => onChange({ ...value, unit: u })}
                className={`rounded px-1.5 py-0.5 text-[10px] font-black ${value.unit === u ? 'bg-deepBlue text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {u === 'hours' ? 'ساعات' : 'دقائق'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <input
            id={durationId}
            type="number"
            step="0.5"
            min="0"
            value={value.duration}
            disabled={disabled}
            aria-invalid={errors?.estimated_hours ? true : undefined}
            aria-describedby={errors?.estimated_hours ? `${durationId}-err` : `${durationId}-hint`}
            onChange={(e) => onChange({ ...value, duration: e.target.value })}
            placeholder={value.unit === 'hours' ? 'مثال: 2.5' : 'مثال: 45'}
            className={`${FIELD} ${border(Boolean(errors?.estimated_hours))} pl-10 font-black`}
          />
          <Clock size={15} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
        </div>
        <ErrorText id={`${durationId}-err`}>{errors?.estimated_hours}</ErrorText>
        <span id={`${durationId}-hint`} className="mt-1 block text-[10px] text-slate-400">
          {durationHint}
        </span>
      </div>
    </div>
  )
}

/** The note shown for a record that has no estimate yet; the form opens empty and never invents values. */
export function LegacyEstimateNote() {
  return (
    <div role="note" className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[11px] font-bold leading-relaxed text-amber-800" data-testid="legacy-estimate-note">
      <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>هذه التذكرة قديمة ولم تُحدَّد لها نقاط بعد. أدخل الحجم والنقاط والمدة لتقدير العمل المطلوب فيها. {TICKET_ESTIMATE_NOTE}</span>
    </div>
  )
}

/** The full block used by the ticket flows: scope, its range card, points and duration. */
export default function TaskEstimateFields({ legacy = false, ...p }: Common & { legacy?: boolean }) {
  return (
    <fieldset className="min-w-0 space-y-4 border-0 p-0" disabled={p.disabled} data-testid="task-estimate-fields">
      <legend className="sr-only">النقاط والمدة</legend>
      {legacy ? <LegacyEstimateNote /> : null}
      <EstimateScopeSelect {...p} />
      <EstimateScopeCard scope={p.value.scope} />
      <EstimatePointsDuration {...p} durationHint={TICKET_ESTIMATE_NOTE} />
    </fieldset>
  )
}

/**
 * «المدة الفعلية» in whole hours and whole minutes: the time the reviewer approves at the final approval, and the ONLY
 * time added to the member's balance. Styled like «المدة التقريبية»; controlled (the parent owns the draft and the
 * error, so the server's 422 on `actual_minutes` and the client check show in the same place).
 */
export function ActualDurationFields({
  value,
  onChange,
  error,
  idPrefix,
  disabled,
  hoursRef,
}: {
  value: ActualDurationDraft
  onChange: (next: ActualDurationDraft) => void
  error?: string | null
  idPrefix: string
  disabled?: boolean
  /** Lets the form move focus to the first field when the entry is refused. */
  hoursRef?: Ref<HTMLInputElement>
}) {
  const hoursId = `${idPrefix}-hours`
  const minutesId = `${idPrefix}-minutes`
  const errId = `${idPrefix}-err`

  return (
    <div className="grid grid-cols-2 gap-3" data-testid="actual-duration-fields">
      <div>
        <label htmlFor={hoursId} className="mb-1.5 block text-xs font-black text-deepBlue">
          ساعات
        </label>
        <input
          id={hoursId}
          ref={hoursRef}
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          max="1000"
          value={value.hours}
          disabled={disabled}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          onChange={(e) => onChange({ ...value, hours: e.target.value })}
          placeholder="0"
          className={`${FIELD} ${border(Boolean(error))} font-black`}
        />
      </div>
      <div>
        <label htmlFor={minutesId} className="mb-1.5 block text-xs font-black text-deepBlue">
          دقائق
        </label>
        <input
          id={minutesId}
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          value={value.minutes}
          disabled={disabled}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          onChange={(e) => onChange({ ...value, minutes: e.target.value })}
          placeholder="0"
          className={`${FIELD} ${border(Boolean(error))} font-black`}
        />
      </div>
      <div className="col-span-2">
        <ErrorText id={errId}>{error ?? undefined}</ErrorText>
      </div>
    </div>
  )
}
