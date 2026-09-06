import DashboardRouteSearchModal from '@/components/dashboard/DashboardRouteSearchModal'

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  return <DashboardRouteSearchModal open={open} onClose={onClose} />
}
