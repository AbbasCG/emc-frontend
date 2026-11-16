import { useRef, useState } from 'react'
import { Loader2, MailCheck } from 'lucide-react'
import toast from '@/lib/toast'
import { describeResendError, resendVolunteerCredentials } from '@/api/volunteerApplicationApi'

/**
 * «إعادة إرسال بيانات الدخول» for a request that is already a member.
 *
 * The server decides whether it still applies (the account must still be on its temporary password) and answers
 * with an Arabic reason when it does not: that sentence is shown as is, nothing is assumed here. One click = one
 * request; the button is busy meanwhile.
 */
export default function ResendCredentialsButton({
  requestId,
  className,
  rowActionId,
  children = 'إعادة إرسال بيانات الدخول',
}: {
  requestId: number
  className: string
  /** Marks the control as its row's action, so a closing dialog can return focus to it. */
  rowActionId?: number
  children?: React.ReactNode
}) {
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  async function resend() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const { email_sent } = await resendVolunteerCredentials(requestId)
      if (email_sent) toast.success('أُعيد إرسال بيانات الدخول إلى المتطوع.')
      else toast.warning('أُعيد إصدار كلمة المرور لكن تعذّر إرسال البريد. حاول مرة أخرى.')
    } catch (err) {
      toast.error(describeResendError(err))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void resend()}
      disabled={busy}
      aria-busy={busy || undefined}
      data-volunteer-row-action={rowActionId}
      className={className}
    >
      {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <MailCheck size={14} aria-hidden="true" />}
      {children}
    </button>
  )
}
