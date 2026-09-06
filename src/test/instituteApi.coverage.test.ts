import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/api/axios'
import {
  instituteApi,
  type InstituteClassPayload,
  type InstituteLevelPayload,
  type InstituteAttendancePayload,
} from '@/api/instituteApi'

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

describe('student endpoints', () => {
  it('getPlacementTest GETs /institute/student/placement-test', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { questions: [] } })
    const res = await instituteApi.getPlacementTest()
    expect(mockedApi.get).toHaveBeenCalledWith('/institute/student/placement-test')
    expect(res.data).toEqual({ questions: [] })
  })

  it('startPlacementTest POSTs the start endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await instituteApi.startPlacementTest()
    expect(mockedApi.post).toHaveBeenCalledWith('/institute/student/placement-test/start')
  })

  it('submitPlacementTest POSTs the answers body', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const answers = { answers: [{ question_id: 1, choice: 'a' }] }
    await instituteApi.submitPlacementTest(answers)
    expect(mockedApi.post).toHaveBeenCalledWith('/institute/student/placement-test/submit', answers)
  })

  it('savePreferences POSTs preferences', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    const prefs = { preferred_time: 'مساءً' }
    await instituteApi.savePreferences(prefs)
    expect(mockedApi.post).toHaveBeenCalledWith('/institute/student/preferences', prefs)
  })

  it('validateCoupon POSTs the coupon body', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { valid: true } })
    await instituteApi.validateCoupon({ code: 'EMC2026' })
    expect(mockedApi.post).toHaveBeenCalledWith('/institute/student/coupon/validate', { code: 'EMC2026' })
  })

  it('checkout POSTs the checkout body', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await instituteApi.checkout({ pricing_option: 0 })
    expect(mockedApi.post).toHaveBeenCalledWith('/institute/student/checkout', { pricing_option: 0 })
  })

  it('getStudentDashboard GETs the dashboard', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await instituteApi.getStudentDashboard()
    expect(mockedApi.get).toHaveBeenCalledWith('/institute/student/dashboard')
  })
})

describe('admin level endpoints', () => {
  const levelPayload: InstituteLevelPayload = {
    title_en: 'Level 1',
    title_ar: 'المستوى الأول',
    description_ar: 'مستوى تمهيدي للمبتدئين',
    is_paid: true,
    price: 500,
    capacity: 25,
    pricing_options: [{ title: 'مستوى واحد', levels: 1, price: 500 }],
  }

  it('getLevels GETs the levels list', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { levels: [] } })
    const res = await instituteApi.getLevels()
    expect(mockedApi.get).toHaveBeenCalledWith('/institute/admin/levels')
    expect(res.data.levels).toEqual([])
  })

  it('getLevel GETs a single level by id', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { level: { id: 4, title_en: 'L4', class_groups_count: 2 } } })
    const res = await instituteApi.getLevel(4)
    expect(mockedApi.get).toHaveBeenCalledWith('/institute/admin/levels/4')
    expect(res.data.level.id).toBe(4)
  })

  it('createLevel POSTs the payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await instituteApi.createLevel(levelPayload)
    expect(mockedApi.post).toHaveBeenCalledWith('/institute/admin/levels', levelPayload)
  })

  it('updateLevel PUTs the payload to the level id', async () => {
    mockedApi.put.mockResolvedValueOnce({ data: {} })
    await instituteApi.updateLevel('4', levelPayload)
    expect(mockedApi.put).toHaveBeenCalledWith('/institute/admin/levels/4', levelPayload)
  })

  it('deleteLevel DELETEs the level', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await instituteApi.deleteLevel(4)
    expect(mockedApi.delete).toHaveBeenCalledWith('/institute/admin/levels/4')
  })
})

describe('admin class / waitlist / instructor endpoints', () => {
  const classPayload: InstituteClassPayload = {
    name: 'فصل المستوى الأول - أ',
    instructor_id: 7,
    capacity: 20,
    course_ids: [1, 2],
    schedule_day: 'السبت',
    schedule_time: '18:00',
  }

  it('getWaitlist GETs the waitlist', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { waitlist: [{ id: 1, name: 'ليلى' }] } })
    const res = await instituteApi.getWaitlist()
    expect(mockedApi.get).toHaveBeenCalledWith('/institute/admin/waitlist')
    expect(res.data.waitlist?.[0]?.name).toBe('ليلى')
  })

  it('runSmartDistribution POSTs auto-assign', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { assigned_count: 8, failed_count: 1 } })
    const res = await instituteApi.runSmartDistribution()
    expect(mockedApi.post).toHaveBeenCalledWith('/institute/admin/classes/auto-assign')
    expect(res.data.assigned_count).toBe(8)
  })

  it('getClasses / getClass hit the class routes', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { classes: [] } })
    await instituteApi.getClasses()
    expect(mockedApi.get).toHaveBeenCalledWith('/institute/admin/classes')

    mockedApi.get.mockResolvedValueOnce({ data: { class: { id: 3, name: 'فصل ب' } } })
    const res = await instituteApi.getClass(3)
    expect(mockedApi.get).toHaveBeenCalledWith('/institute/admin/classes/3')
    expect(res.data.class.name).toBe('فصل ب')
  })

  it('createClass / updateClass / deleteClass use POST / PUT / DELETE', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await instituteApi.createClass(classPayload)
    expect(mockedApi.post).toHaveBeenCalledWith('/institute/admin/classes', classPayload)

    mockedApi.put.mockResolvedValueOnce({ data: {} })
    await instituteApi.updateClass(3, classPayload)
    expect(mockedApi.put).toHaveBeenCalledWith('/institute/admin/classes/3', classPayload)

    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await instituteApi.deleteClass(3)
    expect(mockedApi.delete).toHaveBeenCalledWith('/institute/admin/classes/3')
  })

  it('getInstructors GETs the instructors list', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { instructors: [{ id: 7, user: { name: 'أستاذ كريم' } }] } })
    const res = await instituteApi.getInstructors()
    expect(mockedApi.get).toHaveBeenCalledWith('/institute/admin/instructors')
    expect(res.data.instructors?.[0]?.user?.name).toBe('أستاذ كريم')
  })
})

describe('teacher endpoints', () => {
  it('getTeacherClasses / getClassDetails hit the teacher routes', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await instituteApi.getTeacherClasses()
    expect(mockedApi.get).toHaveBeenCalledWith('/institute/teacher/classes')

    mockedApi.get.mockResolvedValueOnce({ data: {} })
    await instituteApi.getClassDetails(12)
    expect(mockedApi.get).toHaveBeenCalledWith('/institute/teacher/classes/12')
  })

  it('submitAttendance POSTs the attendance payload', async () => {
    const attendance: InstituteAttendancePayload = {
      students: [
        { id: 1, status: 'present' },
        { id: 2, status: 'absent' },
      ],
    }
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await instituteApi.submitAttendance(12, attendance)
    expect(mockedApi.post).toHaveBeenCalledWith('/institute/teacher/classes/12/attendance', attendance)
  })

  it('errors propagate to the caller (thin wrappers, no catch)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'))
    await expect(instituteApi.getTeacherClasses()).rejects.toThrow('Network Error')
  })
})
