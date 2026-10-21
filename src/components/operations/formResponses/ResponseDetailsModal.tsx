import { useEffect, useState } from 'react'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { downloadFormAnswerFile } from '@/api/formsApi'
import { parseFormActionError } from '@/api/formsAdminApi'
import { assignResponse, changeResponseStatus, fetchResponse, RESPONSE_STATUSES } from '@/api/formsResponsesApi'
import type { ResponseDetail, ResponseOptions, ResponseRow, ResponseStatus } from '@/api/formsResponsesApi'
import type { FormAnswerRow } from '@/types/operations'
import { formatDateTime } from '@/utils/dateTime'
import ResponseAnswers from './ResponseAnswers'
import ResponseNotes from './ResponseNotes'
import ResponseTimeline from './ResponseTimeline'
import { STATUS_AR, STATUS_TONE } from './responsesUi'

type Tab = 'answers' | 'notes' | 'history'

const TAB_AR: Record<Tab, string> = { answers: 'الإجابات', notes: 'الملاحظات الداخلية', history: 'السجل والتصحيحات' }
const FIELD = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue outline-none focus:border-customBlue disabled:opacity-60'

/**
 * One response, opened from the table (the table mounts it per response, so every response starts clean): its answers (with the labels of the version the respondent answered), who sent it and from
 * where, its review status and assignee, and, for those who may review, the internal notes and the history.
 *
 * What a person can do here is the server's decision, carried in `abilities`: someone who may only read the responses sees the
 * status and the assignee as text, and has no notes, history or correction controls at all.
 */
