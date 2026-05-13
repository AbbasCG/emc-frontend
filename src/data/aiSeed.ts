import type {
  AiAutomationFlow,
  AiAutomationRun,
  AiChatMessage,
  AiConversationThread,
  AiGenerationKind,
  AiGenerationRecord,
  AiInsight,
  AiMeetingIntelligence,
  AiRecommendation,
  AiSearchResponse,
  AiSuggestedPrompt,
  AiUsageSnapshot,
} from '@/types/ai'

export function seedAiConversationsV2(): AiConversationThread[] {
  return [
    { id: 1, title: 'مساعد الطالب — خطة الأسبوع', persona: 'student', updated_at: '2026-05-11 18:40', pinned: true },
    { id: 2, title: 'مساعد العمليات — المهام المتأخرة', persona: 'operations', updated_at: '2026-05-11 16:12' },
    { id: 3, title: 'مساعد التقارير — تحليل الأداء', persona: 'reports', updated_at: '2026-05-10 21:03' },
    { id: 4, title: 'مساعد الدعم — ملخص التذاكر', persona: 'support', updated_at: '2026-05-10 10:58' },
    { id: 5, title: 'مساعد المدرّب — جلسات الأسبوع', persona: 'trainer', updated_at: '2026-05-09 17:31' },
  ]
}

export function seedAiSuggestedPrompts(): AiSuggestedPrompt[] {
  return [
    { id: 'p1', text: 'ما المهام المتأخرة؟', persona: 'operations' },
    { id: 'p2', text: 'أنشئ ملخص للاجتماع', persona: 'support' },
    { id: 'p3', text: 'اقترح مسار مناسب', persona: 'student' },
    { id: 'p4', text: 'أنشئ خطة تسويقية', persona: 'reports' },
    { id: 'p5', text: 'حلل أداء الدورة', persona: 'trainer' },
  ]
}

export function seedAiMessages(conversationId: number): AiChatMessage[] {
  const tone = conversationId % 2 === 0 ? 'تشغيلي' : 'تعليمي'
  return [
    {
      id: 1,
      role: 'assistant',
      content: `مرحباً، أنا مساعد ${tone}. أستطيع تلخيص الاجتماعات، ترتيب الأولويات، وتوليد خطط عمل.`,
      created_at: '2026-05-11 08:00',
    },
  ]
}

export function seedAiSearch(query: string): AiSearchResponse {
  const q = query.trim() || 'بحث'
  return {
    query: q,
    groups: [
      {
        scope: 'knowledge',
        label: 'قاعدة المعرفة',
        items: [{ id: 1, title: `سياسة مرتبطة بـ ${q}`, href: '/dashboard/admin/knowledge', subtitle: 'سياسات', relevance: 0.94, quick_action: 'فتح المقال' }],
      },
      {
        scope: 'meetings',
        label: 'الاجتماعات',
        items: [{ id: 2, title: `محضر اجتماع: ${q}`, href: '/dashboard/admin/meetings', subtitle: 'عمليات', relevance: 0.88, quick_action: 'توليد ملخص AI' }],
      },
      {
        scope: 'tasks',
        label: 'المهام',
        items: [{ id: 3, title: `مهمة متأخرة مرتبطة بـ ${q}`, href: '/dashboard/admin/tasks/overdue', subtitle: 'أولوية عالية', relevance: 0.82, quick_action: 'تحويل لخطة' }],
      },
      {
        scope: 'reports',
        label: 'التقارير',
        items: [{ id: 4, title: `تقرير تحليلي لـ ${q}`, href: '/dashboard/admin/reports', subtitle: 'ذكاء الأعمال', relevance: 0.79, quick_action: 'تلخيص تنفيذي' }],
      },
    ],
  }
}

