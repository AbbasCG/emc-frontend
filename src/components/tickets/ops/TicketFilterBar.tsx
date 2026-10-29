import { useEffect, useRef, useState } from 'react'
import { ArrowDownUp, Filter, Search, SlidersHorizontal, X } from 'lucide-react'
import type { Department, TicketUser } from '@/types/ticket'
import type { TicketFilters } from '@/types/ticketOps'
import AssigneeSearchSelect from '@/components/tickets/AssigneeSearchSelect'
import { cn } from '@/lib/utils'
import { TICKET_PRIORITIES, TICKET_STATUSES, activeFilterCount, describeFilters, type ChipLabels } from '@/utils/ticketFilters'
import { CATEGORY_LABELS, PRIORITY_LABELS, SORT_OPTIONS, STATUS_LABELS } from './ticketOpsUi'

const FIELD = 'w-full rounded-xl border border-deepBlue/10 bg-white px-3 py-2.5 text-sm font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'
const SEARCH_DELAY_MS = 350

interface Props {
  filters: TicketFilters
  onChange: (patch: Partial<TicketFilters>, opts?: { replace?: boolean }) => void
  onReset: () => void
  departments: Department[]
  assignees: TicketUser[]
  assigneesLoading: boolean
  total: number | null
  loading: boolean
  /** Saved views / presets control, rendered beside the search box. */
  viewsSlot?: React.ReactNode
}

function MultiPills<T extends string>({ label, options, value, onToggle, labels }: { label: string; options: T[]; value: T[]; onToggle: (v: T) => void; labels: Record<string, string> }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[12px] font-black text-deepBlue/70">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o)

          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[12px] font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40',
                on ? 'border-customBlue bg-customBlue text-white' : 'border-deepBlue/10 bg-white text-deepBlue/70 hover:border-customBlue/40',
              )}
            >
              {labels[o] ?? o}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-[12px] font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40',
        on ? 'border-customBlue bg-customBlue/10 text-customBlue' : 'border-deepBlue/10 bg-white text-deepBlue/70 hover:border-customBlue/40',
      )}
    >
      {label}
    </button>
  )
}

