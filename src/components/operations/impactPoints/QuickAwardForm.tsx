import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import toast from '@/lib/toast'
import { AWARD_CATEGORIES, awardPoints, fetchPointRecipients, type PointRecipient } from '@/api/volunteerPointsApi'
import MemberMultiSelect from './MemberMultiSelect'
import { fieldClass, formatNumber, httpStatus, serverMessage } from './impactPointsUi'

type Failure = { id: number; name: string; message: string }

type Props = {
  monthlyCap: number
  /** Set by a row's "منح" button to add that member to the selection. */
  preselectUserId?: number | null
  /** Refresh the list and KPIs after at least one award succeeded. */
  onAwarded: () => void
}

/**
 * Award points to one or more eligible team members.
 *
 * Rendered only for users whose server capabilities say can_award; the picker
 * lists exactly the recipients the server returns for that user's scope.
 *
 * The award endpoint takes ONE user, so a multi-person award is submitted as
 * one request per person, in order. Each person is independent: a refusal (cap
 * reached, no longer eligible…) never blocks the others, and nobody is awarded
 * twice — people who succeeded leave the selection, so retrying a partial
 * failure resubmits only the people who failed. A 401/403/419 stops the batch,
 * since every remaining request would be refused the same way.
 */
export default function QuickAwardForm({ monthlyCap, preselectUserId, onAwarded }: Props) {
  const [people, setPeople] = useState<PointRecipient[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [form, setForm] = useState({ category: 'task', points: '', reason: '' })
  const [granting, setGranting] = useState(false)
  const [failures, setFailures] = useState<Failure[]>([])
  const formRef = useRef<HTMLElement>(null)

  // Bumping the nonce re-runs the fetch effect (retry); state is only set from
  // the request's callbacks.
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    void fetchPointRecipients()
      .then((rows) => { if (alive) { setPeople(rows); setStatus('ready') } })
      .catch(() => { if (alive) { setPeople([]); setStatus('error') } })
    return () => { alive = false }
  }, [nonce])

  function retryLoad() {
    setStatus('loading')
    setNonce((n) => n + 1)
  }

  // A row's "منح" button adds that member: adjust state while rendering when the
  // prop changes (no effect-driven setState), then bring the form into view.
  const [seenPreselect, setSeenPreselect] = useState(preselectUserId)
  if (preselectUserId !== seenPreselect) {
    setSeenPreselect(preselectUserId)
    if (preselectUserId) setSelectedIds((ids) => (ids.includes(preselectUserId) ? ids : [...ids, preselectUserId]))
  }

  useEffect(() => {
    if (preselectUserId) formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  }, [preselectUserId])

  const single = selectedIds.length === 1 ? people.find((p) => p.user_id === selectedIds[0]) : undefined

  async function submit() {
    if (selectedIds.length === 0 || !form.points || !form.reason.trim()) {
      toast.error('اختر عضواً واحداً على الأقل، وأدخل النقاط والسبب')
      return
    }

    setGranting(true)
    setFailures([])

    const points = Number(form.points)
    const reason = form.reason.trim()
    const nameOf = (id: number) => people.find((p) => p.user_id === id)?.name ?? `عضو #${id}`

    const succeeded: number[] = []
    const failed: Failure[] = []

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i]
      try {
        await awardPoints({ user_id: id, category: form.category, points, reason })
        succeeded.push(id)
      } catch (err) {
        const message = serverMessage(err, 'تعذر منح النقاط')
        failed.push({ id, name: nameOf(id), message })

        const status = httpStatus(err)
        if (status === 401 || status === 403 || status === 419) {
          // Not authorized: the rest would be refused identically.
          for (const rest of selectedIds.slice(i + 1)) failed.push({ id: rest, name: nameOf(rest), message })
          break
        }
      }
    }

    setGranting(false)
    // Only the people who still need the award stay selected — a retry can never double-award.
    setSelectedIds(failed.map((f) => f.id))
    setFailures(failed)

    if (succeeded.length > 0) {
      onAwarded()
      void fetchPointRecipients().then(setPeople).catch(() => undefined)
    }

    if (failed.length === 0) {
      setForm({ category: 'task', points: '', reason: '' })
      toast.success(succeeded.length === 1 ? 'مُنحت النقاط ووُثِّق السبب' : `مُنحت النقاط لـ ${succeeded.length} أعضاء ووُثِّق السبب`)
    } else if (succeeded.length > 0) {
      toast.warning(`نجحت المنح لـ ${succeeded.length} وتعذّرت لـ ${failed.length} — راجع التفاصيل أدناه`)
    } else {
      toast.error(failed.length === 1 ? failed[0].message : 'تعذر منح النقاط لأي من المحدَّدين')
    }
  }

  return (
    <section ref={formRef} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-black text-navy">منح نقاط لأعضاء الفريق</h2>
      <p className="mt-1 text-xs font-semibold leading-6 text-muted-500">
        لا مجاملة في النقاط: كل منحة تسجَّل باسم مانحها وسببها. السقف الشهري لكل عضو {formatNumber(monthlyCap)} نقطة.
      </p>

      <div className="mt-3 grid gap-3">
        <MemberMultiSelect
          label="الأعضاء المستحقون"
          people={people}
          selectedIds={selectedIds}
          onChange={(ids) => { setSelectedIds(ids); setFailures([]) }}
          status={status}
          onRetry={retryLoad}
          disabled={granting}
        />

        {single && (
          <p className="text-[11px] font-bold text-muted-500">
            رصيده التراكمي {formatNumber(single.lifetime_points)} نقطة · المتبقي من سقف هذا الشهر{' '}
            {formatNumber(Math.max(0, monthlyCap - single.month_points))} نقطة
          </p>
        )}
        {selectedIds.length > 1 && (
          <p className="text-[11px] font-bold text-muted-500">
            ستُمنح النقاط والسبب نفسهما لكل واحد من المحدَّدين ({selectedIds.length})، وتُسجَّل كل منحة على حدة.
          </p>
        )}

        <select
          aria-label="فئة النقاط"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          className={fieldClass}
        >
          {AWARD_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <input
          type="number"
          dir="ltr"
          aria-label="عدد النقاط"
          placeholder="النقاط لكل عضو (مثال: 150)"
          value={form.points}
          onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
          className={fieldClass}
        />

        <input
          aria-label="سبب المنح"
          placeholder="السبب — يُوثَّق في السجل"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          className={fieldClass}
        />
      </div>

      {failures.length > 0 && (
        <div role="alert" className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3">
          <p className="text-xs font-black text-rose-700">تعذّرت المنح لـ {failures.length} — ما زالوا محدَّدين لإعادة المحاولة:</p>
          <ul className="mt-1.5 space-y-1">
            {failures.map((f) => (
              <li key={f.id} className="text-[11px] font-semibold leading-5 text-rose-700">
                <span className="font-black">{f.name}:</span> {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        disabled={granting || status !== 'ready' || people.length === 0}
        onClick={() => void submit()}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-accent-600 disabled:opacity-60"
      >
        <Send size={14} aria-hidden="true" />
        {granting ? 'جارٍ المنح…' : selectedIds.length > 1 ? `امنح النقاط (${selectedIds.length})` : 'امنح النقاط'}
      </button>
    </section>
  )
}
