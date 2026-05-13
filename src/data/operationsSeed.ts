import { departments10 } from '@/data/publicPages'
import type {
  DepartmentDetail,
  MarketingItem,
  OpsMeeting,
  OpsMeetingDetail,
  OpsVolunteer,
  OperationsDashboardData,
  OpsFormDefinition,
  OpsTask,
  PartnerRecord,
  PartnershipRequest,
  SupportTicket,
  SupportTicketDetail,
  WorkspaceDepartment,
} from '@/types/operations'

function healthFromIndex(i: number): WorkspaceDepartment['status'] {
  if (i % 7 === 0) return 'risk'
  if (i % 4 === 0) return 'attention'
  return 'healthy'
}

/** Fallback workspace departments built from public site taxonomy */
export function seedWorkspaceDepartments(): WorkspaceDepartment[] {
  return departments10.map((d, i) => ({
    id: d.id,
    title: d.title.ar,
    description: d.description.ar,
    leader_name: `قائد الإدارة ${i + 1}`,
    members_count: 6 + (i % 8),
    open_tasks: 3 + ((i * 2) % 11),
    meetings_week: 1 + (i % 4),
    status: healthFromIndex(i),
    health_score: 92 - (i % 15),
  }))
}

export function seedDepartmentDetail(id: string): DepartmentDetail | null {
  const base = seedWorkspaceDepartments().find((x) => x.id === id)
  if (!base) return null
  const deptMeta = departments10.find((d) => d.id === id)
  return {
    ...base,
    sections: deptMeta?.responsibilities?.slice(0, 4).map((r, i) => ({
      title: `محور ${i + 1}`,
      body: r.ar,
    })),
    members_preview: [
      { name: 'أحمد المنصوري', role: 'منسق' },
      { name: 'ليان الخطيب', role: 'عضو فريق' },
      { name: 'سارة القاسم', role: 'مراجعة' },
    ],
    kpi_placeholder: ['زمن الاستجابة', 'رضا المستفيدين', 'معدل إنجاز المهام'],
  }
}

const TASK_STATUSES = [
  'idea',
  'study',
  'planning',
  'pending_approval',
  'in_progress',
  'needs_review',
  'done',
  'deferred',
  'cancelled',
] as const

export function seedTasks(): OpsTask[] {
  const depts = seedWorkspaceDepartments()
  return Array.from({ length: 24 }).map((_, i) => {
    const dept = depts[i % depts.length]!
    const st = TASK_STATUSES[i % TASK_STATUSES.length]!
    const overdue = i % 9 === 0 && st !== 'done' && st !== 'cancelled'
    const due = overdue ? '2025-01-05' : '2026-06-15'
    return {
      id: i + 1,
      title:
        [
          'تحديث دليل الجودة',
          'متابعة شراكة جديدة',
          'تحضير ورشة قادمة',
          'مراجعة تقارير الأثر',
          'توثيق إجراءات التشغيل',
          'تحسين تجربة التسجيل',
        ][i % 6] ?? 'مهمة تشغيل',
      description: 'تفاصيل المهمة متاحة عند ربط الخادم بمسارات Phase 3.',
      department_id: dept.id,
      department_name: dept.title,
      assignee_name: ['نورة العلي', 'خالد السبيعي', 'ريم الحربي'][i % 3] ?? null,
      assignee_id: (i % 5) + 1,
      status: st,
      priority: (['low', 'medium', 'high', 'critical'] as const)[i % 4]!,
      due_at: due,
      tags: [['جودة', 'عاجل'], ['شراكات'], ['برامج']][i % 3],
      checklist_done: i % 4,
      checklist_total: 5,
      checklist: [
        { id: 1, label: 'جمع المدخلات', done: i % 2 === 0 },
        { id: 2, label: 'مراجعة الإدارة', done: i % 3 === 0 },
        { id: 3, label: 'الإطلاق', done: false },
      ],
      comments: [
        {
          id: 1,
          author_name: 'فريق العمليات',
          body: 'تم التحقق من المسودة الأولى.',
          created_at: new Date().toISOString(),
        },
      ],
      related_type: i % 2 === 0 ? 'meeting' : null,
      related_label: i % 2 === 0 ? 'اجتماع الإدارات — الأسبوع الماضي' : null,
    }
  })
}

export function seedMeetings(): OpsMeeting[] {
  const depts = seedWorkspaceDepartments()
  return Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    title: ['اجتماع الجودة الشهري', 'متابعة البرامج', 'لجنة الشراكات', 'إحاطة الإدارة العليا'][i % 4] ?? 'اجتماع',
    starts_at: `2026-06-${10 + (i % 18)}T${10 + (i % 6)}:00:00`,
    type: (['exec', 'departments', 'programs', 'partnerships', 'quality', 'external'] as const)[i % 6]!,
    department_id: depts[i % depts.length]!.id,
    department_name: depts[i % depts.length]!.title,
    organizer_name: 'أمانة EMC',
    status: (['scheduled', 'scheduled', 'completed'] as const)[i % 3]!,
  }))
}

