import { useState } from 'react'
import { Archive, ArchiveRestore, Eye, Lock, LockOpen, Rocket, Undo2 } from 'lucide-react'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { archiveForm, closeForm, parseFormActionError, publishForm, reopenForm, unarchiveForm, unpublishForm } from '@/api/formsAdminApi'
import { FORM_STATUS_AR } from '@/data/operationsLabels'
import { formatDateTime } from '@/utils/dateTime'
import type { FormStatus, OpsFormDefinition } from '@/types/operations'
import { STATUS_BADGE, VISIBILITY_AR } from './formAdminUi'

type Action = 'publish' | 'close' | 'reopen' | 'unpublish' | 'archive' | 'unarchive'

const RUN: Record<Exclude<Action, 'publish'>, (id: number) => Promise<OpsFormDefinition>> = {
  close: closeForm,
  reopen: reopenForm,
  unpublish: unpublishForm,
  archive: archiveForm,
  unarchive: unarchiveForm,
}

const DONE: Record<Action, string> = {
  publish: 'تم نشر النموذج.',
  close: 'تم إغلاق النموذج.',
  reopen: 'أُعيد فتح النموذج.',
  unpublish: 'أُلغي نشر النموذج وعاد مسودة.',
  archive: 'تمت أرشفة النموذج.',
  unarchive: 'استُعيد النموذج من الأرشيف.',
}

const BUTTON = 'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition disabled:opacity-50'
const PRIMARY = `${BUTTON} bg-customBlue text-white shadow-md hover:opacity-90`
const NEUTRAL = `${BUTTON} bg-white text-deepBlue ring-1 ring-deepBlue/10 hover:bg-slate-50`

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-black text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-xs font-bold text-deepBlue">{children}</dd>
    </div>
  )
}

/**
 * The top of the form page: what state the form is in, who owns and last changed it, and the publishing controls.
 *
 * Every consequential action asks first, says what it will do, and reports success only after the server confirms it.
 * A failure is shown as such and nothing on the page changes.
 */
