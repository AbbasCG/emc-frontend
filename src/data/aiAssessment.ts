/**
 * «اختبر مستواك في AI» — محتوى التقييم كاملاً: سؤالا التخصيص، الأسئلة الخمسة
 * عشر الموزونة على المحاور الخمسة، المستويات الخمسة بعتباتها وبواباتها،
 * وخرائط التوصية (المستوى + الهدف = الخطة). المحتوى هنا هو مرجع الحقيقة.
 */

export type DimensionKey = 'usage' | 'prompting' | 'automation' | 'development' | 'engineering'

export const DIMENSIONS: Array<{ key: DimensionKey; label: string; labelEn: string }> = [
  { key: 'usage', label: 'استخدام وفهم AI', labelEn: 'AI Understanding & Usage' },
  { key: 'prompting', label: 'هندسة الأوامر والإنتاجية', labelEn: 'Prompting & Productivity' },
  { key: 'automation', label: 'الأتمتة والوكلاء', labelEn: 'Automation & Agents' },
  { key: 'development', label: 'بناء حلول AI', labelEn: 'AI Development' },
  { key: 'engineering', label: 'هندسة الأنظمة', labelEn: 'AI Engineering' },
]

// ── سؤالا التخصيص (لا يدخلان في الدرجة — يوجهان التوصية) ──────────────────────

export const GOAL_QUESTION = {
  id: 'goal',
  text: 'ما هدفك الأساسي من الذكاء الاصطناعي؟',
  options: [
    { value: 'work', label: 'استخدامه في عملي' },
    { value: 'career', label: 'دخول مجال AI كمهنة' },
    { value: 'build', label: 'بناء تطبيقات ومشاريع' },
    { value: 'business', label: 'تطوير شركتي أو مشروعي' },
    { value: 'study', label: 'الدراسة والبحث' },
    { value: 'explore', label: 'الاستكشاف فقط' },
  ],
} as const

export const FIELD_QUESTION = {
  id: 'field',
  text: 'ما مجالك الحالي؟',
  options: [
    { value: 'student', label: 'طالب' },
    { value: 'tech', label: 'تقنية وهندسة' },
    { value: 'business', label: 'إدارة وأعمال' },
    { value: 'marketing', label: 'تسويق وإعلام' },
    { value: 'academic', label: 'أكاديمي أو باحث' },
    { value: 'freelance', label: 'عمل حر' },
    { value: 'other', label: 'تخصص آخر' },
  ],
} as const

// ── الأسئلة الموزونة: 15 سؤالاً، 3 لكل محور، كل خيار من 0 إلى 3 ─────────────

export interface AssessmentQuestion {
  id: string
  dimension: DimensionKey
  text: string
  options: Array<{ label: string; score: 0 | 1 | 2 | 3 }>
}

