import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { MemberSortKey, MemberStatus } from '@/api/unitMembersApi'

export interface MemberFilters {
  search: string
  departmentId: number | null
  /** A unit id, or 'none' for members without a unit. */
  unit: number | 'none' | null
  role: string
  status: MemberStatus | ''
  sort: MemberSortKey
  dir: 'asc' | 'desc'
  page: number
  perPage: number
}

export const MEMBER_PAGE_SIZES = [10, 25, 50, 100] as const
export const DEFAULT_MEMBER_FILTERS: MemberFilters = { search: '', departmentId: null, unit: null, role: '', status: '', sort: 'name', dir: 'asc', page: 1, perPage: 25 }

const STATUSES: MemberStatus[] = ['active', 'inactive', 'on_leave']
const SORTS: MemberSortKey[] = ['name', 'department', 'unit', 'status', 'created_at']
const positiveInt = (v: string | null): number | null => {
  const n = v === null ? NaN : Number(v)

  return Number.isInteger(n) && n > 0 ? n : null
}

export function parseMemberFilters(p: URLSearchParams): MemberFilters {
  const unit = p.get('unit')
  const status = p.get('status') as MemberStatus | null
  const sort = p.get('sort') as MemberSortKey | null
  const per = positiveInt(p.get('per'))

  return {
    search: (p.get('q') ?? '').slice(0, 100),
    departmentId: positiveInt(p.get('dept')),
    unit: unit === 'none' ? 'none' : positiveInt(unit),
    role: (p.get('role') ?? '').slice(0, 50),
    status: status && STATUSES.includes(status) ? status : '',
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_MEMBER_FILTERS.sort,
    dir: p.get('dir') === 'desc' ? 'desc' : 'asc',
    page: positiveInt(p.get('page')) ?? 1,
    perPage: per && (MEMBER_PAGE_SIZES as readonly number[]).includes(per) ? per : DEFAULT_MEMBER_FILTERS.perPage,
  }
}

function writeMemberFilters(f: MemberFilters): URLSearchParams {
  const p = new URLSearchParams()
  const d = DEFAULT_MEMBER_FILTERS
  if (f.search) p.set('q', f.search)
  if (f.departmentId) p.set('dept', String(f.departmentId))
  if (f.unit !== null) p.set('unit', String(f.unit))
  if (f.role) p.set('role', f.role)
  if (f.status) p.set('status', f.status)
  if (f.sort !== d.sort) p.set('sort', f.sort)
  if (f.dir !== d.dir) p.set('dir', f.dir)
  if (f.page > 1) p.set('page', String(f.page))
  if (f.perPage !== d.perPage) p.set('per', String(f.perPage))

  return p
}

/**
 * The Team Members list state, kept in the URL so a refresh, a shared link and Back all land on the same
 * view. Changing any filter or the sort returns to page 1; changing only the page keeps everything else.
 */
export function useMemberFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseMemberFilters(params), [params])

  const update = useCallback(
    (patch: Partial<MemberFilters>, opts: { replace?: boolean } = {}) => {
      const next = { ...parseMemberFilters(params), ...patch }
      // A unit belongs to one department: a different department makes the chosen unit meaningless.
      if (patch.departmentId !== undefined && patch.departmentId !== parseMemberFilters(params).departmentId && patch.unit === undefined) next.unit = null
      if (patch.page === undefined) next.page = 1
      setParams(writeMemberFilters(next), { replace: opts.replace ?? true })
    },
    [params, setParams],
  )

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  return { filters, update, reset }
}

export function activeMemberFilterCount(f: MemberFilters): number {
  return (f.search ? 1 : 0) + (f.departmentId ? 1 : 0) + (f.unit !== null ? 1 : 0) + (f.role ? 1 : 0) + (f.status ? 1 : 0)
}
