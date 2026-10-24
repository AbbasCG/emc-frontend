import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FILTERS,
  TICKET_PRESETS,
  describeFilters,
  filtersFromSaved,
  filtersToParams,
  isKpiActive,
  kpiPatch,
  mergeIntoParams,
  parseFilters,
  parseTicketParam,
  parseView,
  savedQueryOf,
  toApiParams,
  withFilters,
  type KpiKey,
} from '@/utils/ticketFilters'

const parse = (qs: string) => parseFilters(new URLSearchParams(qs))
const labels = { status: { IN_PROGRESS: 'قيد المعالجة' }, priority: { HIGH: 'عالية' }, category: { OLD_ISSUE: 'مشكلة' } }

describe('parsing the URL', () => {
  it('an empty query is the defaults', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS)
  })

  it('reads every filter', () => {
    const f = parse('search=شبكة&status=ASSIGNED,IN_PROGRESS&priority=HIGH&category=OLD_ISSUE&dept=3&assignee=9&unassigned=1&mine=1&attention=1&overdue=1&state=open&sla=due_soon&created_from=2026-10-01&created_to=2026-10-10&due_from=2026-10-02&due_to=2026-10-20&sort=priority&dir=asc&per_page=50&page=4')

    expect(f).toMatchObject({
      search: 'شبكة', status: ['ASSIGNED', 'IN_PROGRESS'], priority: ['HIGH'], category: 'OLD_ISSUE', department: '3', assignee: '9',
      unassigned: true, mine: true, attention: true, overdue: true, state: 'open', sla: 'due_soon',
      createdFrom: '2026-10-01', createdTo: '2026-10-10', dueFrom: '2026-10-02', dueTo: '2026-10-20', sort: 'priority', dir: 'asc', perPage: 50, page: 4,
    })
  })

  it('drops anything it does not recognise instead of passing it on', () => {
    const f = parse('status=NOPE,RESOLVED&priority=URGENT&category=X&dept=abc&assignee=-5&state=maybe&sla=late&sort=password&dir=sideways&per_page=7&page=-2&created_from=yesterday&due_to=2026-13-45')

    expect(f.status).toEqual(['RESOLVED'])
    expect(f).toMatchObject({ priority: [], category: '', department: '', assignee: '', state: '', sla: '', sort: 'created_at', dir: 'desc', perPage: 25, page: 1, createdFrom: '', dueTo: '' })
  })

  it('removes duplicate statuses', () => {
    expect(parse('status=ASSIGNED,ASSIGNED').status).toEqual(['ASSIGNED'])
  })

  it('keeps a range that ends before it starts (so the form can explain it) but never sends its end', () => {
    const f = parse('created_from=2026-10-10&created_to=2026-10-01&due_from=2026-11-05&due_to=2026-11-01')

    expect(f).toMatchObject({ createdFrom: '2026-10-10', createdTo: '2026-10-01', dueFrom: '2026-11-05', dueTo: '2026-11-01' })
    expect(toApiParams(f)).toMatchObject({ created_from: '2026-10-10', due_from: '2026-11-05' })
    expect(toApiParams(f)).not.toHaveProperty('created_to')
    expect(toApiParams(f)).not.toHaveProperty('due_to')
    expect(toApiParams(parse('created_from=2026-10-01&created_to=2026-10-10'))).toMatchObject({ created_to: '2026-10-10' })
  })

  it('still understands the link format used before the redesign', () => {
    expect(parse('status=PENDING_APPROVAL&search=network&page=2&delayed=1')).toMatchObject({ status: ['PENDING_APPROVAL'], search: 'network', page: 2, overdue: true })
  })

  it('caps the search length', () => {
    expect(parse(`search=${'x'.repeat(300)}`).search).toHaveLength(100)
  })

  it('validates the view and the open ticket', () => {
    expect(parseView(new URLSearchParams('view=board'))).toBe('board')
    expect(parseView(new URLSearchParams('view=evil'))).toBe('table')
    expect(parseTicketParam(new URLSearchParams('ticket=42'))).toBe(42)
    expect(parseTicketParam(new URLSearchParams('ticket=0'))).toBeNull()
    expect(parseTicketParam(new URLSearchParams('ticket=4x'))).toBeNull()
    expect(parseTicketParam(new URLSearchParams(''))).toBeNull()
  })
})

