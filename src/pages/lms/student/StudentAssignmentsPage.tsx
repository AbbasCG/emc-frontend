import axios from 'axios'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ClipboardList, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchStudentAssignments, submitStudentAssignment } from '@/api/studentApi'
import type { StudentAssignment } from '@/types/lms'
import { DashboardSection } from '@/components/dashboard'
import { AssignmentCard, LmsEmptyState, LmsPageSkeleton } from '@/components/lms'

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMissing, setApiMissing] = useState(false)
  const [active, setActive] = useState<StudentAssignment | null>(null)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function reload() {
    fetchStudentAssignments().then(setAssignments).catch(() => setApiMissing(true))
  }

  useEffect(() => {
    let alive = true
    fetchStudentAssignments()
      .then((rows) => {
        if (alive) setAssignments(rows)
      })
      .catch((err) => {
        if (!alive || axios.isCancel(err)) return
        setApiMissing(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!active) return
    setSubmitting(true)
    setMessage(null)
    try {
      await submitStudentAssignment(active.assignment_id, {
        answer_text: text || undefined,
        file,
      })
      setMessage({ type: 'ok', text: 'تم تسليم الواجب بنجاح.' })
      setText('')
      setFile(null)
      setActive(null)
      reload()
    } catch {
      setMessage({ type: 'err', text: 'فشل التسليم. تحقق من الحقول أو حاول لاحقاً.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LmsPageSkeleton />

  return (
    <div className="space-y-8">
      {apiMissing && import.meta.env.DEV && (
        <div className="rounded-xl bg-amber-50 px-5 py-3 text-right text-xs font-bold text-amber-800 ring-1 ring-amber-100">
          يتطلب الخادم مسارات{' '}
          <code className="rounded bg-white/80 px-1">GET /api/student/assignments</code> و{' '}
          <code className="rounded bg-white/80 px-1">POST .../submit</code>.
        </div>
      )}

      {message && (
        <div
          className={
            message.type === 'ok'
              ? 'rounded-xl bg-emerald-50 px-4 py-3 text-right text-sm font-bold text-emerald-800 ring-1 ring-emerald-100'
              : 'rounded-xl bg-red-50 px-4 py-3 text-right text-sm font-bold text-red-700 ring-1 ring-red-100'
          }
        >
          {message.text}
        </div>
      )}

      <DashboardSection title="واجباتي" subtitle="التسليم، التقييم، والملاحظات في مكان واحد.">
        {assignments.length === 0 ? (
          <LmsEmptyState
            icon={ClipboardList}
            title="لا توجد واجبات"
            description="عند إسناد واجبات ضمن دوراتك ستظهر هنا مع مواعيد التسليم."
          />
        ) : (
          <div className="grid gap-4">
            {assignments.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                onSubmit={() => {
                  setActive(a)
                  setText('')
                  setFile(null)
                  setMessage(null)
                }}
              />
            ))}
          </div>
        )}
      </DashboardSection>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            onClick={() => !submitting && setActive(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(ev) => ev.stopPropagation()}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-deepBlue/10"
            >
              <h2 className="text-right text-lg font-black text-deepBlue">تسليم الواجب</h2>
              <p className="mt-1 text-right text-sm font-bold text-slate-500">{active.title}</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-right">
                <label className="grid gap-2">
                  <span className="text-xs font-black text-deepBlue">إجابة نصية</span>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue outline-none focus:border-customBlue"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-black text-deepBlue">مرفق (اختياري)</span>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="text-sm font-semibold text-deepBlue"
                  />
                </label>
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setActive(null)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-600"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-6 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-60"
                  >
                    <Send size={14} />
                    {submitting ? 'جارٍ الإرسال...' : 'إرسال التسليم'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
