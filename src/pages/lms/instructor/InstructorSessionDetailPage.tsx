import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Archive, Ban, CheckCircle2, Copy, ExternalLink, Pencil, Play, Save, Trash2, UserCheck, X, AlertOctagon,
} from 'lucide-react'
import {
  fetchClassSessionDetail, transitionClassSession, deleteClassSession, updateClassSession,
  type LmsSessionEvent,
} from '@/api/placementApi'
import { BackButton } from '@/components/shared/BackButton'
import SessionStatusBadge from '@/components/sessions/SessionStatusBadge'
import { sessionStatusLabel } from '@/components/sessions/sessionStatusLabels'
import { formatWallClockDMY, formatWallClockTime24 } from '@/utils/amsterdamTime'
import toast from '@/lib/toast'

const TRANSITION_LABEL: Record<string, { label: string; icon: typeof Play; confirm?: boolean; danger?: boolean }> = {
  live:      { label: 'بدء الجلسة', icon: Play },
  completed: { label: 'إنهاء الجلسة', icon: CheckCircle2 },
  cancelled: { label: 'إلغاء الجلسة', icon: Ban, confirm: true, danger: true },
  missed:    { label: 'تحديد كفائتة', icon: AlertOctagon, confirm: true },
  archived:  { label: 'أرشفة الجلسة', icon: Archive, confirm: true },
}

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
  const errors = e.response?.data?.errors
  if (errors) {
    const first = Object.values(errors)[0]
    if (Array.isArray(first) && first[0]) return first[0]
  }
  return e.response?.data?.message ?? 'حدث خطأ غير متوقع.'
}