export function TicketFilterBar({ filters, onChange, onReset, departments, assignees, assigneesLoading, total, loading, viewsSlot }: Props) {
  // The search box is typed into freely; the URL (and so the request) follows after a pause.
  const [text, setText] = useState(filters.search)
  const committed = useRef(filters.search)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Back/forward or a reset changed the URL's search: show it. Our own commit is skipped, so typing is never overwritten.
    if (filters.search !== committed.current) {
      committed.current = filters.search
      setText(filters.search)
    }
  }, [filters.search])

  useEffect(() => {
    if (text === committed.current) return
    const t = setTimeout(() => {
      committed.current = text
      onChange({ search: text }, { replace: true })
    }, SEARCH_DELAY_MS)

    return () => clearTimeout(t)
  }, [text, onChange])

  const labels: ChipLabels = {
    status: STATUS_LABELS,
    priority: PRIORITY_LABELS,
    category: CATEGORY_LABELS,
    departmentName: (id) => departments.find((d) => String(d.id) === id)?.name_ar,
    assigneeName: (id) => assignees.find((u) => String(u.id) === id)?.name,
  }
  const chips = describeFilters(filters, labels)
  const toggle = <K extends 'status' | 'priority'>(key: K, v: TicketFilters[K][number]) => {
    const cur = filters[key] as string[]
    onChange({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<TicketFilters>)
  }

  const createdBad = !!filters.createdFrom && !!filters.createdTo && filters.createdTo < filters.createdFrom
  const dueBad = !!filters.dueFrom && !!filters.dueTo && filters.dueTo < filters.dueFrom
  const advancedCount = activeFilterCount({ ...filters, search: '', unassigned: false, mine: false, attention: false, overdue: false }, labels)

  return (
    <section aria-label="البحث والتصفية" className="space-y-3 rounded-3xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-deepBlue/40" aria-hidden="true" />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={100}
            placeholder="ابحث بالرقم أو العنوان أو الوصف أو اسم المُبلِّغ…"
            aria-label="بحث في التذاكر"
            className={cn(FIELD, 'pl-3 pr-9')}
          />
        </div>

        <label className="flex items-center gap-1.5">
          <span className="sr-only">ترتيب حسب</span>
          <ArrowDownUp size={15} className="text-deepBlue/40" aria-hidden="true" />
          <select value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as TicketFilters['sort'] })} className={cn(FIELD, 'w-auto')} aria-label="ترتيب حسب">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onChange({ dir: filters.dir === 'asc' ? 'desc' : 'asc' })}
          aria-label={filters.dir === 'asc' ? 'ترتيب تصاعدي، اضغط للتبديل' : 'ترتيب تنازلي، اضغط للتبديل'}
          className="rounded-xl border border-deepBlue/10 bg-white px-3 py-2.5 text-[12px] font-black text-deepBlue hover:border-customBlue/40"
        >
          {filters.dir === 'asc' ? 'تصاعدي ↑' : 'تنازلي ↓'}
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="ticket-advanced-filters"
          className={cn('inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12px] font-black transition', open || advancedCount > 0 ? 'border-customBlue bg-customBlue/[0.06] text-customBlue' : 'border-deepBlue/10 text-deepBlue hover:border-customBlue/40')}
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          فلاتر متقدمة
          {advancedCount > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-customBlue px-1 text-[10px] text-white">{advancedCount}</span> : null}
        </button>
        {viewsSlot}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="تصفية سريعة">
        <Toggle label="المسندة إليّ" on={filters.mine} onClick={() => onChange({ mine: !filters.mine })} />
        <Toggle label="تحتاج إجرائي" on={filters.attention} onClick={() => onChange({ attention: !filters.attention })} />
        <Toggle label="بلا مكلف" on={filters.unassigned} onClick={() => onChange({ unassigned: !filters.unassigned })} />
        <Toggle label="متأخرة" on={filters.overdue} onClick={() => onChange({ overdue: !filters.overdue })} />
      </div>

      {open ?
        <div id="ticket-advanced-filters" className="grid gap-4 rounded-2xl bg-slate-50/70 p-4 md:grid-cols-2" data-testid="advanced-filters">
          <MultiPills label="الحالة" options={TICKET_STATUSES} value={filters.status} onToggle={(v) => toggle('status', v)} labels={STATUS_LABELS} />
          <MultiPills label="الأولوية" options={TICKET_PRIORITIES} value={filters.priority} onToggle={(v) => toggle('priority', v)} labels={PRIORITY_LABELS} />

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-black text-deepBlue/70">النوع</span>
            <select value={filters.category} onChange={(e) => onChange({ category: e.target.value as TicketFilters['category'] })} className={FIELD} aria-label="النوع">
              <option value="">كل الأنواع</option>
              <option value="OLD_ISSUE">مشكلة</option>
              <option value="NEW_SUGGESTION">مقترح</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-black text-deepBlue/70">الإدارة</span>
            <select value={filters.department} onChange={(e) => onChange({ department: e.target.value, assignee: '' })} className={FIELD} aria-label="الإدارة">
              <option value="">كل الإدارات</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-1.5 block text-[12px] font-black text-deepBlue/70">المكلف</span>
            <AssigneeSearchSelect
              value={filters.assignee}
              onChange={(v) => onChange({ assignee: v })}
              users={assignees}
              isLoading={assigneesLoading}
              isDisabled={!filters.department}
              ariaLabel="المكلف"
              instanceId="ticket-assignee-filter"
              placeholder={filters.department ? 'كل المكلفين' : 'اختر إدارة أولًا'}
              noOptionsMessage="لا توجد قائمة موظفين متاحة لك لهذه الإدارة"
            />
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-black text-deepBlue/70">حالة الإغلاق والموعد</span>
            <div className="grid grid-cols-2 gap-2">
              <select value={filters.state} onChange={(e) => onChange({ state: e.target.value as TicketFilters['state'] })} className={FIELD} aria-label="مفتوحة أو مغلقة">
                <option value="">مفتوحة ومغلقة</option>
                <option value="open">مفتوحة فقط</option>
                <option value="closed">مغلقة فقط</option>
              </select>
              <select value={filters.sla} onChange={(e) => onChange({ sla: e.target.value as TicketFilters['sla'] })} className={FIELD} aria-label="حالة الموعد">
                <option value="">أي موعد</option>
                <option value="overdue">متأخرة</option>
                <option value="due_soon">تستحق خلال 24 ساعة</option>
                <option value="on_track">ضمن الموعد</option>
                <option value="none">بلا موعد</option>
              </select>
            </div>
          </label>

          <fieldset>
            <legend className="mb-1.5 text-[12px] font-black text-deepBlue/70">تاريخ الإنشاء</legend>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={filters.createdFrom} onChange={(e) => onChange({ createdFrom: e.target.value })} className={FIELD} aria-label="من تاريخ الإنشاء" aria-invalid={createdBad || undefined} />
              <input type="date" value={filters.createdTo} min={filters.createdFrom || undefined} onChange={(e) => onChange({ createdTo: e.target.value })} className={FIELD} aria-label="إلى تاريخ الإنشاء" aria-invalid={createdBad || undefined} />
            </div>
            {createdBad ? <p role="alert" className="mt-1 text-[12px] font-bold text-red-600">تاريخ النهاية يسبق تاريخ البداية.</p> : null}
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-[12px] font-black text-deepBlue/70">الموعد المتوقع</legend>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={filters.dueFrom} onChange={(e) => onChange({ dueFrom: e.target.value })} className={FIELD} aria-label="من الموعد المتوقع" aria-invalid={dueBad || undefined} />
              <input type="date" value={filters.dueTo} min={filters.dueFrom || undefined} onChange={(e) => onChange({ dueTo: e.target.value })} className={FIELD} aria-label="إلى الموعد المتوقع" aria-invalid={dueBad || undefined} />
            </div>
            {dueBad ? <p role="alert" className="mt-1 text-[12px] font-bold text-red-600">تاريخ النهاية يسبق تاريخ البداية.</p> : null}
          </fieldset>
        </div>
      : null}

      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-black text-deepBlue/70" data-testid="result-count">
          <Filter size={13} aria-hidden="true" />
          {total === null ? 'جارٍ التحميل…' : `${total.toLocaleString('en-US')} تذكرة`}
          {loading && total !== null ? <span className="text-deepBlue/40">· يتم التحديث</span> : null}
        </span>

        {chips.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-customBlue/[0.08] py-1 pe-1.5 ps-3 text-[12px] font-black text-customBlue" data-testid="filter-chip">
            {c.label}
            <button type="button" onClick={() => onChange(c.remove)} aria-label={`إزالة الفلتر: ${c.label}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-customBlue/15">
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}

        {chips.length > 0 ?
          <button type="button" onClick={onReset} className="rounded-lg px-2 py-1 text-[12px] font-black text-red-600 hover:bg-red-50">
            مسح الكل
          </button>
        : null}
      </div>
    </section>
  )
}
