import { formatEuro, formatEuroInteger } from '@/utils/currency'

export function formatTxAmount(amount: number, currency = 'EUR'): string {
  if (currency.toUpperCase() === 'EUR') return formatEuro(amount, { locale: 'ar', maximumFractionDigits: 2 })
  try {
    return new Intl.NumberFormat('ar', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

export function formatTxAmountCompact(amount: number): string {
  return formatEuroInteger(amount, 'ar')
}

export function formatTxDate(iso: string): { date: string; time: string } {
  if (!iso?.trim()) return { date: '—', time: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: iso, time: '' }
  return {
    date: new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', numberingSystem: 'latn' }).format(d),
    time: new Intl.DateTimeFormat('ar-SA', { timeStyle: 'short', numberingSystem: 'latn' }).format(d),
  }
}

export function txInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?'
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function shortTxId(id: number): string {
  return `#${String(id).padStart(5, '0')}`
}
