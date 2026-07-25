import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { Award, BookOpen, Calendar, ClipboardList, GraduationCap, Layers, TrendingUp } from 'lucide-react'
import type { StudentLearnModule } from '@/types/courseLearn'
import EmptyHint from './shared/EmptyHint'

type Props = {
  progressPct: number
  totalLessons: number
  doneLessons: number
  doneAssignments: number
  assignmentsCount: number
  upcomingCount: number
  completedSessionsCount: number
  instructor: string
  modules: StudentLearnModule[]
}

function moduleProgress(mod: StudentLearnModule): number {
  if (typeof mod.progress_percentage === 'number') return Math.round(mod.progress_percentage)
  const done = Math.max(0, mod.completed_lessons_count ?? mod.completed_lessons ?? 0)
  return Math.round((done / Math.max(mod.lessons_count, 1)) * 100)
}

export default function ProgressTab({
  progressPct, totalLessons, doneLessons, doneAssignments, assignmentsCount,
  upcomingCount, completedSessionsCount, instructor, modules,
}: Props) {
  const nextModule = modules.find((m) => !m.is_completed && moduleProgress(m) < 100) ?? null
  const nextLesson = nextModule?.lessons?.find((l) => String(l.status).toLowerCase() !== 'completed' && String(l.status).toLowerCase() !== 'done') ?? null

  if (modules.length === 0 && totalLessons === 0 && assignmentsCount === 0) {
    return <EmptyHint icon={TrendingUp} title="لا توجد بيانات تقدم كافية بعد" description="سيظهر تقدّمك هنا بعد بدء الدروس والواجبات" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-xl font-black text-[#0C2A4B]">تقدّمك في هذه الدورة</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: 'التقدّم الإجمالي', Icon: Layers, value: `${progressPct}%`,
              sub: totalLessons > 0 ? `${doneLessons} / ${totalLessons} درس مكتمل` : 'لا دروس مسجّلة بعد',
              color: 'text-[#0077B6]',
            },
            {
              label: 'الواجبات', Icon: ClipboardList, value: `${doneAssignments} / ${assignmentsCount}`,
              sub: assignmentsCount > 0 ? 'واجب تم تسليمه' : 'لا واجبات ظاهرة حتى الآن',
              color: 'text-[#F28C00]',
            },
            {
              label: 'الجلسات', Icon: Calendar, value: `${upcomingCount}`,
              sub: upcomingCount > 0 ? 'جلسة قادمة أو نشطة' : `${completedSessionsCount} جلسة مكتملة`,
              color: 'text-emerald-600',
            },
          ].map(({ label, value, Icon, sub, color }) => (
            <motion.div key={label} whileHover={{ y: -2 }} className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm ring-1 ring-[#0C2A4B]/[0.04]">
              <Icon className={`mb-3 h-5 w-5 ${color}`} />
              <p className="text-[11px] font-black uppercase tracking-wide text-[#0C2A4B]/50">{label}</p>
              <p className="mt-2 text-2xl font-black tabular-nums text-[#0C2A4B]">{value}</p>
              {sub && <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#0C2A4B]/50">{sub}</p>}
            </motion.div>
          ))}
        </div>
      </div>

      {modules.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-black text-[#0C2A4B]">تقدّم الوحدات</h2>
          <div className="space-y-2">
            {modules.map((mod) => {
              const pct = moduleProgress(mod)
              return (
                <div key={mod.id} className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm ring-1 ring-[#0C2A4B]/[0.04]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate text-[13px] font-black text-[#0C2A4B]">{mod.title}</p>
                    <span className="shrink-0 text-[12px] font-black tabular-nums text-[#0C2A4B]/60">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-l from-[#0077B6] to-[#F28C00]" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold text-[#0C2A4B]/45">
                    {(mod.completed_lessons_count ?? mod.completed_lessons ?? 0)} / {mod.lessons_count} درس
                    {mod.assignments_count != null ? ` · ${mod.submitted_assignments_count ?? 0} / ${mod.assignments_count} واجب` : ''}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(nextModule || nextLesson) && (
        <div className="rounded-2xl border border-[#0077B6]/20 bg-blue-50/40 p-5">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#0077B6]/70">الخطوة التالية المقترحة</p>
          <p className="mt-1.5 text-[13px] font-bold text-[#0C2A4B]">
            {nextLesson ? `تابع الدرس: ${nextLesson.title}` : `تابع الوحدة: ${nextModule?.title}`}
          </p>
        </div>
      )}

      {instructor && (
        <div>
          <h2 className="mb-3 text-lg font-black text-[#0C2A4B]">المدرب المسؤول</h2>
          <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-sm ring-1 ring-[#0C2A4B]/[0.04]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-bl from-[#0C2A4B] to-[#0077B6] text-lg font-black text-white">
              {instructor.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-[#0C2A4B]">{instructor}</p>
              <p className="mt-0.5 text-[12px] font-semibold text-[#0C2A4B]/50">مدرب الدورة</p>
            </div>
            <Link to="/dashboard/student/sessions" className="inline-flex items-center gap-2 rounded-2xl border border-[#0C2A4B]/12 px-4 py-2 text-[12px] font-black text-[#0C2A4B] transition hover:border-[#F28C00]/30">
              <Calendar className="h-4 w-4" />
              جلساتي مع المدرب
            </Link>
          </div>
        </div>
      )}

      <div className={`rounded-3xl border p-6 ${
        progressPct >= 100
          ? 'border-emerald-200/80 bg-gradient-to-bl from-emerald-50 to-teal-50/40'
          : progressPct > 0
            ? 'border-[#0077B6]/15 bg-gradient-to-bl from-blue-50/50 to-white/80'
            : 'border-[#0C2A4B]/[0.08] bg-white/80'
      }`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            progressPct >= 100 ? 'bg-emerald-100 text-emerald-600'
            : progressPct > 0 ? 'bg-[#0077B6]/10 text-[#0077B6]'
            : 'bg-[#0C2A4B]/[0.06] text-[#0C2A4B]/40'
          }`}>
            {progressPct >= 100 ? <Award className="h-6 w-6" /> : progressPct > 0 ? <GraduationCap className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
          </span>
          <div className="flex-1">
            <h3 className={`font-black ${progressPct >= 100 ? 'text-emerald-700' : 'text-[#0C2A4B]'}`}>
              {progressPct >= 100 ? 'أكملت الدورة بنجاح!' : progressPct > 0 ? `استمر في التعلّم — ${progressPct}% مكتمل` : 'ابدأ رحلة التعلّم'}
            </h3>
            <p className="mt-0.5 text-[12px] font-semibold text-[#0C2A4B]/50">
              {progressPct >= 100 ? 'يمكنك طلب شهادة إتمام الدورة من الإدارة.' : progressPct > 0 ? 'أكمل الدروس والواجبات للوصول إلى 100%.' : 'ابدأ بمراجعة الوحدات والدروس المتاحة.'}
            </p>
          </div>
          {progressPct >= 100 && (
            <Link to="/dashboard/student/certificates" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-[12px] font-black text-white shadow-md shadow-emerald-200 transition hover:opacity-90">
              <Award className="h-4 w-4" />
              شهاداتي
            </Link>
          )}
        </div>

        {progressPct > 0 && progressPct < 100 && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[11px] font-black text-[#0C2A4B]/50">
              <span>{progressPct}%</span>
              <span>100%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#0C2A4B]/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-[#0077B6] to-[#F28C00]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
