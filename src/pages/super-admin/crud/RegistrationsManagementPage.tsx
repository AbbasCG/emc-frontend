import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  ClipboardList,
  Layers,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react'
import {
  createAccountFromRegistration,
  fetchAdminRegistrations,
  type AdminRegistrationListFilters,
  type AdminRegistrationListRow,
} from '@/api/adminRegistrationsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { CrudCardTable, CrudTable, Td, Th, Tr } from '@/pages/super-admin/crud/shared/TableChrome'
import { EnterpriseCrudHero, EnterpriseMetricTile } from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'
import { SaGlassCard, SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

/* ─── helpers ────────────────────────────────────────────────────────────── */

function fmtDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16)
  return d.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })
}

function statusBadgeVariant(raw: string | null): 'success' | 'accent' | 'danger' | 'default' {
  const s = String(raw ?? '').toLowerCase()
  if (s.includes('confirm') || s.includes('approve') || s.includes('accept') || s.includes('paid'))
    return 'success'
  if (s.includes('pending') || s.includes('wait')) return 'accent'
  if (s.includes('cancel') || s.includes('reject') || s.includes('fail')) return 'danger'
  return 'default'
}

type AccountFilter = 'all' | 'linked' | 'guest'

const ACCOUNT_TABS: { id: AccountFilter; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'linked', label: 'حساب مرتبط' },
  { id: 'guest', label: 'تسجيل ضيف' },
]

/* ─── AccountBadge ───────────────────────────────────────────────────────── */

function AccountBadge({ hasAccount }: { hasAccount: boolean }) {
  if (hasAccount) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">
        <UserCheck className="h-3 w-3" />
        حساب مرتبط
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
      <UserX className="h-3 w-3" />
      تسجيل بدون حساب
    </span>
  )
}

/* ─── CreateAccountButton ────────────────────────────────────────────────── */

