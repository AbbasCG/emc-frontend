import {
  Brain,
  CircuitBoard,
  Database,
  LineChart,
  Sparkles,
  Briefcase,
  Rocket,
  UserCheck,
  GraduationCap,
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

// ── 1. Professional Tracks (المسارات الاحترافية الـ 9) ──────────────────────
export interface ProfessionalTrack {
  id: string
  title: string
  titleEn: string
  duration: string
  /** السعر الكامل باليورو — يُعبأ للمسارات المعتمدة الأسعار فقط (لا شيء غير معتمد يُعرض). */
  price?: number
  /** صفحة الهبوط المستقلة للمسار (/tracks/<slug>) إن وُجدت. */
  landingSlug?: string
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
    landingSlug: 'ai-engineer',
    focus: 'مدخل الذكاء الاصطناعي، Python، أساسيات البيانات، التعلم الآلي والعميق، وتطوير بيئات المشاريع الحقيقية.',
    certificate: 'Certified AI Engineer - EMC',
    icon: Brain,
    tags: ['Python', 'Machine Learning', 'Deep Learning', 'PyTorch & TensorFlow'],
  },
  {
    id: 'data-scientist',
    title: 'مسار عالم البيانات',
    titleEn: 'Data Scientist Path',
    duration: '6 - 8 أشهر',
    price: 849,
    landingSlug: 'data-scientist',
    focus: 'تحليل البيانات، الإحصاء، التصوير البياني، بناء النماذج، واستخراج الرؤى العملية لدعم القرار.',
    certificate: 'Certified Data Scientist - EMC',
    icon: CircuitBoard,
    tags: ['Data Analysis', 'Statistics', 'Data Visualization', 'Predictive Modeling'],
  },
  {
    id: 'data-engineer',
    title: 'مسار مهندس البيانات',
    titleEn: 'Data Engineer Path',
    duration: '6 - 8 أشهر',
    landingSlug: 'data-engineer',
    focus: 'SQL وقواعد البيانات، خطوط البيانات، عمليات ETL، السحابة، وتجهيز البيانات للتحليل والذكاء الاصطناعي.',
    certificate: 'Certified Data Engineer - EMC',
    icon: Database,
    tags: ['SQL', 'ETL Pipelines', 'Big Data', 'Cloud Data Warehousing'],
  },
  {
    id: 'data-analyst',
    title: 'مسار محلل البيانات',
    titleEn: 'Data Analyst Path',
    duration: '4 - 6 أشهر',
    price: 549,
    landingSlug: 'data-analyst',
    focus: 'Excel، SQL، Power BI أو Tableau، إعداد التقارير، لوحات المعلومات، ومؤشرات الأداء.',
    certificate: 'Certified Data Analyst - EMC',
    icon: LineChart,
    tags: ['Excel Advanced', 'SQL', 'Power BI / Tableau', 'KPI Dashboarding'],
  },
  {
    id: 'generative-ai',
    title: 'مسار الذكاء الاصطناعي التوليدي',
    titleEn: 'Generative AI Specialist Path',
    duration: '4 - 6 أشهر',
    landingSlug: 'generative-ai',
    focus: 'هندسة الأوامر، أدوات الذكاء الاصطناعي، الإنتاجية، صناعة المحتوى، الأتمتة، ووكلاء الذكاء الاصطناعي.',
    certificate: 'Certified Generative AI Specialist - EMC',
    icon: Sparkles,
    tags: ['Prompt Engineering', 'LLM Agents', 'Automation', 'Generative Tools'],
  },
  {
    id: 'ai-business',
    title: 'مسار الذكاء الاصطناعي في الأعمال',
    titleEn: 'AI for Business Path',
    duration: '4 - 6 أشهر',
    price: 649,
    landingSlug: 'ai-for-business',
    focus: 'توظيف الذكاء الاصطناعي في التسويق والإدارة والعمليات وخدمة العملاء واتخاذ القرار والتحول الرقمي.',
    certificate: 'Certified AI Business Specialist - EMC',
    icon: Briefcase,
    tags: ['AI Strategy', 'Business Automation', 'Digital Transformation', 'ROI'],
  },
  {
    id: 'entrepreneurship',
    title: 'مسار ريادة الأعمال',
    titleEn: 'Entrepreneurship Path',
    duration: '4 - 6 أشهر',
    landingSlug: 'entrepreneurship',
    focus: 'تحويل الأفكار إلى مشاريع، نموذج العمل، دراسة السوق، الهوية، التسويق، التمويل، والمنتج الأول.',
    certificate: 'Certified Entrepreneur - EMC',
    icon: Rocket,
    tags: ['Business Model', 'Market Research', 'Pitching', 'MVP Launch'],
  },
  {
    id: 'professional-advancement',
    title: 'مسار التقدم المهني',
    titleEn: 'Professional Advancement Path',
    duration: '8 - 12 أسبوعاً',
    price: 249,
    landingSlug: 'professional-advancement',
    focus: 'السيرة الذاتية، LinkedIn، المقابلات والتواصل المهني، البحث عن عمل، وبناء الهوية المهنية.',
    certificate: 'Professional Advancement Certificate - EMC',
    icon: UserCheck,
    tags: ['CV & Portfolio', 'LinkedIn Mastery', 'Interview Prep', 'Personal Branding'],
  },
  {
    id: 'academic-advancement',
    title: 'مسار التقدم الأكاديمي',
    titleEn: 'Academic Advancement Path',
    duration: '6 - 8 أشهر',
    focus: 'اختيار التخصص، مهارات الدراسة، الكتابة الأكاديمية، البحث العلمي، والتقديم للجامعات والمنح.',
    certificate: 'Academic Advancement Certificate - EMC',
    icon: GraduationCap,
    tags: ['Academic Writing', 'Research Methods', 'University Prep', 'Scholarships'],
  },
]

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
