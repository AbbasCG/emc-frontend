import { ClipboardCheck, RefreshCw } from 'lucide-react'

type Props = {
  filtered: boolean
  onRefresh: () => void
  refreshing: boolean
}

export function PlacementTestsEmptyState({ filtered, onRefresh, refreshing }: Props) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#0C2A4B]/15 bg-gradient-to-b from-[#F8FAFC] to-white px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0077B6]/10">
        <ClipboardCheck className="h-8 w-8 text-[#0077B6]/60" />
      </div>
      <p className="mt-5 text-[17px] font-black text-deepBlue">
        {filtered ? 'لا توجد نتائج تطابق الفلتر' : 'لا توجد اختبارات بعد'}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[12px] font-semibold leading-relaxed text-deepBlue/45">
        {filtered
          ? 'جرّب تعديل معايير البحث أو مسح الفلاتر لعرض جميع الطلاب.'
          : 'ستظهر هنا نتائج اختبارات تحديد المستوى بعد أن يكمل الطلاب الاختبار في دوراتك.'}
      </p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0C2A4B] px-5 py-2.5 text-[12px] font-black text-white transition hover:brightness-110 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        تحديث
      </button>
    </div>
  )
}
