import apiClient from '@/api/axios';

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
  joined_at: string | null;
  created_at: string;
}

export const unitMembersApi = {
  listUnits: async (departmentId: number): Promise<DepartmentalUnitRow[]> => {
    const res = await apiClient.get('/admin/departmental-units', { params: { department_id: departmentId } });
    return res.data.data ?? [];
  },

  createUnit: async (payload: { department_id: number; code: string; name_ar: string; name_en?: string; description?: string }) => {
    const res = await apiClient.post('/admin/departmental-units', payload);
    return res.data.data as DepartmentalUnitRow;
  },

  updateUnit: async (id: number, payload: Partial<{ name_ar: string; name_en: string; description: string; is_active: boolean }>) => {
    const res = await apiClient.put(`/admin/departmental-units/${id}`, payload);
    return res.data.data as DepartmentalUnitRow;
  },

  listMembers: async (
    departmentId?: number,
    opts?: { unitId?: number | 'null'; status?: string; search?: string; perPage?: number },
  ): Promise<TeamMemberRow[]> => {
    const res = await apiClient.get('/admin/team-members', {
      params: {
        ...(departmentId !== undefined ? { department_id: departmentId } : {}),
        per_page: opts?.perPage ?? 100,
        ...(opts?.unitId !== undefined ? { unit_id: opts.unitId } : {}),
        ...(opts?.status ? { status: opts.status } : {}),
        ...(opts?.search ? { search: opts.search } : {}),
      },
    });
    return res.data.data ?? [];
  },

  setMemberUnit: async (teamMemberId: number, unitId: number | null): Promise<TeamMemberRow> => {
    const res = await apiClient.put(`/admin/team-members/${teamMemberId}`, { unit_id: unitId });
    return res.data.data as TeamMemberRow;
  },

  createMember: async (payload: {
    user_id: number;
    department_id: number;
    section_id?: number | null;
    unit_id?: number | null;
    role_title?: string;
    status?: 'active' | 'inactive' | 'on_leave';
    joined_at?: string;
  }): Promise<TeamMemberRow> => {
    const res = await apiClient.post('/admin/team-members', payload);
    return res.data.data as TeamMemberRow;
  },

  updateMember: async (
    teamMemberId: number,
    payload: Partial<{
      department_id: number;
      section_id: number | null;
      unit_id: number | null;
      role_title: string;
      status: 'active' | 'inactive' | 'on_leave';
      joined_at: string;
    }>,
  ): Promise<TeamMemberRow> => {
    const res = await apiClient.put(`/admin/team-members/${teamMemberId}`, payload);
    return res.data.data as TeamMemberRow;
  },
};