export function seedPartners(): PartnerRecord[] {
  return [
    { id: 1, name: 'جامعة الرؤية', institution_type: 'أكاديمي', status: 'نشط', updated_at: '2026-05-01' },
    { id: 2, name: 'مجتمع المدربين الهولندي', institution_type: 'مهني', status: 'تجريبي', updated_at: '2026-05-08' },
    { id: 3, name: 'مؤسسة نماء', institution_type: 'مجتمع مدني', status: 'نشط', updated_at: '2026-04-20' },
  ]
}

export function seedPartnershipRequests(): PartnershipRequest[] {
  return [
    {
      id: 1,
      institution_name: 'أكاديمية المستقبل',
      contact_name: 'محمد الطائي',
      email: 'future@example.org',
      institution_type: 'تدريب مهني',
      status: 'قيد المراجعة',
      created_at: '2026-05-09',
      message_preview: 'مهتمون بشراكة مجتمع المتعلمين...',
    },
    {
      id: 2,
      institution_name: 'شركة تمكين',
      contact_name: 'هند الكندري',
      email: 'hr@tamkeen.example',
      institution_type: 'قطاع خاص',
      status: 'بانتظار الرد',
      created_at: '2026-05-07',
      message_preview: 'اقتراح مسار مشترك للموظفين...',
    },
  ]
}

export function seedMeetingDetail(id: number): OpsMeetingDetail {
  const base = seedMeetings().find((m) => m.id === id) ?? seedMeetings()[0]!
  return {
    ...base,
    agenda: '١) مراجعة المؤشرات.\n٢) اعتماد الخطة التصحيحية.\n٣) أي أعمال أخرى.',
    attendees: [
      { name: 'أحمد الشهري', role: 'رئيس الاجتماع' },
      { name: 'مزنة القحطاني', role: 'أمانة' },
      { name: 'خالد الغامدي', role: 'عضو' },
    ],
    decisions: [
      { id: 1, text: 'اعتماد تحديث دليل الجودة وفق المسودة الأخيرة.' },
      { id: 2, text: 'تكليف الإدارة التشغيلية بمتابعة تنفيذ خلال ١٤ يوماً.' },
    ],
    action_items: [
      { id: 1, text: 'رفع نسخة الدليل المعتمد على المنصة الداخلية', owner: 'التشغيل', due_at: '2026-06-20', done: false },
      { id: 2, text: 'إرسال ملخص للإدارة العليا', owner: 'الجودة', due_at: '2026-06-18', done: false },
    ],
    minutes: 'تم الاتفاق على المتابعة الأسبوعية عبر لوحة EMC Ops.',
    recording_link: 'https://example.com/recording-placeholder',
  }
}

export function seedVolunteers(): OpsVolunteer[] {
  const depts = seedWorkspaceDepartments()
  const st: OpsVolunteer['status'][] = ['applied', 'review', 'accepted', 'active', 'partial', 'inactive', 'withdrawn']
  return Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    name: ['ريم السبيعي', 'فهد الدوسري', 'شهد العتيبي', 'نايف الحربي'][i % 4]! + ` ${i + 1}`,
    department_id: depts[i % depts.length]!.id,
    department_name: depts[i % depts.length]!.title,
    status: st[i % st.length]!,
    skills: [['تنسيق فعاليات', 'تواصل'], ['تصميم', 'محتوى'], ['تحليل بيانات']][i % 3],
    availability: i % 2 === 0 ? 'مسائي + عطلة نهاية الأسبوع' : 'صباحي جزئي',
    hours_logged: (i + 1) * 4,
    onboarding_step: i % 3 === 0 ? 'جمع مستندات' : i % 3 === 1 ? 'توقيع اتفاقية' : 'مكتمل',
  }))
}

export function seedSupportTickets(): SupportTicket[] {
  const st = ['new', 'open', 'waiting', 'resolved', 'closed'] as const
  return Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    subject: ['مشكلة دخول', 'استفسار فاتورة', 'طلب ميزة جديدة', 'بلاغ تقني'][i % 4]!,
    type: ['تقني', 'مالي', 'عام'][i % 3],
    priority: ['منخفض', 'متوسط', 'عالي'][i % 3],
    status: st[i % st.length]!,
    requester_name: `مستخدم ${i + 1}`,
    updated_at: `2026-05-${10 + (i % 15)}`,
  }))
}

