import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { getApiErrorMessage } from '@/api/apiErrors'
import { Link } from 'react-router-dom'
import { Eye, PenLine, Plus } from 'lucide-react'
import toast from '@/lib/toast'
import { useAuth } from '@/contexts/AuthContext'
import { fetchAdminUsers, ADMIN_USER_FORBIDDEN_AR, type AdminManagedUser } from '@/api/adminUsersApi'
import { canEditAdminUserRow } from '@/pages/super-admin/users/superAdminUserPolicy'
import { adminRoleLabelAr } from '@/pages/super-admin/users/assignableRoles'
import { SuperAdminCrudHeader } from '@/pages/super-admin/SuperAdminCrudHeader'
import { SUPER_ADMIN_CRUD } from '@/pages/super-admin/superAdminEntities'
import { formatDate } from '@/utils/dateTime'

type FilterKey = 'all' | 'active' | 'inactive' | 'deleted'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'النشطون' },
  { key: 'inactive', label: 'غير النشطين' },
  { key: 'deleted', label: 'المحذوفون' },
]

function getUserStatus(u: AdminManagedUser): 'active' | 'inactive' | 'deleted' | 'suspended' {
  if (u.deleted_at) return 'deleted'
  if (u.status === 'suspended') return 'suspended'
  if (u.is_active === false) return 'inactive'
  return 'active'
}

