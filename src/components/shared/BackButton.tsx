import { ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

interface Props {
  to?: string
  label?: string
  className?: string
}

export function BackButton({ to, label = 'العودة', className }: Props) {
  const navigate = useNavigate()

  const base =
    'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-black text-deepBlue shadow-sm transition hover:border-customBlue/40 hover:bg-customBlue/5 hover:text-customBlue'

  if (to) {
    return (
      <Link to={to} className={`${base} ${className ?? ''}`}>
        <ArrowRight className="h-3.5 w-3.5" />
        {label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`${base} ${className ?? ''}`}
    >
      <ArrowRight className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
