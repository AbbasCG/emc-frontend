import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { normalizeIncomingRequest, type IncomingCapabilities } from '@/api/hrIncomingRequestsApi'
import { RequestDetailsModal } from '@/components/hrIncoming/RequestDetailsModal'

/**
 * HR reads the detailed staffing fields the department leader filed: employment type, job title, qualification, duties.
 * Requests saved before those fields existed carry none of them and must still read cleanly.
 */

vi.mock('@/api/volunteerOpportunitiesAdminApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/volunteerOpportunitiesAdminApi')>()),
  fetchRequestApplicants: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
  setApplicantStatus: vi.fn(),
}))

const CAPS: IncomingCapabilities = { canViewAll: true, canManage: false, canMatchVolunteers: false, canCreateDraft: false }

const NEW_ROW = {
  id: 7, title: 'طلب احتياج', request_type: 'مصمم محتوى (وظيفة شاغرة)', employment_type: 'استبدال', job_title: 'مصمم محتوى',
  required_count: 2, qualification: 'بكالوريوس تصميم', responsibilities: 'تصميم المواد\nمراجعة الهوية', skills_and_specs: 'فوتوشوب',
  status: 'pending', department: { id: 1, name: 'الإعلام' }, requester: { id: 3, name: 'نورة' },
}

describe('normalizeIncomingRequest — the detailed staffing fields', () => {
  it('carries employment type, job title, qualification and duties', () => {
    expect(normalizeIncomingRequest(NEW_ROW)).toMatchObject({
      employmentType: 'استبدال',
      jobTitle: 'مصمم محتوى',
      qualification: 'بكالوريوس تصميم',
      responsibilities: 'تصميم المواد\nمراجعة الهوية',
      requiredCount: 2,
    })
  })

  it('reads a request saved before those fields existed as having none of them', () => {
    const old = normalizeIncomingRequest({ id: 1, request_type: 'احتياج وظيفي', required_count: 1, status: 'pending' })
    expect(old.employmentType).toBeNull()
    expect(old.jobTitle).toBeNull()
    expect(old.qualification).toBeNull()
    expect(old.responsibilities).toBeNull()
    expect(old.requestType).toBe('احتياج وظيفي')
  })

  it('treats empty and null values as absent (the backend trims and stores null for blanks)', () => {
    const blank = normalizeIncomingRequest({ ...NEW_ROW, employment_type: '', job_title: '', qualification: null, responsibilities: '' })
    expect(blank.employmentType).toBeNull()
    expect(blank.jobTitle).toBeNull()
    expect(blank.qualification).toBeNull()
    expect(blank.responsibilities).toBeNull()
  })
})

describe('RequestDetailsModal — the detailed staffing fields', () => {
  function open(raw: unknown) {
    render(
      <MemoryRouter>
        <RequestDetailsModal
          request={normalizeIncomingRequest(raw)}
          capabilities={CAPS}
          onClose={vi.fn()}
          onStatus={vi.fn()}
          statusBusy={false}
          onMatchResult={vi.fn()}
          onOpenDraft={vi.fn()}
          draftBusy={false}
        />
      </MemoryRouter>,
    )
    return screen.getByTestId('request-modal')
  }

  it('shows the type, title, qualification and duties', () => {
    const modal = open(NEW_ROW)

    expect(within(modal).getByText('نوع التوظيف')).toBeInTheDocument()
    expect(within(modal).getByText('استبدال')).toBeInTheDocument()
    expect(within(modal).getByText('المسمى الوظيفي')).toBeInTheDocument()
    expect(within(modal).getByText('مصمم محتوى')).toBeInTheDocument()
    expect(within(modal).getByText('بكالوريوس تصميم')).toBeInTheDocument()
    const duties = within(modal).getByRole('region', { name: 'المهام والمسؤوليات' })
    expect(duties).toHaveTextContent('تصميم المواد')
    expect(duties).toHaveTextContent('مراجعة الهوية')
  })

  it('falls back to the old request type as the title, and shows no duties section, for an older request', () => {
    const modal = open({ id: 2, request_type: 'احتياج وظيفي عام', required_count: 1, status: 'pending' })

    expect(within(modal).getByText('احتياج وظيفي عام')).toBeInTheDocument()
    expect(within(modal).queryByRole('region', { name: 'المهام والمسؤوليات' })).not.toBeInTheDocument()
    expect(within(modal).getAllByText('—').length).toBeGreaterThanOrEqual(2) // no employment type, no qualification
  })
})
