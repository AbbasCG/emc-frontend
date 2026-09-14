import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  fetchRolePageAccess,
  saveRolePageAccess,
  fetchDepartmentPageAccess,
  saveDepartmentPageAccess,
  fetchUserPageAccessOverrides,
  saveUserPageAccessOverrides,
  splitOverrideStates,
  fetchUserEffectivePageAccess,
  fetchMyPageAccess,
} from '@/api/accessControlApi'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

const silent = { skipErrorToast: true }

/* ── Phase 2B — Role defaults ──────────────────────────────────────────── */

describe('Role default page access client', () => {
  it('GETs /admin/roles/{role}/page-access and parses defaults + eligible entries', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          role: { id: 6, name: 'finance_manager', display_name: 'مدير المالية', is_system: false },
          page_defaults: ['finance.dashboard'],
          eligible: [
            {
              key: 'finance.dashboard',
              label_ar: 'لوحة المالية',
              category: 'finance',
              category_label_ar: 'المالية',
              risk_level: 'ADMIN_ONLY',
              department_scoped: false,
            },
          ],
        },
      },
    })

    const res = await fetchRolePageAccess('finance_manager')

    expect(mockedApi.get).toHaveBeenCalledWith('/admin/roles/finance_manager/page-access', silent)
    expect(res.role.name).toBe('finance_manager')
    expect(res.pageDefaults).toEqual(['finance.dashboard'])
    expect(res.eligible[0]).toMatchObject({
      key: 'finance.dashboard',
      labelAr: 'لوحة المالية',
      categoryLabelAr: 'المالية',
      riskLevel: 'ADMIN_ONLY',
    })
  })

  it('PUTs the exact { page_defaults } payload — positive only, never a DENY state', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { success: true, data: { page_defaults: ['a.b'] } } })

    const stored = await saveRolePageAccess(6, ['a.b'])

    expect(mockedApi.put).toHaveBeenCalledWith('/admin/roles/6/page-access', { page_defaults: ['a.b'] }, silent)
    expect(stored).toEqual(['a.b'])
    const body = mockedApi.put.mock.calls[0][1] as Record<string, unknown>
    expect(Object.keys(body)).toEqual(['page_defaults'])
    expect(JSON.stringify(body)).not.toContain('deny')
  })

  it('sends an empty array when every page in a category is cleared (no per-page requests)', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { success: true, data: { page_defaults: [] } } })

    await saveRolePageAccess(6, [])

    expect(mockedApi.put).toHaveBeenCalledTimes(1)
    expect(mockedApi.put).toHaveBeenCalledWith('/admin/roles/6/page-access', { page_defaults: [] }, silent)
  })
})

/* ── Phase 2A — Department defaults ────────────────────────────────────── */

describe('Department default page access client', () => {
  it('GETs member and leader defaults with their separate eligible sets', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          department: { id: 3, name: 'العمليات', status: 'active' },
          member_defaults: ['operations.weekly_reports'],
          leader_defaults: ['organizational_departments.structure'],
          eligible: {
            member: [
              {
                key: 'operations.weekly_reports',
                label_ar: 'التقارير الأسبوعية',
                category: 'operations',
                category_label_ar: 'العمليات',
                risk_level: 'SAFE_DELEGATABLE',
                department_scoped: true,
              },
            ],
            leader: [
              {
                key: 'organizational_departments.structure',
                label_ar: 'هيكل الإدارة',
                category: 'organizational_departments',
                category_label_ar: 'الإدارات',
                risk_level: 'ADMIN_ONLY',
                department_scoped: true,
              },
            ],
          },
        },
      },
    })

    const res = await fetchDepartmentPageAccess(3)

    expect(mockedApi.get).toHaveBeenCalledWith('/admin/departments/3/page-access', silent)
    expect(res.memberDefaults).toEqual(['operations.weekly_reports'])
    expect(res.leaderDefaults).toEqual(['organizational_departments.structure'])
    // The leader-only page is eligible for the leader audience but NOT for members.
    expect(res.eligible.member.map((e) => e.key)).not.toContain('organizational_departments.structure')
    expect(res.eligible.leader.map((e) => e.key)).toContain('organizational_departments.structure')
  })

  it('PUTs both audiences in ONE atomic request', async () => {
    mockedApi.put.mockResolvedValueOnce({
      data: { success: true, data: { member_defaults: ['m.1'], leader_defaults: ['l.1'] } },
    })

    const res = await saveDepartmentPageAccess(3, ['m.1'], ['l.1'])

    expect(mockedApi.put).toHaveBeenCalledTimes(1)
    expect(mockedApi.put).toHaveBeenCalledWith(
      '/admin/departments/3/page-access',
      { member_defaults: ['m.1'], leader_defaults: ['l.1'] },
      silent,
    )
    expect(res).toEqual({ memberDefaults: ['m.1'], leaderDefaults: ['l.1'] })
  })
})