export default function InstructorSessionDetailPage() {
  const { groupId, sessionId } = useParams<{ groupId: string; sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<LmsSessionEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', session_date: '', start_time: '', end_time: '', location: '', meeting_url: '', recording_url: '' })

  function load() {
    if (!groupId || !sessionId) return
    setLoading(true)
    setError(false)
    setNotFound(false)
    fetchClassSessionDetail(Number(groupId), Number(sessionId))
      .then((s) => {
        if (!s) { setNotFound(true); return }
        setSession(s)
        setForm({
          title: s.title, description: s.description ?? '', session_date: s.date ?? '',
          start_time: s.start_time ?? '', end_time: s.end_time ?? '',
          location: s.location ?? '', meeting_url: s.meeting.url ?? '', recording_url: s.recording_url ?? '',
        })
      })
      .catch((err) => {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 403 || status === 404) setNotFound(true)
        else setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [groupId, sessionId])

  async function handleTransition(status: string) {
    if (!groupId || !sessionId || busy) return
    const cfg = TRANSITION_LABEL[status]
    if (cfg?.confirm && !window.confirm(`هل أنت متأكد من "${cfg.label}"؟`)) return
    setBusy(true)
    try {
      const updated = await transitionClassSession(Number(groupId), Number(sessionId), status)
      setSession(updated)
      toast.success('تم تحديث حالة الجلسة.')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!groupId || !sessionId || busy) return
    if (!window.confirm('هل أنت متأكد من حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء.')) return
    setBusy(true)
    try {
      await deleteClassSession(Number(groupId), Number(sessionId))
      toast.success('تم حذف الجلسة.')
      navigate(`/dashboard/instructor/classes/${groupId}/sessions`)
    } catch (err) {
      toast.error(extractErrorMessage(err))
      setBusy(false)
    }
  }

  async function handleSaveEdit() {
    if (!groupId || !sessionId || busy) return
    if (form.end_time <= form.start_time) {
      toast.error('يجب أن يكون وقت النهاية بعد وقت البداية.')
      return
    }
    setBusy(true)
    try {
      const updated = await updateClassSession(Number(groupId), Number(sessionId), {
        title: form.title, description: form.description || null, session_date: form.session_date,
        start_time: form.start_time, end_time: form.end_time, location: form.location || null,
        meeting_url: form.meeting_url || null, recording_url: form.recording_url || null,
      })
      setSession(updated)
      setEditing(false)
      toast.success('تم حفظ التعديلات.')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function copyMeetingUrl() {
    if (!session?.meeting.url) return
    navigator.clipboard.writeText(session.meeting.url)
    toast.success('تم نسخ رابط الاجتماع.')
  }

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      <BackButton to={groupId ? `/dashboard/instructor/classes/${groupId}/sessions` : '/dashboard/instructor/classes'} />

      {loading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
      ) : notFound ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-[14px] font-black text-deepBlue">تعذّر العثور على هذه الجلسة</p>
          <p className="mt-1 text-[11px] font-semibold text-deepBlue/40">قد تكون غير موجودة أو لا تملك صلاحية الوصول إليها.</p>
        </div>
      ) : error || !session ? (
        <div className="rounded-3xl border border-dashed border-red-200 bg-red-50/40 py-16 text-center text-[13px] font-semibold text-red-500">
          تعذّر تحميل بيانات الجلسة — حاول مرة أخرى
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-deepBlue via-[#1a2d44] to-customBlue px-6 py-6 shadow-[0_20px_50px_-20px_rgba(34,51,74,0.5)] sm:px-8">
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                  {session.class_group?.name ?? ''} {session.course?.title ? `· ${session.course.title}` : ''}
                </p>
                <h1 className="mt-0.5 text-[1.4rem] font-black leading-tight text-white">{session.title}</h1>
                <p className="mt-1 font-mono text-[12px] font-semibold text-white/60">
                  {formatWallClockDMY(session.date)} · {formatWallClockTime24(session.start_time)}–{formatWallClockTime24(session.end_time)}
                </p>
              </div>
              <SessionStatusBadge status={session.status} className="!text-[11px]" />
            </div>
          </motion.div>

          {/* Transition + management actions — every button here is gated by backend permissions/allowed_transitions, never inferred locally. */}
          <div className="flex flex-wrap gap-2">
            {session.allowed_transitions.map((status) => {
              const cfg = TRANSITION_LABEL[status]
              if (!cfg) return null
              const Icon = cfg.icon
              return (
                <button key={status} type="button" disabled={busy || !session.permissions.transition} onClick={() => handleTransition(status)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black text-white transition disabled:opacity-40 ${cfg.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-deepBlue hover:bg-deepBlue/90'}`}>
                  <Icon className="h-3.5 w-3.5" /> {cfg.label}
                </button>
              )
            })}
            {session.permissions.update && !editing && (
              <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-deepBlue/60 transition hover:bg-slate-50">
                <Pencil className="h-3.5 w-3.5" /> تعديل
              </button>
            )}
            {session.permissions.record_attendance && (
              <button type="button" onClick={() => navigate(`/dashboard/instructor/classes/${groupId}/attendance`)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-deepBlue/60 transition hover:bg-slate-50">
                <UserCheck className="h-3.5 w-3.5" /> تسجيل الحضور
              </button>
            )}
            {session.permissions.delete && (
              <button type="button" disabled={busy} onClick={handleDelete} className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-[11px] font-black text-red-600 transition hover:bg-red-50 disabled:opacity-40">
                <Trash2 className="h-3.5 w-3.5" /> حذف
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <label className="text-[11px] font-black text-deepBlue/50">العنوان</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2]" />
              </div>
              <div>
                <label className="text-[11px] font-black text-deepBlue/50">الوصف</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-deepBlue outline-none focus:border-[#2691C2]" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input type="date" value={form.session_date} onChange={(e) => setForm((f) => ({ ...f, session_date: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#2691C2]" />
                <input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#2691C2]" />
                <input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-bold text-deepBlue outline-none focus:border-[#2691C2]" />
              </div>
              <div>
                <label className="text-[11px] font-black text-deepBlue/50">الموقع</label>
                <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2]" />
              </div>
              <div>
                <label className="text-[11px] font-black text-deepBlue/50">رابط الاجتماع (HTTPS)</label>
                <input type="url" value={form.meeting_url} onChange={(e) => setForm((f) => ({ ...f, meeting_url: e.target.value }))}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2]" />
              </div>
              <div>
                <label className="text-[11px] font-black text-deepBlue/50">رابط التسجيل (HTTPS)</label>
                <input type="url" value={form.recording_url} onChange={(e) => setForm((f) => ({ ...f, recording_url: e.target.value }))}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2]" />
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={handleSaveEdit} className="flex items-center gap-1.5 rounded-xl bg-deepBlue px-3 py-2 text-[11px] font-black text-white transition hover:bg-deepBlue/90 disabled:opacity-40">
                  <Save className="h-3.5 w-3.5" /> حفظ
                </button>
                <button type="button" onClick={() => setEditing(false)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-deepBlue/55 transition hover:bg-slate-50">
                  <X className="h-3.5 w-3.5" /> إلغاء
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-black text-deepBlue/50">تفاصيل الجلسة</p>
                <dl className="mt-2 space-y-1.5 text-[12px] font-semibold text-deepBlue/70">
                  <div className="flex justify-between"><dt className="text-deepBlue/40">المدرّب</dt><dd>{session.instructor?.name ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-deepBlue/40">الحالة</dt><dd>{sessionStatusLabel(session.status)}</dd></div>
                  <div className="flex justify-between"><dt className="text-deepBlue/40">المنطقة الزمنية</dt><dd className="font-mono text-[10px]">{session.timezone}</dd></div>
                  <div className="flex justify-between"><dt className="text-deepBlue/40">الموقع</dt><dd>{session.location ?? '—'}</dd></div>
                  {session.description && <p className="pt-1 text-deepBlue/60">{session.description}</p>}
                </dl>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-black text-deepBlue/50">الاجتماع والتسجيل</p>
                <div className="mt-2 space-y-2">
                  {session.meeting.url ? (
                    <div className="flex items-center gap-2">
                      <a href={session.meeting.url} target="_blank" rel="noreferrer"
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black text-white ${session.meeting.join_allowed ? 'bg-emerald-600 hover:bg-emerald-700' : 'pointer-events-none bg-slate-300'}`}>
                        <ExternalLink className="h-3.5 w-3.5" /> فتح الاجتماع ({session.meeting.provider})
                      </a>
                      <button type="button" onClick={copyMeetingUrl} className="rounded-xl border border-slate-200 p-1.5 text-deepBlue/50 hover:bg-slate-50" aria-label="نسخ الرابط">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] font-semibold text-deepBlue/35">لا يوجد رابط اجتماع</p>
                  )}
                  {session.recording_url && (
                    <a href={session.recording_url} target="_blank" rel="noreferrer" className="block text-[11px] font-bold text-[#2691C2] underline">
                      عرض التسجيل
                    </a>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
                <p className="text-[11px] font-black text-deepBlue/50">ملخص الحضور والمرفقات</p>
                <div className="mt-2 grid grid-cols-6 gap-2 text-center">
                  <div><p className="text-[15px] font-black text-deepBlue">{session.attendance.total}</p><p className="text-[9px] font-bold text-deepBlue/40">إجمالي</p></div>
                  <div><p className="text-[15px] font-black text-emerald-600">{session.attendance.present}</p><p className="text-[9px] font-bold text-deepBlue/40">حاضر</p></div>
                  <div><p className="text-[15px] font-black text-red-500">{session.attendance.absent}</p><p className="text-[9px] font-bold text-deepBlue/40">غائب</p></div>
                  <div><p className="text-[15px] font-black text-amber-600">{session.attendance.late}</p><p className="text-[9px] font-bold text-deepBlue/40">متأخر</p></div>
                  <div><p className="text-[15px] font-black text-deepBlue">{session.materials_count}</p><p className="text-[9px] font-bold text-deepBlue/40">مواد</p></div>
                  <div><p className="text-[15px] font-black text-deepBlue">{session.assignments_count}</p><p className="text-[9px] font-bold text-deepBlue/40">واجبات</p></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
