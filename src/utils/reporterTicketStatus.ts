import type { TicketCategory, TicketStatus } from '@/types/ticket';

/**
 * How the person who SUBMITTED a report or suggestion is told about its state.
 *
 * Reports and suggestions share one status vocabulary, but the staff wording
 * ("محالة للوحدة التقنية", "اعتذر المكلف", "تعذر الحل — تم التصعيد") describes
 * internal routing. The submitter gets plain outcome language instead, and the
 * two internal-only states (assignee apology, escalation) are shown neutrally as
 * "under review" so no handling detail leaks through the wording.
 */

export type ReporterTone = 'success' | 'info' | 'progress' | 'review' | 'declined';

export interface ReporterStatusCopy {
  /** The resolution badge, e.g. "تم حل البلاغ". */
  badge: string;
  /** The same status as a short phrase for the info grid, e.g. "تم الحل". */
  statusLabel: string;
  /** One reassuring sentence under the title. */
  hint: string;
  tone: ReporterTone;
}

export function reporterStatusCopy(status: TicketStatus, category: TicketCategory): ReporterStatusCopy {
  const isSuggestion = category === 'NEW_SUGGESTION';
  const noun = isSuggestion ? 'المقترح' : 'البلاغ';

  switch (status) {
    case 'RESOLVED':
      return isSuggestion
        ? {
            badge: 'تم تنفيذ المقترح',
            statusLabel: 'تم التنفيذ',
            hint: 'تمت إضافة مقترحك إلى النظام. شكرًا لمساهمتك في تطوير المنصة.',
            tone: 'success',
          }
        : {
            badge: 'تم حل البلاغ',
            statusLabel: 'تم الحل',
            hint: 'تمت معالجة بلاغك وإغلاقه. شكرًا لك على مساعدتنا في تحسين المنصة.',
            tone: 'success',
          };
    case 'ASSIGNED':
      return isSuggestion
        ? {
            badge: 'تم اعتماد المقترح',
            statusLabel: 'معتمد',
            hint: 'اعتمدته الإدارة، وسنوافيك عند تنفيذه.',
            tone: 'info',
          }
        : {
            badge: 'أُحيل إلى الفريق المختص',
            statusLabel: 'قيد المعالجة',
            hint: 'تمت مراجعة بلاغك وإحالته إلى الفريق المختص.',
            tone: 'progress',
          };
    case 'IN_PROGRESS':
      return {
        badge: isSuggestion ? 'المقترح قيد التنفيذ' : 'البلاغ قيد المعالجة',
        statusLabel: isSuggestion ? 'قيد التنفيذ' : 'قيد المعالجة',
        hint: `الفريق المختص يعمل على ${noun} الآن.`,
        tone: 'progress',
      };
    case 'REJECTED_BY_ADMIN':
      return {
        badge: isSuggestion ? 'لم يُعتمد المقترح' : 'تعذّر قبول البلاغ',
        statusLabel: isSuggestion ? 'غير معتمد' : 'غير مقبول',
        hint: 'يمكنك الاطلاع على السبب أدناه، ويسعدنا أن تقدّم طلبًا جديدًا في أي وقت.',
        tone: 'declined',
      };
    case 'UNRESOLVED':
    case 'REJECTED_BY_ASSIGNEE':
      return {
        badge: `${noun} قيد المراجعة`,
        statusLabel: 'قيد المراجعة',
        hint: `تتم مراجعة ${noun} من قبل الإدارة وسنوافيك بأي مستجدات.`,
        tone: 'review',
      };
    case 'PENDING_APPROVAL':
    default:
      return {
        badge: isSuggestion ? 'بانتظار المراجعة' : 'قيد المراجعة',
        statusLabel: 'قيد المراجعة',
        hint: `استلمنا ${noun} وهو بانتظار مراجعة الإدارة.`,
        tone: 'review',
      };
  }
}

/** Gregorian, Latin digits, e.g. "12 أكتوبر 2026، 9:30 ص" — the same style the email uses. */
export function formatReporterDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ar', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    calendar: 'gregory',
    numberingSystem: 'latn',
  }).format(d);
}

/** Date only, for the "submitted on" line. */
export function formatReporterDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ar', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    calendar: 'gregory',
    numberingSystem: 'latn',
  }).format(d);
}
