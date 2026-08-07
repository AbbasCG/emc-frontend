import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import apiClient from '@/api/axios'
import {
  normalizeAdminAuditLogRow,
  isImpersonationAuditEvent,
  fetchAdminAuditLogs,
  fetchAdminAuditLogsPage,
  fetchAdminAuditLogStats,
  fetchAdminAuditLogDetail,
  exportAdminAuditLogs,
} from '@/api/adminAuditLogsApi'
import type { AdminAuditLogEntry, AdminAuditLogStats } from '@/types/adminAudit'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

function makeEntry(overrides: Partial<AdminAuditLogEntry> = {}): AdminAuditLogEntry {
  return {
    id: 1,
    actor_name: 'مشرف',
    actor_role: 'admin',
    action: 'UPDATE',
    entity_type: 'Course',
    entity_label: 'دورة البرمجة',
    old_values: null,
    new_values: null,
    ip_address: null,
    user_agent_summary: '—',
    created_at: '2026-08-01',
    ...overrides,
  }
}

/* ── normalizeAdminAuditLogRow ── */

describe('normalizeAdminAuditLogRow', () => {
  it('returns null for non-object payloads', () => {
    expect(normalizeAdminAuditLogRow(null)).toBeNull()
    expect(normalizeAdminAuditLogRow(undefined)).toBeNull()
    expect(normalizeAdminAuditLogRow('row')).toBeNull()
    expect(normalizeAdminAuditLogRow(42)).toBeNull()
  })

  it('normalizes a full Laravel-shaped row (Arabic payload)', () => {
    const row = normalizeAdminAuditLogRow({
      id: 7,
      user: { id: 3, name: 'أحمد محمد', email: 'ahmad@emc.sa', role: 'admin' },
      action: 'UPDATE',
      action_label: 'تعديل',
      action_color: 'amber',
      action_icon: 'edit',
      entity_type: 'Course',
      entity_name: 'دورة البرمجة',
      entity_id: '15',
      description: 'تم تعديل بيانات الدورة',
      changed_fields: ['title', 'status'],
      old_values: '{"title":"عنوان قديم"}',
      new_values: { title: 'عنوان جديد' },
      ip_address: '10.0.0.1',
      user_agent: 'Mozilla/5.0',
      route: 'admin/courses/15',
      method: 'PUT',
      created_at: '2026-08-01T10:00:00Z',
    })

    expect(row).not.toBeNull()
    const r = row as AdminAuditLogEntry
    expect(r.id).toBe(7)
    expect(r.actor_name).toBe('أحمد محمد') // falls back to user.name
    expect(r.actor_role).toBe('admin')
    expect(r.user).toEqual({ id: 3, name: 'أحمد محمد', email: 'ahmad@emc.sa', role: 'admin' })
    expect(r.action).toBe('UPDATE')
    expect(r.action_label).toBe('تعديل')
    expect(r.action_color).toBe('amber')
    expect(r.action_icon).toBe('edit')
    expect(r.entity_type).toBe('Course')
    expect(r.entity_label).toBe('دورة البرمجة') // entity_name is second choice
    expect(r.entity_name).toBe('دورة البرمجة')
    expect(r.entity_id).toBe(15) // string coerced to number
    expect(r.description).toBe('تم تعديل بيانات الدورة')
    expect(r.changed_fields).toEqual(['title', 'status'])
    expect(r.old_values).toEqual({ title: 'عنوان قديم' }) // JSON string parsed
    expect(r.new_values).toEqual({ title: 'عنوان جديد' }) // object passed through
    expect(r.ip_address).toBe('10.0.0.1')
    expect(r.user_agent).toBe('Mozilla/5.0')
    expect(r.user_agent_summary).toBe('Mozilla/5.0') // short UA is not truncated
    expect(r.route).toBe('admin/courses/15')
    expect(r.method).toBe('PUT')
    expect(r.created_at).toBe('2026-08-01T10:00:00Z')
  })

  it('applies safe fallbacks on an empty object (never crashes)', () => {
    const row = normalizeAdminAuditLogRow({}) as AdminAuditLogEntry
    expect(row).not.toBeNull()
    expect(typeof row.id).toBe('string') // synthetic id generated
    expect(row.actor_name).toBe('—')
    expect(row.actor_role).toBe('')
    expect(row.user).toBeUndefined()
    expect(row.action).toBe('unknown')
    expect(row.action_label).toBeNull()
    expect(row.entity_type).toBe('—')
    expect(row.entity_label).toBe('—')
    expect(row.entity_id).toBeNull()
    expect(row.changed_fields).toBeNull()
    expect(row.old_values).toBeNull()
    expect(row.new_values).toBeNull()
    expect(row.ip_address).toBeNull()
    expect(row.user_agent).toBeNull()
    expect(row.user_agent_summary).toBe('—')
    expect(row.metadata).toBeNull()
    expect(row.created_at).toBe('—')
  })

  it('supports legacy field aliases (performed_by, event, subject_type, subject_id, performed_at, ip, old)', () => {
    const row = normalizeAdminAuditLogRow({
      performed_by: 'النظام',
      event: 'created',
      subject_type: 'User',
      subject_id: 9,
      performed_at: '2026-01-01',
      ip: '1.2.3.4',
      old: '{"a":1}',
    }) as AdminAuditLogEntry
    expect(row.actor_name).toBe('النظام')
    expect(row.action).toBe('created')
    expect(row.entity_type).toBe('User')
    expect(row.entity_label).toBe('#9')
    expect(row.created_at).toBe('2026-01-01')
    expect(row.ip_address).toBe('1.2.3.4')
    // old_values key absent → falls back to `old` and parses JSON
    expect(row.old_values).toEqual({ a: 1 })
  })

  it('keeps numeric id 0 and string ids intact', () => {
    expect((normalizeAdminAuditLogRow({ id: 0 }) as AdminAuditLogEntry).id).toBe(0)
    expect((normalizeAdminAuditLogRow({ id: 'uuid-1' }) as AdminAuditLogEntry).id).toBe('uuid-1')
  })

  it('keeps non-JSON old_values strings as-is and maps empty strings to null', () => {
    const nonJson = normalizeAdminAuditLogRow({ old_values: 'ليس JSON' }) as AdminAuditLogEntry
    expect(nonJson.old_values).toBe('ليس JSON')

    const empty = normalizeAdminAuditLogRow({ old_values: '   ' }) as AdminAuditLogEntry
    expect(empty.old_values).toBeNull()
  })

  it('coerces changed_fields from arrays, JSON strings and plain strings', () => {
    expect((normalizeAdminAuditLogRow({ changed_fields: ['title', 2] }) as AdminAuditLogEntry).changed_fields)
      .toEqual(['title', '2'])
    expect((normalizeAdminAuditLogRow({ changed_fields: '["title","slug"]' }) as AdminAuditLogEntry).changed_fields)
      .toEqual(['title', 'slug'])
    expect((normalizeAdminAuditLogRow({ changed_fields: 'title' }) as AdminAuditLogEntry).changed_fields)
      .toEqual(['title'])
    expect((normalizeAdminAuditLogRow({ changed_fields: 5 }) as AdminAuditLogEntry).changed_fields)
      .toBeNull()
  })

  it('truncates long user agents to 117 chars + ellipsis in the summary', () => {
    const ua = 'A'.repeat(130)
    const row = normalizeAdminAuditLogRow({ user_agent: ua }) as AdminAuditLogEntry
    expect(row.user_agent).toBe(ua) // full UA preserved
    expect(row.user_agent_summary).toBe(`${'A'.repeat(117)}…`)
    expect(row.user_agent_summary.length).toBe(118)
  })

  it('prefers an explicit user_agent_summary over the derived brief', () => {
    const row = normalizeAdminAuditLogRow({
      user_agent: 'A'.repeat(200),
      user_agent_summary: 'Chrome على ويندوز',
    }) as AdminAuditLogEntry
    expect(row.user_agent_summary).toBe('Chrome على ويندوز')
  })
})

