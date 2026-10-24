import { useState } from 'react'
import { Loader2, MailCheck } from 'lucide-react'
import toast from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  getResendVerificationErrorMessage,
  resendUserVerification,
  VERIFICATION_RESENT_AR,
  type AdminManagedUser,
} from '@/api/adminUsersApi'

export const RESEND_VERIFICATION_LABEL = 'إعادة إرسال رسالة التوثيق'

/**
 * Sends a fresh verification email for one user. Rendered only where the backend says a
 * resend would be accepted (`can_resend_verification`: unverified, active, not deleted) —
 * the backend still re-checks authorization, state and its per-user rate limit, and its
 * Arabic message is what the admin sees when it refuses.
 */
export function ResendVerificationButton({
  user,
  className,
  onSent,
}: {
  user: Pick<AdminManagedUser, 'id' | 'can_resend_verification' | 'email_verified'>
  className?: string
  onSent?: () => void
}) {
  const [sending, setSending] = useState(false)

  if (!user.can_resend_verification || user.email_verified === true) return null

  async function send() {
    if (sending) return
    setSending(true)
    try {
      const { message } = await resendUserVerification(user.id)
      toast.success(message || VERIFICATION_RESENT_AR)
      onSent?.()
    } catch (e) {
      toast.error(getResendVerificationErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void send()}
      disabled={sending}
      aria-busy={sending}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl border border-customBlue/30 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue transition hover:bg-customBlue/5 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {sending ?
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
      : <MailCheck size={14} aria-hidden="true" />}
      {sending ? 'جارٍ الإرسال…' : RESEND_VERIFICATION_LABEL}
    </button>
  )
}