function CreateAccountButton({
  row,
  onDone,
}: {
  row: AdminRegistrationListRow
  onDone: (updatedId: number) => void
}) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function handle() {
    if (busy || done) return
    setBusy(true)
    try {
      await createAccountFromRegistration(row.id)
      setDone(true)
      onDone(row.id)
    } catch {
      // silent — the parent reload will show any server message
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <span className="text-[10px] font-black text-emerald-600">✓ تم الربط</span>
    )
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-xl bg-deepBlue px-2.5 py-1 text-[10px] font-black text-white shadow-sm hover:bg-customBlue disabled:opacity-50"
    >
      <UserPlus className="h-3 w-3" />
      {busy ? '…' : 'إنشاء حساب'}
    </button>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function RegistrationsManagementPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AdminRegistrationListRow[]>([])
  const [error, setError] = useState<string | null>(null)

  /* filter state — draft vs applied */
  const [searchDraft, setSearchDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState('')
  const [courseIdDraft, setCourseIdDraft] = useState('')
  const [fromDraft, setFromDraft] = useState('')
  const [toDraft, setToDraft] = useState('')
  const [accountTab, setAccountTab] = useState<AccountFilter>('all')

  const [applied, setApplied] = useState<AdminRegistrationListFilters & { accountTab: AccountFilter }>({
    accountTab: 'all',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const course_id =
        applied.course_id != null && Number.isFinite(Number(applied.course_id))
          ? Number(applied.course_id)
          : undefined

      const has_account: AdminRegistrationListFilters['has_account'] =
        applied.accountTab === 'linked'
          ? 'linked'
          : applied.accountTab === 'guest'
            ? 'guest'
            : undefined

      const list = await fetchAdminRegistrations({
        search: applied.search || undefined,
        status: applied.status || undefined,
        course_id,
        date_from: applied.date_from || undefined,
        date_to: applied.date_to || undefined,
        has_account,
      })
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      setRows([])
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        setError('صلاحيات غير كافية لقراءة التسجيلات الإدارية.')
      } else {
        setError(getApiErrorMessage(e))
      }
    } finally {
      setLoading(false)
    }
  }, [applied])

  useEffect(() => {
    void load()
  }, [load])

  const kpis = useMemo(() => {
    const total = rows.length
    const withAccount = rows.filter((r) => r.has_account).length
    const guest = rows.filter((r) => !r.has_account).length
    const uniqCourses = new Set(rows.map((r) => r.course_id)).size
    return { total, withAccount, guest, uniqCourses }
  }, [rows])

  function applyFilters() {
    const cid = courseIdDraft.trim()
    setApplied({
      search: searchDraft.trim() || undefined,
      status: statusDraft.trim() || undefined,
      course_id:
        cid !== '' && Number.isFinite(Number(cid)) ? (Number(cid) as number) : undefined,
      date_from: fromDraft.trim() || undefined,
      date_to: toDraft.trim() || undefined,
      accountTab,
    })
  }

  function handleAccountCreated(updatedId: number) {
    setRows((prev) =>
      prev.map((r) => (r.id === updatedId ? { ...r, has_account: true } : r)),
    )
  }

  return (
    <SaPageRoot className="space-y-8 pb-16">
      <EnterpriseCrudHero
        eyebrow="Enrollment · GET /admin/registrations"
        title="التسجيلات الأكاديمية"
        subtitle="قائمة حقيقية من جدول registrations مع الدورة والمتعلم — تسجيلات الضيوف مميّزة بوضوح."
        variant="orange"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-[18px] border border-white/25 bg-white/95 px-4 py-2.5 text-[12px] font-black text-deepBlue shadow backdrop-blur-md"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            تحديث
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 lg:grid-cols-4">
        <EnterpriseMetricTile
          icon={ClipboardList}
          label="إجمالي السجلات"
          value={kpis.total}
          hint="في النطاق الحالي"
          accent="orange"
        />
        <EnterpriseMetricTile
          icon={UserCheck}
          label="بحساب مرتبط"
          value={kpis.withAccount}
          hint="user_id موجود"
          accent="mint"
        />
        <EnterpriseMetricTile
          icon={UserX}
          label="تسجيل ضيف"
          value={kpis.guest}
          hint="user_id = NULL"
          accent="navy"
        />
        <EnterpriseMetricTile
          icon={Layers}
          label="دورات مختلفة"
          value={kpis.uniqCourses}
          hint="حسب course_id"
          accent="blue"
        />
      </div>

      {/* Filters */}
      <SaGlassCard className="space-y-4 p-5">
        <h2 className="text-right text-lg font-black text-deepBlue">تصفية التسجيلات</h2>

        {/* Account type tabs */}
        <div className="flex items-center gap-2 rounded-2xl bg-slate-100/80 p-1.5" dir="rtl">
          {ACCOUNT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAccountTab(tab.id)}
              className={`flex-1 rounded-xl py-2 text-[12px] font-black transition-all ${
                accountTab === tab.id
                  ? 'bg-white text-deepBlue shadow-sm'
                  : 'text-muted-600 hover:text-deepBlue'
              }`}
            >
              {tab.label}
              {tab.id === 'guest' && kpis.guest > 0 && accountTab !== 'guest' && (
                <span className="mr-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                  {kpis.guest}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + filters row */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-right">
            <span className="text-[11px] font-black text-muted-700">بحث</span>
            <span className="relative">
              <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-400" />
              <input
                value={searchDraft}
                onChange={(ev) => setSearchDraft(ev.target.value)}
                onKeyDown={(ev) => ev.key === 'Enter' && applyFilters()}
                placeholder="اسم، بريد، هاتف، عنوان دورة…"
                className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 pe-10 ps-3 text-[12px] font-bold text-deepBlue shadow-sm"
              />
            </span>
          </label>

          <label className="flex min-w-[150px] flex-col gap-1 text-right">
            <span className="text-[11px] font-black text-muted-700">الحالة</span>
            <select
              value={statusDraft}
              onChange={(ev) => setStatusDraft(ev.target.value)}
              className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 px-3 text-[12px] font-bold text-deepBlue shadow-sm"
            >
              <option value="">جميع الحالات</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="registered">Registered</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label className="flex min-w-[120px] flex-col gap-1 text-right">
            <span className="text-[11px] font-black text-muted-700">معرّف دورة</span>
            <input
              inputMode="numeric"
              value={courseIdDraft}
              onChange={(ev) => setCourseIdDraft(ev.target.value.replace(/[^\d]/g, ''))}
              placeholder="course_id"
              className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 px-3 text-[12px] font-bold text-deepBlue shadow-sm"
            />
          </label>

          <label className="flex min-w-[140px] flex-col gap-1 text-right">
            <span className="text-[11px] font-black text-muted-700">من تاريخ</span>
            <input
              type="date"
              value={fromDraft}
              onChange={(ev) => setFromDraft(ev.target.value)}
              className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 px-3 text-[12px] font-bold text-deepBlue shadow-sm"
            />
          </label>

          <label className="flex min-w-[140px] flex-col gap-1 text-right">
            <span className="text-[11px] font-black text-muted-700">إلى تاريخ</span>
            <input
              type="date"
              value={toDraft}
              onChange={(ev) => setToDraft(ev.target.value)}
              className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 px-3 text-[12px] font-bold text-deepBlue shadow-sm"
            />
          </label>

          <button
            type="button"
            onClick={applyFilters}
            className="rounded-2xl bg-deepBlue px-6 py-2.5 text-[12px] font-black text-white shadow-md hover:bg-customBlue"
          >
            تطبيق
          </button>
        </div>
      </SaGlassCard>

      {/* Table */}
      {error ? (
        <ErrorPanel title="تعذّر تحميل التسجيلات" hint={error} />
      ) : loading ? (
        <LoadingPanel />
      ) : rows.length === 0 ? (
        <EmptyPanel
          title="لا توجد تسجيلات"
          subtitle="جرّب تغيير المرشّحات أو التحقّق من وجود بيانات."
        />
      ) : (
        <CrudCardTable>
          <CrudTable>
            <thead>
              <Tr>
                <Th>#</Th>
                <Th>الدورة</Th>
                <Th>المتعلّم</Th>
                <Th>البريد / الهاتف</Th>
                <Th>نوع التسجيل</Th>
                <Th>الحالة</Th>
                <Th>تاريخ التسجيل</Th>
                <Th>إجراء</Th>
              </Tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-mono text-[11px] font-black">{r.id}</Td>

                  <Td>
                    <div className="max-w-[220px]">
                      <p className="text-[12px] font-black leading-snug text-deepBlue">
                        {r.course_title}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold text-muted-400">#{r.course_id}</p>
                    </div>
                  </Td>

                  <Td>
                    <p className="text-[12px] font-bold text-deepBlue">{r.student_name ?? '—'}</p>
                    {r.has_account && r.user_id != null && (
                      <p className="mt-0.5 text-[10px] font-mono font-bold text-muted-400">
                        ID: {r.user_id}
                      </p>
                    )}
                  </Td>

                  <Td>
                    <p className="break-all text-[11px] font-bold text-muted-700">{r.email ?? '—'}</p>
                    {r.phone && (
                      <p className="mt-0.5 text-[10px] font-bold text-muted-400" dir="ltr">
                        {r.phone}
                      </p>
                    )}
                  </Td>

                  <Td>
                    <AccountBadge hasAccount={r.has_account} />
                  </Td>

                  <Td>
                    <CrudBadge variant={statusBadgeVariant(r.status)}>
                      {r.status ?? '—'}
                    </CrudBadge>
                  </Td>

                  <Td className="text-[11px] font-bold text-muted-700" dir="ltr">
                    {fmtDate(r.created_at)}
                  </Td>

                  <Td>
                    {!r.has_account && (
                      <CreateAccountButton row={r} onDone={handleAccountCreated} />
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </CrudTable>
        </CrudCardTable>
      )}
    </SaPageRoot>
  )
}
