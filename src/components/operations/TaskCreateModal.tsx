import { useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Calendar,
  Clock,
  FileUp,
  Globe,
  Info,
  Layers,
  Paperclip,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createAdvancedBoardTask } from '@/api/operationsBoardApi'
import { fetchWorkspaceDepartments } from '@/api/operationsApi'
import { fetchDepartmentMembers, type DepartmentMember } from '@/api/operationsReportsApi'
import type { TaskPriority, TaskScope, WorkspaceDepartment } from '@/types/operations'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => void
  defaultDepartmentId?: number
}

// مصفوفة حجم المهام والنقاط والأمثلة التوضيحية
export const TASK_SCOPE_RULES: Record<
  TaskScope,
  { label: string; min: number; max: number; desc: string; examples: string }
> = {
  simple: {
    label: 'مهمة بسيطة',
    min: 25,
    max: 50,
    desc: 'إنجاز مهمة تشغيلية روتينية سريعة، لا تحتاج اعتماد الموارد البشرية.',
    examples: 'تصميم بسيط، نشر منشور، إدخال بيانات، تنسيق ملف، متابعة محدودة.',
  },
  medium: {
    label: 'مهمة متوسطة',
    min: 75,
    max: 150,
    desc: 'تتطلب تنسيقاً أو جهداً لعدة أيام، تحتاج اعتماد مدير الإدارة ثم الموارد البشرية.',
    examples: 'إدارة لقاء، إعداد تقرير، تنسيق مدرب، متابعة مجموعة، تصميم حملة محدودة.',
  },
  large: {
    label: 'مهمة كبيرة',
    min: 200,
    max: 300,
    desc: 'قيادة أو بناء عمل رئيسي واسع النطاق، تحتاج اعتماد الموارد البشرية.',
    examples: 'قيادة نشاط، إدارة حملة شاملة، إعداد برنامج، بناء نظام داخلي، حل مشكلة تشغيلية مؤثرة.',
  },
  strategic: {
    label: 'مهمة استراتيجية أو عالية الأثر',
    min: 300,
    max: 500,
    desc: 'مبادرة مؤسسية فارقة ذات أثر مباشر على أهداف المركز، ونقاط مفتوحة للأثر الاستثنائي.',
    examples: 'مبادرة مؤسسية، تطوير عملية محورية، مشروع كبير متعدد الأطراف، أثر استثنائي غير محدود.',
  },
}

