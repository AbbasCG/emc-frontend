import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  Paperclip,
  Pencil,
  Settings,
  Trash2,
  Users,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  adminGetAssignmentDetail,
  type AdminAssignmentDetail,
  type AdminAssignmentSubmissionRow,
} from '@/api/adminLmsApi'
import { EntityDetailDrawer, EntityDetailField, EntityDetailSection } from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { LmsEmptyState, LmsStatusBadge } from '@/components/lms'
import { LmsFilterBar, countActiveFilters, lmsSelectClass } from '@/components/lms/management'
import { fmtDate, fmtNum } from '@/components/lms/lmsFormatters'

const TAB_IDS = ['overview', 'submissions', 'students', 'settings'] as const
type TabId = (typeof TAB_IDS)[number]

const TAB_LABELS: Record<TabId, string> = {
  overview: 'نظرة عامة',
  submissions: 'التسليمات',
  students: 'الطلاب',
  settings: 'الإعدادات',
}

type Props = {
  assignmentId: number | null
  open: boolean
  onClose: () => void
  onEdit: (detail: AdminAssignmentDetail) => void
  onDelete: (id: number) => void
  deleting?: boolean
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-[#0C2A4B]/8 bg-gradient-to-br from-white to-[#f8fafc] p-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#0C2A4B]/40">{label}</p>
      <p className={`mt-1 emc-display-num text-xl font-black ${accent ?? 'text-[#0C2A4B]'}`}>{value}</p>
    </div>
  )
}

function SubmissionStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; kind: 'submission' | 'neutral' }> = {
    pending_review: { label: 'بانتظار المراجعة', kind: 'submission' },
    reviewed: { label: 'تمت المراجعة', kind: 'submission' },
    needs_revision: { label: 'يحتاج إعادة تسليم', kind: 'submission' },
    resubmitted: { label: 'أُعيد التسليم', kind: 'submission' },
    not_submitted: { label: 'لم يُسلّم', kind: 'neutral' },
    late: { label: 'متأخر', kind: 'neutral' },
  }
  const m = map[status ?? ''] ?? { label: status ?? '—', kind: 'neutral' as const }
  return <LmsStatusBadge status={status ?? 'not_submitted'} kind={m.kind} />
}

