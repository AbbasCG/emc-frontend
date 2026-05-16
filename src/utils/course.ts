import type { Course } from '../types'
import { formatEuro } from './currency'

export const courseImages = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1532614479-0bd43847d059?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
]

export { fadeUp } from './motion'

export function extractList<T>(payload: T[] | { data?: T[] }) {
  if (Array.isArray(payload)) return payload
  return Array.isArray(payload.data) ? payload.data : []
}

export function extractItem<T>(payload: T | { data?: T }) {
  return 'data' in Object(payload) ? (payload as { data?: T }).data : (payload as T)
}

export function formatPrice(price: Course['price']) {
  if (price === null || price === undefined || price === '') return 'مدفوعة'
  const numericPrice = Number(price)
  if (Number.isNaN(numericPrice)) return `${price}`

  return formatEuro(numericPrice, {
    locale: 'ar',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function formatSchedule(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) return 'المدة تحدد قريباً'

  const formatter = new Intl.DateTimeFormat('ar', {
    day: 'numeric',
    month: 'short',
  })

  const start = startDate ? formatter.format(new Date(startDate)) : ''
  const end = endDate ? formatter.format(new Date(endDate)) : ''

  return [start, end].filter(Boolean).join(' - ')
}

export function formatSingleDate(date?: string | null) {
  if (!date) return 'يحدد قريباً'

  return new Intl.DateTimeFormat('ar', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDuration(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return '4 أسابيع'

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffInDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
  const weeks = Math.max(1, Math.ceil(diffInDays / 7))

  return `${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}`
}
