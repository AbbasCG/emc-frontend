export const FINANCE_CHART = {
  brand: '#2691C2',
  navy: '#22334A',
  accent: '#EC943C',
  income: '#10B981',
  expense: '#F43F5E',
  pending: '#F59E0B',
  grid: 'rgba(34,51,74,0.06)',
  tooltip: {
    borderRadius: 14,
    border: '1px solid rgba(34,51,74,0.08)',
    boxShadow: '0 22px 50px -24px rgba(15,42,67,0.22)',
    fontFamily: '"Tajawal",sans-serif',
  },
  labelStyle: { color: '#22334A', fontWeight: 900, fontSize: 12 },
  itemStyle: { color: '#22334A', fontWeight: 700, fontSize: 12 },
} as const

export const PROVIDER_COLORS: Record<string, string> = {
  stripe: '#635BFF',
  paypal: '#0070BA',
  fake: '#94A3B8',
  manual: '#2691C2',
  bank_transfer: '#22334A',
  cash: '#10B981',
  wise: '#9FE870',
  ing: '#FF6200',
  rabobank: '#0033A0',
  other: '#6B7F98',
}

export const PROVIDER_LABEL_AR: Record<string, string> = {
  stripe: 'سترايب',
  paypal: 'باي بال',
  fake: 'تجريبي',
  manual: 'يدوي',
  bank_transfer: 'تحويل بنكي',
  cash: 'نقدي',
  wise: 'Wise',
  ing: 'ING',
  rabobank: 'Rabobank',
  other: 'أخرى',
}

export function providerLabelAr(p: string): string {
  return PROVIDER_LABEL_AR[p.toLowerCase()] ?? p
}
