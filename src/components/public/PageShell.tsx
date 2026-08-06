import type { ReactNode } from 'react'

type PageShellProps = {
  children: ReactNode
  className?: string
}

/** Consistent horizontal rhythm and max width for public marketing pages */
export default function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
  )
}
