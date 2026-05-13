import apiClient from '@/api/axios'
import { fetchCoursesFromApi } from '@/api/coursesApi.public'
import { unwrapData } from '@/api/unwrap'
import { mapApiCourseToCourseItem } from '@/utils/mapApiCourseToCourseItem'

/** When `true`, catalog uses local fixtures (set `VITE_USE_MOCK_CATALOG=true`). Default: live API with mock fallback. */
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_CATALOG === 'true'

export type CourseCategory = 'AI & Tech' | 'Languages' | 'Business' | 'Academic' | 'Personal Dev'
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'
export type CourseStatus = 'active' | 'upcoming' | 'archived'

export type CourseItem = {
  id: number
  title: string
  slug: string
  description: string
  category: CourseCategory
  level: CourseLevel
  price: number
  original_price: number | null
  is_free: boolean
  duration_weeks: number
  sessions_count: number
  trainer: { name: string; avatar: string | null }
  enrolled_count: number
  rating: number
  thumbnail: string | null
  type: 'workshop' | 'course'
  status: CourseStatus
  tags: string[]
  progress?: number
}

export type TrackItem = {
  id: number
  name: string
  slug: string
  icon: string
  duration_months: number
  courses_count: number
  workshops_count: number
  level: CourseLevel
  price: number
  original_price: number | null
  description: string
}

export type WorkshopItem = {
  id: number
  title: string
  date: string
  time: string
  duration_hours: number
  trainer_name: string
  is_online: boolean
  spots_remaining: number
  total_spots: number
  slug: string
}

export type FetchCoursesParams = {
  category?: string
  type?: string
  sort?: string
  page?: number
  search?: string
}