/* ── Phase 2C — User overrides ─────────────────────────────────────────── */

describe('User page access override client', () => {
  it('GETs overrides as a key→state map plus the actor-scoped grantable set', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 42, name: 'سارة', email: 's@example.com', role: 'volunteer' },
          overrides: { 'operations.weekly_reports': 'allow', 'knowledge.base': 'deny' },
          grantable: [
            {
              key: 'operations.weekly_reports',
              label_ar: 'التقارير الأسبوعية',
              category: 'operations',
              category_label_ar: 'العمليات',
              risk_level: 'SAFE_DELEGATABLE',
              delegatable: true,
            },
          ],
        },
      },
    })

    const res = await fetchUserPageAccessOverrides(42)

    expect(mockedApi.get).toHaveBeenCalledWith('/admin/users/42/page-access-overrides', silent)
    expect(res.overrides).toEqual({ 'operations.weekly_reports': 'allow', 'knowledge.base': 'deny' })
    expect(res.grantable[0].delegatable).toBe(true)
  })

  it('ignores any state that is not allow/deny (a "default" row must never round-trip)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 1, name: '', email: '', role: '' },
          overrides: { 'a.b': 'allow', 'c.d': 'default', 'e.f': '' },
          grantable: [],
        },
      },
    })

    const res = await fetchUserPageAccessOverrides(1)

    expect(res.overrides).toEqual({ 'a.b': 'allow' })
  })

  it('PUTs { allow, deny } — ALLOW payload', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { success: true, data: { overrides: { 'a.b': 'allow' } } } })

    const res = await saveUserPageAccessOverrides(42, ['a.b'], [])

    expect(mockedApi.put).toHaveBeenCalledWith(
      '/admin/users/42/page-access-overrides',
      { allow: ['a.b'], deny: [] },
      silent,
    )
    expect(res).toEqual({ 'a.b': 'allow' })
  })

  it('PUTs { allow, deny } — DENY payload', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { success: true, data: { overrides: { 'a.b': 'deny' } } } })

    await saveUserPageAccessOverrides(42, [], ['a.b'])

    expect(mockedApi.put).toHaveBeenCalledWith(
      '/admin/users/42/page-access-overrides',
      { allow: [], deny: ['a.b'] },
      silent,
    )
  })

  it('DEFAULT resets the override by OMITTING the key — it never sends a "default" state', () => {
    const payload = splitOverrideStates({
      'keep.allow': 'allow',
      'keep.deny': 'deny',
      'reset.me': 'default',
    })

    expect(payload).toEqual({ allow: ['keep.allow'], deny: ['keep.deny'] })
    expect(JSON.stringify(payload)).not.toContain('reset.me')
    expect(JSON.stringify(payload)).not.toContain('default')
  })

  it('a full reset sends two empty arrays in one request, not one request per page', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: { success: true, data: { overrides: {} } } })

    const { allow, deny } = splitOverrideStates({ a: 'default', b: 'default', c: 'default' })
    await saveUserPageAccessOverrides(7, allow, deny)

    expect(mockedApi.put).toHaveBeenCalledTimes(1)
    expect(mockedApi.put).toHaveBeenCalledWith(
      '/admin/users/7/page-access-overrides',
      { allow: [], deny: [] },
      silent,
    )
  })
})

/* ── Phase 2D — Effective access (read-only) ───────────────────────────── */

