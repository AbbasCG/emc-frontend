import { AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react'

export function TransactionsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[20px] border border-rose-100 bg-rose-50/80 p-10 text-center" dir="rtl">
      <AlertCircle className="mx-auto h-10 w-10 text-rose-500" aria-hidden />
      <h2 className="mt-4 text-lg font-black text-[#0F172A]">تعذر تحميل المعاملات المالية</h2>
      <p className="mx-auto mt-2 max-w-lg text-[13px] font-semibold text-[#64748B]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#0C2A4B] px-6 py-2.5 text-[12px] font-black text-white"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        إعادة المحاولة
      </button>
    </div>
  )
}

export function TransactionsForbiddenState() {
  return (
    <div className="rounded-[20px] border border-amber-100 bg-amber-50/90 p-10 text-center" dir="rtl">
      <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" aria-hidden />
      <h2 className="mt-4 text-lg font-black text-[#0F172A]">ليس لديك صلاحية لعرض المعاملات المالية</h2>
      <p className="mx-auto mt-2 max-w-lg text-[13px] font-semibold text-[#64748B]">
        تواصل مع مسؤول النظام إذا كنت بحاجة إلى صلاحيات مدير المالية.
      </p>
    </div>
  )
}
