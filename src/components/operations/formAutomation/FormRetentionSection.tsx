import { useEffect, useState } from 'react'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { fetchFormRetention, parseAutomationError, updateFormRetention } from '@/api/formsAutomationApi'
import type { FormRetention } from '@/api/formsAutomationApi'

const PERIODS = [30, 90, 180, 365, 730, 1095, 1825]

function periodLabel(days: number): string {
  if (days % 365 === 0) {
    const years = days / 365
    return years === 1 ? 'سنة' : years === 2 ? 'سنتان' : `${years} سنوات`
  }
  return `${days} يوماً`
}

/**
 * How long the responses are kept. Everyone who edits the form sees it; only the owner (or a platform manager) changes it, and a
 * period that would delete existing responses at the next nightly purge asks first and says how many.
 */
export default function FormRetentionSection({ formId }: { formId: number }) {
  const [data, setData] = useState<FormRetention | null>(null)
  const [pending, setPending] = useState<number | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchFormRetention(formId).then((r) => { if (!cancelled) setData(r) }).catch((e) => { if (!cancelled) setMessage({ tone: 'error', text: parseAutomationError(e) }) })
    return () => { cancelled = true }
  }, [formId])

  async function save(days: number | null) {
    setBusy(true)
    setMessage(null)
    try {
      setData(await updateFormRetention(formId, days))
      setMessage({ tone: 'ok', text: days === null ? 'ستُحفظ الردود حتى يحذفها أحد.' : `تُحذف الردود الأقدم من ${periodLabel(days)} في الحذف الليلي.` })
    } catch (e) {
      setMessage({ tone: 'error', text: parseAutomationError(e) })
    } finally {
      setBusy(false)
      setPending(undefined)
    }
  }

  return (
    <section className="rounded-2xl bg-white px-5 py-4 text-right shadow-md ring-1 ring-deepBlue/[0.06]" aria-labelledby="retention-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 id="retention-title" className="text-sm font-black text-deepBlue">مدة الاحتفاظ بالردود</h3>
          <p className="mt-0.5 text-[11px] font-semibold leading-5 text-slate-500">
            بعد هذه المدة تُحذف الردود ومرفقاتها نهائياً كل ليلة، ويُسجَّل الحذف في سجل النشاط. يغيّرها مالك النموذج فقط.
          </p>
        </div>
        {data && (
          <select
            aria-label="مدة الاحتفاظ بالردود"
            value={data.retention_days ?? ''}
            disabled={!data.can_change || busy}
            onChange={(e) => {
              const days = e.target.value ? Number(e.target.value) : null
              // Shortening deletes data: ask first. Lengthening or removing the limit deletes nothing.
              if (days !== null && (data.retention_days === null || days < data.retention_days)) setPending(days)
              else void save(days)
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue outline-none focus:border-customBlue disabled:opacity-60"
          >
            <option value="">بلا حد (حتى الحذف اليدوي)</option>
            {PERIODS.filter((d) => d >= data.min_days && d <= data.max_days).map((d) => <option key={d} value={d}>{periodLabel(d)}</option>)}
            {data.retention_days !== null && !PERIODS.includes(data.retention_days) && <option value={data.retention_days}>{periodLabel(data.retention_days)}</option>}
          </select>
        )}
      </div>
      {data && data.retention_days !== null && data.expired_now > 0 && (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-[11px] font-bold text-amber-900">{data.expired_now} من الردود أقدم من هذه المدة وستُحذف في الحذف الليلي القادم.</p>
      )}
      {message && <p role={message.tone === 'ok' ? 'status' : 'alert'} className={`mt-3 text-xs font-bold ${message.tone === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>{message.text}</p>}

      <ConfirmDialog
        open={pending !== undefined && pending !== null}
        title="تقصير مدة الاحتفاظ؟"
        description={`الردود الأقدم من ${pending ? periodLabel(pending) : ''} ستُحذف نهائياً مع مرفقاتها في الحذف الليلي القادم، ولا يمكن استعادتها.`}
        confirmLabel="تأكيد المدة"
        variant="danger"
        onCancel={() => setPending(undefined)}
        onConfirm={() => { if (pending) void save(pending) }}
      />
    </section>
  )
}