export const PLATFORM_STATS = {
  totalCourses: 48,
  activeStudents: 3200,
  certifiedGraduates: 890,
  partnerUniversities: 12,
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

export const mockTracks: TrackItem[] = [
  {
    id: 1,
    name: 'مهندس الذكاء الاصطناعي',
    slug: 'ai-engineer',
    icon: 'Brain',
    duration_months: 6,
    courses_count: 8,
    workshops_count: 4,
    level: 'intermediate',
    price: 2400,
    original_price: 3200,
    description: 'من Python إلى نماذج GPT — مسار شامل يبني مهندساً متكاملاً في الذكاء الاصطناعي',
  },
  {
    id: 2,
    name: 'محلل البيانات',
    slug: 'data-analyst',
    icon: 'BarChart3',
    duration_months: 5,
    courses_count: 6,
    workshops_count: 3,
    level: 'beginner',
    price: 1800,
    original_price: 2400,
    description: 'Excel · SQL · Python · Power BI — كل ما تحتاجه لتحليل البيانات وصناعة القرار',
  },
  {
    id: 3,
    name: 'رائد الأعمال الرقمي',
    slug: 'digital-entrepreneur',
    icon: 'Rocket',
    duration_months: 4,
    courses_count: 5,
    workshops_count: 5,
    level: 'beginner',
    price: 1500,
    original_price: 2000,
    description: 'فكرة → منتج → سوق — المسار العملي لإطلاق مشروعك الرقمي من الصفر',
  },
  {
    id: 4,
    name: 'متخصص اللغة الإنجليزية',
    slug: 'english-specialist',
    icon: 'BookOpen',
    duration_months: 3,
    courses_count: 4,
    workshops_count: 6,
    level: 'beginner',
    price: 900,
    original_price: 1200,
    description: 'من المستوى A1 إلى B2 مع شهادة دولية معتمدة ومسار مكثف للأعمال',
  },
  {
    id: 5,
    name: 'خبير التسويق الرقمي',
    slug: 'digital-marketing',
    icon: 'Megaphone',
    duration_months: 4,
    courses_count: 6,
    workshops_count: 4,
    level: 'intermediate',
    price: 1600,
    original_price: 2100,
    description: 'SEO · إعلانات · محتوى · تحليلات — من الصفر للاحتراف في التسويق الرقمي',
  },
  {
    id: 6,
    name: 'متخصص الأمن السيبراني',
    slug: 'cybersecurity',
    icon: 'Shield',
    duration_months: 6,
    courses_count: 7,
    workshops_count: 3,
    level: 'advanced',
    price: 2800,
    original_price: 3600,
    description: 'الحماية · الاختراق الأخلاقي · الشبكات — المسار الاحترافي للأمن السيبراني',
  },
]

export const mockCourses: CourseItem[] = [
  {
    id: 1,
    title: 'Python للمبتدئين',
    slug: 'python-beginners',
    description: 'ابدأ رحلتك في البرمجة مع Python — أشهر لغة في العالم. من الأساسيات حتى المشاريع التطبيقية الكاملة.',
    category: 'AI & Tech',
    level: 'beginner',
    price: 0,
    original_price: null,
    is_free: true,
    duration_weeks: 6,
    sessions_count: 18,
    trainer: { name: 'أ. سارة المنصوري', avatar: null },
    enrolled_count: 1240,
    rating: 4.8,
    thumbnail: null,
    type: 'course',
    status: 'active',
    tags: ['python', 'برمجة', 'مجاني'],
    progress: 45,
  },
  {
    id: 2,
    title: 'مقدمة في الذكاء الاصطناعي وتعلم الآلة',
    slug: 'intro-ai-ml',
    description: 'تعرف على مفاهيم AI وML من الصفر. نماذج التعلم والشبكات العصبية وتطبيقات الذكاء الاصطناعي في الواقع.',
    category: 'AI & Tech',
    level: 'beginner',
    price: 350,
    original_price: 500,
    is_free: false,
    duration_weeks: 8,
    sessions_count: 24,
    trainer: { name: 'د. محمد العمري', avatar: null },
    enrolled_count: 870,
    rating: 4.9,
    thumbnail: null,
    type: 'course',
    status: 'active',
    tags: ['AI', 'ML', 'ذكاء اصطناعي'],
  },
  {
    id: 3,
    title: 'اللغة الإنجليزية للأعمال — المستوى A1',
    slug: 'business-english-a1',
    description: 'ابدأ تعلم الإنجليزية من الصفر بأسلوب عملي يركز على بيئة العمل والمحادثات اليومية والكتابة المهنية.',
    category: 'Languages',
    level: 'beginner',
    price: 0,
    original_price: null,
    is_free: true,
    duration_weeks: 4,
    sessions_count: 12,
    trainer: { name: 'أ. لينا الشمري', avatar: null },
    enrolled_count: 2100,
    rating: 4.7,
    thumbnail: null,
    type: 'course',
    status: 'active',
    tags: ['إنجليزي', 'A1', 'مجاني'],
    progress: 80,
  },
  {
    id: 4,
    title: 'إدارة المشاريع الاحترافية — PMP Prep',
    slug: 'pmp-prep',
    description: 'استعد لامتحان PMP مع المنهج الكامل وأُطر العمل وأدوات الإدارة ومحاكاة اختبار الشهادة.',
    category: 'Business',
    level: 'advanced',
    price: 600,
    original_price: 800,
    is_free: false,
    duration_weeks: 10,
    sessions_count: 30,
    trainer: { name: 'أ. خالد الراشد', avatar: null },
    enrolled_count: 430,
    rating: 4.6,
    thumbnail: null,
    type: 'course',
    status: 'active',
    tags: ['PMP', 'إدارة مشاريع', 'شهادة'],
  },
  {
    id: 5,
    title: 'تحليل البيانات بـ Excel و Power BI',
    slug: 'data-analysis-excel-powerbi',
    description: 'تعلم تحليل البيانات من الجداول المحورية إلى لوحات المعلومات التفاعلية المتكاملة مع Power BI.',
    category: 'Business',
    level: 'intermediate',
    price: 280,
    original_price: 400,
    is_free: false,
    duration_weeks: 6,
    sessions_count: 18,
    trainer: { name: 'أ. ريم العبدالله', avatar: null },
    enrolled_count: 650,
    rating: 4.8,
    thumbnail: null,
    type: 'course',
    status: 'active',
    tags: ['Excel', 'Power BI', 'تحليل بيانات'],
  },
  {
    id: 6,
    title: 'التسويق الرقمي من الصفر',
    slug: 'digital-marketing-basics',
    description: 'تعلم أساسيات التسويق الرقمي: SEO وإعلانات Meta وGoogle Ads وإدارة المحتوى الرقمي باحتراف.',
    category: 'Business',
    level: 'beginner',
    price: 200,
    original_price: 300,
    is_free: false,
    duration_weeks: 5,
    sessions_count: 15,
    trainer: { name: 'أ. فيصل المطيري', avatar: null },
    enrolled_count: 920,
    rating: 4.5,
    thumbnail: null,
    type: 'course',
    status: 'active',
    tags: ['تسويق', 'SEO', 'Meta'],
  },
  {
    id: 7,
    title: 'الذكاء الاصطناعي التوليدي مع ChatGPT',
    slug: 'generative-ai-chatgpt',
    description: 'أتقن استخدام ChatGPT وأدوات AI التوليدية في العمل. Prompt Engineering من المبتدئ للمحترف.',
    category: 'AI & Tech',
    level: 'beginner',
    price: 199,
    original_price: 350,
    is_free: false,
    duration_weeks: 4,
    sessions_count: 12,
    trainer: { name: 'أ. نورة الحربي', avatar: null },
    enrolled_count: 1580,
    rating: 4.9,
    thumbnail: null,
    type: 'course',
    status: 'active',
    tags: ['ChatGPT', 'AI', 'Prompt Engineering'],
  },
  {
    id: 8,
    title: 'ريادة الأعمال الرقمية — ابدأ مشروعك',
    slug: 'digital-entrepreneurship',
    description: 'من الفكرة إلى المنتج. التحقق من الفكرة وبناء MVP وإطلاق مشروعك الرقمي بأقل ميزانية ممكنة.',
    category: 'Business',
    level: 'beginner',
    price: 320,
    original_price: 450,
    is_free: false,
    duration_weeks: 7,
    sessions_count: 21,
    trainer: { name: 'أ. عبدالله السعيد', avatar: null },
    enrolled_count: 380,
    rating: 4.7,
    thumbnail: null,
    type: 'course',
    status: 'upcoming',
    tags: ['ريادة', 'startup', 'MVP'],
  },
  {
    id: 9,
    title: 'الإنجليزية الأكاديمية — IELTS 7.0+',
    slug: 'academic-english-ielts',
    description: 'استعد للحصول على درجة 7.0 أو أعلى في IELTS بتدريب مكثف على المهارات الأربع كاملة.',
    category: 'Languages',
    level: 'advanced',
    price: 450,
    original_price: 600,
    is_free: false,
    duration_weeks: 8,
    sessions_count: 24,
    trainer: { name: 'أ. إيمان القحطاني', avatar: null },
    enrolled_count: 290,
    rating: 4.8,
    thumbnail: null,
    type: 'course',
    status: 'active',
    tags: ['IELTS', 'إنجليزي', 'أكاديمي'],
  },
  {
    id: 10,
    title: 'الأمن السيبراني للمبتدئين',
    slug: 'cybersecurity-basics',
    description: 'تعرف على عالم الأمن السيبراني: أنواع الهجمات وحماية البيانات وأساسيات الشبكات والأدوات.',
    category: 'AI & Tech',
    level: 'beginner',
    price: 280,
    original_price: 400,
    is_free: false,
    duration_weeks: 6,
    sessions_count: 18,
    trainer: { name: 'أ. سعد العازمي', avatar: null },
    enrolled_count: 510,
    rating: 4.6,
    thumbnail: null,
    type: 'course',
    status: 'active',
    tags: ['أمن سيبراني', 'شبكات', 'حماية'],
  },
  {
    id: 11,
    title: 'التصميم الجرافيكي بـ Canva و Figma',
    slug: 'graphic-design-canva-figma',
    description: 'من التصميم الأساسي إلى إنشاء الهوية البصرية الكاملة باستخدام أحدث أدوات التصميم.',
    category: 'Personal Dev',
    level: 'beginner',
    price: 0,
    original_price: null,
    is_free: true,
    duration_weeks: 5,
    sessions_count: 15,
    trainer: { name: 'أ. منى البلوي', avatar: null },
    enrolled_count: 1100,
    rating: 4.7,
    thumbnail: null,
    type: 'course',
    status: 'active',
    tags: ['تصميم', 'Figma', 'Canva', 'مجاني'],
    progress: 20,
  },
  {
    id: 12,
    title: 'مهارات القيادة والتواصل الفعّال',
    slug: 'leadership-communication',
    description: 'طور مهاراتك القيادية وأساليب التواصل في بيئة العمل والعروض التقديمية والتفاوض الاحترافي.',
    category: 'Personal Dev',
    level: 'intermediate',
    price: 250,
    original_price: 350,
    is_free: false,
    duration_weeks: 4,
    sessions_count: 12,
    trainer: { name: 'أ. طارق الزهراني', avatar: null },
    enrolled_count: 720,
    rating: 4.8,
    thumbnail: null,
    type: 'course',
    status: 'active',
    tags: ['قيادة', 'تواصل', 'مهارات'],
  },
]

export const mockWorkshops: WorkshopItem[] = [
  {
    id: 1,
    title: 'استخدام ChatGPT في العمل اليومي',
    date: '2026-05-15',
    time: '19:00',
    duration_hours: 2,
    trainer_name: 'أ. نورة الحربي',
    is_online: true,
    spots_remaining: 18,
    total_spots: 50,
    slug: 'chatgpt-work-workshop',
  },
  {
    id: 2,
    title: 'التحدث بثقة بالإنجليزية',
    date: '2026-05-18',
    time: '17:00',
    duration_hours: 2,
    trainer_name: 'أ. لينا الشمري',
    is_online: false,
    spots_remaining: 8,
    total_spots: 25,
    slug: 'confident-english-workshop',
  },
  {
    id: 3,
    title: 'أطلق مشروعك في 30 يوماً',
    date: '2026-05-22',
    time: '20:00',
    duration_hours: 3,
    trainer_name: 'أ. عبدالله السعيد',
    is_online: true,
    spots_remaining: 35,
    total_spots: 100,
    slug: 'launch-in-30-days',
  },
  {
    id: 4,
    title: 'Power BI — تحليل البيانات عملياً',
    date: '2026-05-25',
    time: '18:00',
    duration_hours: 2,
    trainer_name: 'أ. ريم العبدالله',
    is_online: true,
    spots_remaining: 22,
    total_spots: 60,
    slug: 'powerbi-intro-workshop',
  },
  {
    id: 5,
    title: 'ابدأ مع Python — ورشة مجانية',
    date: '2026-05-28',
    time: '19:30',
    duration_hours: 2,
    trainer_name: 'أ. سارة المنصوري',
    is_online: false,
    spots_remaining: 12,
    total_spots: 30,
    slug: 'python-intro-workshop',
  },
  {
    id: 6,
    title: 'الأمن السيبراني: احمِ نفسك وبياناتك',
    date: '2026-06-02',
    time: '20:00',
    duration_hours: 2,
    trainer_name: 'أ. سعد العازمي',
    is_online: true,
    spots_remaining: 40,
    total_spots: 80,
    slug: 'cybersecurity-protect-yourself',
  },
]

// ── API Functions ──────────────────────────────────────────────────────────────

export async function fetchCourses(params: FetchCoursesParams = {}) {
  if (USE_MOCK_DATA) {
    await new Promise<void>((r) => setTimeout(r, 700))
    return { data: mockCourses, total: mockCourses.length }
  }
  try {
    const raw = await fetchCoursesFromApi()
    const mapped = raw.map(mapApiCourseToCourseItem)
    let list = mapped
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase()
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    return { data: list, total: list.length }
  } catch {
    await new Promise<void>((r) => setTimeout(r, 400))
    return { data: mockCourses, total: mockCourses.length }
  }
}

export async function fetchTracks() {
  if (USE_MOCK_DATA) {
    await new Promise<void>((r) => setTimeout(r, 400))
    return { data: mockTracks }
  }
  try {
    const response = await apiClient.get('/tracks')
    const rows = unwrapData<
      {
        id: number
        title: string
        slug: string
        description?: string | null
        duration_months?: number | null
        courses_count?: number
      }[]
    >(response.data)
    const data: TrackItem[] = (rows ?? []).map((r) => ({
      id: r.id,
      name: r.title,
      slug: r.slug,
      icon: 'Brain',
      duration_months: r.duration_months ?? 6,
      courses_count: r.courses_count ?? 0,
      workshops_count: 0,
      level: 'beginner',
      price: 0,
      original_price: null,
      description: r.description ?? '',
    }))
    return { data }
  } catch {
    await new Promise<void>((r) => setTimeout(r, 350))
    return { data: mockTracks }
  }
}

export async function fetchUpcomingWorkshops() {
  if (USE_MOCK_DATA) {
    await new Promise<void>((r) => setTimeout(r, 350))
    return { data: mockWorkshops }
  }
  try {
    const response = await apiClient.get('/workshops')
    const rows = unwrapData<
      {
        id: number
        title: string
        slug: string
        date?: string
        time?: string
        duration_hours?: number
        trainer_name?: string
        is_online?: boolean
        spots_remaining?: number
        total_spots?: number
      }[]
    >(response.data)
    const data: WorkshopItem[] = (rows ?? []).map((w) => ({
      id: w.id,
      title: w.title,
      date: w.date ?? '',
      time: w.time ?? '',
      duration_hours: typeof w.duration_hours === 'number' ? w.duration_hours : 2,
      trainer_name: w.trainer_name ?? 'فريق EMC',
      is_online: Boolean(w.is_online),
      spots_remaining: w.spots_remaining ?? 0,
      total_spots: w.total_spots ?? 0,
      slug: w.slug,
    }))
    return { data }
  } catch {
    await new Promise<void>((r) => setTimeout(r, 350))
    return { data: mockWorkshops }
  }
}
