import { FileDown } from 'lucide-react'

export default function ExportButton({
  label,
  onClick,
  variant = 'outline',
}: {
  label: string
  onClick?: () => void
  variant?: 'outline' | 'solid'
}) {
  const cls =
    variant === 'solid'
      ? 'bg-deepBlue text-white shadow-md hover:opacity-95'
      : 'bg-white text-deepBlue ring-1 ring-deepBlue/[0.12] hover:bg-slate-50'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-black transition ${cls}`}
    >
      <FileDown size={15} />
      {label}
    </button>
  )
}
