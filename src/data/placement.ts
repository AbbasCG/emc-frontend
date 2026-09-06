/**
 * EMC-WEB-001 §4 — «حدّد نقطة انطلاقك»: the five-question placement behind /learn.
 *
 * The questionnaire is the orientation page's honest answer to "where do I start?".
 * It is a *pure* instrument, deliberately:
 *
 *   • Five questions, fixed order — الهدف · الخلفية · الوقت المتاح · المجال · مستوى البرمجة.
 *   • Every option carries a weight toward one or more stations (L0…L4). The
 *     recommendation is the highest-scoring station; ties resolve to the LOWER
 *     station, because entering below your level costs a visitor far less than
 *     entering above it.
 *   • `recommend` is deterministic and side-effect free: same answers, same
 *     result, always. No randomness, no time, no network.
 *
 * §11 copy law: the CTA points at a CATALOGUE page (the station), never at a
 * named product — nothing unapproved is displayed, and no product is invented
 * to fill a slot.
 */

/** The five stations of the journey — §4's table, in order. */
export type PlacementLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4'

/** The five questions, by id. */
export type PlacementQuestionId = 'goal' | 'background' | 'time' | 'field' | 'coding'

/** Points an option contributes to each station. Absent = contributes nothing. */
export type PlacementWeights = Partial<Record<PlacementLevel, number>>

export type PlacementOption = {
  /** Stable machine value — stored in state, never displayed. */
  value: string
  /** The visible Arabic label of the radio. */
  label: string
  weights: PlacementWeights
}

export type PlacementQuestion = {
  id: PlacementQuestionId
  /** Short section name shown beside the progress line (الهدف، الخلفية …). */
  name: string
  /** The question itself, addressed to «أنت». */
  title: string
  options: PlacementOption[]
}

/** What the visitor has answered so far — a question with no entry is unanswered. */
export type PlacementAnswers = Partial<Record<PlacementQuestionId, string>>

export type PlacementResult = {
  level: PlacementLevel
  title: string
  reason: string
  cta: { label: string; href: string }
}

/** Scoring order — also the tie-break order (first wins, i.e. the lower station). */
const LEVELS: readonly PlacementLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4']

export const questions: PlacementQuestion[] = [
  {
    id: 'goal',
    name: 'الهدف',
    title: 'ما الهدف الذي تريد بلوغه؟',
    options: [
      {
        value: 'explore',
        label: 'أستكشف المجال قبل أن ألتزم بشيء',
        weights: { L0: 3, L1: 1 },
      },
      {
        value: 'skill',
        label: 'أتقن مهارة عملية واحدة أستخدمها في عملي',
        weights: { L1: 1, L2: 3 },
      },
      {
        value: 'shift',
        label: 'أنتقل إلى مسار مهني جديد بالكامل',
        weights: { L2: 1, L3: 3 },
      },
      {
        value: 'build',
        label: 'أعمل على مشروع حقيقي بإشراف خبراء',
        weights: { L3: 1, L4: 3 },
      },
    ],
  },
  {
    id: 'background',
    name: 'الخلفية',
    title: 'أين أنت اليوم من الذكاء الاصطناعي؟',
    options: [
      {
        value: 'none',
        label: 'لم أبدأ بعد',
        weights: { L0: 3, L1: 1 },
      },
      {
        value: 'tools',
        label: 'أستخدم أدوات جاهزة دون دراسة منظمة',
        weights: { L0: 1, L1: 3 },
      },
      {
        value: 'course',
        label: 'أنهيتُ دورة واحدة على الأقل',
        weights: { L2: 3, L3: 1 },
      },
      {
        value: 'professional',
        label: 'أعمل في المجال وأريد التعمّق',
        weights: { L3: 2, L4: 3 },
      },
    ],
  },
  {
    id: 'time',
    name: 'الوقت المتاح',
    title: 'كم ساعة تخصص للتعلّم أسبوعياً؟',
    options: [
      {
        value: 'under-2',
        label: 'أقل من ساعتين',
        weights: { L0: 3, L1: 1 },
      },
      {
        value: '2-5',
        label: 'من 2 إلى 5 ساعات',
        weights: { L1: 2, L2: 2 },
      },
      {
        value: '6-10',
        label: 'من 6 إلى 10 ساعات',
        weights: { L2: 2, L3: 2 },
      },
      {
        value: 'over-10',
        label: 'أكثر من 10 ساعات',
        weights: { L3: 2, L4: 2 },
      },
    ],
  },
  {
    id: 'field',
    name: 'المجال',
    title: 'في أي اتجاه تريد أن يخدمك الذكاء الاصطناعي؟',
    options: [
      {
        value: 'undecided',
        label: 'لم أحسم اتجاهي بعد',
        weights: { L0: 3, L1: 1 },
      },
      {
        value: 'daily-work',
        label: 'عملي الحالي وإنتاجيتي اليومية',
        weights: { L1: 2, L2: 2 },
      },
      {
        value: 'decision',
        label: 'القرار والإدارة',
        weights: { L2: 2, L3: 1 },
      },
      {
        value: 'data',
        label: 'البيانات والتحليل',
        weights: { L2: 2, L3: 2 },
      },
      {
        value: 'engineering',
        label: 'الهندسة وبناء الأنظمة',
        weights: { L3: 2, L4: 2 },
      },
    ],
  },
  {
    id: 'coding',
    name: 'مستوى البرمجة',
    title: 'ما مستواك في البرمجة؟',
    options: [
      {
        value: 'none',
        label: 'لا أبرمج',
        weights: { L0: 2, L1: 2 },
      },
      {
        value: 'read',
        label: 'أقرأ الشيفرة وأعدّلها',
        weights: { L1: 1, L2: 3 },
      },
      {
        value: 'script',
        label: 'أكتب سكربتات بايثون بنفسي',
        weights: { L2: 1, L3: 3 },
      },
      {
        value: 'ship',
        label: 'أبني تطبيقات كاملة وأنشرها',
        weights: { L3: 1, L4: 3 },
      },
    ],
  },
]