export const QUESTIONS: AssessmentQuestion[] = [
  // ── usage ──
  {
    id: 'u1',
    dimension: 'usage',
    text: 'كم مرة تستخدم أدوات الذكاء الاصطناعي؟',
    options: [
      { label: 'نادراً أو لم أجرب بعد', score: 0 },
      { label: 'أحياناً عند الحاجة', score: 1 },
      { label: 'عدة مرات أسبوعياً', score: 2 },
      { label: 'يومياً — جزء من عملي', score: 3 },
    ],
  },
  {
    id: 'u2',
    dimension: 'usage',
    text: 'كم أداة ذكاء اصطناعي مختلفة جربت فعلياً؟',
    options: [
      { label: 'ولا واحدة تقريباً', score: 0 },
      { label: 'أداة أو اثنتين (مثل ChatGPT)', score: 1 },
      { label: '3 إلى 5 أدوات لأغراض مختلفة', score: 2 },
      { label: 'أكثر من 5 وأقارن بينها بوعي', score: 3 },
    ],
  },
  {
    id: 'u3',
    dimension: 'usage',
    text: 'هل تفهم متى يخطئ الذكاء الاصطناعي ولماذا (الهلوسة، حدود المعرفة)؟',
    options: [
      { label: 'لا أعرف أنه يخطئ أصلاً', score: 0 },
      { label: 'سمعت عن ذلك دون تفاصيل', score: 1 },
      { label: 'أعرف الظاهرة وأتحقق من المهم', score: 2 },
      { label: 'أفهم أسبابها وأصمم استخدامي حولها', score: 3 },
    ],
  },
  // ── prompting ──
  {
    id: 'p1',
    dimension: 'prompting',
    text: 'كيف تكتب طلبك (Prompt) عادة؟',
    options: [
      { label: 'جملة قصيرة وأنتظر النتيجة', score: 0 },
      { label: 'أشرح ما أريد بجمل أوضح', score: 1 },
      { label: 'أحدد الدور والسياق والصيغة المطلوبة', score: 2 },
      { label: 'أبني قوالب أوامر منظمة وأعيد استخدامها', score: 3 },
    ],
  },
  {
    id: 'p2',
    dimension: 'prompting',
    text: 'إذا كانت الإجابة ضعيفة، ماذا تفعل؟',
    options: [
      { label: 'أستسلم أو أبحث في جوجل', score: 0 },
      { label: 'أعيد صياغة السؤال', score: 1 },
      { label: 'أجزئ المهمة وأوجه النموذج خطوة خطوة', score: 2 },
      { label: 'أستخدم تقنيات منهجية (أمثلة، أدوار، سلاسل تفكير)', score: 3 },
    ],
  },
  {
    id: 'p3',
    dimension: 'prompting',
    text: 'هل وفّر عليك الذكاء الاصطناعي وقتاً حقيقياً في مهامك؟',
    options: [
      { label: 'ليس بعد', score: 0 },
      { label: 'قليلاً في مهام متفرقة', score: 1 },
      { label: 'نعم — مهام أسبوعية صارت أسرع بوضوح', score: 2 },
      { label: 'نعم — أعدت تنظيم عملي حوله', score: 3 },
    ],
  },
  // ── automation ──
  {
    id: 'a1',
    dimension: 'automation',
    text: 'هل سبق أن ربطت أداة AI بأداة أخرى لتنفيذ عملية تلقائياً؟',
    options: [
      { label: 'لا، أستخدم كل أداة وحدها', score: 0 },
      { label: 'جربت النسخ واللصق بين الأدوات', score: 1 },
      { label: 'بنيت أتمتة بسيطة (Zapier/Make أو مشابه)', score: 2 },
      { label: 'أبني تدفقات عمل متعددة الخطوات تعمل وحدها', score: 3 },
    ],
  },
  {
    id: 'a2',
    dimension: 'automation',
    text: 'ما علاقتك بوكلاء الذكاء الاصطناعي (AI Agents)؟',
    options: [
      { label: 'أول مرة أسمع المصطلح', score: 0 },
      { label: 'أعرف الفكرة نظرياً', score: 1 },
      { label: 'جربت وكيلاً جاهزاً أو أعددت واحداً بسيطاً', score: 2 },
      { label: 'أصمم وكلاء بمهام وأدوات وذاكرة', score: 3 },
    ],
  },
  {
    id: 'a3',
    dimension: 'automation',
    text: 'عملية متكررة في عملك — كيف تتعامل معها؟',
    options: [
      { label: 'أنفذها يدوياً كل مرة', score: 0 },
      { label: 'أستعين بالنموذج في أجزاء منها', score: 1 },
      { label: 'أتمتت أجزاءها المتكررة', score: 2 },
      { label: 'أؤتمتها كاملة وأراقب جودتها فقط', score: 3 },
    ],
  },
  // ── development ──
  {
    id: 'd1',
    dimension: 'development',
    text: 'ما مستواك في البرمجة (Python أو مشابه)?',
    options: [
      { label: 'لا أبرمج', score: 0 },
      { label: 'أساسيات بسيطة', score: 1 },
      { label: 'أكتب سكربتات وأستخدم مكتبات', score: 2 },
      { label: 'أبني مشاريع برمجية كاملة', score: 3 },
    ],
  },
  {
    id: 'd2',
    dimension: 'development',
    text: 'هل استخدمت واجهات برمجة نماذج الذكاء الاصطناعي (APIs)?',
    options: [
      { label: 'لا أعرف ما هي', score: 0 },
      { label: 'أعرفها ولم أجربها', score: 1 },
      { label: 'استدعيت نموذجاً عبر API في تجربة', score: 2 },
      { label: 'بنيت تطبيقاً حقيقياً فوق النماذج', score: 3 },
    ],
  },
  {
    id: 'd3',
    dimension: 'development',
    text: 'ما علاقتك بأنظمة الاسترجاع المعزز (RAG — ربط النموذج بمعرفتك الخاصة)?',
    options: [
      { label: 'أول مرة أسمع عنها', score: 0 },
      { label: 'أفهم الفكرة نظرياً', score: 1 },
      { label: 'جربت بناء نموذج يجيب من ملفاتي', score: 2 },
      { label: 'بنيت RAG كاملاً بفهرسة وتقييم', score: 3 },
    ],
  },
  // ── engineering ──
  {
    id: 'e1',
    dimension: 'engineering',
    text: 'ما فهمك لكيفية عمل النماذج (تعلم آلي، شبكات عصبية)?',
    options: [
      { label: 'صندوق أسود بالنسبة لي', score: 0 },
      { label: 'أفهم المبادئ العامة', score: 1 },
      { label: 'درست أو طبقت خوارزميات تعلم آلي', score: 2 },
      { label: 'أدرب نماذج وأضبطها وأقيّمها', score: 3 },
    ],
  },
  {
    id: 'e2',
    dimension: 'engineering',
    text: 'هل تعاملت مع البيانات كأساس لنظام ذكاء اصطناعي؟',
    options: [
      { label: 'لا', score: 0 },
      { label: 'نظفت أو حللت بيانات بسيطة', score: 1 },
      { label: 'جهزت بيانات لتدريب أو تقييم نموذج', score: 2 },
      { label: 'أبني خطوط بيانات (Pipelines) لأنظمة AI', score: 3 },
    ],
  },
  {
    id: 'e3',
    dimension: 'engineering',
    text: 'هل نشرت (Deploy) حلاً يعتمد على الذكاء الاصطناعي ليستخدمه آخرون؟',
    options: [
      { label: 'لا', score: 0 },
      { label: 'شاركت نتائج أو نماذج تجريبية', score: 1 },
      { label: 'نشرت تطبيقاً بسيطاً أو Prototype', score: 2 },
      { label: 'أدير حلولاً منشورة بمراقبة وتحسين (MLOps)', score: 3 },
    ],
  },
]

