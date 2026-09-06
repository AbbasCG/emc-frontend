import { AlertTriangle, RefreshCw } from 'lucide-react'

type Props = {
  title?: string
  description?: string
  onRetry?: () => void
  compact?: boolean
}

export default function DashboardErrorWidget({
  title = 'تعذّر تحميل هذا القسم',
  description,
  onRetry,
  compact = false,
}: Props) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/80 ring-1 ring-amber-100 ${
        compact ? 'px-4 py-3' : 'px-5 py-4'
      }`}
    >
      <AlertTriangle size={18} className="shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0 flex-1 text-right">
        <p className={`font-black text-amber-900 ${compact ? 'text-xs' : 'text-sm'}`}>{title}</p>
        {description && (
          <p className="mt-0.5 text-xs font-medium text-amber-700">{description}</p>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-black text-amber-800 transition hover:bg-amber-50"
        >
          <RefreshCw size={13} aria-hidden />
          إعادة المحاولة
        </button>
      )}
    </div>
  )
}
