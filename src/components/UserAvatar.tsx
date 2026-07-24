import { useState } from 'react'
import type { User } from '@/types'
import { getUserAvatarUrl, getUserInitials } from '@/utils/userIdentity'
import { cn } from '@/lib/utils'

/** Avatar with remote URL fallback to initials — avoids broken `<img>` flash. */
export function UserAvatar({
  user,
  className,
  textClassName,
}: {
  user: User | null | undefined
  className?: string
  textClassName?: string
}) {
  // Remember *which* URL failed instead of a bare boolean: the fallback then clears
  // itself as soon as the user's avatar URL changes, with no effect involved.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const initials = getUserInitials(user)
  const avatarUrl = getUserAvatarUrl(user)
  const resolved = avatarUrl === failedUrl ? null : avatarUrl

  return (
    <span
      className={cn(
        'relative inline-grid place-items-center overflow-hidden rounded-full font-black leading-none',
        className,
      )}
    >
      {resolved ?
        <img
          src={resolved}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(avatarUrl)}
        />
      : (
        <span className={cn(textClassName)}>{initials}</span>
      )}
    </span>
  )
}
