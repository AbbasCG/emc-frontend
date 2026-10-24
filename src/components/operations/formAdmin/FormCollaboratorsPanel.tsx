import { useCallback, useEffect, useState } from 'react'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import {
  addFormCollaborator,
  fetchFormCollaborators,
  parseFormActionError,
  removeFormCollaborator,
  searchFormCollaboratorCandidates,
  updateFormCollaborator,
} from '@/api/formsAdminApi'
import { formatDateTime } from '@/utils/dateTime'
import type { FormCollaboratorLevel, FormCollaboratorRow, FormEmployee, OpsFormDefinition } from '@/types/operations'
import { FORM_ROLE_AR } from './formAdminUi'

const LEVEL_AR: Record<FormCollaboratorLevel, string> = { viewer: 'مشاهد', editor: 'محرّر' }

/**
 * The people a form is shared with. Anyone who may change the form sees the list; adding, changing and removing belong to the
 * owner and platform admins. A viewer can read the form, an editor can change it, and reading the responses is a separate
 * switch for each person, so editing never opens confidential answers.
 */
export default function FormCollaboratorsPanel({ form }: { form: OpsFormDefinition }) {
  const canManage = form.abilities?.manage_access ?? false
  const [rows, setRows] = useState<FormCollaboratorRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | 'add' | null>(null)
  const [removing, setRemoving] = useState<FormCollaboratorRow | null>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FormEmployee[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [chosen, setChosen] = useState<FormEmployee | null>(null)
  const [level, setLevel] = useState<FormCollaboratorLevel>('viewer')
  const [responses, setResponses] = useState(false)
  const [corrects, setCorrects] = useState(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setRows(await fetchFormCollaborators(form.id))
    } catch (e) {
      setLoadError(parseFormActionError(e))
    }
  }, [form.id])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchFormCollaborators(form.id)
        if (!cancelled) setRows(next)
      } catch (e) {
        if (!cancelled) setLoadError(parseFormActionError(e))
      }
    })()

    return () => { cancelled = true }
  }, [form.id])

  useEffect(() => {
    if (!canManage || query.trim().length < 2) return
    let cancelled = false
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const found = await searchFormCollaboratorCandidates(form.id, query.trim())
          if (!cancelled) {
            setResults(found)
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
  }, [canManage, form.id, query])

  const shown = query.trim().length < 2 ? [] : results

  async function add() {
    if (!chosen) return
    setBusyId('add')
    setError(null)
    setDone(null)
    try {
      const row = await addFormCollaborator(form.id, { user_id: chosen.id, access_level: level, can_view_responses: responses, ...(responses && corrects ? { can_correct_responses: true } : {}) })
      setRows((prev) => [...(prev ?? []), row])
      setDone(`أُضيف ${chosen.name} كـ${LEVEL_AR[level]}.`)
      setChosen(null)
      setQuery('')
      setResults([])
      setLevel('viewer')
      setResponses(false)
      setCorrects(false)
    } catch (e) {
      setError(parseFormActionError(e))
    } finally {
      setBusyId(null)
    }
  }

  async function change(row: FormCollaboratorRow, patch: Partial<{ access_level: FormCollaboratorLevel; can_view_responses: boolean; can_correct_responses: boolean }>) {
    setBusyId(row.id)
    setError(null)
    setDone(null)
    try {
      const next = await updateFormCollaborator(form.id, row.id, {
        access_level: patch.access_level ?? row.access_level,
        can_view_responses: patch.can_view_responses ?? row.can_view_responses,
        // Left out unless it is what is being changed: the server keeps the grant as it is.
        ...(patch.can_correct_responses !== undefined ? { can_correct_responses: patch.can_correct_responses } : {}),
      })
      setRows((prev) => (prev ?? []).map((r) => (r.id === row.id ? next : r)))
      setDone('تم تحديث الصلاحيات.')
    } catch (e) {
      setError(parseFormActionError(e))
    } finally {
      setBusyId(null)
    }
  }

  async function remove(row: FormCollaboratorRow) {
    setBusyId(row.id)
    setError(null)
    setDone(null)
    try {
      await removeFormCollaborator(form.id, row.id)
      setRows((prev) => (prev ?? []).filter((r) => r.id !== row.id))
      setDone(`أُزيل ${row.user.name} من المتعاونين.`)
    } catch (e) {
      setError(parseFormActionError(e))
    } finally {
      setBusyId(null)
      setRemoving(null)
    }
  }

  if (loadError) {
    return (
      <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p role="alert" className="font-black text-rose-800">{loadError}</p>
        <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-deepBlue px-5 py-2 text-xs font-black text-white">إعادة المحاولة</button>
      </div>
    )
  }
  if (rows === null) return <OpsPageSkeleton />

  return (
    <div className="space-y-6 text-right">
      {canManage && (
        <section aria-labelledby="add-collab" className="rounded-2xl bg-white p-5 ring-1 ring-deepBlue/[0.06]">
          <h3 id="add-collab" className="text-sm font-black text-deepBlue">إضافة متعاون</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">يمكن مشاركة النموذج مع موظفين من أقسام أخرى دون فتح بقية نماذج أقسامهم.</p>
          <label className="mt-3 grid gap-1.5">
            <span className="text-xs font-black text-deepBlue">ابحث عن موظف بالاسم</span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setChosen(null); setDone(null) }}
              placeholder="حرفان على الأقل"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-deepBlue"
            />
          </label>
          {searchError && <p role="alert" className="mt-2 text-xs font-bold text-red-700">{searchError}</p>}
          {query.trim().length >= 2 && !chosen && shown.length === 0 && !searchError && (
            <p className="mt-2 text-xs font-bold text-slate-500">لا يوجد موظفون مؤهلون بهذا الاسم.</p>
          )}
          {shown.length > 0 && !chosen && (
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200" aria-label="نتائج البحث">
              {shown.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => setChosen(u)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-right text-sm hover:bg-slate-50">
                    <span className="font-black text-deepBlue">{u.name}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{FORM_ROLE_AR[u.role] ?? u.role}{u.departments.length > 0 ? ` · ${u.departments.join('، ')}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {chosen && (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4">
              <p className="w-full text-sm font-black text-deepBlue">{chosen.name}</p>
              <label className="grid gap-1">
                <span className="text-[11px] font-black text-deepBlue">المستوى</span>
                <select value={level} onChange={(e) => setLevel(e.target.value as FormCollaboratorLevel)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue">
                  <option value="viewer">مشاهد</option>
                  <option value="editor">محرّر</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pb-2 text-xs font-black text-deepBlue">
                <input type="checkbox" checked={responses} onChange={(e) => setResponses(e.target.checked)} className="accent-customBlue" />
                يستطيع قراءة الإجابات
              </label>
              <label className="flex items-center gap-2 pb-2 text-xs font-black text-deepBlue">
                <input type="checkbox" checked={responses && corrects} disabled={!responses} onChange={(e) => setCorrects(e.target.checked)} className="accent-customBlue" />
                يستطيع تصحيح الإجابات
              </label>
              <button type="button" disabled={busyId === 'add'} onClick={() => void add()} className="rounded-xl bg-customBlue px-5 py-2 text-xs font-black text-white disabled:opacity-50">
                {busyId === 'add' ? 'جارٍ الإضافة...' : 'إضافة'}
              </button>
            </div>
          )}
        </section>
      )}

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">{error}</p>}
      {done && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800">{done}</p>}

      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-deepBlue/[0.06]">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-black text-slate-500">
            <tr>
              <th className="px-4 py-3">الموظف</th>
              <th className="px-4 py-3">المستوى</th>
              <th className="px-4 py-3">قراءة الإجابات</th>
              <th className="px-4 py-3">تصحيح الإجابات</th>
              <th className="px-4 py-3">مُنح بواسطة</th>
              {canManage && <th className="px-4 py-3"><span className="sr-only">إجراءات</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={canManage ? 6 : 5} className="px-4 py-10 text-center text-xs font-bold text-slate-500">لم تتم مشاركة النموذج مع أحد بعد.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 font-semibold text-deepBlue">
                <td className="px-4 py-3">
                  <span className="block font-black">{r.user.name}</span>
                  <span className="block text-[11px] text-slate-500">{FORM_ROLE_AR[r.user.role] ?? r.user.role}{r.user.departments.length > 0 ? ` · ${r.user.departments.join('، ')}` : ''}</span>
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <select
                      aria-label={`مستوى ${r.user.name}`}
                      value={r.access_level}
                      disabled={busyId === r.id}
                      onChange={(e) => void change(r, { access_level: e.target.value as FormCollaboratorLevel })}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold"
                    >
                      <option value="viewer">مشاهد</option>
                      <option value="editor">محرّر</option>
                    </select>
                  ) : (
                    LEVEL_AR[r.access_level]
                  )}
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <input
                      type="checkbox"
                      aria-label={`قراءة الإجابات لـ ${r.user.name}`}
                      checked={r.can_view_responses}
                      disabled={busyId === r.id}
                      onChange={(e) => void change(r, { can_view_responses: e.target.checked })}
                      className="accent-customBlue"
                    />
                  ) : r.can_view_responses ? 'نعم' : 'لا'}
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <input
                      type="checkbox"
                      aria-label={`تصحيح الإجابات لـ ${r.user.name}`}
                      checked={Boolean(r.can_correct_responses)}
                      disabled={busyId === r.id || !r.can_view_responses}
                      onChange={(e) => void change(r, { can_correct_responses: e.target.checked })}
                      className="accent-customBlue"
                    />
                  ) : r.can_correct_responses ? 'نعم' : 'لا'}
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.granted_by?.name ?? '—'}
                  <span className="block text-[11px] text-slate-500">{r.granted_at ? formatDateTime(r.granted_at) : ''}</span>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <button type="button" disabled={busyId === r.id} onClick={() => setRemoving(r)} className="text-[11px] font-black text-red-600 hover:underline disabled:opacity-50">
                      إزالة
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={removing !== null}
        title="إزالة المتعاون؟"
        description={removing ? `سيفقد ${removing.user.name} وصوله إلى هذا النموذج فوراً.` : undefined}
        confirmLabel="إزالة"
        variant="danger"
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && void remove(removing)}
      />
    </div>
  )
}
