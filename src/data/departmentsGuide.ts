import {
  Crown,
  GraduationCap,
  Settings,
  Megaphone,
  Handshake,
  Wallet,
  Cpu,
  Users,
  HeartPulse,
  ShieldCheck,
  Layers,
} from 'lucide-react'

/**
 * دليل إدارات EMC — يعرِّف الزائر والمتقدم (متطوعًا أو مستشارًا) بكل إدارة
 * قبل أن يختارها. الأسماء مطابقة لما تزرعه الخلفية (DatabaseSeeder)، فتصل
 * القيمة المختارة إلى لوحة المراجعة بنفس النص.
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
    desc: 'القيادة التنفيذية، التخطيط الاستراتيجي، وقرارات المركز الكبرى.',
    icon: Crown,
  },
  {
    name: 'البرامج والمسارات',
    nameEn: 'Programs & Tracks',
    desc: 'تصميم الدورات والمسارات والمناهج والإشراف الأكاديمي على المحتوى.',
    icon: GraduationCap,
  },
  {
    name: 'التشغيل والعمليات',
    nameEn: 'Operations',
    desc: 'سير العمل اليومي، الجداول، التنسيق بين الفرق، ومتابعة التنفيذ.',
    icon: Settings,
  },
  {
    name: 'التسويق والإعلام',
    nameEn: 'Marketing & Media',
    desc: 'الحملات، المحتوى، الهوية البصرية، وقنوات التواصل مع الجمهور.',
    icon: Megaphone,
  },
  {
    name: 'الشراكات والعلاقات',
    nameEn: 'Partnerships & Public Relations',
    desc: 'بناء التحالفات مع الجهات الأكاديمية والمؤسسية وإدارة العلاقات.',
    icon: Handshake,
  },
  {
    name: 'المالية',
    nameEn: 'Finance',
    desc: 'الميزانيات، المدفوعات، الاعتمادات المالية، والتقارير الدورية.',
    icon: Wallet,
  },
  {
    name: 'التقنية',
    nameEn: 'Technology & Technical Support',
    desc: 'المنصة والأنظمة والدعم الفني والبنية الرقمية للمركز.',
    icon: Cpu,
  },
  {
    name: 'الموارد البشرية',
    nameEn: 'Human Resources',
    desc: 'استقطاب الفريق والمتطوعين، تطويرهم، ومتابعة أدائهم ورحلتهم.',
    icon: Users,
  },
  {
    name: 'المجتمع والصحة',
    nameEn: 'Community, Wellbeing & Awareness',
    desc: 'مجتمعات المتعلمين، الرفاه، والوعي الصحي والمجتمعي.',
    icon: HeartPulse,
  },
  {
    name: 'الجودة والحوكمة',
    nameEn: 'Quality & Governance',
    desc: 'معايير الجودة، التقييم، السياسات، والامتثال المؤسسي.',
    icon: ShieldCheck,
  },
]

/** خيار من لا يريد حصر نفسه بإدارة واحدة. */
export const MULTI_DEPARTMENT_OPTION = {
  name: 'عدة إدارات / حسب الحاجة',
  nameEn: 'Multiple departments',
  desc: 'أقدّم الرأي حيث تحتاجني المنظومة، دون الارتباط بإدارة واحدة.',
  icon: Layers,
} satisfies DepartmentGuideEntry
