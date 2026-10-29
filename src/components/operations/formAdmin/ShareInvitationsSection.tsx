import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { parseFormActionError } from '@/api/formsAdminApi'
import { inviteUser, revokeInvitation, searchInvitees } from '@/api/formsShareApi'
import type { InvitationRow, PersonRef, SharingData } from '@/api/formsShareApi'
import { formatDateTime } from '@/utils/dateTime'

const FIELD = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-deepBlue'

/**
 * The people a restricted form is open to.
 *
 * An invitation holds no link and no secret: the invited person opens the ordinary form address and must sign in as THAT account.
 * Forwarding the address gives nobody access, and removing an invitation takes the access back at once without touching what the
 * person already answered. People are found by name (at least three letters) and are shown by name only.
 */
export default function ShareInvitationsSection({
  data,
  formId,
  onChanged,
}: {
  data: SharingData
  formId: number
  onChanged: (next: SharingData) => void
}) {
  const canManage = data.abilities.manage
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PersonRef[]>([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const current = data.invitations.filter((i) => i.revoked_at === null)
  const past = data.invitations.filter((i) => i.revoked_at !== null)
  const term = query.trim()

  useEffect(() => {
    if (!canManage || term.length < 3) return
    let cancelled = false
    const timer = setTimeout(() => {
      setSearching(true)
      searchInvitees(formId, term)
        .then((rows) => { if (!cancelled) setResults(rows) })
        .catch((err) => { if (!cancelled) { setResults([]); setMessage({ tone: 'error', text: parseFormActionError(err) }) } })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [term, formId, canManage, data.invitations.length])

  async function invite(person: PersonRef) {
    setMessage(null)
    try {
      const row = await inviteUser(formId, person.id)
      onChanged({ ...data, invitations: [row, ...data.invitations.filter((i) => i.id !== row.id)] })
      setResults((r) => r.filter((p) => p.id !== person.id))
      setMessage({ tone: 'ok', text: `دُعي ${person.name}. عليه فتح رابط النموذج وتسجيل الدخول بحسابه.` })
    } catch (err) {
      setMessage({ tone: 'error', text: parseFormActionError(err) })
    }
  }

  async function revoke(row: InvitationRow) {
    setMessage(null)
    try {
      const next = await revokeInvitation(formId, row.id)
      onChanged({ ...data, invitations: data.invitations.map((i) => (i.id === next.id ? next : i)) })
      setMessage({ tone: 'ok', text: `أُلغيت دعوة ${row.user?.name ?? 'المستخدم'}. لم يعد بإمكانه فتح النموذج، وبقيت إجاباته السابقة كما هي.` })
    } catch (err) {
      setMessage({ tone: 'error', text: parseFormActionError(err) })
    }
  }

  return (
    <section aria-labelledby="share-invites-title" className="space-y-3 rounded-2xl bg-white p-5 text-right ring-1 ring-deepBlue/[0.06] sm:p-6">
      <div>
        <h3 id="share-invites-title" className="text-sm font-black text-deepBlue">المدعوّون</h3>
        <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">
          يفتح النموذج لهؤلاء فقط، وبعد تسجيل الدخول بحساباتهم. لا يوجد رابط خاص بالدعوة: عنوان النموذج نفسه يكفي لهم ولا يفيد غيرهم.
        </p>
      </div>

      {canManage && (
        <div className="space-y-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-deepBlue">ابحث عن مستخدم بالاسم (ثلاثة أحرف على الأقل)</span>
            <span className="relative block">
              <Search size={15} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => { setQuery(e.target.value); setResults([]); setMessage(null) }} className={`${FIELD} ps-9`} />
            </span>
          </label>
          {term.length >= 3 && (
            <ul aria-label="نتائج البحث" className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200" aria-busy={searching}>
              {results.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-sm font-bold text-deepBlue">{p.name}</span>
                  <button type="button" onClick={() => void invite(p)} aria-label={`دعوة ${p.name}`} className="rounded-lg bg-customBlue px-3 py-1.5 text-[11px] font-black text-white">
                    دعوة
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-3 py-3 text-center text-xs font-bold text-slate-500">{searching ? 'جارٍ البحث...' : 'لا توجد نتائج مطابقة.'}</li>
              )}
            </ul>
          )}
        </div>
      )}
      {!canManage && <p role="note" className="rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600">إدارة المدعوّين من صلاحية المالك ومديري المنصة.</p>}
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${message.tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
          {message.text}
        </p>
      )}

      {current.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm font-bold text-slate-500" data-testid="no-invitees">لم تُدعَ أي جهة بعد، فلا يستطيع أحد فتح هذا النموذج.</p>
      ) : (
        <ul aria-label="المدعوّون" className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
          {current.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5" data-testid="invitation-row">
              <div>
                <p className="text-sm font-black text-deepBlue">{row.user?.name ?? 'مستخدم محذوف'}</p>
                <p className="text-[11px] font-bold text-slate-400">دعاه {row.invited_by?.name ?? '—'}{row.created_at ? ` · ${formatDateTime(row.created_at)}` : ''}</p>
              </div>
              {canManage && (
                <button type="button" onClick={() => void revoke(row)} aria-label={`إلغاء دعوة ${row.user?.name ?? ''}`} className="rounded-lg px-2.5 py-1 text-[11px] font-black text-red-700 ring-1 ring-red-200 hover:bg-red-50">
                  إلغاء الدعوة
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <details className="rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600">
          <summary className="cursor-pointer">دعوات أُلغيت ({past.length})</summary>
          <ul className="mt-2 space-y-1">
            {past.map((row) => (
              <li key={row.id}>
                {row.user?.name ?? 'مستخدم محذوف'} — أُلغيت بواسطة {row.revoked_by?.name ?? '—'}{row.revoked_at ? ` · ${formatDateTime(row.revoked_at)}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
