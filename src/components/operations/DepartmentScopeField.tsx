import { Lock } from 'lucide-react'
import type { DepartmentAccessManifest } from '@/api/operationsReportsApi'

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-deepBlue outline-none transition-colors focus:border-customBlue focus:ring-2 focus:ring-customBlue/15'

type Props = {
  manifest: DepartmentAccessManifest | null
  loading: boolean
  value: number | ''
  onChange: (id: number | '') => void
}

/**
 * One allowed department → locked, read-only field (can't be changed).
 * Several allowed departments → dropdown limited to just those.
 * Global scope (privileged admins) → dropdown over every department.
 * Never renders every department to a department-scoped user.
 */
export default function DepartmentScopeField({ manifest, loading, value, onChange }: Props) {
  if (loading) {
    return (
      <label className="grid gap-1.5 text-xs font-black text-ink-500">
        الإدارة *
        <div className={`${fieldClass} animate-pulse text-slate-300`}>جارٍ التحميل…</div>
      </label>
    )
  }

  if (!manifest || manifest.allowed_departments.length === 0) {
    return (
      <label className="grid gap-1.5 text-xs font-black text-ink-500">
        الإدارة *
        <div className={`${fieldClass} text-slate-400`}>لا توجد إدارة مرتبطة بحسابك</div>
      </label>
    )
  }

  if (!manifest.can_select_any_department && manifest.allowed_departments.length === 1) {
    const dept = manifest.allowed_departments[0]
    return (
      <label className="grid gap-1.5 text-xs font-black text-ink-500">
        الإدارة
        <div className={`${fieldClass} flex items-center justify-between gap-2 bg-slate-50 text-deepBlue`}>
          <span>{dept.name}</span>
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <Lock size={12} aria-hidden />
            الإدارة مرتبطة بحسابك
          </span>
        </div>
      </label>
    )
  }

  return (
    <label className="grid gap-1.5 text-xs font-black text-ink-500">
      الإدارة *
      <select value={value} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')} className={fieldClass}>
        <option value="">اختر الإدارة…</option>
        {manifest.allowed_departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
    </label>
  )
}
