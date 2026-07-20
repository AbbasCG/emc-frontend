import { motion } from 'framer-motion'
import {
  BookOpen,
  CalendarDays,
  Clock,
  ClipboardList,
  History,
  Mic,
  UserPlus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { InstructorPlacementTestRow } from '@/api/placementApi'
import { CEFR_MAP } from '@/components/instructor/InstructorStudentDrawer'
import { formatInstructorDateAr, formatInstructorTimeRange } from '@/utils/instructorScheduleFormat'
import { STATUS_AR, STATUS_BADGE, overallPct, writtenPct } from './constants'

type Props = {
  row: InstructorPlacementTestRow
  index: number
  selected: boolean
  onSelect: () => void
  onViewDetails: () => void
  onReviewWritten: () => void
  onReviewOral: () => void
}

export function PlacementPipelineCard({
  row,
  index,
  selected,
  onSelect,
  onViewDetails,
  onReviewWritten,
  onReviewOral,
}: Props) {
  const wPct = writtenPct(row)
  const oPct = row.oral_score
  const overall = overallPct(row)
  const levelBadge = row.final_level
    ? (CEFR_MAP[row.final_level] ?? CEFR_MAP[row.written_level ?? ''] ?? null)
    : (row.written_level ? CEFR_MAP[row.written_level] ?? null : null)
  const statusKey = row.status ?? 'not_started'
  const progressVal = overall ?? wPct ?? 0
  const submittedDate = formatInstructorDateAr(row.submitted_at)
  const oralTimeRange = formatInstructorTimeRange(row.oral_booking_at, row.oral_booking_ends_at)

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.25) }}
      whileHover={{ y: -2 }}
      className={`flex w-full max-w-[430px] flex-col rounded-[16px] border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all ${
        selected
          ? 'border-[#2691C2]/40 ring-2 ring-[#2691C2]/15 shadow-[0_8px_28px_-12px_rgba(38,145,194,0.28)]'
          : 'border-[#22334A]/[0.06] hover:border-[#2691C2]/20 hover:shadow-[0_8px_24px_-14px_rgba(38,145,194,0.18)]'
      }`}
    >
      {/* Whole card is the primary interactive surface — opens the full detail
          modal directly. Inner action buttons stopPropagation so they still
          jump straight to a specific tab without double-firing this click. */}
      <button
        type="button"
        onClick={onSelect}
        className="w-full cursor-pointer rounded-t-[16px] p-4 text-right outline-none focus-visible:ring-2 focus-visible:ring-[#2691C2]/50"
      >
        <span className="sr-only">فتح تفاصيل {row.student_name}</span>
        <div className="flex items-start gap-3">
          {row.avatar_url ? (
            <img src={row.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover ring-2 ring-white shadow-sm" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#22334A]/8 text-[14px] font-black text-deepBlue">
              {row.student_name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-black text-deepBlue">{row.student_name}</p>
            <p className="truncate text-[10px] font-semibold text-deepBlue/45" dir="ltr">{row.student_email}</p>
            <p className="mt-0.5 text-[9px] font-bold text-deepBlue/35">#{row.student_id}</p>
          </div>
          {levelBadge && (
            <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-black ${levelBadge.bg} ${levelBadge.text}`}>
              {levelBadge.cefr}
            </span>
          )}
        </div>

        <p className="mt-2 truncate text-[11px] font-bold text-deepBlue/55">{row.course_title}</p>

        {(submittedDate || oralTimeRange) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10.5px] font-semibold text-deepBlue/55">
            {submittedDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#2691C2]/70" />
                {submittedDate}
              </span>
            )}
            {oralTimeRange && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0 text-[#2691C2]/70" />
                {oralTimeRange}
              </span>
            )}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <ScoreMini label="الكتابي" value={row.written_score} max={row.total_questions ?? 100} pct={wPct} />
          <ScoreMini label="الشفوي" value={row.oral_score} max={100} pct={oPct} />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[9px] font-bold text-deepBlue/40">
            <span>التقدم الإجمالي</span>
            <span className="font-mono tabular-nums">{overall != null ? `${overall}%` : '—'}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-l from-[#2691C2] to-[#22334A] transition-all" style={{ width: `${Math.min(100, progressVal)}%` }} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          <span className={`rounded-md px-2 py-0.5 text-[9px] font-black ring-1 ${STATUS_BADGE[statusKey] ?? STATUS_BADGE.not_started}`}>
            {STATUS_AR[statusKey] ?? statusKey}
          </span>
          {row.is_assigned && (
            <span className="rounded-md bg-[#2691C2]/10 px-2 py-0.5 text-[9px] font-black text-[#2691C2] ring-1 ring-[#2691C2]/20">مُسند</span>
          )}
          {row.oral_booking_at && (
            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[9px] font-black text-violet-700 ring-1 ring-violet-200/80">مقابلة محجوزة</span>
          )}
        </div>
      </button>

      <div className="flex flex-wrap gap-1 border-t border-slate-100 p-2">
        <ActionBtn icon={BookOpen} label="التفاصيل" onClick={onViewDetails} primary />
        {row.attempt_id > 0 && (
          <ActionBtn icon={ClipboardList} label="الكتابي" onClick={onReviewWritten} />
        )}
        {(row.status === 'oral_booked' || row.status === 'oral_completed' || row.status === 'completed') && (
          <ActionBtn icon={Mic} label="الشفوي" onClick={onReviewOral} />
        )}
        <Link
          to={`/dashboard/instructor/classes?course=${row.course_id}`}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-black text-deepBlue/55 transition hover:bg-slate-50 hover:text-[#2691C2]"
        >
          <UserPlus className="h-3 w-3" />
          إسناد
        </Link>
        <ActionBtn icon={History} label="السجل" onClick={onViewDetails} />
      </div>
    </motion.article>
  )
}

function ScoreMini({ label, value, max, pct }: { label: string; value: number | null; max: number; pct: number | null }) {
  return (
    <div className="rounded-lg bg-[#F8FAFC] px-2.5 py-2 ring-1 ring-[#22334A]/[0.04]">
      <p className="text-[9px] font-bold text-deepBlue/40">{label}</p>
      <p className="font-mono text-[12px] font-black tabular-nums text-deepBlue">
        {value ?? '—'}<span className="text-[9px] font-semibold text-deepBlue/35">/{max}</span>
      </p>
      {pct != null && <p className="text-[9px] font-bold text-[#2691C2]">{pct}%</p>}
    </div>
  )
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  icon: typeof BookOpen
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-black transition ${
        primary
          ? 'bg-[#22334A] text-white hover:brightness-110'
          : 'text-deepBlue/55 hover:bg-slate-50 hover:text-[#2691C2]'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  )
}
