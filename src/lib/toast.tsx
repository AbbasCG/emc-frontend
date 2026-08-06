import { type ReactElement } from 'react'
import _toast from 'react-hot-toast'

/* ── Internal helpers ──────────────────────────────────────────────── */

type Opts = {
  id?: string
  duration?: number
  description?: string
}

function render(message: string, description?: string): string | ReactElement {
  if (!description) return message
  return (
    <span className="flex flex-col gap-0.5 text-right">
      <span>{message}</span>
      <span className="text-xs font-medium opacity-70">{description}</span>
    </span>
  )
}

/* ── Default export — Sonner-compatible object API ─────────────────── *
 * Used by the 29 call sites that already import `toast` and call
 * toast.success / toast.error / toast.warning / toast.message / etc.
 */
const toast = {
  success: (message: string, opts?: Opts) =>
    _toast.success(render(message, opts?.description), {
      id: opts?.id,
      duration: opts?.duration,
    }),

  error: (message: string, opts?: Opts) =>
    _toast.error(render(message, opts?.description), {
      id: opts?.id,
      duration: opts?.duration,
    }),

  warning: (message: string, opts?: Opts) =>
    _toast(render(message, opts?.description), {
      id: opts?.id,
      duration: opts?.duration,
      icon: '⚠️',
      style: { borderRight: '4px solid #EC943C' },
    }),

  message: (message: string, opts?: Opts) =>
    _toast(render(message, opts?.description), {
      id: opts?.id,
      duration: opts?.duration,
      icon: 'ℹ️',
      style: { borderRight: '4px solid #2691C2' },
    }),

  loading: (message: string, opts?: Opts) =>
    _toast.loading(render(message, opts?.description), {
      id: opts?.id,
      duration: opts?.duration ?? Infinity,
    }),

  dismiss: (id?: string) => _toast.dismiss(id),

  promise: _toast.promise.bind(_toast) as typeof _toast.promise,
}

export default toast
export { toast }

/* ── Named exports — new code should prefer these ──────────────────── *
 *
 * Loading pattern:
 *   const id = loadingToast('جاري الحفظ...')
 *   successToast('تم الحفظ بنجاح', id)   // replaces the spinner
 *   errorToast('فشل الحفظ', id)           // replaces the spinner
 */

export function successToast(message: string, toastId?: string): string {
  return _toast.success(message, { id: toastId, duration: 5000 })
}

export function errorToast(message: string, toastId?: string): string {
  return _toast.error(message, { id: toastId, duration: 6000 })
}

export function warningToast(message: string): string {
  return _toast(message, {
    icon: '⚠️',
    duration: 5000,
    style: { borderRight: '4px solid #EC943C' },
  })
}

export function infoToast(message: string): string {
  return _toast(message, {
    icon: 'ℹ️',
    duration: 5000,
    style: { borderRight: '4px solid #2691C2' },
  })
}

export function loadingToast(message: string): string {
  return _toast.loading(message, { duration: Infinity })
}

export function dismissToast(id?: string): void {
  _toast.dismiss(id)
}

export function promiseToast<T>(
  promise: Promise<T>,
  msgs: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((err: unknown) => string)
  },
): Promise<T> {
  return _toast.promise(promise, msgs)
}
