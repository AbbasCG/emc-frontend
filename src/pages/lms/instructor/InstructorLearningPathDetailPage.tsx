import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Users,
  Clock,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import {
  fetchInstructorLearningPath,
  updateInstructorCurriculum,
  fetchInstructorPathStudents,
  type LearningPath,
} from '../../../api/learningPathsApi'
import CourseSelector from '../../../components/learning-paths/CourseSelector'

type Student = {
  enrollment_id: number
  user_id: number
  name: string | null
  email: string | null
  status: string
  enrolled_at: string
}

type Tab = 'curriculum' | 'students'

export default function InstructorLearningPathDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [path, setPath]         = useState<LearningPath | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [tab, setTab]           = useState<Tab>('curriculum')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [courseIds, setCourseIds] = useState<number[]>([])
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const data = await fetchInstructorLearningPath(Number(id))
    if (!data) {
      navigate('/dashboard/instructor/learning-paths', { replace: true })
      return
    }
    setPath(data)
    setCourseIds((data.courses ?? []).map((c) => c.id))
    setLoading(false)
  }, [id, navigate])

  const loadStudents = useCallback(async () => {
    if (!id) return
    const data = await fetchInstructorPathStudents(Number(id))
    setStudents(data)
  }, [id])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (tab === 'students') void loadStudents() }, [tab, loadStudents])

  const saveCurriculum = async (ids: number[]) => {
    if (!id) return
    setSaving(true)
    try {
      const updated = await updateInstructorCurriculum(Number(id), ids)
      setCourseIds((updated.courses ?? []).map((c) => c.id))
      showToast('تم حفظ المنهج بنجاح')
    } catch {
      showToast('فشل حفظ المنهج', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2691C2]" />
      </div>
    )

  if (!path) return null

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl ${
              toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5 shadow-sm">
        <nav className="mb-3 flex items-center gap-2 text-xs text-slate-400">
          <Link to="/dashboard/instructor" className="hover:text-[#2691C2]">لوحة التحكم</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/dashboard/instructor/learning-paths" className="hover:text-[#2691C2]">مساراتي</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600 line-clamp-1">{path.title}</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#22334A]">{path.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {path.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#2691C2]" />
                  {path.duration} {path.duration_unit === 'weeks' ? 'أسبوع' : path.duration_unit === 'months' ? 'شهر' : 'يوم'}
                </span>
              )}
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5 text-[#EC943C]" />
                {courseIds.length} دورة
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {path.students_count} طالب مسجّل
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-6">
        {(['curriculum', 'students'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
              tab === t ? 'border-[#2691C2] text-[#2691C2]' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t === 'curriculum' ? 'المنهج الدراسي' : `الطلاب (${students.length})`}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-4xl p-6">
        {/* ── Curriculum Tab ── */}
        {tab === 'curriculum' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-[#22334A]">دورات المسار</h2>
              <button
                onClick={() => saveCurriculum(courseIds)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#2691C2] px-4 py-2 text-sm font-black text-white transition hover:bg-[#1d7aab] disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                حفظ المنهج
              </button>
            </div>

            <CourseSelector value={courseIds} onChange={setCourseIds} />
          </div>
        )}

        {/* ── Students Tab ── */}
        {tab === 'students' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm text-slate-400">لا طلاب مسجّلين بعد</p>
              </div>
            ) : (
              <table className="w-full text-right text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 font-bold text-slate-500">الطالب</th>
                    <th className="hidden px-4 py-3 font-bold text-slate-500 sm:table-cell">البريد</th>
                    <th className="px-4 py-3 font-bold text-slate-500">الحالة</th>
                    <th className="hidden px-4 py-3 font-bold text-slate-500 sm:table-cell">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map((s) => (
                    <tr key={s.enrollment_id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-semibold text-[#22334A]">{s.name ?? '—'}</td>
                      <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{s.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          s.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-[#2691C2]/10 text-[#2691C2] border-[#2691C2]/20'
                        }`}>
                          {s.status === 'completed' ? 'مكتمل' : 'جاري'}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-slate-400 sm:table-cell">
                        {new Date(s.enrolled_at).toLocaleDateString('ar-EG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
