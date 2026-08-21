import {
  Crown,
  Compass,
  GraduationCap,
  Settings,
  Wallet,
  HeartPulse,
  Cpu,
  ShieldCheck,
  Handshake,
  Users,
  Megaphone,
  Bot,
  UserCheck,
  Layers,
} from 'lucide-react'

/**
 * الإدارات الـ13 المعتمدة لـ EMC — المسميات الرسمية الموحّدة، مطابقة حرفيًا
 * لما تزرعه الخلفية (OfficialDepartmentsSeeder) فتصل القيم المختارة إلى
 * لوحات المراجعة بنفس النص. أي واجهة تسرد الإدارات تقرأ من هذا الملف.
 */

export interface DepartmentGuideEntry {
  name: string
  nameEn: string
  desc: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

export const DEPARTMENTS_GUIDE: DepartmentGuideEntry[] = [
  {
    name: 'الإدارة العليا',
    nameEn: 'Executive Management',
    desc: 'القيادة التنفيذية وقرارات المركز الكبرى والإشراف العام.',
    icon: Crown,
  },
  {
    name: 'إدارة الاستراتيجية والتخطيط المؤسسي',
    nameEn: 'Strategy & Institutional Planning',
    desc: 'الرؤية بعيدة المدى، الخطط المؤسسية، وقياس التقدم نحو الأهداف.',
    icon: Compass,
  },
  {
    name: 'إدارة البرامج والمسارات',
    nameEn: 'Programs & Tracks',
    desc: 'تصميم الدورات والمسارات والمناهج والإشراف الأكاديمي على المحتوى.',
    icon: GraduationCap,
  },
  {
    name: 'إدارة العمليات والتشغيل',
    nameEn: 'Operations',
    desc: 'سير العمل اليومي، الجداول، التنسيق بين الفرق، ومتابعة التنفيذ.',
    icon: Settings,
  },
  {
    name: 'الإدارة المالية',
    nameEn: 'Finance',
    desc: 'الميزانيات، المدفوعات، الاعتمادات المالية، والتقارير الدورية.',
    icon: Wallet,
  },
  {
    name: 'إدارة الصحة النفسية والوعي',
    nameEn: 'Mental Wellbeing & Awareness',
    desc: 'الرفاه النفسي للفريق والمجتمع ونشر الوعي الصحي والمجتمعي.',
    icon: HeartPulse,
  },
  {
    name: 'الإدارة التقنية والفنية',
    nameEn: 'Technology & Technical',
    desc: 'المنصة والأنظمة والدعم الفني والبنية الرقمية للمركز.',
    icon: Cpu,
  },
  {
    name: 'إدارة الجودة والحوكمة',
    nameEn: 'Quality & Governance',
    desc: 'معايير الجودة، التقييم، السياسات، والامتثال المؤسسي.',
    icon: ShieldCheck,
  },
  {
    name: 'إدارة الشراكات والعلاقات',
    nameEn: 'Partnerships & Relations',
    desc: 'بناء التحالفات مع الجهات الأكاديمية والمؤسسية وإدارة العلاقات.',
    icon: Handshake,
  },
  {
    name: 'إدارة الموارد البشرية والشؤون القانونية',
    nameEn: 'HR & Legal Affairs',
    desc: 'استقطاب الفريق والمتطوعين وتطويرهم، والشؤون القانونية والعقود.',
    icon: Users,
  },
  {
    name: 'إدارة الإعلام والتسويق',
    nameEn: 'Media & Marketing',
    desc: 'الحملات، المحتوى، الهوية البصرية، وقنوات التواصل مع الجمهور.',
    icon: Megaphone,
  },
  {
    name: 'إدارة الذكاء الاصطناعي والتحول الرقمي',
    nameEn: 'AI & Digital Transformation',
    desc: 'توظيف الذكاء الاصطناعي وأتمتة العمليات وقيادة التحول الرقمي.',
    icon: Bot,
  },
  {
    name: 'إدارة الاستشارات والمستشارين',
    nameEn: 'Advisory & Consultants',
    desc: 'تستقبل المستشارين المقبولين وتنظم اجتماعاتهم الأسبوعية مع الإدارات.',
    icon: UserCheck,
  },
]

/**
 * إدارات يمكن للمستشار اختيار إحداها — الاثنتا عشرة كلها عدا إدارة
 * الاستشارات نفسها (هي بيته التنظيمي، لا الجهة التي يستشير لها).
 */
export const ADVISABLE_DEPARTMENTS = DEPARTMENTS_GUIDE.filter(
  (d) => d.name !== 'إدارة الاستشارات والمستشارين',
)

/** خيار من لا يريد حصر نفسه بإدارة واحدة. */
export const MULTI_DEPARTMENT_OPTION = {
  name: 'عدة إدارات / حسب الحاجة',
  nameEn: 'Multiple departments',
  desc: 'أقدّم الرأي حيث تحتاجني المنظومة، دون الارتباط بإدارة واحدة.',
  icon: Layers,
} satisfies DepartmentGuideEntry
