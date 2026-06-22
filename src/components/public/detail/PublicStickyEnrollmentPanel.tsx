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
    <div className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/95 shadow-[0_24px_60px_-20px_rgba(12,42,75,0.22)] backdrop-blur-xl ring-1 ring-[#0C2A4B]/5">
      {metaRows.length > 0 && (
        <div className="space-y-2 border-b border-[#0C2A4B]/6 bg-gradient-to-l from-[#0077B6]/6 via-white to-[#F28C00]/5 px-5 py-4">
          {metaRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[11px] font-bold text-slate-500">{row.label}</span>
              <span className="font-black tabular-nums text-[#0C2A4B]">{formatPublicText(row.value)}</span>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}
