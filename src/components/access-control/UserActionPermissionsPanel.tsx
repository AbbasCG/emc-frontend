import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Info, RefreshCw, Search } from 'lucide-react'
import {
  fetchUserActionPermissions,
  grantUserActionPermission,
  revokeUserActionPermission,
  type ActionPermissionGroup,
  type ActionPermissionRow,
} from '@/api/actionPermissionsApi'
import { getApiErrorMessage, getApiMessageOr } from '@/api/apiErrors'
import { ActionEffectiveChip, ActionSourceChips } from '@/components/access-control/ActionPermissionBadges'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '@/pages/super-admin/crud/shared/States'
import { errorToast, successToast } from '@/lib/toast'
import { cn } from '@/lib/utils'

/**
 * «صلاحيات الإجراءات» — per-user ACTION permissions (what a user may DO, not which page opens).
 *
 * Every decision shown here comes from the server row: `effective`, `sources`, and above all
 * `can_grant` / `can_revoke`, which alone decide whether a button renders. There is no role
 * check on the client, and no optimistic update — after a grant or revoke the row is replaced
 * by the row the server returned.
 */

const PRIMARY_GROUP = 'tickets'

type Pending = { kind: 'grant' | 'revoke'; row: ActionPermissionRow }

function orderGroups(groups: ActionPermissionGroup[]): ActionPermissionGroup[] {
  return [...groups].sort((a, b) => Number(b.key === PRIMARY_GROUP) - Number(a.key === PRIMARY_GROUP))
}

function without(map: Record<string, string>, key: string): Record<string, string> {
  const copy = { ...map }
  delete copy[key]
  return copy
}

function replaceRow(groups: ActionPermissionGroup[], next: ActionPermissionRow): ActionPermissionGroup[] {
  return groups.map((g) => ({
    ...g,
    permissions: g.permissions.map((p) => (p.key === next.key ? next : p)),
  }))
}