/* ── isImpersonationAuditEvent ── */

describe('isImpersonationAuditEvent', () => {
  it('detects impersonation signals across casing/spacing variants', () => {
    expect(isImpersonationAuditEvent(makeEntry({ action: 'IMPERSONATE_USER' }))).toBe(true)
    expect(isImpersonationAuditEvent(makeEntry({ action: 'Login As' }))).toBe(true)
    expect(isImpersonationAuditEvent(makeEntry({ action: 'login-as' }))).toBe(true)
    expect(isImpersonationAuditEvent(makeEntry({ action: 'simulate_session' }))).toBe(true)
    expect(isImpersonationAuditEvent(makeEntry({ action: 'act_as_user' }))).toBe(true)
  })

  it('detects impersonation from entity type/label, not only the action', () => {
    expect(isImpersonationAuditEvent(makeEntry({ action: 'CREATE', entity_type: 'ImpersonationSession' }))).toBe(true)
    expect(isImpersonationAuditEvent(makeEntry({ action: 'CREATE', entity_label: 'login_as ticket' }))).toBe(true)
  })

  it('does not flag ordinary events', () => {
    expect(isImpersonationAuditEvent(makeEntry({ action: 'UPDATE' }))).toBe(false)
    expect(isImpersonationAuditEvent(makeEntry({ action: 'LOGIN' }))).toBe(false)
  })
})

