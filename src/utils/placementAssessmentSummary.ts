import {
  getLevelFromScore,
  progressFromStatus,
  type PlacementStudentRow,
} from '@/api/placementApi'
import { CEFR_MAP } from '@/components/instructor/placement/constants'

export type TimelineEvent = {
  id: string
  label: string
  date: string | null
  done: boolean
  current?: boolean
}

export type PlacementSummary = {
  writtenScore: number | null
  writtenMax: number
  writtenPct: number | null
  oralScore: number | null
  overallScore: number | null
  finalLevel: string | null
  finalLevelCefr: string | null
  recommendedLevel: string | null
  recommendedClass: string | null
  recommendedTrack: string | null
  confidenceScore: number | null
  assessmentStatus: 'passed' | 'needs_review' | 'manual_review' | 'waiting'
  assignmentStatus: 'assigned' | 'waiting' | 'ready'
  strength: string | null
  weakness: string | null
  recommendationReason: string | null
  recommendationText: string | null
  scoreDifference: number | null
}

export function writtenPercentage(row: PlacementStudentRow): number | null {
  if (row.percentage != null) return row.percentage
  if (row.written_score != null && row.total_questions && row.total_questions > 0) {
    return Math.round((row.written_score / row.total_questions) * 100)
  }
  return null
}

export function computeOverallScore(writtenPct: number | null, oralScore: number | null): number | null {
  const parts: number[] = []
  if (writtenPct != null) parts.push(writtenPct)
  if (oralScore != null) parts.push(oralScore)
  if (!parts.length) return null
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
}

function resolveLevelKey(row: PlacementStudentRow): string | null {
  if (row.final_level) {
    const byCefr = Object.entries(CEFR_MAP).find(([, v]) => v.cefr === row.final_level)
    if (byCefr) return byCefr[0]
    return row.final_level
  }
  if (row.written_score != null) {
    return getLevelFromScore(row.written_score, row.total_questions ?? 70).level
  }
  return row.written_level
}

