import { useEffect, useState } from 'react'
import FormRetentionSection from './FormRetentionSection'
import { fetchFormAutomation, parseAutomationError, updateFormAutomation } from '@/api/formsAutomationApi'
import type { FormAutomation, FormAutomationPatch } from '@/api/formsAutomationApi'

const SELECT = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-deepBlue outline-none focus:border-customBlue disabled:opacity-50'

/** One switch with what it does in plain words. Saving happens on change; the server's answer is what is shown. */
function Toggle({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-black text-deepBlue">{label}</label>
        <p id={`${id}-hint`} className="mt-0.5 text-[11px] font-semibold leading-5 text-slate-500">{hint}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-hint`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-6 w-11 flex-none rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue focus-visible:ring-offset-2 disabled:opacity-50 ${checked ? 'bg-customBlue' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'right-0.5' : 'right-[1.375rem]'}`} />
      </button>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white px-5 py-2 text-right shadow-md ring-1 ring-deepBlue/[0.06]">
      <h3 className="border-b border-slate-100 py-3 text-xs font-black text-slate-500">{title}</h3>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  )
}

/**
 * The Notifications & automation tab of a form: who is told about new responses, the respondent's receipt, automatic assignment,
 * reminders and the outbound webhook. Each change is saved at once and reported; a refusal leaves the previous value in place.
 */
