import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { motion } from 'framer-motion'
import {
  Archive,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FolderOpen,
  Gauge,
  Layers,
  LayoutGrid,
  Mail,
  Megaphone,
  Mic,
  Pencil,
  Plus,
  Printer,
  Send,
  Settings as SettingsIcon,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  archiveClassAnnouncement,
  createClassAnnouncement,
  createClassGroupSession,
  fetchClassGroupAnnouncements,
  fetchClassGroupAssignments,
  fetchClassGroupAttendance,
  fetchClassGroupDetail,
  fetchClassGroupSessions,
  fetchClassGroupStudents,
  publishClassAnnouncement,
  updateClassGroup,
  previewClassSessionGeneration,
  generateClassSessions,
  type ClassAnnouncementRow,
  type ClassAssignmentStudent,
  type ClassGroupAssignmentRow,
  type ClassGroupAttendanceRow,
  type ClassGroupDetail,
  type ClassGroupSessionRow,
} from '@/api/placementApi'
import { CEFR_MAP, OralAssessmentDetailModal } from '@/components/instructor'
import { CurriculumOverviewTab, UnitsTab, LessonsTab } from './InstructorCurriculumTabs'
import { InstructorMaterialsTab } from './InstructorMaterialsTab'
import { InstructorCurriculumAnalyticsSection } from './InstructorCurriculumAnalyticsSection'
import { BackButton } from '@/components/shared/BackButton'
import SessionStatusBadge from '@/components/sessions/SessionStatusBadge'
import { formatAmsterdamDMY, formatAmsterdamTime24 } from '@/utils/amsterdamTime'
import toast from '@/lib/toast'

type Tab =
  | 'overview' | 'students' | 'curriculum' | 'units' | 'lessons' | 'sessions'
  | 'materials' | 'assignments' | 'attendance' | 'announcements'
  | 'progress' | 'analytics' | 'settings'

const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
  { id: 'overview',      label: 'نظرة عامة',   icon: LayoutGrid },
  { id: 'students',      label: 'الطلاب',      icon: Users },
  { id: 'curriculum',    label: 'المنهج',       icon: BookOpen },
  { id: 'units',         label: 'الوحدات',      icon: Layers },
  { id: 'lessons',       label: 'الدروس',       icon: BookOpen },
  { id: 'sessions',      label: 'الجلسات',     icon: Calendar },
  { id: 'materials',     label: 'المواد',      icon: FolderOpen },
  { id: 'assignments',   label: 'الواجبات',    icon: ClipboardCheck },
  { id: 'attendance',    label: 'الحضور',      icon: UserCheck },
  { id: 'announcements', label: 'الإعلانات',   icon: Megaphone },
  { id: 'progress',      label: 'التقدم',      icon: Gauge },
  { id: 'analytics',     label: 'التحليلات',   icon: BarChart3 },
  { id: 'settings',      label: 'الإعدادات',    icon: SettingsIcon },
]

const VALID_TABS: Tab[] = TABS.map((t) => t.id)

/** Tabs whose content is fetched on entry — the others render from `detail` alone. */
const FETCHED_TABS: ReadonlySet<Tab> = new Set<Tab>([
  'students', 'progress', 'sessions', 'attendance', 'assignments', 'announcements',
])

const PRIORITY_LABEL: Record<string, string> = { normal: 'عادي', important: 'مهم', urgent: 'عاجل' }
const PRIORITY_CLS: Record<string, string> = {
  normal: 'bg-slate-100 text-slate-600', important: 'bg-amber-50 text-amber-700', urgent: 'bg-red-50 text-red-700',
}
const ANNOUNCEMENT_STATUS_LABEL: Record<string, string> = { draft: 'مسودة', published: 'منشور', archived: 'مؤرشف' }
const ANNOUNCEMENT_STATUS_CLS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', published: 'bg-emerald-50 text-emerald-700', archived: 'bg-slate-200 text-slate-500',
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('') || '?'
}

