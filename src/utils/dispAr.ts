/** Arabic neutral placeholder for unspecified profile / admin fields. */
export const AR_UNSPECIFIED = 'غير محدد'

/** Display string for RTL admin/profile — never exposes ugly blanks. */
export function dispAr(v: unknown): string {
  if (v == null) return AR_UNSPECIFIED
  const s = String(v).trim()
  if (s === '' || s === '—' || s === 'null') return AR_UNSPECIFIED
  return s
}
