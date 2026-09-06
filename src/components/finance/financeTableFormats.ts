import type { PaymentProvider } from '@/types/intelligence'

import { formatFinanceCurrency, formatFinanceDate, formatFinanceDateTime } from '@/utils/financeFormatters'

export { formatFinanceCurrency, formatFinanceDate, formatFinanceDateTime }

const PROVIDER_AR: Record<string, string> = {
  stripe: 'سترايب',
  paypal: 'باي بال',
  fake: 'تجريبي',
}

export function providerLabelAr(p: PaymentProvider | string) {
  const k = String(p).toLowerCase()
  return PROVIDER_AR[k] ?? p
}

/** UTF-8 BOM helps Excel open Arabic CSV correctly */
export function downloadCsv(filename: string, headers: string[], dataRows: (string | number)[][]) {
  const esc = (cell: string | number) => {
    const s = String(cell ?? '').replace(/"/g, '""')
    return `"${s}"`
  }
  const lines = [
    headers.map(esc).join(','),
    ...dataRows.map((r) => r.map(esc).join(',')),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export const financeMotionContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
}

export const financeFadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 0.61, 0.36, 1] as const },
  },
}