/**
 * The five outcomes. Each CTA is a catalogue destination — §4's mapping:
 * L0 = /workshops · L1 = /learn#camps · L2 = /courses · L3 = /learning-paths ·
 * L4 = /fellowship.
 */
const OUTCOMES: Record<PlacementLevel, Omit<PlacementResult, 'level'>> = {
  L0: {
    title: 'ابدأ من الورش المجانية',
    reason:
      'أنت في طور الاستكشاف، وأقل الطرق كلفة أن ترى المجال بيدك في جلسة واحدة قبل أن تلتزم بأي شيء.',
    cta: { label: 'استكشف الورش المجانية', href: '/workshops' },
  },
  L1: {
    title: 'ابدأ من المعسكرات',
    reason:
      'لديك تماس أولي مع الأدوات، وتحتاج تجربة قصيرة مكثّفة تخرج منها بأول ناتج تعرضه على غيرك.',
    cta: { label: 'تعرّف على المعسكرات', href: '/learn#camps' },
  },
  L2: {
    title: 'ابدأ من الدورات',
    reason:
      'أساسك جاهز، والخطوة التي تنقلك فعلاً هي مهارة واحدة تتقنها وتنهيها بمشروع تنشره باسمك.',
    cta: { label: 'استكشف الدورات', href: '/courses' },
  },
  L3: {
    title: 'ابدأ من المسارات',
    reason:
      'هدفك تحوّل كامل لا مهارة مفردة، والمسار يرتّب الدورات في تسلسل واحد ينتهي بملف أعمال.',
    cta: { label: 'استكشف المسارات', href: '/learning-paths' },
  },
  L4: {
    title: 'ابدأ من الزمالة',
    reason:
      'خبرتك تتجاوز التعلّم النظري، وخطوتك التالية عمل حقيقي بإشراف خبراء ينتهي بأثر موثّق.',
    cta: { label: 'تعرّف على الزمالة', href: '/fellowship' },
  },
}

/**
 * Deterministic recommendation: sum the weights of every answered option, take
 * the highest station, break ties toward the LOWER one. Unanswered questions
 * simply contribute nothing — an empty answer set yields L0.
 */
export function recommend(answers: PlacementAnswers): PlacementResult {
  const scores: Record<PlacementLevel, number> = { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 }

  for (const question of questions) {
    const chosen = answers[question.id]
    if (!chosen) continue
    const option = question.options.find((candidate) => candidate.value === chosen)
    if (!option) continue
    for (const level of LEVELS) {
      const weight = option.weights[level]
      if (weight) scores[level] += weight
    }
  }

  let winner: PlacementLevel = 'L0'
  for (const level of LEVELS) {
    // Strictly greater — so an equal score keeps the earlier (lower) station.
    if (scores[level] > scores[winner]) winner = level
  }

  const outcome = OUTCOMES[winner]
  return { level: winner, title: outcome.title, reason: outcome.reason, cta: outcome.cta }
}
