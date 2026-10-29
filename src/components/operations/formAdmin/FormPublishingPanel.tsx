import { useState } from 'react'
import type { FormEvent } from 'react'
import { bodyOf, firstMessage } from '@/api/formsApi'
import { parseFormActionError, updateFormSettings, type FormSettingsPatch } from '@/api/formsAdminApi'
import type { FormResponsesVisibility, FormVisibility, OpsFormDefinition } from '@/types/operations'
import FormOwnershipSection from './FormOwnershipSection'
import { RESPONSES_VISIBILITY_AR, VISIBILITY_AR, fromLocalInput, toLocalInput } from './formAdminUi'

const FIELD = 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-deepBlue disabled:opacity-60'

/** Server errors by field, for showing next to the field that caused them. */
function fieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(bodyOf(error).body.errors ?? {})) {
    const message = firstMessage(value)
    if (message) out[key] = message
  }

  return out
}

/**
 * Availability and access for one form.
 *
 * Schedule, limits and sign-in apply the moment they are saved and are not part of the published content (changing a
 * closing date never creates a version). Visibility decides who may open the form and who may read its responses; those two
 * are separate choices, and only the owner or a platform admin may change them.
 */
export default function FormPublishingPanel({
  form,
  onChanged,
  onAccessRemoved,
}: {
  form: OpsFormDefinition
  onChanged: (next: OpsFormDefinition) => void
  onAccessRemoved: () => void
}) {
  const settings = form.settings
  const canEdit = form.abilities?.edit ?? false
  const canAccess = form.abilities?.manage_access ?? false

  const [visibility, setVisibility] = useState<FormVisibility>(form.visibility ?? 'private')
  const [responses, setResponses] = useState<FormResponsesVisibility>(form.responses_visibility ?? 'restricted')
  const [opensAt, setOpensAt] = useState(toLocalInput(settings?.opens_at))
  const [closesAt, setClosesAt] = useState(toLocalInput(settings?.closes_at))
  const [max, setMax] = useState(settings?.max_submissions != null ? String(settings.max_submissions) : '')
  const [perPerson, setPerPerson] = useState(settings?.per_respondent_limit != null ? String(settings.per_respondent_limit) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setErrors({})
    setSaved(false)

    // Send only what changed, so a person who may edit but not change access never sends an access field.
    const patch: FormSettingsPatch = {}
    if (canAccess && visibility !== form.visibility) patch.visibility = visibility
    if (canAccess && responses !== form.responses_visibility) patch.responses_visibility = responses
    const opens = fromLocalInput(opensAt)
    const closes = fromLocalInput(closesAt)
    if (opens !== (settings?.opens_at ?? null) && !(opens && settings?.opens_at && Date.parse(opens) === Date.parse(settings.opens_at))) patch.opens_at = opens
    if (closes !== (settings?.closes_at ?? null) && !(closes && settings?.closes_at && Date.parse(closes) === Date.parse(settings.closes_at))) patch.closes_at = closes
    const maxValue = max.trim() === '' ? null : Number(max)
    const perValue = perPerson.trim() === '' ? null : Number(perPerson)
    if (maxValue !== (settings?.max_submissions ?? null)) patch.max_submissions = maxValue
    if (perValue !== (settings?.per_respondent_limit ?? null)) patch.per_respondent_limit = perValue

    if (Object.keys(patch).length === 0) {
      setBusy(false)
      setSaved(true)
      return
    }

    try {
      const next = await updateFormSettings(form.id, patch)
      onChanged(next)
      setSaved(true)
    } catch (err) {
      setError(parseFormActionError(err))
      setErrors(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="space-y-6 rounded-2xl bg-white p-5 text-right ring-1 ring-deepBlue/[0.06] sm:p-6" aria-label="إعدادات النشر">
        <fieldset className="grid gap-3" disabled={!canAccess}>
          <legend className="text-sm font-black text-deepBlue">من يستطيع فتح النموذج</legend>
          {(Object.keys(VISIBILITY_AR) as FormVisibility[]).map((v) => (
            <label key={v} className="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-slate-200 has-[:checked]:bg-sky-50/60 has-[:checked]:ring-customBlue/40">
              <input type="radio" name="visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} className="mt-1 accent-customBlue" />
              <span>
                <span className="block text-sm font-black text-deepBlue">{VISIBILITY_AR[v].label}</span>
                <span className="block text-xs font-semibold leading-6 text-slate-500">{VISIBILITY_AR[v].hint}</span>
              </span>
            </label>
          ))}
          {errors.visibility && <p role="alert" className="text-xs font-bold text-red-700">{errors.visibility}</p>}
        </fieldset>

        <fieldset className="grid gap-3" disabled={!canAccess}>
          <legend className="text-sm font-black text-deepBlue">من يستطيع قراءة الإجابات</legend>
          {(Object.keys(RESPONSES_VISIBILITY_AR) as FormResponsesVisibility[]).map((v) => (
            <label key={v} className="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-slate-200 has-[:checked]:bg-sky-50/60 has-[:checked]:ring-customBlue/40">
              <input type="radio" name="responses_visibility" value={v} checked={responses === v} onChange={() => setResponses(v)} className="mt-1 accent-customBlue" />
              <span>
                <span className="block text-sm font-black text-deepBlue">{RESPONSES_VISIBILITY_AR[v].label}</span>
                <span className="block text-xs font-semibold leading-6 text-slate-500">{RESPONSES_VISIBILITY_AR[v].hint}</span>
              </span>
            </label>
          ))}
          {errors.responses_visibility && <p role="alert" className="text-xs font-bold text-red-700">{errors.responses_visibility}</p>}
          {!canAccess && <p className="text-[11px] font-bold text-slate-500">تغيير الظهور من صلاحية المالك ومديري المنصة.</p>}
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={!canEdit}>
          <legend className="mb-1 text-sm font-black text-deepBlue">الموعد والحدود</legend>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-deepBlue">يفتح في</span>
            <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={FIELD} dir="ltr" />
            {errors.opens_at && <span role="alert" className="text-xs font-bold text-red-700">{errors.opens_at}</span>}
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-deepBlue">يُغلق في</span>
            <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={FIELD} dir="ltr" />
            {errors.closes_at && <span role="alert" className="text-xs font-bold text-red-700">{errors.closes_at}</span>}
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-deepBlue">الحد الأقصى لعدد الإجابات</span>
            <input type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} className={FIELD} placeholder="بلا حد" />
            {errors.max_submissions && <span role="alert" className="text-xs font-bold text-red-700">{errors.max_submissions}</span>}
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-deepBlue">الحد الأقصى لكل شخص</span>
            <input type="number" min={1} value={perPerson} onChange={(e) => setPerPerson(e.target.value)} className={FIELD} placeholder="بلا حد" />
            {errors.per_respondent_limit && <span role="alert" className="text-xs font-bold text-red-700">{errors.per_respondent_limit}</span>}
          </label>
          <p className="text-[11px] font-semibold leading-6 text-slate-500 sm:col-span-2">
            الحد لكل شخص يتطلب تسجيل الدخول دائماً، لأن الزائر المجهول لا يمكن تمييزه بثقة. الحد العام للإجابات يُحتسب على الجميع.
            المواعيد والحدود تسري فور الحفظ ولا تنشئ إصداراً جديداً.
          </p>
          <p role="note" className="rounded-xl bg-slate-50 px-4 py-2.5 text-[11px] font-bold leading-6 text-slate-600 sm:col-span-2" data-testid="access-moved-note">
            من يستطيع تعبئة النموذج (عام، مستخدمون مسجّلون، أو مدعوّون) وروابط المشاركة ورمز QR تُدار الآن من تبويب «المشاركة».
          </p>
        </fieldset>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">{error}</p>}
        {saved && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800">تم حفظ الإعدادات.</p>}

        {(canEdit || canAccess) && (
          <button type="submit" disabled={busy} className="rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white disabled:opacity-60">
            {busy ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </button>
        )}
      </form>

      {canAccess && <FormOwnershipSection form={form} onTransferred={onChanged} onAccessRemoved={onAccessRemoved} />}
    </div>
  )
}
