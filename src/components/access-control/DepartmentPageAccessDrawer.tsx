import { DepartmentPageAccessPanel } from '@/components/access-control/DepartmentPageAccessPanel'
import { CrudDrawer } from '@/pages/super-admin/crud/shared/CrudDrawer'

/**
 * Phase 2A — the Department Default Page Access editor as a slide-over.
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION.
 *
 * Presented as its own drawer rather than a new tab inside the department
 * detail panel: that panel is a compact summary with its own bespoke layout,
 * and this editor needs the full width of a wide slide-over for a grouped,
 * searchable 129-row list. It reuses the shared CrudDrawer (focus trap, Escape
 * to close, RTL slide-in) so it behaves exactly like every other panel in the
 * super-admin area.
 */
export function DepartmentPageAccessDrawer({
  departmentId,
  departmentName,
  open,
  onClose,
}: {
  departmentId: number | string | null
  departmentName: string
  open: boolean
  onClose: () => void
}) {
  return (
    <CrudDrawer
      open={open && departmentId != null}
      title="الوصول الافتراضي للصفحات"
      subtitle={departmentName ? `إدارة «${departmentName}» — للأعضاء وللقائد` : undefined}
      onClose={onClose}
      widthClassName="max-w-lg sm:max-w-2xl"
    >
      {departmentId != null ?
        <DepartmentPageAccessPanel
          key={String(departmentId)}
          departmentId={departmentId}
          departmentName={departmentName}
        />
      : null}
    </CrudDrawer>
  )
}
