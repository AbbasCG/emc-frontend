import { isAxiosError } from 'axios'
import { AWARD_CATEGORIES, type PointAward, type PointEntryKind } from '@/api/volunteerPointsApi'

/** The server's own Arabic reason (self-adjustment, cap, balance…) or a safe fallback. */
export function serverMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const msg = (err.response?.data as { message?: unknown } | undefined)?.message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return fallback
}

export const formatNumber = (n: number): string => n.toLocaleString('en-US')

export function signed(n: number): string {
  return n > 0 ? `+${formatNumber(n)}` : formatNumber(n)
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join('')
  return Array.from(parts[0])[0] + Array.from(parts[1])[0]
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
}

export const ADJUSTMENT_CATEGORY = 'adjustment'

export function categoryLabel(value: string): string {
  if (value === ADJUSTMENT_CATEGORY) return 'تصحيح يدوي'
  return AWARD_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

/** Prefer the server's `kind`; derive it for rows from older responses. */
export function entryKind(entry: Pick<PointAward, 'kind' | 'category' | 'points'>): PointEntryKind {
  if (entry.kind) return entry.kind
  if (entry.category === ADJUSTMENT_CATEGORY) return 'adjustment'
  return entry.points < 0 ? 'deduction' : 'award'
}

export const KIND_META: Record<PointEntryKind, { label: string; badge: string }> = {
  award: { label: 'منحة', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  deduction: { label: 'خصم', badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
  adjustment: { label: 'تصحيح', badge: 'bg-accent-50 text-accent-800 ring-accent-200' },
}

export const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-navy outline-none transition-colors placeholder:font-medium placeholder:text-muted-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15'
