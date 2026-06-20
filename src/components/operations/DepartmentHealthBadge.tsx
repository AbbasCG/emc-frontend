const HEALTH_MAP: Record<string, { label: string; cls: string }> = {
  healthy:   { label: 'سليمة', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  attention: { label: 'انتباه', cls: 'bg-amber-50 text-amber-800 ring-amber-100' },
  risk:      { label: 'ضغط',   cls: 'bg-red-50 text-red-700 ring-red-100' },
  active:    { label: 'نشطة',  cls: 'bg-sky-50 text-sky-700 ring-sky-100' },
  inactive:  { label: 'غير نشطة', cls: 'bg-slate-50 text-slate-500 ring-slate-200' },
}

const DEFAULT_HEALTH = { label: 'عادية', cls: 'bg-slate-50 text-slate-600 ring-slate-200' }

export default function DepartmentHealthBadge({ health }: { health: string | null | undefined }) {
  const e = (health ? HEALTH_MAP[health] : null) ?? DEFAULT_HEALTH
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${e.cls}`}>{e.label}</span>
  )
}
