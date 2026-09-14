import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import {
  fetchRolePageAccess,
  saveRolePageAccess,
  type EligiblePageEntry,
} from '@/api/accessControlApi'
import { fetchPageAccessCatalog, type PageAccessCatalog } from '@/api/pageAccessCatalogApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { PageAccessScopeNotice } from '@/components/access-control/AccessBadges'
import { PageAccessSelector } from '@/components/access-control/PageAccessSelector'
import { buildSelectorRows, sameKeySet } from '@/components/access-control/selectorRows'
import { ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { errorToast, successToast } from '@/lib/toast'

/**
 * Phase 2B — ROLE DEFAULT PAGE ACCESS editor.
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION. This is deliberately a SEPARATE tab
 * from "الصلاحيات": that tab grants business permissions, this one only decides
 * which dashboard pages a role opens by default.
 *
 * POSITIVE ONLY — there is no role-level DENY. Unchecking a page removes it from
 * the submitted array; the backend then deletes the row. A negative state is
 * never invented here.
 *
 * Saving is an ATOMIC FULL REPLACE in one request, so a category bulk action is
 * never a burst of per-page calls.
 */
export function RolePageAccessPanel({
  roleId,
  roleLabelAr,
}: {
  /** Role id OR slug — Role::resolveRouteBinding() accepts both, and the rest of the app passes the slug. */
  roleId: number | string
  roleLabelAr: string
}) {
  const [catalog, setCatalog] = useState<PageAccessCatalog | null>(null)
  const [eligible, setEligible] = useState<EligiblePageEntry[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const [draft, setDraft] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // The catalog is fetched alongside so protected pages can be shown LOCKED
      // rather than silently missing. It is optional: if the viewer cannot read
      // it, the endpoint's own eligible set still drives the editor.
      const [access, cat] = await Promise.all([
        fetchRolePageAccess(roleId),
        fetchPageAccessCatalog().catch(() => null),
      ])
      setEligible(access.eligible)
      setSaved(access.pageDefaults)
      setDraft(access.pageDefaults)
      setCatalog(cat)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [roleId])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(
    () =>
      buildSelectorRows(
        catalog,
        eligible,
        'محمية من النظام — لا يمكن إسنادها كوصول افتراضي لأي دور.',
      ),
    [catalog, eligible],
  )

  const dirty = !sameKeySet(saved, draft)

  async function onSave() {
    setSaving(true)
    try {
      const stored = await saveRolePageAccess(roleId, draft)
      setSaved(stored)
      setDraft(stored)
      successToast('تم حفظ الوصول الافتراضي للصفحات لهذا الدور')
    } catch (e) {
      errorToast(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <ErrorPanel
        title="تعذر تحميل الوصول الافتراضي للصفحات"
        hint={error}
      />
    )
  }

  return (
    <div dir="rtl" className="space-y-3 text-right rtl:text-right">
      <PageAccessScopeNotice />

      <PageAccessSelector
        mode="toggle"
        rows={rows}
        value={draft}
        onChange={setDraft}
        loading={loading}
        disabled={saving}
        emptyTitle="لا توجد صفحات قابلة للإسناد"
        emptySubtitle={`لم يُرجع الخادم أي صفحة يمكن جعلها افتراضية للدور «${roleLabelAr}».`}
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
