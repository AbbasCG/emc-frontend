import apiClient from './axios'
import { unwrapData } from './unwrap'

/**
 * لوحة التشغيل المرئية للجميع: كل الفريق يقرأ نفس اللوحة — من يعمل على ماذا،
 * حالة كل مهمة، والمُقفَل منها (المهمة المقفلة لا يعدلها أحد حتى تُفتح).
 */

export type BoardTask = {
  id: number
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: string
  locked_at: string | null
  locked_by: number | null
  due_date: string | null
  department?: { id: number; name: string } | null
  assigned_to?: { id: number; name: string } | null
  created_by?: { id: number; name: string } | null
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

export async function fetchOperationsBoard(params?: { department_id?: number }): Promise<BoardColumns> {
  const res = await apiClient.get<unknown>('/operations/board', { params })
  return unwrapData<BoardColumns>(res.data) ?? {}
}

export async function lockTask(id: number): Promise<void> {
  await apiClient.post(`/operations/tasks/${id}/lock`)
}

export async function unlockTask(id: number): Promise<void> {
  await apiClient.post(`/operations/tasks/${id}/unlock`)
}