export default function FormAutomationPanel({ formId }: { formId: number }) {
  const [data, setData] = useState<FormAutomation | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchFormAutomation(formId)
        if (!cancelled) {
          setData(next)
          setLoadError(null)
        }
      } catch (e) {
        if (!cancelled) setLoadError(parseAutomationError(e))
      }
    })()
    return () => { cancelled = true }
  }, [formId, attempt])

  async function save(patch: FormAutomationPatch) {
    setSaving(true)
    setMessage(null)
    try {
      setData(await updateFormAutomation(formId, patch))
      setMessage({ tone: 'ok', text: 'حُفظت الإعدادات.' })
    } catch (e) {
      setMessage({ tone: 'error', text: parseAutomationError(e) })
    } finally {
      setSaving(false)
    }
  }

  if (loadError) return (
    <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
      <p role="alert" className="font-black text-rose-800">{loadError}</p>
      <button type="button" onClick={() => { setLoadError(null); setAttempt((n) => n + 1) }} className="mt-4 rounded-xl bg-deepBlue px-5 py-2 text-xs font-black text-white">إعادة المحاولة</button>
    </div>
  )
  if (!data) return <p className="rounded-2xl bg-white p-10 text-center text-sm font-bold text-slate-500">جارٍ تحميل الإعدادات...</p>

  const { settings: s, options: o } = data

  return (
    <div className="space-y-4" dir="rtl" aria-busy={saving}>
      <p className="rounded-xl bg-slate-50 px-4 py-3 text-right text-[11px] font-bold leading-6 text-slate-600">
        لا تحمل أي رسالة أو إشعار إجابات المجيبين: عنوان النموذج ورقم الرد ورابط المراجعة فقط. تُرسل الإشعارات عبر مركز إشعارات المنصة.
      </p>
      {message && (
        <p role={message.tone === 'ok' ? 'status' : 'alert'} className={`rounded-xl px-4 py-3 text-sm font-bold ${message.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </p>
      )}

      <Group title="عند وصول رد جديد">
        <Toggle id="auto-owner" label="إشعار مالك النموذج" hint="إشعار داخل المنصة لكل رد جديد. لا يُرسل إن كان المالك هو من أجاب." checked={s.notify_owner} disabled={saving} onChange={(v) => void save({ notify_owner: v })} />
        <Toggle
          id="auto-department"
          label="إشعار قيادة القسم"
          hint={o.has_department ? 'يصل لرئيس القسم ونائبه إن كان يحق لهما الاطلاع على ردود هذا النموذج.' : 'النموذج غير مرتبط بقسم. اختر قسماً للنموذج أولاً.'}
          checked={s.notify_department}
          disabled={saving || (!o.has_department && !s.notify_department)}
          onChange={(v) => void save({ notify_department: v })}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <label htmlFor="auto-assign" className="text-sm font-black text-deepBlue">الإسناد التلقائي</label>
            <p className="mt-0.5 text-[11px] font-semibold leading-5 text-slate-500">يُسند كل رد جديد مباشرة لهذا المراجع ويُسجَّل ذلك في سجل الرد.</p>
          </div>
          <select id="auto-assign" value={s.auto_assign_to ?? ''} disabled={saving} onChange={(e) => void save({ auto_assign_to: e.target.value ? Number(e.target.value) : null })} className={SELECT}>
            <option value="">بدون إسناد تلقائي</option>
            {o.assignable.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </Group>

      <Group title="للمجيب">
        <Toggle id="auto-confirm" label="تأكيد الاستلام" hint="يصل المجيبَ المسجّل إشعارٌ وبريد برقم الرد ووقته. ولغير المسجّل بريد إلى العنوان الذي كتبه، بحد أقصى 3 رسائل للعنوان نفسه في الساعة." checked={s.confirmation.enabled} disabled={saving} onChange={(v) => void save({ confirmation: { enabled: v } })} />
        {s.confirmation.enabled && (
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <label htmlFor="auto-email-q" className="text-xs font-black text-deepBlue">سؤال البريد الإلكتروني لغير المسجّلين</label>
            {o.email_questions.length === 0 ? (
              <span className="text-[11px] font-semibold text-slate-500">أضف سؤالاً من نوع «بريد إلكتروني» لإرسال التأكيد لغير المسجّلين.</span>
            ) : (
              <select id="auto-email-q" value={s.confirmation.email_question_id ?? ''} disabled={saving} onChange={(e) => void save({ confirmation: { email_question_id: e.target.value ? Number(e.target.value) : null } })} className={SELECT}>
                <option value="">للمسجّلين فقط</option>
                {o.email_questions.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
              </select>
            )}
          </div>
        )}
      </Group>

      <Group title="المتابعة">
        <Toggle id="auto-assignee" label="إشعار الموظف عند إسناد رد إليه" hint="لا يُرسل لمن أسند الرد لنفسه." checked={s.notify_assignee} disabled={saving} onChange={(v) => void save({ notify_assignee: v })} />
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <label htmlFor="auto-reminder" className="text-sm font-black text-deepBlue">تذكير بالردود المعلّقة</label>
            <p className="mt-0.5 text-[11px] font-semibold leading-5 text-slate-500">مرة يومياً للمُسند إليه، أو للمالك إن لم يُسند الرد، عن الردود التي لم تكتمل بعد هذه المدة.</p>
          </div>
          <select id="auto-reminder" value={s.reminder_days ?? ''} disabled={saving} onChange={(e) => void save({ reminder_days: e.target.value ? Number(e.target.value) : null })} className={SELECT}>
            <option value="">بدون تذكير</option>
            {[1, 2, 3, 5, 7, 14, 30].filter((d) => d <= o.max_reminder_days).map((d) => <option key={d} value={d}>بعد {d} {d === 1 ? 'يوم' : d <= 10 ? 'أيام' : 'يوماً'}</option>)}
          </select>
        </div>
      </Group>

      <Group title="الربط مع أنظمة أخرى">
        <Toggle
          id="auto-webhook"
          label="إرسال حدث form.submitted"
          hint={o.webhook_endpoints > 0 ? `يُرسل الحدث إلى ${o.webhook_endpoints} من نقاط الربط المفعّلة التي تستمع إليه، موقّعاً، دون الإجابات.` : 'لا توجد نقطة ربط مفعّلة تستمع لهذا الحدث بعد. يضيفها مدير المنصة من إعدادات الربط.'}
          checked={s.webhook}
          disabled={saving}
          onChange={(v) => void save({ webhook: v })}
        />
        {s.webhook && (
          <Toggle
            id="auto-webhook-answers"
            label="تضمين الإجابات في الحدث"
            hint={o.can_include_answers ? 'تخرج إجابات المجيبين من المنصة إلى نقطة الربط. فعّله فقط لأنظمة موثوقة.' : 'إرسال الإجابات خارج المنصة قرار لمدير المنصة فقط.'}
            checked={s.webhook_include_answers}
            disabled={saving || (!o.can_include_answers && !s.webhook_include_answers)}
            onChange={(v) => void save({ webhook_include_answers: v })}
          />
        )}
      </Group>

      <FormRetentionSection formId={formId} />
    </div>
  )
}
