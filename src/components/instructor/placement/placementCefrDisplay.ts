import { CEFR_MAP } from '@/components/instructor/placement/constants'

/** Resolve CEFR display from internal key or CEFR code */
export function displayCefr(level: string | null | undefined) {
  if (!level) return null
  return CEFR_MAP[level] ?? Object.values(CEFR_MAP).find((v) => v.cefr === level) ?? null
}