// ── المستويات الخمسة ──────────────────────────────────────────────────────────

export interface AssessmentLevel {
  id: 'explorer' | 'power_user' | 'automation_builder' | 'solution_builder' | 'systems_engineer'
  order: 1 | 2 | 3 | 4 | 5
  title: string
  titleEn: string
  message: string
}

export const LEVELS: AssessmentLevel[] = [
  {
    id: 'explorer',
    order: 1,
    title: 'مستكشف الذكاء الاصطناعي',
    titleEn: 'AI Explorer',
    message: 'أنت في بداية الرحلة. لديك الوعي، والآن تحتاج إلى تحويل الفضول إلى استخدام عملي منظم.',
  },
  {
    id: 'power_user',
    order: 2,
    title: 'مستخدم ذكاء اصطناعي فعّال',
    titleEn: 'AI Power User',
    message: 'تستخدم أدوات AI بذكاء في حياتك وعملك. خطوتك التالية: الانتقال من استخدام الأدوات إلى بناء أنظمة بها.',
  },
  {
    id: 'automation_builder',
    order: 3,
    title: 'صانع الأتمتة والوكلاء',
    titleEn: 'AI Automation Builder',
    message: 'تجاوزت مرحلة استخدام الأدوات وبدأت تجعل الذكاء الاصطناعي ينفذ العمليات ويتكامل معها. خطوتك التالية: من بناء Workflows إلى بناء حلول AI متكاملة.',
  },
  {
    id: 'solution_builder',
    order: 4,
    title: 'مطور حلول الذكاء الاصطناعي',
    titleEn: 'AI Solution Builder',
    message: 'تبني تطبيقات ومساعدات ذكية حقيقية فوق النماذج. خطوتك التالية: التعامل مع AI كنظام هندسي متكامل.',
  },
  {
    id: 'systems_engineer',
    order: 5,
    title: 'مهندس أنظمة الذكاء الاصطناعي',
    titleEn: 'AI Systems Engineer',
    message: 'تتعامل مع الذكاء الاصطناعي كنظام هندسي: بيانات ونماذج وتقييم ونشر. المرحلة التالية: مشاريع حقيقية وتخصص وقيادة.',
  },
]

/**
 * حساب الدرجات والمستوى.
 * كل محور: مجموع 3 أسئلة × 3 نقاط = 9 كحد أقصى → نسبة مئوية.
 * البوابات (Thresholds): لا يصل أحد للمستوى 4 دون بناء فعلي، ولا للمستوى 5
 * دون هندسة فعلية — مهما بلغت درجته الإجمالية من الاستخدام الجيد وحده.
 */
