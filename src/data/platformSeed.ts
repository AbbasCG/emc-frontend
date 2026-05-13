import type {
  AuditLogEntry,
  AutomationRule,
  AutomationRun,
  AiConversation,
  DocumentFolder,
  GlobalSearchResponse,
  KnowledgeArticle,
  KnowledgeCategory,
  LmsLesson,
  LmsModule,
  LmsQuiz,
  PartnerDashboardData,
  PartnerProgramRow,
  PlatformDocument,
  PlatformNotification,
  PlatformScaleData,
  QuizAttemptResult,
} from '@/types/platform'

export const KNOWLEDGE_CATEGORY_LABELS: Record<string, string> = {
  policies: 'السياسات',
  guides: 'الأدلة',
  templates: 'القوالب',
  reports: 'التقارير',
  lessons_learned: 'الدروس المستفادة',
}

export function seedKnowledgeCategories(): KnowledgeCategory[] {
  return [
    { id: 'policies', slug: 'policies', title: 'السياسات', description: 'سياسات EMC المعتمدة' },
    { id: 'guides', slug: 'guides', title: 'الأدلة', description: 'أدلة تشغيل وممارسة' },
    { id: 'templates', slug: 'templates', title: 'القوالب', description: 'نماذج جاهزة' },
    { id: 'reports', slug: 'reports', title: 'التقارير', description: 'تقارير مرجعية' },
    { id: 'lessons_learned', slug: 'lessons-learned', title: 'الدروس المستفادة', description: 'معرفة مؤسسية' },
  ]
}

export function seedKnowledgeArticles(): KnowledgeArticle[] {
  const cats = seedKnowledgeCategories()
  return Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    slug: `article-${i + 1}`,
    title: ['دليل الجودة الداخلية', 'سياسة الخصوصية', 'قالب تقرير الأثر', 'إجراءات الشراكات'][i % 4]! + ` (${i + 1})`,
    excerpt: 'ملخص موجز للمقال والاستخدامات الموصى بها داخل المنظومة التشغيلية.',
    body: `<p>محتوى المقال بالعربية — جاهز للاستبدال من الـ API.</p><p>يمكن إضافة صور وجداول لاحقاً.</p>`,
    category_id: cats[i % cats.length]!.id,
    tags: [['جودة', 'تشغيل'], ['قانوني'], ['شراكات']][i % 3],
    visibility: i % 5 === 0 ? 'internal' : 'public',
    status: i % 7 === 0 ? 'draft' : 'published',
    updated_at: `2026-05-${String((i % 28) + 1).padStart(2, '0')}`,
  }))
}

export function seedPartnerDashboard(): PartnerDashboardData {
  return {
    partnership_status: 'نشط — اتفاقية إطار ٢٠٢٦',
    joint_programs_count: 6,
    participants_total: 842,
    impact_score: 86,
    upcoming_meetings: [
      { id: 1, title: 'اجتماع مراجعة ربع سنوي', at: '2026-06-12 10:00' },
      { id: 2, title: 'ورشة مشتركة للمدربين', at: '2026-06-18 14:00' },
    ],
    recent_reports: [
      { id: 1, title: 'تقرير الأثر المشترك — أبريل', at: '2026-05-02' },
      { id: 2, title: 'مؤشرات المشاركة', at: '2026-04-28' },
    ],
  }
}

export function seedPartnerPrograms(): PartnerProgramRow[] {
  return Array.from({ length: 5 }).map((_, i) => ({
    id: i + 1,
    title: ['مسار القيادة المشترك', 'التقويم المؤسسي', 'ورش الجودة'][i % 3]!,
    status: ['نشط', 'تخطيط', 'مكتمل'][i % 3]!,
    cohort_size: 40 + i * 12,
    starts_at: `2026-0${(i % 6) + 1}-15`,
  }))
}

const DEMO_COURSE_ID = 1

