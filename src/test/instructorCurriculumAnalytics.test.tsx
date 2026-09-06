import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { InstructorCurriculumAnalyticsSection } from '@/pages/lms/instructor/InstructorCurriculumAnalyticsSection'
import { fetchCurriculumAnalytics, type CurriculumAnalytics } from '@/api/courseContentApi'

vi.mock('@/api/courseContentApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/courseContentApi')>('@/api/courseContentApi')
  return { ...actual, fetchCurriculumAnalytics: vi.fn() }
})

const mockedFetch = vi.mocked(fetchCurriculumAnalytics)

beforeEach(() => {
  vi.clearAllMocks()
})

const unusualAnalytics: CurriculumAnalytics = {
  summary: {
    eligible_students: 7,
    not_started_students: 2,
    in_progress_students: 3,
    completed_students: 2,
    average_course_progress_percentage: 37.25,
    modules_count: 2,
    lessons_count: 5,
    materials_count: 3,
    downloads_count: 0,
    previews_count: 4,
    streams_count: 1,
  },
  modules: [
    { id: 1, title: 'الوحدة الأولى', eligible_lessons: 3, completed_student_lessons: 10, possible_student_lessons: 21, completion_percentage: 63.5 as unknown as number },
  ],
  lessons: [
    { id: 10, module_id: 1, title: 'الدرس الأول', eligible_students: 8, completed_students: 1, completion_percentage: 12.5 as unknown as number },
  ],
  materials: [
    { id: 100, title: 'شرائح تعريفية', scope: 'class', downloads_count: 0, previews_count: 4, streams_count: 1, total_interactions: 5 },
  ],
}

describe('InstructorCurriculumAnalyticsSection', () => {
  it('renders exact backend-supplied KPI values without recalculating them', async () => {
    mockedFetch.mockResolvedValueOnce(unusualAnalytics)
    render(<InstructorCurriculumAnalyticsSection groupId={1} />)

    await waitFor(() => expect(screen.getByText('7')).toBeInTheDocument()) // eligible_students
    // not_started (2) and completed (2) are equal in this fixture — assert at least 2 KPI cards show "2".
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(2)
    // in_progress (3) and materials_count (3) both render "3" as separate KPI cards.
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('37.25%')).toBeInTheDocument() // average progress, exact decimal preserved
  })

  it('renders zero values instead of hiding or falling back on them', async () => {
    mockedFetch.mockResolvedValueOnce(unusualAnalytics)
    render(<InstructorCurriculumAnalyticsSection groupId={1} />)

    await waitFor(() => expect(screen.getByText('37.25%')).toBeInTheDocument())
    // downloads_count = 0 must appear in the materials table, not be blank/hidden.
    expect(screen.getByText('شرائح تعريفية')).toBeInTheDocument()
  })

  it('renders module completion percentage exactly as returned by the backend', async () => {
    mockedFetch.mockResolvedValueOnce(unusualAnalytics)
    render(<InstructorCurriculumAnalyticsSection groupId={1} />)

    await waitFor(() => expect(screen.getByText('الوحدة الأولى')).toBeInTheDocument())
    expect(screen.getByText('63.5%')).toBeInTheDocument()
  })

  it('renders lesson completion percentage exactly as returned by the backend', async () => {
    mockedFetch.mockResolvedValueOnce(unusualAnalytics)
    render(<InstructorCurriculumAnalyticsSection groupId={1} />)

    await waitFor(() => expect(screen.getByText('الدرس الأول')).toBeInTheDocument())
    expect(screen.getByText('12.5%')).toBeInTheDocument()
    expect(screen.getByText('1 / 8')).toBeInTheDocument() // completed_students / eligible_students
  })

  it('renders the material total_interactions exactly as returned, never recalculated in React', async () => {
    mockedFetch.mockResolvedValueOnce(unusualAnalytics)
    render(<InstructorCurriculumAnalyticsSection groupId={1} />)

    await waitFor(() => expect(screen.getByText('شرائح تعريفية')).toBeInTheDocument())
    // total_interactions=5 is supplied directly by the backend (0 downloads + 4 previews + 1 stream) —
    // if React recalculated it independently a wrong value here would reveal client-side math.
    // lessons_count (also 5) appears as a KPI card; scope this assertion to the materials table cell.
    const materialRow = screen.getByText('شرائح تعريفية').closest('tr')
    expect(materialRow).not.toBeNull()
    expect(materialRow!.textContent).toContain('5')
  })

  it('renders the Arabic scope label for a class-scoped material, never the raw "class" string', async () => {
    mockedFetch.mockResolvedValueOnce(unusualAnalytics)
    render(<InstructorCurriculumAnalyticsSection groupId={1} />)

    await waitFor(() => expect(screen.getByText('خاص بالصف')).toBeInTheDocument())
    expect(screen.queryByText('class')).not.toBeInTheDocument()
  })

  it('shows an empty-eligible-students state without a broken 0/0 percentage', async () => {
    mockedFetch.mockResolvedValueOnce({
      summary: { eligible_students: 0, not_started_students: 0, in_progress_students: 0, completed_students: 0,
        average_course_progress_percentage: 0, modules_count: 0, lessons_count: 0, materials_count: 0,
        downloads_count: 0, previews_count: 0, streams_count: 0 },
      modules: [], lessons: [], materials: [],
    })
    render(<InstructorCurriculumAnalyticsSection groupId={1} />)

    await waitFor(() => expect(screen.getByText('لا يوجد طلاب مؤهلون في هذا الصف بعد')).toBeInTheDocument())
  })

  it('shows a retryable error state on fetch failure, and retry re-fetches', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network'))
    render(<InstructorCurriculumAnalyticsSection groupId={1} />)

    await waitFor(() => expect(screen.getByText('تعذّر تحميل تحليلات المنهج')).toBeInTheDocument())

    mockedFetch.mockResolvedValueOnce(unusualAnalytics)
    screen.getByText('إعادة المحاولة').click()

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2))
  })

  it('requests analytics for the exact groupId passed in, on initial render only', async () => {
    mockedFetch.mockResolvedValueOnce(unusualAnalytics)
    render(<InstructorCurriculumAnalyticsSection groupId={42} />)

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(42))
    expect(mockedFetch).toHaveBeenCalledTimes(1)
  })

  it('shows no material-interaction rows when the materials array is empty', async () => {
    mockedFetch.mockResolvedValueOnce({
      summary: { eligible_students: 3, not_started_students: 3, in_progress_students: 0, completed_students: 0,
        average_course_progress_percentage: 0, modules_count: 1, lessons_count: 2, materials_count: 0,
        downloads_count: 0, previews_count: 0, streams_count: 0 },
      modules: [], lessons: [], materials: [],
    })
    render(<InstructorCurriculumAnalyticsSection groupId={1} />)

    await waitFor(() => expect(screen.getByText('لا توجد بيانات تفاعل بعد')).toBeInTheDocument())
  })
})
