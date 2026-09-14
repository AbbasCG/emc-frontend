import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import {
  fetchUserPageAccessOverrides,
  saveUserPageAccessOverrides,
  splitOverrideStates,
  type EligiblePageEntry,
  type UserPageAccessState,
} from '@/api/accessControlApi'
import { fetchPageAccessCatalog, type PageAccessCatalog } from '@/api/pageAccessCatalogApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { PageAccessScopeNotice, ProtectedAuthorityNotice } from '@/components/access-control/AccessBadges'
import { PageAccessSelector } from '@/components/access-control/PageAccessSelector'
import { buildSelectorRows, sameStateMap } from '@/components/access-control/selectorRows'
import { ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { errorToast, successToast } from '@/lib/toast'
import { normalizeRole } from '@/utils/dashboardAccess'

/**
 * Phase 2C — PER-USER PAGE ACCESS OVERRIDES editor.
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION: an ALLOW here exposes a page to one
 * user. It grants no business capability — the backend still enforces
 * permissions, policies and department authority on every action.
 *
 * THREE STATES, and DEFAULT IS THE ABSENCE OF A ROW:
 *   افتراضي / DEFAULT — inherits role + department layers. Sent as NOTHING.
 *   مسموح  / ALLOW    — sent in `allow[]`.
 *   محجوب  / DENY     — sent in `deny[]`.
 * The editor stores DEFAULT by deleting the key from its state map, so a
 * literal 'default' string can never reach the backend.
 *
 * The rows an actor may edit come from the backend's actor-scoped `grantable`
 * list. Everything else is rendered LOCKED — including all SYSTEM_PROTECTED
 * capabilities, which can never be stored in this table in either state.
 */
export function UserPageAccessPanel({
  userId,
  userName,
  userRole,
  viewerRole,
}: {
  userId: number
  userName: string
  userRole?: string | null
  /** The signed-in administrator's role — used for protected-identity messaging only. */
  viewerRole?: string | null
}) {
  const [catalog, setCatalog] = useState<PageAccessCatalog | null>(null)
  const [grantable, setGrantable] = useState<EligiblePageEntry[]>([])
  const [saved, setSaved] = useState<Record<string, UserPageAccessState>>({})
  const [draft, setDraft] = useState<Record<string, UserPageAccessState>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  const targetIsProtected = normalizeRole(userRole ?? null) === 'super_admin'
  const viewerIsSuperAdmin = normalizeRole(viewerRole ?? null) === 'super_admin'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setForbidden(false)
    try {
      const [access, cat] = await Promise.all([
        fetchUserPageAccessOverrides(userId),
        fetchPageAccessCatalog().catch(() => null),
      ])
      setGrantable(access.grantable)
      setSaved(access.overrides)
      setDraft(access.overrides)
      setCatalog(cat)
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 403) setForbidden(true)
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(
    () =>
      buildSelectorRows(
        catalog,
        grantable,
        'خارج نطاق ما يمكنك إسناده لهذا المستخدم — أو محمية من النظام.',
      ),
    [catalog, grantable],
  )

  const dirty = !sameStateMap(saved, draft)

  async function onSave() {
    setSaving(true)
    try {
      const { allow, deny } = splitOverrideStates(draft)
      const stored = await saveUserPageAccessOverrides(userId, allow, deny)
      setSaved(stored)
      setDraft(stored)
      successToast('تم حفظ استثناءات الوصول لهذا المستخدم')
    } catch (e) {
      errorToast(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (forbidden) {
    return (
      <div dir="rtl" className="space-y-3 text-right rtl:text-right">
        <ProtectedAuthorityNotice>
          لا تملك صلاحية تعديل وصول هذا المستخدم.
          {targetIsProtected && !viewerIsSuperAdmin ?
            ' هوية super_admin محمية ولا يديرها إلا super_admin.'
          : null}
        </ProtectedAuthorityNotice>
      </div>
    )
  }

  if (error) {
    return <ErrorPanel title="تعذر تحميل استثناءات الوصول" hint={error} />
  }

  return (
    <div dir="rtl" className="space-y-3 text-right rtl:text-right">
      <PageAccessScopeNotice />

      {targetIsProtected ?
        <ProtectedAuthorityNotice>
          هذا المستخدم يحمل صلاحية النظام الكاملة (super_admin). وصوله للصفحات المحمية يُدار بصلاحيات النظام، ولا
          يمكن منحه أو حجبه من خلال هذه الاستثناءات.
        </ProtectedAuthorityNotice>
      : null}

      <PageAccessSelector
        mode="tristate"
        rows={rows}
        value={draft}
        onChange={setDraft}
        loading={loading}
        disabled={saving}
        emptyTitle="لا توجد صفحات قابلة للإسناد"
        emptySubtitle={`لم يُرجع الخادم أي صفحة يمكنك إسنادها للمستخدم «${userName}».`}
      />

      {!loading ?
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-white/95 px-3 py-2.5 backdrop-blur">
          <p className="text-[11px] font-bold text-muted-600">
            {dirty ?
              <span className="text-amber-700">لديك تغييرات غير محفوظة</span>
            : <span className="text-slate-400">لا توجد تغييرات</span>}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDraft(saved)}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ink-100 px-3 py-2 text-[11px] font-black text-muted-600 transition hover:border-customBlue/35 hover:text-customBlue disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              تراجع
            </button>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0C2A4B] px-4 py-2 text-[11px] font-black text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" aria-hidden />
              {saving ? 'جارٍ الحفظ…' : 'حفظ'}
            </button>
          </div>
        </div>
      : null}
    </div>
  )
}