export default function InstructorClassWorkspacePage() {
  const { groupId, tab: tabParam } = useParams<{ groupId: string; tab?: string }>()
  const navigate = useNavigate()
  const tab: Tab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'overview'

  const [detail,  setDetail]  = useState<ClassGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<ClassAssignmentStudent[]>([])
  const [sessions, setSessions] = useState<ClassGroupSessionRow[]>([])
  const [attendance, setAttendance] = useState<ClassGroupAttendanceRow[]>([])
  const [assignments, setAssignments] = useState<ClassGroupAssignmentRow[]>([])
  const [announcements, setAnnouncements] = useState<ClassAnnouncementRow[]>([])
  const [tabLoading, setTabLoading] = useState(() => Boolean(groupId) && FETCHED_TABS.has(tab))
  const [assessmentStudent, setAssessmentStudent] = useState<ClassAssignmentStudent | null>(null)
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementBody, setAnnouncementBody] = useState('')
  const [announcementBusy, setAnnouncementBusy] = useState(false)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessionForm, setSessionForm] = useState({ title: '', session_date: '', start_time: '', end_time: '' })
  const [sessionBusy, setSessionBusy] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ name: '', capacity: 0 })
  const [settingsBusy, setSettingsBusy] = useState(false)

  // Re-arm the loading states during render when the route changes (react.dev
  // "adjusting state when a prop changes"), so a new group/tab never paints the previous
  // one's data as if it were settled. The initial values above already cover mount.
  const [seenRoute, setSeenRoute] = useState({ groupId, tab })
  if (seenRoute.groupId !== groupId || seenRoute.tab !== tab) {
    if (groupId) {
      if (seenRoute.groupId !== groupId) setLoading(true)
      setTabLoading(FETCHED_TABS.has(tab))
    }
    setSeenRoute({ groupId, tab })
  }

  useEffect(() => {
    if (!groupId) return
    fetchClassGroupDetail(Number(groupId))
      .then((d) => {
        setDetail(d)
        if (d) setSettingsForm({ name: d.name, capacity: d.capacity })
      })
      .catch(() => toast.error('تعذّر تحميل بيانات الصف'))
      .finally(() => setLoading(false))
  }, [groupId])

  async function handleSaveSettings() {
    if (!groupId || !detail) return
    setSettingsBusy(true)
    try {
      await updateClassGroup(Number(groupId), { name: settingsForm.name, capacity: settingsForm.capacity })
      toast.success('تم حفظ إعدادات الصف.')
      const refreshed = await fetchClassGroupDetail(Number(groupId))
      setDetail(refreshed)
    } catch {
      toast.error('تعذّر حفظ الإعدادات تحقق من صلاحياتك وحالة الصف.')
    } finally {
      setSettingsBusy(false)
    }
  }

  useEffect(() => {
    if (!groupId) return
    const id = Number(groupId)
    // `tabLoading` was already armed for this tab during render (see above).
    const done = () => setTabLoading(false)
    if (tab === 'students' || tab === 'progress') fetchClassGroupStudents(id).then(setStudents).catch(() => setStudents([])).finally(done)
    else if (tab === 'sessions') fetchClassGroupSessions(id).then(setSessions).catch(() => setSessions([])).finally(done)
    else if (tab === 'attendance') fetchClassGroupAttendance(id).then(setAttendance).catch(() => setAttendance([])).finally(done)
    else if (tab === 'assignments') fetchClassGroupAssignments(id).then(setAssignments).catch(() => setAssignments([])).finally(done)
    else if (tab === 'announcements') fetchClassGroupAnnouncements(id).then(setAnnouncements).catch(() => setAnnouncements([])).finally(done)
  }, [groupId, tab])

  function reloadAnnouncements() {
    if (!groupId) return
    fetchClassGroupAnnouncements(Number(groupId)).then(setAnnouncements).catch(() => {})
  }

  async function handleCreateAnnouncement() {
    if (!groupId || !announcementTitle.trim() || !announcementBody.trim()) return
    setAnnouncementBusy(true)
    try {
      await createClassAnnouncement(Number(groupId), { title: announcementTitle.trim(), body: announcementBody.trim() })
      toast.success('تم إنشاء الإعلان كمسودة.')
      setAnnouncementTitle('')
      setAnnouncementBody('')
      setShowAnnouncementForm(false)
      reloadAnnouncements()
    } catch {
      toast.error('تعذّر إنشاء الإعلان.')
    } finally {
      setAnnouncementBusy(false)
    }
  }

  async function handlePublishAnnouncement(id: number) {
    if (!groupId) return
    try {
      await publishClassAnnouncement(Number(groupId), id)
      toast.success('تم نشر الإعلان لجميع طلاب الصف.')
      reloadAnnouncements()
    } catch {
      toast.error('تعذّر نشر الإعلان.')
    }
  }

  async function handleArchiveAnnouncement(id: number) {
    if (!groupId) return
    try {
      await archiveClassAnnouncement(Number(groupId), id)
      toast.success('تمت أرشفة الإعلان.')
      reloadAnnouncements()
    } catch {
      toast.error('تعذّر أرشفة الإعلان.')
    }
  }

  async function handleCreateSession() {
    if (!groupId || !sessionForm.title.trim() || !sessionForm.session_date || !sessionForm.start_time || !sessionForm.end_time) return
    setSessionBusy(true)
    try {
      await createClassGroupSession(Number(groupId), sessionForm)
      toast.success('تم إنشاء الجلسة.')
      setSessionForm({ title: '', session_date: '', start_time: '', end_time: '' })
      setShowSessionForm(false)
      fetchClassGroupSessions(Number(groupId)).then(setSessions).catch(() => {})
    } catch {
      toast.error('تعذّر إنشاء الجلسة تحقق من حالة الصف والبيانات المدخلة.')
    } finally {
      setSessionBusy(false)
    }
  }

  const cefr = detail?.level_code ? (CEFR_MAP[detail.level_code] ?? null) : null

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      <BackButton to="/dashboard/instructor/classes" />

      {loading ? (
        <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
      ) : !detail ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Layers className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-[15px] font-black text-deepBlue">تعذّر العثور على هذا الصف</p>
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-deepBlue via-[#1a2d44] to-customBlue px-6 py-6 shadow-[0_20px_50px_-20px_rgba(12,42,75,0.5)] sm:px-8"
          >
            <div aria-hidden className="pointer-events-none absolute -left-10 top-0 h-44 w-44 rounded-full bg-customOrange/15 blur-[80px]" />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">مساحة عمل الصف</p>
                <h1 className="mt-0.5 text-[1.4rem] font-black leading-tight text-white">{detail.name}</h1>
                {detail.course?.title && (
                  <p className="mt-1 text-[12px] font-semibold text-white/60">{detail.course.title}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {cefr && (
                  <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${cefr.bg} ${cefr.text}`}>
                    {cefr.cefr} · {cefr.arabic}
                  </span>
                )}
                <span className="rounded-xl bg-white/15 px-2.5 py-1 text-[10px] font-black text-white">
                  {detail.current_students_count}/{detail.capacity} طالب
                </span>
              </div>
            </div>
          </motion.div>

          {/* Quick actions every action's enabled state comes from the
              backend `permissions` block, never inferred from `status` here. */}
          <QuickActions
            permissions={detail.permissions}
            onAddSession={() => { navigate(`/dashboard/instructor/classes/${groupId}/sessions`); setShowSessionForm(true) }}
            onRecordAttendance={() => navigate(`/dashboard/instructor/classes/${groupId}/attendance`)}
            onSendAnnouncement={() => { navigate(`/dashboard/instructor/classes/${groupId}/announcements`); setShowAnnouncementForm(true) }}
            onViewAnalytics={() => navigate(`/dashboard/instructor/classes/${groupId}/analytics`)}
          />

          {/* Tabs */}
          <div className="flex flex-wrap gap-2" role="tablist">
            {TABS.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                to={`/dashboard/instructor/classes/${groupId}/${id}`}
                role="tab"
                aria-selected={tab === id}
                className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-[12px] font-black transition ${
                  tab === id
                    ? 'bg-deepBlue text-white shadow-md shadow-deepBlue/20'
                    : 'border border-deepBlue/[0.1] bg-white text-deepBlue/60 hover:border-deepBlue/20'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </div>

          {/* Tab content */}
          {tabLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : tab === 'overview' ? (
            <OverviewTab detail={detail} />
          ) : tab === 'curriculum' && detail ? (
            <CurriculumOverviewTab courseId={detail.course?.id ?? 0} />
          ) : tab === 'units' && detail ? (
            <UnitsTab courseId={detail.course?.id ?? 0} canManage={detail.permissions.edit} />
          ) : tab === 'lessons' && detail ? (
            <LessonsTab courseId={detail.course?.id ?? 0} canManage={detail.permissions.edit} />
          ) : tab === 'students' ? (
            students.length === 0 ? (
              <EmptyTab label="لا يوجد طلاب معيّنون في هذا الصف بعد" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {students.map((s) => {
                  const lvl = s.final_level ?? s.written_level
                  const lvlInfo = lvl ? (CEFR_MAP[lvl] ?? null) : null
                  const hasAssessment = !!s.oral_assessment
                  return (
                    <motion.div
                      key={s.student_id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      {/* Header: avatar, name, email, level badge */}
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-bl from-[#0C2A4B] to-[#0077B6] text-[12px] font-black text-white">
                          {s.avatar_url ? <img src={s.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(s.student_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-black text-deepBlue">{s.student_name}</p>
                          <p className="flex items-center gap-1 truncate text-[10px] font-semibold text-slate-500">
                            <Mail className="h-3 w-3 shrink-0" />
                            {s.student_email || '—'}
                          </p>
                        </div>
                        {lvlInfo && (
                          <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ${lvlInfo.bg} ${lvlInfo.text}`}>
                            {lvlInfo.cefr}
                          </span>
                        )}
                      </div>

                      {/* Score row: written + oral */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {s.written_score != null && (
                          <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] font-black text-deepBlue/70">
                            كتابي {s.written_score}/{s.total_questions ?? 70}
                          </span>
                        )}
                        {s.oral_score != null && (
                          <span className="flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 font-mono text-[10px] font-black text-violet-700">
                            <Mic className="h-2.5 w-2.5" />
                            درجة المقابلة {s.oral_score}/100
                          </span>
                        )}
                        {s.oral_assessment?.interview.starts_at && (
                          <span className="rounded-lg bg-sky-50 px-2 py-1 font-mono text-[10px] font-black text-sky-700">
                            {formatAmsterdamDMY(s.oral_assessment.interview.starts_at)}
                          </span>
                        )}
                      </div>

                      {/* Assignment status + actions */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          مُلحق بالصف
                        </span>
                        <div className="mr-auto flex gap-1.5">
                          {hasAssessment && (
                            <button
                              type="button"
                              onClick={() => setAssessmentStudent(s)}
                              className="flex items-center gap-1 rounded-lg border border-[#0077B6]/25 bg-[#0077B6]/[0.06] px-2 py-1 text-[9px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/[0.12]"
                            >
                              <Eye className="h-2.5 w-2.5" />
                              عرض التقييم الكامل
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => detail?.course && navigate(`/dashboard/instructor/courses/${detail.course.id}/placement-students`)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-black text-deepBlue/55 transition hover:bg-slate-50"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                            تعديل
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )
          ) : tab === 'sessions' ? (
            <div className="space-y-3">
              {detail.permissions.create_session && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  {!showSessionForm ? (
                    <button
                      type="button"
                      onClick={() => setShowSessionForm(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-deepBlue px-3 py-2 text-[11px] font-black text-white transition hover:bg-deepBlue/90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      إضافة جلسة
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        value={sessionForm.title}
                        onChange={(e) => setSessionForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="عنوان الجلسة"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="date"
                          value={sessionForm.session_date}
                          onChange={(e) => setSessionForm((f) => ({ ...f, session_date: e.target.value }))}
                          className="rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]"
                        />
                        <input
                          type="time"
                          value={sessionForm.start_time}
                          onChange={(e) => setSessionForm((f) => ({ ...f, start_time: e.target.value }))}
                          className="rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]"
                        />
                        <input
                          type="time"
                          value={sessionForm.end_time}
                          onChange={(e) => setSessionForm((f) => ({ ...f, end_time: e.target.value }))}
                          className="rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={sessionBusy}
                          onClick={handleCreateSession}
                          className="rounded-xl bg-deepBlue px-3 py-2 text-[11px] font-black text-white transition hover:bg-deepBlue/90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          إنشاء
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSessionForm(false)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-deepBlue/55 transition hover:bg-slate-50"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {detail.permissions.create_session && (
                <SessionGenerationPanel groupId={groupId!} onGenerated={() => fetchClassGroupSessions(Number(groupId)).then(setSessions).catch(() => {})} />
              )}

              {sessions.length === 0 ? (
                <EmptyTab label="لا توجد جلسات مخصّصة لهذا الصف بعد" />
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => {
                    const isLms = s.source_type === 'lms_session'
                    return (
                      <div
                        key={`${s.source_type}-${s.id}`}
                        role={isLms ? 'button' : undefined}
                        onClick={isLms ? () => navigate(`/dashboard/instructor/classes/${groupId}/sessions/${s.id}`) : undefined}
                        className={`flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 ${isLms ? 'cursor-pointer transition hover:border-[#0077B6]/30' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] font-black text-deepBlue">{s.title}</p>
                          {s.status && <SessionStatusBadge status={s.status} />}
                        </div>
                        <p className="font-mono text-[11px] font-bold text-deepBlue/50">
                          {s.starts_at ? `${formatAmsterdamDMY(s.starts_at)} · ${formatAmsterdamTime24(s.starts_at)}` : s.session_date ?? '—'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : tab === 'attendance' ? (
            attendance.length === 0 ? (
              <EmptyTab label="لا توجد سجلات حضور لهذا الصف بعد" />
            ) : (
              <div className="space-y-2">
                {attendance.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[12px] font-black text-deepBlue">{a.student_name ?? `#${a.user_id}`}</p>
                    <p className="text-[11px] font-bold text-deepBlue/50">{a.status}</p>
                  </div>
                ))}
              </div>
            )
          ) : tab === 'materials' && detail ? (
            <InstructorMaterialsTab courseId={detail.course?.id ?? 0} classGroupId={detail.id} canManage={detail.permissions.edit} />
          ) : tab === 'assignments' ? (
            assignments.length === 0 ? (
              <EmptyTab label="لا توجد واجبات مخصّصة لهذا الصف بعد" />
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[12px] font-black text-deepBlue">{a.title}</p>
                    <p className="font-mono text-[11px] font-bold text-deepBlue/50">
                      {a.due_date ? `${formatAmsterdamDMY(a.due_date)}` : '—'}
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : tab === 'announcements' ? (
            <div className="space-y-3">
              {detail.permissions.send_announcement && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  {!showAnnouncementForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAnnouncementForm(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-deepBlue px-3 py-2 text-[11px] font-black text-white transition hover:bg-deepBlue/90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      إعلان جديد
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        value={announcementTitle}
                        onChange={(e) => setAnnouncementTitle(e.target.value)}
                        placeholder="عنوان الإعلان"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]"
                      />
                      <textarea
                        value={announcementBody}
                        onChange={(e) => setAnnouncementBody(e.target.value)}
                        placeholder="نص الإعلان"
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-deepBlue outline-none focus:border-[#0077B6]"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={announcementBusy || !announcementTitle.trim() || !announcementBody.trim()}
                          onClick={handleCreateAnnouncement}
                          className="rounded-xl bg-deepBlue px-3 py-2 text-[11px] font-black text-white transition hover:bg-deepBlue/90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          حفظ كمسودة
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowAnnouncementForm(false); setAnnouncementTitle(''); setAnnouncementBody('') }}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-deepBlue/55 transition hover:bg-slate-50"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {announcements.length === 0 ? (
                <EmptyTab label="لا توجد إعلانات لهذا الصف بعد" />
              ) : (
                <div className="space-y-2">
                  {announcements.map((a) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[13px] font-black text-deepBlue">{a.title}</p>
                            <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black ${PRIORITY_CLS[a.priority] ?? PRIORITY_CLS.normal}`}>
                              {PRIORITY_LABEL[a.priority] ?? a.priority}
                            </span>
                            <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black ${ANNOUNCEMENT_STATUS_CLS[a.status] ?? ''}`}>
                              {ANNOUNCEMENT_STATUS_LABEL[a.status] ?? a.status}
                            </span>
                          </div>
                          {/* Body is plain text from the backend rendered as text
                              content, never dangerouslySetInnerHTML, so there is no
                              HTML/script injection surface here. */}
                          <p className="mt-1.5 whitespace-pre-line text-[11.5px] font-semibold text-deepBlue/70">{a.body}</p>
                          {a.published_at && (
                            <p className="mt-1.5 font-mono text-[10px] font-bold text-deepBlue/40">
                              {formatAmsterdamDMY(a.published_at)} · {formatAmsterdamTime24(a.published_at)}
                            </p>
                          )}
                        </div>
                        {detail.permissions.send_announcement && a.status !== 'archived' && (
                          <div className="flex shrink-0 gap-1.5">
                            {a.status === 'draft' && (
                              <button
                                type="button"
                                onClick={() => handlePublishAnnouncement(a.id)}
                                className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700 transition hover:bg-emerald-100"
                              >
                                <Send className="h-2.5 w-2.5" />
                                نشر
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleArchiveAnnouncement(a.id)}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-black text-deepBlue/55 transition hover:bg-slate-50"
                            >
                              <Archive className="h-2.5 w-2.5" />
                              أرشفة
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : tab === 'progress' ? (
            <ProgressTab summary={detail.progress_summary} students={students} />
          ) : tab === 'analytics' ? (
            <AnalyticsTab detail={detail} />
          ) : tab === 'settings' ? (
            <SettingsTab
              detail={detail}
              form={settingsForm}
              setForm={setSettingsForm}
              busy={settingsBusy}
              onSave={handleSaveSettings}
            />
          ) : (
            <EmptyTab label="لا توجد بيانات بعد لهذا القسم" />
          )}
        </>
      )}

      <OralAssessmentDetailModal
        student={assessmentStudent}
        courseId={detail?.course?.id ?? null}
        onClose={() => setAssessmentStudent(null)}
      />
    </div>
  )
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
      <p className="text-[13px] font-semibold text-deepBlue/40">{label}</p>
    </div>
  )
}

function ClassKpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-wide text-deepBlue/40">{label}</p>
      <p className="mt-1 text-[18px] font-black text-deepBlue">{value}</p>
    </div>
  )
}

/** Overview tab — entirely backend-driven from the canonical class-detail
 * endpoint's `counts`/`next_session`/`attendance_summary`/`progress_summary`.
 * No value here is calculated in React. */
function OverviewTab({ detail }: { detail: ClassGroupDetail }) {
  const c = detail.counts
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ClassKpiCard label="الطلاب" value={c.students} />
        <ClassKpiCard label="الجلسات" value={c.sessions} />
        <ClassKpiCard label="المواد" value={c.materials} />
        <ClassKpiCard label="الواجبات" value={c.assignments} />
        <ClassKpiCard label="نسبة الحضور" value={`${detail.attendance_summary.attendance_percentage}%`} />
        <ClassKpiCard label="متوسط التقدم" value={`${detail.progress_summary.average_progress_percentage}%`} />
        <ClassKpiCard label="بانتظار المراجعة" value={c.pending_reviews} />
        <ClassKpiCard label="الإعلانات" value={c.announcements} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-black text-deepBlue/50">الجلسة القادمة</p>
        {detail.next_session ? (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[13px] font-black text-deepBlue">{detail.next_session.title}</p>
            <p className="font-mono text-[11px] font-bold text-deepBlue/50">
              {formatAmsterdamDMY(detail.next_session.starts_at)} · {formatAmsterdamTime24(detail.next_session.starts_at)}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[12px] font-semibold text-deepBlue/35">لا توجد جلسة قادمة مجدولة</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-black text-deepBlue/50">ملخص الحضور</p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            <div><p className="text-[15px] font-black text-emerald-600">{detail.attendance_summary.present}</p><p className="text-[9px] font-bold text-deepBlue/40">حاضر</p></div>
            <div><p className="text-[15px] font-black text-red-500">{detail.attendance_summary.absent}</p><p className="text-[9px] font-bold text-deepBlue/40">غائب</p></div>
            <div><p className="text-[15px] font-black text-amber-600">{detail.attendance_summary.late}</p><p className="text-[9px] font-bold text-deepBlue/40">متأخر</p></div>
            <div><p className="text-[15px] font-black text-slate-500">{detail.attendance_summary.excused}</p><p className="text-[9px] font-bold text-deepBlue/40">معذور</p></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-black text-deepBlue/50">ملخص التقدم</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[15px] font-black text-deepBlue">{detail.progress_summary.students_total}</p><p className="text-[9px] font-bold text-deepBlue/40">إجمالي</p></div>
            <div><p className="text-[15px] font-black text-emerald-600">{detail.progress_summary.students_completed}</p><p className="text-[9px] font-bold text-deepBlue/40">مكتمل</p></div>
            <div><p className="text-[15px] font-black text-red-500">{detail.progress_summary.at_risk_students}</p><p className="text-[9px] font-bold text-deepBlue/40">في خطر</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProgressTab({
  summary,
  students,
}: {
  summary: ClassGroupDetail['progress_summary']
  students: ClassAssignmentStudent[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ClassKpiCard label="متوسط تقدم الصف" value={`${summary.average_progress_percentage}%`} />
        <ClassKpiCard label="إجمالي الطلاب" value={summary.students_total} />
        <ClassKpiCard label="أنهوا التقييم" value={summary.students_completed} />
        <ClassKpiCard label="طلاب في خطر" value={summary.at_risk_students} />
      </div>
      {students.length === 0 ? (
        <EmptyTab label="لا توجد بيانات تقدم لهذا الصف بعد" />
      ) : (
        <div className="space-y-2">
          {students.map((s) => (
            <div key={s.student_id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[12px] font-black text-deepBlue">{s.student_name}</p>
              <p className="text-[11px] font-bold text-deepBlue/50">{s.final_level ?? s.written_level ?? 'قيد التقييم'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Analytics tab — read-only, sourced entirely from the canonical detail
 * endpoint's already-computed counts. No row-level download-and-aggregate
 * in React, and no fabricated historical trend (none exists yet). */
function AnalyticsTab({ detail }: { detail: ClassGroupDetail }) {
  const capacityUsage = detail.capacity > 0 ? Math.round((detail.current_students_count / detail.capacity) * 100) : 0
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ClassKpiCard label="عدد الطلاب" value={detail.counts.students} />
        <ClassKpiCard label="نسبة الإشغال" value={`${capacityUsage}%`} />
        <ClassKpiCard label="نسبة الحضور" value={`${detail.attendance_summary.attendance_percentage}%`} />
        <ClassKpiCard label="متوسط التقدم" value={`${detail.progress_summary.average_progress_percentage}%`} />
        <ClassKpiCard label="عدد الجلسات" value={detail.counts.sessions} />
        <ClassKpiCard label="عدد المواد" value={detail.counts.materials} />
        <ClassKpiCard label="عدد الواجبات" value={detail.counts.assignments} />
        <ClassKpiCard label="بانتظار المراجعة" value={detail.counts.pending_reviews} />
      </div>
      <InstructorCurriculumAnalyticsSection groupId={detail.id} />
    </div>
  )
}

function SettingsTab({
  detail,
  form,
  setForm,
  busy,
  onSave,
}: {
  detail: ClassGroupDetail
  form: { name: string; capacity: number }
  setForm: (updater: (f: { name: string; capacity: number }) => { name: string; capacity: number }) => void
  busy: boolean
  onSave: () => void
}) {
  if (!detail.permissions.edit) {
    return <EmptyTab label="لا تملك صلاحية تعديل إعدادات هذا الصف الصف مكتمل أو مؤرشف" />
  }
  return (
    <div className="max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <label className="text-[11px] font-black text-deepBlue/50">اسم الصف</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]"
        />
      </div>
      <div>
        <label className="text-[11px] font-black text-deepBlue/50">السعة</label>
        <input
          type="number"
          min={detail.current_students_count}
          value={form.capacity}
          onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#0077B6]"
        />
      </div>
      <button
        type="button"
        disabled={busy || !form.name.trim()}
        onClick={onSave}
        className="rounded-xl bg-deepBlue px-3 py-2 text-[11px] font-black text-white transition hover:bg-deepBlue/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        حفظ التغييرات
      </button>
    </div>
  )
}

type QuickAction = {
  label: string
  icon: typeof Users
  enabled: boolean
  reason?: string
  onClick?: () => void
}

/**
 * Every action's enabled/disabled state comes from `permissions` (backend-
 * computed via ClassGroup::canBeEdited()/canPerformTeachingActions()) —
 * never inferred from `status` here. Assignment/material creation have no
 * backend creation endpoint yet (Ticket 5/7), so those two are always
 * disabled with an explanatory reason rather than linking to fake
 * functionality; export/print/analytics have no backend implementation at
 * all yet either, so they're disabled the same way.
 */
function QuickActions({
  permissions,
  onAddSession,
  onRecordAttendance,
  onSendAnnouncement,
  onViewAnalytics,
}: {
  permissions: ClassGroupDetail['permissions']
  onAddSession: () => void
  onRecordAttendance: () => void
  onSendAnnouncement: () => void
  onViewAnalytics: () => void
}) {
  const actions: QuickAction[] = [
    { label: 'إضافة جلسة', icon: Plus, enabled: permissions.create_session, reason: 'غير متاح الصف ليس في حالة نشطة أو جاهزة', onClick: onAddSession },
    { label: 'تسجيل الحضور', icon: UserCheck, enabled: permissions.record_attendance, reason: 'غير متاح الصف ليس في حالة نشطة أو جاهزة', onClick: onRecordAttendance },
    { label: 'إنشاء واجب', icon: ClipboardCheck, enabled: false, reason: 'قيد التطوير لا يوجد مسار لإنشاء واجبات خاصة بالصف بعد' },
    { label: 'رفع مادة', icon: FolderOpen, enabled: false, reason: 'قيد التطوير لا يوجد مسار لرفع مواد خاصة بالصف بعد' },
    { label: 'إرسال إعلان', icon: Megaphone, enabled: permissions.send_announcement, reason: 'غير متاح الصف مكتمل أو مؤرشف', onClick: onSendAnnouncement },
    { label: 'تصدير', icon: Download, enabled: false, reason: 'قيد التطوير' },
    { label: 'طباعة', icon: Printer, enabled: false, reason: 'قيد التطوير' },
    { label: 'التحليلات', icon: Eye, enabled: true, onClick: onViewAnalytics },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ label, icon: Icon, enabled, reason, onClick }) => (
        <button
          key={label}
          type="button"
          disabled={!enabled}
          title={!enabled ? reason : undefined}
          onClick={enabled ? onClick : undefined}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
            enabled
              ? 'border border-deepBlue/[0.12] bg-white text-deepBlue/70 hover:border-[#0077B6]/40 hover:text-[#0077B6]'
              : 'cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * Recurring-session generation: preview (writes nothing) → explicit confirm
 * → generate. Uses the backend's ClassSessionGenerationService exclusively —
 * no RRULE or client-side recurrence logic exists here.
 */
function SessionGenerationPanel({ groupId, onGenerated }: { groupId: string; onGenerated: () => void }) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [preview, setPreview] = useState<Array<{ date: string; day_of_week: string; start_time: string; end_time: string; already_exists: boolean }> | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ created_count: number; skipped_count: number } | null>(null)

  async function handlePreview() {
    if (!from || !to || busy) return
    setBusy(true)
    setResult(null)
    try {
      const rows = await previewClassSessionGeneration(Number(groupId), from, to)
      setPreview(rows)
      if (rows.length === 0) toast.error('لا يوجد جدول أسبوعي نشط لهذا الصف، أو الصف غير نشط حالياً.')
    } catch {
      toast.error('تعذّر تحميل المعاينة تحقق من التواريخ المدخلة.')
    } finally {
      setBusy(false)
    }
  }

  async function handleGenerate() {
    if (!from || !to || busy) return
    setBusy(true)
    try {
      const res = await generateClassSessions(Number(groupId), from, to)
      setResult(res)
      setPreview(null)
      toast.success(`تم إنشاء ${res.created_count} جلسة، وتخطي ${res.skipped_count} موجودة مسبقاً.`)
      onGenerated()
    } catch {
      toast.error('تعذّر إنشاء الجلسات.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-deepBlue/60 transition hover:bg-slate-50">
        <Calendar className="h-3.5 w-3.5" /> توليد جلسات من الجدول الأسبوعي
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[12px] font-black text-deepBlue">توليد جلسات من الجدول الأسبوعي للصف</p>
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreview(null); setResult(null) }}
          className="rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreview(null); setResult(null) }}
          className="rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#0077B6]" />
      </div>

      {preview && preview.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2">
          {preview.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] font-semibold">
              <span className={p.already_exists ? 'text-slate-300 line-through' : 'text-deepBlue/70'}>
                {formatAmsterdamDMY(p.date)} · {p.start_time}–{p.end_time}
              </span>
              {p.already_exists && <span className="text-[9px] font-black text-slate-300">موجودة مسبقاً</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {!preview ? (
          <button type="button" disabled={busy || !from || !to} onClick={handlePreview}
            className="rounded-xl bg-deepBlue px-3 py-2 text-[11px] font-black text-white transition hover:bg-deepBlue/90 disabled:cursor-not-allowed disabled:opacity-40">
            معاينة
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={handleGenerate}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
            تأكيد الإنشاء ({preview.filter((p) => !p.already_exists).length} جلسة جديدة)
          </button>
        )}
        <button type="button" onClick={() => { setOpen(false); setPreview(null); setResult(null) }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-deepBlue/55 transition hover:bg-slate-50">
          إغلاق
        </button>
      </div>

      {result && (
        <p className="text-[11px] font-bold text-emerald-700">
          تم إنشاء {result.created_count} جلسة، وتخطي {result.skipped_count} جلسة موجودة مسبقاً.
        </p>
      )}
    </div>
  )
}
