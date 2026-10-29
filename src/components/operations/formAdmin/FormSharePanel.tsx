import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Globe, Lock } from 'lucide-react'
import { bodyOf } from '@/api/formsApi'
import { parseFormActionError } from '@/api/formsAdminApi'
import { fetchSharing, updateSharingAccess } from '@/api/formsShareApi'
import type { SharingData } from '@/api/formsShareApi'
import type { FormAccessMode, OpsFormDefinition } from '@/types/operations'
import ShareInvitationsSection from './ShareInvitationsSection'
import ShareLinksSection from './ShareLinksSection'
import ShareQrCard from './ShareQrCard'
import { ACCESS_MODE_AR, publicTone } from './shareUi'
import { copyText, publicFormUrl } from './shareUrl'

const BTN = 'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition disabled:opacity-50'

/** Says what is wrong in words that fit this screen (a missing form is not a lost connection). */
function loadMessage(error: unknown): string {
  const status = bodyOf(error).status
  if (status === 403) return 'لا تملك صلاحية عرض إعدادات المشاركة لهذا النموذج.'

  return parseFormActionError(error)
}

/**
 * The Share tab: the form's public address with a QR code, who may answer (public, signed-in, invited), the share links, and the
 * invited people.
 *
 * Everything shown about "can the public reach this form" is computed by the server from the same rules the public endpoints use,
 * so this screen cannot promise what the server would refuse. Changing anything is for the owner and platform admins; people
 * who may only edit the form see the same screen, read-only.
 */
