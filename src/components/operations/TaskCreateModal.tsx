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
import { createAdvancedBoardTask } from '@/api/operationsBoardApi'
import type { DepartmentMember } from '@/api/operationsReportsApi'
import { serverTaskPriority } from '@/api/normalizers/opsTask'
import { taskApiMessage } from '@/api/taskErrors'
import {
  fetchEditableTask,
  fetchTaskScopeDepartments,
  fetchTaskScopeMembers,
  updateTaskFields,
  type TaskEditPayload,
  type TaskScopeDepartment,
} from '@/api/taskScopeApi'
import { CenteredModal } from '@/components/ui/CenteredModal'
import {
  EstimatePointsDuration,
  EstimateScopeCard,
  EstimateScopeSelect,
} from '@/components/operations/TaskEstimateFields'
import {
  estimateFromRecord,
  hasEstimateErrors,
  taskFormEstimate,
  toEstimatePayload,
  validateEstimate,
  mapEstimateServerErrors,
  type EstimateErrors,
} from '@/lib/taskEstimate'
import type { TaskPriority } from '@/types/operations'

type Props = {
  open: boolean
  onClose: () => void
  /** After a create AND after an edit was saved: the caller re-reads whatever shows the task. */
  onCreated: () => void
  defaultDepartmentId?: number
  /**
   * May the viewer put the task on someone (tasks.assign, as the server told the board)? False hides every assignee control and
   * nothing about an assignee is ever sent: such a viewer may create / edit a task, never assign it.
   */
  canAssign?: boolean
  /** Set: the SAME form edits this task (pre-filled from the server, saved with PATCH) instead of creating one. */
  editTaskId?: number | null
}

const priorityFromServer = (p: string): TaskPriority => (p === 'urgent' || p === 'critical' ? 'critical' : p === 'low' || p === 'high' ? p : 'medium')

/** The date and the time of day exactly as the server wrote them (its own timezone), never shifted through the browser's. */
function dueParts(dueDate: string | null, dueDatetime: string | null): { date: string; time: string } {
  const date = dueDate?.slice(0, 10) ?? dueDatetime?.slice(0, 10) ?? ''
  const t = dueDatetime ? /[T ](\d{2}):(\d{2})/.exec(dueDatetime) : null

  return { date, time: date && t ? `${t[1]}:${t[2]}` : '17:00' }
}