function UserStatusBadge({ user }: { user: AdminManagedUser }) {
  const s = getUserStatus(user)
  const map = {
    active:    { text: 'نشط',      cls: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80' },
    inactive:  { text: 'غير نشط',  cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80' },
    deleted:   { text: 'محذوف',    cls: 'bg-red-50 text-red-700 ring-1 ring-red-200/80' },
    suspended: { text: 'موقوف',    cls: 'bg-red-50 text-red-700 ring-1 ring-red-200/80' },
  }
  const { text, cls } = map[s]
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-black ${cls}`}>
      {text}
    </span>
  )
}

function matchesFilter(u: AdminManagedUser, filter: FilterKey): boolean {
  if (filter === 'all') return true
  const s = getUserStatus(u)
  if (filter === 'active') return s === 'active'
  if (filter === 'inactive') return s === 'inactive' || s === 'suspended'
  if (filter === 'deleted') return s === 'deleted'
  return true
}

export default function SuperAdminUsersListPage() {
  const { user: currentUser } = useAuth()
  const meta = SUPER_ADMIN_CRUD.users
  const [rows, setRows] = useState<AdminManagedUser[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setForbidden(false)
    setLoadError(null)
    try {
      const list = await fetchAdminUsers()
      setRows(list)
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        setForbidden(true)
        setRows([])
        toast.warning(ADMIN_USER_FORBIDDEN_AR)
      } else {
        setRows(null)
        setLoadError(getApiErrorMessage(e))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredRows = useMemo(() => {
    if (!rows) return null
    return rows.filter((u) => matchesFilter(u, activeFilter))
  }, [rows, activeFilter])

  const subtitle = useMemo(() => {
    if (loading) return 'جارٍ الاتصال بـ AdminUserController…'
    if (forbidden) return ADMIN_USER_FORBIDDEN_AR
    return 'قائمة المستخدمين من الخادم (المصدر النهائي للصلاحيات).'
  }, [loading, forbidden])

  return (
    <div dir="rtl" className="space-y-6">
      <SuperAdminCrudHeader meta={{ ...meta, subtitleAr: subtitle }} />

      {!forbidden && (
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-2xl border border-deepBlue/[0.12] px-4 py-2 text-[11px] font-black text-deepBlue hover:bg-slate-50 disabled:opacity-50"
            onClick={() => void load()}
            disabled={loading}
          >
            إعادة التحميل
          </button>
          <Link
            to="/dashboard/super-admin/crud/users/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-customBlue px-4 py-2.5 text-[12px] font-black text-white shadow-[0_10px_24px_rgba(15,61,146,0.22)] hover:bg-deepBlue transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden />
            مستخدم جديد
          </Link>
        </div>
      )}

      {loadError && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-[13px] font-bold text-red-900">{loadError}</p>
      )}

      <div className="overflow-hidden rounded-[24px] border border-deepBlue/[0.06] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-deepBlue/[0.06] bg-slate-50/90 px-4 py-3">
          <p className="text-[12px] font-black text-deepBlue">قائمة المستخدمين</p>
          {!forbidden && (
            <p className="text-[11px] font-bold text-slate-500">GET /admin/users?trashed=with</p>
          )}
        </div>

        {/* Filter tabs */}
        {!forbidden && !loading && rows && (
          <div className="flex flex-wrap gap-1.5 border-b border-deepBlue/[0.06] bg-white px-4 py-2.5">
            {FILTERS.map((f) => {
              const count = rows.filter((u) => matchesFilter(u, f.key)).length
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveFilter(f.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black transition-colors ${
                    activeFilter === f.key
                      ? 'bg-deepBlue text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center px-4 py-12 text-[13px] font-bold text-slate-500">جارٍ التحميل…</div>
        ) : forbidden ? (
          <div className="px-4 py-10 text-center text-[13px] font-black text-deepBlue">{ADMIN_USER_FORBIDDEN_AR}</div>
        ) : filteredRows ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-right text-[13px]">
              <thead>
                <tr className="bg-white text-[11px] font-black uppercase tracking-wide text-slate-500">
                  <th className="sticky top-0 z-[1] border-b border-deepBlue/[0.06] px-4 py-3">المعرّف</th>
                  <th className="sticky top-0 z-[1] border-b border-deepBlue/[0.06] px-4 py-3">الاسم</th>
                  <th className="sticky top-0 z-[1] border-b border-deepBlue/[0.06] px-4 py-3">البريد</th>
                  <th className="sticky top-0 z-[1] border-b border-deepBlue/[0.06] px-4 py-3">هاتف</th>
                  <th className="sticky top-0 z-[1] border-b border-deepBlue/[0.06] px-4 py-3">المدينة</th>
                  <th className="sticky top-0 z-[1] border-b border-deepBlue/[0.06] px-4 py-3">الدور</th>
                  <th className="sticky top-0 z-[1] border-b border-deepBlue/[0.06] px-4 py-3">الحالة</th>
                  <th className="sticky top-0 z-[1] border-b border-deepBlue/[0.06] px-4 py-3">تاريخ التعطيل</th>
                  <th className="sticky top-0 z-[1] border-b border-deepBlue/[0.06] px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-deepBlue">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      لا يوجد مستخدمون ضمن هذا التصفية.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const editOk = canEditAdminUserRow(currentUser?.role, row.role)
                    return (
                      <tr key={row.id} className={row.deleted_at ? 'opacity-70' : ''}>
                        <td className="border-b border-deepBlue/[0.04] px-4 py-3 font-mono text-[12px] text-slate-600">{row.id}</td>
                        <td className="border-b border-deepBlue/[0.04] px-4 py-3">{row.name}</td>
                        <td className="border-b border-deepBlue/[0.04] px-4 py-3 text-[12px] text-slate-600">{row.email}</td>
                        <td className="border-b border-deepBlue/[0.04] px-4 py-3 text-[12px] text-slate-500">{row.phone ?? '—'}</td>
                        <td className="border-b border-deepBlue/[0.04] px-4 py-3 text-[12px] text-slate-500">{row.city ?? '—'}</td>
                        <td className="border-b border-deepBlue/[0.04] px-4 py-3">
                          <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-[11px] font-black text-brand-900">
                            {adminRoleLabelAr(row.role)}
                          </span>
                        </td>
                        <td className="border-b border-deepBlue/[0.04] px-4 py-3">
                          <UserStatusBadge user={row} />
                        </td>
                        <td className="border-b border-deepBlue/[0.04] px-4 py-3 text-[12px] text-slate-500">
                          {row.deleted_at ? formatDate(row.deleted_at) : '—'}
                        </td>
                        <td className="border-b border-deepBlue/[0.04] px-4 py-3">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <Link
                              to={`/dashboard/super-admin/crud/users/${row.id}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-deepBlue/[0.1] px-2.5 py-1 text-[11px] font-black hover:border-customBlue/40 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden />
                              عرض
                            </Link>
                            {editOk ? (
                              <Link
                                to={`/dashboard/super-admin/crud/users/${row.id}/edit`}
                                className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white hover:bg-slate-800 transition-colors"
                              >
                                <PenLine className="h-3.5 w-3.5" aria-hidden />
                                تحرير
                              </Link>
                            ) : (
                              <span
                                title="محظور: تعديل مستخدم بدور سوبر مشرف لا يكون متاحاً إلا لمستخدم له دور سوبر مشرف. المصدر الفعلي للصلاحيات هو الخادم."
                                className="cursor-not-allowed rounded-xl border border-transparent px-2.5 py-1 text-[11px] font-bold text-slate-400 opacity-55"
                              >
                                تحرير
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="border-t border-deepBlue/[0.04] px-4 py-3 text-[11px] font-bold text-slate-500">
          الحذف يُعطّل الحساب مع الاحتفاظ بالبيانات. يمكن الاستعادة من صفحة التفاصيل. الخادم يرفض الحذف الذاتي أو تعديل دور سوبر مشرف دون امتياز.
        </div>
      </div>
    </div>
  )
}
