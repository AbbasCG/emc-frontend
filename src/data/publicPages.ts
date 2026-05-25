export type Locale = 'ar' | 'en' | 'nl'

export type LocalizedString = {
  ar: string
  en?: string
  nl?: string
}

let _currentLocale: Locale = 'ar'
export function setLocale(l: Locale) { _currentLocale = l }

export function t(entry: LocalizedString, locale?: Locale): string {
  const lang = locale || _currentLocale
  if (lang === 'en' && entry.en) return entry.en
  if (lang === 'nl' && entry.nl) return entry.nl
  return entry.ar
}

/** Short tagline used on Home hero — required copy from brief */
export const homeIdentityLead: LocalizedString = {
  ar: 'EMC هي منصة تعليمية ومهنية متكاملة تساعد الطلاب، والمهاجرين، والمهنيين، والباحثين عن التطوير على بناء مسار أكاديمي ومهني أقوى من خلال الدورات، الاستشارات، التدريب، الشراكات، والتوجيه العملي.',
  en: 'EMC is an integrated educational and professional platform that helps students, immigrants, professionals, and those seeking development build a stronger academic and career path through courses, consulting, training, partnerships, and practical guidance.',
  nl: 'EMC is een geïntegreerd educatief en professioneel platform dat studenten, immigranten, professionals en mensen die zich willen ontwikkelen helpt een sterker academisch en carrièrepad op te bouwen via cursussen, advies, training, partnerschappen en praktische begeleiding.',
}

export const aboutPlatformLead: LocalizedString = {
  ar: 'EMC ليست مجرد موقع دورات، بل منصة تعليمية وتطويرية تهدف إلى تمكين الأفراد من خلال التعليم، المهارات، الذكاء الاصطناعي، التحول الرقمي، وبناء المسارات المهنية والأكاديمية.',
  en: 'EMC is not just a course website, but an educational platform that aims to empower individuals through education, skills, artificial intelligence, digital transformation, and building professional and academic paths.',
  nl: 'EMC is niet zomaar een cursuswebsite, maar een educatief platform dat individuen wil versterken door middel van onderwijs, vaardigheden, kunstmatige intelligentie, digitale transformatie en het bouwen van professionele en academische trajecten.',
}

