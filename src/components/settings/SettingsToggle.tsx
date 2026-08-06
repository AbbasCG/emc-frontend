import { cn } from '@/lib/utils'

type Props = {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  id?: string
  'aria-label'?: string
}

export default function SettingsToggle({
  checked,
  onChange,
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: Props) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      dir="ltr"
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
        'transition-[background-color,opacity] duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691C2]/40 focus-visible:ring-offset-2',
        'hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-[#2691C2]' : 'bg-[#CBD5E1]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-out',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
