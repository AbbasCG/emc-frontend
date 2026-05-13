import type {
  ApiAccessTokenRow,
  CalendarEventRecord,
  EmailIntegrationPreview,
  IntegrationSummary,
  MobileReadinessPayload,
  NotificationPreferenceKey,
  NotificationPreferenceRow,
  WebhookDelivery,
  WebhookEndpoint,
  WhatsAppIntegrationPreview,
} from '@/types/phase7'

export function seedNotificationPreferences(): NotificationPreferenceRow[] {
  const row = (
    key: NotificationPreferenceKey,
    label_ar: string,
  ): NotificationPreferenceRow => ({
    key,
    label_ar,
    channels: { in_app: true, email: false, whatsapp: false },
  })

  return [
    row('registration_confirm', 'تأكيد التسجيل'),
    row('payment_confirm', 'تأكيد الدفع'),
    row('payment_failed', 'فشل الدفع'),
    row('session_reminder', 'تذكير الجلسة'),
    row('assignment_due', 'موعد واجب'),
    row('certificate_issued', 'إصدار شهادة'),
    row('task_assigned', 'تعيين مهمة'),
    row('meeting_invite', 'دعوة اجتماع'),
    row('support_reply', 'رد الدعم'),
    row('partner_update', 'تحديث الشريك'),
  ]
}

export function seedIntegrations(): IntegrationSummary[] {
  return [
    {
      provider: 'stripe',
      title_ar: 'Stripe',
      description_ar: 'معالجة مدفوعات البطاقات والاشتراكات الآمنة.',
      status: 'needs_setup',
      security_note_ar: 'المفتاح السري يُخزَّن مشفرًا على الخادم.',
      settings_path: '/dashboard/admin/finance',
    },
    {
      provider: 'paypal',
      title_ar: 'PayPal',
      description_ar: 'بوابة بديلة للمدفوعات العالمية.',
      status: 'not_configured',
      settings_path: '/dashboard/admin/finance/payments',
    },
    {
      provider: 'whatsapp',
      title_ar: 'واتساب',
      description_ar: 'تذكيرات وتأكيدات عبر القنوات الفورية.',
      status: 'needs_setup',
      settings_path: '/dashboard/admin/integrations/whatsapp',
    },
    {
      provider: 'email',
      title_ar: 'البريد الإلكتروني',
      description_ar: 'SMTP transactional وجداول القوالب.',
      status: 'connected',
      settings_path: '/dashboard/admin/integrations/email',
    },
    {
      provider: 'google_calendar',
      title_ar: 'Google Calendar',
      description_ar: 'مزامنة الجلسات والاجتماعات مع تقويم جوجل.',
      status: 'not_configured',
      settings_path: '/dashboard/admin/calendar',
    },
    {
      provider: 'outlook_calendar',
      title_ar: 'Outlook Calendar',
      description_ar: 'تكامل مايكروسوفت 365 للفرق الإدارية.',
      status: 'not_configured',
      settings_path: '/dashboard/admin/calendar',
    },
    {
      provider: 'webhooks',
      title_ar: 'Webhooks',
      description_ar: 'إرسال أحداث المنصة إلى أنظمتكم الخارجية.',
      status: 'connected',
      settings_path: '/dashboard/admin/webhooks',
    },
    {
      provider: 'api_tokens',
      title_ar: 'رموز المطوّر API',
      description_ar: 'وصول آمن للقراءة والكتابة على نقاط محددة.',
      status: 'needs_setup',
      security_note_ar: 'لا تشارك الرموز أبدًا خارج بيئة الإنتاج.',
      settings_path: '/dashboard/admin/developer/api-tokens',
    },
  ]
}

export function seedWhatsAppIntegration(): WhatsAppIntegrationPreview {
  return {
    mode: 'fake',
    meta_placeholder_ar: 'Token Placeholder •••••••• — يُدار من لوحة الإعدادات',
    twilio_placeholder_ar: 'SID / Auth Token — مخفي عن الواجهة',
  }
}

export function seedEmailIntegration(): EmailIntegrationPreview {
  return {
    driver_label_ar: 'SMTP / Laravel Mail',
    driver_hint_ar: 'يتم ضبط الإعدادات على الخادم. الواجهة تعرض الحالة فقط دون كشف أسرار.',
    templates: [
      { id: '1', name_ar: 'تأكيد تسجيل', slug: 'registration_confirmed' },
      { id: '2', name_ar: 'إيصال دفع', slug: 'payment_receipt' },
      { id: '3', name_ar: 'تذكير جلسة', slug: 'session_reminder' },
    ],
  }
}

