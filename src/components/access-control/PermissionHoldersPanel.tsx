import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Info, RefreshCw, Search } from 'lucide-react'
import { fetchPermissionHolders, type PermissionHolders } from '@/api/actionPermissionsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { ActionSourceChips } from '@/components/access-control/ActionPermissionBadges'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'

/**
 * «من يملك هذه الصلاحية» — who holds one permission: the roles that grant it, the users with a
 * direct grant, and every user for whom it is EFFECTIVE (with source chips). Read-only; the
 * server computes all three lists.
 */

const PER_PAGE = 15

export function PermissionHoldersPanel({ permissionKey }: { permissionKey: string }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PermissionHolders | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const requestId = useRef(0)
  const term = useDebouncedValue(search.trim(), 300)

  const [seen, setSeen] = useState({ term, permissionKey })
  if (seen.term !== term || seen.permissionKey !== permissionKey) {
    setSeen({ term, permissionKey })
    setPage(1)
  }

  useEffect(() => {
    const id = ++requestId.current
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the loading flag must flip before the request starts, whenever its inputs change
    setLoading(true)
    setError(null)
    fetchPermissionHolders(permissionKey, { search: term, page, perPage: PER_PAGE })
      .then((res) => {
        if (id === requestId.current) setData(res)
      })
      .catch((e: unknown) => {
        if (id === requestId.current) setError(getApiErrorMessage(e))
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
  }, [permissionKey, term, page, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  if (error) {
    return (
      <div role="alert" dir="rtl" className="space-y-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-right">
        <p className="text-[13px] font-black text-red-900">تعذّر تحميل من يملك هذه الصلاحية</p>
        <p className="text-xs font-semibold text-red-900/85">{error}</p>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-100"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          إعادة المحاولة
        </button>
      </div>
    )
  }

  if (!data) {
    return <p dir="rtl" className="py-10 text-center text-[13px] font-semibold text-slate-400">جارٍ تحميل أصحاب الصلاحية…</p>
  }

  const eff = data.effectiveUsers

  return (
    <section dir="rtl" aria-label="من يملك هذه الصلاحية" className="space-y-4 text-right">
      <div>
        <p className="text-sm font-black text-navy">{data.permission.labelAr || data.permission.key}</p>
        <p className="font-mono text-[11px] font-semibold text-slate-500" dir="ltr">
          {data.permission.key}
        </p>
        {data.permission.descriptionAr ?
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{data.permission.descriptionAr}</p>
        : null}
      </div>

      {data.permission.explicitOnly ?
        <div role="note" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          لا تُمنح تلقائيًا؛ تُمنح صراحةً لشخص محدد
        </div>
      : null}

      <div>
        <h4 className="mb-1.5 text-xs font-black text-slate-500">الأدوار التي تمنحها ({data.roles.length})</h4>
        {data.roles.length === 0 ?
          <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs font-semibold text-slate-400">
            لا يوجد دور يمنح هذه الصلاحية
          </p>
        : <ul className="flex flex-wrap gap-1.5">
            {data.roles.map((r) => (
              <li
                key={`${r.source}-${r.id}-${r.name}`}
                className="rounded-full bg-customBlue/10 px-2.5 py-1 text-[11px] font-bold text-customBlue ring-1 ring-customBlue/25"
              >
                {r.displayName}
                <span className="ms-1.5 text-slate-500">
                  {r.source === 'system' ? 'صلاحية النظام' : `${r.usersCount} مستخدم`}
                </span>
              </li>
            ))}
          </ul>
        }
      </div>

      <div>
        <h4 className="mb-1.5 text-xs font-black text-slate-500">منح مباشر ({data.directUsers.total})</h4>
        {data.directUsers.items.length === 0 ?
          <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs font-semibold text-slate-400">
            لا توجد منح مباشرة
          </p>
        : <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {data.directUsers.items.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black text-navy">{u.name}</p>
                  <p className="truncate text-[11px] font-semibold text-slate-500" dir="ltr">
                    {u.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 ring-1',
                      u.state === 'deny' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                    )}
                  >
                    {u.state === 'deny' ? 'منع مباشر' : 'منح مباشر'}
                  </span>
                  {u.grantedBy ? <span>بواسطة: {u.grantedBy}</span> : null}
                  {u.expiresAt ? <span>ينتهي: {u.expiresAt}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        }
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-black text-slate-500">المستخدمون الذين تسري عليهم فعليًا</h4>
          <span data-testid="holders-effective-total" className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-600">
            {eff.total} مستخدم
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            aria-label="البحث في أصحاب الصلاحية"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو البريد…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pe-10 ps-3 text-sm text-slate-800 outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/20"
          />
        </div>

        {eff.items.length === 0 ?
          <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-[13px] font-semibold text-slate-400">
            {loading ? 'جارٍ التحميل…' : term ? 'لا يوجد مستخدمون مطابقون للبحث' : 'لا يملك أحد هذه الصلاحية حاليًا'}
          </p>
        : <ul className={cn('divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white', loading && 'opacity-60')}>
            {eff.items.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black text-navy">
                    {u.name}
                    {!u.isActive ? <span className="ms-2 text-[11px] font-bold text-slate-400">(غير نشط)</span> : null}
                  </p>
                  <p className="truncate text-[11px] font-semibold text-slate-500" dir="ltr">
                    {u.email}
                  </p>
                </div>
                <ActionSourceChips sources={u.sources} />
              </li>
            ))}
          </ul>
        }

        {eff.lastPage > 1 ?
          <nav aria-label="تصفح صفحات أصحاب الصلاحية" className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              السابق
            </button>
            <span className="text-xs font-bold text-slate-500">
              صفحة {page} من {eff.lastPage}
            </span>
            <button
              type="button"
              disabled={page >= eff.lastPage || loading}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
            >
              التالي
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
          </nav>
        : null}
      </div>
    </section>
  )
}
