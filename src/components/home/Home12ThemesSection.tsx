import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  GraduationCap,
  Globe,
  Languages,
  Bot,
  Briefcase,
  Crown,
  Lightbulb,
  Heart,
  TrendingUp,
  FlaskConical,
  Smile,
  Handshake,
  ArrowLeft,
  Sparkles,
} from 'lucide-react'

export interface ThemeItem {
  id: string
  num: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  bgLight: string
  borderLight: string
  link: string
}

export const EMC_12_THEMES: ThemeItem[] = [
  {
    id: 'academic',
    num: '01',
    title: 'المسارات الأكاديمية',
    subtitle: 'Academic Pathways',
    description: 'إرشاد وتوجيه أكاديمي منظم ومستمر من المرحلة المدرسية إلى الجامعة والدراسات العليا.',
    icon: GraduationCap,
    color: '#1FA3DC',
    bgLight: 'bg-[#1FA3DC]/[0.08]',
    borderLight: 'border-[#1FA3DC]/25',
    link: '/tracks#academic',
  },
  {
    id: 'global',
    num: '02',
    title: 'التعلّم العالمي',
    subtitle: 'Global Learning',
    description: 'برامج فريدة وفرص تعلّم دولية عابرة للحدود لتوسيع الآفاق وبناء الفهم العالمي.',
    icon: Globe,
    color: '#F39200',
    bgLight: 'bg-[#F39200]/[0.08]',
    borderLight: 'border-[#F39200]/25',
    link: '/tracks#global',
  },
  {
    id: 'language',
    num: '03',
    title: 'معهد اللغات',
    subtitle: 'Language Institute',
    description: 'تمكين المهارات اللغوية والتواصلية المتعددة (العربية، الإنجليزية، الهولندية) لربط الثقافات.',
    icon: Languages,
    color: '#52BFEA',
    bgLight: 'bg-[#52BFEA]/[0.08]',
    borderLight: 'border-[#52BFEA]/25',
    link: '/tracks#language',
  },
  {
    id: 'ai',
    num: '04',
    title: 'الذكاء الاصطناعي والتمكين الرقمي',
    subtitle: 'AI & Digital Empowerment',
    description: 'تأهيل وتطوير القدرات التكنولوجية المتقدمة وتطبيقات الذكاء الاصطناعي للمستقبل.',
    icon: Bot,
    color: '#FCB347',
    bgLight: 'bg-[#FCB347]/[0.08]',
    borderLight: 'border-[#FCB347]/25',
    link: '/tracks#ai',
  },
  {
    id: 'career',
    num: '05',
    title: 'المهارات والتطوير المهني',
    subtitle: 'Career & Skills Development',
    description: 'إعداد الكوادر لسوق العمل وصقل المهارات الناعمة والتقنية اللازمة للتميّز الوظيفي.',
    icon: Briefcase,
    color: '#0F6E99',
    bgLight: 'bg-[#0F6E99]/[0.08]',
    borderLight: 'border-[#0F6E99]/25',
    link: '/tracks#career',
  },
  {
    id: 'leadership',
    num: '06',
    title: 'القيادة (روّاد)',
    subtitle: 'Leadership & Ruwad',
    description: 'صناعة وصقل مهارات قادة وروّاد المستقبل وفق منهجيات قيادية حديثة ورؤية طموحة.',
    icon: Crown,
    color: '#A95F00',
    bgLight: 'bg-[#A95F00]/[0.08]',
    borderLight: 'border-[#A95F00]/25',
    link: '/tracks#leadership',
  },
  {
    id: 'awareness',
    num: '07',
    title: 'الوعي والمعرفة',
    subtitle: 'Awareness & Knowledge',
    description: 'إثراء الفكر ونشر المعرفة التخصصية الشاملة والمحتوى الأكاديمي الرصين.',
    icon: Lightbulb,
    color: '#7CCEEE',
    bgLight: 'bg-[#7CCEEE]/[0.08]',
    borderLight: 'border-[#7CCEEE]/25',
    link: '/tracks#awareness',
  },
  {
    id: 'wellbeing',
    num: '08',
    title: 'الرفاه والصحة المتكاملة',
    subtitle: 'Wellbeing & Health',
    description: 'تعزيز التوازن النفسي والرفاه الذاتي والنمو المتكامل للمتعلمين والمعلمين.',
    icon: Heart,
    color: '#D77F00',
    bgLight: 'bg-[#D77F00]/[0.08]',
    borderLight: 'border-[#D77F00]/25',
    link: '/tracks#wellbeing',
  },
  {
    id: 'finance',
    num: '09',
    title: 'الوعي المالي',
    subtitle: 'Financial Literacy',
    description: 'ترسيخ ثقافة الإدارة المالية الشخصية والاستثمار الواعي والتخطيط المالي المستقبلي.',
    icon: TrendingUp,
    color: '#1488BC',
    bgLight: 'bg-[#1488BC]/[0.08]',
    borderLight: 'border-[#1488BC]/25',
    link: '/tracks#finance',
  },
  {
    id: 'experiential',
    num: '10',
    title: 'التعلّم التجريبي التطبيقي',
    subtitle: 'Experiential Learning',
    description: 'تجارب عمليّة ومحاكاة ميدانية وورش تفاعلية لتحويل المعرفة إلى ممارسة فعلية.',
    icon: FlaskConical,
    color: '#E07F00',
    bgLight: 'bg-[#E07F00]/[0.08]',
    borderLight: 'border-[#E07F00]/25',
    link: '/tracks#experiential',
  },
  {
    id: 'children',
    num: '11',
    title: 'الأطفال (عقول المستقبل)',
    subtitle: 'Children - Future Minds',
    description: 'برامج تعليمية مبتكرة لتنمية شغف الاستكشاف والابتكار والتفكير النقدي لدى الناشئة.',
    icon: Smile,
    color: '#073E58',
    bgLight: 'bg-[#073E58]/[0.08]',
    borderLight: 'border-[#073E58]/25',
    link: '/tracks#children',
  },
  {
    id: 'partnerships',
    num: '12',
    title: 'الشراكات والتحالفات',
    subtitle: 'Partnerships & Alliances',
    description: 'بناء شبكة تعاون مؤسسي وأكاديمي مع الجامعات والمراكز العالمية ذات الأثر.',
    icon: Handshake,
    color: '#FBBF24',
    bgLight: 'bg-[#FBBF24]/[0.08]',
    borderLight: 'border-[#FBBF24]/25',
    link: '/tracks#partnerships',
  },
]

