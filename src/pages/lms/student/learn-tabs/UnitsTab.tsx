import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Calendar, ChevronDown, ClipboardList, FolderOpen, Layers, Users, Video } from 'lucide-react'
import { AssignmentCard, MaterialCard, SessionCard } from '@/components/lms'
import {
  mapCourseLearnAssignmentToStudentAssignment,
  mapCourseLearnMaterialToLmsMaterial,
  mapLearnSessionToLms,
} from '@/api/courseLearnApi'
import type { StudentCourseLearnPayload } from '@/types/courseLearn'
import type { StudentAssignment } from '@/types/lms'
import SearchInput from './shared/SearchInput'
import FilterChips from './shared/FilterChips'
import EmptyHint from './shared/EmptyHint'
import { AccordionSkeleton } from './shared/Skeletons'

type UnitStatusFilter = 'all' | 'completed' | 'in_progress' | 'not_started'

const NEEDS_ACTION = ['pending', 'revision', 'late', 'needs_resubmission']

function lessonActionLabel(status: string | undefined): string {
  const s = String(status ?? '').toLowerCase()
  if (s.includes('complete') || s === 'done') return 'مراجعة الدرس'
  if (s.includes('progress') || s.includes('started') || s.includes('active')) return 'متابعة الدرس'
  return 'بدء الدرس'
}

function moduleProgress(mod: StudentCourseLearnPayload['modules'][number]): number {
  if (typeof mod.progress_percentage === 'number') return Math.round(mod.progress_percentage)
  const done = Math.max(0, mod.completed_lessons_count ?? mod.completed_lessons ?? 0)
  return Math.round((done / Math.max(mod.lessons_count, 1)) * 100)
}

function moduleStatus(mod: StudentCourseLearnPayload['modules'][number]): UnitStatusFilter {
  if (mod.is_completed) return 'completed'
  const pct = moduleProgress(mod)
  if (pct >= 100) return 'completed'
  if (pct > 0) return 'in_progress'
  return 'not_started'
}

type Props = {
  ctx: StudentCourseLearnPayload
  courseId: number
  courseTitle: string
  totalLessons: number
  openModules: Set<number>
  onToggleModule: (id: number) => void
  onSubmitAssignment: (a: StudentAssignment) => void
  loading: boolean
}

