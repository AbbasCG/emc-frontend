import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  ArrowLeft,
  BadgeCheck,
  Clock,
  Award,
} from 'lucide-react'

// ── 1. Professional Tracks (المسارات الاحترافية الـ 9) ──────────────────────
export interface ProfessionalTrack {
  id: string
  title: string
  titleEn: string
  duration: string
  focus: string
  certificate: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badgeColor: string
  tags: string[]
}

export const PROFESSIONAL_TRACKS: ProfessionalTrack[] = [
  {
    id: 'ai-engineer',
    title: 'مسار مهندس الذكاء الاصطناعي',
    titleEn: 'AI Engineer Path',
    duration: '6 - 8 أشهر',
    focus: 'مدخل الذكاء الاصطناعي، Python، أساسيات البيانات، التعلم الآلي والعميق، وتطوير بيئات المشاريع الحقيقية.',
    certificate: 'Certified AI Engineer - EMC',
    icon: Brain,
    badgeColor: '#1FA3DC',
    tags: ['Python', 'Machine Learning', 'Deep Learning', 'PyTorch & TensorFlow'],
  },
  {
    id: 'data-scientist',
    title: 'مسار عالم البيانات',
    titleEn: 'Data Scientist Path',
    duration: '6 - 8 أشهر',
    focus: 'تحليل البيانات، الإحصاء، التصوير البياني، بناء النماذج، واستخراج الرؤى العملية لدعم القرار.',
    certificate: 'Certified Data Scientist - EMC',
    icon: CircuitBoard,
    badgeColor: '#EC943C',
    tags: ['Data Analysis', 'Statistics', 'Data Visualization', 'Predictive Modeling'],
  },
  {
    id: 'data-engineer',
    title: 'مسار مهندس البيانات',
    titleEn: 'Data Engineer Path',
    duration: '6 - 8 أشهر',
    focus: 'SQL وقواعد البيانات، خطوط البيانات، عمليات ETL، السحابة، وتجهيز البيانات للتحليل والذكاء الاصطناعي.',
    certificate: 'Certified Data Engineer - EMC',
    icon: Database,
    badgeColor: '#0F6E99',
    tags: ['SQL', 'ETL Pipelines', 'Big Data', 'Cloud Data Warehousing'],
  },
  {
    id: 'data-analyst',
    title: 'مسار محلل البيانات',
    titleEn: 'Data Analyst Path',
    duration: '6 - 8 أشهر',
    focus: 'Excel، SQL، Power BI أو Tableau، إعداد التقارير، لوحات المعلومات، ومؤشرات الأداء.',
    certificate: 'Certified Data Analyst - EMC',
    icon: LineChart,
    badgeColor: '#1488BC',
    tags: ['Excel Advanced', 'SQL', 'Power BI / Tableau', 'KPI Dashboarding'],
  },
  {
    id: 'generative-ai',
    title: 'مسار الذكاء الاصطناعي التوليدي',
    titleEn: 'Generative AI Specialist Path',
    duration: '6 - 8 أشهر',
    focus: 'هندسة الأوامر، أدوات الذكاء الاصطناعي، الإنتاجية، صناعة المحتوى، الأتمتة، ووكلاء الذكاء الاصطناعي.',
    certificate: 'Certified Generative AI Specialist - EMC',
    icon: Sparkles,
    badgeColor: '#FCB347',
    tags: ['Prompt Engineering', 'LLM Agents', 'Automation', 'Generative Tools'],
  },
  {
    id: 'ai-business',
    title: 'مسار الذكاء الاصطناعي في الأعمال',
    titleEn: 'AI for Business Path',
    duration: '6 - 8 أشهر',
    focus: 'توظيف الذكاء الاصطناعي في التسويق والإدارة والعمليات وخدمة العملاء واتخاذ القرار والتحول الرقمي.',
    certificate: 'Certified AI Business Specialist - EMC',
    icon: Briefcase,
    badgeColor: '#22334A',
    tags: ['AI Strategy', 'Business Automation', 'Digital Transformation', 'ROI'],
  },
  {
    id: 'entrepreneurship',
    title: 'مسار ريادة الأعمال',
    titleEn: 'Entrepreneurship Path',
    duration: '6 - 8 أشهر',
    focus: 'تحويل الأفكار إلى مشاريع، نموذج العمل، دراسة السوق، الهوية، التسويق، التمويل، والمنتج الأول.',
    certificate: 'Certified Entrepreneur - EMC',
    icon: Rocket,
    badgeColor: '#E07F00',
    tags: ['Business Model', 'Market Research', 'Pitching', 'MVP Launch'],
  },
  {
    id: 'professional-advancement',
    title: 'مسار التقدم المهني',
    titleEn: 'Professional Advancement Path',
    duration: '6 - 8 أشهر',
    focus: 'السيرة الذاتية، LinkedIn، المقابلات والتواصل المهني، البحث عن عمل، وبناء الهوية المهنية.',
    certificate: 'Professional Advancement Certificate - EMC',
    icon: UserCheck,
    badgeColor: '#0F6E99',
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
    badgeColor: '#1FA3DC',
    tags: ['Academic Writing', 'Research Methods', 'University Prep', 'Scholarships'],
  },
]

