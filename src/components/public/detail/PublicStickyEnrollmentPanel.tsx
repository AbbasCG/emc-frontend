import type { ReactNode } from 'react'

export type PanelMetaRow = {
  label: string
  value: string
}

type Props = {
  children: ReactNode
  metaRows?: PanelMetaRow[]
}

export default function PublicStickyEnrollmentPanel({ children, metaRows = [] }: Props) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-20px_rgba(34,51,74,0.2)] ring-1 ring-slate-100">
      {metaRows.length > 0 && (
        <div className="space-y-2.5 border-b border-slate-100 bg-gradient-to-l from-sky-50/80 to-white px-5 py-4">
          {metaRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-500">{row.label}</span>
              <span className="font-black text-deepBlue">{row.value}</span>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}
