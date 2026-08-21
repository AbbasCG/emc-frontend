import {
  Brain,
  CircuitBoard,
  LineChart,
  Briefcase,
  UserCheck,
  Stethoscope,
  Wrench,
  Building2,
  Scale,
  BookOpen,
  Languages,
  Bot,
  Smile,
  BadgeCheck,
} from 'lucide-react'

/**
 * دليل المسارات الرسمي EMC — the ONE source of truth for the approved tracks.
 *
 * Every surface that enumerates tracks (home «مسارات التعلّم والشهادات
 * المعتمدة», the /learning-paths comparison, teasers, counters) reads from this
 * module, so the catalogue can never disagree with itself. Content here is the
 * founder-approved catalogue; nothing is invented and nothing unapproved is
 * ever displayed.
 */

type TrackIcon = React.ComponentType<{ size?: number; className?: string }>

// ── 1. Professional Tracks (المسارات المهنية الخمسة — كتالوج 2026-08-22) ────
export interface ProfessionalTrack {
  id: string
  title: string
  titleEn: string
  duration: string
  /** السعر الكامل المعتمد باليورو — من كتالوج 2026-08-22. */
  price: number
  focus: string
  certificate: string
  icon: TrackIcon
  tags: string[]
}

export const PROFESSIONAL_TRACKS: ProfessionalTrack[] = [
  {
    id: 'ai-engineer',
    title: 'مسار مهندس الذكاء الاصطناعي',
    titleEn: 'AI Engineer Path',
    duration: '6 - 8 أشهر',
    price: 899,
    focus: 'من المشكلة والبيانات إلى تعلم الآلة والذكاء الاصطناعي التوليدي وRAG والوكلاء والنشر؛ رحلة عملية لبناء مهارات مهندس ذكاء اصطناعي.',
    certificate: 'Certified AI Engineer - EMC',
    icon: Brain,
    tags: ['Python', 'Machine Learning', 'LLM & RAG', 'AI Agents', 'MLOps'],
  },
  {
    id: 'data-analyst',
    title: 'مسار محلل البيانات',
    titleEn: 'Data Analyst Path',
    duration: '4 - 6 أشهر',
    price: 549,
    focus: 'من البيانات الخام إلى التحليل والتصور ولوحات المعلومات وذكاء الأعمال؛ مسار عملي لبناء محلل بيانات قادر على دعم القرار.',
    certificate: 'Certified Data Analyst - EMC',
    icon: LineChart,
    tags: ['Excel', 'SQL', 'Python', 'Power BI', 'Business Intelligence'],
  },
  {
    id: 'data-scientist',
    title: 'مسار عالم البيانات',
    titleEn: 'Data Scientist Path',
    duration: '6 - 8 أشهر',
    price: 849,
    focus: 'تحليل وإحصاء وبرمجة ونمذجة وتعلم آلة لتحويل البيانات إلى نماذج ورؤى تنبؤية قابلة للاستخدام.',
    certificate: 'Certified Data Scientist - EMC',
    icon: CircuitBoard,
    tags: ['Statistics', 'Python', 'Machine Learning', 'Deep Learning', 'Data Mining'],
  },
  {
    id: 'ai-digital-transformation',
    title: 'مسار الذكاء الاصطناعي والتحول الرقمي',
    titleEn: 'AI & Digital Transformation Path',
    duration: '4 - 6 أشهر',
    price: 649,
    focus: 'مسار للقيادات والمهنيين لفهم الذكاء الاصطناعي وتوظيفه في الأعمال والعمليات والاستراتيجية والتحول المؤسسي.',
    certificate: 'Certified AI & Digital Transformation - EMC',
    icon: Briefcase,
    tags: ['AI Strategy', 'Automation', 'Governance', 'Change Management'],
  },
  {
    id: 'professional-advancement',
    title: 'مسار التطور والتأهيل المهني',
    titleEn: 'Professional Advancement Path',
    duration: '8 أسابيع',
    price: 249,
    focus: 'من «أملك مهارات» إلى «أعرف كيف أقدم نفسي وأصل إلى الفرص»: السيرة، LinkedIn، المقابلات، العلامة الشخصية، والعمل الحر.',
    certificate: 'Professional Advancement Certificate - EMC',
    icon: UserCheck,
    tags: ['CV & LinkedIn', 'Interviews', 'Personal Brand', 'Freelancing'],
  },
]