// ── 2. Academic Specialized Units (الوحدات التخصصية الأكاديمية) ──────────────
export const ACADEMIC_UNITS = [
  { title: 'الوحدة الطبية', desc: 'برامج وتطوير مهارات التخصصات الطبية والعلوم الصحية المساندة.', icon: Stethoscope, color: '#1FA3DC' },
  { title: 'الوحدة الهندسية', desc: 'مهارات وقواعد الهندسة الحديثة والتصميم الهندسي والبرمجي.', icon: Wrench, color: '#F39200' },
  { title: 'الوحدة الإدارية والمالية', desc: 'إدارة الأعمال، التخطيط المالي، المحاسبة، والعلوم الإدارية.', icon: Building2, color: '#0F6E99' },
  { title: 'وحدة القانون والسياسة', desc: 'الأنظمة القانونية، الحوكمة، السياسات العامة، والعلوم السياسية.', icon: Scale, color: '#A95F00' },
  { title: 'وحدة العلوم الإنسانية والاجتماعية', desc: 'دراسات السلوك البشري، المجتمع، علم النفس، والتربية.', icon: BookOpen, color: '#7CCEEE' },
]

// ── 3. Language Institute (معهد اللغات) ──────────────────────────────────────
export const LANGUAGE_PROGRAMS = [
  { title: 'مسارات تعليم اللغة الإنجليزية', desc: 'من التأسيس حتى الإتقان الكامل للأغراض الأكاديمية والمهنية.', icon: Languages, color: '#1FA3DC' },
  { title: 'مسارات تعليم اللغة الهولندية', desc: 'تعلم الهولندية بأسلوب منظم للاندماج والعمل والدراسة في هولندا.', icon: Languages, color: '#F39200' },
  { title: 'مسارات تعليم اللغة العربية', desc: 'برامج تعليم العربية للناطقين بها وبغيرها بأعلى المعايير.', icon: Languages, color: '#0F6E99' },
  { title: 'تحضير اختبارات IELTS & NT2', desc: 'دورات مكثفة ومحاكاة لاجتياز اختبارات الكفاءة اللغوية الدولية.', icon: BadgeCheck, color: '#FCB347' },
]

// ── 4. Children & Future Minds (مسار الأطفال وعقول المستقبل) ───────────────
export const CHILDREN_PROGRAMS = [
  { title: 'البرمجة وتطوير الألعاب', desc: 'تعليم منطق البرمجة ولغات مثل Scratch و Python للأطفال بأسلوب ممتع.', icon: Bot, color: '#1FA3DC' },
  { title: 'الذكاء الاصطناعي والروبوتات', desc: 'استكشاف التكنولوجيا الذكية والتحكم في الروبوتات وتطبيقات المستقبل.', icon: Brain, color: '#F39200' },
  { title: 'الحساب الذهني والأمان الرقمي', desc: 'تنمية قدرات التفكير الرياضي السريع وترسيخ قواعد السلامة الرقمية.', icon: Smile, color: '#EC943C' },
]

