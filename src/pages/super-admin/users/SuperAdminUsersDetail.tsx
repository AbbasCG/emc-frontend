import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import toast from '@/lib/toast'
import { PenLine, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  ADMIN_USER_FORBIDDEN_AR,
  deleteAdminUser,
  fetchAdminUser,
  getAdminUserMutationMessage,
  restoreAdminUser,
  type AdminManagedUser,
} from '@/api/adminUsersApi'
import { adminRoleLabelAr } from '@/pages/super-admin/users/assignableRoles'
import {
  canDeleteAdminUserRow,
  canEditAdminUserRow,
} from '@/pages/super-admin/users/superAdminUserPolicy'
import { SuperAdminCrudHeader } from '@/pages/super-admin/SuperAdminCrudHeader'
import { SUPER_ADMIN_CRUD } from '@/pages/super-admin/superAdminEntities'
import { formatDateTime } from '@/utils/dateTime'

type Props = { userId: number }

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

export default function SuperAdminUsersDetail({ userId }: Props) {
  const { user: currentUser } = useAuth()
  const meta = SUPER_ADMIN_CRUD.users

  const [row, setRow] = useState<AdminManagedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setForbidden(false)
    try {
      const u = await fetchAdminUser(userId)
      setRow(u)
    } catch (e) {
      setRow(null)
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        setForbidden(true)
        toast.warning(ADMIN_USER_FORBIDDEN_AR)
      } else {
        toast.error(getAdminUserMutationMessage(e))
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const actorId = currentUser?.id ?? 0

  const editAllowed =
    row && currentUser?.role ? canEditAdminUserRow(currentUser.role, row.role) : false

  const deleteAllowed =
    row && currentUser?.role ?
      canDeleteAdminUserRow(actorId, currentUser.role, row.id, row.role)
    : false

  const userStatus = row ? getUserStatus(row) : 'active'
  const isDisabledUser = userStatus === 'deleted' || userStatus === 'inactive' || userStatus === 'suspended'

  async function confirmDelete() {
    if (!row) return
    if (!pendingDelete) {
      setPendingDelete(true)
      toast.message(
        'هل أنت متأكد من تعطيل هذا المستخدم؟ سيتم إيقاف الحساب ومنع تسجيل الدخول، لكن ستبقى بيانات المستخدم محفوظة للأرشفة والتقارير.',
        { duration: 6000 },
      )
      return
    }
    setDeleting(true)
    try {
      await deleteAdminUser(row.id)
      toast.success('تم تعطيل المستخدم بنجاح')
      setPendingDelete(false)
      await load()
    } catch (e) {
      toast.warning(getAdminUserMutationMessage(e))
      setPendingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  async function handleRestore() {
    if (!row) return
    setRestoring(true)
    try {
      await restoreAdminUser(row.id)
      toast.success('تمت استعادة المستخدم بنجاح')
      await load()
    } catch (e) {
      toast.warning(getAdminUserMutationMessage(e))
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return (
      <div dir="rtl" className="flex min-h-[30vh] items-center justify-center text-[13px] font-bold text-slate-500">
        جارٍ تحميل المستخدم…
      </div>
    )
  }

  if (forbidden || !row) {
    return (
      <div dir="rtl" className="space-y-6">
        <SuperAdminCrudHeader meta={meta} />
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-[13px] font-black text-amber-950">
          {!row && !forbidden ? 'تعذّر تحميل السجل.' : ADMIN_USER_FORBIDDEN_AR}
        </p>
        <div className="text-center">
          <Link to="/dashboard/super-admin/crud/users" className="text-[12px] font-black text-customBlue hover:underline">
            العودة للقائمة
          </Link>
        </div>
      </div>
    )
  }

  const selfNote = actorId === row.id

  return (
    <div dir="rtl" className="space-y-6">
      <SuperAdminCrudHeader
        meta={{ ...meta, subtitleAr: 'تفاصيل المستخدم والإجراءات الحسّاسة وفق سياسات الحساب.' }}
        actionSlot={
          editAllowed ? (
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/dashboard/super-admin/crud/users/${row.id}/edit`}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-[11px] font-black text-white hover:bg-slate-800 transition-colors"
              >
                <PenLine className="h-4 w-4" aria-hidden />
                تحرير
              </Link>

              {/* Restore button — shown when user is disabled/deleted */}
              {isDisabledUser && (
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() => void handleRestore()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400 bg-emerald-50 px-4 py-2 text-[11px] font-black text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${restoring ? 'animate-spin' : ''}`} aria-hidden />
                  {restoring ? 'جارٍ الاستعادة…' : 'استعادة المستخدم'}
                </button>
              )}

              {/* Delete / Disable button — only shown if user is currently active */}
              {deleteAllowed && !isDisabledUser ? (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void confirmDelete()}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-[11px] font-black transition-colors ${
                    pendingDelete
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50'
                  }`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {pendingDelete ? 'تعطيل المستخدم' : 'تعطيل'}
                </button>
              ) : !isDisabledUser ? (
                selfNote ? (
                  <span
                    title="سياسات المنصّة: لا يمكن للمستخدم تعطيل حسابه من هذا المسار"
                    className="cursor-not-allowed rounded-2xl border border-transparent px-4 py-2 text-[11px] font-bold text-slate-400 opacity-65"
                  >
                    تعطيل (غير متاح لحسابك)
                  </span>
                ) : (
                  <span
                    title="تعديل أو تعطيل مستخدم له دور سوبر مشرف غير مصرّح؛ الخادم يفرض ذلك أيضاً."
                    className="cursor-not-allowed rounded-2xl border border-transparent px-4 py-2 text-[11px] font-bold text-slate-400 opacity-65"
                  >
                    تعطيل غير مصرّح
                  </span>
                )
              ) : null}
            </div>
          ) : (
            <div className="text-right">
              <span
                title={ADMIN_USER_FORBIDDEN_AR}
                className="inline-block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black text-slate-500"
              >
                لا يمكنك تحرير أو تعطيل هذا المستخدم
              </span>
            </div>
          )
        }
      />

      {/* Warning banner for inactive / deleted users */}
      {isDisabledUser && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-right text-[13px] font-bold text-amber-900">
          <p>هذا الحساب غير نشط حاليًا ولا يمكنه تسجيل الدخول.</p>
          {row.deleted_at && (
            <p className="mt-1 text-[12px] font-semibold text-amber-700">
              تاريخ التعطيل: {formatDateTime(row.deleted_at)}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[24px] border border-deepBlue/[0.06] bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-right text-lg font-black text-deepBlue">البيانات</h2>
          <dl className="mt-4 space-y-3 text-right text-[13px] font-semibold">
            <div className="flex justify-between gap-4 border-b border-deepBlue/[0.04] pb-2">
              <dt className="text-slate-500">المعرّف</dt>
              <dd className="font-mono text-deepBlue">{row.id}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-deepBlue/[0.04] pb-2">
              <dt className="text-slate-500">الاسم</dt>
              <dd className="text-deepBlue">{row.name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-deepBlue/[0.04] pb-2">
              <dt className="text-slate-500">البريد</dt>
              <dd className="break-all text-slate-700">{row.email}</dd>
            </div>
            {row.phone && (
              <div className="flex justify-between gap-4 border-b border-deepBlue/[0.04] pb-2">
                <dt className="text-slate-500">الهاتف</dt>
                <dd className="text-slate-700">{row.phone}</dd>
              </div>
            )}
            {row.city && (
              <div className="flex justify-between gap-4 border-b border-deepBlue/[0.04] pb-2">
                <dt className="text-slate-500">المدينة</dt>
                <dd className="text-slate-700">{row.city}</dd>
              </div>
            )}
            {row.country && (
              <div className="flex justify-between gap-4 border-b border-deepBlue/[0.04] pb-2">
                <dt className="text-slate-500">الدولة</dt>
                <dd className="text-slate-700">{row.country}</dd>
              </div>
            )}
            {row.gender && (
              <div className="flex justify-between gap-4 border-b border-deepBlue/[0.04] pb-2">
                <dt className="text-slate-500">الجنس</dt>
                <dd className="text-slate-700">{row.gender === 'male' ? 'ذكر' : row.gender === 'female' ? 'أنثى' : row.gender}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-b border-deepBlue/[0.04] pb-2">
              <dt className="text-slate-500">الدور</dt>
              <dd>
                <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-[11px] font-black text-brand-900">
                  {adminRoleLabelAr(row.role)}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-deepBlue/[0.04] pb-2">
              <dt className="text-slate-500">الحالة</dt>
              <dd><UserStatusBadge user={row} /></dd>
            </div>
            {row.deleted_at && (
              <div className="flex justify-between gap-4 border-b border-deepBlue/[0.04] pb-2">
                <dt className="text-slate-500">تاريخ التعطيل</dt>
                <dd className="text-red-700">{formatDateTime(row.deleted_at)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 pt-1">
              <dt className="text-slate-500">آخر تحديث</dt>
              <dd className="text-slate-700">{formatDateTime(row.updated_at ?? row.created_at)}</dd>
            </div>
          </dl>
          <Link
            to="/dashboard/super-admin/crud/users"
            className="mt-6 inline-block text-[12px] font-black text-customBlue hover:underline"
          >
            ← قائمة المستخدمين
          </Link>
        </div>
        <aside className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-5 text-right text-[12px] font-bold leading-relaxed text-slate-700">
          تمثّل هذه الشاشة واجهة فقط: أي رفض من الخادم (403 أو غيره) هو المصدر الموثوق. رسالة المواءمة:
          «{ADMIN_USER_FORBIDDEN_AR}»
        </aside>
      </div>
    </div>
  )
}
