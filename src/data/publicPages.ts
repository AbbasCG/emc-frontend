/**
 * Public marketing copy — structured for future locales (ar / en / nl).
 * Pages should import from here instead of duplicating long Arabic strings.
 */

export type Locale = 'ar' | 'en' | 'nl'

export type LocalizedString = {
  ar: string
  en?: string
  nl?: string
}

export function t(entry: LocalizedString, locale: Locale = 'ar'): string {
  if (locale === 'en' && entry.en) return entry.en
  if (locale === 'nl' && entry.nl) return entry.nl
  return entry.ar
}

/** Short tagline used on Home hero — required copy from brief */
export const homeIdentityLead: LocalizedString = {
  ar: 'EMC هي منصة تعليمية ومهنية متكاملة تساعد الطلاب، والمهاجرين، والمهنيين، والباحثين عن التطوير على بناء مسار أكاديمي ومهني أقوى من خلال الدورات، الاستشارات، التدريب، الشراكات، والتوجيه العملي.',
}

export const aboutPlatformLead: LocalizedString = {
  ar: 'EMC ليست مجرد موقع دورات، بل منصة تعليمية وتطويرية تهدف إلى تمكين الأفراد من خلال التعليم، المهارات، الذكاء الاصطناعي، التحول الرقمي، وبناء المسارات المهنية والأكاديمية.',
}

export const volunteerLead: LocalizedString = {
  ar: 'التطوع في EMC ليس مجرد مساهمة وقت، بل فرصة لبناء خبرة، تطوير مهارات، والمشاركة في صناعة أثر تعليمي ومجتمعي حقيقي.',
}

/** 12 EMC themes — titles & copy for /tracks (and home preview) */
export type PublicTheme = {
  id: string
  icon: string
  title: LocalizedString
  shortDescription: LocalizedString
  bullets: LocalizedString[]
  suggestedPrograms: LocalizedString[]
}

