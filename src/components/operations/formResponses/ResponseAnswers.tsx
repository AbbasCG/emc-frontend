import { useMemo, useState } from 'react'
import { Download, Pencil } from 'lucide-react'
import QuestionField from '@/components/operations/formBuilder/QuestionField'
import type { AnswerValue } from '@/components/operations/formBuilder/formValidation'
import { parseFormActionError } from '@/api/formsAdminApi'
import { correctResponse, responseFieldErrors } from '@/api/formsResponsesApi'
import type { ResponseDetail } from '@/api/formsResponsesApi'
import type { FormAnswerRow } from '@/types/operations'
import { formatDateTime } from '@/utils/dateTime'
import { answerText, NOT_CORRECTABLE, questionOf, sameValue, startValue } from './responsesUi'

/**
 * The answers of one response, labelled as the respondent's published version had them. Someone who may correct answers can switch
 * to editing: each answer is drawn with the same control the respondent had, only the answers that changed are sent, the server holds
 * them to the version's own rules, and the value as first submitted is kept.
 */
export default function ResponseAnswers({
  formId,
  response,
  canCorrect,
  onDownload,
  onCorrected,
  onDirtyChange,
}: {
  formId: number
  response: ResponseDetail
  canCorrect: boolean
  onDownload: (answer: FormAnswerRow) => void
  onCorrected: (next: ResponseDetail, changed: number) => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const answers = useMemo(() => response.answers ?? [], [response.answers])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<number, AnswerValue>>({})
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const changed = answers.filter((a) => !NOT_CORRECTABLE.has(a.question_type ?? '') && a.question_id in draft && !sameValue(draft[a.question_id], startValue(a)))

  function begin() {
    setDraft(Object.fromEntries(answers.filter((a) => !NOT_CORRECTABLE.has(a.question_type ?? '')).map((a) => [a.question_id, startValue(a)])))
    setReason('')
    setErrors({})
    setMessage(null)
    setEditing(true)
  }

  function stop() {
    setEditing(false)
    onDirtyChange?.(false)
  }

  function edit(id: number, value: AnswerValue) {
    setDraft((d) => ({ ...d, [id]: value }))
    setErrors((e) => {
      const next = { ...e }
      delete next[id]
      return next
    })
    onDirtyChange?.(true)
  }

  async function save() {
    if (changed.length === 0) {
      setMessage('لم تغيّر أي إجابة بعد.')
      return
    }
    setSaving(true)
    setMessage(null)
    setErrors({})
    try {
      const corrections: Record<number, string | string[] | null> = {}
      for (const a of changed) {
        const v = draft[a.question_id]
        corrections[a.question_id] = Array.isArray(v) ? v : typeof v === 'string' ? v : null
      }
      const result = await correctResponse(formId, response.id, corrections, reason)
      stop()
      onCorrected(result.response, result.changed)
    } catch (e) {
      const fields = responseFieldErrors(e)
      setErrors(fields)
      setMessage(Object.keys(fields).length > 0 ? 'راجع الإجابات المحدّدة أدناه ثم أعد المحاولة.' : parseFormActionError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4" data-testid="response-answers">
      {response.source.type === 'link' && (
        <p className="text-[11px] font-black text-slate-500" data-testid="via-link">وصلت عبر رابط المشاركة: {response.source.label ?? response.share_link?.label}</p>
      )}

      {canCorrect && !editing && answers.length > 0 && (
        <div className="flex justify-start">
          <button type="button" onClick={begin} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-customBlue ring-1 ring-customBlue/30 hover:bg-brand-50">
            <Pencil size={13} aria-hidden />
            تصحيح الإجابات
          </button>
        </div>
      )}

      {editing && (
        <p role="note" className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-900">
          أنت تصحّح إجابات أرسلها المشارك. تبقى الإجابة الأصلية محفوظة، ويُسجَّل من صحّح وماذا تغيّر ومتى. التصحيح يخضع لقواعد الإصدار الذي أجاب عليه المشارك.
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-2">
        {answers.map((a, index) => {
          const editable = editing && !NOT_CORRECTABLE.has(a.question_type ?? '')
          return (
            <div key={a.id} className={`rounded-xl bg-white p-3 ring-1 ${errors[a.question_id] ? 'ring-red-300' : 'ring-deepBlue/[0.06]'} ${editable ? 'sm:col-span-2' : ''}`}>
              {editable ? (
                <QuestionField
                  q={questionOf(a, index)}
                  value={draft[a.question_id]}
                  onChange={(v) => edit(a.question_id, v)}
                  fieldId={`correct-${a.question_id}`}
                  error={errors[a.question_id]}
                />
              ) : (
                <>
                  <dt className="flex flex-wrap items-center gap-2 text-[11px] font-black text-slate-500">
                    {a.question_label ?? `سؤال ${a.question_id}`}
                    {a.question_deleted ? ' (سؤال محذوف)' : ''}
                    {a.corrected && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-800 ring-1 ring-violet-200">مُصحَّحة</span>}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-deepBlue">
                    {a.has_file ? (
                      <button type="button" onClick={() => onDownload(a)} className="inline-flex items-center gap-1.5 text-customBlue hover:underline">
                        <Download size={14} aria-hidden />
                        تنزيل {a.file_name ?? 'المرفق'}
                      </button>
                    ) : (
                      answerText(a) || <span className="text-slate-400">—</span>
                    )}
                  </dd>
                </>
              )}
            </div>
          )
        })}
      </dl>

      {editing && (
        <div className="grid gap-3 rounded-2xl bg-slate-50 p-4">
          <label className="grid gap-1">
            <span className="text-[11px] font-black text-deepBlue">سبب التصحيح (اختياري)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-deepBlue"
              placeholder="مثال: صحّح المشارك الاسم عبر الهاتف"
            />
          </label>
          {message && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{message}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="me-auto text-[11px] font-bold text-slate-500">{changed.length > 0 ? `${changed.length} إجابة معدَّلة` : 'لا تعديلات'}</span>
            <button type="button" disabled={saving} onClick={stop} className="rounded-xl px-4 py-2 text-xs font-black text-deepBlue ring-1 ring-deepBlue/10 disabled:opacity-50">إلغاء</button>
            <button type="button" disabled={saving || changed.length === 0} onClick={() => void save()} className="rounded-xl bg-customBlue px-5 py-2 text-xs font-black text-white disabled:opacity-50">
              {saving ? 'جارٍ الحفظ...' : 'حفظ التصحيح'}
            </button>
          </div>
        </div>
      )}

      {response.corrected && response.corrected_at && !editing && (
        <p className="text-[11px] font-bold text-slate-500">آخر تصحيح: {formatDateTime(response.corrected_at)}</p>
      )}
    </div>
  )
}