export function UserActionPermissionsPanel({ userId, userName }: { userId: number; userName: string }) {
  const [groups, setGroups] = useState<ActionPermissionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [pending, setPending] = useState<Pending | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [notices, setNotices] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchUserActionPermissions(userId)
      setGroups(orderGroups(data.groups))
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before the request starts, whenever the user changes
    void load()
  }, [load])

  const needle = query.trim().toLowerCase()

  const visibleGroups = useMemo(() => {
    if (!needle) return groups
    return groups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) => p.labelAr.toLowerCase().includes(needle) || p.key.toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.permissions.length > 0)
  }, [groups, needle])

  const isOpen = (key: string) => (needle ? true : (open[key] ?? key === PRIMARY_GROUP))

  const runAction = useCallback(
    async ({ kind, row }: Pending) => {
      setBusyKey(row.key)
      setRowErrors((m) => without(m, row.key))
      setNotices((m) => without(m, row.key))
      try {
        const next =
          kind === 'grant' ?
            await grantUserActionPermission(userId, row.key)
          : await revokeUserActionPermission(userId, row.key)
        // The server's row is the truth — no optimistic state.
        setGroups((g) => replaceRow(g, next))

        if (kind === 'revoke' && next.stillEffectiveAfterRevoke) {
          const why = next.sources
            .filter((s) => s.type === 'role' || s.type === 'system')
            .map((s) => s.labelAr || (s.type === 'system' ? 'صلاحية النظام' : 'الدور'))
            .join('، ')
          setNotices((m) => ({ ...m, [row.key]: `ما زالت فعّالة بسبب الدور/صلاحية النظام: ${why || '—'}` }))
        }
        successToast(kind === 'grant' ? 'تم المنح المباشر.' : 'تم سحب المنح المباشر.')
      } catch (e) {
        const message = getApiMessageOr(e, getApiErrorMessage(e))
        setRowErrors((m) => ({ ...m, [row.key]: message }))
        errorToast(message)
      } finally {
        setBusyKey(null)
      }
    },
    [userId],
  )

  const confirmPending = () => {
    const p = pending
    setPending(null)
    if (p) void runAction(p)
  }

  if (loading) return <LoadingPanel label="جارٍ تحميل صلاحيات الإجراءات…" />

  if (error) {
    return (
      <div className="space-y-2">
        <ErrorPanel title="تعذّر تحميل صلاحيات الإجراءات" hint={error} />
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          إعادة المحاولة
        </button>
      </div>
    )
  }

  if (groups.length === 0) {
    return <EmptyPanel title="لا توجد صلاحيات إجراءات" subtitle={`لم يُرجع الخادم أي صلاحية للمستخدم «${userName}».`} />
  }

  return (
    <section dir="rtl" aria-label="صلاحيات الإجراءات" className="space-y-3 text-right">
      <div>
        <h3 className="text-sm font-black text-navy">صلاحيات الإجراءات</h3>
        <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-500">
          ما يستطيع «{userName}» تنفيذه (وليس الصفحات التي يفتحها). الحالة والمصدر محسوبان في الخادم.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          aria-label="البحث في صلاحيات الإجراءات"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو المفتاح…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pe-10 ps-3 text-sm text-slate-800 outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/20"
        />
      </div>

      {visibleGroups.length === 0 ?
        <EmptyPanel title="لا توجد صلاحيات مطابقة" subtitle="جرّب اسمًا أو مفتاحًا آخر." />
      : visibleGroups.map((g) => {
          const expanded = isOpen(g.key)
          const panelId = `action-group-${g.key}`
          return (
            <div key={g.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen((m) => ({ ...m, [g.key]: !expanded }))}
                className="flex w-full items-center justify-between gap-2 bg-slate-50 px-4 py-2.5 text-right"
              >
                <span className="text-[13px] font-black text-navy">
                  {g.labelAr}
                  <span className="ms-2 text-[11px] font-bold text-slate-400">({g.permissions.length})</span>
                </span>
                {expanded ?
                  <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden />
                : <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />}
              </button>

              {expanded ?
                <ul id={panelId} className="divide-y divide-slate-100">
                  {g.permissions.map((p) => (
                    <li key={p.key} data-permission-key={p.key} className="space-y-2 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-black text-navy">{p.labelAr || p.key}</p>
                          <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-500" dir="ltr">
                            {p.key}
                          </p>
                          {p.descriptionAr ?
                            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{p.descriptionAr}</p>
                          : null}
                        </div>
                        <ActionEffectiveChip effective={p.effective} />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <ActionSourceChips sources={p.sources} />
                        {p.directState && p.directExpiresAt ?
                          <span className="text-[11px] font-semibold text-slate-500">ينتهي: {p.directExpiresAt}</span>
                        : null}
                        {p.grantedBy?.name ?
                          <span className="text-[11px] font-semibold text-slate-500">بواسطة: {p.grantedBy.name}</span>
                        : null}
                      </div>

                      {p.explicitOnly ?
                        <div
                          role="note"
                          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-900"
                        >
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                          لا تُمنح تلقائيًا؛ تُمنح صراحةً لشخص محدد
                        </div>
                      : null}

                      {notices[p.key] ?
                        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                          {notices[p.key]}
                        </p>
                      : null}

                      {rowErrors[p.key] ?
                        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-900">
                          {rowErrors[p.key]}
                        </p>
                      : null}

                      {(p.canGrant && p.directState !== 'allow') || p.canRevoke ?
                        <div className="flex flex-wrap gap-2">
                          {p.canGrant && p.directState !== 'allow' ?
                            <button
                              type="button"
                              disabled={busyKey === p.key}
                              onClick={() => setPending({ kind: 'grant', row: p })}
                              className={cn(
                                'rounded-lg bg-navy px-3 py-1.5 text-xs font-black text-white transition hover:opacity-90',
                                busyKey === p.key && 'opacity-50',
                              )}
                            >
                              منح مباشر
                            </button>
                          : null}
                          {p.canRevoke ?
                            <button
                              type="button"
                              disabled={busyKey === p.key}
                              onClick={() => setPending({ kind: 'revoke', row: p })}
                              className={cn(
                                'rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-black text-rose-700 transition hover:bg-rose-50',
                                busyKey === p.key && 'opacity-50',
                              )}
                            >
                              سحب المنح المباشر
                            </button>
                          : null}
                        </div>
                      : null}
                    </li>
                  ))}
                </ul>
              : null}
            </div>
          )
        })
      }

      <ConfirmDialog
        open={pending != null}
        variant={pending?.kind === 'revoke' ? 'danger' : 'primary'}
        title={pending?.kind === 'revoke' ? 'سحب المنح المباشر؟' : 'منح مباشر؟'}
        description={
          pending ?
            pending.kind === 'revoke' ?
              `سيُسحب المنح المباشر لصلاحية «${pending.row.labelAr || pending.row.key}» من «${userName}». قد تبقى فعّالة إن كان الدور أو النظام يمنحها.`
            : `ستُمنح صلاحية «${pending.row.labelAr || pending.row.key}» مباشرةً إلى «${userName}» فقط، دون أي مستخدم آخر بنفس الدور.`
          : undefined
        }
        confirmLabel={pending?.kind === 'revoke' ? 'سحب' : 'منح'}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
    </section>
  )
}