export default function ResponseDetailsModal({
  formId,
  row,
  options,
  onClose,
  onChanged,
}: {
  formId: number
  row: ResponseRow | null
  options: ResponseOptions | null
  onClose: () => void
  /** Called with the response after a change, so the table can follow it (and recount the statuses). */
  onChanged: (next: ResponseDetail) => void
}) {
  const [detail, setDetail] = useState<ResponseDetail | null>(null)
  const [tab, setTab] = useState<Tab>('answers')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [version, setVersion] = useState(0)

  const rowId = row?.id ?? null
  useEffect(() => {
    if (rowId === null) return
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchResponse(formId, rowId)
        if (!cancelled) setDetail(next)
      } catch {
        // The table already has the answers; without the detail the person simply gets the read-only view.
      }
    })()
    return () => { cancelled = true }
  }, [formId, rowId])

  // What is on screen: the freshest copy we have, starting from the table's own row.
  const shown: ResponseDetail | null = row ? detail ?? { ...row, abilities: { review: false, correct: false } } : null
  const canReview = Boolean(detail?.abilities.review)
  const canCorrect = Boolean(detail?.abilities.correct)
  const tabs: Tab[] = canReview ? ['answers', 'notes', 'history'] : ['answers']

  function apply(next: ResponseDetail, message?: string) {
    setDetail(next)
    setVersion((v) => v + 1)
    onChanged(next)
    if (message) setNotice(message)
  }

  async function run(action: () => Promise<ResponseDetail>, message: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      apply(await action(), message)
    } catch (e) {
      setError(parseFormActionError(e))
    } finally {
      setBusy(false)
    }
  }

  async function download(answer: FormAnswerRow) {
    setError(null)
    try {
      await downloadFormAnswerFile(formId, shown?.id ?? 0, answer.id, answer.file_name ?? 'attachment')
    } catch {
      setError('تعذّر تنزيل الملف. قد يكون محذوفاً أو لا تملك صلاحية الوصول إليه.')
    }
  }

  const status = shown?.status ?? 'new'

  return (
    <CenteredModal
      open={row !== null}
      onClose={onClose}
      busy={busy}
      dirty={dirty}
      dirtyTitle="تغييرات غير محفوظة"
      dirtyMessage="لديك تعديل لم يُحفظ في هذا الرد. إذا أغلقت النافذة الآن فسيضيع."
      title={shown ? `الإرسال رقم ${shown.id}` : 'الإرسال'}
      subtitle={shown ? `${shown.submitter_label ?? 'زائر'} · ${shown.submitted_at ? formatDateTime(shown.submitted_at) : ''}` : undefined}
      headerExtra={shown && <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${STATUS_TONE[status]}`}>{STATUS_AR[status]}</span>}
      size="lg"
      testId="response-details"
    >
      {shown && (
        <div className="grid gap-5 text-right" dir="rtl">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11px] sm:grid-cols-4">
            <div><dt className="font-black text-slate-400">المصدر</dt><dd className="font-bold text-deepBlue">{shown.source.type === 'link' ? `رابط: ${shown.source.label ?? 'مشاركة'}` : 'الرابط العام'}</dd></div>
            <div><dt className="font-black text-slate-400">إصدار النموذج</dt><dd className="font-bold text-deepBlue">{shown.form_version ?? '—'}</dd></div>
            <div>
              <dt className="font-black text-slate-400">الحالة</dt>
              <dd>
                {canReview ? (
                  <select
                    aria-label="حالة الرد"
                    value={status}
                    disabled={busy}
                    onChange={(e) => void run(() => changeResponseStatus(formId, shown.id, e.target.value as ResponseStatus), 'تم تحديث حالة الرد.')}
                    className={FIELD}
                  >
                    {RESPONSE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_AR[s]}</option>)}
                  </select>
                ) : <span className="font-bold text-deepBlue">{STATUS_AR[status]}</span>}
              </dd>
            </div>
            <div>
              <dt className="font-black text-slate-400">المُسنَد إليه</dt>
              <dd>
                {canReview ? (
                  <select
                    aria-label="إسناد الرد إلى"
                    value={shown.assignee ? String(shown.assignee.id) : ''}
                    disabled={busy}
                    onChange={(e) => void run(() => assignResponse(formId, shown.id, e.target.value ? Number(e.target.value) : null), e.target.value ? 'تم إسناد الرد.' : 'أُلغي إسناد الرد.')}
                    className={FIELD}
                  >
                    <option value="">غير مُسنَد</option>
                    {/* The current assignee stays in the list even if they could no longer be offered. */}
                    {shown.assignee && !(options?.assignable ?? []).some((p) => p.id === shown.assignee?.id) && <option value={String(shown.assignee.id)}>{shown.assignee.name}</option>}
                    {(options?.assignable ?? []).map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                  </select>
                ) : <span className="font-bold text-deepBlue">{shown.assignee?.name ?? '—'}</span>}
              </dd>
            </div>
          </dl>

          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800">{notice}</p>}

          {tabs.length > 1 && (
            <div role="tablist" aria-label="أقسام الرد" className="flex flex-wrap justify-end gap-2">
              {tabs.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`response-tab-${key}`}
                  aria-selected={tab === key}
                  aria-controls={`response-panel-${key}`}
                  onClick={() => setTab(key)}
                  className={`rounded-xl px-4 py-2 text-xs font-black ${tab === key ? 'bg-deepBlue text-white' : 'bg-white text-deepBlue ring-1 ring-deepBlue/[0.08]'}`}
                >
                  {TAB_AR[key]}
                </button>
              ))}
            </div>
          )}

          <div role="tabpanel" id={`response-panel-${tab}`} aria-labelledby={`response-tab-${tab}`}>
            {tab === 'answers' && (
              <ResponseAnswers
                formId={formId}
                response={shown}
                canCorrect={canCorrect}
                onDownload={(a) => void download(a)}
                onDirtyChange={setDirty}
                onCorrected={(next, changed) => apply(next, changed > 0 ? `تم حفظ التصحيح (${changed}). الإجابة الأصلية محفوظة في السجل.` : 'لم تتغير أي إجابة.')}
              />
            )}
            {tab === 'notes' && canReview && <ResponseNotes formId={formId} responseId={shown.id} onAdded={() => setVersion((v) => v + 1)} onDirtyChange={setDirty} />}
            {tab === 'history' && canReview && <ResponseTimeline formId={formId} responseId={shown.id} version={version} />}
          </div>
        </div>
      )}
    </CenteredModal>
  )
}