export default function FormStatusHeader({
  form,
  onChanged,
  onPreview,
  unsaved = false,
}: {
  form: OpsFormDefinition
  onChanged: (next: OpsFormDefinition) => void
  onPreview: () => void
  /** The editor holds changes the server has not stored yet: publishing now would leave them out, so it waits. */
  unsaved?: boolean
}) {
  const [pending, setPending] = useState<Action | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const status: FormStatus = form.status ?? 'draft'
  const can = form.abilities?.publish ?? false
  const version = form.current_version ?? null
  const changed = form.has_unpublished_changes === true
  const canPublish = can && status !== 'archived' && (status !== 'active' || changed)

  async function run(action: Action) {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const next = action === 'publish' ? await publishForm(form.id, note.trim() || undefined) : await RUN[action](form.id)
      onChanged(next)
      setDone(DONE[action])
      setPending(null)
      setNote('')
    } catch (e) {
      setError(parseFormActionError(e))
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  const confirm: Record<Exclude<Action, 'publish'>, { title: string; description: string; label: string; variant: 'danger' | 'primary' }> = {
    close: { title: 'إغلاق النموذج؟', description: 'لن يستقبل النموذج إجابات جديدة، ويظهر للزوار أنه مغلق. يمكنك إعادة فتحه لاحقاً.', label: 'إغلاق', variant: 'primary' },
    reopen: {
      title: 'إعادة فتح النموذج؟',
      description: `سيعود النموذج لاستقبال الإجابات على الإصدار المنشور ${version ?? ''}. تعديلات المسودة غير المنشورة لن تظهر للمجيبين.`,
      label: 'إعادة الفتح',
      variant: 'primary',
    },
    unpublish: {
      title: 'إلغاء نشر النموذج؟',
      description: 'سيتوقف الرابط العام عن العمل ويعود النموذج مسودة. الإصدارات والإجابات المحفوظة تبقى كما هي.',
      label: 'إلغاء النشر',
      variant: 'danger',
    },
    archive: {
      title: 'أرشفة النموذج؟',
      description: 'سيتوقف الرابط العام عن العمل ويُخفى النموذج من العمل اليومي. يمكن استعادته من الأرشيف.',
      label: 'أرشفة',
      variant: 'danger',
    },
    unarchive: {
      title: 'استعادة النموذج من الأرشيف؟',
      description: 'يعود النموذج مغلقاً إن كان قد نُشر من قبل، أو مسودة إن لم يُنشر. لا يُنشر تلقائياً.',
      label: 'استعادة',
      variant: 'primary',
    },
  }

  const nextVersion = (version ?? 0) + (changed || version === null ? 1 : 0)
  const target = pending && pending !== 'publish' ? confirm[pending] : null

  return (
    <section aria-label="حالة النموذج" className="rounded-[1.35rem] bg-white p-5 text-right shadow-lg ring-1 ring-deepBlue/[0.06] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black text-deepBlue">{form.title}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-black ${STATUS_BADGE[status]}`} data-testid="status-badge">
              {FORM_STATUS_AR[status] ?? status}
            </span>
            <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-black text-sky-700 ring-1 ring-sky-200" data-testid="version-badge">
              {version === null ? 'لم يُنشر بعد' : `الإصدار ${version}`}
            </span>
            {changed && version !== null && (
              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-800 ring-1 ring-amber-200">
                تعديلات غير منشورة
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-500" dir="ltr">
            /forms/{form.slug}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={NEUTRAL} onClick={onPreview}>
            <Eye size={14} aria-hidden /> معاينة المسودة
          </button>
          {can && canPublish && (
            <button type="button" className={PRIMARY} disabled={busy || unsaved} title={unsaved ? 'تُحفظ تعديلاتك تلقائياً؛ يمكنك النشر بعد اكتمال الحفظ.' : undefined} onClick={() => setPending('publish')}>
              <Rocket size={14} aria-hidden /> نشر
            </button>
          )}
          {can && status === 'active' && (
            <button type="button" className={NEUTRAL} disabled={busy} onClick={() => setPending('close')}>
              <Lock size={14} aria-hidden /> إغلاق
            </button>
          )}
          {can && status === 'closed' && version !== null && (
            <button type="button" className={NEUTRAL} disabled={busy} onClick={() => setPending('reopen')}>
              <LockOpen size={14} aria-hidden /> إعادة فتح
            </button>
          )}
          {can && (status === 'active' || status === 'closed') && (
            <button type="button" className={NEUTRAL} disabled={busy} onClick={() => setPending('unpublish')}>
              <Undo2 size={14} aria-hidden /> إلغاء النشر
            </button>
          )}
          {can && status !== 'archived' && (
            <button type="button" className={NEUTRAL} disabled={busy} onClick={() => setPending('archive')}>
              <Archive size={14} aria-hidden /> أرشفة
            </button>
          )}
          {can && status === 'archived' && (
            <button type="button" className={NEUTRAL} disabled={busy} onClick={() => setPending('unarchive')}>
              <ArchiveRestore size={14} aria-hidden /> استعادة من الأرشيف
            </button>
          )}
        </div>
      </div>

      {unsaved && can && canPublish && (
        <p role="note" className="mt-4 rounded-xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
          هناك تعديلات لم تُحفظ بعد. تُحفظ تلقائياً، ويمكنك النشر بعد اكتمال الحفظ حتى لا تُترك خارج الإصدار.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800">
          {done}
        </p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-4">
        <Fact label="المنشئ">{form.created_by?.name ?? '—'}</Fact>
        <Fact label="المالك">{form.owner?.name ?? '—'}</Fact>
        <Fact label="آخر من عدّل">{form.last_editor?.name ?? 'غير مسجَّل'}</Fact>
        <Fact label="آخر نشر">
          {form.published_at ? `${formatDateTime(form.published_at)}${form.publisher ? ` · ${form.publisher.name}` : ''}` : 'لم يُنشر بعد'}
        </Fact>
        <Fact label="الظهور">{form.visibility ? VISIBILITY_AR[form.visibility].label : '—'}</Fact>
        {form.submissions_count !== undefined && <Fact label="عدد الإجابات">{form.submissions_count}</Fact>}
        {form.submissions_count !== undefined && <Fact label="آخر إجابة">{form.last_submission_at ? formatDateTime(form.last_submission_at) : '—'}</Fact>}
        <Fact label="آخر تعديل للمسودة">{form.updated_at ? formatDateTime(form.updated_at) : '—'}</Fact>
      </dl>

      <CenteredModal
        open={pending === 'publish'}
        onClose={() => { if (!busy) setPending(null) }}
        busy={busy}
        title="نشر النموذج"
        subtitle={`سيُنشأ الإصدار ${nextVersion} من المسودة الحالية ويصبح ما يراه المجيبون.`}
        size="md"
        testId="publish-dialog"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={NEUTRAL} disabled={busy} onClick={() => setPending(null)}>
              إلغاء
            </button>
            <button type="button" className={PRIMARY} disabled={busy} onClick={() => void run('publish')}>
              {busy ? 'جارٍ النشر...' : `نشر الإصدار ${nextVersion}`}
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-1 text-right">
          <p className="text-sm font-semibold leading-7 text-slate-600">
            الإجابات التي وصلت قبل النشر تبقى مرتبطة بالإصدار الذي أُجيب عنه. لا يمكن تعديل إصدار منشور لاحقاً، لكن يمكنك استعادته إلى مسودة جديدة.
          </p>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-deepBlue">ملاحظة الإصدار (اختياري)</span>
            <input
              value={note}
              maxLength={255}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-deepBlue"
            />
          </label>
        </div>
      </CenteredModal>

      <ConfirmDialog
        open={target !== null}
        title={target?.title ?? ''}
        description={target?.description}
        confirmLabel={target?.label}
        variant={target?.variant}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && pending !== 'publish' && void run(pending)}
      />
    </section>
  )
}
