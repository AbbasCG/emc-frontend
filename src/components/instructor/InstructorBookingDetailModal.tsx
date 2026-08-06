import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Repeat,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import type { InstructorAvailabilitySlot, OralBookingDetail } from '@/api/placementApi'
import {
  fetchOralBookingDetail,
  rescheduleOralBooking,
  sendOralBookingMessage,
  updateOralBookingMeetingLink,
  updateOralBookingStatus,
} from '@/api/placementApi'
import { CEFR_MAP } from './InstructorStudentDrawer'
import { formatAmsterdamDMY, formatAmsterdamTimeRange } from '@/utils/amsterdamTime'
import toast from '@/lib/toast'
import { PLACEMENT_STATUS_META, resolvePlacementStatusKey } from '@/utils/placementStatusColors'

type Props = {
  slot: InstructorAvailabilitySlot | null
  /** Other upcoming AVAILABLE slots for this instructor — used to power reschedule. */
  availableSlots: InstructorAvailabilitySlot[]
  onClose: () => void
  /** Called after any action mutates the booking, so the parent can refresh its list. */
  onChanged: () => void
}

export function InstructorBookingDetailModal({ slot, availableSlots, onClose, onChanged }: Props) {
  const [detail, setDetail]         = useState<OralBookingDetail | null>(null)
  const [loading, setLoading]       = useState(false)
  const [busy, setBusy]             = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [messageBody, setMessageBody] = useState('')
  const [confirming, setConfirming] = useState<null | { status: 'completed' | 'no_show' | 'cancelled_by_instructor'; label: string }>(null)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleSlotId, setRescheduleSlotId] = useState<number | null>(null)
  const [linkEditing, setLinkEditing] = useState(false)
  const [linkValue, setLinkValue]     = useState('')
  const [linkBusy, setLinkBusy]       = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const bookingId = slot?.booking?.id ?? null

  useEffect(() => {
    if (!bookingId) { setDetail(null); return }
    let cancelled = false
    setLoading(true)
    setMessageOpen(false)
    setMessageBody('')
    setConfirming(null)
    setRescheduleOpen(false)
    setRescheduleSlotId(null)
    setLinkEditing(false)
    setLinkValue('')
    fetchOralBookingDetail(bookingId)
      .then((d) => { if (!cancelled) setDetail(d) })
      .catch(() => { if (!cancelled) setDetail(slot?.booking ?? null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bookingId, slot?.booking])

  useEffect(() => {
    if (!slot) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [slot, onClose])

  if (!slot?.booking) return null
  const b = detail ?? slot.booking
  const meta = PLACEMENT_STATUS_META[resolvePlacementStatusKey(b.status, b.ends_at)]
  const cefr = b.placement?.estimated_level ? CEFR_MAP[b.placement.estimated_level] : null

  async function runStatusChange(status: 'completed' | 'no_show' | 'cancelled_by_instructor', reason?: string) {
    if (!bookingId) return
    setBusy(true)
    try {
      const updated = await updateOralBookingStatus(bookingId, status, reason)
      if (updated) setDetail(updated)
      toast.success('تم تحديث حالة الموعد')
      setConfirming(null)
      onChanged()
    } catch {
      toast.error('تعذّر تحديث حالة الموعد')
    } finally {
      setBusy(false)
    }
  }

  async function handleSendMessage() {
    if (!bookingId || !messageBody.trim()) return
    setBusy(true)
    try {
      await sendOralBookingMessage(bookingId, messageBody.trim())
      toast.success('تم إرسال الرسالة')
      setMessageBody('')
      setMessageOpen(false)
    } catch {
      toast.error('تعذّر إرسال الرسالة')
    } finally {
      setBusy(false)
    }
  }

  async function handleReschedule() {
    if (!bookingId || !rescheduleSlotId) return
    setBusy(true)
    try {
      const updated = await rescheduleOralBooking(bookingId, rescheduleSlotId)
      if (updated) setDetail(updated)
      toast.success('تم نقل الموعد بنجاح')
      setRescheduleOpen(false)
      onChanged()
    } catch {
      toast.error('تعذّر نقل الموعد — قد يكون غير متاح')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveMeetingLink(newValue: string | null) {
    if (!bookingId) return
    setLinkBusy(true)
    try {
      const result = await updateOralBookingMeetingLink(bookingId, newValue)
      setDetail((prev) => (prev ? { ...prev, meeting_link: result.meeting_link } : prev))
      toast.success(newValue ? 'تم تحديث رابط الاجتماع' : 'تمت إزالة رابط الاجتماع')
      setLinkEditing(false)
      onChanged()
    } catch {
      toast.error('تعذّر تحديث رابط الاجتماع')
    } finally {
      setLinkBusy(false)
    }
  }

  const otherSlots = availableSlots.filter((s) => s.id !== slot.id)
  const canAct = b.is_active

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/55 p-0 backdrop-blur-sm sm:p-4"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`تفاصيل موعد ${b.student?.name ?? ''}`}
          tabIndex={-1}
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96, y: reduceMotion ? 0 : 8 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 38 }}
          className="flex h-full w-full flex-col overflow-hidden bg-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.45)] sm:h-auto sm:max-h-[90vh] sm:w-[92vw] sm:max-w-lg sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-l from-[#22334A] to-[#1a2d44] px-5 py-4 text-white sm:px-6 sm:py-5">
            <div className="pointer-events-none absolute -left-4 top-0 h-24 w-24 rounded-full bg-[#EC943C]/20 blur-[45px]" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {b.student?.avatar_url ? (
                  <img src={b.student.avatar_url} alt={b.student.name} className="h-11 w-11 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-[14px] font-black">
                    {b.student?.initials ?? '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-black leading-tight">{b.student?.name ?? 'طالب'}</p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-white/55">{b.student?.email}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${meta.badgeBg} ${meta.text}`}>{meta.label}</span>
                    {b.reference && (
                      <span className="rounded-lg bg-white/15 px-2 py-0.5 font-mono text-[10px] font-black">{b.reference}</span>
                    )}
                  </div>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="إغلاق"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            {loading && !detail ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#2691C2]/20 border-t-[#2691C2]" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Appointment */}
                <Section title="الموعد">
                  <Row icon={<Calendar className="h-3.5 w-3.5" />} label={formatAmsterdamDMY(slot.starts_at)} />
                  <Row icon={<Clock className="h-3.5 w-3.5" />} label={`${formatAmsterdamTimeRange(slot.starts_at, slot.ends_at)} (أمستردام)`} />
                  {slot.course_title && <Row icon={<CheckCircle2 className="h-3.5 w-3.5" />} label={slot.course_title} />}
                  <div className="mt-1.5">
                    {linkEditing ? (
                      <div className="space-y-2">
                        <input
                          type="url"
                          value={linkValue}
                          onChange={(e) => setLinkValue(e.target.value)}
                          placeholder="https://meet.google.com/..."
                          dir="ltr"
                          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-[#22334A] outline-none focus:border-[#2691C2]/40"
                        />
                        <div className="flex gap-2">
                          <button type="button" disabled={linkBusy || !linkValue.trim()}
                            onClick={() => void handleSaveMeetingLink(linkValue.trim())}
                            className="flex-1 rounded-xl bg-[#22334A] py-1.5 text-[11px] font-black text-white transition hover:brightness-110 disabled:opacity-40">
                            حفظ
                          </button>
                          <button type="button" onClick={() => { setLinkEditing(false); setLinkValue(b.meeting_link ?? '') }}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-black text-deepBlue/60 transition hover:bg-slate-50">
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : b.meeting_link ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <a href={b.meeting_link} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-[12px] font-bold text-[#2691C2] hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" /> رابط الاجتماع
                        </a>
                        <button type="button" onClick={() => { setLinkValue(b.meeting_link ?? ''); setLinkEditing(true) }}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black text-deepBlue/55 transition hover:bg-slate-50">
                          <Link2 className="h-3 w-3" /> تعديل
                        </button>
                        <button type="button" disabled={linkBusy} onClick={() => void handleSaveMeetingLink(null)}
                          className="flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-black text-rose-600 transition hover:bg-rose-50 disabled:opacity-40">
                          <Trash2 className="h-3 w-3" /> إزالة
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-amber-600">سيتم إضافة رابط الاجتماع قريباً</span>
                        <button type="button" onClick={() => { setLinkValue(''); setLinkEditing(true) }}
                          className="flex items-center gap-1 rounded-lg border border-[#2691C2]/25 bg-[#2691C2]/[0.06] px-2 py-1 text-[10px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/[0.12]">
                          <Link2 className="h-3 w-3" /> إضافة رابط
                        </button>
                      </div>
                    )}
                  </div>
                </Section>

                {/* Student */}
                <Section title="الطالب">
                  {b.student?.email && (
                    <Row icon={<Mail className="h-3.5 w-3.5" />} label={b.student.email} dir="ltr" />
                  )}
                  {b.student?.phone && (
                    <Row icon={<Phone className="h-3.5 w-3.5" />} label={b.student.phone} dir="ltr" />
                  )}
                  {b.placement && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {b.placement.score != null && (
                        <span className="rounded-lg bg-emerald-50 px-2 py-1 font-mono text-[11px] font-black text-emerald-700">
                          {b.placement.score}/{b.placement.total ?? '—'} · {b.placement.percentage ?? 0}%
                        </span>
                      )}
                      {cefr && (
                        <span className={`rounded-lg px-2 py-1 text-[11px] font-black ${cefr.bg} ${cefr.text}`}>
                          {cefr.cefr} · {cefr.arabic}
                        </span>
                      )}
                    </div>
                  )}
                  {b.student && (
                    <a href={`/dashboard/instructor/courses/${slot.course_id}/placement-students`}
                      className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#2691C2] hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> فتح ملف الطالب في التقييم
                    </a>
                  )}
                </Section>

                {/* Message composer */}
                <Section title="التواصل">
                  {!messageOpen ? (
                    <button type="button" onClick={() => setMessageOpen(true)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-[#2691C2]/25 bg-[#2691C2]/[0.06] py-2.5 text-[12px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/[0.12]">
                      <MessageCircle className="h-4 w-4" /> إرسال رسالة للطالب
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        placeholder="اكتب رسالتك للطالب بخصوص هذا الموعد..."
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-[12px] font-semibold text-[#22334A] outline-none focus:border-[#2691C2]/40"
                      />
                      <div className="flex gap-2">
                        <button type="button" disabled={busy || !messageBody.trim()} onClick={() => void handleSendMessage()}
                          className="flex-1 rounded-xl bg-[#22334A] py-2 text-[12px] font-black text-white transition hover:brightness-110 disabled:opacity-40">
                          إرسال (إشعار + بريد)
                        </button>
                        <button type="button" onClick={() => { setMessageOpen(false); setMessageBody('') }}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-black text-deepBlue/60 transition hover:bg-slate-50">
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </Section>

                {/* Reschedule */}
                {canAct && (
                  <Section title="نقل الموعد">
                    {!rescheduleOpen ? (
                      <button type="button" onClick={() => setRescheduleOpen(true)} disabled={otherSlots.length === 0}
                        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 py-2.5 text-[12px] font-black text-deepBlue/70 transition hover:bg-slate-50 disabled:opacity-40">
                        <Repeat className="h-4 w-4" /> {otherSlots.length === 0 ? 'لا توجد مواعيد متاحة أخرى' : 'اختيار موعد جديد'}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={rescheduleSlotId ?? ''}
                          onChange={(e) => setRescheduleSlotId(e.target.value ? Number(e.target.value) : null)}
                          className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-deepBlue outline-none focus:border-[#2691C2]/40"
                        >
                          <option value="">اختر موعدًا متاحًا...</option>
                          {otherSlots.map((s) => (
                            <option key={s.id} value={s.id}>
                              {formatAmsterdamDMY(s.starts_at)} · {formatAmsterdamTimeRange(s.starts_at, s.ends_at)}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button type="button" disabled={busy || !rescheduleSlotId} onClick={() => void handleReschedule()}
                            className="flex-1 rounded-xl bg-[#22334A] py-2 text-[12px] font-black text-white transition hover:brightness-110 disabled:opacity-40">
                            تأكيد النقل
                          </button>
                          <button type="button" onClick={() => setRescheduleOpen(false)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-black text-deepBlue/60 transition hover:bg-slate-50">
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}
                  </Section>
                )}

                {/* Status actions */}
                {canAct && (
                  <Section title="إجراءات الموعد">
                    <div className="grid grid-cols-3 gap-2">
                      <ActionButton icon={<CheckCircle2 className="h-4 w-4" />} label="اكتمل" color="emerald"
                        onClick={() => setConfirming({ status: 'completed', label: 'وضع الموعد كمكتمل' })} />
                      <ActionButton icon={<AlertTriangle className="h-4 w-4" />} label="لم يحضر" color="amber"
                        onClick={() => setConfirming({ status: 'no_show', label: 'وضع الموعد كـ (لم يحضر الطالب)' })} />
                      <ActionButton icon={<XCircle className="h-4 w-4" />} label="إلغاء" color="rose"
                        onClick={() => setConfirming({ status: 'cancelled_by_instructor', label: 'إلغاء هذا الموعد' })} />
                    </div>
                  </Section>
                )}

                {/* Status history */}
                {b.status_history && b.status_history.length > 0 && (
                  <Section title="سجل الحالة">
                    <div className="space-y-1.5">
                      {b.status_history.map((h, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] font-semibold text-deepBlue/55">
                          <span>{PLACEMENT_STATUS_META[resolvePlacementStatusKey(h.to_status)].label}{h.reason ? ` — ${h.reason}` : ''}</span>
                          <span className="font-mono text-[10px] text-deepBlue/35">{h.changed_at ? formatAmsterdamDMY(h.changed_at) : ''}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            )}
          </div>

          {/* Confirmation overlay for destructive actions */}
          <AnimatePresence>
            {confirming && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.12 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-[#0F172A]/60 p-6"
              >
                <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl">
                  <p className="text-[13px] font-black text-[#22334A]">{confirming.label}؟</p>
                  <p className="mt-1 text-[11px] font-semibold text-deepBlue/45">لا يمكن التراجع عن هذا الإجراء.</p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" disabled={busy} onClick={() => void runStatusChange(confirming.status)}
                      className="flex-1 rounded-xl bg-[#22334A] py-2 text-[12px] font-black text-white transition hover:brightness-110 disabled:opacity-40">
                      {busy ? <RefreshCw className="mx-auto h-4 w-4 animate-spin" /> : 'تأكيد'}
                    </button>
                    <button type="button" onClick={() => setConfirming(null)}
                      className="flex-1 rounded-xl border border-slate-200 py-2 text-[12px] font-black text-deepBlue/60 transition hover:bg-slate-50">
                      تراجع
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-deepBlue/35">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ icon, label, dir }: { icon: React.ReactNode; label: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="flex items-center gap-2 text-[12px] font-bold text-[#22334A]">
      <span className="text-[#22334A]/40">{icon}</span>
      <span dir={dir}>{label}</span>
    </div>
  )
}

function ActionButton({ icon, label, color, onClick }: {
  icon: React.ReactNode; label: string; color: 'emerald' | 'amber' | 'rose'; onClick: () => void
}) {
  const colors = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    amber:   'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    rose:    'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  }[color]
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[10px] font-black transition ${colors}`}>
      {icon}
      {label}
    </button>
  )
}
