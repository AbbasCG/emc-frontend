import type {
  MarketingContentStatus,
  MeetingType,
  SupportTicketStatus,
  TaskPriority,
  TaskStatus,
  VolunteerStatus,
} from '@/types/operations'

export const TASK_STATUS_AR: Record<TaskStatus, string> = {
  idea: 'فكرة',
  study: 'قيد الدراسة',
  planning: 'قيد التخطيط',
  pending_approval: 'بانتظار الموافقة',
  in_progress: 'قيد التنفيذ',
  done: 'مكتملة',
  deferred: 'مؤجلة',
  cancelled: 'ملغاة',
  needs_review: 'تحتاج تقييم',
}

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'idea',
  'study',
  'planning',
  'pending_approval',
  'in_progress',
  'needs_review',
  'done',
  'deferred',
  'cancelled',
]

export const TASK_PRIORITY_AR: Record<TaskPriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'مرتفعة',
  critical: 'حرجة',
}

export const MEETING_TYPE_AR: Record<MeetingType, string> = {
  exec: 'اجتماع الإدارة العليا',
  departments: 'اجتماع الإدارات',
  programs: 'اجتماع البرامج',
  partnerships: 'اجتماع الشراكات',
  quality: 'اجتماع الجودة',
  external: 'اجتماع مع شريك خارجي',
}

export const VOLUNTEER_STATUS_AR: Record<VolunteerStatus, string> = {
  applied: 'متقدم',
  review: 'قيد المراجعة',
  accepted: 'مقبول',
  active: 'نشط',
  partial: 'متاح جزئيًا',
  inactive: 'غير نشط',
  withdrawn: 'منسحب',
}

export const SUPPORT_STATUS_AR: Record<SupportTicketStatus, string> = {
  new: 'جديدة',
  in_progress: 'قيد المعالجة',
  waiting_response: 'بانتظار رد',
  resolved: 'محلولة',
  closed: 'مغلقة',
}

export const MARKETING_STATUS_AR: Record<MarketingContentStatus, string> = {
  idea: 'فكرة',
  writing: 'كتابة',
  design: 'تصميم',
  review: 'مراجعة',
  approval: 'موافقة',
  scheduled: 'مجدول',
  published: 'منشور',
  archived: 'مؤرشف',
}

export const FORM_TYPE_AR: Record<string, string> = {
  student_register: 'تسجيل طالب',
  volunteer_register: 'تسجيل متطوع',
  partnership_request: 'طلب شراكة',
  course_eval: 'تقييم دورة',
  workshop_eval: 'تقييم ورشة',
  trainer_eval: 'تقييم مدرب',
  new_program_request: 'طلب برنامج جديد',
  meeting_form: 'نموذج اجتماع',
  activity_report: 'تقرير نشاط',
  complaint: 'شكوى',
  suggestion: 'اقتراح',
  grant_request: 'طلب منحة',
}
