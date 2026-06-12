import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckSquare,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Shield,
  Square,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  fetchAdminPermissionsCatalog,
  fetchRolePermissions,
  permissionsApiErrorMessage,
  updateRolePermissions,
  type AdminPermissionGroup,
  type AdminPermissionItem,
} from '@/api/rolesPermissionsApi'
import {
  permissionActionLabelAr,
  permissionDescriptionAr,
  permissionGroupLabelAr,
  sortPermissionGroups,
} from '@/utils/permissionLabels'
import { cn } from '@/lib/utils'

type Props = {
  roleSlug: string
  canEdit: boolean
  /** When false, skip loading. Bump/refetch when drawer reopens. */
  open?: boolean
  onGrantedCountChange?: (count: number) => void
}

function mergeCatalogWithRoleKeys(
  groups: AdminPermissionGroup[],
  roleKeys: string[],
): AdminPermissionGroup[] {
  const known = new Set(groups.flatMap((g) => g.permissions.map((p) => p.key)))
  const extras = roleKeys.filter((k) => k && !known.has(k))
  if (extras.length === 0) return groups

  const byGroup = new Map<string, AdminPermissionItem[]>()
  for (const key of extras) {
    const groupKey = key.includes('.') ? key.split('.')[0]! : 'general'
    const list = byGroup.get(groupKey) ?? []
    list.push({ key, label: '', description: '' })
    byGroup.set(groupKey, list)
  }

  const merged = [...groups]
  for (const [key, permissions] of byGroup) {
    const existing = merged.find((g) => g.key === key)
    if (existing) existing.permissions.push(...permissions)
    else merged.push({ key, label: key, permissions })
  }
  return sortPermissionGroups(merged)
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const k of a) if (!b.has(k)) return false
  return true
}

