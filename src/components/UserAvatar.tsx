import { useEffect, useState } from 'react'
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
  const [imgFailed, setImgFailed] = useState(false)
  const initials = getUserInitials(user)
  const resolved = imgFailed ? null : getUserAvatarUrl(user)

  useEffect(() => {
    setImgFailed(false)
  }, [resolved])

  return (
    <span
      className={cn(
        'relative inline-grid place-items-center overflow-hidden rounded-full font-black leading-none',
        className,
      )}
    >
      {resolved && !imgFailed ?
        <img
          src={resolved}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      : (
        <span className={cn(textClassName)}>{initials}</span>
      )}
    </span>
  )
}
