import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ChevronDown, List, User } from 'lucide-react'
import {
  completeOralAssessment,
  fetchInstructorPlacementStudents,
  type PlacementStudentRow,
} from '@/api/placementApi'
import toast from '@/lib/toast'
import { InstructorHero } from '@/components/instructor'
import {
  CEFR_MAP,
  ORAL_SCORES,
  PlacementAssessmentDashboard,
  PlacementStudentList,
  emptyOralForm,
  type AssessmentTab,
  type OralForm,
} from '@/components/instructor/placement'

const LEVEL_REF = [
  { range: '1–6',   cefr: 'Starter', arabic: 'مبتدئ',         bg: 'bg-slate-100',   text: 'text-slate-600'   },
  { range: '7–20',  cefr: 'A1',      arabic: 'ابتدائي',        bg: 'bg-blue-100',    text: 'text-blue-700'    },
  { range: '21–34', cefr: 'A2',      arabic: 'ما قبل المتوسط', bg: 'bg-sky-100',     text: 'text-sky-700'     },
  { range: '35–48', cefr: 'B1',      arabic: 'متوسط',          bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { range: '49–62', cefr: 'B2',      arabic: 'فوق المتوسط',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  { range: '63–70', cefr: 'C1',      arabic: 'متقدم',          bg: 'bg-violet-100',  text: 'text-violet-700'  },
]

export default function InstructorPlacementStudentsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [students,          setStudents]         = useState<PlacementStudentRow[]>([])
  const [loading,           setLoading]          = useState(true)
  const [noPlacementCourse, setNoPlacementCourse] = useState(false)
  const [selected,          setSelected]         = useState<PlacementStudentRow | null>(null)
  const [listSearch,        setListSearch]       = useState('')
  const [form,              setForm]             = useState<OralForm>(emptyOralForm())
  const [saving,            setSaving]           = useState(false)
  const [showRef,           setShowRef]          = useState(false)
  const [activeTab,         setActiveTab]        = useState<AssessmentTab>('summary')
  const [mobileListOpen,    setMobileListOpen]  = useState(false)

  async function load() {
    if (!courseId) return
    setLoading(true)
    setNoPlacementCourse(false)
    try {
      const rows = await fetchInstructorPlacementStudents(courseId)
      setStudents(rows)
      setSelected((prev) => {
        if (!prev) return rows[0] ?? null
        return rows.find((r) => r.student_id === prev.student_id) ?? rows[0] ?? null
      })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 422) {
        setNoPlacementCourse(true)
      } else {
        toast.error('تعذّر تحميل قائمة الطلاب')
        if (import.meta.env.DEV) console.error('[placement-students] load failed:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [courseId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selected) setForm(emptyOralForm(selected))
  }, [selected?.student_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalOralScore = useMemo(() => {
    const parts = ORAL_SCORES.map((s) => form[s.key])
    const hasAny = parts.some((v) => v !== '')
    if (!hasAny) return null
    const nums = parts.map((v) => (v === '' ? 0 : Number(v)))
    if (nums.some((n) => isNaN(n))) return null
    return nums.reduce((a, b) => a + b, 0)
  }, [form])

  async function handleSaveOral() {
    if (!courseId || !selected) return
    if (!form.final_level) { toast.warning('يجب اختيار المستوى النهائي'); return }
    if (!selected.booking_id) {
      toast.error('تعذر تحديد الطالب، يرجى تحديث الصفحة والمحاولة مرة أخرى')
      return
    }
    setSaving(true)
    try {
      const rubricPayload: Record<string, number> = {}
      for (const { key, apiKey } of ORAL_SCORES) {
        const val = form[key]
        if (apiKey && val !== '' && !isNaN(Number(val))) {
          rubricPayload[apiKey] = Number(val)
        }
      }

      const result = await completeOralAssessment(selected.booking_id, {
        final_level: CEFR_MAP[form.final_level]?.cefr ?? form.final_level,
        ...(totalOralScore != null ? { oral_score: totalOralScore } : {}),
        ...(form.notes.trim() ? { instructor_notes: form.notes.trim() } : {}),
        ...rubricPayload,
      })
      toast.success('تم حفظ نتيجة التقييم بنجاح')
      const savedScore = result.oral_score ?? totalOralScore
      const savedLevel = result.final_level ?? (CEFR_MAP[form.final_level]?.cefr ?? form.final_level)
      const savedNotes = result.instructor_notes ?? (form.notes.trim() || null)
      const updated: PlacementStudentRow = {
        ...selected,
        oral_score: savedScore,
        final_level: savedLevel,
        notes: savedNotes,
        status: 'completed',
      }
      setStudents((prev) => prev.map((s) =>
        s.booking_id === selected.booking_id ? updated : s,
      ))
      setSelected(updated)
      void load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (import.meta.env.DEV) console.error('[placement-students] save failed:', err)
      const display =
        msg?.toLowerCase().includes('sql') || msg?.toLowerCase().includes('sqlstate')
          ? 'تعذّر حفظ الموعد. يرجى التحقق من إعدادات الخادم.'
          : (msg ?? 'تعذّر حفظ التقييم')
      toast.error(display)
    } finally {
      setSaving(false)
    }
  }

  function selectStudent(row: PlacementStudentRow) {
    setSelected(row)
    setActiveTab('summary')
    setMobileListOpen(false)
  }

  const stats = [
    { label: 'إجمالي الطلاب',   count: students.length,                                                 color: '#0077B6' },
    { label: 'اكتمل الاختبار',  count: students.filter((s) => s.status === 'written_submitted').length, color: '#f59e0b' },
    { label: 'المقابلة محجوزة', count: students.filter((s) => s.status === 'oral_booked').length,       color: '#7c3aed' },
    { label: 'مستوى معتمد',     count: students.filter((s) => s.status === 'completed').length,         color: '#10b981' },
  ]

  return (
    <div className="space-y-5 pb-16" dir="rtl">
      <InstructorHero
        title="لوحة تقييم تحديد المستوى"
        subtitle="الاختبار الكتابي · المقابلات الشفوية · التوصيات والتحليلات"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        onRefresh={load}
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'إجمالي الطلاب',    value: stats[0].count },
          { label: 'اكتمل الاختبار',   value: stats[1].count },
          { label: 'المقابلة محجوزة',  value: stats[2].count },
          { label: 'مستوى معتمد',      value: stats[3].count },
        ]}
      >
        <button
          type="button"
          onClick={() => setShowRef((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/70 transition hover:bg-white/20 hover:text-white"
        >
          <BookOpen className="h-3.5 w-3.5" />
          جدول المستويات
          <ChevronDown className={`h-3 w-3 transition-transform ${showRef ? 'rotate-180' : ''}`} />
        </button>
      </InstructorHero>

      <AnimatePresence>
        {showRef && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden print:hidden"
          >
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <p className="border-b border-slate-100 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-deepBlue/40">
                جدول المستويات (من أصل 70)
              </p>
              <div className="grid grid-cols-3 gap-px bg-slate-100 sm:grid-cols-6">
                {LEVEL_REF.map((r) => (
                  <div key={r.cefr} className="flex flex-col items-center gap-1 bg-white px-2 py-3 text-center">
                    <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${r.bg} ${r.text}`}>{r.cefr}</span>
                    <span className="font-mono text-[10px] font-black text-deepBlue/40">{r.range}</span>
                    <span className="text-[9px] font-semibold text-deepBlue/55">{r.arabic}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="h-[520px] animate-pulse rounded-[16px] bg-slate-100" />
          <div className="h-[520px] animate-pulse rounded-[16px] bg-slate-100" />
        </div>
      ) : noPlacementCourse ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 font-black text-deepBlue">هذه الدورة لا تتطلب اختبار تحديد مستوى</p>
          <p className="mt-1 text-[12px] font-semibold text-deepBlue/45">
            صفحات الاختبار والمقابلات الشفوية متاحة فقط للدورات التي تتطلب تحديد المستوى
          </p>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <User className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 font-black text-deepBlue">لا يوجد طلاب بعد</p>
          <p className="mt-1 text-[12px] font-semibold text-deepBlue/45">
            سيظهر الطلاب هنا بعد تقديم الاختبار الكتابي
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className={`print:hidden ${mobileListOpen ? 'block' : 'hidden lg:block'}`}>
            <PlacementStudentList
              students={students}
              selectedId={selected?.student_id ?? null}
              onSelect={selectStudent}
              search={listSearch}
              onSearchChange={setListSearch}
            />
          </div>

          <div className="min-w-0 space-y-3">
            <button
              type="button"
              onClick={() => setMobileListOpen((v) => !v)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-sm transition hover:border-[#0077B6]/30 lg:hidden"
            >
              <List className="h-4 w-4" />
              {mobileListOpen ? 'إخفاء قائمة الطلاب' : `اختيار طالب (${students.length})`}
            </button>

          {selected && courseId ? (
            <PlacementAssessmentDashboard
              row={selected}
              courseId={courseId}
              form={form}
              onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
              onSaveOral={() => void handleSaveOral()}
              saving={saving}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          ) : (
            <div className="flex min-h-[400px] items-center justify-center rounded-[16px] border border-dashed border-slate-200 bg-white">
              <p className="text-[13px] font-bold text-deepBlue/45">اختر طالباً من القائمة لعرض لوحة التقييم</p>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  )
}
