import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CrudCardTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      dir="rtl"
      className={cn(
        'overflow-hidden rounded-3xl border border-ink-100 bg-white text-right shadow-[0_10px_42px_rgba(15,23,42,0.06)]',
        className,
      )}
    >
      <div className="overflow-x-auto text-right">{children}</div>
    </div>
  )
}

/** جدول CRUD باتجاه RTL موحّد للأعمدة والمقاطع النصية. */
export function CrudTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <table
      dir="rtl"
      className={cn(
        'min-w-full border-collapse text-right rtl:text-right',
        '[&_th]:text-right [&_td]:text-right',
        className,
      )}
    >
      {children}
    </table>
  )
}

export function Th({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'th'> & {
  /** Optional for decorative empty header slots */
  children?: ReactNode
}) {
  return (
    <th
      className={cn(
        'sticky top-0 z-[1] border-b border-ink-100 bg-slate-50/96 px-4 py-3.5 text-right text-[11px] font-black uppercase tracking-wide text-muted-500 backdrop-blur rtl:text-right',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function Tr({
  children,
  muted,
  className,
  ...props
}: ComponentPropsWithoutRef<'tr'> & {
  muted?: boolean
}) {
  return (
    <tr
      className={cn('group transition-colors', muted ? 'opacity-85' : 'hover:bg-brand-500/[0.03]', className)}
      {...props}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className, ...props }: ComponentPropsWithoutRef<'td'>) {
  return (
    <td
      className={cn(
        'border-b border-ink-100/[0.7] px-4 py-3.5 align-middle text-right text-[13px] font-semibold rtl:text-right',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}
