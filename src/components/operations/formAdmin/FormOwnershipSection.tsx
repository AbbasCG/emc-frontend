import { useEffect, useState } from 'react'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { parseFormActionError, searchFormCollaboratorCandidates, transferFormOwnership } from '@/api/formsAdminApi'
import type { FormEmployee, OpsFormDefinition } from '@/types/operations'
import { FORM_ROLE_AR } from './formAdminUi'

/**
 * Hands the form to another employee. Only the owner and platform admins see it. The creator never changes (it is history);
 * the previous owner keeps access only if you say so.
 */
export default function FormOwnershipSection({
  form,
  onTransferred,
  onAccessRemoved,
}: {
  form: OpsFormDefinition
  onTransferred: (next: OpsFormDefinition) => void
  onAccessRemoved: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FormEmployee[]>([])
  const [target, setTarget] = useState<FormEmployee | null>(null)
  const [keep, setKeep] = useState<'none' | 'viewer' | 'editor'>('none')
  const [keepResponses, setKeepResponses] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) return
    let cancelled = false
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const rows = await searchFormCollaboratorCandidates(form.id, query.trim())
          if (!cancelled) {
            setResults(rows)
            setSearchError(null)
          }
        } catch (e) {
          if (!cancelled) setSearchError(parseFormActionError(e))
        }
      })()
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [form.id, query])

  const shown = query.trim().length < 2 ? [] : results

  async function transfer() {
    if (!target) return
    setBusy(true)
    setError(null)
    try {
      const result = await transferFormOwnership(form.id, { owner_id: target.id, keep_access: keep, keep_responses: keep !== 'none' && keepResponses })
      setConfirming(false)
      if (result.accessRemoved) {
        onAccessRemoved()
        return
      }
      onTransferred(result.form)
      setDone(`انتقلت ملكية النموذج إلى ${target.name}.`)
      setTarget(null)
      setQuery('')
    } catch (e) {
      setConfirming(false)
      setError(parseFormActionError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="ownership-title" className="rounded-2xl bg-white p-5 text-right ring-1 ring-deepBlue/[0.06]">
      <h3 id="ownership-title" className="text-sm font-black text-deepBlue">ملكية النموذج</h3>
      <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">
        المالك الحالي: <strong className="text-deepBlue">{form.owner?.name ?? '—'}</strong> — المنشئ الأصلي: <strong className="text-deepBlue">{form.created_by?.name ?? '—'}</strong> (لا يتغير).
        نقل الملكية يغيّر من يملك قرار مشاركة النموذج وظهوره.
      </p>

      <label className="mt-4 grid gap-1.5">
        <span className="text-xs font-black text-deepBlue">ابحث عن المالك الجديد بالاسم</span>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setTarget(null); setDone(null) }}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-deepBlue"
          placeholder="حرفان على الأقل"
        />
      </label>
      {searchError && <p role="alert" className="mt-2 text-xs font-bold text-red-700">{searchError}</p>}
      {shown.length > 0 && !target && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200" aria-label="نتائج البحث">
          {shown.map((u) => (
            <li key={u.id}>
              <button type="button" onClick={() => setTarget(u)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-right text-sm hover:bg-slate-50">
                <span className="font-black text-deepBlue">{u.name}</span>
                <span className="text-[11px] font-semibold text-slate-500">{FORM_ROLE_AR[u.role] ?? u.role}{u.departments.length > 0 ? ` · ${u.departments.join('، ')}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {target && (
        <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-black text-deepBlue">المالك الجديد: {target.name}</p>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-deepBlue">وصول المالك الحالي بعد النقل</span>
            <select value={keep} onChange={(e) => setKeep(e.target.value as 'none' | 'viewer' | 'editor')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue">
              <option value="none">لا وصول</option>
              <option value="viewer">مشاهد</option>
              <option value="editor">محرّر</option>
            </select>
          </label>
          {keep !== 'none' && (
            <label className="flex items-center gap-2 text-xs font-black text-deepBlue">
              <input type="checkbox" checked={keepResponses} onChange={(e) => setKeepResponses(e.target.checked)} className="accent-customBlue" />
              يبقى قادراً على قراءة الإجابات
            </label>
          )}
          <button type="button" onClick={() => setConfirming(true)} disabled={busy} className="rounded-xl bg-deepBlue px-4 py-2 text-xs font-black text-white disabled:opacity-50">
            نقل الملكية
          </button>
        </div>
      )}

      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">{error}</p>}
      {done && <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">{done}</p>}

      <ConfirmDialog
        open={confirming}
        title="نقل ملكية النموذج؟"
        description={`ستنتقل الملكية إلى ${target?.name ?? ''}.${keep === 'none' ? ' لن يبقى لك أي وصول إلى النموذج بعد النقل.' : ''}`}
        confirmLabel={busy ? 'جارٍ النقل...' : 'نقل الملكية'}
        variant="danger"
        onCancel={() => setConfirming(false)}
        onConfirm={() => void transfer()}
      />
    </section>
  )
}