describe('writing the URL', () => {
  it('writes only what differs from the defaults and round-trips', () => {
    const f = withFilters(DEFAULT_FILTERS, { status: ['IN_PROGRESS', 'ASSIGNED'], department: '4', overdue: true, sort: 'due', dir: 'asc', perPage: 100, page: 3 })
    const qs = filtersToParams(f)

    expect(qs.get('status')).toBe('IN_PROGRESS,ASSIGNED')
    expect(qs.has('mine')).toBe(false)
    expect(parseFilters(qs)).toEqual(f)
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('')
  })

  it('keeps every parameter that is not a filter', () => {
    const prev = new URLSearchParams('view=board&ticket=12&days=7&status=ASSIGNED&page=3')
    const next = mergeIntoParams(prev, withFilters(parseFilters(prev), { search: 'x' }))

    expect(next.get('view')).toBe('board')
    expect(next.get('ticket')).toBe('12')
    expect(next.get('days')).toBe('7')
    expect(next.get('status')).toBe('ASSIGNED')
    expect(next.get('search')).toBe('x')
  })
})

describe('paging never erases the filters (regression of the earlier setCurrentPage bug)', () => {
  const base = withFilters(DEFAULT_FILTERS, { status: ['IN_PROGRESS'], search: 'شبكة', department: '2', overdue: true, page: 4 })

  it('changing only the page keeps every other filter', () => {
    const next = withFilters(base, { page: 5 })

    expect(next).toEqual({ ...base, page: 5 })
  })

  it('going back to page 1 keeps every other filter too', () => {
    expect(withFilters(base, { page: 1 })).toEqual({ ...base, page: 1 })
    const qs = mergeIntoParams(filtersToParams(base), withFilters(base, { page: 1 }))
    expect(qs.get('status')).toBe('IN_PROGRESS')
    expect(qs.get('search')).toBe('شبكة')
    expect(qs.has('page')).toBe(false)
  })

  it('changing a filter returns to page 1 and keeps the others', () => {
    const next = withFilters(base, { priority: ['HIGH'] })

    expect(next.page).toBe(1)
    expect(next.status).toEqual(['IN_PROGRESS'])
    expect(next.search).toBe('شبكة')
  })

  it('re-applying the same filter value does not reset the page', () => {
    expect(withFilters(base, { department: '2' }).page).toBe(4)
  })

  it('a patch that sets both a filter and a page keeps that page', () => {
    expect(withFilters(base, { status: ['RESOLVED'], page: 2 }).page).toBe(2)
  })
})

describe('the API query', () => {
  const f = withFilters(DEFAULT_FILTERS, { search: ' شبكة ', status: ['ASSIGNED', 'IN_PROGRESS'], priority: ['HIGH'], department: '3', assignee: '8', category: 'OLD_ISSUE', unassigned: true, overdue: true, state: 'open', sla: 'overdue', createdFrom: '2026-10-01', sort: 'priority', dir: 'asc', perPage: 50, page: 3 })

  it('maps filters to the server vocabulary and trims the search', () => {
    expect(toApiParams(f, { lite: true })).toEqual({
      search: 'شبكة', ticket_category: 'OLD_ISSUE', department_id: '3', assigned_to_id: '8', created_from: '2026-10-01',
      status: 'ASSIGNED,IN_PROGRESS', priority: 'HIGH', unassigned: 1, overdue: 1, state: 'open', sla: 'overdue', sort: 'priority', dir: 'asc', per_page: 50, page: 3, lite: 1,
    })
  })

  it('sends nothing for filters that are not set, and no page 1', () => {
    expect(toApiParams(DEFAULT_FILTERS)).toEqual({ sort: 'created_at', dir: 'desc', per_page: 25 })
  })

  it('the figures see only the scope filters: no card filter, no paging, no sorting', () => {
    expect(toApiParams(f, { scope: true })).toEqual({ search: 'شبكة', ticket_category: 'OLD_ISSUE', department_id: '3', assigned_to_id: '8', created_from: '2026-10-01' })
  })

  it('a different page asks for the same figures (no re-request)', () => {
    expect(toApiParams(withFilters(f, { page: 9 }), { scope: true })).toEqual(toApiParams(f, { scope: true }))
  })
})

