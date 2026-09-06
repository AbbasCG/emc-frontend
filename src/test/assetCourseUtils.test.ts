import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Course } from '@/types'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import {
  ONE_SESSION_WORKSHOP_UI,
  ONE_SESSION_WORKSHOP_DURATION_AR,
  isOneSessionWorkshop,
  sessionFormatFromApi,
  sessionFormatToApi,
  programTypeForPayload,
  resolveCourseDisplayDuration,
} from '@/utils/courseDuration'
import {
  getCourseInstructor,
  instructorLookupMapFromAssignableRows,
  resolvePublicCourseInstructor,
  applyAssignedInstructorToCourse,
  type CourseInstructorLookupRow,
} from '@/utils/courseInstructor'

/**
 * `resolvePublicAssetUrl` reads Vite env at call time, so every test pins the
 * env explicitly rather than inheriting whatever `.env` the developer has.
 */
function stubBase(over: Partial<Record<string, string>> = {}): void {
  const env = {
    VITE_PUBLIC_URL: '',
    VITE_APP_URL: '',
    VITE_API_URL: 'https://api.emc.test/api',
    VITE_API_BASE_URL: '',
    ...over,
  }
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
}

const makeCourse = (over: Record<string, unknown> = {}): Course =>
  ({
    id: 1,
    title: 'دورة تجريبية',
    slug: 'test-course',
    type: 'free',
    price: 0,
    is_online: true,
    ...over,
  }) as unknown as Course

