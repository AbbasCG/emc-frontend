export { formatDatetimeLocalPreview } from '@/utils/datetimeLocal'

export type SessionLocationType = 'online' | 'offline' | 'hybrid'

export function normalizeSessionLocationType(raw: string): SessionLocationType {
  const v = raw.trim().toLowerCase()
  if (v === 'offline' || v === 'onsite' || v === 'in_person' || v === 'حضوري') return 'offline'
  if (v === 'hybrid' || v === 'mixed') return 'hybrid'
  return 'online'
}

export function sessionShowsMeetingUrl(type: SessionLocationType): boolean {
  return type === 'online' || type === 'hybrid'
}

export function sessionShowsLocation(type: SessionLocationType): boolean {
  return type === 'offline' || type === 'hybrid'
}

export function validateSessionDraft(d: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {}
  const locType = normalizeSessionLocationType(d.location_type ?? 'online')

  if (!d.title?.trim()) errors.title = 'العنوان مطلوب.'
  if (!d.start_at?.trim()) errors.start_at = 'وقت البداية مطلوب.'

  if (sessionShowsMeetingUrl(locType) && !d.meeting_url?.trim()) {
    errors.meeting_url = 'رابط الاجتماع مطلوب للجلسات الأونلاين.'
  }
  if (sessionShowsLocation(locType) && !d.location?.trim()) {
    errors.location = 'الموقع مطلوب للجلسات الحضورية.'
  }

  if (d.start_at?.trim() && d.end_at?.trim()) {
    const start = new Date(d.start_at)
    const end = new Date(d.end_at)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
      errors.end_at = 'وقت النهاية يجب أن يكون بعد وقت البداية.'
    }
  }

  return errors
}

export const SESSION_LOCATION_OPTIONS = [
  { value: 'online', label: 'أونلاين' },
  { value: 'offline', label: 'حضوري' },
  { value: 'hybrid', label: 'مختلط (أونلاين + حضور)' },
] as const

export const SESSION_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'مجدولة' },
  { value: 'live', label: 'مباشرة الآن' },
  { value: 'completed', label: 'منتهية' },
  { value: 'cancelled', label: 'ملغاة' },
] as const

export const MATERIAL_KIND_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'video', label: 'فيديو' },
  { value: 'link', label: 'رابط' },
  { value: 'slides', label: 'شرائح' },
  { value: 'document', label: 'مستند' },
  { value: 'other', label: 'أخرى' },
] as const

export const VISIBILITY_OPTIONS = [
  { value: 'enrolled', label: 'المسجّلون فقط' },
  { value: 'public', label: 'عام' },
] as const

export const SUBMISSION_TYPE_OPTIONS = [
  { value: 'text', label: 'نص فقط' },
  { value: 'file', label: 'ملف فقط' },
  { value: 'both', label: 'نص + ملف' },
] as const

export const YES_NO_OPTIONS = [
  { value: '1', label: 'نعم' },
  { value: '0', label: 'لا' },
] as const