export const themes12: PublicTheme[] = [
  {
    id: 'academic-paths',
    icon: 'GraduationCap',
    title: { ar: 'المسارات الأكاديمية' },
    shortDescription: {
      ar: 'تخطيط واضح يربط بين الدراسة والعمل عبر إرشاد عملي وبرامج موجهة.',
    },
    bullets: [
      { ar: 'توجيه للقبول والتخصص والانتقال المهني' },
      { ar: 'ورش لبناء ملفات التقديم والخطة الدراسية' },
      { ar: 'مسارات تدريبية تدعم أهدافك طويلة المدى' },
    ],
    suggestedPrograms: [{ ar: 'ورشة خطة المسار الأكاديمي' }, { ar: 'برنامج الإرشاد المهني' }],
  },
  {
    id: 'international-learning',
    icon: 'Globe2',
    title: { ar: 'التعلّم العالمي' },
    shortDescription: {
      ar: 'تجارب تعلم تربطك ببيئات متعددة وتوسّع أفقك المعرفي والثقافي.',
    },
    bullets: [
      { ar: 'تعريف بفرص الدراسة والتدريب الدولي' },
      { ar: 'مهارات التواصل عبر الثقافات' },
      { ar: 'شبكات تعلم ومجتمعات مهنية' },
    ],
    suggestedPrograms: [{ ar: 'ورشة التعلم بين الثقافات' }, { ar: 'برنامج التوجيه الدولي' }],
  },
  {
    id: 'language-institute',
    icon: 'Languages',
    title: { ar: 'معهد اللغات' },
    shortDescription: {
      ar: 'تعلم لغات بأسلوب تطبيقي يدعم الدراسة والعمل والحياة اليومية.',
    },
    bullets: [
      { ar: 'مسارات مستويات من الأساس إلى الاحتراف' },
      { ar: 'تركيز على المحادثة والكتابة الأكاديمية' },
      { ar: 'دعم للمهاجرين والطلاب الدوليين' },
    ],
    suggestedPrograms: [{ ar: 'دورة المحادثة المكثفة' }, { ar: 'ورشة الكتابة الأكاديمية' }],
  },
  {
    id: 'ai-digital',
    icon: 'Brain',
    title: { ar: 'الذكاء الاصطناعي والتمكين الرقمي' },
    shortDescription: {
      ar: 'أساسيات وتطبيقات عملية للذكاء الاصطناعي والأدوات الرقمية في العمل والتعلم.',
    },
    bullets: [
      { ar: 'مفاهيم واضحة دون تعقيد غير ضروري' },
      { ar: 'مشاريع تطبيقية مناسبة للمبتدئين' },
      { ar: 'أخلاقيات الاستخدام والخصوصية' },
    ],
    suggestedPrograms: [{ ar: 'مقدمة في الذكاء الاصطناعي التطبيقي' }, { ar: 'ورشة الأتمتة الذكية' }],
  },
  {
    id: 'skills-career',
    icon: 'Briefcase',
    title: { ar: 'المهارات والتطوير المهني' },
    shortDescription: {
      ar: 'تطوير كفاءات سوق العمل من التواصل إلى إدارة المشاريع.',
    },
    bullets: [
      { ar: 'سيرة ذاتية ومقابلات وعرض للخبرة' },
      { ar: 'مهارات العرض والتفاوض' },
      { ar: 'خطط تطوير مهني قابلة للتنفيذ' },
    ],
    suggestedPrograms: [{ ar: 'ورشة المقابلة المهنية' }, { ar: 'برنامج المهارات الناعمة' }],
  },
  {
    id: 'leadership-ruwad',
    icon: 'Rocket',
    title: { ar: 'القيادة (روّاد)' },
    shortDescription: {
      ar: 'بناء عقلية المبادرة، التخطيط، وتنمية المشاريع والفرق.',
    },
    bullets: [
      { ar: 'أساسيات نموذج العمل والقيمة' },
      { ar: 'مهارات القيادة في بيئات متغيرة' },
      { ar: 'جلسات إرشاد جماعي وفردي حسب البرنامج' },
    ],
    suggestedPrograms: [{ ar: 'ورشة رواد — أساسيات ريادة الأعمال' }, { ar: 'برنامج القيادة الخدمية' }],
  },
  {
    id: 'awareness-knowledge',
    icon: 'Lightbulb',
    title: { ar: 'الوعي والمعرفة' },
    shortDescription: {
      ar: 'مساحات للتفكير النقدي، المعرفة العامة، والحوار البنّاء.',
    },
    bullets: [
      { ar: 'مواضيع معرفية تدعم النضج الفكري' },
      { ar: 'نقاشات موجهة باحترام للاختلاف' },
      { ar: 'موارد للقراءة والمتابعة الذاتية' },
    ],
    suggestedPrograms: [{ ar: 'سلسلة جلسات الوعي المعرفي' }, { ar: 'ورشة التفكير النقدي' }],
  },
  {
    id: 'mental-health',
    icon: 'HeartPulse',
    title: { ar: 'الرفاه' },
    shortDescription: {
      ar: 'دعم وقائي وتثقيفي للتوازن، العناية الذاتية، وجودة الحياة اليومية.',
    },
    bullets: [
      { ar: 'مبادئ العناية الذاتية والحدود الصحية' },
      { ar: 'إدارة الضغط والقلق في مراحل الانتقال' },
      { ar: 'توجيه للحصول على دعم متخصص عند الحاجة' },
    ],
    suggestedPrograms: [{ ar: 'ورشة التوازن النفسي' }, { ar: 'جلسة تثقيفية عن المرونة' }],
  },
  {
    id: 'financial-literacy',
    icon: 'Wallet',
    title: { ar: 'الوعي المالي' },
    shortDescription: {
      ar: 'مفاهيم مالية عملية للتخطيط، الادخار، وفهم الخيارات.',
    },
    bullets: [
      { ar: 'ميزانية شخصية بسيطة وقابلة للاستمرار' },
      { ar: 'مقدمة في الائتمان والمخاطر' },
      { ar: 'قراءة واقعية لخيارات الاستثمار المبسطة' },
    ],
    suggestedPrograms: [{ ar: 'ورشة الميزانية الشخصية' }, { ar: 'برنامج الوعي المالي للمبتدئين' }],
  },
  {
    id: 'experiential',
    icon: 'Map',
    title: { ar: 'التعلّم التجريبي' },
    shortDescription: {
      ar: 'تعلّم عبر التجربة المباشرة والأنشطة التطبيقية وربط المعرفة بواقع الميدان.',
    },
    bullets: [
      { ar: 'جلسات ميدانية ومجتمعية' },
      { ar: 'ربط النظرية بتجارب حقيقية' },
      { ar: 'فرق عمل وتقارير عرض قصيرة' },
    ],
    suggestedPrograms: [{ ar: 'يوم ميداني — تعرّف على المؤسسات' }, { ar: 'ورشة التعلم بالمشاريع' }],
  },
  {
    id: 'future-minds',
    icon: 'Baby',
    title: { ar: 'الأطفال (عقول المستقبل)' },
    shortDescription: {
      ar: 'أنشطة مناسبة للأعمار لتنمية الفضول والتعلم الآمن والممتع.',
    },
    bullets: [
      { ar: 'مهارات التواصل والتعاون للناشئة' },
      { ar: 'أساسيات التفكير الإبداعي' },
      { ar: 'برامج أسرية داعمة' },
    ],
    suggestedPrograms: [{ ar: 'برنامج عقول المستقبل' }, { ar: 'ورشة القراءة والاستكشاف' }],
  },
  {
    id: 'partnerships',
    icon: 'Handshake',
    title: { ar: 'الشراكات' },
    shortDescription: {
      ar: 'بناء جسور مع مؤسسات وخبراء لخدمة المجتمع التعليمي بشكل أوسع.',
    },
    bullets: [
      { ar: 'نماذج شراكة مرنة ومحددة الأهداف' },
      { ar: 'تكامل بين البرامج والخبرات' },
      { ar: 'حوكمة واضحة للتعاون' },
    ],
    suggestedPrograms: [{ ar: 'باقة الشراكات المؤسسية' }, { ar: 'ورشة تصميم برنامج مشترك' }],
  },
]

