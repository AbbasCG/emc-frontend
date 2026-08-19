import type { ReactNode } from 'react'

type Props = {
  visible: boolean
  onAction: () => void
  actionLabel: string
  disabled?: boolean
  priceHint?: string
  extra?: ReactNode
}

/** Sticky bottom CTA for mobile detail pages — hidden on lg+ */
export default function PublicMobileEnrollBar({
  visible,
  onAction,
  actionLabel,
  disabled,
  priceHint,
  extra,
}: Props) {
  if (!visible) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden"
      dir="rtl"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        {priceHint ?
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[10px] font-bold text-slate-400">الرسوم</p>
            <p className="truncate text-sm font-black text-deepBlue">{priceHint}</p>
          </div>
        : null}
        {extra ?? (
          <button
            type="button"
            disabled={disabled}
            onClick={onAction}
            className="inline-flex h-12 min-w-[9rem] flex-1 items-center justify-center rounded-xl bg-customOrange px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
