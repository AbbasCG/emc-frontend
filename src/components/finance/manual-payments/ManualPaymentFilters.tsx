import { useState } from 'react'
import { Download, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import type { FinanceAccount } from '@/types/intelligence'
import type { ManualPaymentFilterState } from './filterRows'
import {
  ENTITY_FILTER_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from './constants'

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2691C2]/10 px-3 py-1 text-[11px] font-black text-[#1e6f96] ring-1 ring-[#2691C2]/15">
      {label}
      <button type="button" onClick={onRemove} aria-label={`إزالة ${label}`} className="rounded-full p-0.5 hover:bg-[#2691C2]/15">
        <X className="h-3 w-3" aria-hidden />
      </button>
    </span>
  )
}

export default function ManualPaymentFilters({
  filters,
  accounts,
  onPatch,
  onReset,
  onExport,
  resultCount,
  hasActiveFilters,
  exportDisabled,
}: {
  filters: ManualPaymentFilterState
  accounts: FinanceAccount[]
  onPatch: (patch: Partial<ManualPaymentFilterState>) => void
  onReset: () => void
  onExport: () => void
  resultCount: number
  hasActiveFilters: boolean
  exportDisabled: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const chips: { label: string; clear: () => void }[] = []
  if (filters.status !== 'all') {
    const o = STATUS_FILTER_OPTIONS.find((x) => x.value === filters.status)
    chips.push({ label: `الحالة: ${o?.label ?? filters.status}`, clear: () => onPatch({ status: 'all' }) })
  }
  if (filters.paymentMethod !== 'all') {
    const o = PAYMENT_METHOD_OPTIONS.find((x) => x.value === filters.paymentMethod)
    chips.push({ label: `الطريقة: ${o?.label ?? filters.paymentMethod}`, clear: () => onPatch({ paymentMethod: 'all' }) })
  }
  if (filters.entityType !== 'all') {
    const o = ENTITY_FILTER_OPTIONS.find((x) => x.value === filters.entityType)
    chips.push({ label: `العنصر: ${o?.label ?? filters.entityType}`, clear: () => onPatch({ entityType: 'all' }) })
  }
  if (filters.accountId !== 'all') {
    const acc = accounts.find((a) => String(a.id) === filters.accountId)
    chips.push({ label: `الحساب: ${acc?.name ?? filters.accountId}`, clear: () => onPatch({ accountId: 'all' }) })
  }
  if (filters.search.trim()) chips.push({ label: `بحث: ${filters.search.trim()}`, clear: () => onPatch({ search: '' }) })
  if (filters.minAmount.trim()) chips.push({ label: `من ${filters.minAmount}`, clear: () => onPatch({ minAmount: '' }) })
  if (filters.maxAmount.trim()) chips.push({ label: `إلى ${filters.maxAmount}`, clear: () => onPatch({ maxAmount: '' }) })

  const fields = (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="relative xl:col-span-2">
        <span className="mb-1.5 block text-right text-[11px] font-black text-[#22334A]">بحث</span>
        <Search className="pointer-events-none absolute end-3 top-[2.35rem] h-4 w-4 text-[#94A3B8]" aria-hidden />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onPatch({ search: e.target.value })}
          placeholder="ابحث باسم المستخدم، البريد الإلكتروني أو رقم المرجع"
          className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F6F8FB] py-2.5 pe-10 ps-3 text-[13px] font-semibold text-[#0F172A] outline-none focus:border-[#2691C2]/50 focus:ring-2 focus:ring-[#2691C2]/15"
        />
      </label>

      <label className="text-right">
        <span className="mb-1.5 block text-[11px] font-black text-[#22334A]">الحالة</span>
        <select
          value={filters.status}
          onChange={(e) => onPatch({ status: e.target.value })}
          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0F172A] focus:border-[#2691C2]/50 focus:outline-none focus:ring-2 focus:ring-[#2691C2]/15"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="text-right">
        <span className="mb-1.5 block text-[11px] font-black text-[#22334A]">طريقة الدفع</span>
        <select
          value={filters.paymentMethod}
          onChange={(e) => onPatch({ paymentMethod: e.target.value })}
          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0F172A] focus:border-[#2691C2]/50 focus:outline-none focus:ring-2 focus:ring-[#2691C2]/15"
        >
          {PAYMENT_METHOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="text-right">
        <span className="mb-1.5 block text-[11px] font-black text-[#22334A]">العنصر المرتبط</span>
        <select
          value={filters.entityType}
          onChange={(e) => onPatch({ entityType: e.target.value })}
          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0F172A] focus:border-[#2691C2]/50 focus:outline-none focus:ring-2 focus:ring-[#2691C2]/15"
        >
          {ENTITY_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="text-right">
        <span className="mb-1.5 block text-[11px] font-black text-[#22334A]">حساب المالية</span>
        <select
          value={filters.accountId}
          onChange={(e) => onPatch({ accountId: e.target.value })}
          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0F172A] focus:border-[#2691C2]/50 focus:outline-none focus:ring-2 focus:ring-[#2691C2]/15"
        >
          <option value="all">الكل</option>
          {accounts.map((a) => (
            <option key={a.id} value={String(a.id)}>{a.name}</option>
          ))}
        </select>
      </label>

      <div className="md:col-span-2 xl:col-span-2">
        <EmcDatePicker label="من تاريخ" value={filters.from} onChange={(v) => onPatch({ from: v })} />
      </div>
      <div className="md:col-span-2 xl:col-span-2">
        <EmcDatePicker label="إلى تاريخ" value={filters.to} onChange={(v) => onPatch({ to: v })} />
      </div>

      <label className="text-right">
        <span className="mb-1.5 block text-[11px] font-black text-[#22334A]">الحد الأدنى (EUR)</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={filters.minAmount}
          onChange={(e) => onPatch({ minAmount: e.target.value })}
          placeholder="0"
          dir="ltr"
          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0F172A] focus:border-[#2691C2]/50 focus:outline-none focus:ring-2 focus:ring-[#2691C2]/15"
        />
      </label>
      <label className="text-right">
        <span className="mb-1.5 block text-[11px] font-black text-[#22334A]">الحد الأقصى (EUR)</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={filters.maxAmount}
          onChange={(e) => onPatch({ maxAmount: e.target.value })}
          placeholder="—"
          dir="ltr"
          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0F172A] focus:border-[#2691C2]/50 focus:outline-none focus:ring-2 focus:ring-[#2691C2]/15"
        />
      </label>
    </div>
  )

  return (
    <section className="rounded-[20px] border border-[#E2E8F0] bg-white p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.08)] sm:p-5" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#2691C2]" aria-hidden />
          <h2 className="text-[13px] font-black text-[#22334A]">تصفية النتائج</h2>
          <span className="text-[11px] font-bold text-[#94A3B8]">({resultCount.toLocaleString('ar')} نتيجة)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3 text-[11px] font-black text-[#22334A] disabled:opacity-45"
          >
            <Download className="h-3.5 w-3.5 text-[#2691C2]" aria-hidden />
            تصدير
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3 text-[11px] font-black text-[#64748B]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            إعادة تعيين
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#22334A] px-3 text-[11px] font-black text-white md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            فلاتر
          </button>
        </div>
      </div>

      <div className={`${mobileOpen ? 'block' : 'hidden'} md:block`}>{fields}</div>

      {hasActiveFilters && chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F1F5F9] pt-4">
          {chips.map((c) => (
            <FilterChip key={c.label} label={c.label} onRemove={c.clear} />
          ))}
        </div>
      )}
    </section>
  )
}
