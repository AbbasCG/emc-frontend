import { CreditCard } from 'lucide-react'

export type PaymentProviderOpt = 'stripe' | 'paypal' | 'fake'

type Props = {
  value: PaymentProviderOpt
  onChange: (v: PaymentProviderOpt) => void
  disabled?: boolean
  /** Hide fake outside dev */
  showFake?: boolean
}

const items: { id: PaymentProviderOpt; label: string; hint: string }[] = [
  { id: 'stripe', label: 'Stripe', hint: 'بطاقات ائتمان (بيئة إنتاج لاحقاً)' },
  { id: 'paypal', label: 'PayPal', hint: 'محفظة PayPal' },
  { id: 'fake', label: 'دفع تجريبي محلي', hint: 'للتطوير فقط على الجهاز المحلي' },
]

export default function PaymentProviderSelector({
  value,
  onChange,
  disabled,
  showFake = import.meta.env.DEV,
}: Props) {
  const visible = showFake ? items : items.filter((i) => i.id !== 'fake')

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {visible.map((p) => {
        const active = value === p.id
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.id)}
            className={[
              'flex flex-col items-start gap-1 rounded-2xl border px-4 py-4 text-right transition',
              active
                ? 'border-customOrange bg-orange-50 ring-2 ring-customOrange/25'
                : 'border-slate-200 bg-slate-50 hover:border-customBlue/40 hover:bg-white',
              disabled ? 'cursor-not-allowed opacity-60' : '',
            ].join(' ')}
          >
            <span className="flex items-center gap-2 font-black text-deepBlue">
              <CreditCard size={18} className={active ? 'text-customOrange' : 'text-customBlue'} />
              {p.label}
            </span>
            <span className="text-xs font-semibold leading-relaxed text-deepBlue/55">{p.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
