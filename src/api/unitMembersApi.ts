import apiClient from '@/api/axios';

// These screens show their own inline errors and retry buttons (and cancel superseded requests), so the
// global error toast stays off for every call here.
const quiet = { skipErrorToast: true as const };

/**
 * Admin-only: departmental (technical) units + which team members belong to
 * them. Backend is authoritative for every rule here (department-consistency,
 * leadership/global authorization) — this client only shapes requests.
 */

export interface DepartmentalUnitRow {
  id: number;
  department_id: number;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  is_active: boolean;
  member_count: number;
}

export interface TeamMemberRow {
  id: number;
  user: { id: number; name: string; email: string; role: string } | null;
  department: { id: number; name: string } | null;
  section: { id: number; name: string } | null;
  unit: { id: number; name_ar: string; name_en: string | null } | null;
  role_title: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  created_at: string;
}

export type MemberStatus = TeamMemberRow['status'];
export type MemberSortKey = 'name' | 'department' | 'unit' | 'status' | 'created_at';

export interface MemberQuery {
  departmentId?: number;
  status?: MemberStatus;
  /** A unit id, or 'null' for members without a unit. */
  unitId?: number | 'null';
  role?: string;
  search?: string;
  sort?: MemberSortKey;
  dir?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

export interface MemberListMeta {
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  /** Counted over the department/search/role scope, ignoring the status and no-unit filters. */
  stats: { total: number; active: number; inactive: number; on_leave: number; without_unit: number };
}

export interface MemberPage {
  rows: TeamMemberRow[];
  meta: MemberListMeta;
}

export interface UnitList {
  rows: DepartmentalUnitRow[];
  /** From the server: may this user create or change units in this department? The server re-checks on every write. */
  canManage: boolean;
}

export const unitMembersApi = {
  listUnits: async (departmentId: number, signal?: AbortSignal): Promise<DepartmentalUnitRow[]> => {
    return (await unitMembersApi.listUnitsScoped(departmentId, signal)).rows;
  },

  listUnitsScoped: async (departmentId: number, signal?: AbortSignal): Promise<UnitList> => {
    const res = await apiClient.get('/admin/departmental-units', { params: { department_id: departmentId }, signal, ...quiet });
    return { rows: res.data.data ?? [], canManage: res.data.meta?.can_manage === true };
  },

  /** One page of members, with the server's counts for the whole scope. */
  listMembersPage: async (q: MemberQuery, signal?: AbortSignal): Promise<MemberPage> => {
    const res = await apiClient.get('/admin/team-members', {
      params: {
        ...(q.departmentId !== undefined ? { department_id: q.departmentId } : {}),
        ...(q.status ? { status: q.status } : {}),
        ...(q.unitId !== undefined ? { unit_id: q.unitId } : {}),
        ...(q.role ? { role: q.role } : {}),
        ...(q.search ? { search: q.search } : {}),
        ...(q.sort ? { sort: q.sort, dir: q.dir ?? 'asc' } : {}),
        page: q.page ?? 1,
        per_page: q.perPage ?? 20,
      },
      signal,
      ...quiet,
    });
    const m = res.data.meta ?? {};
    const stats = m.stats ?? {};

    return {
      rows: res.data.data ?? [],
      meta: {
        total: m.total ?? 0,
        current_page: m.current_page ?? 1,
        last_page: m.last_page ?? 1,
        per_page: m.per_page ?? 20,
        stats: { total: stats.total ?? 0, active: stats.active ?? 0, inactive: stats.inactive ?? 0, on_leave: stats.on_leave ?? 0, without_unit: stats.without_unit ?? 0 },
      },
    };
  },

  createUnit: async (payload: { department_id: number; code: string; name_ar: string; name_en?: string; description?: string }) => {
    const res = await apiClient.post('/admin/departmental-units', payload, quiet);
    return res.data.data as DepartmentalUnitRow;
  },

  updateUnit: async (id: number, payload: Partial<{ name_ar: string; name_en: string; description: string; is_active: boolean }>) => {
    const res = await apiClient.put(`/admin/departmental-units/${id}`, payload, quiet);
    return res.data.data as DepartmentalUnitRow;
  },

  listMembers: async (
    departmentId?: number,
    opts?: { unitId?: number | 'null'; status?: string; search?: string; perPage?: number; signal?: AbortSignal },
  ): Promise<TeamMemberRow[]> => {
    const res = await apiClient.get('/admin/team-members', {
      params: {
        ...(departmentId !== undefined ? { department_id: departmentId } : {}),
        per_page: opts?.perPage ?? 100,
        ...(opts?.unitId !== undefined ? { unit_id: opts.unitId } : {}),
        ...(opts?.status ? { status: opts.status } : {}),
        ...(opts?.search ? { search: opts.search } : {}),
      },
      signal: opts?.signal,
      ...quiet,
    });
    return res.data.data ?? [];
  },

  setMemberUnit: async (teamMemberId: number, unitId: number | null): Promise<TeamMemberRow> => {
    const res = await apiClient.put(`/admin/team-members/${teamMemberId}`, { unit_id: unitId }, quiet);
    return res.data.data as TeamMemberRow;
  },

  // department_id/role_title are intentionally NOT accepted here — the
  // backend derives both from the selected user's canonical team_profiles
  // record and ignores anything sent for those fields. Only user_id/unit_id/
  // status are ever meaningful in this request.
  createMember: async (payload: {
    user_id: number;
    unit_id?: number | null;
    status?: 'active' | 'inactive' | 'on_leave';
  }): Promise<TeamMemberRow> => {
    const res = await apiClient.post('/admin/team-members', payload, quiet);
    return res.data.data as TeamMemberRow;
  },

  // Same restriction on update — this endpoint only ever changes unit/status
  // for an existing row; member identity/department/title are managed on
  // the canonical member profile, not here.
  updateMember: async (
    teamMemberId: number,
    payload: Partial<{ unit_id: number | null; status: 'active' | 'inactive' | 'on_leave' }>,
  ): Promise<TeamMemberRow> => {
    const res = await apiClient.put(`/admin/team-members/${teamMemberId}`, payload, quiet);
    return res.data.data as TeamMemberRow;
  },
};
