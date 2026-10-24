import { useMemo, useState, type ReactNode } from 'react'
import { Briefcase, Calendar, CheckCircle2, Clock, Copy, FileText, GraduationCap, HeartHandshake, History, Loader2, Lock, Mail, MessageSquare, Phone, Printer, RefreshCw, Sparkles, Star, Trash2, UserCheck, UserRound, Video, XCircle } from 'lucide-react'
import toast, { promiseToast } from '@/lib/toast'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import AmbassadorApplicationFiles from '@/components/admin/AmbassadorApplicationFiles'
import { addAmbassadorNote, deleteAmbassadorNote, fetchAmbassadorApplication, updateAmbassadorStatus, AMBASSADOR_STATUS_LABELS, type AmbassadorApplication, type AmbassadorNote, type AmbassadorStatus } from '@/api/ambassadorApplicationApi'
import { formatDate, formatDateTime } from '@/utils/dateTime'
import { AMBASSADOR_STATUS_CFG } from '@/components/admin/ambassadorStatusConfig'
import { BORDER, FOOTER_LINK_CLASS } from '@/components/detailModal/detailModalTokens'
import { CardShell, Chips, InfoRow } from '@/components/detailModal/detailModalUi'
import { DetailColumns, DetailFooter, DetailHeader, DetailModalShell, FooterButton, SummaryCards } from '@/components/detailModal/DetailModalParts'

/**
 * The ambassador application window (a modal over the applications list; the same view is reachable at
 * /dashboard/(super-admin|hr)/ambassador-applications/:id, which opens the list with this window on top).
 *
 * The presentation is the shared detail window (the HR volunteer profile design). The data, the review actions
 * (approve, reject, schedule an interview, waitlist, notes) and who may use them are unchanged: `canManage` only
 * hides controls, and the server checks every request.
 */

const ALL_STATUSES: AmbassadorStatus[] = ['new', 'under_review', 'interview_scheduled', 'approved', 'rejected', 'waitlisted', 'cancelled']
const MANAGE_ROLES = new Set(['super_admin', 'admin', 'hr_manager'])

function StatusBadge({ status }: { status: AmbassadorStatus }) {
  const cfg = AMBASSADOR_STATUS_CFG[status]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden />
      {cfg.label}
    </span>
  )
}

/**
 * The status control of the header, for people who may manage applications: changing it saves at once (as the old
 * full page's header did). Everyone else sees the plain badge.
 */
function EditableStatusBadge({ status, saving, onChange }: { status: AmbassadorStatus; saving: boolean; onChange: (s: AmbassadorStatus) => void }) {
  const cfg = AMBASSADOR_STATUS_CFG[status]

  return (
    <div className="relative inline-flex items-center">
      <select
        value={status}
        disabled={saving}
        onChange={(e) => onChange(e.target.value as AmbassadorStatus)}
        dir="rtl"
        aria-label="تغيير حالة الطلب"
        className={`appearance-none rounded-full py-0.5 pe-3 ps-6 text-[11px] font-black outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-customBlue/40 disabled:cursor-not-allowed disabled:opacity-60 ${cfg.badge}`}
      >
        {ALL_STATUSES.map((s) => <option key={s} value={s} className="text-deepBlue">{AMBASSADOR_STATUS_CFG[s].label}</option>)}
      </select>
      <span className="pointer-events-none absolute start-2 flex items-center">
        {saving ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden />}
      </span>
    </div>
  )
}

/** A row value: yes/no for booleans, nothing for empty (the row then shows "غير متوفر"). */
function val(value?: string | number | boolean | null): ReactNode {
  if (value === true) return 'نعم'
  if (value === false) return 'لا'
  if (value == null || value === '') return null

  return String(value)
}

const ltr = (value?: string | null): ReactNode => (value?.trim() ? <span dir="ltr">{value}</span> : null)
const genderLabel = (g?: string | null): string | null => (g === 'male' ? 'ذكر' : g === 'female' ? 'أنثى' : g || null)

function whatsAppUrl(phone?: string | null): string | null {
  if (!phone?.trim()) return null
  const digits = phone.replace(/\D/g, '')

  return digits.length < 8 ? null : `https://wa.me/${digits}`
}

function refNumber(app: AmbassadorApplication): string {
  if (app.reference_number?.trim()) return app.reference_number.trim()
  if (app.uuid?.trim()) return app.uuid.slice(0, 8).toUpperCase()

  return `AMB-${app.id}`
}