export function seedAiRecommendations(audience: 'student' | 'admin'): AiRecommendation[] {
  if (audience === 'student') {
    return [
      { id: 's1', audience, title: 'مسار مقترح: قيادة الفرق', description: 'بناءً على نتائجك الأخيرة في التقييمات العملية.', priority: 'medium', href: '/paths' },
      { id: 's2', audience, title: 'ورشة مقترحة: إدارة الوقت', description: 'تساعدك على رفع نسبة الالتزام بالواجبات.', priority: 'high', href: '/programs' },
      { id: 's3', audience, title: 'أولوية متأخرة: واجب الوحدة الثالثة', description: 'الموعد النهائي خلال 24 ساعة.', priority: 'critical', href: '/dashboard/student/assignments' },
    ]
  }
  return [
    { id: 'a1', audience, title: 'تنبيه حضور منخفض', description: 'ثلاث جلسات تقل نسبة حضورها عن 60%.', priority: 'high', href: '/dashboard/admin/lms/attendance' },
    { id: 'a2', audience, title: 'مخاطر جودة', description: 'مؤشر الرضا انخفض في مسارين تدريبيين.', priority: 'critical', href: '/dashboard/admin/quality' },
    { id: 'a3', audience, title: 'متطوعون غير نشطين', description: '11 متطوعًا بلا إسناد خلال أسبوعين.', priority: 'medium', href: '/dashboard/admin/volunteers' },
    { id: 'a4', audience, title: 'فرصة شراكة', description: 'طلب شراكة من مؤسسة ذات تأثير مرتفع.', priority: 'low', href: '/dashboard/admin/partnership-requests' },
  ]
}

export function seedAiInsights(): AiInsight[] {
  return [
    { id: 'i1', title: 'مخاطر حضور', description: '6 مجموعات أقل من الحد الأدنى للحضور.', severity: 'high', score: 63, metric_label: 'Attendance Risk' },
    { id: 'i2', title: 'توقع تسرب', description: 'نموذج التنبؤ يشير إلى 14 طالبًا معرضًا للانقطاع.', severity: 'warning', score: 58, metric_label: 'Dropout Prediction' },
    { id: 'i3', title: 'تنبيه مالي', description: 'مدفوعات متأخرة أعلى 18% من الأسبوع السابق.', severity: 'warning', score: 71, metric_label: 'Finance Alert' },
    { id: 'i4', title: 'مؤشر التفاعل', description: 'التفاعل العام ارتفع 6% بعد تحديث المناهج.', severity: 'info', score: 84, metric_label: 'Engagement' },
  ]
}

export function seedAiMeetingIntelligence(meetingId: number): AiMeetingIntelligence {
  return {
    meeting_id: meetingId,
    summary: 'ركز الاجتماع على تخفيض تأخير المهام وتحسين التزام الحضور عبر إعادة توزيع الملكيات بين فرق العمليات والجودة.',
    decisions: ['اعتماد جدول متابعة أسبوعي', 'إطلاق حملة تواصل مع الطلاب منخفضي التفاعل', 'تفعيل إشعارات واتساب قبل 24 ساعة من الجلسات'],
    action_items: [
      { id: 11, text: 'إعداد لوحة متابعة الحضور اليومية', owner: 'فريق الجودة', due_at: '2026-05-18' },
      { id: 12, text: 'تحديث قالب رسالة التذكير', owner: 'فريق العمليات', due_at: '2026-05-15' },
    ],
    blockers: ['تأخر اعتماد تكامل التقويم الخارجي', 'نقص في بيانات التفاعل لبعض المسارات'],
    follow_ups: ['اجتماع مراجعة سريع بعد 5 أيام', 'قياس تأثير التذكير الجديد على الحضور'],
    risk_level: 'warning',
  }
}

export function seedAiGenerations(): AiGenerationRecord[] {
  return [
    {
      id: 1001,
      kind: 'course_outline',
      title: 'مخطط دورة: القيادة المؤسسية',
      prompt: 'أنشئ مخطط دورة من 6 أسابيع لطلاب الإدارة.',
      output_markdown: '## مخطط الدورة\n- أسبوع 1: مقدمة القيادة\n- أسبوع 2: التواصل القيادي\n- أسبوع 3: إدارة الفرق...',
      created_at: '2026-05-11 14:30',
    },
    {
      id: 1002,
      kind: 'marketing_copy',
      title: 'نسخة تسويقية لبرنامج جديد',
      prompt: 'اكتب نصًا تسويقيًا قصيرًا لبرنامج المسارات المهنية.',
      output_markdown: 'برنامجنا الجديد يفتح مسارات مهنية عملية... ',
      created_at: '2026-05-11 15:05',
    },
  ]
}

