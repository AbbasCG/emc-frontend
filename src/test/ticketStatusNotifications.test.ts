import { describe, expect, it } from 'vitest'
import { isNotificationUnread, normalizePlatformNotification } from '@/api/notificationsApi'

/**
 * The backend now notifies the submitter of a report or suggestion when it is
 * resolved / approved / implemented (ticket_resolved, suggestion_approved,
 * suggestion_implemented). The notification centre needs no special handling:
 * these rows must come through the normalizer with their Arabic title and body
 * intact, the details link resolved from action_url, and the unread state kept.
 * The payloads below are the exact shape NotificationService writes.
 */

const base = {
  id: 301,
  entity_type: 'ticket',
  entity_id: 42,
  action_url: '/dashboard/tickets/42',
  is_read: false,
  created_at: '2026-10-12T09:00:00Z',
}

const CASES = [
  {
    type: 'ticket_resolved',
    title: 'تم حل البلاغ',
    message: 'تمت معالجة البلاغ "تعطل بوابة الدفع" وتغيير حالته إلى "تم الحل". يمكنك عرض التفاصيل من خلال الرابط.',
  },
  {
    type: 'suggestion_approved',
    title: 'تم اعتماد المقترح',
    message: 'تم اعتماد المقترح "إضافة وضع ليلي" من قبل الإدارة وتغيير حالته إلى "معتمد". يمكنك متابعة التفاصيل من خلال الرابط.',
  },
  {
    type: 'suggestion_implemented',
    title: 'تمت إضافة المقترح إلى النظام',
    message: 'تمت إضافة المقترح "إضافة وضع ليلي" إلى النظام وتغيير حالته إلى "تمت الإضافة إلى النظام". شكرًا لمساهمتك في تطوير المنصة.',
  },
]

describe('ticket status notifications in the notification centre', () => {
  it.each(CASES)('$type keeps its Arabic title and body and links to the ticket details page', ({ type, title, message }) => {
    const n = normalizePlatformNotification({ ...base, type, title, message, icon: 'bell', color: 'green' })

    expect(n).not.toBeNull()
    expect(n?.type).toBe(type)
    expect(n?.title).toBe(title)
    expect(n?.body).toBe(message)
    // The route the SPA serves for a submitter (TicketDetailPage), not a guessed path.
    expect(n?.href).toBe('/dashboard/tickets/42')
    expect(n?.entity_type).toBe('ticket')
    expect(n?.entity_id).toBe(42)
  })

  it('is unread until read, like every other notification', () => {
    const unread = normalizePlatformNotification({ ...base, type: 'ticket_resolved', title: 't', message: 'm' })
    const read = normalizePlatformNotification({ ...base, type: 'ticket_resolved', title: 't', message: 'm', read_at: '2026-10-12T10:00:00Z' })

    expect(unread && isNotificationUnread(unread)).toBe(true)
    expect(read && isNotificationUnread(read)).toBe(false)
  })

  it('carries the title with quotes and long text through untouched', () => {
    const title = 'تعطل "بوابة" الدفع الإلكتروني الخاصة بالمشتركين الجدد في برنامج التدريب المتقدم'
    const n = normalizePlatformNotification({ ...base, type: 'ticket_resolved', title: 'تم حل البلاغ', message: `تمت معالجة البلاغ "${title}" وتغيير حالته إلى "تم الحل".` })

    expect(n?.body).toContain(title)
  })

  it('does not invent a link when the server sent none', () => {
    const n = normalizePlatformNotification({ ...base, action_url: null, entity_type: null, entity_id: null, type: 'ticket_resolved', title: 't', message: 'm' })

    expect(n?.href).toBeNull()
  })
})
