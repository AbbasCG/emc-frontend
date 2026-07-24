import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { progressFromStatus, type PlacementStudentRow } from '@/api/placementApi'
import { STATUS_LABELS, cefrBadge } from '@/components/instructor/placement/constants'
import { writtenPercentage } from '@/utils/placementAssessmentSummary'

type Props = {
  students: PlacementStudentRow[]
  selectedId: number | null
  onSelect: (row: PlacementStudentRow) => void
  search: string
  onSearchChange: (v: string) => void
}

export function PlacementStudentList({ students, selectedId, onSelect, search, onSearchChange }: Props) {
  const q = search.trim().toLowerCase()
  const filtered = students.filter((s) =>
    !q || s.student_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
  )

  return (
    <div className="flex h-full flex-col rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 p-3">
        <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-deepBlue/40">
          الطلاب ({filtered.length})
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deepBlue/30" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="بحث بالاسم أو البريد..."
            dir="rtl"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pr-10 pl-3 text-[12px] font-semibold text-deepBlue outline-none focus:border-[#0077B6] focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: 'min(70vh, 720px)' }}>
        {filtered.length === 0 ? (
          <p className="px-2 py-8 text-center text-[12px] font-semibold text-deepBlue/40">لا توجد نتائج</p>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((row) => {
              const active = selectedId === row.student_id
              const pct = writtenPercentage(row)
              const badge = cefrBadge(row.final_level ?? row.written_level)
              const progress = progressFromStatus(row.status)

              return (
                <li key={row.attempt_id || row.student_id}>
                  <motion.button
                    type="button"
                    onClick={() => onSelect(row)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-right transition ${
                      active
                        ? 'border-[#0077B6]/40 bg-sky-50/80 shadow-[0_4px_16px_-8px_rgba(0,119,182,0.35)]'
                        : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {row.avatar_url ? (
                        <img src={row.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0C2A4B]/8 text-[12px] font-black text-deepBlue">
                          {row.student_name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-black text-deepBlue">{row.student_name}</p>
                        <p className="truncate text-[10px] font-semibold text-deepBlue/40" dir="ltr">{row.email}</p>
                      </div>
                      <div className="shrink-0 text-left">
                        <p className="font-mono text-[11px] font-black tabular-nums text-[#0077B6]">
                          {pct != null ? `${pct}%` : '—'}
                        </p>
                        {badge && (
                          <span className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[9px] font-black ${badge.bg} ${badge.text}`}>
                            {badge.cefr}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5 text-[9px] font-bold text-deepBlue/35">
                      {STATUS_LABELS[row.status] ?? row.status}
                      {progress.level_approved && ' · معتمد'}
                    </p>
                  </motion.button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
