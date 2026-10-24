import type { TicketSortKey } from '@/types/ticketOps'

/** Which columns the work-queue table shows, remembered per browser. Presentation only. */
export type ColumnKey = 'category' | 'priority' | 'status' | 'department' | 'assignee' | 'reporter' | 'created' | 'activity' | 'deadline'

export interface ColumnDef {
  key: ColumnKey
  label: string
  sort?: TicketSortKey
}

export const COLUMNS: ColumnDef[] = [
  { key: 'category', label: 'النوع' },
  { key: 'priority', label: 'الأولوية', sort: 'priority' },
  { key: 'status', label: 'الحالة', sort: 'status' },
  { key: 'department', label: 'الإدارة' },
  { key: 'assignee', label: 'المكلف' },
  { key: 'reporter', label: 'المُبلِّغ' },
  { key: 'created', label: 'الإنشاء', sort: 'created_at' },
  { key: 'activity', label: 'آخر نشاط', sort: 'last_activity' },
  { key: 'deadline', label: 'الموعد المتوقع', sort: 'due' },
]

export const DEFAULT_COLUMNS: ColumnKey[] = ['priority', 'status', 'department', 'assignee', 'deadline']
const COLUMN_STORAGE_KEY = 'emc.tickets.columns.v1'

export function loadColumns(): ColumnKey[] {
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMN_STORAGE_KEY) ?? 'null') as unknown
    if (Array.isArray(raw)) {
      const valid = raw.filter((k): k is ColumnKey => COLUMNS.some((c) => c.key === k))

      return valid.length > 0 ? valid : DEFAULT_COLUMNS
    }
  } catch {
    /* unreadable preference: fall back to the defaults */
  }

  return DEFAULT_COLUMNS
}

export function saveColumns(cols: ColumnKey[]) {
  try {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(cols))
  } catch {
    /* the choice still applies for this session */
  }
}

