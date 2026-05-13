/** Full-page fallback while lazy route layouts chunk loads */
export default function RouteFallback() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F6F8FB]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="جارٍ تحميل الصفحة"
      dir="rtl"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-customBlue border-t-transparent" />
      <p className="text-sm font-bold text-slate-500">جارٍ تحميل لوحة التحكم…</p>
    </div>
  )
}
