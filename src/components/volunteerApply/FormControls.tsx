import { createContext, useContext, useId, type ReactNode } from 'react'
import { AlertCircle, Check, RotateCcw } from 'lucide-react'
import type { VolunteerFieldKey } from '@/lib/volunteerApply/formModel'
import type { SubmitFailure } from '@/lib/volunteerApply/submitErrors'

/**
 * The controls of the volunteer application, written once so every field has the same height, the same border and the
 * same way of saying what is wrong. A message is tied to its field (`aria-describedby`), the field says it is invalid
 * (`aria-invalid`), and a group of choices is a real radio group or checkbox group for screen readers.
 *
 * Sizes: controls are at least 52px tall and text is 16px so Android and iOS never zoom the page on focus; choices are
 * at least 44px tall, the smallest comfortable touch target.
 */

const BASE =
  'w-full min-h-[3.25rem] rounded-xl border bg-white px-4 text-base font-medium text-deepBlue outline-none ' +
  'transition-colors duration-150 placeholder:font-normal placeholder:text-slate-400 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
const IDLE = 'border-slate-400 hover:border-slate-500 focus:border-customBlue focus:ring-4 focus:ring-customBlue/15'
const INVALID = 'border-red-500 bg-red-50/40 hover:border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15'

const CHOICE_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ' +
  'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-customBlue/25'
const CHOICE_OFF = 'border-slate-400 bg-white text-slate-700 hover:border-customBlue hover:bg-slate-50'
const CHOICE_ON = 'border-customBlue bg-customBlue text-white'
const CHOICE_ERR = 'border-red-300 bg-white text-slate-700 hover:border-red-400'

