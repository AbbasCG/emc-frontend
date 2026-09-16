import { useCallback, useEffect, useMemo, useState } from 'react'
import { Crown, RotateCcw, Save, Users } from 'lucide-react'
import {
  fetchDepartmentPageAccess,
  saveDepartmentPageAccess,
  type EligiblePageEntry,
} from '@/api/accessControlApi'
import { fetchPageAccessCatalog, type PageAccessCatalog } from '@/api/pageAccessCatalogApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { PageAccessScopeNotice } from '@/components/access-control/AccessBadges'
import { PageAccessSelector } from '@/components/access-control/PageAccessSelector'
import { buildSelectorRows, sameKeySet } from '@/components/access-control/selectorRows'
import { ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { errorToast, successToast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type Audience = 'member' | 'leader'

/**
 * Phase 2A — DEPARTMENT DEFAULT PAGE ACCESS editor (member + leader).
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION: a department default decides which
 * pages the department exposes, never what may be done on them.
 *
 * THE KEY SEMANTIC THIS UI MUST NOT BLUR:
 *   leader effective department defaults = MEMBER defaults + LEADER defaults
 * Leader defaults are ADDITIONS, not a replacement set. The leader tab therefore
 * shows the inherited member pages as a read-only summary above its own editor,
 * so the additive relationship is visible rather than implied.
 *
 * Eligibility per audience comes entirely from the backend (`eligible.member` /
 * `eligible.leader`). Nothing like "finance pages forbidden" is hardcoded here —
 * a page is locked purely because the backend omitted it for that audience.
 *
 * Both audiences save in ONE atomic request.
 */
export function DepartmentPageAccessPanel({
  departmentId,
  departmentName,
}: {
  departmentId: number | string
  departmentName: string
}) {
  const [catalog, setCatalog] = useState<PageAccessCatalog | null>(null)
  const [eligible, setEligible] = useState<{ member: EligiblePageEntry[]; leader: EligiblePageEntry[] }>({
    member: [],
    leader: [],
  })
  const [savedMember, setSavedMember] = useState<string[]>([])
  const [savedLeader, setSavedLeader] = useState<string[]>([])
  const [draftMember, setDraftMember] = useState<string[]>([])
  const [draftLeader, setDraftLeader] = useState<string[]>([])
  const [audience, setAudience] = useState<Audience>('member')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [access, cat] = await Promise.all([
        fetchDepartmentPageAccess(departmentId),
        fetchPageAccessCatalog().catch(() => null),
      ])
      setEligible(access.eligible)
      setSavedMember(access.memberDefaults)
      setSavedLeader(access.leaderDefaults)
      setDraftMember(access.memberDefaults)
      setDraftLeader(access.leaderDefaults)
      setStatus(access.department.status)
      setCatalog(cat)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [departmentId])

  useEffect(() => {
    void load()
  }, [load])

  const memberRows = useMemo(
    () =>
      buildSelectorRows(
        catalog,
        eligible.member,
        'غير قابلة للإسناد كافتراضي لأعضاء الإدارة — بحسب تصنيف الخادم.',
        'متاح لجميع المستخدمين المسجلين — لا يُدار من هنا.',
      ),
    [catalog, eligible.member],
  )

  const leaderRows = useMemo(
    () =>
      buildSelectorRows(
        catalog,
        eligible.leader,
        'غير قابلة للإسناد كإضافة للقائد — بحسب تصنيف الخادم.',
        'متاح لجميع المستخدمين المسجلين — لا يُدار من هنا.',
      ),
    [catalog, eligible.leader],
  )

  const dirty = !sameKeySet(savedMember, draftMember) || !sameKeySet(savedLeader, draftLeader)

  /** What a canonical leader actually ends up with: member ∪ leader. */
  const leaderEffectiveCount = useMemo(
    () => new Set([...draftMember, ...draftLeader]).size,
    [draftMember, draftLeader],
  )

  const inheritedLabels = useMemo(() => {
    const byKey = new Map(memberRows.map((r) => [r.key, r.labelAr || r.key]))
    return draftMember.map((k) => byKey.get(k) ?? k)
  }, [draftMember, memberRows])

  async function onSave() {
    setSaving(true)
    try {
      const res = await saveDepartmentPageAccess(departmentId, draftMember, draftLeader)
      setSavedMember(res.memberDefaults)
      setSavedLeader(res.leaderDefaults)
      setDraftMember(res.memberDefaults)
      setDraftLeader(res.leaderDefaults)
      successToast('تم حفظ الوصول الافتراضي لصفحات الإدارة')
    } catch (e) {
      errorToast(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return <ErrorPanel title="تعذر تحميل الوصول الافتراضي للإدارة" hint={error} />
  }

  const isArchived = status !== '' && status !== 'active'

  return (
    <div dir="rtl" className="space-y-3 text-right rtl:text-right">
      <PageAccessScopeNotice />

      {isArchived ?
        <p className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[11px] font-bold leading-relaxed text-amber-900">
          هذه الإدارة غير نشطة (<span dir="ltr">{status}</span>). تبقى الإعدادات محفوظة، لكن الخادم لا يمنح وصولاً
          فعلياً جديداً من إدارة غير نشطة.
        </p>
      : null}

      {/* Audience switch */}
      <div className="grid gap-2 sm:grid-cols-2">
        <AudienceCard
          active={audience === 'member'}
          onClick={() => setAudience('member')}
          Icon={Users}
          titleAr="افتراضي للأعضاء"
          countLabel={`${draftMember.length} صفحة`}
          hintAr="تُمنح لكل عضو في الإدارة."
        />
        <AudienceCard
          active={audience === 'leader'}
          onClick={() => setAudience('leader')}
          Icon={Crown}
          titleAr="إضافي للقائد"
          countLabel={`+${draftLeader.length} صفحة`}
          hintAr={`القائد يحصل على ${leaderEffectiveCount} صفحة (الأعضاء + الإضافات).`}
        />
      </div>

      {audience === 'leader' ?
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/50 px-3 py-2.5">
          <p className="text-[11px] font-black text-teal-900">
            القائد يرث أولاً كل صفحات الأعضاء ({draftMember.length})، ثم تُضاف إليها الصفحات أدناه.
          </p>
          {inheritedLabels.length > 0 ?
            <p className="mt-1.5 text-[10px] font-semibold leading-relaxed text-teal-800/90">
              موروث: {inheritedLabels.slice(0, 8).join('، ')}
              {inheritedLabels.length > 8 ? ` …و${inheritedLabels.length - 8} أخرى` : ''}
            </p>
          : <p className="mt-1.5 text-[10px] font-semibold text-teal-800/90">
              لا توجد صفحات افتراضية للأعضاء بعد.
            </p>
          }
        </div>
      : null}

      {audience === 'member' ?
        <PageAccessSelector
          key="member"
          mode="toggle"
          rows={memberRows}
          value={draftMember}
          onChange={setDraftMember}
          loading={loading}
          disabled={saving}
          emptyTitle="لا توجد صفحات قابلة للإسناد للأعضاء"
          emptySubtitle={`لم يُرجع الخادم أي صفحة يمكن جعلها افتراضية لأعضاء «${departmentName}».`}
        />
      : <PageAccessSelector
          key="leader"
          mode="toggle"
          rows={leaderRows}
          value={draftLeader}
          onChange={setDraftLeader}
          loading={loading}
          disabled={saving}
          emptyTitle="لا توجد صفحات إضافية قابلة للإسناد للقائد"
          emptySubtitle={`لم يُرجع الخادم أي صفحة يمكن إضافتها لقائد «${departmentName}».`}
        />
      }

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
              onClick={() => {
                setDraftMember(savedMember)
                setDraftLeader(savedLeader)
              }}
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
              {saving ? 'جارٍ الحفظ…' : 'حفظ الاثنين معاً'}
            </button>
          </div>
        </div>
      : null}
    </div>
  )
}

function AudienceCard({
  active,
  onClick,
  Icon,
  titleAr,
  countLabel,
  hintAr,
}: {
  active: boolean
  onClick: () => void
  Icon: React.ElementType
  titleAr: string
  countLabel: string
  hintAr: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-2xl border px-3 py-2.5 text-right transition rtl:text-right',
        active ?
          'border-customBlue/40 bg-brand-50/70 ring-2 ring-customBlue/20'
        : 'border-ink-100 bg-white hover:border-customBlue/25 hover:bg-brand-50/30',
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-customBlue' : 'text-slate-400')} aria-hidden />
        <span className="text-[12px] font-black text-deepBlue">{titleAr}</span>
        <span className="ms-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-black tabular-nums text-muted-600 ring-1 ring-ink-100">
          {countLabel}
        </span>
      </span>
      <span className="mt-1 block text-[10px] font-semibold leading-relaxed text-muted-600">{hintAr}</span>
    </button>
  )
}