beforeEach(() => {
  stubBase()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

// ── mediaUrl ─────────────────────────────────────────────────────────────────

describe('resolvePublicAssetUrl', () => {
  it('returns null for nullish input', () => {
    expect(resolvePublicAssetUrl(null)).toBeNull()
    expect(resolvePublicAssetUrl(undefined)).toBeNull()
  })

  it('returns null for empty, whitespace-only and em-dash placeholders', () => {
    expect(resolvePublicAssetUrl('')).toBeNull()
    expect(resolvePublicAssetUrl('   ')).toBeNull()
    expect(resolvePublicAssetUrl('—')).toBeNull()
  })

  it('passes an already-absolute URL through untouched, whatever the base is', () => {
    expect(resolvePublicAssetUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
    expect(resolvePublicAssetUrl('http://cdn.example.com/a.png')).toBe('http://cdn.example.com/a.png')
    expect(resolvePublicAssetUrl('HTTPS://CDN.EXAMPLE.COM/A.PNG')).toBe('HTTPS://CDN.EXAMPLE.COM/A.PNG')
  })

  it('strips the /api segment from the API base to build a storage URL', () => {
    expect(resolvePublicAssetUrl('/storage/courses/1.jpg')).toBe(
      'https://api.emc.test/storage/courses/1.jpg',
    )
  })

  it('adds the missing leading slash to a relative path', () => {
    expect(resolvePublicAssetUrl('storage/courses/1.jpg')).toBe(
      'https://api.emc.test/storage/courses/1.jpg',
    )
  })

  it('trims surrounding whitespace before resolving', () => {
    expect(resolvePublicAssetUrl('  /storage/a.png  ')).toBe('https://api.emc.test/storage/a.png')
  })

  it('tolerates a trailing slash on the API base', () => {
    stubBase({ VITE_API_URL: 'https://api.emc.test/api/' })
    expect(resolvePublicAssetUrl('/storage/a.png')).toBe('https://api.emc.test/storage/a.png')
  })

  it('prefers VITE_PUBLIC_URL over VITE_APP_URL and VITE_API_URL', () => {
    stubBase({ VITE_PUBLIC_URL: 'https://cdn.emc.test', VITE_APP_URL: 'https://app.emc.test' })
    expect(resolvePublicAssetUrl('/storage/a.png')).toBe('https://cdn.emc.test/storage/a.png')
  })

  it('falls back to VITE_APP_URL when VITE_PUBLIC_URL is blank', () => {
    stubBase({ VITE_PUBLIC_URL: '   ', VITE_APP_URL: 'https://app.emc.test' })
    expect(resolvePublicAssetUrl('/storage/a.png')).toBe('https://app.emc.test/storage/a.png')
  })

  it('assumes https:// for a scheme-less host', () => {
    stubBase({ VITE_PUBLIC_URL: 'cdn.emc.test' })
    expect(resolvePublicAssetUrl('/storage/a.png')).toBe('https://cdn.emc.test/storage/a.png')
  })

  it('keeps a non-/api sub-path in the base', () => {
    stubBase({ VITE_PUBLIC_URL: 'https://cdn.emc.test/assets' })
    expect(resolvePublicAssetUrl('/a.png')).toBe('https://cdn.emc.test/assets/a.png')
  })

  it('returns a root-relative path when no base URL is configured at all', () => {
    stubBase({ VITE_API_URL: '' })
    expect(resolvePublicAssetUrl('/storage/a.png')).toBe('/storage/a.png')
    expect(resolvePublicAssetUrl('storage/a.png')).toBe('/storage/a.png')
  })

  it('degrades to a root-relative path when the configured base is unparseable', () => {
    stubBase({ VITE_PUBLIC_URL: 'not a valid host' })
    expect(resolvePublicAssetUrl('/storage/a.png')).toBe('/storage/a.png')
  })
})

// ── courseDuration ───────────────────────────────────────────────────────────

describe('isOneSessionWorkshop', () => {
  it('detects the one-session program types', () => {
    expect(isOneSessionWorkshop(makeCourse({ program_type: 'one_session' }))).toBe(true)
    expect(isOneSessionWorkshop(makeCourse({ program_type: 'ONE_SESSION' }))).toBe(true)
    expect(isOneSessionWorkshop(makeCourse({ program_type: 'workshop_one_session' }))).toBe(true)
  })

  it('detects the one-session session formats', () => {
    expect(isOneSessionWorkshop(makeCourse({ session_format: 'workshop_single_session' }))).toBe(true)
    expect(isOneSessionWorkshop(makeCourse({ session_format: 'WORKSHOP_ONE_SESSION' }))).toBe(true)
    expect(isOneSessionWorkshop(makeCourse({ session_format: 'special_one_session_x' }))).toBe(true)
  })

  it('detects the Arabic "لقاء واحد" label inside the session format', () => {
    expect(isOneSessionWorkshop(makeCourse({ session_format: 'ورشة / لقاء واحد' }))).toBe(true)
  })

  it('detects one-session via program_kind and catalog_kind', () => {
    expect(isOneSessionWorkshop(makeCourse({ program_kind: 'workshop_one_session' }))).toBe(true)
    expect(isOneSessionWorkshop(makeCourse(), { catalog_kind: 'one_session' })).toBe(true)
  })

  it('reads the extra payload when the course itself carries nothing', () => {
    expect(isOneSessionWorkshop(makeCourse(), { program_type: 'one_session' })).toBe(true)
    expect(isOneSessionWorkshop(makeCourse(), { session_format: 'workshop_single_session' })).toBe(true)
  })

  it('returns false for a normal multi-day course and for an empty record', () => {
    expect(isOneSessionWorkshop(makeCourse({ program_type: 'course', session_format: 'online' }))).toBe(false)
    expect(isOneSessionWorkshop({})).toBe(false)
    expect(isOneSessionWorkshop(makeCourse({ program_type: null, session_format: null }))).toBe(false)
  })
})

describe('sessionFormatFromApi', () => {
  it('maps every one-session marker onto the wizard label', () => {
    expect(sessionFormatFromApi('workshop_single_session')).toBe(ONE_SESSION_WORKSHOP_UI)
    expect(sessionFormatFromApi('WORKSHOP_ONE_SESSION')).toBe(ONE_SESSION_WORKSHOP_UI)
    expect(sessionFormatFromApi(null, 'one_session')).toBe(ONE_SESSION_WORKSHOP_UI)
    expect(sessionFormatFromApi('ورشة لقاء واحد فقط')).toBe(ONE_SESSION_WORKSHOP_UI)
  })

  it('falls back to the multi-day label for delivery-mode values', () => {
    expect(sessionFormatFromApi('online')).toBe('دورة متعددة الأيام')
    expect(sessionFormatFromApi('offline')).toBe('دورة متعددة الأيام')
    expect(sessionFormatFromApi('hybrid')).toBe('دورة متعددة الأيام')
  })

  it('falls back to the multi-day label for empty and nullish input', () => {
    expect(sessionFormatFromApi()).toBe('دورة متعددة الأيام')
    expect(sessionFormatFromApi(null)).toBe('دورة متعددة الأيام')
    expect(sessionFormatFromApi('')).toBe('دورة متعددة الأيام')
    expect(sessionFormatFromApi('   ')).toBe('دورة متعددة الأيام')
  })

  it('passes an unrecognised custom Arabic format straight through', () => {
    expect(sessionFormatFromApi('برنامج كامل')).toBe('برنامج كامل')
  })
})

describe('sessionFormatToApi', () => {
  it('maps the wizard label onto the Laravel enum', () => {
    expect(sessionFormatToApi(ONE_SESSION_WORKSHOP_UI)).toBe('workshop_single_session')
  })

  it('omits the field for every other label', () => {
    expect(sessionFormatToApi('دورة متعددة الأيام')).toBeUndefined()
    expect(sessionFormatToApi('')).toBeUndefined()
  })
})

describe('programTypeForPayload', () => {
  it('maps a workshop kind to one_session regardless of format', () => {
    expect(programTypeForPayload('workshop', 'online')).toBe('one_session')
  })

  it('maps the one-session wizard format to one_session even for a course kind', () => {
    expect(programTypeForPayload('course', ONE_SESSION_WORKSHOP_UI)).toBe('one_session')
  })

  it('maps the full-programme format to full_program', () => {
    expect(programTypeForPayload('course', 'برنامج كامل')).toBe('full_program')
  })

  it('maps program and track kinds to full_program', () => {
    expect(programTypeForPayload('program', 'online')).toBe('full_program')
    expect(programTypeForPayload('track', 'online')).toBe('full_program')
  })

  it('defaults to course for a plain course and for unknown kinds', () => {
    expect(programTypeForPayload('course', 'دورة متعددة الأيام')).toBe('course')
    expect(programTypeForPayload('mystery', 'online')).toBe('course')
    expect(programTypeForPayload('', '')).toBe('course')
  })
})

describe('resolveCourseDisplayDuration', () => {
  it('always shows "1 يوم" for a one-session workshop, overriding any stored duration', () => {
    expect(
      resolveCourseDisplayDuration(makeCourse({ program_type: 'one_session', duration: '6 أسابيع' })),
    ).toBe(ONE_SESSION_WORKSHOP_DURATION_AR)
    expect(ONE_SESSION_WORKSHOP_DURATION_AR).toBe('1 يوم')
  })

  it('prefers the explicit duration and trims it', () => {
    expect(resolveCourseDisplayDuration(makeCourse({ duration: '  6 أسابيع  ' }))).toBe('6 أسابيع')
  })

  it('falls back to the backend computed label when the duration is blank', () => {
    expect(
      resolveCourseDisplayDuration(makeCourse({ duration: '   ' }), { computed_duration_label: '8 أسابيع' }),
    ).toBe('8 أسابيع')
  })

  it('reads the computed label off the course itself when no extra is given', () => {
    expect(resolveCourseDisplayDuration(makeCourse({ computed_duration_label: '3 أشهر' }))).toBe('3 أشهر')
  })

  it('falls back to the caller-calculated value, trimmed', () => {
    expect(resolveCourseDisplayDuration(makeCourse(), undefined, '  ساعتان  ')).toBe('ساعتان')
  })

  it('returns an empty string when nothing at all is known', () => {
    expect(resolveCourseDisplayDuration(makeCourse())).toBe('')
    expect(resolveCourseDisplayDuration(makeCourse({ duration: null }), {}, undefined)).toBe('')
  })

  it('ignores a non-string duration value', () => {
    expect(resolveCourseDisplayDuration(makeCourse({ duration: 6 as unknown as string }), {}, 'احتياطي')).toBe(
      'احتياطي',
    )
  })
})

// ── courseInstructor ─────────────────────────────────────────────────────────

describe('getCourseInstructor', () => {
  it('reads the nested instructor name', () => {
    const r = getCourseInstructor(makeCourse({ instructor: { id: 3, name: 'أ. سارة' } }))
    expect(r.displayName).toBe('أ. سارة')
  })

  it('falls back to the flat instructor_name', () => {
    expect(getCourseInstructor(makeCourse({ instructor_name: 'أ. خالد' })).displayName).toBe('أ. خالد')
  })

  it('reads alternative relation names (assigned_instructor, teacher, trainer)', () => {
    expect(getCourseInstructor(makeCourse({ assigned_instructor: { name: 'أ. ليلى' } })).displayName).toBe('أ. ليلى')
    expect(getCourseInstructor(makeCourse({ teacher: { name: 'أ. عمر' } })).displayName).toBe('أ. عمر')
    expect(getCourseInstructor(makeCourse({ trainer: { name: 'أ. هند' } })).displayName).toBe('أ. هند')
  })

  it('prefers the nested name over the flat one', () => {
    const r = getCourseInstructor(
      makeCourse({ instructor: { id: 3, name: 'المُتداخل' }, instructor_name: 'المسطح' }),
    )
    expect(r.displayName).toBe('المُتداخل')
  })

  it('returns the "no instructor" label when nothing is assigned', () => {
    const r = getCourseInstructor(makeCourse())
    expect(r.displayName).toBe('بدون مدرب')
    expect(r.email).toBeNull()
    expect(r.avatarUrl).toBeNull()
  })

  it('honours a custom empty label', () => {
    expect(getCourseInstructor(makeCourse(), { emptyLabel: 'لم يُعيَّن بعد' }).displayName).toBe('لم يُعيَّن بعد')
  })

  it('treats blank and em-dash names as absent', () => {
    expect(getCourseInstructor(makeCourse({ instructor_name: '   ' })).displayName).toBe('بدون مدرب')
    expect(getCourseInstructor(makeCourse({ instructor_name: '—' })).displayName).toBe('بدون مدرب')
  })

  it('never exposes a raw numeric id — an unresolved assignment gets a label', () => {
    const r = getCourseInstructor(makeCourse({ instructor_id: 7 }))
    expect(r.displayName).toBe('مدرب مسند')
    expect(r.displayName).not.toMatch(/#?\d/)
  })

  it('honours a custom assigned-without-name label', () => {
    expect(
      getCourseInstructor(makeCourse({ instructor_id: 7 }), { assignedWithoutNameLabel: 'مُسند' }).displayName,
    ).toBe('مُسند')
  })

  it('treats a zero or negative instructor_id as no assignment', () => {
    expect(getCourseInstructor(makeCourse({ instructor_id: 0 })).displayName).toBe('بدون مدرب')
    expect(getCourseInstructor(makeCourse({ instructor_id: -3 })).displayName).toBe('بدون مدرب')
    expect(getCourseInstructor(makeCourse({ instructor_id: null })).displayName).toBe('بدون مدرب')
  })

  it('resolves the name, email and avatar from the admin lookup map', () => {
    const lookup = instructorLookupMapFromAssignableRows([
      { id: 7, name: 'أ. منى', email: 'mona@emc.test', avatar_url: '/storage/a.png' },
    ])
    const r = getCourseInstructor(makeCourse({ instructor_id: 7 }), { lookupByInstructorId: lookup })
    expect(r.displayName).toBe('أ. منى')
    expect(r.email).toBe('mona@emc.test')
    expect(r.avatarUrl).toBe('/storage/a.png')
  })

  it('keeps the nested name but still takes the email from the lookup row', () => {
    const lookup = instructorLookupMapFromAssignableRows([
      { id: 7, name: 'اسم الجدول', email: 'row@emc.test' },
    ])
    const r = getCourseInstructor(makeCourse({ instructor_id: 7, instructor_name: 'الاسم المرفق' }), {
      lookupByInstructorId: lookup,
    })
    expect(r.displayName).toBe('الاسم المرفق')
    expect(r.email).toBe('row@emc.test')
  })

  it('falls back to the assigned label when the lookup has no matching row', () => {
    const lookup = instructorLookupMapFromAssignableRows([{ id: 99, name: 'شخص آخر' }])
    expect(
      getCourseInstructor(makeCourse({ instructor_id: 7 }), { lookupByInstructorId: lookup }).displayName,
    ).toBe('مدرب مسند')
  })

  it('prefers the course image over the lookup avatar', () => {
    const lookup = instructorLookupMapFromAssignableRows([
      { id: 7, name: 'أ. منى', avatar_url: '/storage/from-lookup.png' },
    ])
    const r = getCourseInstructor(
      makeCourse({ instructor_id: 7, instructor: { id: 7, name: 'أ. منى', image: '/storage/from-course.png' } }),
      { lookupByInstructorId: lookup },
    )
    expect(r.avatarUrl).toBe('/storage/from-course.png')
  })

  it('marks a course as assigned when the nested instructor carries a positive id', () => {
    expect(
      getCourseInstructor(makeCourse({ instructor: { id: 9, name: '' } })).displayName,
    ).toBe('مدرب مسند')
  })
})

describe('instructorLookupMapFromAssignableRows', () => {
  it('keys rows by their instructor id', () => {
    const m = instructorLookupMapFromAssignableRows([
      { id: 1, name: 'أ' },
      { id: 2, name: 'ب' },
    ])
    expect(m.size).toBe(2)
    expect(m.get(2)?.name).toBe('ب')
  })

  it('drops rows with a non-positive or non-finite id', () => {
    const rows = [
      { id: 0, name: 'صفر' },
      { id: -5, name: 'سالب' },
      { id: Number.NaN, name: 'غير رقم' },
      { id: 4, name: 'صالح' },
    ] as CourseInstructorLookupRow[]
    const m = instructorLookupMapFromAssignableRows(rows)
    expect([...m.keys()]).toEqual([4])
  })

  it('returns an empty map for an empty list', () => {
    expect(instructorLookupMapFromAssignableRows([]).size).toBe(0)
  })

  it('lets a later duplicate row win', () => {
    const m = instructorLookupMapFromAssignableRows([
      { id: 1, name: 'الأول' },
      { id: 1, name: 'الأخير' },
    ])
    expect(m.get(1)?.name).toBe('الأخير')
  })
})

describe('resolvePublicCourseInstructor', () => {
  it('prefers instructor.user.name over every other name source', () => {
    const r = resolvePublicCourseInstructor(
      makeCourse({
        instructor: { id: 3, name: 'اسم المدرب', user: { name: 'اسم المستخدم' } },
        instructor_name: 'الاسم المسطح',
      }),
    )
    expect(r.name).toBe('اسم المستخدم')
    expect(r.assigned).toBe(true)
  })

  it('falls back through instructor.name and instructor_name', () => {
    expect(resolvePublicCourseInstructor(makeCourse({ instructor: { id: 3, name: 'أ. سارة' } })).name).toBe('أ. سارة')
    expect(resolvePublicCourseInstructor(makeCourse({ instructor_name: 'أ. خالد' })).name).toBe('أ. خالد')
  })

  it('reads a top-level instructor_user record', () => {
    const r = resolvePublicCourseInstructor(
      makeCourse({ instructor_user: { name: 'أ. ريم', email: 'reem@emc.test' } }),
    )
    expect(r.name).toBe('أ. ريم')
    expect(r.email).toBe('reem@emc.test')
  })

  it('prefers the user email, then the instructor email, then the flat field', () => {
    expect(
      resolvePublicCourseInstructor(
        makeCourse({
          instructor: { id: 1, email: 'ins@emc.test', user: { email: 'user@emc.test' } },
          instructor_email: 'flat@emc.test',
        }),
      ).email,
    ).toBe('user@emc.test')
    expect(
      resolvePublicCourseInstructor(
        makeCourse({ instructor: { id: 1, email: 'ins@emc.test' }, instructor_email: 'flat@emc.test' }),
      ).email,
    ).toBe('ins@emc.test')
    expect(resolvePublicCourseInstructor(makeCourse({ instructor_email: 'flat@emc.test' })).email).toBe(
      'flat@emc.test',
    )
  })

  it('resolves the title from title, job_title or the flat field', () => {
    expect(resolvePublicCourseInstructor(makeCourse({ instructor: { id: 1, job_title: 'مدرب أول' } })).title).toBe(
      'مدرب أول',
    )
    expect(resolvePublicCourseInstructor(makeCourse({ instructor_title: 'خبير' })).title).toBe('خبير')
  })

  it('resolves the bio from bio, about, description or the flat field', () => {
    expect(resolvePublicCourseInstructor(makeCourse({ instructor: { id: 1, about: 'نبذة' } })).bio).toBe('نبذة')
    expect(resolvePublicCourseInstructor(makeCourse({ instructor: { id: 1, description: 'وصف' } })).bio).toBe('وصف')
    expect(resolvePublicCourseInstructor(makeCourse({ instructor_bio: 'سيرة' })).bio).toBe('سيرة')
  })

  it('builds an absolute avatar URL from any of the nested image keys', () => {
    expect(
      resolvePublicCourseInstructor(makeCourse({ instructor: { id: 1, photo: 'avatars/1.png' } })).avatarUrl,
    ).toBe('https://api.emc.test/avatars/1.png')
    expect(
      resolvePublicCourseInstructor(makeCourse({ instructor: { id: 1, profile_picture: '/avatars/2.png' } }))
        .avatarUrl,
    ).toBe('https://api.emc.test/avatars/2.png')
  })

  it('keeps an already-absolute avatar URL as-is', () => {
    expect(
      resolvePublicCourseInstructor(makeCourse({ instructor: { id: 1, avatar_url: 'https://cdn.x/a.png' } }))
        .avatarUrl,
    ).toBe('https://cdn.x/a.png')
  })

  it('falls back to the user record for the avatar', () => {
    expect(
      resolvePublicCourseInstructor(makeCourse({ instructor: { id: 1, user: { image: '/u.png' } } })).avatarUrl,
    ).toBe('https://api.emc.test/u.png')
  })

  it('ignores em-dash and blank placeholder values', () => {
    const r = resolvePublicCourseInstructor(
      makeCourse({ instructor: { id: 1, name: '—', bio: '   ', avatar_url: '—' } }),
    )
    expect(r.name).toBeNull()
    expect(r.bio).toBeNull()
    expect(r.avatarUrl).toBeNull()
    expect(r.assigned).toBe(false)
  })

  it('reports assigned=false for a course with no instructor data at all', () => {
    const r = resolvePublicCourseInstructor(makeCourse())
    expect(r).toEqual({ assigned: false, name: null, email: null, title: null, bio: null, avatarUrl: null })
  })

  it('reports assigned=false when only a bare relation id is present', () => {
    expect(resolvePublicCourseInstructor(makeCourse({ instructor: { id: 5 } })).assigned).toBe(false)
  })

  it('reports assigned=true when any single displayable signal exists', () => {
    expect(resolvePublicCourseInstructor(makeCourse({ instructor_bio: 'سيرة' })).assigned).toBe(true)
    expect(resolvePublicCourseInstructor(makeCourse({ instructor_title: 'خبير' })).assigned).toBe(true)
  })
})

describe('applyAssignedInstructorToCourse', () => {
  it('writes the id, flat name and nested relation', () => {
    const out = applyAssignedInstructorToCourse(makeCourse(), {
      id: 7,
      name: 'أ. منى',
      email: 'mona@emc.test',
      avatar_url: '/storage/a.png',
    })
    expect(out.instructor_id).toBe(7)
    expect(out.instructor_name).toBe('أ. منى')
    expect(out.instructor).toEqual({
      id: 7,
      name: 'أ. منى',
      title: null,
      bio: null,
      image: '/storage/a.png',
    })
  })

  it('preserves the existing title and bio of the previous relation', () => {
    const course = makeCourse({ instructor: { id: 1, name: 'قديم', title: 'مدرب', bio: 'نبذة', image: '/old.png' } })
    const out = applyAssignedInstructorToCourse(course, { id: 7, name: 'جديد' })
    expect(out.instructor?.title).toBe('مدرب')
    expect(out.instructor?.bio).toBe('نبذة')
  })

  it('keeps the previous image when the new avatar is blank', () => {
    const course = makeCourse({ instructor: { id: 1, name: 'قديم', image: '/old.png' } })
    expect(applyAssignedInstructorToCourse(course, { id: 7, name: 'جديد', avatar_url: '   ' }).instructor?.image).toBe(
      '/old.png',
    )
    expect(applyAssignedInstructorToCourse(course, { id: 7, name: 'جديد', avatar_url: null }).instructor?.image).toBe(
      '/old.png',
    )
  })

  it('leaves the image null when neither side has one', () => {
    expect(applyAssignedInstructorToCourse(makeCourse(), { id: 7, name: 'جديد' }).instructor?.image).toBeNull()
  })

  it('does not mutate the input course', () => {
    const course = makeCourse({ instructor_name: 'قديم' })
    const out = applyAssignedInstructorToCourse(course, { id: 7, name: 'جديد' })
    expect(course.instructor_name).toBe('قديم')
    expect(out).not.toBe(course)
  })

  it('is readable end-to-end by getCourseInstructor', () => {
    const out = applyAssignedInstructorToCourse(makeCourse(), { id: 7, name: 'أ. منى' })
    expect(getCourseInstructor(out).displayName).toBe('أ. منى')
  })
})