describe('Effective page access client', () => {
  const adminRow = {
    key: 'operations.weekly_reports',
    allowed: true,
    primary_source: 'department_leader',
    primary_source_label_ar: 'لأنه قائد الإدارة',
    sources: ['role', 'department_member', 'department_leader'],
    override_state: null,
    protected: false,
    reason: 'department_leader',
    label_ar: 'التقارير الأسبوعية',
    category: 'operations',
    category_label_ar: 'العمليات',
    risk_level: 'SAFE_DELEGATABLE',
  }

  it('GETs the admin inspection endpoint and preserves backend provenance verbatim', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 42, name: 'سارة', email: 's@example.com', role: 'volunteer' },
          allowed_keys: ['operations.weekly_reports'],
          pages: [adminRow],
        },
      },
    })

    const res = await fetchUserEffectivePageAccess(42)

    expect(mockedApi.get).toHaveBeenCalledWith('/admin/users/42/effective-page-access', silent)
    expect(res.allowedKeys).toEqual(['operations.weekly_reports'])
    expect(res.pages[0].primarySource).toBe('department_leader')
    // Arabic wording comes from the resolver, not from the frontend.
    expect(res.pages[0].primarySourceLabelAr).toBe('لأنه قائد الإدارة')
    expect(res.pages[0].sources).toEqual(['role', 'department_member', 'department_leader'])
  })

  it('parses a user DENY row as denied with its override state', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 1, name: '', email: '', role: '' },
          allowed_keys: [],
          pages: [
            {
              ...adminRow,
              key: 'knowledge.base',
              allowed: false,
              primary_source: 'user_deny',
              primary_source_label_ar: 'محجوبة بشكل خاص',
              sources: ['department_member'],
              override_state: 'deny',
              reason: 'user_deny',
            },
          ],
        },
      },
    })

    const res = await fetchUserEffectivePageAccess(1)

    expect(res.pages[0].allowed).toBe(false)
    expect(res.pages[0].primarySource).toBe('user_deny')
    expect(res.pages[0].overrideState).toBe('deny')
    // A DENY is not a positive contributor; the inherited source stays visible.
    expect(res.pages[0].sources).toEqual(['department_member'])
  })

  it('parses a protected row as protected and not allowed for an ordinary user', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 1, name: '', email: '', role: '' },
          allowed_keys: [],
          pages: [
            {
              ...adminRow,
              key: 'administration.roles',
              allowed: false,
              primary_source: 'system_protected',
              primary_source_label_ar: 'محمية من النظام',
              sources: [],
              protected: true,
              reason: 'system_protected',
              risk_level: 'SYSTEM_PROTECTED',
            },
          ],
        },
      },
    })

    const res = await fetchUserEffectivePageAccess(1)

    expect(res.pages[0].protected).toBe(true)
    expect(res.pages[0].allowed).toBe(false)
    expect(res.pages[0].primarySource).toBe('system_protected')
  })

  it('accepts the self endpoint MAP shape as well as the admin LIST shape', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 9, name: 'root', role: 'super_admin' },
          allowed_keys: ['administration.roles'],
          pages: {
            'administration.roles': {
              key: 'administration.roles',
              allowed: true,
              primary_source: 'root_authority',
              primary_source_label_ar: 'صلاحية النظام الكاملة',
              sources: ['root_authority'],
              override_state: null,
              protected: true,
              reason: 'root_authority',
            },
          },
        },
      },
    })

    const res = await fetchMyPageAccess()

    expect(mockedApi.get).toHaveBeenCalledWith('/auth/me/page-access', silent)
    expect(res.pages).toHaveLength(1)
    expect(res.pages[0].primarySource).toBe('root_authority')
  })

  it('falls back to "none" for an unrecognized source rather than trusting arbitrary input', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 1, name: '', email: '', role: '' },
          allowed_keys: [],
          pages: [{ ...adminRow, primary_source: 'something_new', sources: ['bogus'] }],
        },
      },
    })

    const res = await fetchUserEffectivePageAccess(1)

    expect(res.pages[0].primarySource).toBe('none')
    expect(res.pages[0].sources).toEqual(['none'])
  })

  it('exposes no write helper for effective access — it is derived, read-only', async () => {
    const mod = await import('@/api/accessControlApi')
    const writers = Object.keys(mod).filter(
      (k) => /^(save|update|set|delete|create)/.test(k) && /effective/i.test(k),
    )
    expect(writers).toEqual([])
  })
})