export function seedLmsModules(courseId: number): LmsModule[] {
  return Array.from({ length: 4 }).map((_, i) => ({
    id: i + 1,
    course_id: courseId,
    title: `الوحدة ${i + 1}: ${['التأسيس', 'التطبيق', 'التقييم', 'الإغلاق'][i]}`,
    sort_order: i + 1,
    lessons_count: 3,
    completed_lessons: i === 0 ? 2 : i === 1 ? 1 : 0,
  }))
}

export function seedLmsLesson(lessonId: number): LmsLesson | null {
  const mod = Math.ceil(lessonId / 3)
  return {
    id: lessonId,
    module_id: mod,
    course_id: DEMO_COURSE_ID,
    title: `الدرس ${lessonId}: ${['مقدمة', 'أدوات', 'تمرين عملي'][lessonId % 3]}`,
    sort_order: lessonId,
    content_html: '<p>محتوى الدرس التفاعلي، مع دعم RTL وجاهز لمكونات غنية لاحقاً.</p>',
    video_placeholder_url: 'https://example.com/embed-placeholder',
    materials: [
      { id: 1, label: 'عرض تقديمي', type: 'pdf' },
      { id: 2, label: 'ورقة عمل', type: 'doc' },
    ],
    next_lesson_id: lessonId < 12 ? lessonId + 1 : null,
    prev_lesson_id: lessonId > 1 ? lessonId - 1 : null,
  }
}

export function seedLmsQuiz(quizId: number): LmsQuiz {
  return {
    id: quizId,
    course_id: DEMO_COURSE_ID,
    title: 'اختبار الوحدة التطبيقية',
    passing_score: 70,
    questions: [
      {
        id: 1,
        prompt: 'ما الهدف الأساسي من دورة الجودة في EMC؟',
        choices: ['رفع الإيراد فقط', 'تحسين تجربة المتعلم ومخرجات الجودة', 'تقليل عدد الجلسات'],
        correct_index: 1,
      },
      {
        id: 2,
        prompt: 'أي مؤشر يعكس الإتمام الفعلي؟',
        choices: ['عدد الزيارات', 'معدل الإتمام', 'عدد الصفحات'],
        correct_index: 1,
      },
    ],
  }
}

export function seedQuizResult(): QuizAttemptResult {
  return { passed: true, score: 85, passing_score: 70, correct_count: 2, total: 2 }
}

export function seedNotifications(): PlatformNotification[] {
  const types = [
    'registration',
    'payment',
    'session_reminder',
    'assignment_due',
    'certificate_issued',
    'task_assigned',
    'meeting_invite',
    'support_reply',
    'partner_update',
  ] as const
  return Array.from({ length: 12 }).map((_, i) => ({
    id: i + 1,
    type: types[i % types.length]!,
    title: ['تذكير جلسة غداً', 'تم استلام الدفع', 'واجب مستحق', 'شهادة صادرة'][i % 4]!,
    body: 'تفاصيل مختصرة للإشعار — يُستبدل من الخادم.',
    read_at: i % 3 === 0 ? null : '2026-05-10',
    created_at: `2026-05-${String((i % 20) + 1).padStart(2, '0')} 09:00`,
    href: i % 2 === 0 ? '/dashboard/student/sessions' : null,
  }))
}

export function seedAutomations(): AutomationRule[] {
  return [
    {
      id: 1,
      name: 'إشعار عند تسجيل جديد',
      trigger: 'record_created',
      active: true,
      conditions_json: '{ "entity": "registration", "status": "paid" }',
      actions_json: '{ "notify": ["admin"], "template": "welcome_paid" }',
      updated_at: '2026-05-08',
    },
    {
      id: 2,
      name: 'تقرير أسبوعي للشركاء',
      trigger: 'schedule',
      active: false,
      conditions_json: '{ "cron": "0 8 * * SUN" }',
      actions_json: '{ "email_report": "partner_weekly" }',
      updated_at: '2026-05-01',
    },
  ]
}

