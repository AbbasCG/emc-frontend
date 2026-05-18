import type { WorkspaceDepartment } from '@/types/operations'

function finiteNum(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function pickStr(v: unknown): string {
  return v != null ? String(v).trim() : ''
}

function pickOptionalStr(v: unknown): string | undefined {
  const s = pickStr(v)
  return s || undefined
}

function normalizeDeptHealth(v: unknown): WorkspaceDepartment['status'] {
  const t = pickStr(v).toLowerCase()
  if (t === 'healthy' || t === 'attention' || t === 'risk') return t
  return 'attention'
}

/** Display name resilient to Laravel / inconsistent field naming. */
export function getDepartmentName(department: WorkspaceDepartment | null | undefined): string {
  if (!department) return 'إدارة غير مسماة'
  return (
    pickOptionalStr(department.name_ar) ??
    pickOptionalStr(department.name) ??
    pickOptionalStr(department.title) ??
    pickOptionalStr(department.department_name) ??
    pickOptionalStr(department.label) ??
    'إدارة غير مسماة'
  )
}

/** Normalize a workspace department payload from `/operations/departments`-style APIs. */
export function normalizeWorkspaceDepartment(raw: unknown): WorkspaceDepartment {
  const r =
    raw != null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}

  const idPiece = pickStr(r.id)
  const id =
    idPiece !== '' ?
      idPiece
    : `tmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  const name_ar = pickOptionalStr(r.name_ar)
  const name = pickOptionalStr(r.name)
  const department_name = pickOptionalStr(r.department_name)
  const label = pickOptionalStr(r.label)
  const titleRaw = pickOptionalStr(r.title)
  const titleResolved = titleRaw ?? name_ar ?? name ?? department_name ?? label ?? ''

  return {
    id,
    title: titleResolved,
    name_ar,
    name,
    department_name,
    label,
    description: pickOptionalStr(r.description),
    leader_name: r.leader_name != null && `${r.leader_name}`.trim() !== '' ? pickStr(r.leader_name) : null,
    members_count: finiteNum(r.members_count, 0),
    open_tasks: finiteNum(r.open_tasks, 0),
    meetings_week: r.meetings_week != null ? finiteNum(r.meetings_week, 0) : undefined,
    status: normalizeDeptHealth(r.status),
    health_score: typeof r.health_score === 'number' && !Number.isNaN(r.health_score) ? r.health_score : undefined,
  }
}