export function computeResult(answers: Record<string, number>): {
  scores: Record<DimensionKey, number>
  overall: number
  level: AssessmentLevel
} {
  const scores = {} as Record<DimensionKey, number>
  for (const dim of DIMENSIONS) {
    const qs = QUESTIONS.filter((q) => q.dimension === dim.key)
    const raw = qs.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0)
    scores[dim.key] = Math.round((raw / (qs.length * 3)) * 100)
  }

  const overall = Math.round(
    (scores.usage + scores.prompting + scores.automation + scores.development + scores.engineering) / 5,
  )

  let order: AssessmentLevel['order']
  if (overall < 25) order = 1
  else if (overall < 45) order = 2
  else if (overall < 65) order = 3
  else if (overall < 85) order = 4
  else order = 5

  // البوابات: المستوى 4 يتطلب بناء ≥ 50، والمستوى 5 يتطلب هندسة ≥ 50 وبناء ≥ 60.
  if (order === 5 && (scores.engineering < 50 || scores.development < 60)) order = 4
  if (order === 4 && scores.development < 50) order = 3

  const level = LEVELS.find((l) => l.order === order) ?? LEVELS[0]
  return { scores, overall, level }
}

// ── خرائط التوصية: المستوى + الهدف = الخطة ────────────────────────────────────

export interface RecommendationPlan {
  now: string
  next: string
  target: string
}

/** الخطة الافتراضية لكل مستوى (مسار المهنة/البناء). */
const DEFAULT_PLANS: Record<AssessmentLevel['id'], RecommendationPlan> = {
  explorer: {
    now: 'بناء مشاريع الذكاء الاصطناعي',
    next: 'الذكاء الاصطناعي التوليدي',
    target: 'مستخدم ذكاء اصطناعي فعّال',
  },
  power_user: {
    now: 'الذكاء الاصطناعي التوليدي وأدواته',
    next: 'الوكلاء والأتمتة (AI Agents & Automation)',
    target: 'صانع الأتمتة والوكلاء',
  },
  automation_builder: {
    now: 'الوكلاء والأتمتة (AI Agents & Automation)',
    next: 'Python للذكاء الاصطناعي',
    target: 'مطور حلول الذكاء الاصطناعي',
  },
  solution_builder: {
    now: 'هندسة النماذج اللغوية (LLM Engineering) وRAG',
    next: 'مسار مهندس الذكاء الاصطناعي',
    target: 'مهندس أنظمة الذكاء الاصطناعي',
  },
  systems_engineer: {
    now: 'الوحدات المتقدمة وMLOps',
    next: 'زمالة EMC المهنية في الذكاء الاصطناعي',
    target: 'مشاريع حقيقية وتخصص وفرص',
  },
}

/** تخصيص حسب الهدف: قائد الأعمال لا يُقال له «تعلم Python». */
const BUSINESS_PLANS: Partial<Record<AssessmentLevel['id'], RecommendationPlan>> = {
  power_user: {
    now: 'الذكاء الاصطناعي للأعمال',
    next: 'الأتمتة بالذكاء الاصطناعي',
    target: 'مسار الذكاء الاصطناعي والتحول الرقمي',
  },
  automation_builder: {
    now: 'الأتمتة بالذكاء الاصطناعي',
    next: 'الاستراتيجية الرقمية وحوكمة AI',
    target: 'مسار الذكاء الاصطناعي والتحول الرقمي',
  },
  solution_builder: {
    now: 'مسار الذكاء الاصطناعي والتحول الرقمي',
    next: 'إدارة الابتكار والمشاريع الرقمية',
    target: 'قيادة التحول في مؤسستك',
  },
}

export function recommendPlan(levelId: AssessmentLevel['id'], goal: string | null): RecommendationPlan {
  if ((goal === 'business' || goal === 'work') && BUSINESS_PLANS[levelId]) {
    return BUSINESS_PLANS[levelId] as RecommendationPlan
  }
  return DEFAULT_PLANS[levelId]
}

/** نص المشاركة الجاهز (قابل للتعديل قبل الإرسال في واتساب). */
export function buildShareText(levelTitle: string, levelTitleEn: string, order: number, url: string): string {
  return `اختبرت مستواي في الذكاء الاصطناعي مع EMC وطلعت «${levelTitle}» (${levelTitleEn}) — المستوى ${order} من 5.\nجرب الاختبار وشوف أنت في أي مستوى:\n${url}`
}
