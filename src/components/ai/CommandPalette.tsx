import GlobalCommandPalette from '@/components/navigation/GlobalCommandPalette'

export default function CommandPalette({
  open,
  onOpen,
  onClose,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  return <GlobalCommandPalette open={open} onOpen={onOpen} onClose={onClose} />
}
