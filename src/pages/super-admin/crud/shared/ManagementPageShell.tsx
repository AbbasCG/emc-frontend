import { CrudChrome } from '@/pages/super-admin/crud/shared/CrudChrome'
import { CrudFilterBar } from '@/pages/super-admin/crud/shared/FilterBar'
import type { KpiItem } from '@/pages/super-admin/crud/shared/KpiStrip'
import { KpiCards } from '@/pages/super-admin/crud/shared/KpiStrip'

/** Shared bento chrome + KPIs + toolbar for Super Admin CRUD pages (distinct content via props). */
export function ManagementPageShell(props: {
  eyebrow?: string
  title: string
  subtitle: string
  kpis: KpiItem[]
  toolbar?: React.ReactNode
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
  headerActions?: React.ReactNode
  children: React.ReactNode
}) {
  const { eyebrow, title, subtitle, kpis, toolbar, search, headerActions, children } = props
  return (
    <CrudChrome
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actionSlot={headerActions}
      bento={<KpiCards items={kpis} />}
    >
      <div dir="rtl" className="space-y-5 text-right rtl:text-right">
        {search ?
          toolbar ?
            <div className="space-y-4">
              <CrudFilterBar
                searchValue={search.value}
                onSearchChange={search.onChange}
                searchPlaceholder={search.placeholder}
              >
                {toolbar}
              </CrudFilterBar>
            </div>
          : <CrudFilterBar searchValue={search.value} onSearchChange={search.onChange} searchPlaceholder={search.placeholder} />
        : toolbar ?
          toolbar
        : null}
        {children}
      </div>
    </CrudChrome>
  )
}
