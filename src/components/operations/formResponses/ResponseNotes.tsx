import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { parseFormActionError } from '@/api/formsAdminApi'
import { addResponseNote, fetchResponseNotes } from '@/api/formsResponsesApi'
import type { ResponseNote } from '@/api/formsResponsesApi'
import { formatDateTime } from '@/utils/dateTime'

const MAX = 2000

/**
 * Internal notes on a response. They are for staff only: they are never shown to the respondent and are not part of any export.
 * A note cannot be edited or removed once it is written, so the record of what was said stays whole.
 */
export default function ResponseNotes({
  formId,
  responseId,
  onAdded,
  onDirtyChange,
}: {
  formId: number
  responseId: number
  onAdded: () => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const [notes, setNotes] = useState<ResponseNote[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchResponseNotes(formId, responseId)
        if (!cancelled) { setNotes(next); setError(null) }
      } catch (e) {
        if (!cancelled) setError(parseFormActionError(e))
      }
    })()
    return () => { cancelled = true }
  }, [formId, responseId, attempt])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    setError(null)
    try {
      setNotes(await addResponseNote(formId, responseId, body))
      setBody('')
      onDirtyChange?.(false)
      onAdded()
    } catch (err) {
      setError(parseFormActionError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4" data-testid="response-notes">
      <p role="note" className="rounded-xl bg-slate-50 px-4 py-2.5 text-[11px] font-bold leading-6 text-slate-600">ملاحظات داخلية للفريق فقط. لا يراها المشارك ولا تدخل في التصدير، ولا يمكن تعديلها أو حذفها بعد كتابتها.</p>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700">
          {error}
          {notes === null && <button type="button" onClick={() => setAttempt((n) => n + 1)} className="rounded-lg bg-white px-3 py-1 font-black text-red-700 ring-1 ring-red-200">إعادة المحاولة</button>}
        </div>
      )}

      {notes === null && !error && <p className="text-xs font-bold text-slate-500">جارٍ تحميل الملاحظات...</p>}
      {notes?.length === 0 && <p className="rounded-xl bg-white px-4 py-6 text-center text-xs font-bold text-slate-500 ring-1 ring-deepBlue/[0.06]" data-testid="notes-empty">لا توجد ملاحظات على هذا الرد بعد.</p>}
      {notes !== null && notes.length > 0 && (
        <ol className="grid gap-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl bg-white p-3 ring-1 ring-deepBlue/[0.06]" data-testid="note">
              <p className="whitespace-pre-wrap break-words text-sm font-semibold text-deepBlue">{n.body}</p>
              <p className="mt-1.5 text-[11px] font-bold text-slate-500">{n.author?.name ?? 'موظف سابق'} · {formatDateTime(n.created_at)}</p>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={(e) => void submit(e)} className="grid gap-2">
        <label className="grid gap-1">
          <span className="text-[11px] font-black text-deepBlue">ملاحظة جديدة</span>
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); onDirtyChange?.(e.target.value.trim() !== '') }}
            maxLength={MAX}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-deepBlue"
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-slate-400">{body.length} / {MAX}</span>
          <button type="submit" disabled={saving || !body.trim()} className="rounded-xl bg-customBlue px-5 py-2 text-xs font-black text-white disabled:opacity-50">
            {saving ? 'جارٍ الإضافة...' : 'إضافة الملاحظة'}
          </button>
        </div>
      </form>
    </div>
  )
}
