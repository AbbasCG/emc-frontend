import axios from 'axios'

/**
 * Display helpers for the meeting-reports page. Pure functions so they can be
 * unit-tested and so no component has to guard a date or an error shape itself.
 */

const dayFormat = new Intl.DateTimeFormat('ar', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  calendar: 'gregory',
  numberingSystem: 'latn',
})

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Amsterdam',
})

const dayInAmsterdam = new Intl.DateTimeFormat('ar', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  calendar: 'gregory',
  numberingSystem: 'latn',
  timeZone: 'Europe/Amsterdam',
})

function parse(value: string | null | undefined): Date | null {
  if (!value) return null
  // A bare YYYY-MM-DD must not shift a day through the viewer's time zone.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "12 أكتوبر 2026", or an em dash when there is no usable date. */
export function formatDay(value: string | null | undefined): string {
  const d = parse(value)
  return d ? dayFormat.format(d) : '—'
}

/**
 * "12 أكتوبر 2026، 11:30" - the platform format: Arabic month, Latin digits, 24-hour
 * time, a comma between date and time, shown in Europe/Amsterdam (the zone every EMC
 * timestamp is displayed in).
 */
export function formatDateTime(value: string | null | undefined): string {
  const d = parse(value)
  return d ? `${dayInAmsterdam.format(d)}، ${timeFormat.format(d)}` : '—'
}

export type ScoreTone = 'high' | 'mid' | 'low'

export function scoreTone(avg: number): ScoreTone {
  return avg >= 9 ? 'high' : avg >= 7 ? 'mid' : 'low'
}

export type ReportsErrorKind = 'unauthenticated' | 'forbidden' | 'not_found' | 'validation' | 'server' | 'network'

export interface ReportsError {
  kind: ReportsErrorKind
  title: string
  message: string
  /** Retrying can help (network, server) or cannot (permission). */
  retryable: boolean
}

/** Maps any thrown value to Arabic copy by HTTP status, so every failure has a clear state. */
export function describeReportsError(error: unknown): ReportsError {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined

  if (axios.isAxiosError(error) && !error.response) {
    return {
      kind: 'network',
      title: 'تعذّر الاتصال بالخادم',
      message: 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة.',
      retryable: true,
    }
  }
  switch (status) {
    case 401:
      return { kind: 'unauthenticated', title: 'انتهت جلسة الدخول', message: 'سجّل الدخول مرة أخرى للمتابعة.', retryable: false }
    case 403:
      return {
        kind: 'forbidden',
        title: 'لا تملك صلاحية عرض هذه التقارير',
        message: 'تظهر لك تقارير الإدارات المرتبطة بحسابك فقط. تواصل مع مسؤول النظام إذا كنت تحتاج وصولًا إضافيًا.',
        retryable: false,
      }
    case 404:
      return { kind: 'not_found', title: 'التقرير غير موجود', message: 'ربما حُذف أو لم يعد متاحًا لك.', retryable: false }
    case 422:
      return { kind: 'validation', title: 'بيانات غير صالحة', message: 'راجع خيارات التصفية وأعد المحاولة.', retryable: true }
    default:
      return {
        kind: 'server',
        title: 'حدث خطأ أثناء تحميل التقارير',
        message: 'المشكلة من جهتنا وليست من جهتك. أعد المحاولة بعد قليل.',
        retryable: true,
      }
  }
}

export interface MeetingReportFilters {
  q: string
  department_id: number | ''
  date_from: string
  date_to: string
}

export const EMPTY_FILTERS: MeetingReportFilters = { q: '', department_id: '', date_from: '', date_to: '' }

export function activeFilterCount(f: MeetingReportFilters): number {
  return [f.q.trim() !== '', f.department_id !== '', f.date_from !== '', f.date_to !== ''].filter(Boolean).length
}