describe('KPI cards', () => {
  const keys: KpiKey[] = ['total', 'pending', 'open', 'inProgress', 'resolved', 'closed', 'overdue', 'unassigned', 'highPriority']

  it('applying a card replaces the card-level filters and keeps the rest', () => {
    const start = withFilters(DEFAULT_FILTERS, { search: 'شبكة', department: '2', createdFrom: '2026-10-01', status: ['RESOLVED'], mine: true, page: 3 })
    const next = withFilters(start, kpiPatch('overdue'))

    expect(next).toMatchObject({ overdue: true, status: [], mine: false, search: 'شبكة', department: '2', createdFrom: '2026-10-01', page: 1 })
  })

  it('each card is active exactly when its own filter is applied', () => {
    for (const k of keys) {
      const f = withFilters(DEFAULT_FILTERS, kpiPatch(k))
      for (const other of keys) {
        // "total" is the cleared state, shared by every unfiltered view.
        expect(isKpiActive(f, other), `${k} -> ${other}`).toBe(k === other)
      }
    }
  })

  it('the cards select the subsets they count', () => {
    expect(kpiPatch('unassigned')).toMatchObject({ unassigned: true, state: 'open' })
    expect(kpiPatch('highPriority')).toMatchObject({ priority: ['HIGH', 'CRITICAL'], state: 'open' })
    expect(kpiPatch('pending')).toMatchObject({ status: ['PENDING_APPROVAL'] })
  })
})

describe('chips', () => {
  it('describes each active filter and how to remove just it', () => {
    const f = withFilters(DEFAULT_FILTERS, { search: 'شبكة', status: ['IN_PROGRESS', 'ASSIGNED'], priority: ['HIGH'], department: '3', overdue: true, createdFrom: '2026-10-01', sort: 'priority', page: 2 })
    const chips = describeFilters(f, { ...labels, departmentName: (id) => (id === '3' ? 'التقنية' : undefined) })
    const text = chips.map((c) => c.label)

    expect(text).toContain('بحث: شبكة')
    expect(text).toContain('قيد المعالجة')
    expect(text).toContain('ASSIGNED')
    expect(text).toContain('أولوية: عالية')
    expect(text).toContain('الإدارة: التقنية')
    expect(text).toContain('متأخرة')
    expect(chips.some((c) => c.key === 'created')).toBe(true)
    // sorting and paging are not filters
    expect(chips).toHaveLength(7)

    const removeOne = chips.find((c) => c.key === 'status:IN_PROGRESS')!
    expect(withFilters(f, removeOne.remove).status).toEqual(['ASSIGNED'])
  })

  it('there are none when nothing is filtered', () => {
    expect(describeFilters(DEFAULT_FILTERS, labels)).toEqual([])
  })
})

describe('saved views and presets', () => {
  it('a saved view stores filters only, with no page', () => {
    const f = withFilters(DEFAULT_FILTERS, { status: ['ASSIGNED'], mine: true, page: 5 })
    const q = savedQueryOf(f)

    expect(q).not.toContain('page')
    expect(filtersFromSaved({ query: q })).toEqual({ ...f, page: 1 })
  })

  it('a stored view is revalidated like any URL', () => {
    expect(filtersFromSaved({ query: 'status=HACKED&dept=1;DROP&sort=x&per_page=999' })).toEqual(DEFAULT_FILTERS)
  })

  it('every preset is a valid set of filters', () => {
    for (const p of TICKET_PRESETS) {
      const f = withFilters(DEFAULT_FILTERS, p.patch)
      expect(parseFilters(filtersToParams(f))).toEqual(f)
    }
    expect(TICKET_PRESETS.map((p) => p.id)).toEqual(expect.arrayContaining(['mine', 'unassigned', 'high', 'overdue', 'pending', 'recent', 'attention']))
  })
})
