import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import toast from '@/lib/toast'
import { AWARD_CATEGORIES, awardPoints, fetchPointRecipients, type PointRecipient } from '@/api/volunteerPointsApi'
import { fieldClass, formatNumber, serverMessage } from './impactPointsUi'

function recipientLabel(r: PointRecipient): string {
  return [r.name, r.department ?? 'بدون إدارة', r.role_title].filter(Boolean).join(' — ')
}

type Props = {
  monthlyCap: number
  /** Set by a row's "منح" button to pick that member in the form. */
  preselectUserId?: number | null
  /** Refresh the list and KPIs after an award. */
  onAwarded: () => void
}

/**
 * Award points to an eligible team member. Rendered only for users whose
 * server capabilities say can_award; the picker lists exactly the recipients
 * the server returns for that user's scope.
 */
export default function QuickAwardForm({ monthlyCap, preselectUserId, onAwarded }: Props) {
  const [people, setPeople] = useState<PointRecipient[]>([])
  const [failed, setFailed] = useState(false)
  const [grant, setGrant] = useState({ user_id: '' as number | '', category: 'task', points: '', reason: '' })
  const [granting, setGranting] = useState(false)
  const pickerRef = useRef<HTMLSelectElement>(null)

  async function loadRecipients(): Promise<void> {
    try {
      setPeople(await fetchPointRecipients())
      setFailed(false)
    } catch {
      setPeople([])
      setFailed(true)
    }
  }

  useEffect(() => {
    let alive = true
    void fetchPointRecipients()
      .then((rows) => { if (alive) { setPeople(rows); setFailed(false) } })
      .catch(() => { if (alive) { setPeople([]); setFailed(true) } })
    return () => { alive = false }
  }, [])

  // A row's "منح" button picks that member: adjust state while rendering when
  // the prop changes (no effect-driven setState), then move focus to the picker.
  const [seenPreselect, setSeenPreselect] = useState(preselectUserId)
  if (preselectUserId !== seenPreselect) {
    setSeenPreselect(preselectUserId)
    if (preselectUserId) setGrant((g) => ({ ...g, user_id: preselectUserId }))
  }

  useEffect(() => {
    if (!preselectUserId) return
    pickerRef.current?.focus()
    pickerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  }, [preselectUserId])

  const selected = people.find((p) => p.user_id === grant.user_id)

  async function submit() {
    if (!grant.user_id || !grant.points || !grant.reason.trim()) {
      toast.error('العضو والنقاط والسبب حقول لازمة')
      return
    }
    setGranting(true)
    try {
      await awardPoints({
        user_id: grant.user_id,
        category: grant.category,
        points: Number(grant.points),
        reason: grant.reason.trim(),
      })
      toast.success('مُنحت النقاط ووُثِّق السبب')
      setGrant({ user_id: '', category: 'task', points: '', reason: '' })
      await loadRecipients()
      onAwarded()
    } catch (err) {
      toast.error(serverMessage(err, 'تعذر منح النقاط'))
    } finally {
      setGranting(false)
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-black text-navy">منح نقاط لأعضاء الفريق</h2>
      <p className="mt-1 text-xs font-semibold leading-6 text-muted-500">
        لا مجاملة في النقاط: كل منحة تسجَّل باسم مانحها وسببها. السقف الشهري لكل عضو {formatNumber(monthlyCap)} نقطة.
      </p>

      {failed ? (
        <p role="alert" className="mt-3 text-xs font-bold text-rose-600">تعذر تحميل قائمة الأعضاء المستحقين.</p>
      ) : people.length === 0 ? (
        <p className="mt-3 text-xs font-bold text-muted-500">لا يوجد أعضاء فريق ضمن نطاق صلاحيتك حالياً.</p>
      ) : null}

      <div className="mt-3 grid gap-3">
        <select
          ref={pickerRef}
          aria-label="العضو المستحق"
          value={grant.user_id}
          onChange={(e) => setGrant((g) => ({ ...g, user_id: e.target.value ? Number(e.target.value) : '' }))}
          className={fieldClass}
        >
          <option value="">اختر العضو…</option>
          {people.map((p) => (
            <option key={p.user_id} value={p.user_id}>{recipientLabel(p)}</option>
          ))}
        </select>

        {selected && (
          <p className="text-[11px] font-bold text-muted-500">
            رصيده التراكمي {formatNumber(selected.lifetime_points)} نقطة · المتبقي من سقف هذا الشهر{' '}
            {formatNumber(Math.max(0, monthlyCap - selected.month_points))} نقطة
          </p>
        )}

        <select
          aria-label="فئة النقاط"
          value={grant.category}
          onChange={(e) => setGrant((g) => ({ ...g, category: e.target.value }))}
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
          placeholder="النقاط (مثال: 150)"
          value={grant.points}
          onChange={(e) => setGrant((g) => ({ ...g, points: e.target.value }))}
          className={fieldClass}
        />

        <input
          aria-label="سبب المنح"
          placeholder="السبب — يُوثَّق في السجل"
          value={grant.reason}
          onChange={(e) => setGrant((g) => ({ ...g, reason: e.target.value }))}
          className={fieldClass}
        />
      </div>

      <button
        type="button"
        disabled={granting || people.length === 0}
        onClick={() => void submit()}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-accent-600 disabled:opacity-60"
      >
        <Send size={14} aria-hidden="true" />
        {granting ? 'جارٍ المنح…' : 'امنح النقاط'}
      </button>
    </section>
  )
}
