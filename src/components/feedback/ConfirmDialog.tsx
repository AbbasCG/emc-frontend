import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import EmcButton from '@/components/ui/EmcButton'

type Props = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

/** Accessible confirmation using the native `<dialog>` element. */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      if (!el.open) el.showModal()
    } else if (el.open) {
      el.close()
    }
  }, [open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <dialog
      ref={ref}
      dir="rtl"
      className="emc-dialog w-[min(440px,calc(100%-32px))] rounded-2xl border border-deepBlue/10 bg-white p-0 text-right shadow-emc-lg"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? 'confirm-dialog-desc' : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
        ref.current?.close()
      }}
    >
      <div className="p-6">
        <h2 id="confirm-dialog-title" className="text-lg font-black tracking-tight text-deepBlue font-display">
          {title}
        </h2>
        {description && (
          <p id="confirm-dialog-desc" className="mt-3 text-sm font-medium leading-7 text-deepBlue/60">
            {description}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <EmcButton
            type="button"
            variant="secondary"
            onClick={() => {
              onCancel()
              ref.current?.close()
            }}
          >
            {cancelLabel}
          </EmcButton>
          <EmcButton
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              ref.current?.close()
            }}
          >
            {confirmLabel}
          </EmcButton>
        </div>
      </div>
    </dialog>,
    document.body,
  )
}