export function seedAutomationRuns(): AutomationRun[] {
  return Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    rule_id: (i % 2) + 1,
    rule_name: i % 2 === 0 ? 'إشعار عند تسجيل جديد' : 'تقرير أسبوعي للشركاء',
    status: (['success', 'failed', 'running'] as const)[i % 3]!,
    started_at: `2026-05-${String((i % 15) + 1).padStart(2, '0')} 08:${10 + i}:00`,
    finished_at: i % 3 === 2 ? null : `2026-05-${String((i % 15) + 1).padStart(2, '0')} 08:${12 + i}:00`,
    detail: i % 3 === 1 ? 'فشل الاتصال بمزود البريد' : null,
  }))
}

export function seedAiConversations(): AiConversation[] {
  return [
    { id: 1, title: 'استفسار عن الدورات', updated_at: '2026-05-09' },
    { id: 2, title: 'مسودة بريد للشركاء', updated_at: '2026-05-08' },
  ]
}

export function seedGlobalSearch(q: string): GlobalSearchResponse {
  const query = q.trim() || 'بحث'
  return {
    query,
    groups: [
      {
        type: 'courses',
        label: 'الدورات',
        items: [{ id: 1, title: `نتيجة دورة لـ «${query}»`, href: '/courses', subtitle: 'كتالوج عام' }],
      },
      {
        type: 'knowledge',
        label: 'قاعدة المعرفة',
        items: [{ id: 2, title: `مقال: ${query}`, href: '/knowledge/article-1', subtitle: 'سياسات' }],
      },
      {
        type: 'tasks',
        label: 'المهام',
        items: [{ id: 3, title: `مهمة مرتبطة بـ ${query}`, href: '/dashboard/admin/tasks', subtitle: 'عمليات' }],
      },
    ],
  }
}

export function seedDocumentFolders(): DocumentFolder[] {
  return [
    { id: 'root', name: 'كل الملفات', parent_id: null },
    { id: 'internal', name: 'الملفات الداخلية', parent_id: 'root' },
    { id: 'mgmt', name: 'ملفات الإدارة', parent_id: 'root' },
  ]
}

export function seedDocuments(): PlatformDocument[] {
  return Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    name: ['اتفاقية شراكة', 'دليل الجودة PDF', 'عرض أثر ربع سنوي'][i % 3]! + ` v${i + 1}`,
    folder_id: i % 2 === 0 ? 'internal' : 'mgmt',
    visibility: (['internal', 'management', 'partner'] as const)[i % 3]!,
    related_label: i % 2 === 0 ? 'شراكة: جامعة الرؤية' : null,
    size_label: `${200 + i * 40} ك.ب`,
    updated_at: `2026-05-${String((i % 25) + 1).padStart(2, '0')}`,
  }))
}

export function seedAuditLogs(): AuditLogEntry[] {
  return Array.from({ length: 15 }).map((_, i) => ({
    id: i + 1,
    action: ['تحديث', 'إنشاء', 'حذف', 'تصدير'][i % 4]!,
    user_name: ['أحمد الشهري', 'هند الكندري', 'النظام'][i % 3]!,
    entity_type: ['Course', 'Payment', 'Certificate', 'Task'][i % 4]!,
    entity_id: String(100 + i),
    created_at: `2026-05-${String((i % 28) + 1).padStart(2, '0')} ${9 + (i % 8)}:${30 + i}:00`,
    summary: i % 2 === 0 ? 'قيم قديمة → قيم جديدة (placeholder)' : null,
  }))
}

export function seedPlatformScale(): PlatformScaleData {
  return {
    total_users: 12_400,
    active_courses: 56,
    monthly_active_learners: 3200,
    api_requests_24h: 890_000,
    storage_used_gb: 420,
    uptime_percent: 99.97,
    regions: ['الرياض', 'أمستردام (CDN)', 'النسخ الاحتياطي'],
  }
}

export { DEMO_COURSE_ID }