export default function Home12ThemesSection() {
  const [activeTheme, setActiveTheme] = useState<ThemeItem>(EMC_12_THEMES[0])

  return (
    <section dir="rtl" className="relative overflow-hidden bg-slate-900 py-16 text-white sm:py-24">
      {/* Background Gradients & Glows */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-customBlue/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[30rem] w-[30rem] rounded-full bg-customOrange/15 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-10" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-customOrange" />
            <span className="text-xs font-black uppercase tracking-widest text-white/90">
              منظومة EMC التعليمية
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            المحاور الاثنا عشر <span className="text-customBlue">الرئيسية</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
            تغطي منظومة EMC اثني عشر محوراً رئيساً متكاملاً لبناء العقول، وتمكين المسارات الأكاديمية والمهنية، وتعزيز الذكاء الاصطناعي والأثر المجتمعي.
          </p>
        </div>

        {/* Featured Showcase Card */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTheme.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="grid gap-6 lg:grid-cols-12 lg:items-center"
            >
              <div className="lg:col-span-8">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                    style={{ backgroundColor: activeTheme.color }}
                  >
                    <activeTheme.icon size={28} />
                  </div>
                  <div>
                    <span
                      className="text-xs font-black uppercase tracking-widest"
                      style={{ color: activeTheme.color }}
                    >
                      المحور {activeTheme.num} / 12
                    </span>
                    <h3 className="text-xl font-black text-white sm:text-2xl">
                      {activeTheme.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400">{activeTheme.subtitle}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
                  {activeTheme.description}
                </p>
              </div>

              <div className="flex items-center justify-start lg:col-span-4 lg:justify-end">
                <Link
                  to={activeTheme.link}
                  className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black text-white shadow-lg transition-transform duration-200 hover:scale-[1.03]"
                  style={{ backgroundColor: activeTheme.color }}
                >
                  <span>استكشف برامج المحور</span>
                  <ArrowLeft size={16} />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 12 Themes Interactive Grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">
          {EMC_12_THEMES.map((item) => {
            const Icon = item.icon
            const isSelected = activeTheme.id === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTheme(item)}
                className={`group relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all duration-300 ${
                  isSelected
                    ? 'border-white/50 bg-white/15 shadow-xl scale-[1.04] ring-2 ring-white/30'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <div
                  className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${item.color}25`, color: item.color }}
                >
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-400">
                  {item.num}
                </span>
                <p className="mt-1 line-clamp-2 text-xs font-black text-white">
                  {item.title}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