export default function TaskCreateModal({ open, onClose, onCreated, defaultDepartmentId }: Props) {
  const [departments, setDepartments] = useState<WorkspaceDepartment[]>([])
  const [departmentId, setDepartmentId] = useState<string>(
    defaultDepartmentId ? String(defaultDepartmentId) : ''
  )
  const [members, setMembers] = useState<DepartmentMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [taskScope, setTaskScope] = useState<TaskScope>('simple')
  const [points, setPoints] = useState<number>(25)
  const [exceptionalPoints, setExceptionalPoints] = useState(false)
  const [estimatedHours, setEstimatedHours] = useState<string>('2')
  const [timeUnit, setTimeUnit] = useState<'hours' | 'minutes'>('hours')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('17:00')
  const [notesVisible, setNotesVisible] = useState(false)

  // Assignment type: single, collective (multiple members), or department unassigned
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'collective' | 'department'>(
    'single'
  )
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])

  // Files
  const [attachments, setAttachments] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Load departments
  useEffect(() => {
    if (open) {
      fetchWorkspaceDepartments()
        .then((r) => {
          setDepartments(r.items)
          if (!departmentId && r.items.length > 0) {
            setDepartmentId(r.items[0].id)
          }
        })
        .catch(() => {})
    }
  }, [open])

  // Load members of selected department
  useEffect(() => {
    if (departmentId) {
      setLoadingMembers(true)
      fetchDepartmentMembers(Number(departmentId))
        .then((m) => {
          setMembers(m)
          setLoadingMembers(false)
        })
        .catch(() => {
          setMembers([])
          setLoadingMembers(false)
        })
    }
  }, [departmentId])

  // Sync points default when scope changes
  useEffect(() => {
    const rule = TASK_SCOPE_RULES[taskScope]
    if (!exceptionalPoints) {
      setPoints(rule.min)
    }
  }, [taskScope, exceptionalPoints])

  if (!open) return null

  const scopeRule = TASK_SCOPE_RULES[taskScope]

  const handleMemberToggle = (id: number) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((m) => m !== id))
    } else {
      setSelectedMembers([...selectedMembers, id])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)])
    }
  }

  const handleRemoveFile = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('يرجى كتابة عنوان المهمة')
      return
    }

    // Points validation
    if (!exceptionalPoints) {
      if (points < scopeRule.min || (taskScope !== 'strategic' && points > scopeRule.max)) {
        toast.error(`النقاط لهذا الحجم يجب أن تكون بين ${scopeRule.min} و ${scopeRule.max} نقطة`)
        return
      }
    } else if (points < 300) {
      toast.error('النقاط الاستثنائية تبدأ من 300 نقطة فما فوق')
      return
    }

    if (assignmentMode === 'collective' && selectedMembers.length === 0) {
      toast.error('يرجى اختيار عضو واحد على الأقل للمهمة الجماعية')
      return
    }

    const calculatedHours =
      timeUnit === 'minutes' ? (parseFloat(estimatedHours || '0') / 60).toFixed(2) : estimatedHours

    const formData = new FormData()
    formData.append('title', title)
    if (description) formData.append('description', description)
    if (notes) formData.append('notes', notes)
    if (departmentId) formData.append('department_id', departmentId)
    formData.append('priority', priority)
    formData.append('task_scope', taskScope)
    formData.append('points', String(points))
    if (calculatedHours) formData.append('estimated_hours', String(calculatedHours))

    // Due datetime & date
    if (dueDate) {
      const fullDateTime = dueTime ? `${dueDate} ${dueTime}:00` : `${dueDate} 23:59:00`
      formData.append('due_date', dueDate)
      formData.append('due_datetime', fullDateTime)
    }

    // Assignment handling
    if (assignmentMode === 'single' && assignedTo) {
      formData.append('assigned_to', assignedTo)
    } else if (assignmentMode === 'collective') {
      selectedMembers.forEach((id) => formData.append('assigned_users[]', String(id)))
      if (selectedMembers.length > 0) {
        formData.append('assigned_to', String(selectedMembers[0]))
      }
    }
    // If department mode: assigned_to stays empty (unassigned to a specific member)

    // Attachments
    attachments.forEach((file) => {
      formData.append('attachments[]', file)
    })

    try {
      setSubmitting(true)
      await createAdvancedBoardTask(formData)
      toast.success(
        assignmentMode === 'collective'
          ? `تم إنشاء وإسناد المهمة الجماعية إلى ${selectedMembers.length} أعضاء بنجاح`
          : 'تم إسناد المهمة بنجاح'
      )
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'تعذر حفظ المهمة')
    } finally {
      setSubmitting(false)
    }
  }

  // Get user's local timezone name
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-deepBlue/10"
          dir="rtl"
        >
          <header className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-customBlue/10 px-2.5 py-1 text-[11px] font-black text-customBlue">
                <Sparkles size={13} />
                إسناد مهمة جديدة
              </span>
              <h2 className="mt-1.5 text-lg font-black text-deepBlue">بيانات المهمة الشاملة</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-deepBlue"
            >
              <X size={20} />
            </button>
          </header>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5 text-right">
            {/* عنوان المهمة */}
            <div>
              <label className="block text-xs font-black text-deepBlue mb-1.5">
                عنوان المهمة <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: تصميم منشور إعلان ورشة الذكاء الاصطناعي"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-deepBlue placeholder:text-slate-400 focus:border-customBlue focus:ring-1 focus:ring-customBlue"
              />
            </div>

            {/* تفاصيل المهمة */}
            <div>
              <label className="block text-xs font-black text-deepBlue mb-1.5">
                التفاصيل والمخرجات المطلوبة
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب تفاصيل واضحة ودقيقة عن المخرجات المتوقعة وكيفية تسليمها..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-deepBlue placeholder:text-slate-400 focus:border-customBlue focus:ring-1 focus:ring-customBlue"
              />
            </div>

            {/* نطاق الإسناد */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-deepBlue">جهة التكليف بالمهمة</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('single')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                      assignmentMode === 'single'
                        ? 'bg-deepBlue text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    عضو محدد
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('collective')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition flex items-center gap-1 ${
                      assignmentMode === 'collective'
                        ? 'bg-customBlue text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Users size={12} />
                    مهمة جماعية (أكثر من عضو)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('department')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                      assignmentMode === 'department'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    للإدارة (بلا عضو محدد)
                  </button>
                </div>
              </div>

              {/* اختيار الإدارة */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    الإدارة التابعة
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title ?? d.name_ar ?? d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {assignmentMode === 'single' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      العضو المكلف
                    </label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue"
                    >
                      <option value="">-- اختر العضو المكلف --</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.name} ({m.role ?? 'عضو'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* اختيار جماعي لأكثر من عضو */}
              {assignmentMode === 'collective' && (
                <div className="space-y-2 border-t border-slate-200/60 pt-3">
                  <p className="text-[11px] font-bold text-slate-600">
                    حدد الأعضاء المستلمين للمهمة الجماعية (ستُنشأ نسخة لكل عضو):
                  </p>
                  {loadingMembers ? (
                    <p className="text-xs text-slate-400">جاري تحميل أعضاء الإدارة...</p>
                  ) : members.length === 0 ? (
                    <p className="text-xs text-amber-600">لا يوجد أعضاء في هذه الإدارة حالياً.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                      {members.map((m) => {
                        const isSelected = selectedMembers.includes(m.user_id)
                        return (
                          <button
                            key={m.user_id}
                            type="button"
                            onClick={() => handleMemberToggle(m.user_id)}
                            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                              isSelected
                                ? 'border-customBlue bg-customBlue text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-customBlue/40'
                            }`}
                          >
                            <span>{m.name}</span>
                            <span className="text-[10px] opacity-80">({m.job_title ?? 'عضو'})</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {selectedMembers.length > 0 && (
                    <p className="text-[11px] font-black text-customBlue">
                      تم اختيار: {selectedMembers.length} أعضاء
                    </p>
                  )}
                </div>
              )}

              {assignmentMode === 'department' && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-[11px] font-bold text-amber-800">
                  <Info size={16} className="shrink-0" />
                  <span>
                    ستظهر المهمة لمدير الإدارة في قائمة "مهام الإدارة غير المسندة"، ليتمكن من
                    استلامها بنفسه أو توجيهها لأحد أعضاء فريقه.
                  </span>
                </div>
              )}
            </div>

            {/* الأولوية وحجم المهمة */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-black text-deepBlue mb-1.5">الأولوية</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue"
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="critical">حرجة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-deepBlue mb-1.5">حجم المهمة</label>
                <select
                  value={taskScope}
                  onChange={(e) => setTaskScope(e.target.value as TaskScope)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue"
                >
                  <option value="simple">مهمة بسيطة (25 - 50 نقطة)</option>
                  <option value="medium">مهمة متوسطة (75 - 150 نقطة)</option>
                  <option value="large">مهمة كبيرة (200 - 300 نقطة)</option>
                  <option value="strategic">استراتيجية أو عالية الأثر (300 - 500 أو مفتوح)</option>
                </select>
              </div>
            </div>

            {/* بطاقة توضيحية لنوع المهمة والنقاط المقيدة */}
            <div className="rounded-2xl border border-customBlue/20 bg-customBlue/[0.03] p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-customBlue">{scopeRule.label}</span>
                <span className="rounded-lg bg-customBlue/10 px-2 py-0.5 text-[11px] font-black text-customBlue">
                  النطاق المعتمد: {scopeRule.min} - {scopeRule.max} نقطة
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-600">{scopeRule.desc}</p>
              <p className="text-[10px] text-slate-500 font-medium">
                <span className="font-bold">أمثلة: </span>
                {scopeRule.examples}
              </p>
            </div>

            {/* النقاط والساعات التقريبية */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-deepBlue">
                    نقاط المهمة <span className="text-red-500">*</span>
                  </label>
                  {taskScope === 'strategic' && (
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exceptionalPoints}
                        onChange={(e) => setExceptionalPoints(e.target.checked)}
                        className="rounded text-purple-600"
                      />
                      أثر استثنائي (مفتوح)
                    </label>
                  )}
                </div>
                <input
                  type="number"
                  min={scopeRule.min}
                  max={exceptionalPoints ? undefined : scopeRule.max}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-black text-deepBlue focus:border-customBlue"
                />
                <span className="mt-1 block text-[10px] text-slate-400">
                  {exceptionalPoints
                    ? 'الحقل مفتوح لكمية نقاط غير محدودة للأثر الاستثنائي'
                    : `مقيدة آلياً بين ${scopeRule.min} و ${scopeRule.max} نقطة`}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-deepBlue">المدة التقريبية</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setTimeUnit('hours')}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                        timeUnit === 'hours'
                          ? 'bg-deepBlue text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      ساعات
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeUnit('minutes')}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-black ${
                        timeUnit === 'minutes'
                          ? 'bg-deepBlue text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      دقائق
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder={timeUnit === 'hours' ? 'مثال: 2.5' : 'مثال: 45'}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-black text-deepBlue focus:border-customBlue pl-10"
                  />
                  <Clock
                    size={15}
                    className="absolute left-3 top-2.5 text-slate-400 pointer-events-none"
                  />
                </div>
                <span className="mt-1 block text-[10px] text-slate-400">
                  تُضاف لرصيد المتطوع التراكمي لإصدار شهادة الساعات عند الإنجاز
                </span>
              </div>
            </div>

            {/* موعد التسليم مع مراعاة فارق التوقيت */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-deepBlue flex items-center gap-1.5">
                  <Calendar size={14} className="text-customBlue" />
                  موعد التسليم النهائي (تاريخ ووقت)
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                  <Globe size={12} className="text-customBlue" />
                  توقيت جهازك: <span className="text-deepBlue font-black">{localTz}</span>
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    الوقت (بتوقيت مكة UTC+3)
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue"
                  />
                </div>
              </div>
            </div>

            {/* إرفاق ملفات */}
            <div>
              <label className="block text-xs font-black text-deepBlue mb-1.5">
                إرفاق ملفات (تصاميم، وثائق، ملفات مرجعية)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-bold text-customBlue cursor-pointer hover:bg-slate-100 transition">
                  <FileUp size={16} />
                  <span>اختر ملفات للإرفاق</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-400">
                  {attachments.length > 0 ? `${attachments.length} ملفات محددة` : 'لا ملفات حتى الآن'}
                </span>
              </div>

              {attachments.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {attachments.map((f, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700"
                    >
                      <Paperclip size={12} className="text-slate-500" />
                      <span className="max-w-[150px] truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ملاحظات إضافية */}
            <div>
              <button
                type="button"
                onClick={() => setNotesVisible(!notesVisible)}
                className="text-xs font-bold text-customBlue hover:underline"
              >
                {notesVisible ? '- إخفاء الملاحظات الإضافية' : '+ إضافة ملاحظات خاصة'}
              </button>
              {notesVisible && (
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات توجيهية خاصة للعضو المكلف أو متابع المهمة..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-deepBlue placeholder:text-slate-400 focus:border-customBlue"
                />
              )}
            </div>

            {/* زر الحفظ والإرسال */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-deepBlue px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-deepBlue/90 disabled:opacity-50 transition"
              >
                <Sparkles size={14} />
                <span>{submitting ? 'جاري الإرسال...' : 'إسناد المهمة الآن'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

