import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/dashboard'

type Props = {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export default function LmsEmptyState(props: Props) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-deepBlue/[0.04]">
      <EmptyState {...props} />
    </div>
  )
}
