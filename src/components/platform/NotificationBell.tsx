import { Bell } from 'lucide-react'

type Props = {
  unread: number
  onClick: () => void
}

export default function NotificationBell({ unread, onClick }: Props) {
  return (
    <button
      type="button"
      aria-label="الإشعارات"
      onClick={onClick}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue"
    >
      <Bell size={18} />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-customOrange px-1 text-[10px] font-black text-white ring-2 ring-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}
