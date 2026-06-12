import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'

type Props = {
  name: string
  email: string
  avatarUrl?: string | null
  size?: 'sm' | 'md'
}

export function UserAvatarCell({ name, email, avatarUrl, size = 'md' }: Props) {
  const resolved = resolvePublicAssetUrl(avatarUrl ?? null)
  const dim = size === 'sm' ? 'h-9 w-9 text-[10px]' : 'h-10 w-10 text-[11px]'

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`${dim} shrink-0 overflow-hidden rounded-xl bg-gradient-to-bl from-[#22334A] to-[#2691C2] font-black text-white ring-1 ring-[#22334A]/10`}
      >
        {resolved ?
          <img src={resolved} alt="" className="h-full w-full object-cover" />
        : <span className="flex h-full w-full items-center justify-center">{initialsFromName(name)}</span>}
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate text-[13px] font-black text-[#22334A]">{name}</p>
        <p className="truncate text-[11px] font-semibold text-slate-400" dir="ltr">{email}</p>
      </div>
    </div>
  )
}
