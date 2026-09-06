import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import apiClient from '@/api/axios'
import {
  ApiFieldError,
  CONTENT_STATUS_LABELS,
  MATERIAL_SCOPE_LABELS,
  MATERIAL_TYPE_LABELS,
  fieldErrorsFrom,
  toMaterialFormData,
  filterLessonsForModule,
  resolveLessonAfterModuleChange,
  resolveMaterialScopePayload,
  scopeChoiceFromMaterial,
  fetchCourseModules,
  createCourseModule,
  reorderCourseModules,
  createLesson,
  reorderLessons,
  fetchCourseMaterials,
  createCourseMaterial,
  updateCourseMaterial,
  deleteCourseMaterial,
  downloadCourseMaterial,
  fetchAuthenticatedPreviewBlobUrl,
  fetchCurriculumAnalytics,
  type CourseModuleRow,
  type CourseMaterialRow,
} from '@/api/courseContentApi'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(apiClient, true)

beforeEach(() => {
  vi.clearAllMocks()
})

/* ── Arabic labels — no raw English scope/status/type should reach the UI ── */

describe('Arabic label maps', () => {
  it('provides Arabic labels for every content status', () => {
    expect(CONTENT_STATUS_LABELS.active).toBe('نشط')
    expect(CONTENT_STATUS_LABELS.inactive).toBe('غير نشط')
    expect(CONTENT_STATUS_LABELS.draft).toBe('مسودة')
  })

  it('provides Arabic labels for every material scope', () => {
    expect(MATERIAL_SCOPE_LABELS.course).toBe('على مستوى الدورة')
    expect(MATERIAL_SCOPE_LABELS.module).toBe('مرتبط بالوحدة')
    expect(MATERIAL_SCOPE_LABELS.lesson).toBe('مرتبط بالدرس')
    expect(MATERIAL_SCOPE_LABELS.session).toBe('مرتبط بالجلسة')
    expect(MATERIAL_SCOPE_LABELS.class).toBe('خاص بالصف')
  })

  it('provides Arabic labels for every real backend material type', () => {
    // These are exactly the types MaterialType enum / CourseContentController validation supports.
    const expectedTypes = ['document', 'pdf', 'image', 'video', 'link', 'file', 'slides', 'audio', 'other']
    for (const t of expectedTypes) {
      expect(MATERIAL_TYPE_LABELS[t]).toBeTruthy()
      expect(MATERIAL_TYPE_LABELS[t]).not.toMatch(/^[a-zA-Z]/) // never a raw English label
    }
  })
})

/* ── ApiFieldError mapping (422 → ApiFieldError, everything else passes through) ── */

describe('fieldErrorsFrom / ApiFieldError mapping', () => {
  it('extracts field errors from a real Laravel 422 response shape', () => {
    const err = {
      response: {
        status: 422,
        data: {
          message: 'The given data was invalid.',
          errors: {
            title: ['العنوان مطلوب'],
            lesson_id: ['الدرس غير متوافق مع الوحدة'],
          },
        },
      },
    }
    const errors = fieldErrorsFrom(err)
    expect(errors).toEqual({
      title: ['العنوان مطلوب'],
      lesson_id: ['الدرس غير متوافق مع الوحدة'],
    })
  })

  it('returns null for a non-422 error (does not misclassify)', () => {
    expect(fieldErrorsFrom({ response: { status: 500, data: {} } })).toBeNull()
    expect(fieldErrorsFrom({ response: { status: 403, data: { errors: { x: ['y'] } } } })).toBeNull()
  })

  it('returns null for a network error with no response object', () => {
    expect(fieldErrorsFrom(new Error('Network Error'))).toBeNull()
  })

  it('createCourseModule throws ApiFieldError (not a generic Error) on 422, preserving both field arrays', async () => {
    mockedApi.post.mockRejectedValueOnce({
      response: { status: 422, data: { errors: { title: ['مطلوب'], status: ['غير صالح'] } } },
    })

    try {
      await createCourseModule(1, { title: '' })
      expect.unreachable('expected createCourseModule to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiFieldError)
      expect((err as ApiFieldError).errors).toEqual({ title: ['مطلوب'], status: ['غير صالح'] })
    }
  })

  it('an unrelated network error is NOT converted into ApiFieldError', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Network Error'))
    await expect(createCourseModule(1, { title: 'x' })).rejects.not.toBeInstanceOf(ApiFieldError)
  })
})

/* ── FormData construction (materials) ── */

