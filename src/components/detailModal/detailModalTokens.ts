/** Visual tokens of the volunteer detail windows (HR volunteer profile and volunteer application). One source. */

export const BORDER = 'border-detail-line'
export const CARD = `rounded-[18px] border ${BORDER} bg-white shadow-[0_1px_2px_rgba(12,42,75,0.04)]`


export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1)
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`
}


/** A footer action rendered as a link (WhatsApp, e-mail…) in the same style as a neutral footer button. */
export const FOOTER_LINK_CLASS = `inline-flex items-center gap-1.5 rounded-xl border ${BORDER} bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/30`
