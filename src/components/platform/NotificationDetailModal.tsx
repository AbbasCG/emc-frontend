import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, ExternalLink, X } from 'lucide-react'
import type { PlatformNotification } from '@/types/platform'
import { formatNotificationDate } from '@/utils/dateTime'

type Props = {
  notification: PlatformNotification | null
  onClose: () => void
}

/** Full-message detail view for a notification, with a safe CTA for its
 *  external meta_url (e.g. a meeting link) — the notification list only
 *  shows a text preview, this is where the actual link becomes clickable. */
export default function NotificationDetailModal({ notification, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    if (!notification?.meta_url) return
    try {
      await navigator.clipboard.writeText(notification.meta_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — the link is still visible/selectable via the CTA below.
    }
  }

  return (
    <AnimatePresence>
      {notification && (
        <div
          className="fixed inset-0 z-modal-content flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          dir="rtl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[15px] font-black text-deepBlue">{notification.title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {notification.body && (
              <p className="mt-3 whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-slate-600">
                {notification.body}
              </p>
            )}

            <p className="mt-3 text-[11px] font-bold text-slate-400">
              {formatNotificationDate(notification.created_at)}
            </p>

            {notification.meta_url ? (
              <div className="mt-4 space-y-2">
                <a
                  href={notification.meta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-customBlue py-3 text-[13px] font-black text-white shadow-md transition hover:brightness-105"
                >
                  <ExternalLink className="h-4 w-4" />
                  فتح رابط المقابلة
                </a>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-[12px] font-bold text-deepBlue/70 transition hover:bg-slate-50"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'تم نسخ الرابط' : 'نسخ الرابط'}
                </button>
              </div>
            ) : notification.entity_type === 'oral_assessment_booking' ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-3 text-center text-[12px] font-bold text-slate-400">
                لم يتم إرفاق رابط بعد
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
