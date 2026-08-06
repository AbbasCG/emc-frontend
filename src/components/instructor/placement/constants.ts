import { PLACEMENT_LEVELS, type PlacementStudentRow } from '@/api/placementApi'
import { getLevelFromScore } from '@/api/placementApi'

export const CEFR_MAP: Record<string, { cefr: string; arabic: string; bg: string; text: string }> = {
  beginner:           { cefr: 'Starter', arabic: 'مبتدئ',         bg: 'bg-slate-100',   text: 'text-slate-600'   },
  elementary:         { cefr: 'A1',      arabic: 'ابتدائي',        bg: 'bg-blue-100',    text: 'text-blue-700'    },
  pre_intermediate:   { cefr: 'A2',      arabic: 'ما قبل المتوسط', bg: 'bg-sky-100',     text: 'text-sky-700'     },
  intermediate:       { cefr: 'B1',      arabic: 'متوسط',          bg: 'bg-emerald-100', text: 'text-emerald-700' },
  upper_intermediate: { cefr: 'B2',      arabic: 'فوق المتوسط',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  advanced:           { cefr: 'C1',      arabic: 'متقدم',          bg: 'bg-violet-100',  text: 'text-violet-700'  },
  Starter:            { cefr: 'Starter', arabic: 'مبتدئ',         bg: 'bg-slate-100',   text: 'text-slate-600'   },
  A1:                 { cefr: 'A1',      arabic: 'ابتدائي',        bg: 'bg-blue-100',    text: 'text-blue-700'    },
  A2:                 { cefr: 'A2',      arabic: 'ما قبل المتوسط', bg: 'bg-sky-100',     text: 'text-sky-700'     },
  B1:                 { cefr: 'B1',      arabic: 'متوسط',          bg: 'bg-emerald-100', text: 'text-emerald-700' },
  B2:                 { cefr: 'B2',      arabic: 'فوق المتوسط',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  C1:                 { cefr: 'C1',      arabic: 'متقدم',          bg: 'bg-violet-100',  text: 'text-violet-700'  },
}

export const STATUS_LABELS: Record<string, string> = {
  not_started:       'لم يبدأ',
  in_progress:       'قيد التقدم',
  written_submitted: 'اكتمل الكتابي',
  oral_booked:       'المقابلة محجوزة',
  oral_completed:    'بانتظار الاعتماد',
  completed:         'مستوى معتمد',
}

export const ASSESSMENT_STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  passed:         { label: 'ناجح',           bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  needs_review:   { label: 'يحتاج مراجعة',   bg: 'bg-amber-50',    text: 'text-amber-700'   },
  manual_review:  { label: 'مراجعة يدوية',   bg: 'bg-orange-50',   text: 'text-orange-700'  },
  waiting:        { label: 'بانتظار',        bg: 'bg-slate-50',    text: 'text-slate-600'   },
}

export type OralForm = {
  final_level:         string
  notes:               string
  score_speaking:      string
  score_pronunciation: string
  score_vocabulary:    string
  score_grammar:       string
  score_fluency:       string
}

export const ORAL_SCORES: { key: keyof OralForm; label: string; max: number; apiKey?: string }[] = [
  { key: 'score_vocabulary',    label: 'المفردات',  max: 20, apiKey: 'vocabulary_score'    },
  { key: 'score_grammar',       label: 'القواعد',   max: 20, apiKey: 'grammar_score'       },
  { key: 'score_fluency',       label: 'الاستماع',  max: 20, apiKey: 'fluency_score'       },
  { key: 'score_speaking',      label: 'التحدث',    max: 20, apiKey: 'comprehension_score' },
  { key: 'score_pronunciation', label: 'النطق',     max: 20, apiKey: 'pronunciation_score' },
]

export function cefrBadge(level: string | null | undefined) {
  return CEFR_MAP[level ?? ''] ?? null
}

export function emptyOralForm(row?: PlacementStudentRow): OralForm {
  const estimated = row?.written_score != null
    ? getLevelFromScore(row.written_score, row.total_questions ?? 70).level
    : ''
  const form: OralForm = {
    final_level:         row?.final_level ?? estimated,
    notes:               row?.notes ?? '',
    score_speaking:      '',
    score_pronunciation: '',
    score_vocabulary:    '',
    score_grammar:       '',
    score_fluency:       '',
  }

  const rubric = row?.oral_assessment_full?.rubric ?? []
  const keyMap: Record<string, keyof OralForm> = {
    vocabulary:    'score_vocabulary',
    grammar:       'score_grammar',
    fluency:       'score_fluency',
    listening:     'score_fluency',
    speaking:      'score_speaking',
    pronunciation: 'score_pronunciation',
    comprehension: 'score_speaking',
  }
  for (const item of rubric) {
    const formKey = keyMap[item.key.toLowerCase()]
    if (formKey && item.score != null) form[formKey] = String(item.score)
  }

  if (row?.oral_score != null && !rubric.length) {
    const each = Math.round(row.oral_score / 5)
    form.score_speaking = String(each)
    form.score_pronunciation = String(each)
    form.score_vocabulary = String(each)
    form.score_grammar = String(each)
    form.score_fluency = String(row.oral_score - each * 4)
  }

  return form
}

export { PLACEMENT_LEVELS }
