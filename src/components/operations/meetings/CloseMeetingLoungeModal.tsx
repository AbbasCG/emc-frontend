import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertCircle,
  Award,
  Gavel,
  ListChecks,
  Loader2,
  Plus,
  Star,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react'
import toast from '@/lib/toast'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import {
  closeMeetingLounge,
  describeMeetingError,
  fetchMeetingParticipantPool,
  type AttendanceCandidate,
} from '@/api/meetingsApi'
import type { OpsMeetingDetail } from '@/types/operations'

type Props = {
  meeting: OpsMeetingDetail
  onClose: () => void
  onSuccess: (updatedMeeting: OpsMeetingDetail) => void
}

type ActionRow = { key: number; title: string; assigned_to: string; due_date: string }
type DecisionRow = { key: number; title: string; description: string }

let keyCounter = 0
const nextRowKey = () => ++keyCounter

const inputClass =
  'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15'

export default function CloseMeetingLoungeModal({ meeting, onClose, onSuccess }: Props) {
  const [candidates, setCandidates] = useState<AttendanceCandidate[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Attendance state: user_id -> { attended: boolean, excuse_status?: 'with_excuse' | 'without_excuse', excuse_reason?: string }
  const [attendanceMap, setAttendanceMap] = useState<
    Record<
      number,
      {
        attended: boolean
        excuse_status?: 'with_excuse' | 'without_excuse' | null
        excuse_reason?: string
      }
    >
  >({})

  const [topInteractiveUserId, setTopInteractiveUserId] = useState<number | null>(
    meeting.top_interactive_user?.id ?? null,
  )
  const [minutes, setMinutes] = useState(meeting.description ?? '')
  const [decisions, setDecisions] = useState<DecisionRow[]>([])
  const [actions, setActions] = useState<ActionRow[]>([])

  useEffect(() => {
    let alive = true
    setLoadingCandidates(true)
    fetchMeetingParticipantPool(meeting.id)
      .then((res) => {
        if (!alive) return
        setCandidates(res.rows)

        // Initialize attendance map
        const initialMap: typeof attendanceMap = {}
        for (const c of res.rows) {
          const isAttended = c.status === 'joined' || c.status === 'attended'
          initialMap[c.id] = {
            attended: isAttended,
            excuse_status: c.excuse_status ?? null,
            excuse_reason: c.excuse_reason ?? '',
          }
        }
        setAttendanceMap(initialMap)
      })
      .catch(() => {
        if (alive) setError('تعذّر تحميل قائمة المشاركين في الاجتماع.')
      })
      .finally(() => {
        if (alive) setLoadingCandidates(false)
      })

    return () => {
      alive = false
    }
  }, [meeting.id])

  // Calculation of Discipline Rate automatically
  const totalCount = candidates.length
  const attendedCount = useMemo(() => {
    return Object.values(attendanceMap).filter((a) => a.attended).length
  }, [attendanceMap])

  const disciplineRate = useMemo(() => {
    if (totalCount === 0) return 100
    return Math.round((attendedCount / totalCount) * 100)
  }, [totalCount, attendedCount])

  const absentees = useMemo(() => {
    return candidates.filter((c) => !attendanceMap[c.id]?.attended)
  }, [candidates, attendanceMap])

  const attendeesList = useMemo(() => {
    return candidates.filter((c) => attendanceMap[c.id]?.attended)
  }, [candidates, attendanceMap])

  function toggleAttendance(userId: number, attended: boolean) {
    setAttendanceMap((prev) => ({
      ...prev,
      [userId]: {
        attended,
        excuse_status: attended ? null : prev[userId]?.excuse_status ?? 'without_excuse',
        excuse_reason: attended ? '' : prev[userId]?.excuse_reason ?? '',
      },
    }))

    // If marked absent, cannot be top interactive user
    if (!attended && topInteractiveUserId === userId) {
      setTopInteractiveUserId(null)
    }
  }

  function updateExcuse(
    userId: number,
    excuse_status: 'with_excuse' | 'without_excuse',
    excuse_reason?: string,
  ) {
    setAttendanceMap((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        attended: false,
        excuse_status,
        excuse_reason: excuse_reason ?? prev[userId]?.excuse_reason ?? '',
      },
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)

    if (totalCount === 0) {
      setError('لا يوجد مشاركون مسجلون في هذا الاجتماع.')
      return
    }

    setSubmitting(true)
    try {
      const attendancePayload = candidates.map((c) => {
        const state = attendanceMap[c.id] ?? { attended: false }
        return {
          user_id: c.id,
          attended: state.attended,
          excuse_status: state.attended ? null : state.excuse_status ?? 'without_excuse',
          excuse_reason: state.attended ? null : state.excuse_reason?.trim() || null,
        }
      })

      const updated = await closeMeetingLounge(meeting.id, {
        attendance: attendancePayload,
        top_interactive_user_id: topInteractiveUserId,
        minutes: minutes.trim() || undefined,
        decisions: decisions.filter((d) => d.title.trim()).map((d) => ({
          title: d.title.trim(),
          description: d.description.trim() || undefined,
        })),
        action_items: actions.filter((a) => a.title.trim()).map((a) => ({
          title: a.title.trim(),
          assigned_to: a.assigned_to ? Number(a.assigned_to) : undefined,
          due_date: a.due_date || undefined,
        })),
      })

      toast.success('تم إنهاء الاجتماع واحتساب نقاط الأثر ومؤشر الانضباط تلقائياً!')
      onSuccess(updated)
      onClose()
    } catch (err) {
      const d = describeMeetingError(err, 'إغلاق الاجتماع')
      setError(d.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="إغلاق الاجتماع ورصد الحضور والنقاط"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-line bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Award size={24} />
            </span>
            <div>
              <h2 className="text-lg font-black text-navy">إدارة الحضور ونتائج الاجتماع</h2>
              <p className="text-xs font-semibold text-muted-500">
                {meeting.title} · أتمتة الانضباط ومنح نقاط الأثر
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl p-2 text-muted-500 transition hover:bg-slate-100 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-xs font-black text-rose-700">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Quick KPIs Summary (Auto calculated) */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-line bg-white p-4">
                <span className="text-[11px] font-bold text-muted-500">إجمالي المدعوين</span>
                <p className="mt-1 text-xl font-black text-navy">{totalCount}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <span className="text-[11px] font-bold text-muted-500">الحاضرون فعلياً</span>
                <p className="mt-1 text-xl font-black text-emerald-600">{attendedCount}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <span className="text-[11px] font-bold text-muted-500">الغائبون</span>
                <p className="mt-1 text-xl font-black text-rose-600">{absentees.length}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <span className="text-[11px] font-bold text-muted-500">مؤشر الانضباط (آلي)</span>
                <p className="mt-1 text-xl font-black text-brand-600">{disciplineRate}%</p>
              </div>
            </div>

            {/* Attendance Roster Section */}
            <section className="space-y-3 rounded-3xl border border-line bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-black text-navy">
                  <Users size={16} className="text-brand-500" />
                  رصد الحضور والغياب والأعذار
                </h3>
                <span className="text-xs font-bold text-muted-500">
                  (+50 نقطة أثر تضاف آلياً لكل حاضر)
                </span>
              </div>

              {loadingCandidates ? (
                <div className="flex items-center justify-center py-8 text-muted-400">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : (
                <div className="divide-y divide-line/60">
                  {candidates.map((cand) => {
                    const state = attendanceMap[cand.id] ?? { attended: false }
                    return (
                      <div key={cand.id} className="py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <span className="text-sm font-black text-navy">{cand.name}</span>
                            {cand.department && (
                              <span className="ms-2 text-xs font-semibold text-muted-400">
                                ({cand.department})
                              </span>
                            )}
                          </div>

                          {/* Attendance buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleAttendance(cand.id, true)}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                                state.attended
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : 'border border-line bg-white text-muted-500 hover:bg-slate-50'
                              }`}
                            >
                              <UserCheck size={14} />
                              حاضر
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAttendance(cand.id, false)}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                                !state.attended
                                  ? 'bg-rose-500 text-white shadow-sm'
                                  : 'border border-line bg-white text-muted-500 hover:bg-slate-50'
                              }`}
                            >
                              <UserX size={14} />
                              غائب
                            </button>
                          </div>
                        </div>

                        {/* If absent: Show excuse selector and excuse reason input */}
                        {!state.attended && (
                          <div className="mt-2.5 rounded-2xl bg-paper p-3 space-y-2">
                            <div className="flex items-center gap-4 text-xs font-bold">
                              <span className="text-muted-500">نوع الغياب:</span>
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`excuse-${cand.id}`}
                                  checked={state.excuse_status === 'with_excuse'}
                                  onChange={() => updateExcuse(cand.id, 'with_excuse')}
                                  className="accent-brand-500"
                                />
                                <span className="text-navy">بعذر</span>
                              </label>
                              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`excuse-${cand.id}`}
                                  checked={state.excuse_status !== 'with_excuse'}
                                  onChange={() => updateExcuse(cand.id, 'without_excuse')}
                                  className="accent-rose-500"
                                />
                                <span className="text-rose-600">بدون عذر</span>
                              </label>
                            </div>

                            {state.excuse_status === 'with_excuse' && (
                              <input
                                type="text"
                                placeholder="اكتب عذر الغياب هنا (مثال: إجازة، ظرف صحي طارئ...)"
                                value={state.excuse_reason ?? ''}
                                onChange={(e) => updateExcuse(cand.id, 'with_excuse', e.target.value)}
                                className={`${inputClass} text-xs`}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Top Interactive Member (100 Bonus Impact Points) */}
            <section className="space-y-3 rounded-3xl border border-line bg-amber-50/50 p-5">
              <div className="flex items-center gap-2">
                <Star size={18} className="text-amber-500 fill-amber-400" />
                <h3 className="text-sm font-black text-navy">العضو الأكثر تفاعلاً في الاجتماع</h3>
                <span className="rounded-full bg-amber-200/60 px-2 py-0.5 text-[11px] font-black text-amber-900">
                  +100 نقطة أثر 🌟
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-600">
                اختر العضو الذي قدم أفضل مساهمة وتفاعل في هذا الاجتماع لمكافأته بنقاط الأثر ووسام التميّز.
              </p>

              <select
                value={topInteractiveUserId ?? ''}
                onChange={(e) => setTopInteractiveUserId(e.target.value ? Number(e.target.value) : null)}
                className={`${inputClass} bg-white`}
              >
                <option value="">— اختر العضو الأكثر تفاعلاً (اختياري) —</option>
                {attendeesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    ⭐ {c.name} {c.department ? `(${c.department})` : ''}
                  </option>
                ))}
              </select>
            </section>

            {/* Meeting Minutes / Notes */}
            <section className="space-y-3 rounded-3xl border border-line bg-white p-5">
              <h3 className="text-sm font-black text-navy">محضر وخلاصة الاجتماع (اختياري)</h3>
              <textarea
                rows={3}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="اكتب خلاصة سريعة لما تم نقاشه أو أي توجيهات مهمة…"
                className={inputClass}
              />
            </section>

            {/* Quick Decisions & Action Items */}
            <section className="space-y-4 rounded-3xl border border-line bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-black text-navy">
                  <Gavel size={16} className="text-brand-500" />
                  القرارات الصادرة
                </h3>
                <button
                  type="button"
                  onClick={() => setDecisions((d) => [...d, { key: nextRowKey(), title: '', description: '' }])}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-black text-navy hover:bg-slate-50"
                >
                  <Plus size={13} />
                  إضافة قرار
                </button>
              </div>

              {decisions.map((d) => (
                <div key={d.key} className="flex items-center gap-2">
                  <input
                    value={d.title}
                    onChange={(e) =>
                      setDecisions((rows) =>
                        rows.map((r) => (r.key === d.key ? { ...r, title: e.target.value } : r)),
                      )
                    }
                    placeholder="نص القرار الصادر…"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setDecisions((rows) => rows.filter((r) => r.key !== d.key))}
                    className="rounded-xl p-2.5 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <div className="pt-2 border-t border-line/60">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="flex items-center gap-2 text-sm font-black text-navy">
                    <ListChecks size={16} className="text-brand-500" />
                    بنود العمل والتكليفات
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setActions((a) => [
                        ...a,
                        { key: nextRowKey(), title: '', assigned_to: '', due_date: '' },
                      ])
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-black text-navy hover:bg-slate-50"
                  >
                    <Plus size={13} />
                    إضافة تكليف
                  </button>
                </div>

                {actions.map((act) => (
                  <div key={act.key} className="space-y-2 rounded-2xl border border-line bg-paper p-3 mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={act.title}
                        onChange={(e) =>
                          setActions((rows) =>
                            rows.map((r) => (r.key === act.key ? { ...r, title: e.target.value } : r)),
                          )
                        }
                        placeholder="عنوان المهمة / التكليف…"
                        className={`${inputClass} bg-white`}
                      />
                      <button
                        type="button"
                        onClick={() => setActions((rows) => rows.filter((r) => r.key !== act.key))}
                        className="rounded-xl p-2.5 text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        value={act.assigned_to}
                        onChange={(e) =>
                          setActions((rows) =>
                            rows.map((r) =>
                              r.key === act.key ? { ...r, assigned_to: e.target.value } : r,
                            ),
                          )
                        }
                        className={`${inputClass} bg-white text-xs`}
                      >
                        <option value="">— تعيين للمسؤول —</option>
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <EmcDatePicker
                        label="تاريخ الاستحقاق"
                        layout="stacked"
                        value={act.due_date}
                        onChange={(v) =>
                          setActions((rows) =>
                            rows.map((r) => (r.key === act.key ? { ...r, due_date: v } : r)),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <footer className="flex items-center justify-between border-t border-line bg-white px-6 py-4">
            <span className="text-xs font-bold text-muted-500">
              سيتم حفظ النتائج وإنهاء الاجتماع مباشرة دون الحاجة لتقارير إضافية.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-muted-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'جارٍ الرصد والأتمتة…' : 'اعتماد وإنهاء الاجتماع'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}
