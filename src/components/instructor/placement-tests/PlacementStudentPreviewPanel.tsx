import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ClipboardCheck, ExternalLink, Mail, Mic, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { InstructorPlacementTestRow } from '@/api/placementApi'
import { CEFR_MAP, toDMY } from '@/components/instructor/InstructorStudentDrawer'
import { STATUS_AR, STATUS_BADGE, getPipelineStage, overallPct, writtenPct } from './constants'
import { PIPELINE_STAGES } from './constants'

type Props = {
  row: InstructorPlacementTestRow | null
  onViewDetails: () => void
}

export function PlacementStudentPreviewPanel({ row, onViewDetails }: Props) {
  if (!row) {
    return (
      <aside className="sticky top-4 rounded-[16px] border border-dashed border-[#0C2A4B]/10 bg-[#F8FAFC]/80 p-8 text-center">
        <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 text-[13px] font-black text-deepBlue/50">اختر طالباً</p>
        <p className="mt-1 text-[11px] font-semibold text-deepBlue/35">ستظهر معاينة سريعة للطالب هنا</p>
      </aside>
    )
  }

  const wPct = writtenPct(row)
  const overall = overallPct(row)
  const levelBadge = row.final_level
    ? (CEFR_MAP[row.final_level] ?? null)
    : (row.written_level ? CEFR_MAP[row.written_level] ?? null : null)
  const stage = PIPELINE_STAGES.find((s) => s.id === getPipelineStage(row))

  const timeline = [
    { label: 'التسجيل', done: true, date: row.submitted_at },
    { label: 'اكتمل الكتابي', done: !!row.submitted_at, date: row.submitted_at },
    { label: 'حجز المقابلة', done: !!row.oral_booking_at, date: row.oral_booking_at },
    { label: 'اكتملت المقابلة', done: row.status === 'oral_completed' || row.status === 'completed', date: row.oral_booking_ends_at },
    { label: 'تم الإسناد', done: row.is_assigned, date: row.assigned_at },
  ]

  return (
    <motion.aside
      key={row.student_id}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="sticky top-4 rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
    >
      <div className="border-b border-slate-100 bg-gradient-to-l from-[#0C2A4B]/5 to-transparent p-4">
        <div className="flex flex-col items-center text-center">
          {row.avatar_url ? (
            <img src={row.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white shadow-md" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0C2A4B]/8 text-xl font-black text-deepBlue">
              {row.student_name.charAt(0)}
            </div>
          )}
          <h3 className="mt-3 text-[15px] font-black text-deepBlue">{row.student_name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-deepBlue/45" dir="ltr">
            <Mail className="h-3 w-3" />
            {row.student_email}
          </p>
          <p className="text-[10px] font-bold text-deepBlue/35">#{row.student_id}</p>
          {levelBadge && (
            <span className={`mt-2 rounded-xl px-2.5 py-1 text-[11px] font-black ${levelBadge.bg} ${levelBadge.text}`}>
              {levelBadge.cefr} · {levelBadge.arabic}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <InfoRow label="الدورة" value={row.course_title || '—'} />
        <InfoRow label="تاريخ التسجيل" value={row.submitted_at ? toDMY(row.submitted_at) : '—'} icon={<Calendar className="h-3 w-3" />} />
        <InfoRow label="الكتابي" value={wPct != null ? `${row.written_score}/${row.total_questions ?? '—'} (${wPct}%)` : '—'} />
        <InfoRow label="الشفوي" value={row.oral_score != null ? `${row.oral_score}/100` : '—'} />
        <InfoRow label="الإجمالي" value={overall != null ? `${overall}%` : '—'} />
        <InfoRow label="مرحلة المسار" value={stage?.label ?? '—'} />
        <InfoRow label="حالة المقابلة" value={row.oral_booking_at ? 'محجوزة' : '—'} />
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ring-1 ${STATUS_BADGE[row.status] ?? STATUS_BADGE.not_started}`}>
            {STATUS_AR[row.status] ?? row.status}
          </span>
          <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-black text-deepBlue/55 ring-1 ring-slate-200/80">
            {row.is_assigned ? 'مُسند' : 'غير مُسند'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-deepBlue/40">الخط الزمني</p>
          <ol className="space-y-2">
            {timeline.map((t) => (
              <li key={t.label} className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${t.done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                <span className={`flex-1 text-[10px] font-bold ${t.done ? 'text-deepBlue' : 'text-deepBlue/35'}`}>{t.label}</span>
                {t.date && <span className="font-mono text-[9px] text-deepBlue/35">{toDMY(t.date)}</span>}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={onViewDetails}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0C2A4B] px-3 py-2.5 text-[11px] font-black text-white transition hover:brightness-110"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            عرض التفاصيل الكاملة
          </button>
          <Link
            to={`/dashboard/instructor/courses/${row.course_id}/placement-students`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#0077B6]/25 bg-sky-50/50 px-3 py-2.5 text-[11px] font-black text-[#0077B6] transition hover:bg-sky-50"
          >
            <Mic className="h-3.5 w-3.5" />
            مراجعة التقييم
          </Link>
          <Link
            to={`/dashboard/instructor/classes?course=${row.course_id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] font-black text-deepBlue/65 transition hover:bg-slate-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            إسناد إلى صف
          </Link>
        </div>
      </div>
    </motion.aside>
  )
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="flex items-center gap-1 font-semibold text-deepBlue/45">
        {icon}
        {label}
      </span>
      <span className="truncate font-black text-deepBlue">{value}</span>
    </div>
  )
}