export default function UnitsTab({ ctx, courseId, courseTitle, totalLessons, openModules, onToggleModule, onSubmitAssignment, loading }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>('all')

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ctx.modules.filter((m) => {
      if (q && !m.title.toLowerCase().includes(q)) return false
      if (statusFilter !== 'all' && moduleStatus(m) !== statusFilter) return false
      return true
    })
  }, [ctx.modules, search, statusFilter])

  const counts = useMemo(() => {
    const c = { all: ctx.modules.length, completed: 0, in_progress: 0, not_started: 0 }
    for (const m of ctx.modules) c[moduleStatus(m)]++
    return c
  }, [ctx.modules])

  const generalContent = useMemo(() => {
    const nullMaterials = (ctx.materials ?? []).filter((m) => m.module_id == null)
    const nullSessions = (ctx.sessions ?? []).filter((s) => s.module_id == null)
    const nullAssignments = (ctx.assignments ?? []).filter((a) => a.module_id == null && a.visible !== false)
    return { nullMaterials, nullSessions, nullAssignments, has: nullMaterials.length > 0 || nullSessions.length > 0 || nullAssignments.length > 0 }
  }, [ctx.materials, ctx.sessions, ctx.assignments])

  if (loading) {
    return (
      <div className="space-y-4">
        <AccordionSkeleton />
      </div>
    )
  }

  const resetFilters = () => { setSearch(''); setStatusFilter('all') }

  return (
    <div className="space-y-5">
      {ctx.class_group && (
        <div className="rounded-2xl border border-[#F28C00]/20 bg-orange-50/60 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F28C00]/15 text-[#F28C00]">
              <Users className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[13px] font-black text-[#0C2A4B]">فصلك الدراسي: {ctx.class_group.name}</p>
              {ctx.class_group.level_code && (
                <p className="text-[11px] font-semibold text-[#0C2A4B]/60">{ctx.class_group.level_code}</p>
              )}
            </div>
            {ctx.class_group.schedule_day && ctx.class_group.schedule_time && (
              <span className="mr-auto rounded-xl border border-[#0C2A4B]/10 bg-white px-3 py-1 text-[11px] font-bold text-[#0C2A4B]/70">
                {ctx.class_group.schedule_day} · {ctx.class_group.schedule_time}
              </span>
            )}
            {ctx.class_group.meeting_link && (
              <a
                href={ctx.class_group.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0C2A4B] px-4 py-2 text-[11px] font-black text-white transition hover:opacity-90"
              >
                <Video className="h-3.5 w-3.5" />
                رابط الفصل
              </a>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black text-[#0C2A4B]">الوحدات والمنهاج</h2>
            <p className="mt-0.5 text-[13px] font-semibold text-[#0C2A4B]/50">
              {ctx.modules.length > 0
                ? `${ctx.modules.length} وحدة · ${totalLessons} درس`
                : 'سيظهر المنهاج بعد إضافة الوحدات من الإدارة'}
            </p>
          </div>
        </div>

        {ctx.modules.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="ابحث في الوحدات والدروس..." />
            <FilterChips
              options={[
                { value: 'all', label: 'الكل', count: counts.all },
                { value: 'not_started', label: 'لم تبدأ', count: counts.not_started },
                { value: 'in_progress', label: 'قيد التقدم', count: counts.in_progress },
                { value: 'completed', label: 'مكتملة', count: counts.completed },
              ]}
              active={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        )}

        {ctx.modules.length === 0 ? (
          <div className="space-y-4">
            <EmptyHint icon={BookOpen} title="لا توجد وحدات تعليمية متاحة" description="سيتم إضافتها من لوحة المحتوى قريباً" />
            {generalContent.has && (
              <GeneralContentBlock {...generalContent} courseId={courseId} courseTitle={courseTitle} onSubmitAssignment={onSubmitAssignment} />
            )}
          </div>
        ) : filteredModules.length === 0 ? (
          <EmptyHint icon={BookOpen} title="لا توجد وحدات تعليمية متاحة" description="جرّب تعديل البحث أو الفلاتر" onReset={resetFilters} />
        ) : (
          <div className="space-y-3">
            {filteredModules.map((mod) => {
              const idx = ctx.modules.findIndex((m) => m.id === mod.id)
              const isOpen = openModules.has(mod.id)
              const pct = moduleProgress(mod)
              const modLessons = mod.lessons ?? []
              const modMaterials = mod.materials ?? []
              const modSessions = mod.sessions ?? []
              const modAssignments = mod.assignments ?? []
              const hasChildren = modLessons.length > 0 || modMaterials.length > 0 || modSessions.length > 0 || modAssignments.length > 0
              return (
                <div key={mod.id} className="overflow-hidden rounded-2xl border border-[#0C2A4B]/[0.08] bg-white/85 shadow-sm">
                  <button
                    type="button"
                    onClick={() => onToggleModule(mod.id)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-right transition hover:bg-slate-50/60"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-bl from-[#0C2A4B] to-[#0077B6] text-[11px] font-black text-white tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="line-clamp-1 text-[13px] font-black leading-tight text-[#0C2A4B]">{mod.title}</h3>
                        {mod.is_completed && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">✓ مكتملة</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-gradient-to-l from-[#0077B6] to-[#F28C00] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="shrink-0 text-[9px] font-black tabular-nums text-[#0C2A4B]/60">{pct}%</span>
                        <span className="truncate text-[10px] font-semibold text-[#0C2A4B]/40">
                          {mod.lessons_count} درس
                          {(mod.assignments_count ?? 0) > 0 ? ` · ${mod.assignments_count} واجب` : ''}
                          {modMaterials.length > 0 ? ` · ${modMaterials.length} مادة` : ''}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-[#0C2A4B]/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16 }}
                      className="space-y-4 border-t border-[#0C2A4B]/[0.06] px-4 pb-4 pt-4"
                    >
                      {!hasChildren ? (
                        <p className="py-4 text-center text-[12px] font-semibold text-[#0C2A4B]/45">
                          لا يوجد محتوى داخل هذه الوحدة بعد
                        </p>
                      ) : (
                        <>
                          {modLessons.length > 0 && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0C2A4B]/50">
                                <BookOpen className="h-3 w-3" /> الدروس
                              </h4>
                              <div className="space-y-1.5">
                                {modLessons.map((l) => (
                                  <div key={l.id} className="flex items-center gap-3 rounded-xl border border-[#0C2A4B]/[0.06] bg-slate-50/60 px-3 py-2.5">
                                    {l.video_url
                                      ? <Video className="h-3.5 w-3.5 shrink-0 text-[#0077B6]" />
                                      : <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#0C2A4B]/30" />
                                    }
                                    <span className="flex-1 text-[12px] font-semibold text-[#0C2A4B]">{l.title}</span>
                                    {l.duration_minutes != null && (
                                      <span className="text-[10px] font-bold tabular-nums text-[#0C2A4B]/45">{l.duration_minutes} د</span>
                                    )}
                                    <span className="shrink-0 rounded-lg border border-[#0077B6]/20 bg-[#0077B6]/5 px-2 py-1 text-[10px] font-black text-[#0077B6]">
                                      {lessonActionLabel(l.status)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {modSessions.length > 0 && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0C2A4B]/50">
                                <Calendar className="h-3 w-3" /> الجلسات
                              </h4>
                              <div className="space-y-2">
                                {modSessions.map((s) => (
                                  <SessionCard key={s.id} session={mapLearnSessionToLms(s, courseTitle)} showRecording joinMeetingLabel="انضم للجلسة" compact studentDateFormat />
                                ))}
                              </div>
                            </div>
                          )}

                          {modMaterials.length > 0 && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0C2A4B]/50">
                                <FolderOpen className="h-3 w-3" /> المواد
                              </h4>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {modMaterials.map((m) => (
                                  <MaterialCard key={m.id} material={mapCourseLearnMaterialToLmsMaterial(m, { courseId, courseTitle })} />
                                ))}
                              </div>
                            </div>
                          )}

                          {modAssignments.length > 0 && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0C2A4B]/50">
                                <ClipboardList className="h-3 w-3" /> الواجبات
                              </h4>
                              <div className="space-y-2">
                                {modAssignments.map((a) => {
                                  const sa = mapCourseLearnAssignmentToStudentAssignment(a, { courseId, courseTitle })
                                  if (!sa) return null
                                  return (
                                    <AssignmentCard
                                      key={a.id}
                                      assignment={sa}
                                      onSubmit={NEEDS_ACTION.includes(String(sa.status)) ? () => onSubmitAssignment(sa) : undefined}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
                </div>
              )
            })}

            {generalContent.has && (
              <GeneralContentBlock {...generalContent} courseId={courseId} courseTitle={courseTitle} onSubmitAssignment={onSubmitAssignment} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function GeneralContentBlock({
  nullMaterials, nullSessions, nullAssignments, courseId, courseTitle, onSubmitAssignment,
}: {
  nullMaterials: StudentCourseLearnPayload['materials']
  nullSessions: StudentCourseLearnPayload['sessions']
  nullAssignments: StudentCourseLearnPayload['assignments']
  courseId: number
  courseTitle: string
  onSubmitAssignment: (a: StudentAssignment) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200/50 bg-amber-50/40 shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#F28C00]">
          <Layers className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-[14px] font-black text-[#0C2A4B]">محتوى عام للدورة</h3>
          <p className="text-[11px] font-medium text-[#0C2A4B]/55">جلسات ومواد وواجبات على مستوى الدورة</p>
        </div>
      </div>
      <div className="space-y-4 border-t border-amber-200/40 px-4 pb-4 pt-4">
        {nullSessions.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0C2A4B]/50">
              <Calendar className="h-3 w-3" /> الجلسات
            </h4>
            <div className="space-y-2">
              {nullSessions.map((s) => (
                <SessionCard key={s.id} session={mapLearnSessionToLms(s, courseTitle)} showRecording joinMeetingLabel="انضم للجلسة" studentDateFormat />
              ))}
            </div>
          </div>
        )}
        {nullMaterials.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0C2A4B]/50">
              <FolderOpen className="h-3 w-3" /> المواد
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {nullMaterials.map((m) => (
                <MaterialCard key={m.id} material={mapCourseLearnMaterialToLmsMaterial(m, { courseId, courseTitle })} />
              ))}
            </div>
          </div>
        )}
        {nullAssignments.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0C2A4B]/50">
              <ClipboardList className="h-3 w-3" /> الواجبات
            </h4>
            <div className="space-y-2">
              {nullAssignments.map((a) => {
                const sa = mapCourseLearnAssignmentToStudentAssignment(a, { courseId, courseTitle })
                if (!sa) return null
                return (
                  <AssignmentCard
                    key={a.id}
                    assignment={sa}
                    onSubmit={NEEDS_ACTION.includes(String(sa.status)) ? () => onSubmitAssignment(sa) : undefined}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
