// ── Canonical placement-interview status color language ─────────────────────
// One color identity per status, reused everywhere a booking/slot status is
// shown: instructor availability, booking detail modal, student booking page,
// interview history, dashboards, notifications. Do not fork these per screen —
// import from here so every surface agrees on what "orange" means.

export type PlacementStatusKey =
  | 'available'
  | 'booked'
  | 'confirmed'
  | 'reschedule_requested'
  | 'completed'
  | 'cancelled'
  | 'expired'

export type PlacementStatusMeta = {
  label: string
  /** Card/badge background */
  bg: string
  /** Card border */
  border: string
  /** Text/icon color */
  text: string
  /** Badge background (slightly stronger than card bg) */
  badgeBg: string
  /** Hover glow shadow class (Framer Motion whileHover target) */
  hoverGlow: string
}

export const PLACEMENT_STATUS_META: Record<PlacementStatusKey, PlacementStatusMeta> = {
  available: {
    label: 'متاح',
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badgeBg: 'bg-emerald-100',
    hoverGlow: 'shadow-[0_8px_24px_-8px_rgba(16,185,129,0.35)]',
  },
  booked: {
    label: 'محجوز',
    bg: 'bg-orange-50/80',
    border: 'border-customOrange/40',
    text: 'text-customOrange',
    badgeBg: 'bg-customOrange/15',
    hoverGlow: 'shadow-[0_8px_24px_-8px_rgba(242,140,0,0.45)]',
  },
  confirmed: {
    label: 'مؤكد',
    bg: 'bg-orange-50/80',
    border: 'border-customOrange/40',
    text: 'text-customOrange',
    badgeBg: 'bg-customOrange/15',
    hoverGlow: 'shadow-[0_8px_24px_-8px_rgba(242,140,0,0.45)]',
  },
  reschedule_requested: {
    label: 'طلب تعديل موعد',
    bg: 'bg-orange-50/80',
    border: 'border-customOrange/40',
    text: 'text-customOrange',
    badgeBg: 'bg-customOrange/15',
    hoverGlow: 'shadow-[0_8px_24px_-8px_rgba(242,140,0,0.45)]',
  },
  completed: {
    label: 'مكتمل',
    bg: 'bg-sky-50/80',
    border: 'border-sky-300',
    text: 'text-sky-700',
    badgeBg: 'bg-sky-100',
    hoverGlow: 'shadow-[0_8px_24px_-8px_rgba(2,132,199,0.35)]',
  },
  cancelled: {
    label: 'ملغي',
    bg: 'bg-rose-50/70',
    border: 'border-rose-200',
    text: 'text-rose-600',
    badgeBg: 'bg-rose-100',
    hoverGlow: 'shadow-[0_8px_24px_-8px_rgba(244,63,94,0.3)]',
  },
  expired: {
    label: 'منتهي',
    bg: 'bg-slate-100/80',
    border: 'border-slate-300',
    text: 'text-slate-500',
    badgeBg: 'bg-slate-200',
    hoverGlow: 'shadow-none',
  },
}

/**
 * Maps a raw backend status/booking_status string onto one of the 7 canonical
 * color buckets. `endsAtIso`/`now` let a still-"booked" slot whose time has
 * already passed render as "expired" instead of misleadingly "booked".
 */
export function resolvePlacementStatusKey(
  rawStatus: string | null | undefined,
  endsAtIso?: string | null,
): PlacementStatusKey {
  const s = (rawStatus ?? '').toLowerCase()

  if (s === 'completed') return 'completed'
  if (s === 'no_show') return 'expired'
  if (s.startsWith('cancelled')) return 'cancelled'
  if (s === 'confirmed') return 'confirmed'
  if (s === 'reschedule_requested') return 'reschedule_requested'
  if (s === 'rescheduled' || s === 'booked') {
    if (endsAtIso) {
      const end = new Date(endsAtIso).getTime()
      if (!Number.isNaN(end) && end < Date.now()) return 'expired'
    }
    return 'booked'
  }
  if (s === 'available' || s === '') return 'available'

  return 'available'
}
