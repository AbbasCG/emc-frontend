import type { PaymentProvider } from '@/types/intelligence'

import { providerLabelAr } from '@/components/finance/financeTableFormats'

export function ProviderBadge({ provider }: { provider: PaymentProvider | string }) {
  const ar = providerLabelAr(provider)
  return (
    <span className="inline-flex items-center rounded-full border border-deepBlue/[0.08] bg-slate-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-deepBlue font-latin ring-1 ring-slate-100">
      {ar}
    </span>
  )
}
