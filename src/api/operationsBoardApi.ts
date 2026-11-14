import apiClient from './axios'
import { unwrapData } from './unwrap'

/**
 * لوحة التشغيل المرئية للجميع: كل الفريق يقرأ نفس اللوحة — من يعمل على ماذا،
 * حالة كل مهمة، والمُقفَل منها (المهمة المقفلة لا يعدلها أحد حتى تُفتح).
 */

export type BoardTask = {
  id: number
  parent_task_id?: number | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  task_scope?: 'simple' | 'medium' | 'large' | 'strategic' | null
  points?: number | null
  estimated_hours?: number | null
  status: string
  acceptance_status?: 'pending' | 'accepted' | 'rejected'
  rejection_reason?: string | null
  locked_at: string | null
  locked_by: number | null
  due_date: string | null
  due_datetime?: string | null
  notes?: string | null
  manager_approved_at?: string | null
  manager_approved_by?: number | null
  hr_approved_at?: string | null
  hr_approved_by?: number | null
  department?: { id: number; name: string } | null
  assigned_to?: { id: number; name: string } | null
  created_by?: { id: number; name: string } | null
  evaluation?: {
    id: number
    evaluator_id?: number | null
    delivered_on_time: number
    quality_of_outputs: number
    autonomy: number
    responsiveness: number
    collaboration?: number | null
    collaboration_na: boolean
    final_score?: number | null
    feedback?: string | null
  } | null
  attachments?: Array<{
    id: number
    file_name: string
    file_path: string
    file_size?: number | null
    mime_type?: string | null
  }> | null
}

export type BoardColumns = Record<string, BoardTask[]>

/** أعمدة اللوحة بالترتيب المعروض، بأسمائها العربية. */
export const BOARD_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'idea', label: 'أفكار' },
  { key: 'under_review', label: 'قيد المراجعة' },
  { key: 'planning', label: 'تخطيط' },
  { key: 'waiting_approval', label: 'بانتظار الاعتماد' },
  { key: 'in_progress', label: 'قيد التنفيذ' },
  { key: 'needs_evaluation', label: 'بحاجة لتقييم' },
  { key: 'completed', label: 'مكتملة' },
  { key: 'postponed', label: 'مؤجلة' },
  { key: 'cancelled', label: 'ملغاة' },
]

export async function fetchOperationsBoard(params?: {
  department_id?: number
  scope?: 'all' | 'mine'
  unassigned?: boolean
}): Promise<BoardColumns> {
  const res = await apiClient.get<unknown>('/operations/board', { params })
  return unwrapData<BoardColumns>(res.data) ?? {}
}

export async function fetchPendingAcceptanceTasks(): Promise<BoardTask[]> {
  const res = await apiClient.get<unknown>('/admin/tasks/pending-acceptance')
  return unwrapData<BoardTask[]>(res.data) ?? []
}

export async function fetchPendingEvaluationTasks(params?: { department_id?: number }): Promise<BoardTask[]> {
  const res = await apiClient.get<unknown>('/admin/tasks/pending-evaluation', { params })
  return unwrapData<BoardTask[]>(res.data) ?? []
}

export async function fetchPendingHrApprovalTasks(): Promise<BoardTask[]> {
  const res = await apiClient.get<unknown>('/admin/tasks/pending-hr-approval')
  return unwrapData<BoardTask[]>(res.data) ?? []
}

export async function fetchUnassignedDepartmentTasks(params?: { department_id?: number }): Promise<BoardTask[]> {
  const res = await apiClient.get<unknown>('/admin/tasks/unassigned-department', { params })
  return unwrapData<BoardTask[]>(res.data) ?? []
}

export type BoardTaskInput = {
  title: string
  description?: string
  department_id?: number
  assigned_to?: number
  assigned_users?: number[]
  priority: BoardTask['priority']
  task_scope?: 'simple' | 'medium' | 'large' | 'strategic'
  points?: number
  estimated_hours?: number
  status?: string
  due_date?: string
  due_datetime?: string
  notes?: string
}

/** تحريك الحالة */
export async function updateBoardTaskStatus(id: number, status: string): Promise<void> {
  await apiClient.patch(`/operations/board/tasks/${id}/status`, { status })
}

/** إنشاء مهمة متقدمة مع دعم المرفقات والإسناد الجماعي */
export async function createAdvancedBoardTask(formData: FormData): Promise<unknown> {
  const res = await apiClient.post('/admin/tasks', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return unwrapData(res.data)
}

/** قبول المهمة من قِبل العضو */
export async function acceptTask(id: number): Promise<void> {
  await apiClient.post(`/admin/tasks/${id}/accept`)
}

/** رفض المهمة مع ذكر السبب */
export async function rejectTask(id: number, reason: string): Promise<void> {
  await apiClient.post(`/admin/tasks/${id}/reject`, { reason })
}

/** تقييم المهمة وفق معايير ليكرت الخمسة */
export type TaskEvaluationPayload = {
  delivered_on_time: number
  quality_of_outputs: number
  autonomy: number
  responsiveness: number
  collaboration?: number | null
  collaboration_na?: boolean
  feedback?: string
}

export async function evaluateTask(id: number, payload: TaskEvaluationPayload): Promise<void> {
  await apiClient.post(`/admin/tasks/${id}/evaluate`, payload)
}

/** اعتماد الموارد البشرية النهائي */
export async function hrApproveTask(id: number): Promise<void> {
  await apiClient.post(`/admin/tasks/${id}/hr-approve`)
}

/** استلام المهمة غير المسندة */
export async function claimTask(id: number): Promise<void> {
  await apiClient.post(`/admin/tasks/${id}/claim`)
}

/** إعادة إسناد المهمة */
export async function reassignTask(id: number, assigned_to: number, notes?: string): Promise<void> {
  await apiClient.post(`/admin/tasks/${id}/reassign`, { assigned_to, notes })
}

/** إنشاء مهمة بسيطة */
export async function createBoardTask(input: BoardTaskInput): Promise<void> {
  await apiClient.post('/operations/board/tasks', input)
}

export async function lockTask(id: number): Promise<void> {
  await apiClient.post(`/operations/tasks/${id}/lock`)
}

export async function unlockTask(id: number): Promise<void> {
  await apiClient.post(`/operations/tasks/${id}/unlock`)
}
