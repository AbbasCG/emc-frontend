export function LoadingPanel({ label = 'جارٍ تحميل البيانات…' }: { label?: string }) {
  return (
    <div
      dir="rtl"
      className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-white/75 px-6 text-right"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-400 border-t-transparent" aria-hidden />
      <p className="text-right text-[13px] font-bold text-muted-600 rtl:text-right">{label}</p>
    </div>
  )
}

export function ErrorPanel({
  title = 'حدث خطأ',
  hint,
}: {
  title?: string
  hint?: string
}) {
  return (
    <div
      dir="rtl"
      className="rounded-3xl border border-red-200/80 bg-gradient-to-bl from-red-50 to-white px-5 py-6 text-right rtl:text-right"
    >
      <p className="text-[14px] font-black text-red-900">{title}</p>
      {hint ? <p className="mt-2 text-[12px] font-semibold leading-relaxed text-red-900/85">{hint}</p> : null}
    </div>
  )
}

export function EmptyPanel({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div
      dir="rtl"
      className="rounded-3xl border border-dashed border-brand-300/55 bg-brand-50/40 px-5 py-10 text-right shadow-inner rtl:text-right"
    >
      <p className="text-[14px] font-black text-deepBlue">{title}</p>
      {subtitle ?
        <p className="mt-2 max-w-md text-[12px] font-semibold leading-relaxed text-muted-600 rtl:text-right">{subtitle}</p>
      : null}
    </div>
  )
}