export type PublicDepartment = {
  id: string
  icon: string
  title: LocalizedString
  description: LocalizedString
  responsibilities: LocalizedString[]
}

export const departments10: PublicDepartment[] = [
  {
    id: 'exec',
    icon: 'Building2',
    title: { ar: 'الإدارة العليا' },
    description: { ar: 'الرؤية الاستراتيجية، التوجه العام، والالتزام بأثر المنصة طويل المدى.' },
    responsibilities: [
      { ar: 'اعتماد السياسات والأولويات السنوية' },
      { ar: 'تمثيل EMC أمام الشركاء' },
      { ar: 'ضمان توافق البرامج مع الرسالة' },
    ],
  },
  {
    id: 'programs',
    icon: 'Waypoints',
    title: { ar: 'البرامج والمسارات' },
    description: { ar: 'تصميم وتنفيذ البرامج والمسارات التعليمية بجودة وتسلسل منطقي.' },
    responsibilities: [
      { ar: 'هندسة المحتوى والجداول' },
      { ar: 'تنسيق المدربين والجلسات' },
      { ar: 'قياس مخرجات التعلم' },
    ],
  },
  {
    id: 'operations',
    icon: 'Cog',
    title: { ar: 'التشغيل والعمليات' },
    description: { ar: 'تشغيل يومي سلسل للفعاليات، التسجيل، والخدمات اللوجستية.' },
    responsibilities: [
      { ar: 'إدارة الجداول والقاعات والمنصات' },
      { ar: 'دعم تجربة المشارك من البداية للنهاية' },
      { ar: 'توثيق الإجراءات التشغيلية' },
    ],
  },
  {
    id: 'marketing',
    icon: 'Megaphone',
    title: { ar: 'التسويق والإعلام' },
    description: { ar: 'إيصال الرسالة بوضوح وبناء هوية محتوى احترافية.' },
    responsibilities: [
      { ar: 'الحملات والقنوات الرقمية' },
      { ar: 'إنتاج مواد توعوية وتعليمية' },
      { ar: 'تحليل التفاعل وتحسين العروض' },
    ],
  },
  {
    id: 'partnerships-pr',
    icon: 'UsersRound',
    title: { ar: 'الشراكات والعلاقات' },
    description: { ar: 'بناء علاقات مستدامة مع مؤسسات وخبراء ومجتمع مهني.' },
    responsibilities: [
      { ar: 'تطوير اتفاقيات التعاون' },
      { ar: 'تنسيق الفعاليات المشتركة' },
      { ar: 'التواصل مع وسائل الإعلام والمجتمع' },
    ],
  },
  {
    id: 'finance',
    icon: 'Landmark',
    title: { ar: 'المالية' },
    description: { ar: 'شفافية مالية، تخطيط موارد، وضبط التكاليف بمسؤولية.' },
    responsibilities: [
      { ar: 'الميزانيات والتقارير الدورية' },
      { ar: 'سياسات التسعير والمنح عند التوفر' },
      { ar: 'الامتثال للأنظمة المحلية' },
    ],
  },
  {
    id: 'tech',
    icon: 'Cpu',
    title: { ar: 'التقنية' },
    description: { ar: 'بنية تقنية آمنة وتجربة رقمية موثوقة للمتعلمين والفريق.' },
    responsibilities: [
      { ar: 'صيانة المنصات والأنظمة' },
      { ar: 'دعم المستخدمين التقني' },
      { ar: 'حماية البيانات والنسخ الاحتياطي' },
    ],
  },
  {
    id: 'hr',
    icon: 'UserCog',
    title: { ar: 'الموارد البشرية' },
    description: { ar: 'استقطاب وتطوير ثقافة عمل احترافية وداعمة.' },
    responsibilities: [
      { ar: 'التطوع والتوظيف حسب السياسات' },
      { ar: 'التدريب الداخلي للفريق' },
      { ar: 'تجارب موظف إيجابية' },
    ],
  },
  {
    id: 'quality',
    icon: 'ShieldCheck',
    title: { ar: 'الجودة والحوكمة' },
    description: { ar: 'ضمان جودة البرامج والخدمات، تطوير السياسات والإجراءات، متابعة مؤشرات الأداء والتحسين المستمر.' },
    responsibilities: [
      { ar: 'إدارة الجودة والاعتماد والمؤشرات' },
      { ar: 'تحسين العمليات بناءً على الملاحظات' },
      { ar: 'التوثيق والامتثال' },
    ],
  },
  {
    id: 'community-wellbeing',
    icon: 'HeartHandshake',
    title: { ar: 'المجتمع والصحة' },
    description: { ar: 'تنفيذ المبادرات المجتمعية والصحية، بناء الشراكات المجتمعية، دعم البرامج ذات الأثر الإنساني والتوعوي.' },
    responsibilities: [
      { ar: 'المبادرات المجتمعية والصحية' },
      { ar: 'شراكات مع جهات الصحة والوعي' },
      { ar: 'حماية المشاركين نفسياً واجتماعياً' },
    ],
  },
]

