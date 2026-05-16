import type { PaymentProvider } from '@/types/intelligence'

import { formatEuroInteger } from '@/utils/currency'

export function formatFinanceCurrency(n: number) {
  return formatEuroInteger(n, 'ar')
}

export function formatFinanceDateTime(iso: string) {
  if (!iso?.trim()) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

const PROVIDER_AR: Record<string, string> = {
  stripe: 'سترايب',
  paypal: 'باي بال',
  fake: 'تجريبي',
}

export function providerLabelAr(p: PaymentProvider | string) {
  const k = String(p).toLowerCase()
  return PROVIDER_AR[k] ?? p
}

export function ProviderBadge({ provider }: { provider: PaymentProvider | string }) {
  const ar = providerLabelAr(provider)
  return (
    <span className="inline-flex items-center rounded-full border border-deepBlue/[0.08] bg-slate-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-deepBlue font-latin ring-1 ring-slate-100">
      {ar}
    </span>
  )
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
