import type { LucideIcon } from 'lucide-react'
import { LmsEmptyState } from '@/components/lms'

type Props = {
  icon: LucideIcon
  title: string
  description?: string
  onReset?: () => void
}

/** Generic empty-state wrapper with an optional "reset filters" action. */
export default function EmptyHint({ icon, title, description, onReset }: Props) {
  return (
    <LmsEmptyState
      icon={icon}
      title={title}
      description={description}
      action={onReset ? { label: 'إعادة ضبط الفلاتر', onClick: onReset } : undefined}
    />
  )
}