describe('toMaterialFormData — zero-value and scope preservation', () => {
  function fdEntries(fd: FormData): Record<string, FormDataEntryValue> {
    const out: Record<string, FormDataEntryValue> = {}
    fd.forEach((v, k) => { out[k] = v })
    return out
  }

  it('preserves sort_order = 0, does not drop it as falsy', () => {
    const fd = toMaterialFormData({ title: 'x', sort_order: 0 } as never)
    expect(fdEntries(fd).sort_order).toBe('0')
  })

  it('serializes is_visible = false as "0", not omitted (Laravel boolean convention)', () => {
    const fd = toMaterialFormData({ title: 'x', is_visible: false })
    expect(fdEntries(fd).is_visible).toBe('0')
  })

  it('serializes is_visible = true as "1"', () => {
    const fd = toMaterialFormData({ title: 'x', is_visible: true })
    expect(fdEntries(fd).is_visible).toBe('1')
  })

  it('omits null/undefined/empty-string FK fields entirely rather than sending empty strings', () => {
    const fd = toMaterialFormData({
      title: 'x', module_id: null, lesson_id: undefined, class_group_id: null, session_id: null, course_session_id: null,
    })
    const entries = fdEntries(fd)
    expect(entries.module_id).toBeUndefined()
    expect(entries.lesson_id).toBeUndefined()
    expect(entries.class_group_id).toBeUndefined()
    expect(entries.session_id).toBeUndefined()
    expect(entries.course_session_id).toBeUndefined()
  })

  it('course-wide material payload includes no class_group_id at all', () => {
    const payload = resolveMaterialScopePayload('course', '', '', 99)
    const fd = toMaterialFormData({ title: 'x', ...payload })
    expect(fdEntries(fd).class_group_id).toBeUndefined()
  })

  it('module-scoped material payload includes only module_id', () => {
    const payload = resolveMaterialScopePayload('module', 5, '', 99)
    const fd = toMaterialFormData({ title: 'x', ...payload })
    const entries = fdEntries(fd)
    expect(entries.module_id).toBe('5')
    expect(entries.lesson_id).toBeUndefined()
    expect(entries.class_group_id).toBeUndefined()
  })

  it('lesson-scoped material payload includes both module_id and lesson_id', () => {
    const payload = resolveMaterialScopePayload('lesson', 5, 12, 99)
    const fd = toMaterialFormData({ title: 'x', ...payload })
    const entries = fdEntries(fd)
    expect(entries.module_id).toBe('5')
    expect(entries.lesson_id).toBe('12')
  })

  it('class-scoped material payload includes only class_group_id, never module/lesson', () => {
    const payload = resolveMaterialScopePayload('class', '', '', 99)
    const fd = toMaterialFormData({ title: 'x', ...payload })
    const entries = fdEntries(fd)
    expect(entries.class_group_id).toBe('99')
    expect(entries.module_id).toBeUndefined()
    expect(entries.lesson_id).toBeUndefined()
  })

  it('includes the file only when one is supplied', () => {
    const withoutFile = toMaterialFormData({ title: 'x' })
    expect(fdEntries(withoutFile).file).toBeUndefined()

    const file = new File(['content'], 'slides.pdf', { type: 'application/pdf' })
    const withFile = toMaterialFormData({ title: 'x', file })
    expect(withFile.get('file')).toBe(file)
  })
})

/* ── Scope/lesson dependency helpers ── */

describe('filterLessonsForModule / resolveLessonAfterModuleChange', () => {
  const modules: CourseModuleRow[] = [
    { id: 1, course_id: 10, title: 'M1', description: null, status: 'active', sort_order: 0, is_active: true,
      lessons: [
        { id: 100, module_id: 1, title: 'L1', description: null, content: null, video_url: null, duration_minutes: null, status: 'active', sort_order: 0 },
        { id: 101, module_id: 1, title: 'L2', description: null, content: null, video_url: null, duration_minutes: null, status: 'active', sort_order: 1 },
      ] },
    { id: 2, course_id: 10, title: 'M2', description: null, status: 'active', sort_order: 1, is_active: true,
      lessons: [
        { id: 200, module_id: 2, title: 'L3', description: null, content: null, video_url: null, duration_minutes: null, status: 'active', sort_order: 0 },
      ] },
  ]

  it('returns only lessons belonging to the selected module', () => {
    const lessons = filterLessonsForModule(modules, 1)
    expect(lessons.map((l) => l.id)).toEqual([100, 101])
  })

  it('excludes lessons from another module', () => {
    const lessons = filterLessonsForModule(modules, 1)
    expect(lessons.some((l) => l.id === 200)).toBe(false)
  })

  it('returns an empty array when no module is selected', () => {
    expect(filterLessonsForModule(modules, '')).toEqual([])
  })

  it('clears an incompatible lesson when the module changes', () => {
    // Lesson 100 belongs to module 1 — switching to module 2 must clear it.
    expect(resolveLessonAfterModuleChange(modules, 2, 100)).toBe('')
  })

  it('preserves a compatible lesson when switching to the same module', () => {
    expect(resolveLessonAfterModuleChange(modules, 1, 100)).toBe(100)
  })

  it('preserves a lesson that legitimately belongs to the newly selected module', () => {
    expect(resolveLessonAfterModuleChange(modules, 2, 200)).toBe(200)
  })
})

