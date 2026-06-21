import { AlertCircle } from 'lucide-react'
import { getApiErrorMessage } from '@/api/apiErrors'
import { cn } from '@/lib/utils'

type Props = {
  error: unknown
  title?: string
  className?: string
}

/** Inline API failure banner with Arabic normalization. */
export default function ApiErrorAlert({
  error,
  title = 'تعذّر إكمال الطلب',
  className,
}: Props) {
  const message = getApiErrorMessage(error)
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-800 ring-1 ring-red-100',
        className,
      )}
    >
      <AlertCircle size={22} className="mt-0.5 shrink-0 text-red-500" aria-hidden />
      <div className="min-w-0 text-right">
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-sm font-medium leading-7">{message}</p>
      </div>
    </div>
  )
}