function SubmissionDetailPanel({
  row,
  onClose,
}: {
  row: AdminAssignmentSubmissionRow
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl border border-[#0077B6]/20 bg-[#0077B6]/[0.04] p-4"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-[#0C2A4B]">{row.student_name ?? '—'}</p>
          <p className="text-[11px] font-semibold text-[#0C2A4B]/50">{row.student_email}</p>
        </div>
        <button type="button" onClick={onClose} className="text-[11px] font-bold text-[#0077B6]">
          إغلاق
        </button>
      </div>
      <div className="space-y-2 text-[12px]">
        <div className="flex justify-between gap-2">
          <span className="text-[#0C2A4B]/45">تاريخ التسليم</span>
          <span className="font-bold text-[#0C2A4B]">{fmtDate(row.submitted_at)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-[#0C2A4B]/45">الحالة</span>
          <SubmissionStatusBadge status={row.status} />
        </div>
        {row.grade != null ?
          <div className="flex justify-between gap-2">
            <span className="text-[#0C2A4B]/45">الدرجة</span>
            <span className="font-black text-[#0C2A4B]">{fmtNum(row.grade)}</span>
          </div>
        : null}
        <div className="flex flex-wrap gap-2 pt-1">
          {row.has_file ?
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#0C2A4B]/60 ring-1 ring-[#0C2A4B]/10">
              <Paperclip size={10} /> مرفق
            </span>
          : null}
          {row.has_text ?
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#0C2A4B]/60 ring-1 ring-[#0C2A4B]/10">
              <FileText size={10} /> نص
            </span>
          : null}
        </div>
        {row.text_answer ?
          <div className="mt-2 rounded-xl border border-[#0C2A4B]/8 bg-white p-3">
            <p className="mb-1 text-[10px] font-black text-[#0C2A4B]/40">الإجابة النصية</p>
            <p className="whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-[#0C2A4B]">{row.text_answer}</p>
          </div>
        : null}
        {row.feedback ?
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-3">
            <p className="mb-1 text-[10px] font-black text-emerald-700/70">ملاحظات المدرب</p>
            <p className="text-[12px] font-medium text-emerald-900">{row.feedback}</p>
          </div>
        : null}
      </div>
    </motion.div>
  )
}

export default function AdminAssignmentDetailDrawer({
  assignmentId,
  open,
  onClose,
  onEdit,
  onDelete,
  deleting = false,
}: Props) {
  const [detail, setDetail] = useState<AdminAssignmentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [subSearch, setSubSearch] = useState('')
  const [subStatus, setSubStatus] = useState('')
  const [subAttachment, setSubAttachment] = useState<'' | 'has' | 'none'>('')
  const [studentSearch, setStudentSearch] = useState('')
  const [studentFilter, setStudentFilter] = useState<'' | 'submitted' | 'not_submitted' | 'late'>('')
  const [reviewRow, setReviewRow] = useState<AdminAssignmentSubmissionRow | null>(null)

  // Adjust state during render when the drawer's target changes (react.dev
  // "adjusting state when a prop changes"): clear the panel when it closes, and
  // arm the loading state when a new assignment is about to be fetched below.
  // `seenTarget` starts at `null` so a drawer mounted already open still arms.
  const target = open && assignmentId ? assignmentId : null
  const [seenTarget, setSeenTarget] = useState<number | null>(null)
  if (seenTarget !== target) {
    setSeenTarget(target)
    if (target === null) {
      setDetail(null)
      setReviewRow(null)
      setActiveTab('overview')
    } else {
      setLoading(true)
      setError(null)
    }
  }

  useEffect(() => {
    if (!open || !assignmentId) return
    let alive = true
    void (async () => {
      try {
        const data = await adminGetAssignmentDetail(assignmentId)
        if (alive) setDetail(data)
      } catch {
        if (alive) setError('تعذّر تحميل تفاصيل الواجب.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [open, assignmentId])

  const filteredSubmissions = useMemo(() => {
    const list = detail?.submissions ?? []
    const q = subSearch.toLowerCase()
    return list.filter((s) => {
      const matchSearch = !q
        || (s.student_name ?? '').toLowerCase().includes(q)
        || (s.student_email ?? '').toLowerCase().includes(q)
      const matchStatus = !subStatus || s.status === subStatus
      const matchFile =
        subAttachment === 'has' ? s.has_file
        : subAttachment === 'none' ? !s.has_file
        : true
      return matchSearch && matchStatus && matchFile
    })
  }, [detail?.submissions, subSearch, subStatus, subAttachment])

  const filteredStudents = useMemo(() => {
    const list = detail?.students ?? []
    const q = studentSearch.toLowerCase()
    return list.filter((s) => {
      const matchSearch = !q || (s.name ?? '').toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q)
      const matchFilter =
        studentFilter === 'submitted' ? s.submitted
        : studentFilter === 'not_submitted' ? !s.submitted
        : studentFilter === 'late' ? s.is_late
        : true
      return matchSearch && matchFilter
    })
  }, [detail?.students, studentSearch, studentFilter])

  const subActiveCount = countActiveFilters([subSearch, subStatus, subAttachment])
  const studentActiveCount = countActiveFilters([studentSearch, studentFilter])

  const a = detail?.assignment
  const stats = detail?.stats ?? {}

  const overviewContent = loading ?
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  : error ?
    <LmsEmptyState icon={ClipboardList} title="تعذّر التحميل" description={error} />
  : detail ?
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="إجمالي التسليمات" value={fmtNum(stats.submissions_count ?? 0)} />
        <StatTile label="بانتظار المراجعة" value={fmtNum(stats.pending_submissions_count ?? 0)} accent="text-[#F7941D]" />
        <StatTile label="تمت المراجعة" value={fmtNum(stats.graded_submissions_count ?? 0)} accent="text-emerald-600" />
        <StatTile label="تحتاج إعادة تسليم" value={fmtNum(stats.needs_resubmission_count ?? 0)} accent="text-rose-600" />
        <StatTile label="متأخرة" value={fmtNum(stats.late_submissions_count ?? 0)} />
        <StatTile label="الدرجة القصوى" value={a?.max_score != null ? fmtNum(a.max_score) : '—'} />
      </div>
      <EntityDetailSection title="بيانات الواجب" icon={<BookOpen className="size-4" />}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <EntityDetailField label="الدورة" value={detail.course?.title ?? '—'} />
          <EntityDetailField label="المدرب" value={detail.instructor?.name ?? '—'} />
          <EntityDetailField label="تاريخ التسليم" value={fmtDate(a?.due_date)} />
          <EntityDetailField label="الحالة" value={a?.status === 'archived' ? 'أرشيف' : 'نشط'} />
        </dl>
        {(a?.description || a?.instructions) ?
          <div className="mt-3 space-y-2 rounded-xl border border-[#0C2A4B]/8 bg-white p-3">
            {a?.description ?
              <div>
                <p className="text-[10px] font-black text-[#0C2A4B]/40">الوصف</p>
                <p className="mt-1 text-[13px] font-medium leading-relaxed text-[#0C2A4B]">{a.description}</p>
              </div>
            : null}
            {a?.instructions ?
              <div>
                <p className="text-[10px] font-black text-[#0C2A4B]/40">التعليمات</p>
                <p className="mt-1 text-[13px] font-medium leading-relaxed text-[#0C2A4B]">{a.instructions}</p>
              </div>
            : null}
          </div>
        : null}
      </EntityDetailSection>
    </div>
  : null

  const submissionsContent = (
    <div className="space-y-4">
      <LmsFilterBar
        search={subSearch}
        onSearchChange={setSubSearch}
        searchPlaceholder="بحث عن طالب…"
        activeFilterCount={subActiveCount}
        resultCount={filteredSubmissions.length}
        totalCount={detail?.submissions?.length ?? 0}
        onReset={() => { setSubSearch(''); setSubStatus(''); setSubAttachment('') }}
        primary={
          <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)} className={lmsSelectClass()}>
            <option value="">كل الحالات</option>
            <option value="pending_review">بانتظار المراجعة</option>
            <option value="reviewed">تمت المراجعة</option>
            <option value="needs_revision">يحتاج إعادة تسليم</option>
            <option value="resubmitted">أُعيد التسليم</option>
          </select>
        }
        secondary={
          <select value={subAttachment} onChange={(e) => setSubAttachment(e.target.value as typeof subAttachment)} className={lmsSelectClass()}>
            <option value="">المرفقات: الكل</option>
            <option value="has">بمرفق</option>
            <option value="none">بدون مرفق</option>
          </select>
        }
      />
      {reviewRow ?
        <SubmissionDetailPanel row={reviewRow} onClose={() => setReviewRow(null)} />
      : null}
      {filteredSubmissions.length === 0 ?
        <LmsEmptyState icon={FileText} title="لا توجد تسليمات" description="لم يُسلّم أي طالب بعد أو لا توجد نتائج للفلاتر." />
      : (
        <div className="space-y-2">
          {filteredSubmissions.map((s) => (
            <motion.div
              key={s.id}
              whileHover={{ y: -1 }}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[#0C2A4B]/8 bg-white p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#0C2A4B]">{s.student_name ?? '—'}</p>
                <p className="text-[11px] font-semibold text-[#0C2A4B]/45">{s.student_email}</p>
                <p className="mt-0.5 text-[11px] text-[#0C2A4B]/35">{fmtDate(s.submitted_at)}</p>
              </div>
              <SubmissionStatusBadge status={s.status} />
              {s.grade != null ?
                <span className="rounded-full bg-[#0C2A4B]/5 px-2 py-0.5 text-[11px] font-black text-[#0C2A4B]">
                  {fmtNum(s.grade)} نقطة
                </span>
              : null}
              <div className="flex gap-1">
                {s.has_file ? <Paperclip size={14} className="text-[#0077B6]" /> : null}
                {s.has_text ? <FileText size={14} className="text-[#0077B6]" /> : null}
              </div>
              <button
                type="button"
                onClick={() => setReviewRow(s)}
                className="rounded-lg bg-[#0077B6]/10 px-3 py-1.5 text-[11px] font-black text-[#0077B6] transition hover:bg-[#0077B6]/20"
              >
                مراجعة
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )

  const studentsContent = (
    <div className="space-y-4">
      <LmsFilterBar
        search={studentSearch}
        onSearchChange={setStudentSearch}
        searchPlaceholder="بحث عن طالب…"
        activeFilterCount={studentActiveCount}
        resultCount={filteredStudents.length}
        totalCount={detail?.students?.length ?? 0}
        onReset={() => { setStudentSearch(''); setStudentFilter('') }}
        primary={
          <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value as typeof studentFilter)} className={lmsSelectClass()}>
            <option value="">الكل</option>
            <option value="submitted">مُسلّم</option>
            <option value="not_submitted">لم يُسلّم</option>
            <option value="late">متأخر</option>
          </select>
        }
      />
      {filteredStudents.length === 0 ?
        <LmsEmptyState icon={Users} title="لا يوجد طلاب" description="لا يوجد طلاب مسجلون في هذه الدورة." />
      : (
        <div className="space-y-2">
          {filteredStudents.map((s, idx) => (
            <div
              key={`${s.user_id ?? idx}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[#0C2A4B]/8 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#0C2A4B]">{s.name ?? '—'}</p>
                <p className="text-[11px] text-[#0C2A4B]/45">{s.email}</p>
              </div>
              <SubmissionStatusBadge status={s.submission_status} />
              {s.progress_percentage != null && s.progress_percentage > 0 ?
                <span className="text-[11px] font-black text-[#0077B6]">{fmtNum(s.progress_percentage)}%</span>
              : null}
              {s.is_late ?
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">متأخر</span>
              : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const settingsContent = detail ?
    <EntityDetailSection title="إعدادات الواجب" icon={<Settings className="size-4" />}>
      <dl className="grid gap-3 sm:grid-cols-2">
        <EntityDetailField label="المعرّف" value={fmtNum(a?.id ?? 0)} />
        <EntityDetailField label="نوع التسليم" value={a?.submission_type ?? '—'} />
        <EntityDetailField label="إعادة التسليم" value={a?.resubmission_allowed ? 'مسموح' : 'غير مسموح'} />
        <EntityDetailField label="تاريخ الإنشاء" value={fmtDate(a?.created_at)} />
        <EntityDetailField label="بريد المدرب" value={detail.instructor?.email ?? '—'} />
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(detail)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0077B6] px-4 py-2 text-[12px] font-black text-white shadow-sm"
        >
          <Pencil size={14} /> تعديل
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={() => a?.id && onDelete(a.id)}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-black text-rose-700 disabled:opacity-50"
        >
          <Trash2 size={14} /> حذف
        </button>
      </div>
    </EntityDetailSection>
  : null

  const tabContent: Record<TabId, React.ReactNode> = {
    overview: overviewContent,
    submissions: submissionsContent,
    students: studentsContent,
    settings: settingsContent,
  }

  return (
    <EntityDetailDrawer
      open={open}
      onClose={onClose}
      title={a?.title ?? (loading ? 'جاري التحميل…' : 'تفاصيل الواجب')}
      subtitle={detail?.course?.title ?? undefined}
      widthClassName="max-w-2xl"
      footerSlot={
        detail ?
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#0C2A4B]/45">
            <Calendar size={12} />
            <span>التسليم: {fmtDate(a?.due_date)}</span>
            <span>·</span>
            <GraduationCap size={12} />
            <span>{fmtNum(stats.submissions_count ?? 0)} تسليم</span>
          </div>
        : undefined
      }
    >
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-[#0C2A4B]/8 bg-[#f8fafc] p-1">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`rounded-lg px-3 py-2 text-[12px] font-black transition ${
              activeTab === id
                ? 'bg-white text-[#0077B6] shadow-sm'
                : 'text-[#0C2A4B]/50 hover:text-[#0C2A4B]'
            }`}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>
      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        {tabContent[activeTab]}
      </motion.div>
    </EntityDetailDrawer>
  )
}
