import { useCallback, useEffect, useState } from 'react'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { fetchFormVersion, fetchFormVersions, parseFormActionError, restoreFormVersion } from '@/api/formsAdminApi'
import { formatDateTime } from '@/utils/dateTime'
import type { FormVersionDetail, FormVersionRow, OpsFormDefinition, PagedRows } from '@/types/operations'
import FormQuestionsList from './FormQuestionsList'
import { ORIGIN_AR } from './formAdminUi'

/**
 * Every publication of the form, newest first. A version is immutable: it can be read, and it can be restored into the
 * DRAFT (which publishes nothing and changes no version or answer). Making a restored draft live is the ordinary publish.
 */
export default function FormVersionsPanel({
  form,
  onRestored,
}: {
  form: OpsFormDefinition
  /** The rebuilt draft, so the page can show it in the editor. */
  onRestored: (next: OpsFormDefinition) => void
}) {
  const canRestore = form.abilities?.edit ?? false
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PagedRows<FormVersionRow> | null>(null)
  const [loadedPage, setLoadedPage] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<FormVersionDetail | null>(null)
  const [viewError, setViewError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<FormVersionRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setData(await fetchFormVersions(form.id, page))
      setLoadedPage(page)
    } catch (e) {
      setError(parseFormActionError(e))
    }
  }, [form.id, page])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchFormVersions(form.id, page)
        if (!cancelled) {
          setData(next)
          setLoadedPage(page)
        }
      } catch (e) {
        if (!cancelled) setError(parseFormActionError(e))
      }
    })()

    return () => { cancelled = true }
  }, [form.id, page])

  async function open(row: FormVersionRow) {
    setViewError(null)
    setActionError(null)
    try {
      setViewing(await fetchFormVersion(form.id, row.id))
    } catch (e) {
      setActionError(parseFormActionError(e))
    }
  }

  async function restore(row: FormVersionRow) {
    setBusy(true)
    setActionError(null)
    try {
      const next = await restoreFormVersion(form.id, row.id)
      setRestoring(null)
      setViewing(null)
      onRestored(next)
    } catch (e) {
      setRestoring(null)
      setActionError(parseFormActionError(e))
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p role="alert" className="font-black text-rose-800">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-deepBlue px-5 py-2 text-xs font-black text-white">إعادة المحاولة</button>
      </div>
    )
  }
  if (!data || loadedPage !== page) return <OpsPageSkeleton />

  return (
    <section aria-label="سجل الإصدارات" className="space-y-4 text-right">
      {actionError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">{actionError}</p>}

      {data.rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-sm font-bold text-slate-500 ring-1 ring-deepBlue/[0.06]">لم يُنشر هذا النموذج بعد، لذلك لا توجد إصدارات.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-deepBlue/[0.06]">
          {data.rows.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" data-testid="version-row">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-black text-deepBlue">
                  الإصدار {v.version_number}
                  {v.is_current && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">الحالي</span>}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                  {v.published_at ? formatDateTime(v.published_at) : '—'}
                  {v.publisher ? ` · ${v.publisher.name}` : ''} · {v.question_count} سؤال · {ORIGIN_AR[v.origin] ?? v.origin}
                </p>
                {v.note && <p className="mt-1 text-xs font-semibold text-slate-600">«{v.note}»</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void open(v)} className="rounded-lg px-3 py-1.5 text-xs font-black text-customBlue ring-1 ring-deepBlue/10 hover:bg-slate-50">
                  عرض
                </button>
                {canRestore && (
                  <button type="button" onClick={() => setRestoring(v)} className="rounded-lg px-3 py-1.5 text-xs font-black text-deepBlue ring-1 ring-deepBlue/10 hover:bg-slate-50">
                    استعادة إلى المسودة
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {data.lastPage > 1 && (
        <nav aria-label="تصفح الإصدارات" className="flex items-center justify-center gap-3 text-xs font-black text-deepBlue">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg px-3 py-1.5 ring-1 ring-deepBlue/10 disabled:opacity-40">السابق</button>
          <span>صفحة {data.currentPage} من {data.lastPage}</span>
          <button type="button" disabled={page >= data.lastPage} onClick={() => setPage((p) => p + 1)} className="rounded-lg px-3 py-1.5 ring-1 ring-deepBlue/10 disabled:opacity-40">التالي</button>
        </nav>
      )}

      <CenteredModal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? `الإصدار ${viewing.version_number}` : ''}
        subtitle={viewing?.title ?? undefined}
        size="md"
        testId="version-modal"
      >
        {viewing && (
          <div className="space-y-4 p-1">
            {viewError && <p role="alert" className="text-sm font-bold text-red-700">{viewError}</p>}
            {viewing.description && <p className="text-sm font-semibold leading-7 text-slate-600">{viewing.description}</p>}
            <FormQuestionsList questions={viewing.questions} ariaLabel={`أسئلة الإصدار ${viewing.version_number}`} />
            <p className="text-[11px] font-semibold text-slate-500">هذا ما رآه المجيبون في هذا الإصدار تماماً. لا يمكن تعديله.</p>
          </div>
        )}
      </CenteredModal>

      <ConfirmDialog
        open={restoring !== null}
        title="استعادة الإصدار إلى المسودة؟"
        description={restoring ? `ستُستبدل أسئلة المسودة الحالية بأسئلة الإصدار ${restoring.version_number}. لن يُنشر شيء، ولن يتغير أي إصدار أو إجابة. يمكنك مراجعة المسودة ثم نشرها كإصدار جديد.` : undefined}
        confirmLabel={busy ? 'جارٍ الاستعادة...' : 'استعادة'}
        variant="primary"
        onCancel={() => setRestoring(null)}
        onConfirm={() => restoring && void restore(restoring)}
      />
    </section>
  )
}
