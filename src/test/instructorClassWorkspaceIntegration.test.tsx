import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import InstructorClassWorkspacePage from '@/pages/lms/instructor/InstructorClassWorkspacePage'
import { fetchClassGroupDetail, type ClassGroupDetail } from '@/api/placementApi'
import { fetchCourseModules, fetchCourseMaterials, fetchCurriculumAnalytics } from '@/api/courseContentApi'

vi.mock('@/api/placementApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/placementApi')>('@/api/placementApi')
  return {
    ...actual,
    fetchClassGroupDetail: vi.fn(),
    fetchClassGroupStudents: vi.fn().mockResolvedValue([]),
    fetchClassGroupSessions: vi.fn().mockResolvedValue([]),
    fetchClassGroupAttendance: vi.fn().mockResolvedValue([]),
    fetchClassGroupAssignments: vi.fn().mockResolvedValue([]),
    fetchClassGroupAnnouncements: vi.fn().mockResolvedValue([]),
  }
})

vi.mock('@/api/courseContentApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/courseContentApi')>('@/api/courseContentApi')
  return {
    ...actual,
    fetchCourseModules: vi.fn().mockResolvedValue([]),
    fetchCourseMaterials: vi.fn().mockResolvedValue([]),
    fetchCurriculumAnalytics: vi.fn().mockResolvedValue({
      summary: { eligible_students: 0, not_started_students: 0, in_progress_students: 0, completed_students: 0,
        average_course_progress_percentage: 0, modules_count: 0, lessons_count: 0, materials_count: 0,
        downloads_count: 0, previews_count: 0, streams_count: 0 },
      modules: [], lessons: [], materials: [],
    }),
  }
})

const mockedDetail = vi.mocked(fetchClassGroupDetail)
const mockedModules = vi.mocked(fetchCourseModules)
const mockedMaterials = vi.mocked(fetchCourseMaterials)
const mockedAnalytics = vi.mocked(fetchCurriculumAnalytics)

const detail: ClassGroupDetail = {
  id: 5, name: 'الصف الأول', level_code: 'B1', status: 'active', capacity: 20,
  current_students_count: 10, available_seats: 10,
  course: { id: 77, title: 'اللغة الإنجليزية' },
  instructor: { id: 1, name: 'Instructor' },
  schedule: { start_date: null, day: null, time: null, mode: null },
  meeting_link: null,
  counts: { students: 10, sessions: 2, materials: 3, assignments: 1, attendance_records: 5, pending_reviews: 0, announcements: 0 },
  next_session: null,
  permissions: { edit: true, delete: true, manage_students: true, create_session: true, record_attendance: true, create_assignment: true, upload_material: true, send_announcement: true },
  attendance_summary: { attendance_percentage: 80, present: 8, absent: 1, late: 1, excused: 0 },
  progress_summary: { students_total: 10, students_completed: 3, average_progress_percentage: 42, at_risk_students: 1 },
}

function renderAtTab(tab: string) {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/instructor/classes/5/${tab}`]}>
      <Routes>
        <Route path="/dashboard/instructor/classes/:groupId/:tab" element={<InstructorClassWorkspacePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedDetail.mockResolvedValue(detail)
  mockedModules.mockResolvedValue([])
  mockedMaterials.mockResolvedValue([])
  mockedAnalytics.mockResolvedValue({
    summary: { eligible_students: 0, not_started_students: 0, in_progress_students: 0, completed_students: 0,
      average_course_progress_percentage: 0, modules_count: 0, lessons_count: 0, materials_count: 0,
      downloads_count: 0, previews_count: 0, streams_count: 0 },
    modules: [], lessons: [], materials: [],
  })
})

describe('InstructorClassWorkspacePage — Ticket 7 tab wiring', () => {
  it('renders the real Units management UI on the units tab, not a blocked placeholder', async () => {
    renderAtTab('units')
    await waitFor(() => expect(mockedModules).toHaveBeenCalledWith(77))
    // The old Ticket7BlockedTab copy must never appear for a completed area.
    expect(screen.queryByText(/غير مُفعّلة بعد/)).not.toBeInTheDocument()
    expect(screen.queryByText(/لم تُنشأ بعد في النظام/)).not.toBeInTheDocument()
  })

  it('renders the real Materials authoring UI on the materials tab, not the old read-only list', async () => {
    renderAtTab('materials')
    await waitFor(() => expect(mockedMaterials).toHaveBeenCalledWith(77))
    // The new tab shows filters that the old read-only list never had.
    await waitFor(() => expect(screen.getByText('كل الوحدات')).toBeInTheDocument())
  })

  it('renders curriculum analytics inside the analytics tab', async () => {
    renderAtTab('analytics')
    await waitFor(() => expect(mockedAnalytics).toHaveBeenCalledWith(5))
    await waitFor(() => expect(screen.getByText('تحليلات المنهج')).toBeInTheDocument())
  })

  it('renders the curriculum overview tab from real module data, not a placeholder', async () => {
    renderAtTab('curriculum')
    await waitFor(() => expect(mockedModules).toHaveBeenCalledWith(77))
    expect(screen.queryByText(/غير مُفعّلة بعد/)).not.toBeInTheDocument()
  })

  it('derives course_id from the loaded class detail rather than hardcoding it', async () => {
    renderAtTab('units')
    await waitFor(() => expect(mockedModules).toHaveBeenCalledWith(detail.course!.id))
  })
})