export function buildGenerationOutput(kind: AiGenerationKind, prompt: string): string {
  if (kind === 'quiz') {
    return `## اختبار مقترح\n1) سؤال أول مبني على: ${prompt}\n2) سؤال ثانٍ متعدد الخيارات\n3) سؤال تقييم عملي`
  }
  if (kind === 'workshop_plan') {
    return `## خطة ورشة\n- الهدف\n- النتائج المتوقعة\n- جدول زمني 90 دقيقة\n- أنشطة تطبيقية\n\n> المدخل: ${prompt}`
  }
  if (kind === 'report_summary') {
    return `## ملخص تنفيذي\n- أهم المؤشرات\n- الانحرافات الحرجة\n- توصيات فورية\n\nتم الاشتقاق من: ${prompt}`
  }
  if (kind === 'marketing_copy') {
    return `## نسخة تسويقية\nابدأ رحلتك المؤسسية اليوم مع برنامج عملي موجّه للنتائج.\n\nHook: ${prompt}`
  }
  return `## مخطط دورة\n- الأهداف التعليمية\n- الوحدات الأساسية\n- التقييمات\n\nالموضوع: ${prompt}`
}

export function seedAiAutomations(): AiAutomationFlow[] {
  return [
    { id: 501, name: 'تلخيص الاجتماع تلقائياً', trigger: 'meeting.completed', action: 'generate_summary + create_tasks', status: 'active', last_run_at: '2026-05-11 10:04' },
    { id: 502, name: 'تنبيه مخاطر التسرب', trigger: 'risk.dropout.detected', action: 'notify_admin + open_followup_task', status: 'active', last_run_at: '2026-05-11 09:12' },
    { id: 503, name: 'إعادة صياغة تقرير أسبوعي', trigger: 'report.generated', action: 'ai_rewrite + partner_digest', status: 'paused', last_run_at: '2026-05-09 18:00' },
  ]
}

export function seedAiAutomationRuns(): AiAutomationRun[] {
  return [
    { id: 901, automation_id: 501, status: 'success', started_at: '2026-05-11 10:04', finished_at: '2026-05-11 10:04', logs: ['التقاط المحضر', 'توليد ملخص', 'إنشاء مهمتين'] },
    { id: 902, automation_id: 502, status: 'failed', started_at: '2026-05-11 09:12', finished_at: '2026-05-11 09:13', logs: ['تحليل المخاطر', 'فشل إرسال إشعار البريد (timeout)'] },
    { id: 903, automation_id: 501, status: 'running', started_at: '2026-05-11 22:01', logs: ['قراءة محضر جديد', 'تجهيز سياق القرارات'] },
  ]
}

export function seedAiUsage(): AiUsageSnapshot {
  return {
    requests_count: 18240,
    estimated_cost_usd: 412.7,
    failed_generations: 73,
    tokens_total: 4_820_000,
    models: [
      { name: 'gpt-4.1-mini', requests: 10220, tokens: 2_040_000 },
      { name: 'gpt-4.1', requests: 6240, tokens: 2_380_000 },
      { name: 'text-embedding-3-large', requests: 1780, tokens: 400_000 },
    ],
    top_users: [
      { id: 'u1', name: 'هند الكندري', requests: 420 },
      { id: 'u2', name: 'أحمد الشهري', requests: 388 },
      { id: 'u3', name: 'سارة المطيري', requests: 301 },
    ],
    top_prompts: [
      { text: 'لخّص محضر الاجتماع', count: 810 },
      { text: 'حلّل مخاطر الحضور', count: 602 },
      { text: 'أنشئ مسار تعليمي', count: 522 },
    ],
  }
}
