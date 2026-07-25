import { cn } from '@/lib/utils'
import { adminRoleLabelAr } from '@/pages/super-admin/users/assignableRoles'
import { normalizeRole } from '@/utils/dashboardAccess'
import type { AdminManagedUser } from '@/api/adminUsersApi'
import {
  STATUS_LABEL,
  STATUS_PILL,
  userStatusKey,
  userVerifiedKey,
  VERIFIED_LABEL,
  VERIFIED_PILL,
} from '@/components/super-admin/users/userBadgeStatus'

const ROLE_PILL: Record<string, string> = {
  super_admin: 'bg-[#0C2A4B] text-white border-[#0C2A4B]/70 shadow-sm',
  admin: 'bg-[#1a2940]/90 text-white border-[#1a2940]/60',
  executive_admin: 'bg-[#0C2A4B]/80 text-white border-[#0C2A4B]/50',
  instructor: 'bg-[#0077B6]/12 text-[#1a6b96] border-[#0077B6]/35',
  student: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  finance_manager: 'bg-amber-50 text-amber-800 border-amber-200',
  hr_manager: 'bg-violet-50 text-violet-800 border-violet-200',
  marketing_manager: 'bg-pink-50 text-pink-800 border-pink-200',
  quality_manager: 'bg-teal-50 text-teal-800 border-teal-200',
  support_agent: 'bg-sky-50 text-sky-800 border-sky-200',
  department_manager: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  tech_admin: 'bg-[#0C2A4B] text-white border-[#0C2A4B]/70 shadow-sm',
  programs_manager: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  operations_manager: 'bg-orange-50 text-orange-800 border-orange-200',
  partnerships_manager: 'bg-lime-50 text-lime-800 border-lime-200',
  community_manager: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
  volunteer: 'bg-green-50 text-green-800 border-green-200',
  partner: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  section_lead: 'bg-rose-50 text-rose-800 border-rose-200',
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black leading-none',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function UserRoleBadge({ role }: { role?: string | null }) {
  const roleKey = normalizeRole(role ?? '') ?? ''
  return (
    <Pill className={ROLE_PILL[roleKey] ?? 'bg-slate-50 text-slate-700 border-slate-200'}>
      {adminRoleLabelAr(role)}
    </Pill>
  )
}

export function UserStatusBadge({ user }: { user: AdminManagedUser }) {
  const st = userStatusKey(user)
  return <Pill className={STATUS_PILL[st]}>{STATUS_LABEL[st]}</Pill>
}

export function UserVerifiedBadge({ user }: { user: AdminManagedUser }) {
  const vz = userVerifiedKey(user)
  return <Pill className={VERIFIED_PILL[vz]}>{VERIFIED_LABEL[vz]}</Pill>
}
