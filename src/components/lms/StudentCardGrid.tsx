import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

/**
 * Shared responsive card grid for the student area — sessions, materials,
 * units, notes, downloadable resources. Auto-fits 280–420px cards so they
 * sit side by side on desktop, 2-up on tablet, 1-up on mobile, without ever
 * stretching a single card across the full row.
 */
export default function StudentCardGrid({ children, className = '' }: Props) {
  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
    >
      {children}
    </div>
  )
}
