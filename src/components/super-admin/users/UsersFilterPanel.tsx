import { Filter, X } from 'lucide-react'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'

type Option = { value: string; labelAr: string }

type Props = {
  query: string
  onQueryChange: (v: string) => void
  roleFilter: string
  onRoleFilterChange: (v: string) => void
  roleOptions: Option[]
  statusFilter: 'all' | 'active' | 'inactive' | 'deleted'
  onStatusFilterChange: (v: 'all' | 'active' | 'inactive' | 'deleted') => void
  verifiedFilter: 'all' | 'verified' | 'unverified'
  onVerifiedFilterChange: (v: 'all' | 'verified' | 'unverified') => void
  departmentFilter: string
  onDepartmentFilterChange: (v: string) => void
  departmentOptions: Option[]
  joinedFilter: 'all' | 'month' | 'quarter' | 'year'
  onJoinedFilterChange: (v: 'all' | 'month' | 'quarter' | 'year') => void
  serverPaginated: boolean
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function UsersFilterPanel({
  query,
  onQueryChange,
  roleFilter,
  onRoleFilterChange,
  roleOptions,
  statusFilter,
  onStatusFilterChange,
  verifiedFilter,
  onVerifiedFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  departmentOptions,
  joinedFilter,
  onJoinedFilterChange,
  serverPaginated,
  onClearFilters,
  hasActiveFilters,
}: Props) {
  return (
    <CrudToolbar
      sticky
      searchValue={query}
      onSearchChange={onQueryChange}
      searchPlaceholder="بحث بالاسم، البريد، الجوال، المعرّف، الدور، الإدارة…"
      innerClassName="rounded-3xl border-slate-200/90 shadow-[0_8px_32px_-12px_rgba(12,42,75,0.12)]"
    >
      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-[11px] font-black text-[#0C2A4B]/70">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0077B6]/10 text-[#0077B6]">
            <Filter className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>تصفية النتائج</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MiniSelect label="الدور" value={roleFilter} onChange={onRoleFilterChange} options={roleOptions} />
          <MiniSelect
            label="الحالة"
            value={statusFilter}
            onChange={(v) => onStatusFilterChange(v as Props['statusFilter'])}
            options={[
              { value: 'all', labelAr: 'كل الحالات' },
              { value: 'active', labelAr: 'نشط' },
              { value: 'inactive', labelAr: 'موقوف' },
              { value: 'deleted', labelAr: 'محذوف' },
            ]}
          />
          <MiniSelect
            label="توثيق البريد"
            value={verifiedFilter}
            onChange={(v) => onVerifiedFilterChange(v as Props['verifiedFilter'])}
            options={[
              { value: 'all', labelAr: 'الكل' },
              { value: 'verified', labelAr: 'موثَّق' },
              { value: 'unverified', labelAr: 'غير موثَّق' },
            ]}
          />
          <MiniSelect
            label="الإدارة"
            value={departmentFilter}
            onChange={onDepartmentFilterChange}
            options={departmentOptions}
          />
          <MiniSelect
            label="تاريخ الانضمام"
            value={joinedFilter}
            onChange={(v) => onJoinedFilterChange(v as Props['joinedFilter'])}
            disabled={serverPaginated}
            options={[
              { value: 'all', labelAr: 'الكل' },
              { value: 'month', labelAr: 'هذا الشهر' },
              { value: 'quarter', labelAr: '+90 يوماً' },
              { value: 'year', labelAr: 'هذا العام' },
            ]}
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700 transition hover:bg-rose-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              مسح التصفية
            </button>
          ) : null}
        </div>
      </div>
    </CrudToolbar>
  )
}
