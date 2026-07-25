import { formatAmsterdamDMY, formatAmsterdamTime24 } from '@/utils/amsterdamTime'

/* ── shared maps ────────────────────────────────────────────────────────── */

export const CEFR_MAP: Record<string, { cefr: string; arabic: string; bg: string; text: string }> = {
  // Internal level keys (from placement scoring / select options)
  beginner:           { cefr: 'Starter', arabic: 'مبتدئ',         bg: 'bg-slate-100',   text: 'text-slate-600'   },
  elementary:         { cefr: 'A1',      arabic: 'ابتدائي',        bg: 'bg-blue-100',    text: 'text-blue-700'    },
  pre_intermediate:   { cefr: 'A2',      arabic: 'ما قبل المتوسط', bg: 'bg-sky-100',     text: 'text-sky-700'     },
  intermediate:       { cefr: 'B1',      arabic: 'متوسط',          bg: 'bg-emerald-100', text: 'text-emerald-700' },
  upper_intermediate: { cefr: 'B2',      arabic: 'فوق المتوسط',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  advanced:           { cefr: 'C1',      arabic: 'متقدم',          bg: 'bg-violet-100',  text: 'text-violet-700'  },
  // CEFR codes returned by backend after oral assessment (final_level field)
  Starter:            { cefr: 'Starter', arabic: 'مبتدئ',         bg: 'bg-slate-100',   text: 'text-slate-600'   },
  A1:                 { cefr: 'A1',      arabic: 'ابتدائي',        bg: 'bg-blue-100',    text: 'text-blue-700'    },
  A2:                 { cefr: 'A2',      arabic: 'ما قبل المتوسط', bg: 'bg-sky-100',     text: 'text-sky-700'     },
  B1:                 { cefr: 'B1',      arabic: 'متوسط',          bg: 'bg-emerald-100', text: 'text-emerald-700' },
  B2:                 { cefr: 'B2',      arabic: 'فوق المتوسط',    bg: 'bg-amber-100',   text: 'text-amber-700'   },
  C1:                 { cefr: 'C1',      arabic: 'متقدم',          bg: 'bg-violet-100',  text: 'text-violet-700'  },
}

/**
 * ISO datetime → "21/07/2026", rendered in Europe/Amsterdam local time.
 *
 * Previously sliced the raw ISO string (`iso.slice(0, 10)`), which read the
 * UTC calendar day instead of the Amsterdam one — the direct cause of
 * instructor-vs-student date/time mismatches on placement-interview bookings.
 * Always go through the shared Amsterdam formatter instead.
 */
export function toDMY(iso: string | null | undefined): string {
  return formatAmsterdamDMY(iso)
}

/**
 * ISO datetime → "14:30", rendered in Europe/Amsterdam local time.
 *
 * Previously sliced the raw ISO string (`iso.slice(11, 16)`), which read the
 * UTC clock digits verbatim with zero timezone conversion — the root cause of
 * the instructor seeing oral-interview bookings 1-2 hours earlier than the
 * student (Amsterdam is UTC+1/+2 depending on daylight saving).
 */
export function toHM(iso: string | null | undefined): string {
  return formatAmsterdamTime24(iso)
}