export type PartnershipType = {
  title: LocalizedString
  description: LocalizedString
  icon: string
}

export const partnershipTypes: PartnershipType[] = [
  {
    icon: 'School',
    title: { ar: 'الجامعات والمؤسسات التعليمية' },
    description: { ar: 'تعاون أكاديمي في برامج، ورش، ومسارات للطلاب والخريجين.' },
  },
  {
    icon: 'BookMarked',
    title: { ar: 'المدارس والمعاهد' },
    description: { ar: 'أنشطة موجهة للناشئة والمعلمين بما يتوافق مع أهداف المؤسسة.' },
  },
  {
    icon: 'Factory',
    title: { ar: 'الشركات ومراكز التدريب' },
    description: { ar: 'تدريب مهارات، ورش داخلية، وبرامج تطوير الموظفين.' },
  },
  {
    icon: 'Mic2',
    title: { ar: 'المدربون والخبراء' },
    description: { ar: 'انضمام كمدرب معتمد أو شريك محتوى ضمن معايير الجودة.' },
  },
  {
    icon: 'HeartHandshake',
    title: { ar: 'المبادرات المجتمعية' },
    description: { ar: 'مشاريع أثرية تدعم الفئات الأكثر احتياجاً للتعلم والتمكين.' },
  },
  {
    icon: 'BadgeDollarSign',
    title: { ar: 'الجهات الداعمة والرعاة' },
    description: { ar: 'شراكات رعاية مسؤولة تخدم المجتمع التعليمي دون المساس بالاستقلالية الأكاديمية.' },
  },
]

/** Contact / footer — aligned branding */
export const siteContact = {
  phone: '+31 6 00 000 000',
  email: 'info@edumc.nl',
  supportEmail: 'support@edumc.nl',
  location: { ar: 'أمستردام، هولندا — خدمة أونلاين ومجتمعات عربية وهولندية' },
  hours: { ar: 'الأحد — الخميس، 9:00 — 18:00 (بتوقيت أوروبا الوسطى)' },
}
