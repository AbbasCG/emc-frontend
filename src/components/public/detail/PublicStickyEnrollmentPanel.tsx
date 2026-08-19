import type { ReactNode } from 'react'
import { formatPublicText } from '@/utils/publicDetailFormat'

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
    <div className="overflow-hidden rounded-[1.5rem] border border-line bg-white/95 backdrop-blur-xl ring-1 ring-navy/5">
      {metaRows.length > 0 && (
        <div className="space-y-2 border-b border-navy/[0.06] bg-gradient-to-l from-customBlue/[0.06] to-white px-5 py-4">
          {metaRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[11px] font-bold text-slate-500">{row.label}</span>
              <span className="font-black tabular-nums text-navy" dir="ltr">{formatPublicText(row.value)}</span>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}
