import type { Course } from '@/types'
import type { PublicInfoCard } from '@/components/public/detail/PublicDetailInfoCards'
import type { CurriculumGroup } from '@/components/public/detail/PublicCurriculumSection'
import { resolvePublicCourseInstructor } from '@/utils/courseInstructor'
import { ENDED_COURSE_DETAIL_MESSAGE, resolveCourseIsEnded } from '@/utils/courseEnded'
import { formatDuration, formatPrice } from '@/utils/course'
import {
  ITEM_LABELS,
  certificateLineArabic,
  mapCourseStatusArabic,
  mapDeliveryTypeArabic,
  mapProgramTypeArabic,
  mapRegistrationOpen,
  resolveCourseCoverImageUrl,
  resolveItemType,
  EMC_COURSE_COVER_PLACEHOLDER,
  type PublicItemType,
} from '@/utils/publicCourseDisplay'
import {
  coerceCourseBlockText,
  hasParsableCourseDate,
  normalizeBulletedCourseField,
  normalizeKeywords,
  safeTrimUnknown,
} from '@/utils/publicCourseNormalize'
import {
  formatPublicCount,
  formatPublicDate,
  formatPublicTime,
  formatSessionDurationFromRange,
} from '@/utils/publicDetailFormat'
import { resolveCourseDisplayDuration } from '@/utils/courseDuration'
import type { LucideIcon } from 'lucide-react'
import {
  Award,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Clock3,
  GraduationCap,
  Languages,
  MapPin,
  Monitor,
  Users,
} from 'lucide-react'

export type TrainingStatItem = {
  icon: LucideIcon
  label: string
  value: string
  accent?: 'blue' | 'orange' | 'navy'
}

export type CourseDetailDerived = {
  itemType: PublicItemType
  L: (typeof ITEM_LABELS)[PublicItemType]
  isFree: boolean
  registration: ReturnType<typeof mapRegistrationOpen>
  coverUrl: string
  instructor: ReturnType<typeof resolvePublicCourseInstructor>
  deliveryAr: string | null
  programAr: string | null
  priceLabel: string
  originalPriceLabel: string | null
  discountPercent: number | null
  languageDisplay: string | null
  seatsFull: boolean
  keywordTags: string[]
  quickFacts: PublicInfoCard[]
  trainingStats: TrainingStatItem[]
  learningItems: string[]
  curriculumGroups: CurriculumGroup[]
  requirementsItems: string[]
  summaryTitle: string
  detailsTitle: string
  certificateLine: string | null
  completionHint: string | null
  locationLabel: string | null
  meetingLink: string | null
  targetAudience: string | null
  fullDescription: string | null
  isEnded: boolean
  endedMessage: string | null
  prerequisitesBlock: string | null
  learningOutcomesBlock: string | null
  methodologyLines: string[]
  panelMeta: { label: string; value: string }[]
  displayDuration: string
  sessionsLabel: string
  hoursLabel: string
  regsLabel: string
  seatsLabel: string
}

function uniqStrings(lines: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || seen.has(line)) continue
    seen.add(line)
    out.push(line)
  }
  return out
}

function pushFact(
  items: PublicInfoCard[],
  icon: LucideIcon,
  label: string,
  value: unknown,
  accent?: PublicInfoCard['accent'],
) {
  const v = safeTrimUnknown(value)
  if (!v || v === '—') return
  items.push({ icon, label, value: v, accent })
}

function levelLabelAr(raw: unknown): string | null {
  const s = safeTrimUnknown(raw)
  if (!s) return null
  const map: Record<string, string> = {
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم',
  }
  return map[s.toLowerCase()] ?? s
}

