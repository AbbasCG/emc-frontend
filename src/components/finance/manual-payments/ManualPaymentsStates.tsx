export function ManualPaymentsSkeleton() {
  return (
    <div className="animate-pulse space-y-6" dir="rtl">
      <div className="h-28 rounded-[20px] bg-slate-200/80" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-[18px] bg-slate-200/70" />
        ))}
      </div>
      <div className="h-24 rounded-[18px] bg-slate-100" />
      <div className="space-y-2 rounded-[20px] border border-[#E2E8F0] bg-white p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

export function ManualPaymentsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[20px] border border-rose-200 bg-rose-50/60 px-6 py-10 text-center" dir="rtl">
      <p className="text-[15px] font-black text-rose-800">{message}</p>
      <p className="mt-2 text-[13px] font-semibold text-rose-700/80">تحقق من الاتصال بالخادم وأعد المحاولة.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-2xl bg-[#22334A] px-5 py-2.5 text-[12px] font-black text-white"
      >
        إعادة المحاولة
      </button>
    </div>
  )
}

export function ManualPaymentsForbiddenState() {
  return (
    <div className="rounded-[20px] border border-[#E2E8F0] bg-white px-6 py-12 text-center shadow-sm" dir="rtl">
      <p className="text-[15px] font-black text-[#0F172A]">ليس لديك صلاحية للوصول إلى المدفوعات اليدوية</p>
      <p className="mt-2 text-[13px] font-semibold text-[#64748B]">تواصل مع مسؤول النظام إذا كنت بحاجة إلى هذه الصلاحية.</p>
    </div>
  )
}