export default function FormSharePanel({ form }: { form: OpsFormDefinition }) {
  const [data, setData] = useState<SharingData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<FormAccessMode>('public')
  const [requiresLink, setRequiresLink] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const adopt = useCallback((next: SharingData) => {
    setData(next)
    setMode(next.access.mode)
    setRequiresLink(next.access.requires_share_link)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchSharing(form.id)
        if (!cancelled) adopt(next)
      } catch (e) {
        if (!cancelled) setLoadError(loadMessage(e))
      }
    })()

    return () => { cancelled = true }
  }, [form.id, adopt, attempt])

  if (loadError) {
    return (
      <div role="alert" className="rounded-2xl bg-rose-50 p-8 text-center ring-1 ring-rose-200">
        <p className="font-black text-rose-800">{loadError}</p>
        <button type="button" onClick={() => { setLoadError(null); setAttempt((n) => n + 1) }} className={`${BTN} mt-4 bg-deepBlue text-white`}>إعادة المحاولة</button>
      </div>
    )
  }
  if (!data) return <p className="p-10 text-center text-sm font-bold text-slate-500" aria-busy="true">جارٍ تحميل إعدادات المشاركة...</p>

  const canManage = data.abilities.manage
  const url = publicFormUrl(data.form.slug)
  const pub = data.public
  const dirty = mode !== data.access.mode || requiresLink !== data.access.requires_share_link
  const linkRequiredNow = data.access.requires_share_link
  const hasActiveLink = data.links.some((l) => l.status === 'active')

  async function saveAccess() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      adopt(await updateSharingAccess(form.id, { access_mode: mode, requires_share_link: requiresLink }))
      setSaved(true)
    } catch (e) {
      const first = Object.values(bodyOf(e).body.errors ?? {})[0]
      setSaveError(Array.isArray(first) && typeof first[0] === 'string' ? first[0] : parseFormActionError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5" data-testid="share-panel">
      <section aria-labelledby="share-status-title" className={`rounded-2xl p-5 text-right ring-1 ${publicTone(pub.reachable, pub.accepting)}`} data-testid="public-status" data-state={pub.state}>
        <div className="flex items-start gap-3">
          {pub.reachable ? <Globe size={20} aria-hidden className="mt-0.5 shrink-0" /> : <Lock size={20} aria-hidden className="mt-0.5 shrink-0" />}
          <div>
            <h3 id="share-status-title" className="text-sm font-black">
              {pub.accepting ? 'النموذج متاح للعامة' : pub.reachable ? 'النموذج لا يستقبل الإجابات الآن' : 'النموذج غير متاح للعامة'}
            </h3>
            <p role="status" className="mt-1 text-xs font-bold leading-6">{pub.message}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="share-url-title" className="rounded-2xl bg-white p-5 text-right ring-1 ring-deepBlue/[0.06] sm:p-6">
        <h3 id="share-url-title" className="text-sm font-black text-deepBlue">رابط النموذج العام</h3>
        <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">
          العنوان نفسه الذي يعمل منذ إنشاء النموذج، ولا يتغير. {linkRequiredNow ? '' : 'يحمل رمز QR العنوان وحده، دون أي محتوى أو بيانات.'}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={url} dir="ltr" aria-label="رابط النموذج العام" onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs font-semibold text-deepBlue" />
          <button type="button" onClick={async () => { setCopied(await copyText(url)); setTimeout(() => setCopied(false), 2500) }} className={`${BTN} bg-deepBlue text-white`}>
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            {copied ? 'تم النسخ' : 'نسخ الرابط'}
          </button>
        </div>
        <span role="status" className="sr-only">{copied ? 'تم نسخ الرابط' : ''}</span>

        {linkRequiredNow ? (
          <p role="note" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-900 ring-1 ring-amber-200">
            هذا النموذج يُفتح عبر رابط مشاركة فقط: العنوان أعلاه لا يفتحه وحده، ولذلك لا يُعرض له رمز QR. أنشئ رابط مشاركة من القسم أدناه، وسيُعرض رمزه عند إنشائه.
          </p>
        ) : (
          <div className="mt-5 flex justify-center">
            <ShareQrCard url={url} slug={data.form.slug} title={form.title} caption="امسح الرمز لفتح النموذج" />
          </div>
        )}
      </section>

      <section aria-labelledby="share-access-title" className="space-y-4 rounded-2xl bg-white p-5 text-right ring-1 ring-deepBlue/[0.06] sm:p-6">
        <h3 id="share-access-title" className="text-sm font-black text-deepBlue">من يستطيع تعبئة النموذج</h3>
        <fieldset className="grid gap-3" disabled={!canManage}>
          <legend className="sr-only">نمط الوصول</legend>
          {(Object.keys(ACCESS_MODE_AR) as FormAccessMode[]).map((m) => (
            <label key={m} className="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-slate-200 has-[:checked]:bg-sky-50/60 has-[:checked]:ring-customBlue/40">
              <input type="radio" name="access_mode" value={m} checked={mode === m} onChange={() => { setMode(m); setSaved(false) }} className="mt-1 accent-customBlue" />
              <span>
                <span className="block text-sm font-black text-deepBlue">{ACCESS_MODE_AR[m].label}</span>
                <span className="block text-xs font-semibold leading-6 text-slate-500">{ACCESS_MODE_AR[m].hint}</span>
              </span>
            </label>
          ))}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-slate-200 has-[:checked]:bg-amber-50/60 has-[:checked]:ring-amber-300">
            <input type="checkbox" checked={requiresLink} onChange={(e) => { setRequiresLink(e.target.checked); setSaved(false) }} className="mt-1 accent-customBlue" />
            <span>
              <span className="block text-sm font-black text-deepBlue">لا يُفتح إلا عبر رابط مشاركة</span>
              <span className="block text-xs font-semibold leading-6 text-slate-500">
                العنوان العادي لا يفتح النموذج، ولا يعرض عنه شيئاً. يحتاج كل شخص رابطاً صالحاً من الروابط أدناه. يمكن الجمع بينه وبين تسجيل الدخول أو الدعوة.
              </span>
              {requiresLink && !linkRequiredNow && !hasActiveLink && (
                <span role="note" className="mt-1 block text-xs font-bold text-amber-800">أنشئ رابط مشاركة نشطاً أولاً، وإلا لن يفتح النموذج لأحد.</span>
              )}
            </span>
          </label>
        </fieldset>
        {saveError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">{saveError}</p>}
        {saved && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800">تم حفظ إعدادات الوصول.</p>}
        {canManage ? (
          <button type="button" disabled={!dirty || saving} onClick={() => void saveAccess()} className={`${BTN} bg-deepBlue text-white`}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الوصول'}
          </button>
        ) : (
          <p role="note" className="text-[11px] font-bold text-slate-500">تغيير نمط الوصول من صلاحية المالك ومديري المنصة.</p>
        )}
      </section>

      <ShareLinksSection data={data} formId={form.id} slug={data.form.slug} title={form.title} onChanged={setData} />

      {data.access.mode === 'invited' && <ShareInvitationsSection data={data} formId={form.id} onChanged={setData} />}
    </div>
  )
}