export function seedSupportTicketDetail(id: number): SupportTicketDetail {
  const base = seedSupportTickets().find((t) => t.id === id) ?? seedSupportTickets()[0]!
  return {
    ...base,
    message: 'تفاصيل الرسالة الأصلية من المستخدم حول المشكلة أو الطلب.',
    replies: [
      {
        id: 1,
        author_name: 'فريق الدعم',
        body: 'تم استلام طلبك وجاري العمل عليه.',
        internal: false,
        created_at: '2026-05-10 09:00',
      },
      {
        id: 2,
        author_name: 'ملاحظة داخلية',
        body: 'يحتاج تصعيد للتقنية.',
        internal: true,
        created_at: '2026-05-10 10:15',
      },
    ],
  }
}

export function seedPublicForm(slug: string): OpsFormDefinition {
  return {
    id: 1,
    title: slug === 'feedback' ? 'نموذج ملاحظات' : `نموذج: ${slug}`,
    description: 'عيّن الحقول التالية بعناية — البيانات تُستخدم لتحسين خدمات EMC.',
    slug,
    form_type: 'suggestion',
    questions: [
      { id: 1, label: 'الاسم', type: 'text', required: true, sort_order: 1 },
      { id: 2, label: 'البريد', type: 'text', required: true, sort_order: 2 },
      {
        id: 3,
        label: 'نوع الملاحظة',
        type: 'select',
        required: true,
        options: ['شكوى', 'اقتراح', 'استفسار'],
        sort_order: 3,
      },
      { id: 4, label: 'التفاصيل', type: 'textarea', required: true, sort_order: 4 },
    ],
  }
}

export function seedFormDefinitions(): OpsFormDefinition[] {
  return [
    seedPublicForm('feedback'),
    {
      id: 2,
      title: 'تقييم دورة',
      slug: 'course-eval-demo',
      description: 'تقييم مختصر بعد انتهاء الدورة',
      form_type: 'course_eval',
      questions: [
        { id: 1, label: 'مدى رضاك الإجمالي', type: 'select', required: true, options: ['ممتاز', 'جيد', 'يحتاج تحسين'], sort_order: 1 },
        { id: 2, label: 'تعليق', type: 'textarea', required: false, sort_order: 2 },
      ],
    },
  ]
}

export function seedMarketing(): MarketingItem[] {
  const statuses = [
    'idea',
    'writing',
    'design',
    'review',
    'approval',
    'scheduled',
    'published',
    'archived',
  ] as const
  return Array.from({ length: 12 }).map((_, i) => ({
    id: i + 1,
    title: ['إطلاق دورة الذكاء الاصطناعي', 'تقرير أثر ربع سنوي', 'حملة التطوع', 'قصة نجاح'][i % 4] ?? 'محتوى',
    platform: ['لينكدإن', 'إنستغرام', 'الموقع', 'بريد'][i % 4]!,
    status: statuses[i % statuses.length]!,
    publish_at: `2026-06-${5 + (i % 20)}`,
    owner_name: ['فريق التسويق', 'مبدع المحتوى'][i % 2]!,
    related_program: i % 2 === 0 ? 'مسار القيادة' : null,
  }))
}

export function seedOperationsDashboard(): OperationsDashboardData {
  const depts = seedWorkspaceDepartments()
  const tasks = seedTasks()
  const overdue = tasks.filter((t) => t.due_at && t.due_at < '2026-05-01' && t.status !== 'done')
  return {
    active_departments: depts.filter((d) => d.status !== 'risk').length,
    open_tasks: tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length,
    overdue_tasks: overdue.length,
    upcoming_meetings: seedMeetings().filter((m) => m.status === 'scheduled').length,
    pending_partnership_requests: seedPartnershipRequests().filter(
      (p) => p.status.includes('انتظار') || p.status.includes('مراجعة'),
    ).length,
    volunteer_applications: seedVolunteers().filter((v) => v.status === 'applied' || v.status === 'review').length,
    support_tickets_open: seedSupportTickets().filter((t) => t.status !== 'closed' && t.status !== 'resolved').length,
    marketing_in_review: seedMarketing().filter((m) => m.status === 'review' || m.status === 'approval').length,
    recent_activity: [
      { id: 1, label: 'تم تحديث مهمة الجودة', at: 'منذ ساعتين', kind: 'مهمة' },
      { id: 2, label: 'اجتماع شراكات جديد', at: 'أمس', kind: 'اجتماع' },
      { id: 3, label: 'تذكرة دعم #204', at: 'اليوم', kind: 'دعم' },
    ],
    department_health: depts.slice(0, 6).map((d) => ({
      department_id: d.id,
      title: d.title,
      score: d.health_score ?? 80,
    })),
  }
}
