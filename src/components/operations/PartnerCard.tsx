import { motion } from 'framer-motion'
import { Handshake } from 'lucide-react'
import type { PartnerRecord } from '@/types/operations'

export default function PartnerCard({ p }: { p: PartnerRecord }) {
  return (
    <motion.article
      layout
      className="flex flex-col rounded-2xl bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-md ring-1 ring-deepBlue/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <Handshake size={22} className="text-customOrange" />
        <div className="text-right">
          <h3 className="font-black text-deepBlue">{p.name}</h3>
          <p className="mt-1 text-[11px] font-bold text-slate-500">{p.institution_type ?? '—'}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px] font-black">
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 ring-1 ring-emerald-100">
          {p.status ?? '—'}
        </span>
        <span className="text-slate-400">{p.updated_at ?? ''}</span>
      </div>
    </motion.article>
  )
}