/**
 * برامج وتخصصات متقدمة — ليست مسارات أساسية منافسة للخمسة (قرار الكتالوج
 * 2026-08-22): «قريباً» هنا بقرار صريح من المؤسس يستثنيها من قاعدة المنع.
 */
export const ADVANCED_PROGRAMS = [
  { title: 'تخصص الذكاء الاصطناعي التوليدي', titleEn: 'Generative AI Specialization', badge: 'تخصص متقدم' },
  { title: 'مسار مهندس البيانات', titleEn: 'Data Engineer Path', badge: 'قريباً' },
  { title: 'برنامج ريادة الأعمال والابتكار', titleEn: 'Entrepreneurship & Innovation', badge: 'ضمن مدرسة الأعمال' },
] as const

// ── 2. Academic Specialized Units (الوحدات التخصصية الأكاديمية) ──────────────
export interface TrackListItem {
  title: string
  desc: string
  icon: TrackIcon
}

export const ACADEMIC_UNITS: TrackListItem[] = [
  { title: 'الوحدة الطبية', desc: 'برامج وتطوير مهارات التخصصات الطبية والعلوم الصحية المساندة.', icon: Stethoscope },
  { title: 'الوحدة الهندسية', desc: 'مهارات وقواعد الهندسة الحديثة والتصميم الهندسي والبرمجي.', icon: Wrench },
  { title: 'الوحدة الإدارية والمالية', desc: 'إدارة الأعمال، التخطيط المالي، المحاسبة، والعلوم الإدارية.', icon: Building2 },
  { title: 'وحدة القانون والسياسة', desc: 'الأنظمة القانونية، الحوكمة، السياسات العامة، والعلوم السياسية.', icon: Scale },
  { title: 'وحدة العلوم الإنسانية والاجتماعية', desc: 'دراسات السلوك البشري، المجتمع، علم النفس، والتربية.', icon: BookOpen },
]

// ── 3. Language Institute (معهد اللغات) ──────────────────────────────────────
export const LANGUAGE_PROGRAMS: TrackListItem[] = [
  { title: 'مسارات تعليم اللغة الإنجليزية', desc: 'من التأسيس حتى الإتقان الكامل للأغراض الأكاديمية والمهنية.', icon: Languages },
  { title: 'مسارات تعليم اللغة الهولندية', desc: 'تعلم الهولندية بأسلوب منظم للاندماج والعمل والدراسة في هولندا.', icon: Languages },
  { title: 'مسارات تعليم اللغة العربية', desc: 'برامج تعليم العربية للناطقين بها وبغيرها بأعلى المعايير.', icon: Languages },
  { title: 'تحضير اختبارات IELTS & NT2', desc: 'دورات مكثفة ومحاكاة لاجتياز اختبارات الكفاءة اللغوية الدولية.', icon: BadgeCheck },
]

// ── 4. Children & Future Minds (مسار الأطفال وعقول المستقبل) ───────────────
export const CHILDREN_PROGRAMS: TrackListItem[] = [
  { title: 'البرمجة وتطوير الألعاب', desc: 'تعليم منطق البرمجة ولغات مثل Scratch و Python للأطفال بأسلوب ممتع.', icon: Bot },
  { title: 'الذكاء الاصطناعي والروبوتات', desc: 'استكشاف التكنولوجيا الذكية والتحكم في الروبوتات وتطبيقات المستقبل.', icon: Brain },
  { title: 'الحساب الذهني والأمان الرقمي', desc: 'تنمية قدرات التفكير الرياضي السريع وترسيخ قواعد السلامة الرقمية.', icon: Smile },
]
