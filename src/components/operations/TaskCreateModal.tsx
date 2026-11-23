import { useEffect, useState, type FormEvent } from 'react'
import {
  Calendar,
  FileUp,
  Globe,
  Info,
  Paperclip,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiMessageOr } from '@/api/apiErrors'
import { createAdvancedBoardTask } from '@/api/operationsBoardApi'
import { fetchWorkspaceDepartments } from '@/api/operationsApi'
import { fetchDepartmentMembers, type DepartmentMember } from '@/api/operationsReportsApi'
import { serverTaskPriority } from '@/api/normalizers/opsTask'
import { CenteredModal } from '@/components/ui/CenteredModal'
import {
  EstimatePointsDuration,
  EstimateScopeCard,
  EstimateScopeSelect,
} from '@/components/operations/TaskEstimateFields'
import {
  hasEstimateErrors,
  taskFormEstimate,
  toEstimatePayload,
  validateEstimate,
  mapEstimateServerErrors,
  type EstimateErrors,
} from '@/lib/taskEstimate'
import type { TaskPriority, WorkspaceDepartment } from '@/types/operations'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => void
  defaultDepartmentId?: number
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
  // Scope, points and duration: the shared estimate fields (same rules as the ticket flows).
  const [estimate, setEstimate] = useState(taskFormEstimate)
  const [estimateErrors, setEstimateErrors] = useState<EstimateErrors>({})
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before the members request starts, whenever the department changes
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

  /** Back to a blank form (after a successful save, and whenever the window is closed). */
  const resetForm = () => {
    setTitle('')
    setDescription('')
    setNotes('')
    setNotesVisible(false)
    setPriority('medium')
    setEstimate(taskFormEstimate())
    setEstimateErrors({})
    setDueDate('')
    setDueTime('17:00')
    setAssignmentMode('single')
    setAssignedTo('')
    setSelectedMembers([])
    setAttachments([])
  }

  // Closing the window (by any route) throws the draft away, so the next opening never shows the previous one.
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (!open) resetForm()
  }

  const dirty =
    title.trim() !== '' || description.trim() !== '' || notes.trim() !== '' || attachments.length > 0 || selectedMembers.length > 0

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

    // Points / duration validation (the same rules the server applies)
    const found = validateEstimate(estimate, { required: true })
    setEstimateErrors(found)
    if (hasEstimateErrors(found)) {
      toast.error(found.task_points ?? found.task_scope ?? found.estimated_hours ?? 'راجع النقاط والمدة')
      return
    }

    if (assignmentMode === 'collective' && selectedMembers.length === 0) {
      toast.error('يرجى اختيار عضو واحد على الأقل للمهمة الجماعية')
      return
    }

    const payload = toEstimatePayload(estimate)

    const formData = new FormData()
    formData.append('title', title)
    if (description) formData.append('description', description)
    if (notes) formData.append('notes', notes)
    if (departmentId) formData.append('department_id', departmentId)
    // The server's priority vocabulary is low / medium / high / urgent («حرجة» = urgent).
    formData.append('priority', serverTaskPriority(priority))
    formData.append('task_scope', payload.task_scope)
    formData.append('points', String(payload.task_points))
    // An emptied duration is simply not sent (undefined / null): never the text "undefined".
    if (payload.estimated_hours != null) formData.append('estimated_hours', String(payload.estimated_hours))

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
      resetForm()
      onCreated()
      onClose()
    } catch (err: unknown) {
      const serverErrors = mapEstimateServerErrors(err)
      if (hasEstimateErrors(serverErrors)) setEstimateErrors(serverErrors)
      toast.error(getApiMessageOr(err, 'تعذر حفظ المهمة'))
    } finally {
      setSubmitting(false)
    }
  }

  // Get user's local timezone name
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      size="md"
      testId="task-create-modal"
      dirty={dirty}
      busy={submitting}
      dirtyMessage="لديك بيانات مهمة لم تُحفظ. إن أغلقت النافذة الآن ستضيع."
      title={
        <span className="block">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-customBlue/10 px-2.5 py-1 text-[11px] font-black text-customBlue">
            <Sparkles size={13} aria-hidden="true" />
            إسناد مهمة جديدة
          </span>
          <span className="mt-1.5 block text-lg font-black text-deepBlue">بيانات المهمة الشاملة</span>
        </span>
      }
      footer={(requestClose) => (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={requestClose}
            disabled={submitting}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="task-create-form"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-deepBlue px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-deepBlue/90 disabled:opacity-50"
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>{submitting ? 'جاري الإرسال...' : 'إسناد المهمة الآن'}</span>
          </button>
        </div>
      )}
    >
          <form id="task-create-form" onSubmit={handleSubmit} noValidate className="space-y-5 text-right">
            {/* عنوان المهمة */}
            <div>
              <label htmlFor="task-title" className="block text-xs font-black text-deepBlue mb-1.5">
                عنوان المهمة <span className="text-red-500">*</span>
              </label>
              <input
                id="task-title"
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
              <label htmlFor="task-description" className="block text-xs font-black text-deepBlue mb-1.5">
                التفاصيل والمخرجات المطلوبة
              </label>
              <textarea
                id="task-description"
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
                  <label htmlFor="task-department" className="block text-[11px] font-bold text-slate-500 mb-1">
                    الإدارة التابعة
                  </label>
                  <select
                    id="task-department"
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
                    <label htmlFor="task-assignee" className="block text-[11px] font-bold text-slate-500 mb-1">
                      العضو المكلف
                    </label>
                    <select
                      id="task-assignee"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue"
                    >
                      <option value="">-- اختر العضو المكلف --</option>
                      {members.map((m) => {
                        const memberId = m.user_id ?? m.id
                        return (
                          <option key={memberId} value={memberId}>
                            {m.name} ({m.role ?? 'عضو'})
                          </option>
                        )
                      })}
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
                        const memberId = m.user_id ?? m.id
                        const isSelected = selectedMembers.includes(memberId)
                        return (
                          <button
                            key={memberId}
                            type="button"
                            onClick={() => handleMemberToggle(memberId)}
                            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                              isSelected
                                ? 'border-customBlue bg-customBlue text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-customBlue/40'
                            }`}
                          >
                            <span>{m.name}</span>
                            <span className="text-[10px] opacity-80">({m.job_title ?? m.role ?? 'عضو'})</span>
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
                <label htmlFor="task-priority" className="block text-xs font-black text-deepBlue mb-1.5">الأولوية</label>
                <select
                  id="task-priority"
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

              <EstimateScopeSelect
                value={estimate}
                onChange={setEstimate}
                errors={estimateErrors}
                idPrefix="task-form"
                autofillPoints
              />
            </div>

            {/* بطاقة توضيحية لنوع المهمة والنقاط المقيدة */}
            <EstimateScopeCard scope={estimate.scope} />

            {/* النقاط والساعات التقريبية */}
            <EstimatePointsDuration
              value={estimate}
              onChange={setEstimate}
              errors={estimateErrors}
              idPrefix="task-form"
              autofillPoints
            />

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
                  <label htmlFor="task-due-date" className="block text-[11px] font-bold text-slate-500 mb-1">التاريخ</label>
                  <input
                    id="task-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue"
                  />
                </div>
                <div>
                  <label htmlFor="task-due-time" className="block text-[11px] font-bold text-slate-500 mb-1">
                    الوقت (بتوقيت مكة UTC+3)
                  </label>
                  <input
                    id="task-due-time"
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
          </form>
    </CenteredModal>
  )
}