export function deriveCourseDetail(course: Course): CourseDetailDerived {
  const apiExtra = course as unknown as Record<string, unknown>
  const itemType = resolveItemType(course)
  const L = ITEM_LABELS[itemType]
  const isFree = course.type === 'free'
  const isEnded = resolveCourseIsEnded(course)
  const registration = mapRegistrationOpen(course)
  const coverUrl = resolveCourseCoverImageUrl(course) ?? EMC_COURSE_COVER_PLACEHOLDER
  const instructor = resolvePublicCourseInstructor(course)
  const deliveryAr = mapDeliveryTypeArabic(course, apiExtra)
  const programAr = mapProgramTypeArabic(course, apiExtra)
  const statusAr = mapCourseStatusArabic(course.status, course.is_published)
  void statusAr

  const langRaw = safeTrimUnknown(course.language ?? apiExtra.language)
  const langLooksWrong =
    langRaw &&
    ['archived', 'draft', 'published', 'active', 'inactive', 'cancelled', 'online', 'offline', 'hybrid'].includes(
      langRaw.toLowerCase(),
    )
  const languageDisplay = langLooksWrong ? null : langRaw || null

  const calculatedDuration = formatDuration(course.start_date, course.end_date)
  const displayDuration =
    resolveCourseDisplayDuration(course, apiExtra, calculatedDuration) ||
    (!hasParsableCourseDate(course.start_date) && !hasParsableCourseDate(course.end_date) ?
      'انضم إلى الدورة القادمة'
    : '')

  const hoursNum = Number(course.training_hours ?? apiExtra.hours_count ?? apiExtra.training_hours)
  const hoursLabel =
    Number.isFinite(hoursNum) && hoursNum > 0 ? `${String(Math.round(hoursNum))} ساعة تدريبية` : ''

  const seatsRaw = course.capacity ?? apiExtra.seats_count ?? apiExtra.capacity
  const seatsNum = seatsRaw != null ? Number(seatsRaw) : NaN
  const seatsLabel =
    Number.isFinite(seatsNum) && seatsNum > 0 ? formatPublicCount(seatsNum, 'مقعد') : ''

  const regsRaw = course.registrations_count ?? apiExtra.registrations_count
  const regsNum = regsRaw != null ? Number(regsRaw) : NaN
  const seatsFull =
    Number.isFinite(seatsNum) && seatsNum > 0 && Number.isFinite(regsNum) && regsNum >= seatsNum
  const regsLabel =
    Number.isFinite(regsNum) && regsNum >= 0 ? formatPublicCount(regsNum, 'مسجّل') : ''

  const deptLabel = safeTrimUnknown(course.department?.name ?? course.department_name ?? apiExtra.department_name)
  const trackLabel = safeTrimUnknown(course.track_title ?? course.track?.title ?? apiExtra.track_title)
  const certificateLine = certificateLineArabic(course, apiExtra)
  const keywordTags = normalizeKeywords(apiExtra.keywords ?? course.keywords)

  const prerequisitesCombined = coerceCourseBlockText(course.prerequisites ?? apiExtra.prerequisites)
  const requirementsBullets = normalizeBulletedCourseField(apiExtra.requirements)
  const learningOutcomesBlock =
    coerceCourseBlockText(course.learning_outcomes ?? apiExtra.learning_outcomes) ||
    coerceCourseBlockText(apiExtra.expected_outcomes)
  const curriculumBullets = normalizeBulletedCourseField(apiExtra.curriculum_topics)
  const featuresBullets = normalizeBulletedCourseField(course.features ?? apiExtra.features)
  const outcomesBullets = normalizeBulletedCourseField(course.learning_outcomes ?? apiExtra.learning_outcomes)

  const meetingLink = safeTrimUnknown(course.meeting_link ?? apiExtra.meeting_link)
  const locationLabel = safeTrimUnknown(course.location ?? apiExtra.location)

  const startDateLabel = formatPublicDate(course.start_date)
  const endDateLabel = formatPublicDate(course.end_date)

  const startClock = formatPublicTime(course.start_time ?? apiExtra.start_time)
  const endClock = formatPublicTime(course.end_time ?? apiExtra.end_time)
  const clockRange = startClock && endClock ? `${startClock} — ${endClock}` : startClock || endClock || ''
  const sessionDurationLabel = formatSessionDurationFromRange(
    course.start_time ?? apiExtra.start_time,
    course.end_time ?? apiExtra.end_time,
  )

  const studyDays = safeTrimUnknown(course.study_days ?? apiExtra.study_days)
  const studyTime = safeTrimUnknown(course.study_time ?? apiExtra.study_time)
  const sessionFmt = safeTrimUnknown(course.session_format ?? apiExtra.session_format)
  const level = levelLabelAr(course.level ?? apiExtra.level)

  const sessionsRaw =
    apiExtra.sessions_count ??
    apiExtra.total_sessions ??
    (Array.isArray(apiExtra.sessions) ? apiExtra.sessions.length : null)
  const sessionsNum = sessionsRaw != null ? Number(sessionsRaw) : NaN
  const sessionsLabel =
    Number.isFinite(sessionsNum) && sessionsNum > 0 ? formatPublicCount(sessionsNum, 'جلسة') : ''

  const assignmentsRaw = apiExtra.assignments_count ?? apiExtra.total_assignments
  const assignmentsNum = assignmentsRaw != null ? Number(assignmentsRaw) : NaN
  const assignmentsLabel =
    Number.isFinite(assignmentsNum) && assignmentsNum > 0 ?
      formatPublicCount(assignmentsNum, 'مهمة')
    : ''

  const workshopsRaw = apiExtra.workshops_count
  const workshopsNum = workshopsRaw != null ? Number(workshopsRaw) : NaN
  const workshopsLabel =
    Number.isFinite(workshopsNum) && workshopsNum > 0 ? formatPublicCount(workshopsNum, 'ورشة') : ''

  const completionHint = coerceCourseBlockText(
    apiExtra.completion_criteria ?? apiExtra.completion_requirements ?? apiExtra.passing_criteria,
  )

  const priceNum = Number(course.price)
  const originalRaw = apiExtra.original_price ?? apiExtra.compare_at_price ?? apiExtra.list_price
  const originalNum = originalRaw != null ? Number(originalRaw) : NaN
  const hasDiscount =
    !isFree &&
    Number.isFinite(priceNum) &&
    Number.isFinite(originalNum) &&
    originalNum > priceNum
  const discountFromApi = apiExtra.discount_percent != null ? Number(apiExtra.discount_percent) : NaN
  const discountPercent =
    hasDiscount ?
      Number.isFinite(discountFromApi) && discountFromApi > 0 ?
        Math.round(discountFromApi)
      : Math.round(((originalNum - priceNum) / originalNum) * 100)
    : null
  const priceLabel = isFree ? 'مجانية' : formatPrice(course.price)
  const originalPriceLabel = hasDiscount ? formatPrice(originalNum) : null
  const targetAudience = coerceCourseBlockText(course.target_audience ?? apiExtra.target_audience)
  const fullDescription = coerceCourseBlockText(course.description)

  const learningItems = uniqStrings([
    ...outcomesBullets,
    ...(learningOutcomesBlock ?
      learningOutcomesBlock.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean)
    : []),
  ])

  const curriculumGroups: CurriculumGroup[] = [
    { id: 'topics', title: 'محاور البرنامج', items: curriculumBullets },
    ...(featuresBullets.length > 0 ?
      [{ id: 'features', title: 'مميزات البرنامج', items: featuresBullets }]
    : []),
  ]

  const requirementsItems = uniqStrings([
    ...requirementsBullets,
    ...(prerequisitesCombined ?
      prerequisitesCombined.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean)
    : []),
  ])

  const methodologyLines = uniqStrings([
    sessionFmt ? `صيغة الجلسات: ${sessionFmt}` : '',
    studyDays ? `أيام الدراسة: ${studyDays}` : '',
    studyTime ? `وقت الدراسة: ${studyTime}` : '',
    coerceCourseBlockText(apiExtra.methodology) ?? '',
    coerceCourseBlockText(apiExtra.teaching_method) ?? '',
  ].flatMap((s) => (s ? s.split(/\r?\n+/).map((x) => x.trim()).filter(Boolean) : [])))

  const quickFacts: PublicInfoCard[] = []
  if (deliveryAr) pushFact(quickFacts, Monitor, L.mode, deliveryAr)
  pushFact(quickFacts, Clock3, L.duration, displayDuration)
  if (hoursLabel) pushFact(quickFacts, BookOpen, 'إجمالي ساعات التدريب', hoursLabel)
  if (startDateLabel) pushFact(quickFacts, CalendarDays, 'تاريخ البداية', startDateLabel)
  if (endDateLabel) pushFact(quickFacts, CalendarDays, 'تاريخ النهاية', endDateLabel)
  if (clockRange) pushFact(quickFacts, Clock3, 'الجدول الأسبوعي', clockRange)
  if (sessionDurationLabel) pushFact(quickFacts, Clock3, 'مدة الجلسة', sessionDurationLabel)
  if (studyDays) pushFact(quickFacts, CalendarDays, 'أيام الدراسة', studyDays)
  if (itemType !== 'workshop') {
    if (languageDisplay) pushFact(quickFacts, Languages, 'لغة البرنامج', languageDisplay)
    if (level) pushFact(quickFacts, Award, 'المستوى', level)
  }
  if (programAr) pushFact(quickFacts, GraduationCap, L.type, programAr)
  if (certificateLine) pushFact(quickFacts, BadgeCheck, 'الشهادة', certificateLine)
  if (seatsLabel) pushFact(quickFacts, Users, 'المقاعد المتاحة', seatsLabel)
  if (regsLabel) pushFact(quickFacts, Users, 'عدد المسجّلين', regsLabel)
  if (locationLabel && (deliveryAr === 'حضوري' || deliveryAr === 'هجين')) {
    pushFact(quickFacts, MapPin, 'المكان', locationLabel)
  }
  if (trackLabel) pushFact(quickFacts, BookOpen, 'المسار', trackLabel)
  if (deptLabel) pushFact(quickFacts, BriefcaseBusiness, 'القسم / الإدارة', deptLabel)
  if (itemType === 'program') {
    const tracksCount = safeTrimUnknown(apiExtra.tracks_count ?? apiExtra.tracks)
    if (tracksCount) pushFact(quickFacts, BookOpen, 'المسارات ضمن البرنامج', tracksCount)
  }

  const trainingStats: TrainingStatItem[] = []
  const pushStat = (icon: LucideIcon, label: string, value: string, accent?: TrainingStatItem['accent']) => {
    if (!value.trim()) return
    trainingStats.push({ icon, label, value, accent })
  }
  if (sessionsLabel) pushStat(BookOpen, 'الجلسات', sessionsLabel, 'blue')
  if (hoursLabel) pushStat(Clock3, 'ساعات التدريب', hoursLabel, 'orange')
  if (workshopsLabel) pushStat(GraduationCap, 'ورش ضمن البرنامج', workshopsLabel, 'navy')
  if (assignmentsLabel) pushStat(ClipboardList, 'المهام', assignmentsLabel, 'blue')
  if (sessionDurationLabel) pushStat(Clock3, 'مدة الجلسة', sessionDurationLabel, 'navy')
  if (certificateLine) pushStat(Award, 'الشهادة', certificateLine.replace(/^شهادة:\s*/, ''), 'orange')
  if (completionHint) pushStat(BadgeCheck, 'معايير الإكمال', completionHint.split('\n')[0] ?? completionHint, 'navy')

  const summaryTitle =
    itemType === 'workshop' ? 'ملخص الورشة' : itemType === 'program' ? 'ملخص البرنامج' : 'عن الدورة'
  const detailsTitle =
    itemType === 'workshop' ? 'تفاصيل الورشة' : itemType === 'program' ? 'تفاصيل البرنامج' : 'تفاصيل الدورة'

  const panelMeta: { label: string; value: string }[] = []

  return {
    itemType,
    L,
    isFree,
    registration,
    coverUrl,
    instructor,
    deliveryAr,
    programAr,
    priceLabel,
    originalPriceLabel,
    discountPercent,
    languageDisplay,
    seatsFull,
    keywordTags,
    quickFacts,
    trainingStats,
    learningItems,
    curriculumGroups,
    requirementsItems,
    summaryTitle,
    detailsTitle,
    certificateLine,
    completionHint,
    locationLabel,
    meetingLink,
    targetAudience,
    fullDescription,
    isEnded,
    endedMessage: isEnded ? ENDED_COURSE_DETAIL_MESSAGE : null,
    prerequisitesBlock: prerequisitesCombined,
    learningOutcomesBlock,
    methodologyLines,
    panelMeta,
    displayDuration,
    sessionsLabel,
    hoursLabel,
    regsLabel,
    seatsLabel,
  }
}