/* ── fetchAdminAuditLogsPage ── */

describe('fetchAdminAuditLogsPage', () => {
  it('maps legacy query aliases (actor→search, actor_role→role, from/to→date_from/date_to)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [], meta: { total: 0 } } })
    await fetchAdminAuditLogsPage({
      action: 'UPDATE',
      actor: 'أحمد',
      actor_role: 'admin',
      from: '2026-01-01',
      to: '2026-01-31',
    })
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/audit-logs',
      expect.objectContaining({
        skipErrorToast: true,
        params: expect.objectContaining({
          action: 'UPDATE',
          search: 'أحمد',
          role: 'admin',
          date_from: '2026-01-01',
          date_to: '2026-01-31',
        }),
      }),
    )
  })

  it('uses server pagination meta when present and filters out impersonation rows', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, action: 'UPDATE', entity_type: 'Course', entity_name: 'دورة', created_at: '2026-08-01' },
          { id: 2, action: 'impersonate_user', entity_type: 'User', created_at: '2026-08-01' },
        ],
        meta: { total: 42, current_page: 2, last_page: 3, per_page: 20, from: 21, to: 40 },
      },
    })

    const result = await fetchAdminAuditLogsPage({ page: 2, per_page: 20 })
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.id).toBe(1)
    expect(result.total).toBe(42)
    expect(result.page).toBe(2)
    expect(result.perPage).toBe(20)
    expect(result.lastPage).toBe(3)
    expect(result.from).toBe(21)
    expect(result.to).toBe(40)
  })

  it('supports alternate meta key spellings (page/lastPage/perPage)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [], meta: { total: 10, page: 2, lastPage: 5, perPage: 25 } },
    })
    const result = await fetchAdminAuditLogsPage()
    expect(result.total).toBe(10)
    expect(result.page).toBe(2)
    expect(result.lastPage).toBe(5)
    expect(result.perPage).toBe(25)
    expect(result.from).toBeNull()
    expect(result.to).toBeNull()
  })

  it('defends invalid meta numbers with safe defaults', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [], meta: { total: 5, current_page: -1, last_page: 'x', per_page: 0 } },
    })
    const result = await fetchAdminAuditLogsPage()
    expect(result.total).toBe(5)
    expect(result.page).toBe(1)
    expect(result.lastPage).toBe(1)
    expect(result.perPage).toBe(20)
  })

  it('computes local pagination when meta is absent or unusable', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, action: 'CREATE' },
          { id: 2, action: 'UPDATE' },
          { id: 3, action: 'DELETE' },
        ],
        meta: { total: 'كثير' }, // non-finite total → meta rejected
      },
    })
    const result = await fetchAdminAuditLogsPage({ page: 1, per_page: 2 })
    expect(result.total).toBe(3)
    expect(result.page).toBe(1)
    expect(result.perPage).toBe(2)
    expect(result.lastPage).toBe(2)
    expect(result.from).toBe(1)
    expect(result.to).toBe(2)
  })

  it('handles a bare array payload with zero rows (from/to null)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] })
    const result = await fetchAdminAuditLogsPage()
    expect(result).toEqual({
      entries: [],
      total: 0,
      page: 1,
      perPage: 20,
      lastPage: 1,
      from: null,
      to: null,
    })
  })

  it('propagates transport errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetchAdminAuditLogsPage()).rejects.toThrow('Network Error')
  })
})

/* ── fetchAdminAuditLogs (deprecated wrapper) ── */

describe('fetchAdminAuditLogs', () => {
  it('returns only the entries and defaults page=1 per_page=20', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: [{ id: 1, action: 'CREATE', entity_type: 'Course' }] },
    })
    const entries = await fetchAdminAuditLogs()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.action).toBe('CREATE')
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/audit-logs',
      expect.objectContaining({ params: expect.objectContaining({ page: 1, per_page: 20 }) }),
    )
  })
})

/* ── fetchAdminAuditLogStats ── */