interface FieldContextValue {
  controlId: string
  labelId: string
  errorId: string
  invalid: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

function useFieldContext(): FieldContextValue {
  const ctx = useContext(FieldContext)
  if (!ctx) throw new Error('A form control must be used inside <Field>.')

  return ctx
}

/** A labelled field. `name` ties it to the error summary and lets the form move focus to it. */
export function Field({
  name,
  label,
  hint,
  required,
  error,
  children,
}: {
  name?: VolunteerFieldKey
  label: string
  hint?: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  const uid = useId()
  const ctx: FieldContextValue = {
    controlId: `${uid}-control`,
    labelId: `${uid}-label`,
    errorId: `${uid}-error`,
    invalid: Boolean(error),
  }

  return (
    <div className="scroll-mt-28 text-right" data-field={name}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label id={ctx.labelId} htmlFor={ctx.controlId} className="text-sm font-semibold leading-6 text-deepBlue">
          {label}
          {required && (
            <span className="mr-1 text-red-600" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only"> (مطلوب)</span>}
        </label>
        {hint && <span className="shrink-0 text-xs text-slate-500">{hint}</span>}
      </div>
      <FieldContext.Provider value={ctx}>{children}</FieldContext.Provider>
      {error && (
        <p id={ctx.errorId} className="mt-2 flex items-start gap-1.5 text-sm font-medium leading-6 text-red-700">
          <AlertCircle size={16} className="mt-1 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

export function TextControl({
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  dir,
  autoComplete,
  inputMode,
}: {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'date' | 'url'
  dir?: 'ltr' | 'rtl'
  autoComplete?: string
  inputMode?: 'text' | 'tel' | 'email' | 'url' | 'numeric'
}) {
  const { controlId, errorId, invalid } = useFieldContext()

  return (
    <input
      id={controlId}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      dir={dir}
      autoComplete={autoComplete}
      inputMode={inputMode}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errorId : undefined}
      className={`${BASE} text-right ${invalid ? INVALID : IDLE}`}
    />
  )
}

export function TextAreaControl({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  const { controlId, errorId, invalid } = useFieldContext()

  return (
    <textarea
      id={controlId}
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir="rtl"
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errorId : undefined}
      className={`${BASE} min-h-28 py-3.5 text-right leading-7 ${invalid ? INVALID : IDLE}`}
    />
  )
}

/** Pick exactly one of a few answers. */
export type ChoiceOption = string | { value: string; label: string }

function optionValue(option: ChoiceOption): string {
  return typeof option === 'string' ? option : option.value
}

function optionLabel(option: ChoiceOption): string {
  return typeof option === 'string' ? option : option.label
}

export function SingleChoice({
  options,
  selected,
  onSelect,
  layout = 'wrap',
}: {
  options: readonly ChoiceOption[]
  selected: string
  onSelect: (value: string) => void
  layout?: 'wrap' | 'equal'
}) {
  const { controlId, labelId, errorId, invalid } = useFieldContext()

  return (
    <div
      id={controlId}
      role="radiogroup"
      aria-labelledby={labelId}
      aria-describedby={invalid ? errorId : undefined}
      className={layout === 'equal' ? 'grid grid-cols-2 gap-3' : 'flex flex-wrap gap-2.5'}
    >
      {options.map((option) => {
        const value = optionValue(option)
        const on = selected === value

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(value)}
            className={`${CHOICE_BASE} ${layout === 'equal' ? 'w-full' : ''} ${on ? CHOICE_ON : invalid ? CHOICE_ERR : CHOICE_OFF}`}
          >
            {optionLabel(option)}
          </button>
        )
      })}
    </div>
  )
}

/** Pick any number of answers. */
export function MultiChoice({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[]
  selected: readonly string[]
  onToggle: (value: string) => void
}) {
  const { controlId, labelId, errorId, invalid } = useFieldContext()

  return (
    <div id={controlId} role="group" aria-labelledby={labelId} aria-describedby={invalid ? errorId : undefined} className="flex flex-wrap gap-2.5">
      {options.map((option) => {
        const on = selected.includes(option)

        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(option)}
            className={`${CHOICE_BASE} ${on ? 'border-customBlue bg-brand-50 text-customBlue' : invalid ? CHOICE_ERR : CHOICE_OFF}`}
          >
            <span
              aria-hidden="true"
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-customBlue bg-customBlue text-white' : 'border-slate-400 bg-white'}`}
            >
              {on && <Check size={11} strokeWidth={3} />}
            </span>
            {option}
          </button>
        )
      })}
    </div>
  )
}

/** One statement answered on a scale: a row of numbered buttons. */
export function ScaleQuestion({
  text,
  scale,
  value,
  onChange,
}: {
  text: string
  scale: ReadonlyArray<{ value: number; label: string }>
  value: number | undefined
  onChange: (value: number) => void
}) {
  const id = useId()

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p id={id} className="mb-3 text-sm font-semibold leading-6 text-deepBlue">
        {text}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-5 gap-2">
        {scale.map((item) => {
          const on = value === item.value

          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${item.value}: ${item.label}`}
              onClick={() => onChange(item.value)}
              className={`flex min-h-12 flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-customBlue/25 ${
                on ? CHOICE_ON : 'border-slate-400 bg-white text-slate-700 hover:border-customBlue'
              }`}
            >
              <span className="font-latin text-sm font-semibold tabular-nums">{item.value}</span>
              <span className="hidden text-[11px] font-medium leading-4 sm:block">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** A block of related questions with one shared message (a scale section, the practical situations). */
export function QuestionGroup({
  name,
  title,
  description,
  error,
  children,
}: {
  name: VolunteerFieldKey
  title: string
  description: string
  error?: string
  children: ReactNode
}) {
  const uid = useId()

  return (
    <section className="scroll-mt-28" data-field={name} aria-labelledby={`${uid}-title`} aria-describedby={error ? `${uid}-error` : undefined}>
      <div className="mb-3">
        <h3 id={`${uid}-title`} className="text-base font-semibold text-deepBlue">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
      {error && (
        <p id={`${uid}-error`} className="mt-3 flex items-start gap-1.5 text-sm font-medium leading-6 text-red-700">
          <AlertCircle size={16} className="mt-1 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </section>
  )
}

/** The consent tick box, with its message. */
export function ConsentCheckbox({
  name,
  checked,
  onChange,
  text,
  error,
}: {
  name: VolunteerFieldKey
  checked: boolean
  onChange: (checked: boolean) => void
  text: string
  error?: string
}) {
  const uid = useId()

  return (
    <div
      data-field={name}
      className={`scroll-mt-28 rounded-xl border p-4 ${error ? 'border-red-500 bg-red-50/40' : 'border-slate-300 bg-slate-50'}`}
    >
      <label htmlFor={`${uid}-box`} className="flex cursor-pointer items-start gap-3">
        <input
          id={`${uid}-box`}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${uid}-error` : undefined}
          className="mt-1 h-6 w-6 shrink-0 rounded border-slate-400 text-customBlue focus:ring-customBlue"
        />
        <span className="text-sm leading-7 text-deepBlue">{text}</span>
      </label>
      {error && (
        <p id={`${uid}-error`} className="mt-3 flex items-start gap-1.5 text-sm font-medium leading-6 text-red-700">
          <AlertCircle size={16} className="mt-1 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

export interface SummaryItem {
  key: VolunteerFieldKey
  label: string
  message: string
  /** The level the field is on, shown when it is not the one on screen. */
  step: number
}

/**
 * Everything that needs fixing, once, at the top of the form. Each row moves the person to the field. It replaces the
 * toast and the generic line, so a problem is said in exactly one place at the top and once beside its own field.
 */
export function ErrorSummary({
  items,
  currentStep,
  onGo,
  summaryRef,
}: {
  items: SummaryItem[]
  currentStep: number
  onGo: (item: SummaryItem) => void
  summaryRef: React.RefObject<HTMLDivElement | null>
}) {
  if (items.length === 0) return null

  return (
    <div
      ref={summaryRef}
      role="alert"
      tabIndex={-1}
      className="mb-6 scroll-mt-28 rounded-xl border border-red-300 bg-red-50 p-4 text-right focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
        <AlertCircle size={18} aria-hidden="true" />
        {items.length === 1 ? 'يوجد حقل واحد يحتاج إلى تصحيح' : `يوجد ${items.length} حقول تحتاج إلى تصحيح`}
      </p>
      <ul className="mt-3 space-y-1">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onGo(item)}
              className="flex min-h-11 w-full items-start gap-2 rounded-lg px-2 py-1.5 text-right text-sm leading-6 text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20"
            >
              <span className="font-semibold">{item.label}:</span>
              <span className="flex-1">{item.message}</span>
              {item.step !== currentStep && <span className="shrink-0 text-xs text-red-700">المستوى {item.step}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A failure that is about sending, not about one field: the connection, the server, too many tries. */
export function SubmitFailureAlert({
  failure,
  onRetry,
  retrying,
  alertRef,
}: {
  failure: SubmitFailure
  onRetry: () => void
  retrying: boolean
  alertRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={alertRef}
      role="alert"
      tabIndex={-1}
      className="mb-6 scroll-mt-28 rounded-xl border border-red-300 bg-red-50 p-4 text-right focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20"
    >
      <p className="flex items-start gap-2 text-sm font-medium leading-7 text-red-800">
        <AlertCircle size={18} className="mt-1 shrink-0" aria-hidden="true" />
        <span>{failure.message}</span>
      </p>
      {failure.unmapped.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pr-9 text-sm leading-6 text-red-800">
          {failure.unmapped.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 pr-7">
        {failure.retryable && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20 disabled:opacity-60"
          >
            <RotateCcw size={16} aria-hidden="true" />
            إعادة المحاولة
          </button>
        )}
        <span className="text-xs text-red-700">
          رمز المرجع: <span className="font-latin" dir="ltr">{failure.reference}</span>
        </span>
      </div>
    </div>
  )
}

/** A long list of answers as cards (the departments): one choice, two columns on a wide screen. */
export function CardChoice({
  options,
  selected,
  onSelect,
  icon,
}: {
  options: readonly string[]
  selected: string
  onSelect: (value: string) => void
  icon?: ReactNode
}) {
  const { controlId, labelId, errorId, invalid } = useFieldContext()

  return (
    <div
      id={controlId}
      role="radiogroup"
      aria-labelledby={labelId}
      aria-describedby={invalid ? errorId : undefined}
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
    >
      {options.map((option) => {
        const on = selected === option

        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(option)}
            className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-right text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-customBlue/25 ${
              on ? 'border-customBlue bg-brand-50 text-customBlue' : invalid ? CHOICE_ERR : CHOICE_OFF
            }`}
          >
            <span>{option}</span>
            {icon && <span className={on ? 'text-customBlue' : 'text-slate-500'}>{icon}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** One practical situation with its answers listed under it. */
export function ChoiceQuestion({
  index,
  text,
  options,
  value,
  onChange,
}: {
  index: number
  text: string
  options: readonly string[]
  value: string | undefined
  onChange: (value: string) => void
}) {
  const id = useId()

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <p className="text-xs font-medium text-customBlue">الموقف {index}</p>
      <p id={id} className="mb-3 mt-1 text-sm font-semibold leading-7 text-deepBlue">
        {text}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="space-y-2">
        {options.map((option) => {
          const on = value === option

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(option)}
              className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-right text-sm leading-6 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-customBlue/25 ${
                on ? 'border-customBlue bg-white font-semibold text-customBlue' : 'border-slate-300 bg-white text-slate-700 hover:border-customBlue'
              }`}
            >
              <span>{option}</span>
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${on ? 'border-customBlue bg-customBlue' : 'border-slate-400 bg-white'}`}
              >
                {on && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