export function buildPlacementSummary(row: PlacementStudentRow): PlacementSummary {
  const writtenPct = writtenPercentage(row)
  const progress = progressFromStatus(row.status)
  const levelKey = resolveLevelKey(row)
  const cefr = levelKey ? CEFR_MAP[levelKey] : null

  const oralNotes = row.oral_assessment_full?.notes
  const rubric = row.oral_assessment_full?.rubric ?? []

  let strength = oralNotes?.strengths ?? null
  let weakness = oralNotes?.weaknesses ?? null

  if (!strength || !weakness) {
    const sorted = [...rubric].filter((r) => r.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    if (sorted.length >= 2) {
      if (!strength) strength = `أداء قوي في ${sorted[0].label}`
      if (!weakness) weakness = `يحتاج تحسين في ${sorted[sorted.length - 1].label}`
    } else if (writtenPct != null && row.oral_score != null) {
      if (row.oral_score > writtenPct + 10) {
        if (!strength) strength = 'مهارات شفوية أقوى من الأداء الكتابي'
        if (!weakness) weakness = 'القواعد والكتابة تحتاج دعم إضافي'
      } else if (writtenPct > row.oral_score + 10) {
        if (!strength) strength = 'فهم كتابي جيد'
        if (!weakness) weakness = 'التحدث والنطق يحتاجان ممارسة'
      }
    }
  }

  const recommendedLevel = row.summary?.recommended_level ?? cefr?.cefr ?? row.final_level ?? row.written_level
  const recommendedClass = row.summary?.recommended_class ?? (recommendedLevel ? `${recommendedLevel}-03` : null)
  const recommendedTrack = row.summary?.recommended_track ?? recommendedLevel

  const scoreDifference =
    writtenPct != null && row.oral_score != null ? row.oral_score - writtenPct : null

  const confidenceScore = row.summary?.confidence_score ?? (() => {
    if (writtenPct == null || row.oral_score == null) return null
    const diff = Math.abs(row.oral_score - writtenPct)
    return Math.max(40, Math.min(98, 95 - diff))
  })()

  const apiStatus = row.summary?.assessment_status
  let assessmentStatus: PlacementSummary['assessmentStatus'] = 'waiting'
  if (apiStatus === 'passed' || apiStatus === 'needs_review' || apiStatus === 'manual_review' || apiStatus === 'waiting') {
    assessmentStatus = apiStatus
  } else if (progress.level_approved) assessmentStatus = 'passed'
  else if (progress.oral_done) assessmentStatus = 'needs_review'
  else if (progress.oral_booked) assessmentStatus = 'manual_review'
  else if (progress.written_done) assessmentStatus = 'waiting'

  const assignmentStatus: PlacementSummary['assignmentStatus'] =
    row.is_assigned || row.summary?.assignment_status === 'assigned' ? 'assigned'
    : progress.level_approved ? 'ready' : 'waiting'

  const overall = row.summary?.overall_score ?? computeOverallScore(writtenPct, row.oral_score)

  return {
    writtenScore: row.written_score,
    writtenMax: row.total_questions ?? 100,
    writtenPct,
    oralScore: row.oral_score,
    overallScore: overall,
    finalLevel: levelKey,
    finalLevelCefr: cefr?.cefr ?? row.final_level,
    recommendedLevel,
    recommendedClass,
    recommendedTrack,
    confidenceScore,
    assessmentStatus,
    assignmentStatus,
    strength,
    weakness,
    recommendationReason: oralNotes?.reason ?? (
      scoreDifference != null && Math.abs(scoreDifference) > 15
        ? 'فرق ملحوظ بين الأداء الكتابي والشفوي'
        : 'بناءً على المجموع المركّب للاختبارين'
    ),
    recommendationText: oralNotes?.recommendations ?? (
      recommendedClass ? `يُنصح بإسناد الطالب إلى صف ${recommendedClass}.` : null
    ),
    scoreDifference,
  }
}

export function buildTimeline(row: PlacementStudentRow): TimelineEvent[] {
  const progress = progressFromStatus(row.status)
  const oralDone = progress.oral_done || progress.level_approved
  const reviewed = progress.level_approved || !!row.oral_assessment_full?.system.evaluated_at

  return [
    {
      id: 'started',
      label: 'بدء تحديد المستوى',
      date: row.submitted_at,
      done: progress.written_done || progress.status !== 'not_started',
    },
    {
      id: 'written',
      label: 'اكتمال الاختبار الكتابي',
      date: row.submitted_at,
      done: progress.written_done,
      current: progress.written_done && !progress.oral_booked,
    },
    {
      id: 'review',
      label: 'مراجعة المعلم',
      date: row.oral_assessment_full?.system.evaluated_at ?? row.oral_booking_at,
      done: reviewed,
      current: progress.oral_booked && !oralDone,
    },
    {
      id: 'oral',
      label: 'اكتمال المقابلة الشفوية',
      date: row.oral_assessment_full?.interview.ends_at ?? row.oral_booking_at,
      done: oralDone,
      current: progress.oral_done && !progress.level_approved,
    },
    {
      id: 'level',
      label: 'تعيين المستوى',
      date: row.oral_assessment_full?.system.evaluated_at ?? null,
      done: progress.level_approved,
    },
    {
      id: 'class',
      label: 'إسناد الطالب إلى صف',
      date: null,
      done: row.is_assigned,
    },
  ]
}

export type RadarSkill = {
  skill: string
  value: number
  fullMark: number
}

export function buildRadarSkills(
  row: PlacementStudentRow,
  oralForm?: { score_vocabulary: string; score_grammar: string; score_fluency: string; score_speaking: string; score_pronunciation: string },
): RadarSkill[] {
  const writtenPct = writtenPercentage(row) ?? 0
  const rubric = row.oral_assessment_full?.rubric ?? []

  function rubricScore(keys: string[], fallback: number): number {
    for (const k of keys) {
      const item = rubric.find((r) => r.key.toLowerCase() === k)
      if (item?.score != null && item.max) return Math.round((item.score / item.max) * 100)
    }
    return fallback
  }

  function formScore(val: string | undefined, fallback: number): number {
    if (!val || val === '') return fallback
    const n = Number(val)
    if (isNaN(n)) return fallback
    return Math.round((n / 20) * 100)
  }

  const fb = writtenPct

  return [
    { skill: 'المفردات', value: formScore(oralForm?.score_vocabulary, rubricScore(['vocabulary'], fb)), fullMark: 100 },
    { skill: 'القواعد',  value: formScore(oralForm?.score_grammar, rubricScore(['grammar'], fb)), fullMark: 100 },
    { skill: 'الاستماع', value: formScore(oralForm?.score_fluency, rubricScore(['fluency', 'listening'], fb)), fullMark: 100 },
    { skill: 'التحدث',   value: formScore(oralForm?.score_speaking, rubricScore(['speaking', 'comprehension'], fb)), fullMark: 100 },
    { skill: 'النطق',    value: formScore(oralForm?.score_pronunciation, rubricScore(['pronunciation'], fb)), fullMark: 100 },
    { skill: 'القراءة',  value: writtenPct, fullMark: 100 },
    { skill: 'الكتابة',  value: Math.max(0, writtenPct - 5), fullMark: 100 },
  ]
}