export default function HomeLearningTracks() {
  const [activeTab, setActiveTab] = useState<'professional' | 'academic' | 'languages' | 'children'>('professional')

  return (
    <section id="tracks" dir="rtl" className="scroll-mt-28 bg-white px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[1540px]">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-customBlue/20 bg-customBlue/5 px-4 py-1.5">
            <BadgeCheck className="h-4 w-4 text-customBlue" />
            <span className="text-xs font-black uppercase tracking-widest text-customBlue">
              دليل المسارات الرسمي — EMC
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-deepBlue sm:text-4xl lg:text-5xl">
            مسارات التعلّم <span className="text-customBlue">والشهادات المعتمدة</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-relaxed text-slate-600">
            تأهيل شامل يمتد من 6 إلى 8 أشهر ينتهي بمشروع وتقييم عملي وشهادة معتمدة رسمياً من EMC.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-slate-100/80 p-2 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('professional')}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all ${
              activeTab === 'professional'
                ? 'bg-deepBlue text-white shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-deepBlue hover:bg-white/60'
            }`}
          >
            <Brain size={18} />
            <span>المسارات الاحترافية الـ 9</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all ${
              activeTab === 'academic'
                ? 'bg-deepBlue text-white shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-deepBlue hover:bg-white/60'
            }`}
          >
            <GraduationCap size={18} />
            <span>الوحدات التخصصية الأكاديمية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('languages')}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all ${
              activeTab === 'languages'
                ? 'bg-deepBlue text-white shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-deepBlue hover:bg-white/60'
            }`}
          >
            <Languages size={18} />
            <span>معهد اللغات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('children')}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition-all ${
              activeTab === 'children'
                ? 'bg-deepBlue text-white shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-deepBlue hover:bg-white/60'
            }`}
          >
            <Smile size={18} />
            <span>الأطفال وعقول المستقبل</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <AnimatePresence mode="wait">
          {activeTab === 'professional' && (
            <motion.div
              key="professional"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {PROFESSIONAL_TRACKS.map((track) => {
                const Icon = track.icon
                return (
                  <div
                    key={track.id}
                    className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1.5 hover:border-customBlue/40 hover:shadow-xl"
                  >
                    {/* Header: Icon & Duration */}
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                        style={{ backgroundColor: track.badgeColor }}
                      >
                        <Icon size={24} />
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        <Clock size={13} className="text-customBlue" />
                        {track.duration}
                      </span>
                    </div>

                    {/* Title & Focus */}
                    <h3 className="mt-5 text-xl font-black text-deepBlue group-hover:text-customBlue">
                      {track.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{track.titleEn}</p>
                    <p className="mt-3 text-xs leading-relaxed text-slate-600">{track.focus}</p>

                    {/* Tags */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {track.tags.map((tag) => (
                        <span key={tag} className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Certified Badge */}
                    <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-black text-customOrange">
                      <Award size={16} className="shrink-0 text-customOrange" />
                      <span className="truncate">{track.certificate}</span>
                    </div>

                    {/* Action Link */}
                    <div className="mt-4">
                      <Link
                        to="/courses"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-deepBlue py-3 text-xs font-black text-white transition hover:bg-customBlue"
                      >
                        تفاصيل وتوقيت الانطلاق
                        <ArrowLeft size={14} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

          {activeTab === 'academic' && (
            <motion.div
              key="academic"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {ACADEMIC_UNITS.map((unit) => {
                const Icon = unit.icon
                return (
                  <div
                    key={unit.title}
                    className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-customBlue/30 hover:shadow-md"
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                      style={{ backgroundColor: unit.color }}
                    >
                      <Icon size={24} />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-deepBlue">{unit.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{unit.desc}</p>
                    <Link
                      to="/courses"
                      className="mt-6 flex items-center justify-between text-xs font-black text-customBlue hover:underline"
                    >
                      <span>عرض برامج الوحدة</span>
                      <ArrowLeft size={14} />
                    </Link>
                  </div>
                )
              })}
            </motion.div>
          )}

          {activeTab === 'languages' && (
            <motion.div
              key="languages"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {LANGUAGE_PROGRAMS.map((lang) => {
                const Icon = lang.icon
                return (
                  <div
                    key={lang.title}
                    className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-customBlue/30 hover:shadow-md"
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                      style={{ backgroundColor: lang.color }}
                    >
                      <Icon size={24} />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-deepBlue">{lang.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{lang.desc}</p>
                    <Link
                      to="/courses"
                      className="mt-6 flex items-center justify-between text-xs font-black text-customBlue hover:underline"
                    >
                      <span>استكشف الدورات</span>
                      <ArrowLeft size={14} />
                    </Link>
                  </div>
                )
              })}
            </motion.div>
          )}

          {activeTab === 'children' && (
            <motion.div
              key="children"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid gap-6 sm:grid-cols-3"
            >
              {CHILDREN_PROGRAMS.map((prog) => {
                const Icon = prog.icon
                return (
                  <div
                    key={prog.title}
                    className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:border-customBlue/30 hover:shadow-md"
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                      style={{ backgroundColor: prog.color }}
                    >
                      <Icon size={24} />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-deepBlue">{prog.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{prog.desc}</p>
                    <Link
                      to="/courses"
                      className="mt-6 flex items-center justify-between text-xs font-black text-customBlue hover:underline"
                    >
                      <span>برامج الأطفال</span>
                      <ArrowLeft size={14} />
                    </Link>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
