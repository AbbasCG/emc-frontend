import { ShieldAlert } from 'lucide-react'

export default function SecretWarningPanel({
  title = 'تحذير أمني',
  body,
}: {
  title?: string
  body: string
}) {
  return (
    <div
      dir="rtl"
      className="flex gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-inner shadow-amber-100"
      role="status"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-100">
        <ShieldAlert size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-amber-950">{title}</p>
        <p className="mt-1 text-sm font-medium leading-7 text-amber-900/80">{body}</p>
      </div>
    </div>
  )
}
