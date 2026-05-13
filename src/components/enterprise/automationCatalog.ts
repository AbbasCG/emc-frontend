import type { AutomationActionKind, AutomationTrigger } from '@/types/platform'

export const AUTOMATION_TRIGGER_OPTIONS: { value: AutomationTrigger; label: string }[] = [
  { value: 'manual', label: 'يدوي' },
  { value: 'schedule', label: 'جدولة زمنية' },
  { value: 'webhook', label: 'Webhook خارجي' },
  { value: 'record_created', label: 'إنشاء سجل' },
  { value: 'registration_created', label: 'تسجيل جديد' },
  { value: 'payment_confirmed', label: 'دفع مؤكد' },
  { value: 'payment_failed', label: 'دفع فاشل' },
  { value: 'session_starts_soon', label: 'جلسة تبدأ قريبًا' },
  { value: 'assignment_due_soon', label: 'واجب يقترب موعده' },
  { value: 'certificate_issued', label: 'إصدار شهادة' },
  { value: 'task_overdue', label: 'مهمة متأخرة' },
  { value: 'support_ticket_created', label: 'تذكرة دعم جديدة' },
  { value: 'partner_request_created', label: 'طلب شراكة جديد' },
]

export const AUTOMATION_ACTION_OPTIONS: { value: AutomationActionKind; label: string }[] = [
  { value: 'send_notification', label: 'إرسال إشعار داخل المنصة' },
  { value: 'send_email', label: 'إرسال بريد إلكتروني' },
  { value: 'send_whatsapp', label: 'إرسال واتساب' },
  { value: 'create_task', label: 'إنشاء مهمة' },
  { value: 'create_meeting', label: 'إنشاء اجتماع' },
  { value: 'create_report', label: 'إنشاء تقرير' },
  { value: 'call_webhook', label: 'استدعاء Webhook' },
  { value: 'update_status', label: 'تحديث حالة' },
]

export function buildActionsPreviewJson(actions: AutomationActionKind[]) {
  return JSON.stringify({ actions }, null, 2)
}
