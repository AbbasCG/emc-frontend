import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Copy, Plus } from 'lucide-react'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { CenteredModal } from '@/components/ui/CenteredModal'
import { bodyOf, firstMessage } from '@/api/formsApi'
import { parseFormActionError } from '@/api/formsAdminApi'
import { createShareLink, revokeShareLink } from '@/api/formsShareApi'
import type { CreatedShareLink, ShareLinkRow, SharingData } from '@/api/formsShareApi'
import { formatDateTime } from '@/utils/dateTime'
import { fromLocalInput } from './formAdminUi'
import { LINK_STATUS_AR } from './shareUi'
import ShareQrCard from './ShareQrCard'
import { copyText, shareLinkUrl } from './shareUrl'

const FIELD = 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-deepBlue'
const BTN = 'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition disabled:opacity-50'

function fieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(bodyOf(error).body.errors ?? {})) {
    const message = firstMessage(value)
    if (message) out[key] = message
  }

  return out
}

function LinkCard({ link, canManage, onRevoke }: { link: ShareLinkRow; canManage: boolean; onRevoke: () => void }) {
  const status = LINK_STATUS_AR[link.status]
  const usage = link.max_uses !== null ? `${link.uses} من ${link.max_uses} إجابة` : `${link.uses} إجابة`

  return (
    <li className="rounded-2xl bg-white p-4 text-right ring-1 ring-deepBlue/[0.06]" data-testid="share-link-row" data-status={link.status}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-deepBlue">{link.label}</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400" dir="ltr">…{link.token_hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-black ${status.tone}`}>{status.label}</span>
          {canManage && link.status !== 'revoked' && (
            <button type="button" onClick={onRevoke} aria-label={`إلغاء الرابط ${link.label}`} className="rounded-lg px-2.5 py-1 text-[11px] font-black text-red-700 ring-1 ring-red-200 hover:bg-red-50">
              إلغاء الرابط
            </button>
          )}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] sm:grid-cols-4">
        <div><dt className="font-black text-slate-400">الاستخدام</dt><dd className="font-bold text-deepBlue">{usage}</dd></div>
        <div><dt className="font-black text-slate-400">ينتهي</dt><dd className="font-bold text-deepBlue">{link.expires_at ? formatDateTime(link.expires_at) : 'بلا انتهاء'}</dd></div>
        <div><dt className="font-black text-slate-400">أنشأه</dt><dd className="font-bold text-deepBlue">{link.created_by?.name ?? '—'}{link.created_at ? ` · ${formatDateTime(link.created_at)}` : ''}</dd></div>
        {link.revoked_at && (
          <div><dt className="font-black text-slate-400">ألغاه</dt><dd className="font-bold text-deepBlue">{link.revoked_by?.name ?? '—'} · {formatDateTime(link.revoked_at)}</dd></div>
        )}
      </dl>
    </li>
  )
}

/**
 * The share links of a form: make one (with a label, an optional expiry and an optional limit), see how each is doing, revoke it.
 *
 * A link's address is shown ONCE, in the window that opens when it is made, together with its QR code; the server keeps only a
 * hash, so it cannot be shown again. Revoking stops a link at once and deletes nothing: the link stays in the list and the
 * responses that came through it stay in the response list.
 */
export default function ShareLinksSection({
  data,
  formId,
  slug,
  title,
  onChanged,
}: {
  data: SharingData
  formId: number
  slug: string
  title: string
  onChanged: (next: SharingData) => void
}) {
  const canManage = data.abilities.manage
  const archived = data.form.status === 'archived'

  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [expires, setExpires] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [created, setCreated] = useState<CreatedShareLink | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<ShareLinkRow | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function reset() {
    setLabel('')
    setExpires('')
    setMaxUses('')
    setError(null)
    setErrors({})
  }

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setErrors({})
    try {
      const link = await createShareLink(formId, {
        label: label.trim(),
        expires_at: fromLocalInput(expires),
        max_uses: maxUses.trim() === '' ? null : Number(maxUses),
      })
      const { token: _token, path: _path, ...row } = link
      onChanged({ ...data, links: [row, ...data.links] })
      setCreating(false)
      reset()
      setCopied(false)
      setCreated(link)
    } catch (err) {
      setError(parseFormActionError(err))
      setErrors(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  async function revoke() {
    const target = revoking
    if (!target) return
    setRevoking(null)
    setNotice(null)
    try {
      const row = await revokeShareLink(formId, target.id)
      onChanged({ ...data, links: data.links.map((l) => (l.id === row.id ? row : l)) })
      setNotice(`أُلغي الرابط «${row.label}». توقف عن العمل فوراً، وبقيت الإجابات التي وصلت عبره كما هي.`)
    } catch (err) {
      setNotice(parseFormActionError(err))
    }
  }

  const createdUrl = created ? shareLinkUrl(created.path) : ''

  return (
    <section aria-labelledby="share-links-title" className="space-y-3 rounded-2xl bg-white p-5 text-right ring-1 ring-deepBlue/[0.06] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="share-links-title" className="text-sm font-black text-deepBlue">روابط المشاركة</h3>
          <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">
            رابط خاص لكل جهة أو حملة، له اسم وصلاحية وحد اختياريان، ويمكن إلغاؤه وحده دون المساس بغيره. تُحتسب الإجابات المرسلة عبر الرابط لا مرات فتحه.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            disabled={archived}
            onClick={() => { reset(); setCreating(true) }}
            className={`${BTN} bg-customBlue text-white shadow-md hover:opacity-90`}
            title={archived ? 'النموذج مؤرشف: استعده لإنشاء روابط جديدة.' : undefined}
          >
            <Plus size={14} aria-hidden /> رابط جديد
          </button>
        )}
      </div>

      {archived && canManage && <p role="note" className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">النموذج مؤرشف: لا تُنشأ روابط جديدة، ويمكنك إلغاء الروابط الحالية.</p>}
      {!canManage && <p role="note" className="rounded-xl bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600">إنشاء الروابط وإلغاؤها من صلاحية المالك ومديري المنصة.</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800">{notice}</p>}

      {data.links.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">لا توجد روابط مشاركة بعد.</p>
      ) : (
        <ul className="space-y-2.5" aria-label="روابط المشاركة">
          {data.links.map((link) => (
            <LinkCard key={link.id} link={link} canManage={canManage} onRevoke={() => setRevoking(link)} />
          ))}
        </ul>
      )}

      <CenteredModal open={creating} onClose={() => { if (!busy) setCreating(false) }} busy={busy} title="رابط مشاركة جديد" subtitle="يُعرض الرابط مرة واحدة بعد إنشائه." size="md" testId="create-link-dialog">
        <form onSubmit={(e) => void create(e)} noValidate className="space-y-4 p-1 text-right">
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-deepBlue">اسم الرابط (للتمييز داخل المنصة فقط)</span>
            <input value={label} maxLength={100} onChange={(e) => setLabel(e.target.value)} aria-invalid={errors.label ? true : undefined} placeholder="مثال: ملصق المدخل الرئيسي" className={FIELD} />
            {errors.label && <span role="alert" className="text-xs font-bold text-red-700">{errors.label}</span>}
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-deepBlue">ينتهي في (اختياري)</span>
            <input type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} aria-invalid={errors.expires_at ? true : undefined} className={FIELD} dir="ltr" />
            {errors.expires_at && <span role="alert" className="text-xs font-bold text-red-700">{errors.expires_at}</span>}
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-deepBlue">أقصى عدد للإجابات عبر هذا الرابط (اختياري)</span>
            <input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} aria-invalid={errors.max_uses ? true : undefined} placeholder="بلا حد" className={FIELD} />
            {errors.max_uses && <span role="alert" className="text-xs font-bold text-red-700">{errors.max_uses}</span>}
            <span className="text-[11px] font-semibold leading-5 text-slate-500">
              تُحتسب الإجابات المرسلة فعلاً عبر الرابط. فتح الرابط لا يستهلك شيئاً. تُفحص الصلاحية لحظة الإرسال، فمن بدأ التعبئة قبل الانتهاء ثم أرسل بعده يُرفض إرساله برسالة واضحة.
            </span>
          </label>
          {error && !errors.label && !errors.expires_at && !errors.max_uses && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => setCreating(false)} className={`${BTN} bg-white text-deepBlue ring-1 ring-deepBlue/10`}>إلغاء</button>
            <button type="submit" disabled={busy} className={`${BTN} bg-customBlue text-white shadow-md`}>{busy ? 'جارٍ الإنشاء...' : 'إنشاء الرابط'}</button>
          </div>
        </form>
      </CenteredModal>

      <CenteredModal
        open={created !== null}
        onClose={() => setCreated(null)}
        title="تم إنشاء الرابط"
        subtitle="انسخه أو نزّل رمزه الآن: لن يظهر مرة أخرى."
        size="md"
        testId="created-link-dialog"
        dirty={!copied}
        dirtyTitle="أغلق نافذة الرابط؟"
        dirtyMessage="لن يُعرض هذا الرابط مرة أخرى. إن لم تنسخه أو تنزّل رمزه الآن فعليك إنشاء رابط جديد."
      >
        {created && (
          <div className="space-y-4 p-1 text-right">
            <p role="note" className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold leading-6 text-amber-900 ring-1 ring-amber-200">
              هذا الرابط يفتح النموذج لكل من يملكه. شاركه مع الجهة المقصودة فقط. تحتفظ المنصة ببصمة مشفّرة منه لا يمكن استعادة الرابط منها.
            </p>
            <div className="flex items-center gap-2">
              <input readOnly value={createdUrl} dir="ltr" aria-label="رابط المشاركة" onFocus={(e) => e.currentTarget.select()} className={`${FIELD} min-w-0 flex-1 font-mono text-xs`} />
              <button type="button" onClick={async () => setCopied(await copyText(createdUrl))} className={`${BTN} bg-deepBlue text-white`}>
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                {copied ? 'تم النسخ' : 'نسخ'}
              </button>
            </div>
            <ShareQrCard url={createdUrl} slug={slug} title={title} caption={`رمز QR لرابط المشاركة «${created.label}»`} fileSuffix="link" />
          </div>
        )}
      </CenteredModal>

      <ConfirmDialog
        open={revoking !== null}
        title="إلغاء رابط المشاركة؟"
        description={revoking ? `سيتوقف الرابط «${revoking.label}» عن العمل فوراً لكل من يملكه. لا يُحذف شيء: تبقى الإجابات التي وصلت عبره، ويبقى الرابط في القائمة بحالة «مُلغى».` : undefined}
        confirmLabel="إلغاء الرابط"
        variant="danger"
        onCancel={() => setRevoking(null)}
        onConfirm={() => void revoke()}
      />
    </section>
  )
}
