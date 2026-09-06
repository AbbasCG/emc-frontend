import { Shield } from 'lucide-react'
import { motion } from 'framer-motion'

export function AuditLogsSkeleton() {
  return (
    <div className="space-y-3">
      {[44, 56, 36, 60, 44].map((h, i) => (
        <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100" style={{ height: `${h * 2}px` }}>
          <div className="relative h-full overflow-hidden rounded-xl bg-slate-100">
            <div className="absolute inset-0 animate-shimmer bg-emc-shimmer bg-[length:200%_100%]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AuditLogsEmptyState({ hasActiveFilters, onReset }: { hasActiveFilters: boolean; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-20 text-center ring-1 ring-slate-100">
      <motion.div initial={{ scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <Shield size={30} className="text-slate-300" />
      </motion.div>
      <p className="font-black text-slate-400">لا توجد سجلات تطابق البحث الحالي</p>
      <p className="mt-1 text-sm text-slate-400">خفِّف المرشّحات أو اضغط تحديث لتحميل أحدث البيانات</p>
      {hasActiveFilters && (
        <button type="button" onClick={onReset} className="mt-4 rounded-xl bg-brand-50 px-5 py-2 text-sm font-bold text-brand-600 transition hover:bg-brand-100">
          إعادة تعيين الفلاتر
        </button>
      )}
    </div>
  )
}

export function AuditLogsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
      <p className="flex-1 text-sm font-bold text-red-600">{message}</p>
      <button type="button" onClick={onRetry} className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-50">
        إعادة المحاولة
      </button>
    </div>
  )
}