export function RolePermissionsMatrix({ roleSlug, canEdit, open = true, onGrantedCountChange }: Props) {
  const [catalogGroups, setCatalogGroups] = useState<AdminPermissionGroup[]>([])
  const [roleKeysForMerge, setRoleKeysForMerge] = useState<string[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [baseline, setBaseline] = useState<Set<string>>(new Set())

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    try {
      const cat = await fetchAdminPermissionsCatalog()
      setCatalogGroups(sortPermissionGroups(cat.groups))
      setApiError(cat.allKeys.length === 0 ? 'لم يُرجع الخادم أي صلاحيات — تحقق من GET /admin/permissions.' : null)
    } catch (err) {
      setCatalogGroups([])
      setApiError(permissionsApiErrorMessage(err))
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  const loadRolePermissions = useCallback(async (slug: string) => {
    setRoleLoading(true)
    try {
      const keys = await fetchRolePermissions(slug)
      const next = new Set(keys)
      setSelected(next)
      setBaseline(new Set(keys))
      setRoleKeysForMerge(keys)
      onGrantedCountChange?.(keys.length)
      setApiError(null)
    } catch (err) {
      setSelected(new Set())
      setBaseline(new Set())
      onGrantedCountChange?.(0)
      setApiError(permissionsApiErrorMessage(err))
    } finally {
      setRoleLoading(false)
    }
  }, [onGrantedCountChange])

  useEffect(() => { void loadCatalog() }, [loadCatalog])

  useEffect(() => {
    if (!roleSlug || !open) return
    setSearch('')
    void loadRolePermissions(roleSlug)
  }, [roleSlug, open, loadRolePermissions])

  const dirty = useMemo(() => !setsEqual(selected, baseline), [selected, baseline])

  useEffect(() => {
    onGrantedCountChange?.(selected.size)
  }, [selected, onGrantedCountChange])

  const displayGroups = useMemo(
    () => mergeCatalogWithRoleKeys(catalogGroups, roleKeysForMerge),
    [catalogGroups, roleKeysForMerge],
  )

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return displayGroups
    return displayGroups
      .map((g) => {
        const groupLabel = permissionGroupLabelAr(g.key, g.label).toLowerCase()
        const permissions = g.permissions.filter((p) => {
          const label = permissionActionLabelAr(p.key, p.label).toLowerCase()
          return p.key.toLowerCase().includes(q) || label.includes(q) || groupLabel.includes(q)
        })
        return permissions.length > 0 ? { ...g, permissions } : null
      })
      .filter((g): g is AdminPermissionGroup => g != null)
  }, [displayGroups, search])

  function togglePermission(key: string) {
    if (!canEdit) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleGroup(group: AdminPermissionGroup, checked: boolean) {
    if (!canEdit) return
    setSelected((prev) => {
      const next = new Set(prev)
      for (const p of group.permissions) {
        if (checked) next.add(p.key)
        else next.delete(p.key)
      }
      return next
    })
  }

  function groupState(group: AdminPermissionGroup): 'all' | 'some' | 'none' {
    const keys = group.permissions.map((p) => p.key)
    const granted = keys.filter((k) => selected.has(k)).length
    if (granted === 0) return 'none'
    if (granted === keys.length) return 'all'
    return 'some'
  }

  function resetChanges() {
    setSelected(new Set(baseline))
  }

  async function saveChanges() {
    if (!canEdit || !dirty) return
    setSaving(true)
    try {
      await updateRolePermissions(roleSlug, [...selected].sort())
      const keys = await fetchRolePermissions(roleSlug)
      const next = new Set(keys)
      setSelected(next)
      setBaseline(new Set(keys))
      setRoleKeysForMerge(keys)
      onGrantedCountChange?.(keys.length)
      toast.success('تم حفظ صلاحيات الدور')
    } catch (err) {
      toast.error(permissionsApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const loading = catalogLoading || roleLoading

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#2691C2]" aria-hidden />
        <p className="text-[13px] font-semibold text-slate-500">جارٍ تحميل الصلاحيات…</p>
      </div>
    )
  }

  if (apiError && catalogGroups.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-center">
        <Shield className="mx-auto h-8 w-8 text-amber-600" aria-hidden />
        <p className="mt-3 text-[13px] font-black text-amber-900">{apiError}</p>
        <button
          type="button"
          onClick={() => { void loadCatalog(); void loadRolePermissions(roleSlug) }}
          className="mt-4 rounded-xl bg-[#22334A] px-4 py-2 text-[12px] font-black text-white"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الصلاحيات…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pe-3 ps-9 text-[12px] font-semibold text-[#22334A] outline-none focus:ring-2 focus:ring-[#2691C2]/30"
          />
        </div>
        {dirty && (
          <span className="rounded-full bg-[#EC943C]/15 px-3 py-1 text-[11px] font-black text-[#EC943C] ring-1 ring-[#EC943C]/25">
            تغييرات غير محفوظة
          </span>
        )}
        <span className="text-[11px] font-black text-slate-400">
          {selected.size} / {displayGroups.reduce((n, g) => n + g.permissions.length, 0)} مفعّلة
        </span>
      </div>

      {apiError && catalogGroups.length > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          {apiError}
        </p>
      )}

      {filteredGroups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-[13px] font-semibold text-slate-400">
          لا توجد صلاحيات مطابقة للبحث
        </p>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const state = groupState(group)
            const groupLabel = permissionGroupLabelAr(group.key, group.label)
            return (
              <section
                key={group.key}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-black/[0.03]"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-[#22334A]/[0.03] px-4 py-3">
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-black text-[#22334A]">{groupLabel}</h3>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">{group.key}</p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group, state !== 'all')}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-[#2691C2] transition hover:border-[#2691C2]/40"
                    >
                      {state === 'all' ?
                        <CheckSquare className="h-3.5 w-3.5" aria-hidden />
                      : <Square className="h-3.5 w-3.5" aria-hidden />}
                      {state === 'all' ? 'إلغاء الكل' : 'تحديد الكل'}
                    </button>
                  )}
                </div>

                <ul className="divide-y divide-slate-100">
                  {group.permissions.map((perm) => {
                    const checked = selected.has(perm.key)
                    const label = permissionActionLabelAr(perm.key, perm.label)
                    const desc = permissionDescriptionAr(perm.key, perm.description)
                    return (
                      <li key={perm.key}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-start gap-3 px-4 py-3 transition',
                            checked ? 'bg-[#2691C2]/[0.04]' : 'hover:bg-slate-50/80',
                            !canEdit && 'cursor-default',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canEdit}
                            onChange={() => togglePermission(perm.key)}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#2691C2] focus:ring-[#2691C2]/40 disabled:opacity-60"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[13px] font-black text-[#22334A]">{label}</span>
                              <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                                {perm.key}
                              </code>
                            </div>
                            {desc ? (
                              <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-slate-500">{desc}</p>
                            ) : null}
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {canEdit && (
        <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-slate-100 bg-white/95 pt-4 backdrop-blur-sm">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => void saveChanges()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#22334A] px-4 py-2.5 text-[12px] font-black text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            حفظ الصلاحيات
          </button>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={resetChanges}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-slate-600 transition hover:border-[#22334A]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            تراجع
          </button>
        </div>
      )}

      {!canEdit && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-500">
          عرض فقط — لا تملك صلاحية تعديل أدوار النظام أو صلاحيات الأدوار.
        </p>
      )}
    </div>
  )
}
