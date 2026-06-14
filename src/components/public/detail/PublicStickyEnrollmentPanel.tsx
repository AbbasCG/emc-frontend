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
    <div className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/95 shadow-[0_24px_60px_-20px_rgba(34,51,74,0.22)] backdrop-blur-xl ring-1 ring-[#22334A]/5">
      {metaRows.length > 0 && (
        <div className="space-y-2 border-b border-[#22334A]/6 bg-gradient-to-l from-[#2691C2]/6 via-white to-[#EC943C]/5 px-5 py-4">
          {metaRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[11px] font-bold text-slate-500">{row.label}</span>
              <span className="font-black tabular-nums text-[#22334A]">{formatPublicText(row.value)}</span>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}