describe('scopeChoiceFromMaterial (inverse mapping)', () => {
  it('derives "class" when class_group_id is set, regardless of other FKs', () => {
    expect(scopeChoiceFromMaterial({ class_group_id: 5, lesson_id: 9, module_id: 3 })).toBe('class')
  })
  it('derives "lesson" when lesson_id is set and no class', () => {
    expect(scopeChoiceFromMaterial({ class_group_id: null, lesson_id: 9, module_id: 3 })).toBe('lesson')
  })
  it('derives "module" when only module_id is set', () => {
    expect(scopeChoiceFromMaterial({ class_group_id: null, lesson_id: null, module_id: 3 })).toBe('module')
  })
  it('derives "course" when nothing is set', () => {
    expect(scopeChoiceFromMaterial({ class_group_id: null, lesson_id: null, module_id: null })).toBe('course')
  })
})

/* ── API call shape (route/method assertions against the mocked apiClient) ── */

describe('API call shapes', () => {
  it('fetchCourseModules calls GET /instructor/courses/{course}/modules', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fetchCourseModules(7)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/courses/7/modules', expect.anything())
  })

  it('reorderCourseModules posts to the reorder endpoint with the full ordered id list', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await reorderCourseModules(7, [3, 1, 2])
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/courses/7/modules/reorder', { ids: [3, 1, 2] })
  })

  it('reorderLessons posts to the module-scoped lesson-reorder endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })
    await reorderLessons(7, 5, [101, 100])
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/courses/7/modules/5/lessons/reorder', { ids: [101, 100] })
  })

  it('createLesson posts to the course-scoped lessons endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await createLesson(7, { module_id: 5, title: 'New' })
    expect(mockedApi.post).toHaveBeenCalledWith('/instructor/courses/7/lessons', { module_id: 5, title: 'New' })
  })

  it('fetchCourseMaterials calls GET /instructor/courses/{course}/materials', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await fetchCourseMaterials(7)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/courses/7/materials', expect.anything())
  })

  it('createCourseMaterial posts multipart FormData to the course-scoped materials endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await createCourseMaterial(7, { title: 'Slides' })
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/instructor/courses/7/materials',
      expect.any(FormData),
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'multipart/form-data' }) }),
    )
  })

  it('updateCourseMaterial uses method-spoofing (_method=PUT) via POST for multipart compatibility', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { data: {} } })
    await updateCourseMaterial(42, { title: 'Updated' })
    const [url, fd] = mockedApi.post.mock.calls[0] as [string, FormData]
    expect(url).toBe('/instructor/materials/42')
    expect(fd.get('_method')).toBe('PUT')
  })

  it('deleteCourseMaterial calls DELETE /instructor/materials/{id}', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteCourseMaterial(42)
    expect(mockedApi.delete).toHaveBeenCalledWith('/instructor/materials/42')
  })

  it('fetchCurriculumAnalytics calls GET /instructor/classes/{group}/curriculum/analytics', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { data: { summary: {}, modules: [], lessons: [], materials: [] } } })
    await fetchCurriculumAnalytics(9)
    expect(mockedApi.get).toHaveBeenCalledWith('/instructor/classes/9/curriculum/analytics', expect.anything())
  })
})

/* ── Authenticated blob preview/download (never an unauthenticated raw URL) ── */

describe('authenticated blob helpers', () => {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('fetchAuthenticatedPreviewBlobUrl fetches through the authenticated apiClient as a blob, not a raw URL', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['pdf-bytes']) })
    const url = await fetchAuthenticatedPreviewBlobUrl(5, 'preview')
    expect(mockedApi.get).toHaveBeenCalledWith('/materials/5/preview', expect.objectContaining({ responseType: 'blob' }))
    expect(url).toBe('blob:mock-url')
  })

  it('fetchAuthenticatedPreviewBlobUrl requests the stream endpoint for video kind', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['video-bytes']) })
    await fetchAuthenticatedPreviewBlobUrl(5, 'stream')
    expect(mockedApi.get).toHaveBeenCalledWith('/materials/5/stream', expect.objectContaining({ responseType: 'blob' }))
  })

  it('downloadCourseMaterial fetches an authenticated blob and uses the original filename', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['file-bytes']) })
    const material: CourseMaterialRow = {
      id: 1, course_id: 1, class_group_id: null, module_id: null, lesson_id: null, session_id: null, course_session_id: null,
      title: 'Slides', description: null, type: 'pdf', mime_type: 'application/pdf', original_filename: 'lecture-1.pdf',
      size_human: '1 MB', is_visible: true, sort_order: 0, scope: 'course', preview_url: null, download_url: '/materials/1/download', external_url: null,
    }

    const appendSpy = vi.spyOn(document.body, 'appendChild')
    await downloadCourseMaterial(material)

    expect(mockedApi.get).toHaveBeenCalledWith('/materials/1/download', expect.objectContaining({ responseType: 'blob' }))
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(appendSpy).toHaveBeenCalled()
    appendSpy.mockRestore()
  })
})
