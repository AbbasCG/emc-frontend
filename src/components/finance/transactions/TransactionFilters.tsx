import { useState } from 'react'
import { Filter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { formatFinanceCount } from '@/utils/financeFormatters'
import EmcDatePicker from '@/components/ui/EmcDatePicker'
import type { TransactionFilterState } from './filterRows'
import { STATUS_FILTER_OPTIONS, TYPE_FILTER_OPTIONS } from './constants'

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0077B6]/10 px-3 py-1 text-[11px] font-black text-[#1e6f96] ring-1 ring-[#0077B6]/15">
      {label}
      <button type="button" onClick={onRemove} aria-label={`إزالة ${label}`} className="rounded-full p-0.5 hover:bg-[#0077B6]/15">
        <X className="h-3 w-3" aria-hidden />
      </button>
    </span>
  )
}

export default function TransactionFilters({
  filters,
  onPatch,
  onReset,
  resultCount,
  hasActiveFilters,
}: {
  filters: TransactionFilterState
  onPatch: (patch: Partial<TransactionFilterState>) => void
  onReset: () => void
  resultCount: number
  hasActiveFilters: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const chips: { label: string; clear: () => void }[] = []
  if (filters.status !== 'all') {
    const o = STATUS_FILTER_OPTIONS.find((x) => x.value === filters.status)
    chips.push({ label: `الحالة: ${o?.label ?? filters.status}`, clear: () => onPatch({ status: 'all' }) })
  }
  if (filters.type !== 'all') {
    const o = TYPE_FILTER_OPTIONS.find((x) => x.value === filters.type)
    chips.push({ label: `النوع: ${o?.label ?? filters.type}`, clear: () => onPatch({ type: 'all' }) })
  }
  if (filters.search.trim()) chips.push({ label: `بحث: ${filters.search.trim()}`, clear: () => onPatch({ search: '' }) })
  if (filters.minAmount.trim()) chips.push({ label: `من ${filters.minAmount}`, clear: () => onPatch({ minAmount: '' }) })
  if (filters.maxAmount.trim()) chips.push({ label: `إلى ${filters.maxAmount}`, clear: () => onPatch({ maxAmount: '' }) })

  const fields = (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="relative xl:col-span-2">
        <span className="mb-1.5 block text-right text-[11px] font-black text-[#0C2A4B]">بحث</span>
        <Search className="pointer-events-none absolute end-3 top-[2.35rem] h-4 w-4 text-[#94A3B8]" aria-hidden />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onPatch({ search: e.target.value })}
          placeholder="ابحث برقم المعاملة، اسم المستخدم أو البريد الإلكتروني"
          className="w-full rounded-2xl border border-[#E2E8F0] bg-[#F6F8FB] py-2.5 pe-10 ps-3 text-[13px] font-semibold text-[#0F172A] outline-none focus:border-[#0077B6]/50 focus:ring-2 focus:ring-[#0077B6]/15"
        />
      </label>

      <label className="text-right">
        <span className="mb-1.5 block text-[11px] font-black text-[#0C2A4B]">الحالة</span>
        <select
          value={filters.status}
          onChange={(e) => onPatch({ status: e.target.value })}
          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0F172A] focus:border-[#0077B6]/50 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/15"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="text-right">
        <span className="mb-1.5 block text-[11px] font-black text-[#0C2A4B]">نوع المعاملة</span>
        <select
          value={filters.type}
          onChange={(e) => onPatch({ type: e.target.value })}
          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0F172A] focus:border-[#0077B6]/50 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/15"
        >
          {TYPE_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <div className="md:col-span-2 xl:col-span-2">
        <EmcDatePicker label="من تاريخ" displayMode="finance" value={filters.from} onChange={(v) => onPatch({ from: v })} />
      </div>
      <div className="md:col-span-2 xl:col-span-2">
        <EmcDatePicker label="إلى تاريخ" displayMode="finance" value={filters.to} onChange={(v) => onPatch({ to: v })} />
      </div>

      <label className="text-right">
        <span className="mb-1.5 block text-[11px] font-black text-[#0C2A4B]">الحد الأدنى (EUR)</span>
        <input
          type="number"
          min={0}
          value={filters.minAmount}
          onChange={(e) => onPatch({ minAmount: e.target.value })}
          placeholder="0"
          dir="ltr"
          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0F172A] focus:border-[#0077B6]/50 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/15"
        />
      </label>
      <label className="text-right">
        <span className="mb-1.5 block text-[11px] font-black text-[#0C2A4B]">الحد الأقصى (EUR)</span>
        <input
          type="number"
          min={0}
          value={filters.maxAmount}
          onChange={(e) => onPatch({ maxAmount: e.target.value })}
          placeholder="—"
          dir="ltr"
          className="w-full rounded-2xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0F172A] focus:border-[#0077B6]/50 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/15"
        />
      </label>
    </div>
  )

  return (
    <section
      dir="rtl"
      className="rounded-[20px] border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.1)]"
      aria-label="تصفية المعاملات"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#0C2A4B]">
          <Filter className="h-4 w-4 text-[#0077B6]" aria-hidden />
          <h2 className="text-sm font-black">تصفية وبحث</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold text-[#64748B]">
            {formatFinanceCount(resultCount)} نتيجة
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-black text-[#64748B] lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            فلاتر
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F6F8FB] px-3 py-1.5 text-[11px] font-black text-[#0C2A4B] transition hover:border-[#0077B6]/30"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            إعادة تعيين
          </button>
        </div>
      </div>

      <div className={`${mobileOpen ? 'block' : 'hidden'} lg:block`}>{fields}</div>

      {hasActiveFilters && chips.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#E2E8F0] pt-4">
          {chips.map((c) => (
            <FilterChip key={c.label} label={c.label} onRemove={c.clear} />
          ))}
        </div>
      )}
    </section>
  )
}
