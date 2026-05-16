import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { GraduationCap, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ADMIN_USER_FORBIDDEN_AR, fetchAdminUsers, type AdminManagedUser } from '@/api/adminUsersApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { normalizeRole } from '@/utils/dashboardAccess'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { CrudFilterBar, MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { CrudCardTable, CrudTable, Th, Tr, Td } from '@/pages/super-admin/crud/shared/TableChrome'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
import { Link, useNavigate } from 'react-router-dom'
import {
  SaGlassCard,
  SaPageRoot,
  SaStatChip,
  SaToolbar,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

/** Placeholder مسار تعلّم مرئي حتى يصل عمود التقدّم من LMS — لا يغيّر بيانات الخادم. */
function pseudoProgressPct(userId: number, active: boolean): number {
  const base = (userId % 97) + (active ? 3 : 0)
  return Math.min(100, Math.max(4, base))
}

export default function StudentsManagementPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AdminManagedUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [campus, setCampus] = useState<'all' | 'active' | 'inactive'>('all')
  const [view, setView] = useState<AdminManagedUser | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setHint(null)
    setForbidden(false)
    try {
      const rows = await fetchAdminUsers()
      const students = rows.filter((u) => normalizeRole(u.role) === 'student')
      setUsers(students)
      if (students.length === 0 && rows.length > 0)
        setHint('القائمة المرجعية لا تحتوي دور «طالب» حالياً وفق الـ API — راجع إسناد الأدوار.')
      else if (rows.length === 0) setHint('لم تُرجِع نقطة المستخدمين أي سجلات؛ قد لا تزال الواجهة الخلفية قيد الإكمال.')
    } catch (e) {
      setUsers([])
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        setForbidden(true)
        toast.warning(ADMIN_USER_FORBIDDEN_AR)
      } else setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return users.filter((u) => {
      if (campus === 'active' && u.is_active === false) return false
      if (campus === 'inactive' && u.is_active !== false) return false
      return !t || `${u.name} ${u.email}`.toLowerCase().includes(t)
    })
  }, [users, q, campus])

  const total = users.length
  const active = users.filter((u) => u.is_active !== false).length
  const inactive = users.filter((u) => u.is_active === false).length

  return (
    <SaPageRoot>
      <SaToolbar
        eyebrow="CRM المتعلّمين"
        title="الطلاب"
        subtitle="لوحة علاقات الطلاب مع حالة الحساب ومؤشر تقدّم مرئي مؤقت — المصدر هو مستخدمون بدور طالب من GET /admin/users."
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <Link
              to="/dashboard/student"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#EC943C] px-4 py-2.5 text-[12px] font-black text-white shadow-md"
            >
              <GraduationCap className="h-4 w-4" aria-hidden />
              لوحة الطالب
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <SaGlassCard glow="blue" className="p-5 lg:col-span-2">
          <p className="text-[11px] font-black text-deepBlue">حالة القمع الب CRM</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SaStatChip label="طلاب مُعرّفون" value={total} tone="blue" />
            <SaStatChip label="نشط" value={active} tone="success" />
            <SaStatChip label="موقوف" value={inactive} tone="orange" />
          </div>
          <p className="mt-4 text-[11px] font-bold leading-relaxed text-muted-600">
            عمود التقدّم يعرض قيمة مرئية مؤقتة إلى أن يصل حقل التقدّم من LMS أو نقطة الطلاب المخصّصة.
          </p>
        </SaGlassCard>
        <SaGlassCard glow="orange" className="flex flex-col justify-center p-5 text-right">
          <p className="text-[11px] font-black text-accent-800">مسارات بديلة</p>
          <p className="mt-2 text-[13px] font-semibold text-muted-700">
            انتقل إلى المدفوعات أو الشهادات عند مراجعة الدورة الكاملة للمتعلّم.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              to="/dashboard/admin/finance/payments"
              className="rounded-xl bg-deepBlue px-3 py-2 text-center text-[11px] font-black text-white"
            >
              المدفوعات
            </Link>
            <Link
              to="/dashboard/admin/certificates"
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-center text-[11px] font-black text-deepBlue"
            >
              الشهادات
            </Link>
          </div>
        </SaGlassCard>
      </div>

      {hint && !loading && !error && !forbidden ?
        <div className="mt-6 rounded-[22px] border border-accent-400/35 bg-accent-400/10 px-4 py-3 text-right text-[12px] font-bold text-accent-950">
          {hint}
        </div>
      : null}

      <div className="mt-6 space-y-4">
        <CrudFilterBar searchValue={q} onSearchChange={setQ} searchPlaceholder="بحث بالاسم أو البريد…">
          <MiniSelect
            label="الحالة"
            value={campus}
            onChange={(v) => setCampus(v as 'all' | 'active' | 'inactive')}
            options={[
              { value: 'all', labelAr: 'الكل' },
              { value: 'active', labelAr: 'نشط' },
              { value: 'inactive', labelAr: 'موقوف' },
            ]}
          />
        </CrudFilterBar>

        {forbidden ?
          <ErrorPanel title={ADMIN_USER_FORBIDDEN_AR} />
        : error ?
          <ErrorPanel title="تنبيه البيانات" hint={error} />
        : loading ?
          <LoadingPanel />
        : !filtered.length ?
          <EmptyPanel title="لا طلاب مطابقون" subtitle="جرّب فلتر الحالة أو تحقق من أن المستخدمين أُسند لهم دور طالب." />
        :
          <SaGlassCard className="overflow-hidden p-0">
            <CrudCardTable>
              <CrudTable>
                <thead>
                  <tr>
                    <Th>الطالب</Th>
                    <Th>البريد</Th>
                    <Th>الحالة</Th>
                    <Th>مسار التعلّم (لمحة)</Th>
                    <Th>آخر تحديث</Th>
                    <Th className="text-end">إجراءات</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const pct = pseudoProgressPct(u.id, u.is_active !== false)
                    return (
                      <Tr key={u.id}>
                        <Td>
                          <div dir="rtl" className="flex min-w-0 items-center gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-white text-[11px] font-black text-brand-900 ring-1 ring-brand-200/70">
                              {initialsFromName(u.name)}
                            </div>
                            <div className="min-w-0 flex-1 text-right rtl:text-right">
                              <p className="truncate font-black text-deepBlue">{u.name}</p>
                              <p className="text-[11px] font-bold text-muted-500">#{u.id}</p>
                            </div>
                          </div>
                        </Td>
                        <Td className="max-w-[14rem] break-all text-right text-[12px] font-semibold text-muted-700 rtl:text-right">
                          {u.email}
                        </Td>
                        <Td>
                          {u.is_active === false ?
                            <CrudBadge variant="danger">موقوف</CrudBadge>
                          : <CrudBadge variant="success">نشط</CrudBadge>}
                        </Td>
                        <Td className="min-w-[140px]">
                          <div dir="rtl" className="space-y-1.5 text-right">
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-ink-100/80">
                              <div
                                className="h-full rounded-full bg-gradient-to-l from-[#2691C2] to-[#22334A] transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-[10px] font-black text-muted-500">{pct}% مؤشر مرئي</p>
                          </div>
                        </Td>
                        <Td className="text-[12px] font-bold text-muted-600">
                          {(u.updated_at ?? u.created_at ?? '—').toString().slice(0, 10)}
                        </Td>
                        <Td className="text-end">
                          <RowActionsMenu
                            ariaLabel={u.name}
                            actions={[
                              { key: 'v', label: 'عرض', onClick: () => setView(u) },
                              {
                                key: 'u',
                                label: 'إدارة المستخدم',
                                onClick: () => navigate('/dashboard/super-admin/crud/users'),
                              },
                            ]}
                          />
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </CrudTable>
            </CrudCardTable>
          </SaGlassCard>
        }
      </div>

      <CrudModal open={view !== null} onClose={() => setView(null)} title={view?.name ?? ''} subtitle="بطاقة طالب">
        {view ?
          <div className="space-y-2 text-right text-[13px] font-semibold text-muted-700">
            <p>{view.email}</p>
            <p>
              لإدارة كاملة للأدوار والحذف استخدم{' '}
              <Link className="font-black text-customBlue" to="/dashboard/super-admin/crud/users">
                إدارة المستخدمين
              </Link>
            </p>
          </div>
        : null}
      </CrudModal>
    </SaPageRoot>
  )
}