describe('fetchAdminAuditLogStats', () => {
  it('unwraps the stats payload', async () => {
    const stats: AdminAuditLogStats = {
      total: 100,
      today: 4,
      this_week: 20,
      this_month: 60,
      unique_users: 7,
      failed_operations: 2,
      successful_operations: 98,
      top_entity: 'Course',
      most_active_user: 'أحمد',
      most_common_action: 'UPDATE',
    }
    mockedApi.get.mockResolvedValueOnce({ data: { data: stats } })
    const result = await fetchAdminAuditLogStats({ actor: 'أحمد' })
    expect(result).toEqual(stats)
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/audit-logs/stats',
      expect.objectContaining({ skipErrorToast: true, params: expect.objectContaining({ search: 'أحمد' }) }),
    )
  })

  it('returns an all-zero fallback when the payload data is null', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: null } })
    const result = await fetchAdminAuditLogStats()
    expect(result).toEqual({
      total: 0,
      today: 0,
      this_week: 0,
      this_month: 0,
      unique_users: 0,
      failed_operations: 0,
      successful_operations: 0,
      top_entity: null,
      most_active_user: null,
      most_common_action: null,
    })
  })

  it('propagates transport errors', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('boom'))
    await expect(fetchAdminAuditLogStats()).rejects.toThrow('boom')
  })
})

/* ── fetchAdminAuditLogDetail ── */

describe('fetchAdminAuditLogDetail', () => {
  it('fetches and normalizes a single entry', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { id: 7, action: 'DELETE', entity_type: 'Workshop', entity_name: 'ورشة' } },
    })
    const row = await fetchAdminAuditLogDetail(7)
    expect(mockedApi.get).toHaveBeenCalledWith('/admin/audit-logs/7', { skipErrorToast: true })
    expect(row?.action).toBe('DELETE')
    expect(row?.entity_label).toBe('ورشة')
  })

  it('returns null for an unparseable payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: null } })
    expect(await fetchAdminAuditLogDetail('x')).toBeNull()
  })

  it('returns null for an impersonation event (hidden from the UI)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { data: { id: 9, action: 'impersonate_user', entity_type: 'User' } },
    })
    expect(await fetchAdminAuditLogDetail(9)).toBeNull()
  })
})

/* ── exportAdminAuditLogs ── */

describe('exportAdminAuditLogs', () => {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  let createdAnchors: HTMLAnchorElement[] = []
  let restoreCreateElement: (() => void) | null = null

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
    createdAnchors = []
    const realCreateElement = document.createElement.bind(document) as (tag: string) => HTMLElement
    const spy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const el = realCreateElement(tag)
      if (el instanceof HTMLAnchorElement) {
        createdAnchors.push(el)
        el.click = () => {} // prevent jsdom navigation
      }
      return el
    }) as typeof document.createElement)
    restoreCreateElement = () => spy.mockRestore()
  })

  afterEach(() => {
    restoreCreateElement?.()
    restoreCreateElement = null
  })

  afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('exports JSON via responseType json and wraps the payload in a Blob', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, action: 'CREATE' }] })
    await exportAdminAuditLogs({ action: 'CREATE' }, 'json')

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/audit-logs/export',
      expect.objectContaining({
        responseType: 'json',
        skipErrorToast: true,
        params: expect.objectContaining({ action: 'CREATE', format: 'json' }),
      }),
    )
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(createdAnchors).toHaveLength(1)
    expect(createdAnchors[0]?.download).toMatch(/^audit-logs-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('exports CSV as a blob download with a .csv filename', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['a,b']) })
    await exportAdminAuditLogs(undefined, 'csv')

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/audit-logs/export',
      expect.objectContaining({
        responseType: 'blob',
        params: expect.objectContaining({ format: 'csv' }),
      }),
    )
    expect(createdAnchors[0]?.download).toMatch(/^audit-logs-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('exports XLSX with format=xlsx in the query but an .xls filename', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['bytes']) })
    await exportAdminAuditLogs(undefined, 'xlsx')

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/admin/audit-logs/export',
      expect.objectContaining({
        responseType: 'blob',
        params: expect.objectContaining({ format: 'xlsx' }),
      }),
    )
    expect(createdAnchors[0]?.download).toMatch(/^audit-logs-\d{4}-\d{2}-\d{2}\.xls$/)
  })

  it('propagates transport errors without triggering a download', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('export failed'))
    await expect(exportAdminAuditLogs(undefined, 'pdf')).rejects.toThrow('export failed')
    expect(createdAnchors).toHaveLength(0)
  })
})