function formatTimeOnly(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat('ar', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit', hour12: false, numberingSystem: 'latn' }).format(d)
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

type TimelineItem = { id: string; icon: ReactNode; title: string; description?: string; user?: string; date?: string; time?: string }

function buildTimeline(app: AmbassadorApplication): TimelineItem[] {
  const items: TimelineItem[] = []

  if (app.created_at || app.submitted_at) {
    const at = app.submitted_at ?? app.created_at
    items.push({ id: 'submitted', icon: <Star className="h-3.5 w-3.5 text-customBlue" />, title: 'تقديم الطلب', description: 'تم استلام طلب الانضمام لبرنامج السفراء', date: at ? formatDate(at) : undefined, time: formatTimeOnly(at) })
  }
  for (const h of app.status_history ?? []) {
    const from = h.from_status ? (AMBASSADOR_STATUS_LABELS[h.from_status as AmbassadorStatus] ?? h.from_status) : null
    const to = AMBASSADOR_STATUS_LABELS[h.to_status as AmbassadorStatus] ?? h.to_status
    items.push({ id: `status-${h.id}`, icon: <History className="h-3.5 w-3.5 text-slate-500" />, title: from ? `تغيير الحالة: ${from} → ${to}` : `الحالة: ${to}`, description: h.reason ?? undefined, user: h.changed_by, date: h.changed_at ? formatDate(h.changed_at) : undefined, time: formatTimeOnly(h.changed_at) })
  }
  for (const n of app.notes ?? []) {
    items.push({ id: `note-${n.id}`, icon: <MessageSquare className="h-3.5 w-3.5 text-customOrange" />, title: 'ملاحظة داخلية', description: n.content, user: n.author, date: n.created_at ? formatDate(n.created_at) : undefined, time: formatTimeOnly(n.created_at) })
  }
  if (app.interview_scheduled_at) {
    items.push({ id: 'interview', icon: <Video className="h-3.5 w-3.5 text-indigo-500" />, title: 'مقابلة مجدولة', description: formatDateTime(app.interview_scheduled_at) })
  }

  return items
}

function Prose({ label, text }: { label?: string; text?: string | null }) {
  return <InfoRow label={label ?? ''} value={text?.trim() || null} preserveLineBreaks />
}

export type AmbassadorApplicationDetailModalProps = {
  app: AmbassadorApplication
  onClose: () => void
  onUpdated: (updated: AmbassadorApplication) => void
}

export default function AmbassadorApplicationDetailModal({ app, onClose, onUpdated }: AmbassadorApplicationDetailModalProps) {
  const { user } = useAuth()
  const canManage = MANAGE_ROLES.has(String(user?.role ?? '').toLowerCase())

  const [selectedStatus, setSelectedStatus] = useState<AmbassadorStatus>(app.status)
  const [statusReason, setStatusReason] = useState('')
  const [interviewAt, setInterviewAt] = useState(app.interview_scheduled_at?.slice(0, 16) ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [notePrivate, setNotePrivate] = useState(true)
  const [addingNote, setAddingNote] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'reject' | 'approve' | null>(null)
  const [deletingNote, setDeletingNote] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Re-seed the editing form whenever a different application object arrives (adjusting state when a prop changes).
  const [seenApp, setSeenApp] = useState(app)
  if (seenApp !== app) {
    setSeenApp(app)
    setSelectedStatus(app.status)
    setInterviewAt(app.interview_scheduled_at?.slice(0, 16) ?? '')
    setStatusReason('')
    setDirty(false)
  }

  const wa = whatsAppUrl(app.mobile_phone)
  const timeline = useMemo(() => buildTimeline(app), [app])

  async function persistStatus(status: AmbassadorStatus, reason?: string, interview?: string) {
    setSaving(true)
    try {
      const updated = await promiseToast(updateAmbassadorStatus(app.id, status, reason || undefined, undefined, interview || undefined), { loading: 'جاري الحفظ...', success: 'تم حفظ التغييرات', error: 'تعذّر حفظ التغييرات.' })
      onUpdated(updated)
      setSelectedStatus(status)
      setDirty(false)
      if (status === 'rejected') onClose()
    } catch {
      /* the toast reports it */
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => persistStatus(selectedStatus, statusReason || undefined, selectedStatus === 'interview_scheduled' ? interviewAt || undefined : undefined)
  const quickStatus = (status: AmbassadorStatus) => persistStatus(status, statusReason || undefined, status === 'interview_scheduled' ? interviewAt || undefined : undefined)

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteContent.trim()) return
    setAddingNote(true)
    try {
      await promiseToast(addAmbassadorNote(app.id, noteContent.trim(), notePrivate), { loading: 'جاري الحفظ...', success: 'تمت إضافة الملاحظة', error: 'تعذّر إضافة الملاحظة.' })
      setNoteContent('')
      onUpdated(await fetchAmbassadorApplication(app.id))
    } catch {
      /* the toast reports it */
    } finally {
      setAddingNote(false)
    }
  }

  async function handleDeleteNote(noteId: number) {
    if (deletingNote !== null) return
    setDeletingNote(noteId)
    try {
      await deleteAmbassadorNote(app.id, noteId)
      toast.success('تم حذف الملاحظة')
      onUpdated(await fetchAmbassadorApplication(app.id))
    } catch {
      toast.error('تعذّر حذف الملاحظة')
    } finally {
      setDeletingNote(null)
    }
  }

  /** Reload this application from the server (the old page's refresh button). */
  async function refresh() {
    setRefreshing(true)
    try {
      onUpdated(await fetchAmbassadorApplication(app.id))
    } catch {
      toast.error('تعذّر تحديث البيانات')
    } finally {
      setRefreshing(false)
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(app.email)
      toast.success('تم نسخ البريد الإلكتروني')
    } catch {
      toast.error('تعذّر النسخ')
    }
  }

  const socialLinks = [
    { label: 'إنستغرام', value: app.social_instagram },
    { label: 'لينكدإن', value: app.social_linkedin },
    { label: 'فيسبوك', value: app.social_facebook },
    { label: 'تيك توك', value: app.social_tiktok },
    { label: 'GitHub', value: app.social_github },
  ].filter((s) => s.value?.trim())

  const inputCls = `w-full rounded-xl border ${BORDER} bg-white px-3.5 text-[13px] font-bold text-deepBlue outline-none transition placeholder:text-slate-400 focus:border-customBlue focus:ring-2 focus:ring-customBlue/20`
  const labelCls = 'mb-1.5 block text-[11px] font-bold text-slate-400'

  return (
    <DetailModalShell
      onClose={onClose}
      dirty={dirty && canManage}
      busy={saving}
      labelledBy="ambassador-detail-title"
      testId="ambassador-application-modal"
      dirtyMessage="لديك تغييرات في الحالة أو الملاحظة لم تُحفظ. إن أغلقت النافذة الآن ستضيع."
      header={(close) => (
        <DetailHeader
          name={app.full_name}
          titleId="ambassador-detail-title"
          badge={canManage ? <EditableStatusBadge status={app.status} saving={saving} onChange={(next) => void persistStatus(next)} /> : <StatusBadge status={app.status} />}
          email={app.email}
          subtitle={`مرجع: ${refNumber(app)}${app.created_at ? ` · تاريخ التقديم: ${formatDate(app.created_at)}` : ''}`}
          onClose={close}
          closeDisabled={saving}
        />
      )}
      footer={
        <DetailFooter
          start={
            <>
              {canManage ? <FooterButton tone="primary" onClick={() => void handleSave()} disabled={!dirty || saving} loading={saving}>حفظ التغييرات</FooterButton> : null}
              <a href={`mailto:${app.email}`} className={FOOTER_LINK_CLASS}><Mail className="h-3.5 w-3.5 text-customBlue" aria-hidden /> إرسال بريد</a>
              <FooterButton icon={Copy} onClick={() => void copyEmail()}>نسخ البريد</FooterButton>
              {app.mobile_phone ? <a href={`tel:${app.mobile_phone}`} className={FOOTER_LINK_CLASS}><Phone className="h-3.5 w-3.5" aria-hidden /> اتصال</a> : null}
              {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className={FOOTER_LINK_CLASS}><WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" /> واتساب</a> : null}
              <FooterButton icon={Printer} onClick={() => window.print()}>طباعة</FooterButton>
              <FooterButton icon={RefreshCw} disabled={refreshing || saving} loading={refreshing} onClick={() => void refresh()}>تحديث</FooterButton>
              {dirty && canManage ? <span className="text-[11px] font-bold text-slate-500" role="status">لديك تغييرات غير محفوظة</span> : null}
            </>
          }
          end={
            canManage ?
              <>
                <FooterButton icon={Video} disabled={saving} onClick={() => void quickStatus('interview_scheduled')}>جدولة مقابلة</FooterButton>
                <FooterButton tone="success" icon={CheckCircle2} disabled={saving || app.status === 'approved'} onClick={() => setConfirmAction('approve')}>قبول</FooterButton>
                <FooterButton tone="danger" icon={XCircle} disabled={saving || app.status === 'rejected'} onClick={() => setConfirmAction('reject')}>رفض</FooterButton>
              </>
            : undefined
          }
        />
      }
    >
      <SummaryCards
        items={[
          { icon: GraduationCap, label: 'الجامعة', value: app.university_name },
          { icon: Sparkles, label: 'التخصص', value: app.major },
          { icon: Clock, label: 'ساعات أسبوعية', value: app.weekly_hours_available != null ? String(app.weekly_hours_available) : null },
          { icon: Calendar, label: 'تاريخ التقديم', value: app.created_at ? formatDate(app.created_at) : null },
        ]}
      />

      <DetailColumns
        side={
          <>
            <CardShell title="بيانات المتقدم" icon={UserRound}>
              <InfoRow label="الاسم الكامل" value={val(app.full_name)} />
              <InfoRow label="الجنس" value={genderLabel(app.gender)} />
              <InfoRow label="تاريخ الميلاد" value={app.date_of_birth ? formatDate(app.date_of_birth) : null} />
              <InfoRow label="الجنسية" value={val(app.nationality)} />
              <InfoRow label="الدولة" value={val(app.country)} />
              <InfoRow label="المدينة" value={val(app.city)} last />
            </CardShell>

            <CardShell title="معلومات التواصل" icon={Phone}>
              <InfoRow label="البريد الإلكتروني" value={ltr(app.email)} />
              <InfoRow label="الجوال" value={ltr(app.mobile_phone)} />
              {socialLinks.map((s) => <InfoRow key={s.label} label={s.label} value={ltr(s.value)} />)}
              {app.followers_count != null ? <InfoRow label="عدد المتابعين" value={val(app.followers_count)} /> : null}
              <InfoRow label="الموقع الإلكتروني" value={ltr(app.website_url)} last />
            </CardShell>

            <CardShell title="بيانات الجامعة" icon={GraduationCap}>
              <InfoRow label="الجامعة" value={val(app.university_name)} />
              <InfoRow label="نوع الجامعة" value={val(app.university_type)} />
              <InfoRow label="الكلية" value={val(app.faculty)} />
              <InfoRow label="التخصص" value={val(app.major)} />
              <InfoRow label="السنة الدراسية" value={val(app.study_year)} />
              <InfoRow label="الرقم الجامعي" value={ltr(app.student_number)} />
              <InfoRow label="حالة الطالب" value={val(app.student_status)} />
              <InfoRow label="التخرج المتوقع" value={app.expected_graduation_date ? formatDate(app.expected_graduation_date) : null} last />
            </CardShell>

            <CardShell title="التوفر والإمكانات" icon={Briefcase}>
              <InfoRow label="ساعات أسبوعية" value={val(app.weekly_hours_available)} />
              <InfoRow label="حضور فعاليات الجامعة" value={val(app.can_attend_university_events)} />
              <InfoRow label="تمثيل EMC خارجياً" value={val(app.can_represent_emc_outside)} />
              <InfoRow label="السفر" value={val(app.can_travel)} />
              <InfoRow label="حاسب محمول" value={val(app.owns_laptop)} />
              <InfoRow label="إنترنت مستقر" value={val(app.has_stable_internet)} />
              <InfoRow label="الاجتماعات الأسبوعية" value={val(app.can_attend_weekly_meetings)} last />
            </CardShell>
          </>
        }
        main={
          <>
            <CardShell title="دوافع الانضمام" icon={HeartHandshake}>
              <Prose label="لماذا يريد الانضمام؟" text={app.motivation_why} />
              <Prose label="ما الذي سيضيفه؟" text={app.contribution_what} />
              <Prose label="ماذا يتوقع اكتسابه؟" text={app.expected_gain} />
              <Prose label="أكبر إنجاز" text={app.biggest_achievement} />
              <InfoRow label="أكبر تحدٍ" value={app.biggest_challenge?.trim() || null} preserveLineBreaks last />
            </CardShell>

            <CardShell title="المهارات والاهتمامات" icon={Sparkles}>
              <div className="space-y-3">
                <div><p className="mb-1.5 text-[11px] font-bold text-slate-400">المهارات</p><Chips items={app.skills ?? []} /></div>
                <div><p className="mb-1.5 text-[11px] font-bold text-slate-400">الاهتمامات</p><Chips items={app.interests ?? []} tone="sky" /></div>
                <div><p className="mb-1.5 text-[11px] font-bold text-slate-400">الشهادات</p><Chips items={app.certifications ?? []} /></div>
              </div>
            </CardShell>

            <CardShell title="القيادة والخبرة" icon={UserCheck}>
              <InfoRow label="قيادة فريق" value={val(app.has_led_team)} />
              <InfoRow label="تنظيم فعاليات" value={val(app.has_organized_events)} />
              <InfoRow label="أكبر حضور" value={val(app.events_attendees_count)} />
              <InfoRow label="تمثيل الجامعة" value={val(app.has_represented_university)} />
              <InfoRow label="خبرة تطوعية" value={val(app.has_volunteer_experience)} />
              <InfoRow label="خبرة ورش عمل" value={val(app.has_teaching_experience)} />
              <InfoRow label="أندية طلابية" value={val(app.has_student_club_involvement)} />
              <InfoRow label="تنظيم فعاليات خارجية" value={val(app.has_event_organization_experience)} last={!app.volunteer_experience_types?.length} />
              {app.volunteer_experience_types?.length ? <div className="pt-3"><p className="mb-1.5 text-[11px] font-bold text-slate-400">أنواع التطوع</p><Chips items={app.volunteer_experience_types} /></div> : null}
            </CardShell>

            <CardShell title="بيانات الطلب" icon={FileText}>
              <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-6">
                <InfoRow label="معرّف الطلب" value={ltr(String(app.id))} />
                <InfoRow label="رقم المرجع" value={ltr(refNumber(app))} />
                <InfoRow label="تاريخ الإنشاء" value={app.created_at ? formatDateTime(app.created_at) : null} />
                <InfoRow label="تاريخ التقديم" value={app.submitted_at ? formatDateTime(app.submitted_at) : null} />
                <InfoRow label="آخر تحديث" value={app.updated_at ? formatDateTime(app.updated_at) : null} />
                <InfoRow label="المصدر" value={val(app.source)} />
                <InfoRow label="الحالة الحالية" value={AMBASSADOR_STATUS_LABELS[app.status]} last />
                <InfoRow label="المراجع" value={val(app.reviewed_by?.name)} />
                <InfoRow label="مسودة" value={val(app.is_draft)} last />
              </div>
            </CardShell>

            <CardShell title="المرفقات والملفات" icon={FileText}>
              <AmbassadorApplicationFiles applicationId={app.id} embedded canDelete={canManage} />
            </CardShell>

            {canManage ?
              <CardShell title="إجراءات الإدارة" icon={UserCheck}>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="ambassador-status-select" className={labelCls}>حالة الطلب</label>
                    <select id="ambassador-status-select" value={selectedStatus} disabled={saving} onChange={(e) => { setSelectedStatus(e.target.value as AmbassadorStatus); setDirty(true) }} dir="rtl" className={`${inputCls} h-11`}>
                      {ALL_STATUSES.map((s) => <option key={s} value={s}>{AMBASSADOR_STATUS_CFG[s].label}</option>)}
                    </select>
                  </div>
                  {selectedStatus === 'interview_scheduled' ?
                    <div>
                      <label htmlFor="ambassador-interview-at" className={labelCls}>موعد المقابلة</label>
                      <input id="ambassador-interview-at" type="datetime-local" value={interviewAt} disabled={saving} onChange={(e) => { setInterviewAt(e.target.value); setDirty(true) }} className={`${inputCls} h-11`} />
                    </div>
                  : null}
                  <div>
                    <label htmlFor="ambassador-status-reason" className={labelCls}>ملاحظة القرار (اختياري)</label>
                    <textarea id="ambassador-status-reason" value={statusReason} disabled={saving} onChange={(e) => { setStatusReason(e.target.value); setDirty(true) }} placeholder="سبب تغيير الحالة أو طلب معلومات إضافية..." rows={2} className={`${inputCls} resize-none py-2.5 font-medium`} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <FooterButton disabled={saving} onClick={() => void quickStatus('waitlisted')}>قائمة انتظار</FooterButton>
                    <FooterButton disabled={saving} onClick={() => void quickStatus('under_review')}>قيد المراجعة</FooterButton>
                  </div>
                </div>
              </CardShell>
            : null}

            <CardShell title="ملاحظات داخلية" icon={MessageSquare}>
              {canManage ?
                <form onSubmit={(e) => void handleAddNote(e)} className="mb-4 space-y-3">
                  <textarea value={noteContent} disabled={addingNote} onChange={(e) => setNoteContent(e.target.value)} rows={3} aria-label="ملاحظة داخلية جديدة" placeholder="أضف ملاحظة داخلية للفريق..." className={`${inputCls} resize-none py-2.5 font-medium`} />
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={() => setNotePrivate((p) => !p)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${notePrivate ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80' : 'bg-slate-100 text-slate-500'}`}>
                      <Lock className="h-3 w-3" aria-hidden /> {notePrivate ? 'خاصة' : 'عامة للفريق'}
                    </button>
                    <button type="submit" disabled={addingNote || !noteContent.trim()} className="rounded-xl bg-customBlue px-4 py-2 text-[12px] font-black text-white disabled:opacity-40">
                      {addingNote ? 'جارٍ الحفظ...' : 'حفظ الملاحظة'}
                    </button>
                  </div>
                </form>
              : null}
              {app.notes?.length ?
                <div className="space-y-3">
                  {app.notes.map((note: AmbassadorNote) => (
                    <div key={note.id} className={`group rounded-xl border ${BORDER} bg-detail-soft p-3.5`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-500">{note.author}</span>
                          {note.is_private ? <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/80"><Lock className="h-2.5 w-2.5" aria-hidden /> داخلي</span> : null}
                        </div>
                        {canManage ?
                          <button type="button" disabled={deletingNote !== null} onClick={() => void handleDeleteNote(note.id)} className="rounded p-1 text-red-400 opacity-60 transition hover:text-red-600 hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40" aria-label="حذف الملاحظة">
                            {deletingNote === note.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-[13px] font-medium leading-relaxed text-deepBlue/90">{note.content}</p>
                      {note.created_at ? <p className="mt-1.5 text-[10px] font-medium text-slate-400">{formatDateTime(note.created_at)}</p> : null}
                    </div>
                  ))}
                </div>
              : <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-[12px] font-bold text-slate-400">لا توجد ملاحظات بعد</p>}
            </CardShell>

            <CardShell title="سجل النشاط" icon={Clock}>
              {timeline.length ?
                <ol>
                  {timeline.map((item, idx) => (
                    <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {idx < timeline.length - 1 ? <span className="absolute right-[13px] top-7 bottom-0 w-px bg-slate-200" aria-hidden /> : null}
                      <span className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">{item.icon}</span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-[12px] font-bold text-deepBlue">{item.title}</p>
                        {item.description ? <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">{item.description}</p> : null}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium text-slate-400">
                          {item.user ? <span>{item.user}</span> : null}
                          {item.date ? <span>{item.date}{item.time ? ` · ${item.time}` : ''}</span> : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              : <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-[12px] font-bold text-slate-400">لا يوجد سجل نشاط بعد</p>}
            </CardShell>
          </>
        }
      />

      <ConfirmDialog
        open={confirmAction === 'reject'}
        title="رفض الطلب"
        description={`هل أنت متأكد من رفض طلب ${app.full_name}؟ ستُغلق نافذة التفاصيل بعد التأكيد.`}
        confirmLabel="رفض الطلب"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={() => { setConfirmAction(null); void quickStatus('rejected') }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === 'approve'}
        title="قبول الطلب"
        description={`هل أنت متأكد من قبول طلب ${app.full_name}؟`}
        confirmLabel="قبول"
        cancelLabel="إلغاء"
        variant="primary"
        onConfirm={() => { setConfirmAction(null); void quickStatus('approved') }}
        onCancel={() => setConfirmAction(null)}
      />
    </DetailModalShell>
  )
}
