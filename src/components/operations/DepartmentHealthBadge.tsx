import type { DepartmentHealth } from '@/types/operations'

export default function DepartmentHealthBadge({ health }: { health: DepartmentHealth }) {
  const map = {
    healthy: { label: 'سليمة', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    attention: { label: 'انتباه', cls: 'bg-amber-50 text-amber-800 ring-amber-100' },
    risk: { label: 'ضغط', cls: 'bg-red-50 text-red-700 ring-red-100' },
  }
  const e = map[health]
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${e.cls}`}>{e.label}</span>
  )
}
