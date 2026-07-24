import { useState } from 'react'
import { ChevronDown, ChevronUp, Download, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { formatFinanceCount } from '@/utils/financeFormatters'
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0077B6]/10 px-3 py-1 text-[11px] font-black text-[#1e6f96] ring-1 ring-[#0077B6]/15">
      {label}
      <button type="button" onClick={onRemove} aria-label={`إزالة ${label}`} className="rounded-full p-0.5 hover:bg-[#0077B6]/15">
        <X className="h-3 w-3" aria-hidden />
      </button>
    </span>
  )
}

const SELECT_CLS =
  'w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0F172A] focus:border-[#0077B6]/50 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/15'
const LABEL_CLS = 'mb-1.5 block text-right text-[11px] font-black text-[#0C2A4B]/70'

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
  const [advancedOpen, setAdvancedOpen] = useState(false)

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

  return (
    <section
      className="overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white shadow-[0_8px_24px_-16px_rgba(15,23,42,0.08)]"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#0077B6]" aria-hidden />
          <h2 className="text-[13px] font-black text-[#0C2A4B]">تصفية النتائج</h2>
          <span className="text-[11px] font-bold text-[#94A3B8]">({formatFinanceCount(resultCount)} نتيجة)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3 text-[11px] font-black text-[#0C2A4B] disabled:opacity-45"
          >
            <Download className="h-3.5 w-3.5 text-[#0077B6]" aria-hidden />
            تصدير
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3 text-[11px] font-black text-[#64748B] hover:bg-[#F6F8FB]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            إعادة تعيين
          </button>
        </div>
      </div>

      {/* Search — always visible */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onPatch({ search: e.target.value })}
            placeholder="ابحث باسم المستخدم، البريد الإلكتروني أو رقم المرجع"
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F6F8FB] py-2.5 pe-10 ps-3 text-[13px] font-semibold text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#0077B6]/50 focus:ring-2 focus:ring-[#0077B6]/15"
          />
        </div>
      </div>

      {/* Status pill rail — always visible, scrollable on mobile */}
      <div className="px-5 pb-4">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex min-w-max items-center gap-1 rounded-xl bg-[#F6F8FB] p-1 ring-1 ring-[#E2E8F0]">
            {STATUS_FILTER_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => onPatch({ status: o.value })}
                className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[11px] font-black transition-colors ${
                  filters.status === o.value
                    ? 'bg-[#0077B6] text-white shadow-sm'
                    : 'text-[#64748B] hover:bg-white hover:text-[#0F172A]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Separator — the structural break between primary and advanced filters */}
      <div className="border-t border-[#E2E8F0]" />

      {/* Mobile toggle for advanced filters */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-2.5 text-[11px] font-black uppercase tracking-wide text-[#94A3B8] md:hidden"
        aria-expanded={advancedOpen}
      >
        فلاتر إضافية
        {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {/* Advanced filter grid — always visible on desktop, toggled on mobile */}
      <div className={`px-5 pb-5 pt-4 ${advancedOpen ? 'block' : 'hidden'} md:block`}>
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
          <div>
            <EmcDatePicker
              layout="stacked"
              label="من تاريخ"
              displayMode="finance"
              value={filters.from}
              onChange={(v) => onPatch({ from: v })}
            />
          </div>
          <div>
            <EmcDatePicker
              layout="stacked"
              label="إلى تاريخ"
              displayMode="finance"
              value={filters.to}
              onChange={(v) => onPatch({ to: v })}
            />
          </div>

          <label className="block text-right">
            <span className={LABEL_CLS}>طريقة الدفع</span>
            <select
              value={filters.paymentMethod}
              onChange={(e) => onPatch({ paymentMethod: e.target.value })}
              className={SELECT_CLS}
            >
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="block text-right">
            <span className={LABEL_CLS}>العنصر المرتبط</span>
            <select
              value={filters.entityType}
              onChange={(e) => onPatch({ entityType: e.target.value })}
              className={SELECT_CLS}
            >
              {ENTITY_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="block text-right">
            <span className={LABEL_CLS}>حساب المالية</span>
            <select
              value={filters.accountId}
              onChange={(e) => onPatch({ accountId: e.target.value })}
              className={SELECT_CLS}
            >
              <option value="all">الكل</option>
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)}>{a.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-right">
            <span className={LABEL_CLS}>الحد الأدنى (EUR)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={filters.minAmount}
              onChange={(e) => onPatch({ minAmount: e.target.value })}
              placeholder="0"
              dir="ltr"
              className={SELECT_CLS}
            />
          </label>

          <label className="block text-right">
            <span className={LABEL_CLS}>الحد الأقصى (EUR)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={filters.maxAmount}
              onChange={(e) => onPatch({ maxAmount: e.target.value })}
              placeholder="—"
              dir="ltr"
              className={SELECT_CLS}
            />
          </label>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && chips.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-[#F1F5F9] px-5 py-3">
          {chips.map((c) => (
            <FilterChip key={c.label} label={c.label} onRemove={c.clear} />
          ))}
        </div>
      )}
    </section>
  )
}