export const volunteerLead: LocalizedString = {
  ar: 'التطوع في EMC ليس مجرد مساهمة وقت، بل فرصة لبناء خبرة، تطوير مهارات، والمشاركة في صناعة أثر تعليمي ومجتمعي حقيقي.',
  en: 'Volunteering at EMC is not just a contribution of time — it is an opportunity to build experience, develop skills, and participate in creating real educational and community impact.',
  nl: 'Vrijwilligerswerk bij EMC is niet alleen een tijdsbijdrage, maar een kans om ervaring op te doen, vaardigheden te ontwikkelen en bij te dragen aan echte educatieve en maatschappelijke impact.',
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
    title: { ar: 'المسارات الأكاديمية', en: 'Academic Paths', nl: 'Academische Trajecten' },
    shortDescription: {
      ar: 'تخطيط واضح يربط بين الدراسة والعمل عبر إرشاد عملي وبرامج موجهة.',
      en: 'Clear planning that connects study and work through practical guidance and targeted programs.',
      nl: 'Duidelijke planning die studie en werk verbindt door praktische begeleiding en gerichte programma\'s.',
    },
    bullets: [
      { ar: 'توجيه للقبول والتخصص والانتقال المهني', en: 'Guidance on admissions, majors, and career transitions', nl: 'Begeleiding bij toelating, studiekeuze en carrièreovergangen' },
      { ar: 'ورش لبناء ملفات التقديم والخطة الدراسية', en: 'Workshops on application portfolios and study plans', nl: 'Workshops over sollicitatieportfolio\'s en studieplannen' },
      { ar: 'مسارات تدريبية تدعم أهدافك طويلة المدى', en: 'Training paths that support your long-term goals', nl: 'Trainingstrajecten die je langetermijndoelen ondersteunen' },
    ],
    suggestedPrograms: [
      { ar: 'ورشة خطة المسار الأكاديمي', en: 'Academic Path Planning Workshop', nl: 'Workshop Academisch Trajectplanning' },
      { ar: 'برنامج الإرشاد المهني', en: 'Professional Mentoring Program', nl: 'Professioneel Mentoringprogramma' },
    ],
  },
  {
    id: 'international-learning',
    icon: 'Globe2',
    title: { ar: 'التعلّم العالمي', en: 'International Learning', nl: 'Internationaal Leren' },
    shortDescription: {
      ar: 'تجارب تعلم تربطك ببيئات متعددة وتوسّع أفقك المعرفي والثقافي.',
      en: 'Learning experiences that connect you with diverse environments and expand your knowledge and cultural horizons.',
      nl: 'Leerervaringen die je verbinden met diverse omgevingen en je kennis en culturele horizon verbreden.',
    },
    bullets: [
      { ar: 'تعريف بفرص الدراسة والتدريب الدولي', en: 'Introduction to international study and training opportunities', nl: 'Kennismaking met internationale studie- en trainingsmogelijkheden' },
      { ar: 'مهارات التواصل عبر الثقافات', en: 'Cross-cultural communication skills', nl: 'Interculturele communicatievaardigheden' },
      { ar: 'شبكات تعلم ومجتمعات مهنية', en: 'Learning networks and professional communities', nl: 'Leernetwerken en professionele gemeenschappen' },
    ],
    suggestedPrograms: [
      { ar: 'ورشة التعلم بين الثقافات', en: 'Cross-Cultural Learning Workshop', nl: 'Workshop Intercultureel Leren' },
      { ar: 'برنامج التوجيه الدولي', en: 'International Guidance Program', nl: 'Internationaal Begeleidingsprogramma' },
    ],
  },
  {
    id: 'language-institute',
    icon: 'Languages',
    title: { ar: 'معهد اللغات', en: 'Language Institute', nl: 'Taalinstituut' },
    shortDescription: {
      ar: 'تعلم لغات بأسلوب تطبيقي يدعم الدراسة والعمل والحياة اليومية.',
      en: 'Learn languages through a practical approach that supports study, work, and daily life.',
      nl: 'Leer talen via een praktische aanpak die studie, werk en dagelijks leven ondersteunt.',
    },
    bullets: [
      { ar: 'مسارات مستويات من الأساس إلى الاحتراف', en: 'Level tracks from beginner to advanced', nl: 'Niveautrajecten van beginner tot gevorderd' },
      { ar: 'تركيز على المحادثة والكتابة الأكاديمية', en: 'Focus on conversation and academic writing', nl: 'Focus op conversatie en academisch schrijven' },
      { ar: 'دعم للمهاجرين والطلاب الدوليين', en: 'Support for immigrants and international students', nl: 'Ondersteuning voor immigranten en internationale studenten' },
    ],
    suggestedPrograms: [
      { ar: 'دورة المحادثة المكثفة', en: 'Intensive Conversation Course', nl: 'Intensieve Conversatiecursus' },
      { ar: 'ورشة الكتابة الأكاديمية', en: 'Academic Writing Workshop', nl: 'Workshop Academisch Schrijven' },
    ],
  },
  {
    id: 'ai-digital',
    icon: 'Brain',
    title: { ar: 'الذكاء الاصطناعي والتمكين الرقمي', en: 'AI & Digital Empowerment', nl: 'AI & Digitale Empowerment' },
    shortDescription: {
      ar: 'أساسيات وتطبيقات عملية للذكاء الاصطناعي والأدوات الرقمية في العمل والتعلم.',
      en: 'Fundamentals and practical applications of AI and digital tools in work and learning.',
      nl: 'Grondbeginselen en praktische toepassingen van AI en digitale tools in werk en leren.',
    },
    bullets: [
      { ar: 'مفاهيم واضحة دون تعقيد غير ضروري', en: 'Clear concepts without unnecessary complexity', nl: 'Duidelijke concepten zonder onnodige complexiteit' },
      { ar: 'مشاريع تطبيقية مناسبة للمبتدئين', en: 'Practical projects suitable for beginners', nl: 'Praktische projecten geschikt voor beginners' },
      { ar: 'أخلاقيات الاستخدام والخصوصية', en: 'Usage ethics and privacy', nl: 'Gebruiksethiek en privacy' },
    ],
    suggestedPrograms: [
      { ar: 'مقدمة في الذكاء الاصطناعي التطبيقي', en: 'Introduction to Applied AI', nl: 'Inleiding tot Toegepaste AI' },
      { ar: 'ورشة الأتمتة الذكية', en: 'Smart Automation Workshop', nl: 'Workshop Slimme Automatisering' },
    ],
  },
  {
    id: 'skills-career',
    icon: 'Briefcase',
    title: { ar: 'المهارات والتطوير المهني', en: 'Skills & Career Development', nl: 'Vaardigheden & Carrièreontwikkeling' },
    shortDescription: {
      ar: 'تطوير كفاءات سوق العمل من التواصل إلى إدارة المشاريع.',
      en: 'Developing workplace competencies from communication to project management.',
      nl: 'Ontwikkeling van competenties op de arbeidsmarkt, van communicatie tot projectmanagement.',
    },
    bullets: [
      { ar: 'سيرة ذاتية ومقابلات وعرض للخبرة', en: 'CV writing, interviews, and experience presentation', nl: 'CV-opstellen, sollicitatiegesprekken en ervaring presenteren' },
      { ar: 'مهارات العرض والتفاوض', en: 'Presentation and negotiation skills', nl: 'Presentatie- en onderhandelingsvaardigheden' },
      { ar: 'خطط تطوير مهني قابلة للتنفيذ', en: 'Actionable professional development plans', nl: 'Uitvoerbare professionele ontwikkelingsplannen' },
    ],
    suggestedPrograms: [
      { ar: 'ورشة المقابلة المهنية', en: 'Professional Interview Workshop', nl: 'Workshop Professioneel Sollicitatiegesprek' },
      { ar: 'برنامج المهارات الناعمة', en: 'Soft Skills Program', nl: 'Soft Skills Programma' },
    ],
  },
  {
    id: 'leadership-ruwad',
    icon: 'Rocket',
    title: { ar: 'القيادة (روّاد)', en: 'Leadership (Ruwad)', nl: 'Leiderschap (Ruwad)' },
    shortDescription: {
      ar: 'بناء عقلية المبادرة، التخطيط، وتنمية المشاريع والفرق.',
      en: 'Building an entrepreneurial mindset, planning, and developing projects and teams.',
      nl: 'Het ontwikkelen van een ondernemende mindset, planning en het ontwikkelen van projecten en teams.',
    },
    bullets: [
      { ar: 'أساسيات نموذج العمل والقيمة', en: 'Fundamentals of business models and value', nl: 'Grondbeginselen van bedrijfsmodellen en waarde' },
      { ar: 'مهارات القيادة في بيئات متغيرة', en: 'Leadership skills in changing environments', nl: 'Leiderschapsvaardigheden in veranderende omgevingen' },
      { ar: 'جلسات إرشاد جماعي وفردي حسب البرنامج', en: 'Group and individual mentoring sessions per program', nl: 'Groeps- en individuele mentoringsessies per programma' },
    ],
    suggestedPrograms: [
      { ar: 'ورشة رواد — أساسيات ريادة الأعمال', en: 'Ruwad Workshop — Entrepreneurship Basics', nl: 'Ruwad Workshop — Ondernemerschap Basis' },
      { ar: 'برنامج القيادة الخدمية', en: 'Servant Leadership Program', nl: 'Dienend Leiderschapsprogramma' },
    ],
  },
  {
    id: 'awareness-knowledge',
    icon: 'Lightbulb',
    title: { ar: 'الوعي والمعرفة', en: 'Awareness & Knowledge', nl: 'Bewustzijn & Kennis' },
    shortDescription: {
      ar: 'مساحات للتفكير النقدي، المعرفة العامة، والحوار البنّاء.',
      en: 'Spaces for critical thinking, general knowledge, and constructive dialogue.',
      nl: 'Ruimte voor kritisch denken, algemene kennis en constructieve dialoog.',
    },
    bullets: [
      { ar: 'مواضيع معرفية تدعم النضج الفكري', en: 'Knowledge topics that support intellectual maturity', nl: 'Kennisthema\'s die intellectuele volwassenheid ondersteunen' },
      { ar: 'نقاشات موجهة باحترام للاختلاف', en: 'Guided discussions with respect for difference', nl: 'Begeleide discussies met respect voor verschil' },
      { ar: 'موارد للقراءة والمتابعة الذاتية', en: 'Resources for reading and self-study', nl: 'Bronnen voor lezen en zelfstudie' },
    ],
    suggestedPrograms: [
      { ar: 'سلسلة جلسات الوعي المعرفي', en: 'Knowledge Awareness Session Series', nl: 'Kennisbewustzijn Sessiereeks' },
      { ar: 'ورشة التفكير النقدي', en: 'Critical Thinking Workshop', nl: 'Workshop Kritisch Denken' },
    ],
  },
  {
    id: 'mental-health',
    icon: 'HeartPulse',
    title: { ar: 'الرفاه', en: 'Well-being', nl: 'Welzijn' },
    shortDescription: {
      ar: 'دعم وقائي وتثقيفي للتوازن، العناية الذاتية، وجودة الحياة اليومية.',
      en: 'Preventive and educational support for balance, self-care, and daily quality of life.',
      nl: 'Preventieve en educatieve ondersteuning voor balans, zelfzorg en dagelijkse kwaliteit van leven.',
    },
    bullets: [
      { ar: 'مبادئ العناية الذاتية والحدود الصحية', en: 'Principles of self-care and healthy boundaries', nl: 'Principes van zelfzorg en gezonde grenzen' },
      { ar: 'إدارة الضغط والقلق في مراحل الانتقال', en: 'Managing stress and anxiety during transitions', nl: 'Omgaan met stress en angst tijdens overgangsfasen' },
      { ar: 'توجيه للحصول على دعم متخصص عند الحاجة', en: 'Guidance on accessing specialist support when needed', nl: 'Begeleiding bij het krijgen van gespecialiseerde ondersteuning indien nodig' },
    ],
    suggestedPrograms: [
      { ar: 'ورشة التوازن النفسي', en: 'Mental Balance Workshop', nl: 'Workshop Mentale Balans' },
      { ar: 'جلسة تثقيفية عن المرونة', en: 'Resilience Educational Session', nl: 'Educatieve Sessie over Veerkracht' },
    ],
  },
  {
    id: 'financial-literacy',
    icon: 'Wallet',
    title: { ar: 'الوعي المالي', en: 'Financial Literacy', nl: 'Financiële Geletterdheid' },
    shortDescription: {
      ar: 'مفاهيم مالية عملية للتخطيط، الادخار، وفهم الخيارات.',
      en: 'Practical financial concepts for planning, saving, and understanding options.',
      nl: 'Praktische financiële concepten voor planning, sparen en het begrijpen van opties.',
    },
    bullets: [
      { ar: 'ميزانية شخصية بسيطة وقابلة للاستمرار', en: 'Simple and sustainable personal budgeting', nl: 'Eenvoudige en duurzame persoonlijke budgettering' },
      { ar: 'مقدمة في الائتمان والمخاطر', en: 'Introduction to credit and risk', nl: 'Inleiding tot krediet en risico' },
      { ar: 'قراءة واقعية لخيارات الاستثمار المبسطة', en: 'Realistic overview of simplified investment options', nl: 'Realistisch overzicht van eenvoudige beleggingsopties' },
    ],
    suggestedPrograms: [
      { ar: 'ورشة الميزانية الشخصية', en: 'Personal Budgeting Workshop', nl: 'Workshop Persoonlijke Budgettering' },
      { ar: 'برنامج الوعي المالي للمبتدئين', en: 'Financial Literacy for Beginners', nl: 'Financiële Geletterdheid voor Beginners' },
    ],
  },
  {
    id: 'experiential',
    icon: 'Map',
    title: { ar: 'التعلّم التجريبي', en: 'Experiential Learning', nl: 'Ervaringsgericht Leren' },
    shortDescription: {
      ar: 'تعلّم عبر التجربة المباشرة والأنشطة التطبيقية وربط المعرفة بواقع الميدان.',
      en: 'Learn through direct experience, hands-on activities, and connecting knowledge to real-world practice.',
      nl: 'Leren door directe ervaring, praktische activiteiten en het verbinden van kennis met de praktijk.',
    },
    bullets: [
      { ar: 'جلسات ميدانية ومجتمعية', en: 'Field and community sessions', nl: 'Veld- en gemeenschapssessies' },
      { ar: 'ربط النظرية بتجارب حقيقية', en: 'Connecting theory to real experiences', nl: 'Theorie verbinden met echte ervaringen' },
      { ar: 'فرق عمل وتقارير عرض قصيرة', en: 'Work teams and short presentation reports', nl: 'Werkteams en korte presentatierapporten' },
    ],
    suggestedPrograms: [
      { ar: 'يوم ميداني — تعرّف على المؤسسات', en: 'Field Day — Discover Organizations', nl: 'Velddag — Ontdek Organisaties' },
      { ar: 'ورشة التعلم بالمشاريع', en: 'Project-Based Learning Workshop', nl: 'Workshop Projectgestuurd Leren' },
    ],
  },
  {
    id: 'future-minds',
    icon: 'Baby',
    title: { ar: 'الأطفال (عقول المستقبل)', en: 'Children (Future Minds)', nl: 'Kinderen (Toekomstige Geesten)' },
    shortDescription: {
      ar: 'أنشطة مناسبة للأعمار لتنمية الفضول والتعلم الآمن والممتع.',
      en: 'Age-appropriate activities to develop curiosity and safe, enjoyable learning.',
      nl: 'Leeftijdsgeschikte activiteiten om nieuwsgierigheid en veilig, plezierig leren te ontwikkelen.',
    },
    bullets: [
      { ar: 'مهارات التواصل والتعاون للناشئة', en: 'Communication and collaboration skills for youth', nl: 'Communicatie- en samenwerkingsvaardigheden voor jongeren' },
      { ar: 'أساسيات التفكير الإبداعي', en: 'Fundamentals of creative thinking', nl: 'Grondbeginselen van creatief denken' },
      { ar: 'برامج أسرية داعمة', en: 'Supportive family programs', nl: 'Ondersteunende gezinsprogramma\'s' },
    ],
    suggestedPrograms: [
      { ar: 'برنامج عقول المستقبل', en: 'Future Minds Program', nl: 'Toekomstige Geesten Programma' },
      { ar: 'ورشة القراءة والاستكشاف', en: 'Reading and Exploration Workshop', nl: 'Workshop Lezen en Ontdekken' },
    ],
  },
  {
    id: 'partnerships',
    icon: 'Handshake',
    title: { ar: 'الشراكات', en: 'Partnerships', nl: 'Partnerschappen' },
    shortDescription: {
      ar: 'بناء جسور مع مؤسسات وخبراء لخدمة المجتمع التعليمي بشكل أوسع.',
      en: 'Building bridges with institutions and experts to serve the educational community more broadly.',
      nl: 'Bruggen bouwen met instellingen en experts om de educatieve gemeenschap breder te bedienen.',
    },
    bullets: [
      { ar: 'نماذج شراكة مرنة ومحددة الأهداف', en: 'Flexible and goal-oriented partnership models', nl: 'Flexibele en doelgerichte samenwerkingsmodellen' },
      { ar: 'تكامل بين البرامج والخبرات', en: 'Integration between programs and expertise', nl: 'Integratie tussen programma\'s en expertise' },
      { ar: 'حوكمة واضحة للتعاون', en: 'Clear governance for collaboration', nl: 'Duidelijk bestuur voor samenwerking' },
    ],
    suggestedPrograms: [
      { ar: 'باقة الشراكات المؤسسية', en: 'Institutional Partnership Package', nl: 'Institutioneel Partnerschapspakket' },
      { ar: 'ورشة تصميم برنامج مشترك', en: 'Joint Program Design Workshop', nl: 'Workshop Gezamenlijk Programmaontwerp' },
    ],
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
    title: { ar: 'الإدارة العليا', en: 'Executive Management', nl: 'Directie' },
    description: {
      ar: 'الرؤية الاستراتيجية، التوجه العام، والالتزام بأثر المنصة طويل المدى.',
      en: 'Strategic vision, general direction, and commitment to the platform\'s long-term impact.',
      nl: 'Strategische visie, algemene richting en toewijding aan de langetermijnimpact van het platform.',
    },
    responsibilities: [
      { ar: 'اعتماد السياسات والأولويات السنوية', en: 'Approving annual policies and priorities', nl: 'Goedkeuren van jaarlijks beleid en prioriteiten' },
      { ar: 'تمثيل EMC أمام الشركاء', en: 'Representing EMC with partners', nl: 'EMC vertegenwoordigen bij partners' },
      { ar: 'ضمان توافق البرامج مع الرسالة', en: 'Ensuring program alignment with the mission', nl: 'Zorgen voor afstemming van programma\'s op de missie' },
    ],
  },
  {
    id: 'programs',
    icon: 'Waypoints',
    title: { ar: 'البرامج والمسارات', en: 'Programs & Tracks', nl: 'Programma\'s & Trajecten' },
    description: {
      ar: 'تصميم وتنفيذ البرامج والمسارات التعليمية بجودة وتسلسل منطقي.',
      en: 'Designing and implementing educational programs and tracks with quality and logical sequencing.',
      nl: 'Ontwerpen en implementeren van educatieve programma\'s en trajecten met kwaliteit en logische volgorde.',
    },
    responsibilities: [
      { ar: 'هندسة المحتوى والجداول', en: 'Content and schedule engineering', nl: 'Content- en schema-engineering' },
      { ar: 'تنسيق المدربين والجلسات', en: 'Coordinating trainers and sessions', nl: 'Coördinatie van trainers en sessies' },
      { ar: 'قياس مخرجات التعلم', en: 'Measuring learning outcomes', nl: 'Meten van leerresultaten' },
    ],
  },
  {
    id: 'operations',
    icon: 'Cog',
    title: { ar: 'التشغيل والعمليات', en: 'Operations', nl: 'Operaties' },
    description: {
      ar: 'تشغيل يومي سلسل للفعاليات، التسجيل، والخدمات اللوجستية.',
      en: 'Smooth daily operations for events, registration, and logistical services.',
      nl: 'Soepele dagelijkse operaties voor evenementen, registratie en logistieke diensten.',
    },
    responsibilities: [
      { ar: 'إدارة الجداول والقاعات والمنصات', en: 'Managing schedules, venues, and platforms', nl: 'Beheer van schema\'s, locaties en platforms' },
      { ar: 'دعم تجربة المشارك من البداية للنهاية', en: 'Supporting the participant experience end-to-end', nl: 'Ondersteuning van de deelnemerservaring van begin tot eind' },
      { ar: 'توثيق الإجراءات التشغيلية', en: 'Documenting operational procedures', nl: 'Documenteren van operationele procedures' },
    ],
  },
  {
    id: 'marketing',
    icon: 'Megaphone',
    title: { ar: 'التسويق والإعلام', en: 'Marketing & Media', nl: 'Marketing & Media' },
    description: {
      ar: 'إيصال الرسالة بوضوح وبناء هوية محتوى احترافية.',
      en: 'Delivering the message clearly and building a professional content identity.',
      nl: 'De boodschap duidelijk overbrengen en een professionele contentidentiteit opbouwen.',
    },
    responsibilities: [
      { ar: 'الحملات والقنوات الرقمية', en: 'Campaigns and digital channels', nl: 'Campagnes en digitale kanalen' },
      { ar: 'إنتاج مواد توعوية وتعليمية', en: 'Producing educational and awareness materials', nl: 'Produceren van educatief en bewustwordingsmateriaal' },
      { ar: 'تحليل التفاعل وتحسين العروض', en: 'Analyzing engagement and improving offerings', nl: 'Analyseren van betrokkenheid en verbeteren van aanbod' },
    ],
  },
  {
    id: 'partnerships-pr',
    icon: 'UsersRound',
    title: { ar: 'الشراكات والعلاقات', en: 'Partnerships & PR', nl: 'Partnerschappen & PR' },
    description: {
      ar: 'بناء علاقات مستدامة مع مؤسسات وخبراء ومجتمع مهني.',
      en: 'Building sustainable relationships with institutions, experts, and the professional community.',
      nl: 'Duurzame relaties opbouwen met instellingen, experts en de professionele gemeenschap.',
    },
    responsibilities: [
      { ar: 'تطوير اتفاقيات التعاون', en: 'Developing collaboration agreements', nl: 'Ontwikkelen van samenwerkingsovereenkomsten' },
      { ar: 'تنسيق الفعاليات المشتركة', en: 'Coordinating joint events', nl: 'Coördineren van gezamenlijke evenementen' },
      { ar: 'التواصل مع وسائل الإعلام والمجتمع', en: 'Communicating with media and the community', nl: 'Communiceren met media en de gemeenschap' },
    ],
  },
  {
    id: 'finance',
    icon: 'Landmark',
    title: { ar: 'المالية', en: 'Finance', nl: 'Financiën' },
    description: {
      ar: 'شفافية مالية، تخطيط موارد، وضبط التكاليف بمسؤولية.',
      en: 'Financial transparency, resource planning, and responsible cost management.',
      nl: 'Financiële transparantie, resourceplanning en verantwoord kostenbeheer.',
    },
    responsibilities: [
      { ar: 'الميزانيات والتقارير الدورية', en: 'Budgets and periodic reports', nl: 'Budgetten en periodieke rapportages' },
      { ar: 'سياسات التسعير والمنح عند التوفر', en: 'Pricing policies and grants when available', nl: 'Prijsbeleid en subsidies wanneer beschikbaar' },
      { ar: 'الامتثال للأنظمة المحلية', en: 'Compliance with local regulations', nl: 'Naleving van lokale regelgeving' },
    ],
  },
  {
    id: 'tech',
    icon: 'Cpu',
    title: { ar: 'التقنية', en: 'Technology', nl: 'Technologie' },
    description: {
      ar: 'بنية تقنية آمنة وتجربة رقمية موثوقة للمتعلمين والفريق.',
      en: 'Secure technical infrastructure and reliable digital experience for learners and the team.',
      nl: 'Veilige technische infrastructuur en betrouwbare digitale ervaring voor leerlingen en het team.',
    },
    responsibilities: [
      { ar: 'صيانة المنصات والأنظمة', en: 'Maintaining platforms and systems', nl: 'Onderhoud van platforms en systemen' },
      { ar: 'دعم المستخدمين التقني', en: 'Technical user support', nl: 'Technische gebruikersondersteuning' },
      { ar: 'حماية البيانات والنسخ الاحتياطي', en: 'Data protection and backup', nl: 'Gegevensbescherming en back-up' },
    ],
  },
  {
    id: 'hr',
    icon: 'UserCog',
    title: { ar: 'الموارد البشرية', en: 'Human Resources', nl: 'Personeelszaken' },
    description: {
      ar: 'استقطاب وتطوير ثقافة عمل احترافية وداعمة.',
      en: 'Attracting talent and developing a professional, supportive work culture.',
      nl: 'Talent aantrekken en een professionele, ondersteunende werkcultuur ontwikkelen.',
    },
    responsibilities: [
      { ar: 'التطوع والتوظيف حسب السياسات', en: 'Volunteering and recruitment according to policies', nl: 'Vrijwilligerswerk en werving volgens beleid' },
      { ar: 'التدريب الداخلي للفريق', en: 'Internal training for the team', nl: 'Interne training voor het team' },
      { ar: 'تجارب موظف إيجابية', en: 'Positive employee experiences', nl: 'Positieve medewerkerservaringen' },
    ],
  },
  {
    id: 'community-wellbeing',
    icon: 'HeartHandshake',
    title: { ar: 'المجتمع والصحة', en: 'Community & Well-being', nl: 'Gemeenschap & Welzijn' },
    description: {
      ar: 'برامج مجتمعية تدعم الوعي والصحة والاندماج بكرامة.',
      en: 'Community programs that support awareness, health, and dignified integration.',
      nl: 'Gemeenschapsprogramma\'s die bewustzijn, gezondheid en waardige integratie ondersteunen.',
    },
    responsibilities: [
      { ar: 'مبادرات مجتمعية موسمية', en: 'Seasonal community initiatives', nl: 'Seizoensgebonden gemeenschapsinitiatieven' },
      { ar: 'شراكات مع جهات الصحة والوعي', en: 'Partnerships with health and awareness organizations', nl: 'Partnerschappen met gezondheids- en bewustzijnsorganisaties' },
      { ar: 'حماية المشاركين نفسياً واجتماعياً', en: 'Psychological and social protection of participants', nl: 'Psychologische en sociale bescherming van deelnemers' },
    ],
  },
  {
    id: 'quality',
    icon: 'ShieldCheck',
    title: { ar: 'الجودة والحوكمة', en: 'Quality & Governance', nl: 'Kwaliteit & Bestuur' },
    description: {
      ar: 'معايير جودة، مراجعة مستمرة، وحوكمة قرارات واضحة.',
      en: 'Quality standards, continuous review, and clear decision governance.',
      nl: 'Kwaliteitsnormen, continue beoordeling en duidelijk besluitvormingsbestuur.',
    },
    responsibilities: [
      { ar: 'سياسات الجودة والمخاطر', en: 'Quality and risk policies', nl: 'Kwaliteits- en risicobeleid' },
      { ar: 'تحسين العمليات بناءً على الملاحظات', en: 'Process improvement based on feedback', nl: 'Procesverbetering op basis van feedback' },
      { ar: 'التوثيق والامتثال', en: 'Documentation and compliance', nl: 'Documentatie en naleving' },
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
    title: { ar: 'الجامعات والمؤسسات التعليمية', en: 'Universities & Educational Institutions', nl: 'Universiteiten & Onderwijsinstellingen' },
    description: {
      ar: 'تعاون أكاديمي في برامج، ورش، ومسارات للطلاب والخريجين.',
      en: 'Academic collaboration on programs, workshops, and tracks for students and graduates.',
      nl: 'Academische samenwerking aan programma\'s, workshops en trajecten voor studenten en afgestudeerden.',
    },
  },
  {
    icon: 'BookMarked',
    title: { ar: 'المدارس والمعاهد', en: 'Schools & Institutes', nl: 'Scholen & Instituten' },
    description: {
      ar: 'أنشطة موجهة للناشئة والمعلمين بما يتوافق مع أهداف المؤسسة.',
      en: 'Activities for youth and educators aligned with institutional goals.',
      nl: 'Activiteiten voor jongeren en docenten in lijn met institutionele doelen.',
    },
  },
  {
    icon: 'Factory',
    title: { ar: 'الشركات ومراكز التدريب', en: 'Companies & Training Centers', nl: 'Bedrijven & Trainingscentra' },
    description: {
      ar: 'تدريب مهارات، ورش داخلية، وبرامج تطوير الموظفين.',
      en: 'Skills training, internal workshops, and employee development programs.',
      nl: 'Vaardigheidstraining, interne workshops en medewerkersontwikkelingsprogramma\'s.',
    },
  },
  {
    icon: 'Mic2',
    title: { ar: 'المدربون والخبراء', en: 'Trainers & Experts', nl: 'Trainers & Experts' },
    description: {
      ar: 'انضمام كمدرب معتمد أو شريك محتوى ضمن معايير الجودة.',
      en: 'Join as a certified trainer or content partner within quality standards.',
      nl: 'Word gecertificeerd trainer of contentpartner binnen kwaliteitsnormen.',
    },
  },
  {
    icon: 'HeartHandshake',
    title: { ar: 'المبادرات المجتمعية', en: 'Community Initiatives', nl: 'Gemeenschapsinitiatieven' },
    description: {
      ar: 'مشاريع أثرية تدعم الفئات الأكثر احتياجاً للتعلم والتمكين.',
      en: 'Impact projects supporting those most in need of learning and empowerment.',
      nl: 'Impactprojecten die degenen ondersteunen die het meest behoefte hebben aan leren en empowerment.',
    },
  },
  {
    icon: 'BadgeDollarSign',
    title: { ar: 'الجهات الداعمة والرعاة', en: 'Supporting Organizations & Sponsors', nl: 'Ondersteunende Organisaties & Sponsors' },
    description: {
      ar: 'شراكات رعاية مسؤولة تخدم المجتمع التعليمي دون المساس بالاستقلالية الأكاديمية.',
      en: 'Responsible sponsorship partnerships that serve the educational community without compromising academic independence.',
      nl: 'Verantwoorde sponsorschapspartnerschappen die de educatieve gemeenschap dienen zonder academische onafhankelijkheid in gevaar te brengen.',
    },
  },
]

/** Contact / footer — aligned branding */
export const siteContact = {
  phone: '+31 6 00 000 000',
  email: 'info@emc-edu.com',
  location: { ar: 'أمستردام، هولندا — خدمة أونلاين ومجتمعات عربية وهولندية', en: 'Amsterdam, the Netherlands — Online service with Arabic and Dutch communities', nl: 'Amsterdam, Nederland — Online service met Arabische en Nederlandse gemeenschappen' },
  hours: { ar: 'الأحد — الخميس، 9:00 — 18:00 (بتوقيت أوروبا الوسطى)', en: 'Sunday — Thursday, 9:00 — 18:00 (Central European Time)', nl: 'Zondag — Donderdag, 9:00 — 18:00 (Midden-Europese Tijd)' },
}
