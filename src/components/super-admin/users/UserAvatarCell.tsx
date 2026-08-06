import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'

type Props = {
  name: string
  email: string
  avatarUrl?: string | null
  size?: 'sm' | 'md'
  status?: 'active' | 'inactive' | 'deleted'
}

const STATUS_DOT = {
  active: 'bg-emerald-500 ring-emerald-100',
  inactive: 'bg-amber-500 ring-amber-100',
  deleted: 'bg-red-400 ring-red-100',
} as const

export function UserAvatarCell({ name, email, avatarUrl, size = 'md', status }: Props) {
  const resolved = resolvePublicAssetUrl(avatarUrl ?? null)
  const dim = size === 'sm' ? 'h-9 w-9 text-[10px]' : 'h-10 w-10 text-[11px]'

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative shrink-0">
        <div
          className={`${dim} overflow-hidden rounded-xl bg-gradient-to-bl from-[#22334A] to-[#2691C2] font-black text-white ring-2 ring-white shadow-sm`}
        >
          {resolved ?
            <img src={resolved} alt="" className="h-full w-full object-cover" />
          : <span className="flex h-full w-full items-center justify-center">{initialsFromName(name)}</span>}
        </div>
        {status ?
          <span
            className={`absolute -bottom-0.5 -start-0.5 h-3 w-3 rounded-full ring-2 ${STATUS_DOT[status]}`}
            aria-hidden
          />
        : null}
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate text-[13px] font-black text-[#22334A]">{name}</p>
        <p className="truncate text-[11px] font-semibold text-slate-400" dir="ltr">{email}</p>
      </div>
    </div>
  )
}
