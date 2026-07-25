import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * EMC <FormField /> — premium labelled input.
 *
 * Backward-compatible: `id`, `label`, `hint`, `error`, `adornment` keep
 * their original semantics. New props: `size`, `leadingIcon`, `trailingIcon`,
 * `tone`. Visual treatment is upgraded for consistent SaaS feel.
 */

export type FormFieldSize = 'sm' | 'md' | 'lg'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> & {
  id: string
  label: string
  hint?: string
  error?: string
  /** Visible prefix/suffix slot beside the field (legacy). */
  adornment?: ReactNode
  /** Leading icon inside the input (RTL-aware: appears on the right in RTL). */
  leadingIcon?: ReactNode
  /** Trailing icon inside the input. */
  trailingIcon?: ReactNode
  size?: FormFieldSize
}

const sizeInputClass: Record<FormFieldSize, string> = {
  sm: 'min-h-[40px] rounded-lg px-3 py-2 text-[13px]',
  md: 'min-h-[48px] rounded-xl px-4 py-3 text-sm',
  lg: 'min-h-[54px] rounded-2xl px-5 py-3.5 text-[15px]',
}

const sizeIconPadding: Record<FormFieldSize, { leading: string; trailing: string }> = {
  sm: { leading: 'pr-9', trailing: 'pl-9' },
  md: { leading: 'pr-11', trailing: 'pl-11' },
  lg: { leading: 'pr-12', trailing: 'pl-12' },
}

const iconOffset: Record<FormFieldSize, string> = {
  sm: 'right-3 left-auto',
  md: 'right-3.5 left-auto',
  lg: 'right-4 left-auto',
}
const iconOffsetTrailing: Record<FormFieldSize, string> = {
  sm: 'left-3 right-auto',
  md: 'left-3.5 right-auto',
  lg: 'left-4 right-auto',
}

export default function FormField({
  id,
  label,
  hint,
  error,
  className,
  adornment,
  leadingIcon,
  trailingIcon,
  size = 'md',
  ...inputProps
}: Props) {
  // The error replaces the hint, so only reference the paragraph that is actually
  // rendered — a described-by pointing at an absent id is a dangling IDREF.
  const showHint = Boolean(hint) && !error
  const hintId = showHint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="grid gap-2 text-right">
      <label htmlFor={id} className="text-sm font-black text-deepBlue">
        {label}
        {inputProps.required && (
          <abbr title="مطلوب" className="mr-1 text-customOrange no-underline">
            *
          </abbr>
        )}
      </label>

      <div className={cn('relative', adornment ? 'flex items-stretch gap-2' : '')}>
        <div className="relative w-full">
          {leadingIcon && (
            <span
              className={cn(
                'pointer-events-none absolute top-1/2 -translate-y-1/2 text-deepBlue/45',
                iconOffset[size],
              )}
              aria-hidden
            >
              {leadingIcon}
            </span>
          )}
          {trailingIcon && (
            <span
              className={cn(
                'pointer-events-none absolute top-1/2 -translate-y-1/2 text-deepBlue/45',
                iconOffsetTrailing[size],
              )}
              aria-hidden
            >
              {trailingIcon}
            </span>
          )}
          <input
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'w-full border bg-white font-semibold text-deepBlue outline-none transition shadow-emc-xs',
              'border-slate-200 placeholder:text-deepBlue/35',
              'focus:border-customBlue focus:ring-4 focus:ring-customBlue/15 focus:shadow-emc',
              'hover:border-deepBlue/15',
              error && 'border-rose-300 ring-2 ring-rose-100 focus:border-rose-400 focus:ring-rose-100',
              sizeInputClass[size],
              leadingIcon && sizeIconPadding[size].leading,
              trailingIcon && sizeIconPadding[size].trailing,
              className,
            )}
            {...inputProps}
          />
        </div>
        {adornment}
      </div>

      {showHint && (
        <p id={hintId} className="text-xs font-medium text-deepBlue/55">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-bold text-rose-600">
          {error}
        </p>
      )}
    </div>
  )
}
