/**
 * محتوى صفحات الهبوط الثمانية للمسارات (/tracks/<slug>) — من وثيقة المؤسس
 * 2026-08-22 حرفياً. القالب الموحد: نظرة عامة ← لمن ← ماذا ستستفيد ← الرحلة
 * (المراحل والوحدات بمحاورها) ← الورش ← المخرجات ← الأدوات ← ما بعد المسار.
 * الأسعار تُقرأ من officialTracks (المعتمدة فقط تظهر).
 */

export interface TrackUnit {
  name: string
  nameEn?: string
  axes?: string[]
  note?: string
}

export interface TrackPhase {
  title: string
  titleEn?: string
  units: TrackUnit[]
}

export interface TrackPage {
  slug: string
  /** id المطابق في officialTracks لقراءة السعر والمدة */
  trackId: string
  title: string
  titleEn: string
  cardDesc: string
  about: string[]
  audience: string[]
  outcomes: string[]
  phases: TrackPhase[]
  workshops: string[]
  deliverables: string[]
  tools: string[]
  afterPath: string[]
}

export const TRACK_PAGES: TrackPage[] = [
  {
    slug: 'ai-engineer',
    trackId: 'ai-engineer',
    title: 'مسار مهندس الذكاء الاصطناعي',
    titleEn: 'AI Engineer Path',
    cardDesc:
      'مدخل الذكاء الاصطناعي، Python، البيانات، تعلم الآلة والتعلم العميق، هندسة تطبيقات الذكاء الاصطناعي، وبناء مشاريع حقيقية قابلة للتطوير.',
    about: [
      'مسار مهندس الذكاء الاصطناعي رحلة مهنية متدرجة تبدأ من فهم كيفية بناء مشاريع الذكاء الاصطناعي بصورة منهجية، ثم تنتقل إلى البرمجة والرياضيات والبيانات، وصولاً إلى تعلم الآلة والتعلم العميق والذكاء الاصطناعي التوليدي وبناء الأنظمة والتطبيقات الذكية.',
      'لا يهدف المسار إلى تعليم أدوات منفصلة فقط، بل إلى مساعدة المتعلم على فهم دورة حياة مشروع الذكاء الاصطناعي كاملة: المشكلة ← البيانات ← التجهيز ← النمذجة ← التقييم ← التطبيق ← المشروع.',
    ],
    audience: [
      'طلاب وخريجو الهندسة',
      'طلاب علوم الحاسوب وتقنية المعلومات',
      'المبرمجون الراغبون في دخول AI',
      'المهتمون ببناء تطبيقات الذكاء الاصطناعي',
      'الباحثون الراغبون في تقوية الجانب التطبيقي',
      'العاملون في التقنية والتحول الرقمي',
      'أصحاب أساس برمجي يرغبون في التخصص في AI',
    ],
    outcomes: [
      'فهم مراحل بناء مشروع AI',
      'استخدام Python في مشاريع الذكاء الاصطناعي',
      'تجهيز البيانات وتحليلها',
      'بناء نماذج Machine Learning',
      'فهم وتطبيق أساسيات Deep Learning',
      'التعامل مع النماذج اللغوية الكبيرة (LLMs)',
      'بناء تطبيقات باستخدام RAG',
      'بناء AI Agents',
      'فهم أساسيات نشر وتشغيل النماذج',
      'بناء Portfolio تقني ومشروع تخرج متكامل',
    ],
    phases: [
      {
        title: 'المرحلة 1 — التأسيس',
        titleEn: 'Foundation',
        units: [
          {
            name: 'بناء مشاريع الذكاء الاصطناعي',
            nameEn: 'Building AI Projects',
            axes: ['Business Understanding', 'Data Understanding', 'Data Preparation', 'Modeling', 'Evaluation', 'Deployment'],
            note: 'المخرج: مشروع تطبيقي أول',
          },
          {
            name: 'Python للذكاء الاصطناعي والبيانات',
            nameEn: 'Python for AI & Data',
            axes: ['Python Fundamentals', 'Data Types', 'Conditions', 'Loops', 'Functions', 'OOP Basics', 'NumPy', 'Pandas', 'الملفات والبيانات', 'Git/GitHub'],
          },
          {
            name: 'الرياضيات للذكاء الاصطناعي',
            nameEn: 'Mathematics for AI',
            axes: ['Algebra', 'Functions', 'Probability', 'Statistics', 'Linear Algebra', 'Vectors', 'Matrices', 'Calculus', 'Optimization', 'Gradient Descent'],
          },
        ],
      },
      {
        title: 'المرحلة 2 — الذكاء الاصطناعي الأساسي',
        titleEn: 'Core AI',
        units: [
          {
            name: 'تعلم الآلة',
            nameEn: 'Machine Learning',
            axes: ['Supervised Learning', 'Unsupervised Learning', 'Regression', 'Classification', 'Clustering', 'Feature Engineering', 'Model Selection', 'Cross Validation', 'Evaluation Metrics'],
            note: 'مشروع: نموذج تعلم آلة لحل مشكلة واقعية',
          },
          {
            name: 'التعلم العميق',
            nameEn: 'Deep Learning',
            axes: ['Neural Networks', 'Forward/Backward Propagation', 'Optimizers', 'CNN Fundamentals', 'Sequence Models', 'Transfer Learning', 'Model Evaluation'],
          },
        ],
      },
      {
        title: 'المرحلة 3 — الذكاء الاصطناعي الحديث',
        titleEn: 'Modern AI Engineering',
        units: [
          { name: 'الذكاء الاصطناعي التوليدي', nameEn: 'Generative AI', axes: ['LLM Fundamentals', 'Prompt Engineering', 'Structured Prompting', 'Multimodal AI', 'AI Assistants', 'Responsible AI'] },
          { name: 'هندسة النماذج اللغوية الكبيرة', nameEn: 'LLM Engineering', axes: ['LLM APIs', 'Embeddings', 'Structured Outputs', 'Function Calling', 'Context Management', 'Evaluation', 'Cost & Performance'] },
          { name: 'أنظمة RAG', nameEn: 'Retrieval-Augmented Generation', axes: ['Embeddings', 'Vector Databases', 'Chunking', 'Retrieval', 'Reranking', 'Grounding', 'Evaluation', 'مساعد يعتمد على معرفة خاصة'] },
          { name: 'الوكلاء والأتمتة', nameEn: 'AI Agents & Automation', axes: ['Agent Architecture', 'Tools', 'Memory', 'Planning', 'Workflows', 'Multi-step Agents', 'Automation', 'Integrations'] },
          { name: 'MLOps ونشر الأنظمة', nameEn: 'MLOps & Deployment', axes: ['Model Deployment', 'APIs', 'Docker Basics', 'Versioning', 'Monitoring', 'Experiment Tracking', 'CI/CD', 'Production AI'] },
        ],
      },
      {
        title: 'المرحلة 4 و5 — التطبيق ومشروع التخرج',
        titleEn: 'Application & Capstone',
        units: [
          {
            name: 'مشروع التخرج',
            nameEn: 'AI Capstone Project',
            note: 'يختار المتعلم مشكلة حقيقية ويطبق عليها الرحلة كاملة: Problem → Data → Model → Evaluation → Application → Demo',
          },
        ],
      },
    ],
    workshops: [
      'بناء نموذج Machine Learning من البداية',
      'بناء مساعد ذكي',
      'بناء RAG Application',
      'بناء AI Agent',
      'نشر نموذج كـAPI',
      'مراجعة Architecture',
      'GitHub & Portfolio Workshop',
      'Project Review Sessions',
    ],
    deliverables: ['مشروع قابل للعرض', 'GitHub Repository', 'Technical Documentation', 'Presentation', 'Portfolio Case Study'],
    tools: ['Python', 'Pandas', 'NumPy', 'Scikit-learn', 'PyTorch/TensorFlow', 'Git', 'GitHub', 'Jupyter', 'APIs', 'LLM APIs', 'Vector Databases', 'Docker'],
    afterPath: ['زمالة EMC المهنية في الذكاء الاصطناعي', 'Computer Vision', 'Agentic AI', 'LLM/RAG', 'Applied ML', 'مشاريع EMC/NLAI', 'شبكة الخريجين والفرص'],
  },
  {
    slug: 'data-scientist',
    trackId: 'data-scientist',
    title: 'مسار عالم البيانات',
    titleEn: 'Data Scientist Path',
    cardDesc: 'تحليل البيانات، الإحصاء، التصوير البياني، تعلم الآلة، بناء النماذج واستخراج الرؤى والتنبؤات لدعم القرارات.',
    about: [
      'رحلة متخصصة في تحويل البيانات الخام إلى معرفة ونماذج وتوقعات تساعد المؤسسات على فهم الواقع واتخاذ قرارات أفضل.',
      'يجمع المسار بين: Statistics + Programming + Data Analysis + Machine Learning + Business Understanding.',
    ],
    audience: ['محللو البيانات الراغبون في التطور', 'طلاب علوم الحاسوب', 'الهندسة', 'الرياضيات', 'الإحصاء', 'الباحثون', 'المهتمون بعلم البيانات والتعلم الآلي'],
    outcomes: [
      'تنظيف وتحليل البيانات',
      'إجراء التحليل الاستكشافي',
      'تطبيق الإحصاء',
      'بناء Visualizations',
      'بناء نماذج ML وتفسير نتائجها وتقييمها',
      'تقديم توصيات مبنية على البيانات',
      'تنفيذ مشروع Data Science كامل',
    ],
    phases: [
      {
        title: 'الوحدات',
        units: [
          { name: 'بناء مشاريع الذكاء الاصطناعي', axes: ['CRISP-DM', 'Problem Framing'] },
          { name: 'الرياضيات لعلوم البيانات', axes: ['Linear Algebra', 'Calculus', 'Optimization'] },
          { name: 'الاحتمالات والإحصاء', axes: ['Probability', 'Distributions', 'Hypothesis Testing', 'Correlation', 'Regression'] },
          { name: 'Python لعلوم البيانات' },
          { name: 'تحليل البيانات', axes: ['Pandas', 'Cleaning', 'EDA'] },
          { name: 'تصور البيانات', axes: ['Matplotlib', 'Power BI/Tableau حسب التطبيق'] },
          { name: 'تعلم الآلة', axes: ['Regression', 'Classification', 'Clustering'] },
          { name: 'تنقيب البيانات', axes: ['Patterns', 'Segmentation', 'Feature Discovery'] },
          { name: 'التعلم العميق', note: 'المبادئ والتطبيقات المناسبة لعلوم البيانات' },
          { name: 'مشروع علم البيانات' },
        ],
      },
    ],
    workshops: ['Exploratory Data Analysis', 'Statistical Testing', 'Feature Engineering', 'Model Comparison', 'Data Storytelling', 'Prediction Challenge', 'Kaggle/GitHub Portfolio', 'Capstone Review'],
    deliverables: ['Data Science Portfolio', 'Notebook Projects', 'Predictive Model', 'Data Story', 'GitHub', 'Technical Report', 'Capstone Project'],
    tools: ['Python', 'Pandas', 'NumPy', 'Scikit-learn', 'Matplotlib', 'Jupyter', 'Git', 'GitHub'],
    afterPath: ['زمالة علوم البيانات', 'Applied Data Science', 'Machine Learning', 'Business Analytics', 'شبكة الخريجين والفرص'],
  },
  {
    slug: 'data-engineer',
    trackId: 'data-engineer',
    title: 'مسار مهندس البيانات',
    titleEn: 'Data Engineer Path',
    cardDesc: 'SQL وقواعد البيانات، خطوط البيانات، عمليات ETL/ELT، السحابة، Data Warehousing، وتجهيز البيانات للتحليل والذكاء الاصطناعي.',
    about: [
      'يركز المسار على البنية التي تجعل البيانات قابلة للاستخدام. عالم البيانات ومحلل البيانات يحتاجان بيانات موثوقة ومنظمة، وهنا يأتي دور مهندس البيانات.',
      'Source → Ingestion → Storage → Transformation → Quality → Warehouse → Analytics/AI',
    ],
    audience: ['المبرمجون', 'مطورو Backend', 'محللو البيانات الراغبون في الانتقال للهندسة', 'طلاب التقنية والحاسوب', 'المهتمون بالسحابة وبنية البيانات'],
    outcomes: [
      'تصميم قواعد البيانات وSQL المتقدم',
      'Data Modeling',
      'ETL/ELT وData Pipelines',
      'APIs',
      'Data Warehouses وData Lakes',
      'Orchestration وCloud Basics',
      'Data Quality وتجهيز البيانات لأنظمة AI',
    ],
    phases: [
      {
        title: 'المراحل',
        units: [
          { name: 'Data Foundations', axes: ['Data Types', 'Structured / Semi-structured', 'File Formats', 'Data Lifecycle'] },
          { name: 'SQL & Databases', axes: ['SQL', 'PostgreSQL', 'Joins', 'Aggregations', 'Window Functions', 'Indexes', 'Database Design'] },
          { name: 'Python for Data Engineering', axes: ['Python', 'Files', 'APIs', 'Automation', 'Data Transformation'] },
          { name: 'Data Modeling', axes: ['OLTP vs OLAP', 'Dimensional Modeling', 'Fact/Dimension', 'Star Schema', 'Warehouse Design'] },
          { name: 'ETL / ELT', axes: ['Extraction', 'Transformation', 'Loading', 'Validation', 'Scheduling'] },
          { name: 'Data Pipelines', axes: ['Batch Processing', 'Pipeline Architecture', 'Orchestration'] },
          { name: 'Cloud & Modern Data Platforms', axes: ['Cloud Storage', 'Warehousing', 'Scalability', 'Security Basics'] },
          { name: 'Data Quality & Governance' },
          { name: 'Data for AI', note: 'كيفية تجهيز Pipelines تخدم Analytics وML وتطبيقات AI' },
          { name: 'Capstone', note: 'بناء Pipeline من مصدر بيانات إلى Data Warehouse/Dashboard' },
        ],
      },
    ],
    workshops: ['SQL Challenge', 'Pipeline Build Workshop', 'Data Modeling Review', 'Warehouse Project Session'],
    deliverables: ['SQL Portfolio', 'ETL Pipeline', 'Data Model', 'Warehouse Project', 'Documentation', 'GitHub', 'Data Engineering Capstone'],
    tools: ['Python', 'SQL', 'PostgreSQL', 'Git', 'Docker', 'Airflow', 'dbt', 'APIs'],
    afterPath: ['مسارات الذكاء الاصطناعي المتقدمة', 'مشاريع البيانات في EMC', 'شبكة الخريجين والفرص'],
  },
  {
    slug: 'data-analyst',
    trackId: 'data-analyst',
    title: 'مسار محلل البيانات',
    titleEn: 'Data Analyst Path',
    cardDesc: 'Excel، SQL، Python، Power BI أو Tableau، إعداد التقارير ولوحات المعلومات ومؤشرات الأداء وتحويل البيانات إلى قرارات.',
    about: [
      'يؤهل المتعلم للانتقال من: بيانات خام → تحليل → مؤشر → لوحة معلومات → قرار.',
      'ويعد من أكثر المسارات المناسبة للدخول العملي إلى مجال البيانات.',
    ],
    audience: ['المبتدئون', 'الخريجون', 'الإداريون', 'الماليون', 'العاملون في المبيعات', 'الباحثون', 'من يريد الانتقال إلى مهنة البيانات'],
    outcomes: [
      'تنظيف البيانات وتحليلها في Excel وPython',
      'SQL عملي للاستعلام والتجميع',
      'بناء لوحات معلومات Power BI',
      'تصميم مؤشرات أداء وتقارير تدعم القرار',
      'مشروع Portfolio كامل',
    ],
    phases: [
      {
        title: 'الوحدات',
        units: [
          { name: 'بناء مشاريع الذكاء الاصطناعي وفهم البيانات' },
          { name: 'Excel for Data Analysis', axes: ['Cleaning', 'Formulas', 'Lookups', 'Pivot Tables', 'Dashboards'] },
          { name: 'Applied Statistics' },
          { name: 'SQL', axes: ['SELECT', 'Filters', 'Joins', 'Aggregation', 'Subqueries', 'Window Functions'] },
          { name: 'Python for Data Analysis' },
          { name: 'Data Visualization' },
          { name: 'Power BI', axes: ['Power Query', 'Data Model', 'DAX', 'KPIs', 'Dashboards'] },
          { name: 'Business Intelligence', axes: ['Business Questions', 'KPIs', 'Reporting', 'Decision Support'] },
          { name: 'Portfolio Project' },
        ],
      },
    ],
    workshops: ['Cleaning Challenge', 'SQL Challenge', 'Dashboard Workshop', 'KPI Design', 'Data Storytelling', 'Business Case', 'Portfolio Review'],
    deliverables: ['Excel Project', 'SQL Project', 'Python Analysis', 'Power BI Dashboard', 'Business Report', 'Portfolio', 'Capstone'],
    tools: ['Excel', 'SQL', 'Python', 'Power BI', 'Git'],
    afterPath: ['مسار عالم البيانات', 'ذكاء الأعمال المتقدم', 'شبكة الخريجين والفرص'],
  },
  {
    slug: 'generative-ai',
    trackId: 'generative-ai',
    title: 'مسار متخصص الذكاء الاصطناعي التوليدي',
    titleEn: 'Generative AI Specialist Path',
    cardDesc: 'هندسة الأوامر، أدوات الذكاء الاصطناعي، النماذج التوليدية، الإنتاجية، صناعة المحتوى، الأتمتة والوكلاء وبناء حلول عملية.',
    about: [
      'ليس الهدف تعلم قائمة أدوات تتغير كل أسبوع. الهدف هو فهم كيف تستخدم Generative AI كقدرة عملية يمكن دمجها في العمل والمنتجات والعمليات.',
    ],
    audience: ['صناع المحتوى', 'المسوقون', 'المديرون', 'رواد الأعمال', 'الموظفون', 'المطورون', 'المختصون في التحول الرقمي', 'المستقلون'],
    outcomes: [
      'مكتبة أوامر (Prompt Library) منظمة',
      'أنظمة إنتاجية ومحتوى تعمل بالذكاء الاصطناعي',
      'أتمتة عمليات متكررة',
      'بناء مساعد ذكي ووكيل تجريبي',
      'مشروع Portfolio ختامي',
    ],
    phases: [
      {
        title: 'الوحدات',
        units: [
          { name: 'Generative AI Foundations' },
          { name: 'Prompt Engineering', axes: ['Context', 'Roles', 'Constraints', 'Examples', 'Structured Outputs', 'Prompt Patterns'] },
          { name: 'AI Productivity', axes: ['Research', 'Documents', 'Presentations', 'Meetings', 'Analysis'] },
          { name: 'AI Content Creation', axes: ['Text', 'Images', 'Video', 'Audio', 'Content Systems'] },
          { name: 'AI Assistants' },
          { name: 'AI Automation', axes: ['Workflows', 'Integrations', 'No-code/Low-code'] },
          { name: 'LLM Fundamentals' },
          { name: 'RAG Basics' },
          { name: 'AI Agents', axes: ['Tools', 'Memory', 'Planning', 'Agent Workflows'] },
          { name: 'Final AI Solution' },
        ],
      },
    ],
    workshops: ['Prompt Lab', 'AI Research Lab', 'Content Factory', 'Productivity System', 'Automation Workshop', 'Build an AI Assistant', 'Build an Agent', 'Demo Day'],
    deliverables: ['Prompt Library', 'AI Workflow', 'Automation', 'AI Assistant', 'Agent Prototype', 'Portfolio Project'],
    tools: ['ChatGPT وأدوات LLM', 'أدوات الأتمتة (No-code)', 'LLM APIs', 'أدوات المحتوى التوليدي'],
    afterPath: ['مسار مهندس الذكاء الاصطناعي', 'الوكلاء المتقدمون', 'شبكة الخريجين والفرص'],
  },
  {
    slug: 'ai-for-business',
    trackId: 'ai-business',
    title: 'مسار الذكاء الاصطناعي في الأعمال',
    titleEn: 'AI for Business Path',
    cardDesc: 'توظيف الذكاء الاصطناعي في الإدارة والتسويق والعمليات وخدمة العملاء واتخاذ القرار والتحول الرقمي.',
    about: [
      'لا يتطلب أن يكون المتعلم مبرمجاً. الهدف تعليم المتعلم الانتقال من «ما أدوات AI الموجودة؟» إلى «أين توجد قيمة حقيقية داخل المؤسسة، وكيف أحولها إلى مشروع قابل للتنفيذ والقياس؟».',
    ],
    audience: ['أصحاب الشركات', 'المديرون', 'قادة الفرق', 'رواد الأعمال', 'مسؤولو التحول الرقمي', 'الاستشاريون', 'أصحاب القرار'],
    outcomes: [
      'اكتشاف فرص AI داخل المؤسسة وتحليل العمليات',
      'اختيار حالات الاستخدام وبناء الأتمتة',
      'AI Strategy وخارطة تحول رقمي',
      'الحوكمة وإدارة التغيير',
      'مشروع تحول فعلي',
    ],
    phases: [
      {
        title: 'الوحدات',
        units: [
          { name: 'AI Fundamentals for Business' },
          { name: 'Generative AI for Managers' },
          { name: 'AI for Marketing' },
          { name: 'AI for Sales' },
          { name: 'AI for Customer Service' },
          { name: 'AI for Operations' },
          { name: 'AI Automation' },
          { name: 'Data & Decision Making' },
          { name: 'Digital Strategy' },
          { name: 'Innovation Management' },
          { name: 'Change Management' },
          { name: 'AI Governance & Ethics' },
          { name: 'Digital Project Management' },
          { name: 'Transformation Project' },
        ],
      },
    ],
    workshops: ['AI Opportunity Mapping', 'Process Mapping', 'Automation Opportunity Workshop', 'AI Readiness', 'Business Case Design', 'ROI Thinking', 'AI Governance', 'Transformation Roadmap'],
    deliverables: ['AI Opportunity Map', 'Automation Plan', 'Business Case', 'AI Transformation Roadmap', 'Governance Checklist', 'Applied Transformation Project'],
    tools: ['أدوات الذكاء الاصطناعي للأعمال', 'أدوات الأتمتة', 'أطر الاستراتيجية والحوكمة'],
    afterPath: ['برامج القيادة الرقمية', 'استشارات التحول', 'شبكة الخريجين والفرص'],
  },
  {
    slug: 'entrepreneurship',
    trackId: 'entrepreneurship',
    title: 'مسار ريادة الأعمال',
    titleEn: 'Entrepreneurship Path',
    cardDesc: 'تحويل الأفكار إلى مشاريع، فهم المشكلة والسوق، تصميم نموذج العمل، بناء المنتج الأول، العلامة، التسويق، المبيعات والتمويل.',
    about: [
      'الرحلة: Problem → Customer → Value → Business Model → MVP → Market → Revenue → Growth.',
    ],
    audience: ['أصحاب الأفكار', 'الطلاب', 'مؤسسو المشاريع الناشئة', 'المستقلون', 'أصحاب المشاريع الصغيرة', 'فرق الهاكاثونات', 'من يريد تحويل مهارة إلى مشروع'],
    outcomes: [
      'مشكلة متحقق منها وشخصية عميل واضحة',
      'بحث سوق ونموذج عمل',
      'MVP ونموذج تسعير',
      'خطة دخول السوق وPitch Deck',
      'المشاركة في يوم العرض',
    ],
    phases: [
      {
        title: 'الوحدات',
        units: [
          { name: 'Entrepreneurial Mindset' },
          { name: 'Problem Discovery' },
          { name: 'Customer Discovery' },
          { name: 'Market Research' },
          { name: 'Value Proposition' },
          { name: 'Business Model' },
          { name: 'Product Management Basics' },
          { name: 'MVP' },
          { name: 'Branding & Positioning' },
          { name: 'Digital Marketing' },
          { name: 'Sales' },
          { name: 'Financial Fundamentals' },
          { name: 'Funding & Investment Basics' },
          { name: 'Pitching' },
          { name: 'Launch Project' },
        ],
      },
    ],
    workshops: ['Idea Validation', 'Customer Interview', 'Business Model Canvas', 'Competitor Analysis', 'Pricing Workshop', 'MVP Sprint', 'Pitch Deck', 'Investor Pitch Simulation'],
    deliverables: ['Validated Problem', 'Customer Persona', 'Market Research', 'Business Model', 'MVP', 'Pricing Model', 'Go-to-Market Plan', 'Pitch Deck', 'Demo Day'],
    tools: ['Business Model Canvas', 'أدوات بحث السوق', 'أدوات النماذج الأولية', 'أدوات العرض'],
    afterPath: ['برامج التسريع والشراكات', 'مجتمع رواد EMC', 'شبكة الخريجين والفرص'],
  },
  {
    slug: 'professional-advancement',
    trackId: 'professional-advancement',
    title: 'مسار التقدم المهني',
    titleEn: 'Professional Advancement Path',
    cardDesc: 'السيرة الذاتية، LinkedIn، المقابلات، التواصل المهني، البحث عن الفرص، العمل الحر، الهوية الشخصية وبناء خطة مهنية واضحة.',
    about: [
      'ليس الهدف كتابة CV فقط. المسار يساعد المتعلم على بناء: Professional Positioning + Evidence + Visibility + Opportunity Strategy.',
      'أي أن يعرف: من أنا مهنياً؟ ماذا أقدم؟ كيف أثبته وأظهره؟ أين أبحث وكيف أتقدم وأنجح في المقابلة؟ وما خطوتي التالية؟',
    ],
    audience: ['الطلاب', 'الخريجون', 'الباحثون عن عمل', 'من يريد تغيير مجاله', 'المستقلون', 'أصحاب الخبرة الراغبون في تطوير حضورهم المهني'],
    outcomes: [
      'CV جاهز وLinkedIn محسّن',
      'Professional Bio وبنية Portfolio',
      'خطة بحث عن عمل وتحضير مقابلات',
      'استراتيجية Networking',
      'خطة مهنية لـ90 يوماً',
    ],
    phases: [
      {
        title: 'الوحدات',
        units: [
          { name: 'Career Discovery', axes: ['Skills Mapping', 'Strengths', 'Target Roles', 'Gap Analysis'] },
          { name: 'CV Writing', axes: ['ATS', 'Achievement Writing', 'Experience', 'Projects', 'Skills'] },
          { name: 'LinkedIn Professional', axes: ['Profile Optimization', 'Headline', 'About', 'Networking', 'Content'] },
          { name: 'Personal Branding' },
          { name: 'Portfolio & Evidence' },
          { name: 'Job Search Strategy' },
          { name: 'Interview Skills' },
          { name: 'Professional Communication' },
          { name: 'Networking' },
          { name: 'Freelancing' },
          { name: 'Digital Sales' },
          { name: 'Personal Career Plan' },
        ],
      },
    ],
    workshops: ['CV Clinic', 'LinkedIn Clinic', 'Mock Interview', 'Portfolio Review', 'Networking Workshop', 'Job Search Sprint', 'Personal Brand Workshop', 'Career Roadmap Session'],
    deliverables: ['CV جاهز', 'LinkedIn محسّن', 'Professional Bio', 'Portfolio Structure', 'Job Search Plan', 'Interview Preparation', 'Networking Strategy', '90-Day Career Plan'],
    tools: ['LinkedIn', 'أدوات بناء السيرة', 'أدوات العرض والتوثيق'],
    afterPath: ['فرص EMC والشركاء', 'مجتمع سديم', 'شبكة الخريجين'],
  },
]

export function findTrackPage(slug: string): TrackPage | undefined {
  return TRACK_PAGES.find((t) => t.slug === slug)
}

/** أسئلة شائعة مشتركة — آمنة ولا تدّعي ما لم يُعتمد. */
export const TRACK_FAQ = [
  {
    q: 'هل أحتاج خبرة سابقة للالتحاق؟',
    a: 'تختلف المتطلبات بحسب المسار — قسم «لمن هذا المسار؟» أعلاه يوضح الفئات المناسبة، وكثير من المسارات تبدأ من التأسيس.',
  },
  {
    q: 'هل أحصل على شهادة؟',
    a: 'نعم — شهادة مسار احترافية من EMC بعد استيفاء شروط الإتمام (الوحدات والتقييمات والمشروع النهائي).',
  },
  {
    q: 'كيف أعرف أن هذا المسار مناسب لمستواي؟',
    a: 'جرّب «اختبر مستواك في AI» — 15 سؤالاً ونتيجة فورية وخطة شخصية توجهك للخطوة الصحيحة.',
  },
]