export function seedCalendarEvents(): CalendarEventRecord[] {
  const soon = new Date()
  soon.setDate(soon.getDate() + 1)
  const later = new Date()
  later.setDate(later.getDate() + 3)

  return [
    {
      id: 101,
      title: 'جلسة الإرشاد الأكاديمي — الدفعة 12',
      kind: 'session',
      starts_at: soon.toISOString(),
      ends_at: new Date(soon.getTime() + 90 * 60 * 1000).toISOString(),
      location_ar: 'قاعة التعلّم الهجين',
      join_url: 'https://meet.emc.example/session-101',
      status_ar: 'مجدولة',
      ics_uid: 'emc-session-101',
    },
    {
      id: 202,
      title: 'اجتماع لجنة الجودة',
      kind: 'meeting',
      starts_at: later.toISOString(),
      ends_at: new Date(later.getTime() + 45 * 60 * 1000).toISOString(),
      location_ar: 'طابق الإدارة',
      join_url: null,
      status_ar: 'قيد التأكيد',
      ics_uid: 'emc-meeting-202',
    },
    {
      id: 303,
      title: 'استحقاق واجب الوحدة الثالثة',
      kind: 'task',
      starts_at: new Date(later.getTime() + 86400000).toISOString(),
      ends_at: null,
      location_ar: null,
      join_url: '/dashboard/student/assignments',
      status_ar: 'مطلوب',
      ics_uid: 'emc-task-303',
    },
  ]
}

export function seedWebhookEndpoints(): WebhookEndpoint[] {
  return [
    {
      id: 1,
      url: 'https://hooks.partner.example/emc/prod',
      active: true,
      events: ['registration.created', 'payment.confirmed'],
      secret_hint_ar: 'whsec_••••••••••',
      created_at: '2026-01-05',
      updated_at: '2026-02-01',
    },
    {
      id: 2,
      url: 'https://automations.internal/emc/inbox',
      active: false,
      events: ['certificate.issued', 'support.ticket.created'],
      created_at: '2025-11-12',
      updated_at: '2026-01-22',
    },
  ]
}

export function seedWebhookDeliveries(webhookId: number): WebhookDelivery[] {
  const base = Date.now()
  return [
    {
      id: 901,
      webhook_id: webhookId,
      event: 'registration.created',
      status: 'success',
      http_status: 200,
      attempted_at: new Date(base - 3600000).toISOString(),
      duration_ms: 412,
      detail_ar: null,
    },
    {
      id: 902,
      webhook_id: webhookId,
      event: 'payment.confirmed',
      status: 'failed',
      http_status: 500,
      attempted_at: new Date(base - 7200000).toISOString(),
      duration_ms: 1204,
      detail_ar: 'انتهت مهلة الخادم المستلم.',
    },
    {
      id: 903,
      webhook_id: webhookId,
      event: 'registration.created',
      status: 'pending',
      http_status: null,
      attempted_at: new Date(base - 120000).toISOString(),
      duration_ms: null,
      detail_ar: 'في انتظار إعادة المحاولة',
    },
  ]
}

export function seedApiTokens(): ApiAccessTokenRow[] {
  return [
    {
      id: 11,
      name: 'BI nightly sync',
      scopes: ['read:reports', 'read:courses'],
      last_used_at: '2026-05-08T09:12:00Z',
      created_at: '2026-04-01',
      token_preview: 'emc_live_a8f•••',
    },
    {
      id: 12,
      name: 'Partner intake bot',
      scopes: ['read:registrations', 'write:forms'],
      last_used_at: null,
      created_at: '2026-05-01',
      token_preview: 'emc_live_z21•••',
    },
  ]
}

export function seedMobileReadiness(): MobileReadinessPayload {
  return {
    api_online: true,
    notification_bridge_ready: false,
    offline_placeholder_ar: 'قريبًا: حزم دروس محفوظة للقراءة بدون اتصال.',
    roadmap: [
      { id: 'push', label_ar: 'إشعارات الدفع الأصلية', done: false },
      { id: 'widgets', label_ar: 'عناصر الشاشة الرئيسية', done: false },
      { id: 'biometrics', label_ar: 'قفل القياسات الحيوية', done: false },
      { id: 'sso', label_ar: 'SSO للمؤسسات', done: false },
    ],
    endpoints: [
      { path: '/api/mobile/v1/me', description_ar: 'ملف الطالب المختصر', ready: true },
      { path: '/api/mobile/v1/calendar', description_ar: 'التقويم القادم', ready: true },
      { path: '/api/mobile/v1/notifications', description_ar: 'مزامنة الإشعارات', ready: false },
      { path: '/api/mobile/v1/courses/:id/modules', description_ar: 'هيكل الدورة', ready: true },
    ],
    dashboard_preview_ar: [
      'لوحة متابعة التقدّم اليومية',
      'بطاقات الواجبات القادمة',
      'تنبيهات الشهادات الصادرة',
      'روابط الاجتماعات السريعة',
    ],
  }
}
