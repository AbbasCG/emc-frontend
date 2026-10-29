import { useState } from 'react'
import { Loader2, Lock, Send } from 'lucide-react'
import { ticketService } from '@/services/ticketService'
import { apiMessage } from '@/services/ticketOpsService'
import { useModalGuard } from '@/components/ui/modalGuard'
import toast from '@/lib/toast'
import { cn } from '@/lib/utils'

const MAX = 2000

/**
 * Reply or leave an internal note. The internal option appears only when the server says this user
 * may write one (`add_internal_note`), and the server re-checks it on submit. Text is sent as plain
 * text and always rendered as text, never as HTML.
 */
export function TicketCommentBox({ ticketId, canInternal, onPosted }: { ticketId: number; canInternal: boolean; onPosted: () => void }) {
  const [text, setText] = useState('')
  const [internal, setInternal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useModalGuard('comment', { busy, dirty: text.trim() !== '' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const body = text.trim()
    if (!body) return setError('اكتب نص التعقيب أولًا.')
    if (body.length > MAX) return setError(`الحد الأقصى ${MAX} حرف.`)

    setBusy(true)
    setError(null)
    try {
      await ticketService.addComment(ticketId, body, internal && canInternal)
      toast.success(internal && canInternal ? 'أُضيفت الملاحظة الداخلية.' : 'أُضيف التعقيب.')
      setText('')
      onPosted()
    } catch (err) {
      setError(apiMessage(err, 'تعذّر إرسال التعقيب. حاول مرة أخرى.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-2" aria-label="إضافة تعقيب" noValidate>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-black text-deepBlue/70">{internal ? 'ملاحظة داخلية' : 'تعقيب على التذكرة'}</span>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); if (error) setError(null) }}
          rows={3}
          maxLength={MAX}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'comment-error' : undefined}
          placeholder={internal ? 'ملاحظة تظهر لقيادة الإدارة والمكلف فقط…' : 'اكتب تعقيبًا أو استفسارًا…'}
          className={cn('w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold text-deepBlue outline-none transition focus:ring-2', internal ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-200' : 'border-deepBlue/10 focus:border-customBlue focus:ring-customBlue/15')}
        />
      </label>
      {error ? <p id="comment-error" role="alert" className="text-[12px] font-bold text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        {canInternal ?
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-black text-amber-800">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-amber-600" />
            <Lock size={12} aria-hidden="true" /> ملاحظة داخلية
          </label>
        : null}
        <span className="text-[11px] font-semibold text-deepBlue/40">{text.length}/{MAX}</span>
        <button type="submit" disabled={busy} aria-busy={busy} className="ms-auto inline-flex items-center gap-2 rounded-xl bg-customBlue px-4 py-2 text-[12px] font-black text-white transition hover:brightness-110 disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
          {internal ? 'حفظ الملاحظة' : 'إرسال'}
        </button>
      </div>
      {internal ? <p className="text-[11px] font-semibold text-amber-800/80">لن يراها المُبلِّغ ولا أعضاء الإدارة غير القياديين.</p> : null}
    </form>
  )
}
