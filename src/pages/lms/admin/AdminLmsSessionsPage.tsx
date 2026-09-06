import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CalendarCheck2,
  CalendarRange,
  ChevronDown,
  Clock,
  Eye,
  Filter,
  GraduationCap,
  Link2,
  Link2Off,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { adminListSessions, adminCreateSession, adminUpdateSession, adminDeleteSession, type AdminSession, type SessionLinkOpenStudent } from '@/api/adminLmsApi'
import { CourseSelectField } from '@/components/lms/CourseSelectField'
import toast from '@/lib/toast'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { fmtDate, normCourseTitle, normInstructor, fmtNum } from '@/components/lms/lmsFormatters'
import { formatWallClockTime24 } from '@/utils/amsterdamTime'
import { AnimatePresence, motion } from 'framer-motion'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import EmcTimePicker from '@/components/ui/EmcTimePicker'

/* ── Helpers ─────────────────────────────────────────────────────── */

const LOCATION_LABELS: Record<string, string> = {
  online:  'عن بعد',
  offline: 'حضوري',
  hybrid:  'مختلط',
}

const LOCATION_COLORS: Record<string, string> = {
  online:  'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  offline: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  hybrid:  'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function deriveSessionDate(row: AdminSession): string {
  return row.session_date ?? (row.start_at ?? row.starts_at ?? row.date ?? '').slice(0, 10)
}

function computeArabicStatus(row: AdminSession): { label: string; cls: string; dot: string } {
  if (row.is_cancelled || row.status === 'cancelled') {
    return { label: 'ملغاة', cls: 'bg-red-600 text-white', dot: 'bg-red-400' }
  }
  if (row.is_ended || row.status === 'completed') {
    return { label: 'منتهية', cls: 'bg-red-500 text-white', dot: 'bg-red-400' }
  }
  if (row.is_live || row.status === 'live') {
    return { label: 'مباشرة الآن', cls: 'bg-emerald-500 text-white', dot: 'bg-emerald-300 animate-pulse' }
  }
  if ((row.status as string) === 'published') {
    return { label: 'منشورة', cls: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500' }
  }
  if ((row.status as string) === 'draft') {
    return { label: 'مسودة', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }
  }
  if (!deriveSessionDate(row)) {
    return { label: 'بدون موعد', cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' }
  }
  return { label: 'قادمة', cls: 'bg-blue-50 text-blue-800 ring-1 ring-blue-200', dot: 'bg-blue-500' }
}

function cardAccent(row: AdminSession): string {
  if (row.is_cancelled || row.status === 'cancelled') return 'border-t-red-700'
  if (row.is_ended || row.status === 'completed')     return 'border-t-slate-300'
  if (row.is_live || row.status === 'live')           return 'border-t-emerald-500'
  return 'border-t-[#0077B6]'
}

/* ── Session modal ────────────────────────────────────────────────── */

type SessionFormData = {
  course_id: number | null
  title: string
  description: string
  session_date: string
  start_time: string
  end_time: string
  location_type: string
  meeting_link: string
  status: string
  is_visible: boolean
}

const EMPTY_SESSION_FORM: SessionFormData = {
  course_id: null, title: '', description: '',
  session_date: '', start_time: '', end_time: '',
  location_type: 'online', meeting_link: '', status: 'scheduled',
  is_visible: true,
}

const sfieldCls = 'w-full rounded-xl border border-[#0C2A4B]/10 bg-[#0C2A4B]/[0.02] px-3 py-2.5 text-sm font-semibold text-[#0C2A4B] outline-none focus:border-[#0077B6]/40 focus:ring-2 focus:ring-[#0077B6]/10'

function SessionModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: AdminSession | null
  onSave: (data: SessionFormData) => Promise<void>
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<SessionFormData>(() =>
    initial
      ? {
          course_id: initial.course_id ?? null,
          title: initial.title ?? '',
          description: (initial as Record<string, unknown>).description as string ?? '',
          session_date: deriveSessionDate(initial),
          start_time: (initial.start_time ?? '').slice(0, 5),
          end_time: (initial.end_time ?? '').slice(0, 5),
          location_type: initial.location_type ?? 'online',
          meeting_link: initial.meeting_link ?? initial.meeting_url ?? '',
          status: initial.status ?? 'scheduled',
          is_visible: (initial as Record<string, unknown>).is_visible !== false,
        }
      : EMPTY_SESSION_FORM
  )

  const [errors, setErrors] = useState<Partial<Record<keyof SessionFormData, string>>>({})

  const set = <K extends keyof SessionFormData>(k: K, v: SessionFormData[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof SessionFormData, string>> = {}
    if (!form.title.trim()) errs.title = 'العنوان مطلوب'
    if (!form.course_id) errs.course_id = 'يجب اختيار دورة'
    if (!form.session_date) errs.session_date = 'التاريخ مطلوب'
    if (!form.start_time) errs.start_time = 'وقت البداية مطلوب'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-[#0C2A4B]/[0.08]" dir="rtl">
        <div className="flex items-center justify-between border-b border-[#0C2A4B]/[0.06] px-6 py-4">
          <h2 className="text-[15px] font-black text-[#0C2A4B]">
            {initial ? 'تعديل الجلسة' : 'إضافة جلسة جديدة'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#0C2A4B]/40 hover:bg-slate-100 hover:text-[#0C2A4B]">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/60">عنوان الجلسة <span className="text-rose-500">*</span></label>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="أدخل عنوان الجلسة"
                className={[sfieldCls, errors.title ? 'border-rose-300 ring-1 ring-rose-200' : ''].join(' ')}
              />
              {errors.title && <p className="mt-1 text-[11px] font-bold text-rose-600">{errors.title}</p>}
            </div>

            <CourseSelectField
              value={form.course_id}
              onChange={(id) => set('course_id', id)}
              label="الدورة"
              required
              error={errors.course_id}
            />

            <div className="grid grid-cols-2 gap-3">
              <EmcDatePicker
                label="التاريخ"
                required
                layout="stacked"
                value={form.session_date}
                onChange={(v) => set('session_date', v)}
                error={errors.session_date}
              />
              <div>
                <label className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/60">النوع</label>
                <select value={form.location_type} onChange={(e) => set('location_type', e.target.value)} className={sfieldCls}>
                  <option value="online">عن بعد</option>
                  <option value="offline">حضوري</option>
                  <option value="hybrid">مختلط</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <EmcTimePicker
                label="وقت البداية"
                required
                value={form.start_time}
                onChange={(v) => set('start_time', v)}
                error={errors.start_time}
              />
              <EmcTimePicker
                label="وقت الانتهاء"
                value={form.end_time}
                onChange={(v) => set('end_time', v)}
                durationFrom={form.start_time}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/60">رابط الاجتماع</label>
              <input
                value={form.meeting_link}
                onChange={(e) => set('meeting_link', e.target.value)}
                placeholder="https://..."
                type="url"
                dir="ltr"
                className={`${sfieldCls} text-left`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/60">الحالة</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className={sfieldCls}>
                  <option value="scheduled">مجدولة</option>
                  <option value="published">منشورة</option>
                  <option value="draft">مسودة</option>
                  <option value="live">مباشرة</option>
                  <option value="completed">مكتملة</option>
                  <option value="cancelled">ملغاة</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-black text-[#0C2A4B]/60">الوصف</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                placeholder="وصف اختياري للجلسة..."
                className={`${sfieldCls} resize-none`}
              />
            </div>

            {/* Visibility toggle */}
            <label className="flex cursor-pointer items-center gap-3">
              <div
                role="checkbox"
                tabIndex={0}
                aria-checked={form.is_visible}
                onClick={() => set('is_visible', !form.is_visible)}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') set('is_visible', !form.is_visible) }}
                className={`relative h-5 w-9 rounded-full transition-colors ${form.is_visible ? 'bg-[#0077B6]' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${form.is_visible ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-[12px] font-black text-[#0C2A4B]/70">ظاهرة للطلاب</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#0C2A4B]/[0.05] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#0C2A4B]/10 px-5 py-2 text-[12px] font-black text-[#0C2A4B] transition hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            onClick={() => { if (validate()) void onSave(form) }}
            disabled={saving}
            className="rounded-xl bg-[#0077B6] px-5 py-2 text-[12px] font-black text-white shadow transition hover:bg-[#0077B6]/90 disabled:opacity-50"
          >
            {saving ? 'جارٍ الحفظ…' : initial ? 'حفظ التغييرات' : 'إضافة الجلسة'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Session card ─────────────────────────────────────────────────── */

type CardProps = {
  row: AdminSession
  onDetail: (row: AdminSession) => void
  onEdit: (row: AdminSession) => void
  onDelete: (row: AdminSession) => void
  deleting: number | null
}

function SessionGridCard({ row, onDetail, onEdit, onDelete, deleting }: CardProps) {
  const st = computeArabicStatus(row)
  const locLabel = LOCATION_LABELS[row.location_type ?? '']
  const locCls   = LOCATION_COLORS[row.location_type ?? ''] ?? 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
  const hasLink  = Boolean(row.meeting_link ?? row.meeting_url)
  const isBlocked = row.is_cancelled || row.is_ended

  const dateStr = fmtDate(deriveSessionDate(row))
  const timeStr = row.start_time ? formatWallClockTime24(row.start_time) : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5 border-t-[3px] ${cardAccent(row)}`}
    >
      {/* Live pulse dot */}
      {(row.is_live || row.status === 'live') && (
        <span className="absolute left-4 top-4 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Status + location row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${st.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
          {locLabel && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${locCls}`}>
              <MapPin size={9} />
              {locLabel}
            </span>
          )}
          {!hasLink && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 ring-1 ring-amber-200">
              <Link2Off size={9} />
              بدون رابط
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-[#0C2A4B]">
            {row.title ?? normCourseTitle(row.course_title ?? row.course_name)}
          </h3>
          {row.course_title && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#0077B6]/70">
              <BookOpen size={10} />
              {normCourseTitle(row.course_title)}
            </p>
          )}
        </div>

        {/* Meta rows */}
        <div className="space-y-1.5 text-[12px] font-semibold text-slate-500">
          {row.instructor_name && (
            <div className="flex items-center gap-2">
              <GraduationCap size={12} className="shrink-0 text-slate-400" />
              {normInstructor(row.instructor_name)}
            </div>
          )}
          {dateStr && (
            <div className="flex items-center gap-2">
              <Calendar size={12} className="shrink-0 text-slate-400" />
              <span>{dateStr}{timeStr ? ` · ${timeStr}` : ''}</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-auto flex items-center gap-3 border-t border-slate-50 pt-3 text-[11px] font-bold">
          <span className="flex items-center gap-1 text-slate-500">
            <Users size={11} />
            {fmtNum(row.attendance_count ?? 0)} حضور
          </span>
          <span className={`flex items-center gap-1 ${(row.link_open_count ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
            <Eye size={11} />
            {fmtNum(row.link_open_count ?? 0)} فتح
          </span>
          {hasLink && (
            <span className="flex items-center gap-1 text-[#0077B6]">
              <Link2 size={11} />
              رابط
            </span>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <button
          type="button"
          onClick={() => onDetail(row)}
          className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-black text-slate-700 transition hover:border-[#0077B6]/30 hover:text-[#0077B6]"
        >
          التفاصيل
        </button>
        {!isBlocked && hasLink && (
          <a
            href={row.meeting_link ?? row.meeting_url ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl bg-[#0077B6] py-2 text-center text-[11px] font-black text-white transition hover:bg-[#0077B6]/90"
          >
            فتح الرابط
          </a>
        )}
        {isBlocked && (
          <span className="flex-1 rounded-xl bg-slate-100 py-2 text-center text-[11px] font-black text-slate-400">
            {row.is_cancelled ? 'ملغاة' : 'انتهت'}
          </span>
        )}
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500 transition hover:border-[#0077B6]/30 hover:text-[#0077B6]"
          title="تعديل"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(row)}
          disabled={deleting === Number(row.id)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
          title="حذف"
        >
          {deleting === Number(row.id) ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    </motion.div>
  )
}

/* ── Details drawer ───────────────────────────────────────────────── */

function DetailsDrawer({ row, onClose }: { row: AdminSession; onClose: () => void }) {
  const st = computeArabicStatus(row)
  const students: SessionLinkOpenStudent[] = row.link_open_students ?? []

  return (
    <div
      className="fixed inset-0 z-[60]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Panel */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-white shadow-2xl"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">تفاصيل الجلسة</p>
            <h2 className="mt-1 text-base font-black leading-snug text-[#0C2A4B]">
              {row.title ?? normCourseTitle(row.course_title ?? row.course_name)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black ${st.cls}`}>
              <span className={`h-2 w-2 rounded-full ${st.dot}`} />
              {st.label}
            </span>
            {row.location_type && (
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black ${LOCATION_COLORS[row.location_type] ?? 'bg-slate-100 text-slate-600'}`}>
                <MapPin size={10} />
                {LOCATION_LABELS[row.location_type] ?? row.location_type}
              </span>
            )}
          </div>

          {/* Course + Instructor */}
          <section>
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">معلومات الدورة</p>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 divide-y divide-slate-100">
              {row.course_title && (
                <div className="flex items-center gap-3 px-4 py-3 text-sm">
                  <BookOpen size={14} className="shrink-0 text-[#0077B6]" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">الدورة</p>
                    <p className="font-black text-[#0C2A4B]">{normCourseTitle(row.course_title)}</p>
                  </div>
                </div>
              )}
              {row.instructor_name && (
                <div className="flex items-center gap-3 px-4 py-3 text-sm">
                  <GraduationCap size={14} className="shrink-0 text-[#0077B6]" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">المدرب</p>
                    <p className="font-black text-[#0C2A4B]">{normInstructor(row.instructor_name)}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Timing */}
          <section>
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">التوقيت</p>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 divide-y divide-slate-100">
              <div className="flex items-center gap-3 px-4 py-3 text-sm">
                <Calendar size={14} className="shrink-0 text-[#0077B6]" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400">التاريخ</p>
                  <p className="font-black text-[#0C2A4B]">{fmtDate(deriveSessionDate(row)) || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 text-sm">
                <Clock size={14} className="shrink-0 text-[#0077B6]" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400">الوقت</p>
                  <p className="font-black text-[#0C2A4B]">
                    {row.start_time ? formatWallClockTime24(row.start_time) : '—'}
                    {row.end_time ? ` – ${formatWallClockTime24(row.end_time)}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Meeting link */}
          <section>
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">رابط الاجتماع</p>
            {row.meeting_link ?? row.meeting_url ? (
              <a
                href={row.meeting_link ?? row.meeting_url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[#0077B6]/20 bg-[#0077B6]/5 px-4 py-3 text-sm font-black text-[#0077B6] transition hover:bg-[#0077B6]/10"
              >
                <Link2 size={14} />
                فتح رابط الاجتماع
              </a>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                لا يوجد رابط اجتماع لهذه الجلسة
              </p>
            )}
          </section>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-3">
            {[
              { label: 'الحضور', value: fmtNum(row.attendance_count ?? 0), icon: Users, color: 'text-[#0077B6]' },
              { label: 'فتحوا الرابط', value: fmtNum(row.link_open_count ?? students.length), icon: Eye, color: 'text-emerald-600' },
              { label: 'لم يفتحوا', value: fmtNum(Math.max(0, (row.attendance_count ?? 0) - (row.link_open_count ?? students.length))), icon: AlertCircle, color: 'text-slate-400' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                <s.icon size={16} className={`mx-auto mb-1 ${s.color}`} />
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-bold text-slate-400">{s.label}</p>
              </div>
            ))}
          </section>

          {/* Link open students */}
          <section>
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              الطلاب الذين فتحوا الرابط ({students.length})
            </p>
            {students.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm font-bold text-slate-400">
                لم يفتح أي طالب الرابط بعد
              </p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white overflow-hidden">
                {students.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-black text-emerald-700">
                      {(s.name ?? '؟').charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-black text-[#0C2A4B]">{s.name ?? '—'}</p>
                      <p className="truncate text-[11px] text-slate-400">{s.email ?? '—'}</p>
                    </div>
                    {s.opened_at && (
                      <p className="shrink-0 text-[10px] font-bold text-slate-400">
                        {formatWallClockTime24(new Date(s.opened_at).toTimeString().slice(0, 5))}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </motion.aside>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────────── */

const LOAD_ERROR = 'تعذّر تحميل الجلسات. تحقق من الاتصال وحاول مرة أخرى.'

/** Pure I/O — kept outside the component so the mount effect and the imperative reload
 *  share it without either having to call a state-mutating callback. */
async function fetchSessionRows(): Promise<AdminSession[]> {
  const list = await adminListSessions()
  return list.map((r) => ({
    ...r,
    meeting_link: r.meeting_link ?? r.meeting_url ?? null,
    course_name: normCourseTitle(r.course_title ?? r.course_name),
  }))
}

export default function AdminLmsSessionsPage() {
  const [rows, setRows] = useState<AdminSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Filters */
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterInstructor, setFilterInstructor] = useState('')
  const [filterLink, setFilterLink] = useState<'' | 'has' | 'missing'>('')
  const [filterLinkOpened, setFilterLinkOpened] = useState<'' | 'yes' | 'no'>('')
  const [filterTiming, setFilterTiming] = useState<'' | 'today' | 'upcoming' | 'ended'>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  /* Detail drawer */
  const [selected, setSelected] = useState<AdminSession | null>(null)

  /* CRUD modal */
  const [modal, setModal] = useState<'create' | AdminSession | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  /** Imperative refresh/retry from a button — outside any effect, so flipping to the
   *  loading state synchronously is fine here. */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchSessionRows())
    } catch {
      setError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const list = await fetchSessionRows()
        if (alive) setRows(list)
      } catch {
        if (alive) setError(LOAD_ERROR)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const courseOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = [{ value: '', label: 'كل الدورات' }]
    for (const r of rows) {
      const key = String(r.course_id ?? '')
      const label = normCourseTitle(r.course_title ?? r.course_name)
      if (key && label && !seen.has(key)) {
        seen.add(key)
        opts.push({ value: key, label })
      }
    }
    return opts
  }, [rows])

  const instructorOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = [{ value: '', label: 'كل المدربين' }]
    for (const r of rows) {
      const name = normInstructor(r.instructor_name ?? '')
      if (name && name !== '—' && !seen.has(name)) {
        seen.add(name)
        opts.push({ value: name, label: name })
      }
    }
    return opts
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const today = todayIso()
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.title ?? ''} ${normCourseTitle(r.course_title ?? r.course_name)} ${normInstructor(r.instructor_name ?? '')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filterStatus === 'ended'    && !r.is_ended    && r.status !== 'completed') return false
      if (filterStatus === 'live'     && !r.is_live     && r.status !== 'live')      return false
      if (filterStatus === 'upcoming' && !r.is_upcoming && r.status !== 'scheduled') return false
      if (filterStatus === 'cancelled'&& !r.is_cancelled&& r.status !== 'cancelled') return false
      if (filterStatus && !['ended','live','upcoming','cancelled'].includes(filterStatus) && r.status !== filterStatus) return false
      if (filterLocation && r.location_type !== filterLocation) return false
      if (filterCourse && String(r.course_id ?? '') !== filterCourse) return false
      if (filterInstructor && normInstructor(r.instructor_name ?? '') !== filterInstructor) return false
      const hasLink = Boolean(r.meeting_link ?? r.meeting_url)
      if (filterLink === 'has' && !hasLink) return false
      if (filterLink === 'missing' && hasLink) return false
      const opened = (r.link_open_count ?? 0) > 0
      if (filterLinkOpened === 'yes' && !opened) return false
      if (filterLinkOpened === 'no' && opened) return false
      const sd = deriveSessionDate(r)
      if (dateFrom && sd && sd < dateFrom) return false
      if (dateTo && sd && sd > dateTo) return false
      if (filterTiming === 'today'    && sd !== today) return false
      if (filterTiming === 'upcoming' && (sd < today || r.status === 'completed')) return false
      if (filterTiming === 'ended'    && sd >= today && r.status !== 'completed') return false
      return true
    })
  }, [rows, search, filterStatus, filterLocation, filterCourse, filterInstructor, filterLink, filterLinkOpened, dateFrom, dateTo, filterTiming])

  const total    = rows.length
  const upcoming = rows.filter((r) => r.is_upcoming || r.status === 'scheduled').length
  const live     = rows.filter((r) => r.is_live || r.status === 'live').length
  const noLink   = rows.filter((r) => !r.meeting_link && !r.meeting_url).length

  const hasActiveFilters = !!(search || filterStatus || filterLocation || filterCourse || filterInstructor || filterLink || filterLinkOpened || dateFrom || dateTo || filterTiming)

  async function handleSave(form: SessionFormData) {
    setSaving(true)
    try {
      const payload = {
        course_id: form.course_id ?? undefined,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        session_date: form.session_date,
        start_time: form.start_time,
        end_time: form.end_time || undefined,
        location_type: form.location_type,
        meeting_link: form.meeting_link.trim() || undefined,
        status: form.status,
        is_visible: form.is_visible,
      }
      if (modal && modal !== 'create') {
        await adminUpdateSession(Number((modal as AdminSession).id), payload as Partial<AdminSession>)
        toast.success('تم تحديث الجلسة بنجاح')
      } else {
        await adminCreateSession(payload as Partial<AdminSession>)
        toast.success('تم إضافة الجلسة بنجاح')
      }
      setModal(null)
      void load()
    } catch {
      toast.error('تعذّر حفظ الجلسة')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: AdminSession) {
    if (!window.confirm(`هل أنت متأكد من حذف "${row.title ?? 'هذه الجلسة'}"؟`)) return
    const id = Number(row.id)
    setDeleting(id)
    try {
      await adminDeleteSession(id)
      toast.success('تم حذف الجلسة')
      setRows((prev) => prev.filter((r) => Number(r.id) !== id))
      if (selected && Number(selected.id) === id) setSelected(null)
    } catch {
      toast.error('تعذّر حذف الجلسة')
    } finally {
      setDeleting(null)
    }
  }

  function clearFilters() {
    setSearch(''); setFilterStatus(''); setFilterLocation('')
    setFilterCourse(''); setFilterInstructor(''); setFilterLink('')
    setFilterLinkOpened(''); setDateFrom(''); setDateTo(''); setFilterTiming('')
  }

  const selectCls = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-700 shadow-sm focus:border-[#0077B6] focus:outline-none'

  return (
    <>
    <AdminLmsShell
      title="جلسات الدورات"
      description="لوحة الجلسات الكاملة كل الدورات، كل المدربين، تتبع فتح الروابط"
      breadcrumb="الجلسات"
      kpis={[
        { label: 'إجمالي الجلسات', value: fmtNum(total),    icon: CalendarRange,  variant: 'brand' },
        { label: 'قادمة',           value: fmtNum(upcoming), icon: Clock,          variant: 'muted' },
        { label: 'مباشرة الآن',    value: fmtNum(live),     icon: CalendarCheck2, variant: 'accent' },
        { label: 'بدون رابط',      value: fmtNum(noLink),   icon: AlertCircle,    variant: noLink > 0 ? 'warning' : 'success' },
      ]}
      loading={loading}
      error={error}
      onRetry={load}
      onRefresh={load}
      action={
        <button
          type="button"
          onClick={() => setModal('create')}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[12px] font-black text-[#0C2A4B] shadow-sm transition hover:bg-white/90"
        >
          <Plus size={14} />
          جلسة جديدة
        </button>
      }
    >
      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="mb-6 space-y-3" dir="rtl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عن جلسة، دورة، مدرب…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3 text-[12px] font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#0077B6] focus:outline-none shadow-sm"
            />
          </div>

          {/* Status quick */}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
            <option value="">كل الحالات</option>
            <option value="upcoming">قادمة</option>
            <option value="live">مباشرة الآن</option>
            <option value="ended">منتهية</option>
            <option value="cancelled">ملغاة</option>
          </select>

          {/* Location */}
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className={selectCls}>
            <option value="">كل الأنواع</option>
            <option value="online">عن بعد</option>
            <option value="offline">حضوري</option>
            <option value="hybrid">مختلط</option>
          </select>

          {/* More filters toggle */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-black shadow-sm transition ${
              hasActiveFilters
                ? 'border-[#0077B6] bg-[#0077B6]/10 text-[#0077B6]'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Filter size={13} />
            فلاتر
            <ChevronDown size={11} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-black text-red-600 transition hover:bg-red-100"
            >
              <X size={12} />
              إعادة تعيين
            </button>
          )}
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
                <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={selectCls}>
                  {courseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={filterInstructor} onChange={(e) => setFilterInstructor(e.target.value)} className={selectCls}>
                  {instructorOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={filterLink} onChange={(e) => setFilterLink(e.target.value as typeof filterLink)} className={selectCls}>
                  <option value="">الرابط: الكل</option>
                  <option value="has">لديها رابط</option>
                  <option value="missing">بدون رابط</option>
                </select>
                <select value={filterLinkOpened} onChange={(e) => setFilterLinkOpened(e.target.value as typeof filterLinkOpened)} className={selectCls}>
                  <option value="">فتح الرابط: الكل</option>
                  <option value="yes">فُتح الرابط</option>
                  <option value="no">لم يُفتح بعد</option>
                </select>
                <select value={filterTiming} onChange={(e) => setFilterTiming(e.target.value as typeof filterTiming)} className={selectCls}>
                  <option value="">التوقيت: الكل</option>
                  <option value="today">اليوم</option>
                  <option value="upcoming">قادمة</option>
                  <option value="ended">منتهية</option>
                </select>
                <EmcDatePicker label="من تاريخ" value={dateFrom} onChange={(v) => setDateFrom(v)} />
                <EmcDatePicker label="إلى تاريخ" value={dateTo} onChange={(v) => setDateTo(v)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result count */}
        <p className="text-[12px] font-bold text-slate-500">
          {loading ? (
            <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> جارٍ التحميل…</span>
          ) : (
            <>عرض <span className="font-black text-[#0C2A4B]">{fmtNum(filtered.length)}</span> من <span className="font-black text-[#0C2A4B]">{fmtNum(total)}</span> جلسة</>
          )}
        </p>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <CalendarRange size={40} className="mb-3 text-slate-300" />
          <p className="font-black text-slate-400">
            {hasActiveFilters ? 'لا توجد نتائج تطابق الفلاتر المحددة' : 'لا توجد جلسات بعد'}
          </p>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="mt-3 text-sm font-bold text-[#0077B6] hover:underline">
              إعادة تعيين الفلاتر
            </button>
          )}
        </div>
      )}

      {/* ── Card grid ───────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" dir="rtl">
          <AnimatePresence mode="popLayout">
            {filtered.map((row) => (
              <SessionGridCard
                key={row.id}
                row={row}
                onDetail={setSelected}
                onEdit={(r) => setModal(r)}
                onDelete={(r) => void handleDelete(r)}
                deleting={deleting}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Details drawer ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <DetailsDrawer
            row={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </AdminLmsShell>

    {modal != null && (
      <SessionModal
        initial={modal === 'create' ? null : modal}
        onSave={handleSave}
        onClose={() => setModal(null)}
        saving={saving}
      />
    )}
    </>
  )
}