export default function TaskCreateModal({ open, onClose, onCreated, defaultDepartmentId, canAssign = false, editTaskId = null }: Props) {
  const isEdit = editTaskId !== null

  // What the server lets this viewer write to: all active departments for a global actor, only the led ones otherwise.
  const [departments, setDepartments] = useState<TaskScopeDepartment[]>([])
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false)
  // True for an actor limited to the departments they lead (the server then REQUIRES a department); false for a global one.
  const [scopeLimited, setScopeLimited] = useState(false)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [departmentId, setDepartmentId] = useState<string>(
    defaultDepartmentId ? String(defaultDepartmentId) : ''
  )
  const [members, setMembers] = useState<DepartmentMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)

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
  // The server's reason, where the user is looking (a toast alone is easy to miss).
  const [formError, setFormError] = useState<string | null>(null)

  // Edit mode: the task as the server sent it to pre-fill the form, and a way to tell whether anything changed.
  const [original, setOriginal] = useState<{
    assignee: { id: number; name: string } | null
    departmentId: number | null
    baseline: string
    /** The estimate as loaded: only a changed estimate is validated and sent (a legacy task has none, and a title fix must still save). */
    estimate: string
    dueDate: string
    dueTime: string
    hadDatetime: boolean
  } | null>(null)
  // A task that had only a date gets a time of day only when the editor chose one (the field's 17:00 is a default, not data).
  const [dueTimeTouched, setDueTimeTouched] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Without permission to assign, a new task can only go to its department (nobody is named); an edit keeps its assignee.
  const mode: 'single' | 'collective' | 'department' = isEdit ? 'single' : canAssign ? assignmentMode : 'department'

  // Load the departments this viewer may write to.
  useEffect(() => {
    if (!open) return
    let live = true
    fetchTaskScopeDepartments()
      .then((r) => {
        if (!live) return
        setDepartments(r.items)
        setDepartmentsError(null)
        setDepartmentsLoaded(true)
        setScopeLimited(r.manageableDepartmentIds !== null)
        // Exactly one choice is the choice (an edit already carries its own department).
        if (!isEdit) setDepartmentId((cur) => (cur !== '' ? cur : r.items.length === 1 ? String(r.items[0].id) : ''))
      })
      .catch((err: unknown) => {
        if (!live) return
        setDepartments([])
        setDepartmentsLoaded(true)
        setDepartmentsError(taskApiMessage(err, 'تعذّر تحميل الإدارات المتاحة لك.'))
      })

    return () => {
      live = false
    }
  }, [open, isEdit])

  // Load the members of the selected department (only the people who may assign need them).
  useEffect(() => {
    if (!open || !canAssign || !departmentId) return
    let live = true
    // The previous department's members are never offered for this one while its own are on the way.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before the members request starts, whenever the department changes
    setMembers([])
    setMembersError(null)
    setLoadingMembers(true)
    fetchTaskScopeMembers(Number(departmentId))
      .then((m) => {
        if (!live) return
        setMembers(m)
        setMembersError(null)
        setLoadingMembers(false)
      })
      .catch((err: unknown) => {
        if (!live) return
        setMembers([])
        setMembersError(taskApiMessage(err, 'تعذّر تحميل أعضاء الإدارة.'))
        setLoadingMembers(false)
      })

    return () => {
      live = false
    }
  }, [open, canAssign, departmentId])

  // Edit: pre-fill from what the server says this viewer may edit (a task is not readable through the management endpoint for everybody).
  useEffect(() => {
    if (!open || editTaskId === null) return
    let live = true
    fetchEditableTask(editTaskId)
      .then((t) => {
        if (!live) return
        if (!t.capabilities.can_edit) {
          setLoadError('لا تملك صلاحية تعديل هذه المهمة (قد تكون مقفلة أو خارج الإدارات التي تقودها).')
          return
        }
        const est = estimateFromRecord({ task_scope: t.task_scope, task_points: t.points, estimated_hours: t.estimated_hours })
        const due = dueParts(t.due_date, t.due_datetime)
        const dept = t.department_id === null ? '' : String(t.department_id)
        const assignee = t.assigned_to === null ? '' : String(t.assigned_to.id)
        const prio = priorityFromServer(t.priority)
        setTitle(t.title)
        setDescription(t.description ?? '')
        setNotes(t.notes ?? '')
        setNotesVisible(t.notes !== null)
        setPriority(prio)
        setEstimate(est)
        setDueDate(due.date)
        setDueTime(due.time)
        setDepartmentId(dept)
        setAssignedTo(assignee)
        setLoadError(null)
        setDueTimeTouched(false)
        setOriginal({
          assignee: t.assigned_to,
          departmentId: t.department_id,
          baseline: JSON.stringify([t.title, t.description ?? '', t.notes ?? '', prio, est, due.date, due.time, dept, assignee]),
          estimate: JSON.stringify(est),
          dueDate: due.date,
          dueTime: due.time,
          hadDatetime: t.due_datetime !== null,
        })
      })
      .catch((err: unknown) => {
        if (live) setLoadError(taskApiMessage(err, 'تعذّر تحميل بيانات المهمة.'))
      })

    return () => {
      live = false
    }
  }, [open, editTaskId])

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
    setDepartmentId(defaultDepartmentId ? String(defaultDepartmentId) : '')
    setDueTimeTouched(false)
    setFormError(null)
    setOriginal(null)
    setLoadError(null)
  }

  // Closing the window (by any route) throws the draft away, so the next opening never shows the previous one.
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (!open) resetForm()
  }

  const current = JSON.stringify([title, description, notes, priority, estimate, dueDate, dueTime, departmentId, assignedTo])
  const dirty = isEdit
    ? original !== null && current !== original.baseline
    : title.trim() !== '' || description.trim() !== '' || notes.trim() !== '' || attachments.length > 0 || selectedMembers.length > 0
  const loadingTask = isEdit && original === null && loadError === null

  const shownMembers = departmentId ? members : []
  // Loading only matters while there is a department whose members are being read.
  const membersLoading = loadingMembers && canAssign && departmentId !== ''

  const handleDepartmentChange = (value: string) => {
    setDepartmentId(value)
    // The members chosen belong to the previous department; «no change» is the only safe state for an edit's assignee.
    setAssignedTo('')
    setSelectedMembers([])
  }

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

  const failWith = (err: unknown, fallback: string) => {
    const serverErrors = mapEstimateServerErrors(err)
    const message = taskApiMessage(err, fallback)
    if (hasEstimateErrors(serverErrors)) setEstimateErrors(serverErrors)
    else setFormError(message)
    toast.error(message)
  }

  const handleEditSubmit = async () => {
    if (editTaskId === null || original === null) return

    // The estimate is validated and sent only when the editor touched it: a task from before the estimate existed has none, and
    // fixing its title must still save. A touched estimate is never half-filled.
    const estimateTouched = JSON.stringify(estimate) !== original.estimate
    if (estimateTouched) {
      const found = validateEstimate(estimate, { required: false })
      setEstimateErrors(found)
      if (hasEstimateErrors(found)) {
        toast.error(found.task_points ?? found.task_scope ?? found.estimated_hours ?? 'راجع النقاط والمدة')
        return
      }
    } else {
      setEstimateErrors({})
    }

    // due_datetime: sent when the task already had one and the date or time changed, or when the editor chose a time for a task that
    // had only a date. Never invented (the time field's 17:00 default is not data).
    const dueChanged = dueDate !== original.dueDate || dueTime !== original.dueTime
    const sendDatetime = dueDate !== '' && (original.hadDatetime ? dueChanged : dueTimeTouched)

    const body: TaskEditPayload = {
      title: title.trim(),
      description: description.trim() === '' ? null : description,
      notes: notes.trim() === '' ? null : notes,
      priority: serverTaskPriority(priority),
      due_date: dueDate || null,
    }
    if (dueDate === '') body.due_datetime = null
    else if (sendDatetime) body.due_datetime = `${dueDate} ${dueTime ? `${dueTime}:00` : '23:59:00'}`
    if (departmentId !== '') {
      body.department_id = Number(departmentId)
      // A section belongs to ONE department: moving the task drops it (the server refuses a section of another department).
      if (Number(departmentId) !== original.departmentId) body.section_id = null
    }
    if (estimateTouched && estimate.scope !== '') {
      const payload = toEstimatePayload(estimate, { clearHours: true })
      body.task_scope = payload.task_scope
      body.points = payload.task_points
      body.estimated_hours = payload.estimated_hours ?? null
    }
    // Only an assignee that really changed is sent, and only by someone who may assign (tasks.assign).
    if (canAssign && assignedTo !== '' && Number(assignedTo) !== original.assignee?.id) body.assigned_to = Number(assignedTo)

    setSubmitting(true)
    setFormError(null)
    try {
      await updateTaskFields(editTaskId, body)
      toast.success('تم حفظ تعديلات المهمة')
      onCreated()
      onClose()
    } catch (err: unknown) {
      failWith(err, 'تعذّر حفظ تعديلات المهمة')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('يرجى كتابة عنوان المهمة')
      return
    }

    if (isEdit) {
      await handleEditSubmit()
      return
    }

    // A new task must belong to a department when nobody is named (otherwise nobody would ever find it), and always for a leader
    // (the server refuses a task outside the departments they lead). Several departments offer no default: the choice is made.
    const namesAssignee = canAssign && ((mode === 'single' && assignedTo !== '') || (mode === 'collective' && selectedMembers.length > 0))
    if (departments.length > 0 && departmentId === '' && (scopeLimited || !namesAssignee)) {
      toast.error('اختر الإدارة التي تنتمي إليها المهمة')
      return
    }

    // Points / duration validation (the same rules the server applies)
    const found = validateEstimate(estimate, { required: true })
    setEstimateErrors(found)
    if (hasEstimateErrors(found)) {
      toast.error(found.task_points ?? found.task_scope ?? found.estimated_hours ?? 'راجع النقاط والمدة')
      return
    }

    if (mode === 'collective' && selectedMembers.length === 0) {
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

    // Assignment handling: only someone who may assign ever names an assignee (the server would refuse the whole request).
    if (canAssign && mode === 'single' && assignedTo) {
      formData.append('assigned_to', assignedTo)
    } else if (canAssign && mode === 'collective') {
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
      setFormError(null)
      await createAdvancedBoardTask(formData)
      toast.success(
        mode === 'collective'
          ? `تم إنشاء وإسناد المهمة الجماعية إلى ${selectedMembers.length} أعضاء بنجاح`
          : mode === 'single' && assignedTo
            ? 'تم إسناد المهمة بنجاح'
            : 'تم إنشاء المهمة بنجاح'
      )
      resetForm()
      onCreated()
      onClose()
    } catch (err: unknown) {
      failWith(err, 'تعذر حفظ المهمة')
    } finally {
      setSubmitting(false)
    }
  }

  // Get user's local timezone name
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const selectedDepartmentKnown = departmentId === '' || departments.some((d) => String(d.id) === departmentId)
  const onlyChoiceSelected = departments.length === 1 && departmentId === String(departments[0].id)
  const memberOptions: Array<{ id: number; label: string }> = shownMembers.map((m) => ({ id: m.user_id ?? m.id, label: `${m.name} (${m.role ?? 'عضو'})` }))
  // The current assignee stays a choice even when the roster no longer lists them (never silently «no one»).
  if (isEdit && original?.assignee && !memberOptions.some((o) => o.id === original.assignee!.id)) memberOptions.unshift({ id: original.assignee.id, label: original.assignee.name })

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
            {isEdit ? 'تعديل المهمة' : 'إسناد مهمة جديدة'}
          </span>
          <span className="mt-1.5 block text-lg font-black text-deepBlue">{isEdit ? 'تعديل بيانات المهمة' : 'بيانات المهمة الشاملة'}</span>
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
            disabled={submitting || (isEdit && original === null)}
            className="flex items-center gap-2 rounded-xl bg-deepBlue px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-deepBlue/90 disabled:opacity-50"
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>{submitting ? 'جاري الإرسال...' : isEdit ? 'حفظ التعديلات' : mode === 'department' && !canAssign ? 'إنشاء المهمة الآن' : 'إسناد المهمة الآن'}</span>
          </button>
        </div>
      )}
    >
      {loadingTask ? <p className="py-8 text-center text-xs font-bold text-slate-400" data-testid="task-edit-loading">جارٍ تحميل بيانات المهمة…</p> : null}
      {isEdit && loadError ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700" data-testid="task-edit-load-error">
          {loadError}
        </p>
      ) : null}
      {loadingTask || (isEdit && loadError) ? null : (
          <form id="task-create-form" onSubmit={handleSubmit} noValidate className="space-y-5 text-right">
            {formError ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700" data-testid="task-form-error">
                {formError}
              </p>
            ) : null}

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
                <span className="text-xs font-black text-deepBlue">{canAssign ? 'جهة التكليف بالمهمة' : 'الإدارة'}</span>
                {canAssign && !isEdit ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAssignmentMode('single')}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                        mode === 'single'
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
                        mode === 'collective'
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
                        mode === 'department'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      للإدارة (بلا عضو محدد)
                    </button>
                  </div>
                ) : null}
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
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue"
                  >
                    {onlyChoiceSelected ? null : <option value="">-- اختر الإدارة --</option>}
                    {selectedDepartmentKnown ? null : <option value={departmentId}>الإدارة الحالية للمهمة</option>}
                    {departments.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name_ar ?? d.name}
                      </option>
                    ))}
                  </select>
                  {departmentsError ? (
                    <p role="alert" className="mt-1 text-[11px] font-bold text-rose-600" data-testid="task-departments-error">{departmentsError}</p>
                  ) : departmentsLoaded && departments.length === 0 ? (
                    <p className="mt-1 text-[11px] font-bold text-amber-700" data-testid="task-departments-empty">لا توجد إدارات يمكنك كتابة مهام فيها.</p>
                  ) : null}
                </div>

                {canAssign && mode === 'single' && (
                  <div>
                    <label htmlFor="task-assignee" className="block text-[11px] font-bold text-slate-500 mb-1">
                      العضو المكلف
                    </label>
                    <select
                      id="task-assignee"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      disabled={membersLoading}
                      aria-busy={membersLoading}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue disabled:opacity-60"
                    >
                      <option value="">{membersLoading ? 'جارٍ تحميل الأعضاء…' : isEdit ? '-- بدون تغيير المكلف --' : '-- اختر العضو المكلف --'}</option>
                      {memberOptions.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {membersError ? <p role="alert" className="mt-1 text-[11px] font-bold text-rose-600" data-testid="task-members-error">{membersError}</p> : null}
                  </div>
                )}
              </div>

              {!canAssign ? (
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-[11px] font-bold text-slate-600" data-testid="no-assign-note">
                  <Info size={16} className="shrink-0" />
                  <span>
                    {isEdit
                      ? `${original?.assignee ? `المكلّف الحالي: ${original.assignee.name}. ` : ''}يمكنك تعديل المهمة دون تغيير المكلّف؛ إسناد المهام وإعادة إسنادها يتطلب صلاحية «إسناد المهام وإعادة إسنادها».`
                      : 'يمكنك إنشاء المهمة دون إسنادها لعضو بعينه، فتبقى لمدير الإدارة ليسندها؛ إسناد المهام لأعضاء يتطلب صلاحية «إسناد المهام وإعادة إسنادها».'}
                  </span>
                </div>
              ) : null}

              {/* اختيار جماعي لأكثر من عضو */}
              {canAssign && mode === 'collective' && (
                <div className="space-y-2 border-t border-slate-200/60 pt-3">
                  <p className="text-[11px] font-bold text-slate-600">
                    حدد الأعضاء المستلمين للمهمة الجماعية (ستُنشأ نسخة لكل عضو):
                  </p>
                  {membersLoading ? (
                    <p className="text-xs text-slate-400">جاري تحميل أعضاء الإدارة...</p>
                  ) : membersError ? (
                    <p role="alert" className="text-xs font-bold text-rose-600" data-testid="task-members-error">{membersError}</p>
                  ) : shownMembers.length === 0 ? (
                    <p className="text-xs text-amber-600">لا يوجد أعضاء في هذه الإدارة حالياً.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                      {shownMembers.map((m) => {
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

              {canAssign && mode === 'department' && (
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
                    onChange={(e) => {
                      setDueTime(e.target.value)
                      setDueTimeTouched(true)
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue"
                  />
                </div>
              </div>
            </div>

            {/* إرفاق ملفات (عند الإنشاء فقط: التعديل لا يحمل مرفقات) */}
            {isEdit ? null : (
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
            )}

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
      )}
    </CenteredModal>
  )
}
