import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import type { RoleMemberSource } from '@/api/roleMembersApi'
import { useRoleMembers } from '@/hooks/useRoleMembers'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { cn } from '@/lib/utils'

/**
 * Members of a role — ONE component for the roles drawer tab and the access-control «الأدوار» section.
 * The count shown is the server's `total` for the very list below it, so the two can never disagree.
 */

const SOURCE_LABEL: Record<RoleMemberSource, string> = {
  primary: 'دور أساسي',
  additional: 'دور إضافي',
  specialized: 'دور متخصص',
}

export function RoleMembersPanel({
  roleSlug,
  roleLabelAr,
  className,
}: {
  roleSlug: string
  roleLabelAr: string
  className?: string
}) {
  const { search, setSearch, page, setPage, lastPage, items, total, loading, error, reload } = useRoleMembers(roleSlug)

  return (
    <section dir="rtl" aria-label={`مستخدمو الدور ${roleLabelAr}`} className={cn('space-y-3 text-right', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-navy">مستخدمو الدور «{roleLabelAr}»</h3>
        {!error ?
          <span data-testid="role-members-total" className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-600">
            {loading && items.length === 0 ? '…' : `${total} مستخدم`}
          </span>
        : null}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          aria-label="البحث في مستخدمي الدور"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو البريد…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pe-10 ps-3 text-sm text-slate-800 outline-none transition focus:border-customBlue focus:ring-2 focus:ring-customBlue/20"
        />
      </div>

      {error ?
        <div role="alert" className="space-y-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
          <p className="text-[13px] font-black text-red-900">تعذّر تحميل مستخدمي الدور</p>
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
      : loading && items.length === 0 ?
        <p className="py-8 text-center text-[13px] font-semibold text-slate-400">جارٍ تحميل المستخدمين…</p>
      : items.length === 0 ?
        <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-[13px] font-semibold text-slate-400">
          {search.trim() ? 'لا يوجد مستخدمون مطابقون للبحث' : 'لا يوجد مستخدمون مرتبطون بهذا الدور حالياً'}
        </p>
      : <ul className={cn('divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white', loading && 'opacity-60')}>
          {items.map((u) => (
            <li key={`${u.id}-${u.roleSource}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-customBlue/10 text-[12px] font-black text-customBlue">
                {initialsFromName(u.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-black text-navy">{u.name}</p>
                <p className="truncate text-[11px] font-semibold text-slate-500" dir="ltr">
                  {u.email}
                </p>
              </div>
              <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                {SOURCE_LABEL[u.roleSource]}
              </span>
              {u.isActive ?
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">
                  نشط
                </span>
              : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                  غير نشط
                </span>}
            </li>
          ))}
        </ul>
      }

      {!error && lastPage > 1 ?
        <nav aria-label="تصفح صفحات المستخدمين" className="flex items-center justify-between gap-2">
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
            صفحة {page} من {lastPage}
          </span>
          <button
            type="button"
            disabled={page >= lastPage || loading}
            onClick={() => setPage(page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
          >
            التالي
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </button>
        </nav>
      : null}
    </section>
  )
}
