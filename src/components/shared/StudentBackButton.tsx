import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  /** Fallback route when no browser history is available (e.g. direct page load). */
  fallback: string
  /** Button label. Defaults to "العودة". */
  label?: string
  className?: string
}

/**
 * Universal back-navigation button for all student dashboard pages.
 *
 * Behavior:
 *  1. If the session has previous history (navigate(-1) is safe) → go back.
 *  2. Otherwise → navigate to `fallback` route.
 *
 * Placement: immediately after the page <header>, before the first content section.
 * RTL-native. Full-width touch target on mobile, auto-width on sm+.
 */
export function StudentBackButton({ fallback, label = 'العودة', className }: Props) {
  const navigate = useNavigate()

  // window.history.state.idx is set by React Router v6 and increments with
  // every push/replace. idx === 0 means this is the entry page of the session.
  const hasHistory =
    typeof window !== 'undefined' && (window.history.state?.idx ?? 0) > 0

  const handleBack = () => {
    if (hasHistory) {
      navigate(-1)
    } else {
      navigate(fallback, { replace: true })
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="العودة"
      className={[
        // Layout
        'inline-flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-start',
        // Shape & color
        'rounded-xl border border-deepBlue/10 bg-white px-4 py-2.5 sm:px-3.5 sm:py-2',
        // Typography
        'text-[12px] font-black text-deepBlue',
        // Elevation & motion
        'shadow-sm transition-all duration-150',
        // Hover / focus states
        'hover:border-customBlue/40 hover:bg-customBlue/5 hover:text-customBlue',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 focus-visible:ring-offset-1',
        className ?? '',
      ].join(' ')}
    >
      <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{label}</span>
    </button>
  )
}
