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

/** Derived health status + human-readable reasons from real backend counters. */
export type DeptHealthResult = {
  status: WorkspaceDepartment['status']
  reasons: string[]
}

export function computeDeptHealth(d: WorkspaceDepartment): DeptHealthResult {
  const leaders = d.leaders_count ?? 0
  const members = d.members_count ?? 0
  const pending = d.pending_items_count ?? 0
  const volunteerReqs = d.volunteer_requests_count ?? 0
  const openTasks = d.open_tasks_count   // null = not connected

  // خطر — critical conditions
  const isCritical = (members === 0 && leaders === 0) || pending >= 10
  if (isCritical) {
    const reasons: string[] = []
    if (members === 0 && leaders === 0) reasons.push('لا يوجد قائد ولا أعضاء مرتبطون')
    if (pending >= 10) reasons.push(`${pending} بنود قيد الانتظار`)
    return { status: 'risk', reasons }
  }

  // سليم — everything in order
  const isHealthy =
    leaders > 0 && members > 0 && pending === 0 && volunteerReqs === 0
    && (openTasks === null || openTasks === 0)
  if (isHealthy) {
    return { status: 'healthy', reasons: ['جميع المؤشرات سليمة'] }
  }

  // انتباه — needs attention
  const reasons: string[] = []
  if (leaders === 0) reasons.push('لا يوجد قائد معيّن')
  if (members === 0) reasons.push('لا يوجد أعضاء مرتبطون')
  if (volunteerReqs > 0) reasons.push(`${volunteerReqs} طلب تطوع قيد المراجعة`)
  if (openTasks != null && openTasks > 0) reasons.push(`${openTasks} مهمة مفتوحة`)
  if (pending > 0) reasons.push(`${pending} بنود قيد الانتظار`)

  return { status: 'attention', reasons }
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

  // open_tasks_count: null means tasks system not connected; undefined/missing → null
  const rawOtc = r.open_tasks_count
  const open_tasks_count: number | null =
    rawOtc === null ? null
    : rawOtc !== undefined && Number.isFinite(Number(rawOtc)) ? Number(rawOtc)
    : null

  return {
    id,
    title: titleResolved,
    name_ar,
    name_en: pickOptionalStr(r.name_en),
    name,
    department_name,
    label,
    description: pickOptionalStr(r.description),
    // /operations/departments nests the leader as {id,name,email,role} (DepartmentResource);
    // fall back to a flat leader_name if some other caller ever sends that shape instead.
    leader_name: (() => {
      const nested = r.leader != null && typeof r.leader === 'object' ? (r.leader as Record<string, unknown>).name : undefined
      const flat = r.leader_name
      const v = nested ?? flat
      return v != null && `${v}`.trim() !== '' ? pickStr(v) : null
    })(),
    leader_id: (() => {
      const nested = r.leader != null && typeof r.leader === 'object' ? (r.leader as Record<string, unknown>).id : undefined
      const flat = r.leader_id
      const v = nested ?? flat
      const n = Number(v)
      return v != null && Number.isFinite(n) ? n : null
    })(),
    members_count: finiteNum(r.members_count, 0),
    leaders_count: r.leaders_count !== undefined ? finiteNum(r.leaders_count, 0) : undefined,
    courses_count: r.courses_count !== undefined ? finiteNum(r.courses_count, 0) : undefined,
    volunteer_requests_count: r.volunteer_requests_count !== undefined ? finiteNum(r.volunteer_requests_count, 0) : undefined,
    pending_items_count: r.pending_items_count !== undefined ? finiteNum(r.pending_items_count, 0) : undefined,
    open_tasks: finiteNum(r.open_tasks, 0),
    open_tasks_count,
    meetings_week: r.meetings_week != null ? finiteNum(r.meetings_week, 0) : undefined,
    status: normalizeDeptHealth(r.status),
    health_score: typeof r.health_score === 'number' && !Number.isNaN(r.health_score) ? r.health_score : undefined,
  }
}
