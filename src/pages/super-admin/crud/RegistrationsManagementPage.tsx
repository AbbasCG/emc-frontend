import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { BookOpen, ClipboardList, Layers, RefreshCw, Search, UserX } from 'lucide-react'
import {
  fetchAdminRegistrations,
  type AdminRegistrationListRow,
} from '@/api/adminRegistrationsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { CrudCardTable, CrudTable, Td, Th, Tr } from '@/pages/super-admin/crud/shared/TableChrome'
import { EnterpriseCrudHero, EnterpriseMetricTile } from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'
import { SaGlassCard, SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

function fmtDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16)
  return d.toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })
}

function statusBadgeVariant(raw: string | null): 'success' | 'accent' | 'danger' | 'default' {
  const s = String(raw ?? '').toLowerCase()
  if (s.includes('confirm') || s.includes('approve') || s.includes('accept')) return 'success'
  if (s.includes('pending') || s.includes('wait')) return 'accent'
  if (s.includes('cancel') || s.includes('reject') || s.includes('fail')) return 'danger'
  return 'default'
}

export default function RegistrationsManagementPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AdminRegistrationListRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const [searchDraft, setSearchDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState('')
  const [courseIdDraft, setCourseIdDraft] = useState('')
  const [fromDraft, setFromDraft] = useState('')
  const [toDraft, setToDraft] = useState('')

  const [applied, setApplied] = useState({
    search: '',
    status: '',
    course_id: '' as '' | number,
    date_from: '',
    date_to: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const course_id =
        applied.course_id !== '' && Number.isFinite(Number(applied.course_id)) ?
          Number(applied.course_id)
        : undefined
      const list = await fetchAdminRegistrations({
        search: applied.search || undefined,
        status: applied.status || undefined,
        course_id,
        date_from: applied.date_from || undefined,
        date_to: applied.date_to || undefined,
      })
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      setRows([])
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        setError('صلاحيات غير كافية لقراءة التسجيلات الإدارية.')
      } else if (axios.isAxiosError(e) && (e.response?.status === 404 || e.response?.status === 405)) {
        setError('مسار GET /admin/registrations غير متاح على الخادم — راجع نقطة Laravel الموافقة.')
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
    const pending = rows.filter((r) => String(r.status ?? '').toLowerCase().includes('pending')).length
    const uniqCourses = new Set(rows.map((r) => r.course_id)).size
    const guest = rows.filter((r) => r.user_id == null).length
    return { total, pending, uniqCourses, guest }
  }, [rows])

  function applyFilters() {
    const cid = courseIdDraft.trim()
    setApplied({
      search: searchDraft.trim(),
      status: statusDraft.trim(),
      course_id: cid !== '' && Number.isFinite(Number(cid)) ? Number(cid) : '',
      date_from: fromDraft.trim(),
      date_to: toDraft.trim(),
    })
  }

  return (
    <SaPageRoot className="space-y-8 pb-16">
      <EnterpriseCrudHero
        eyebrow="Enrollment · GET /admin/registrations"
        title="التسجيلات الأكاديمية"
        subtitle="قائمة حقيقية من جدول registrations مع الدورة والمتعلّم؛ لا استبدال بدفعات مالية."
        variant="orange"
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-[18px] border border-white/25 bg-white/95 px-4 py-2.5 text-[12px] font-black text-deepBlue shadow backdrop-blur-md"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <EnterpriseMetricTile
          icon={ClipboardList}
          label="إجمالي السجلات"
          value={kpis.total}
          hint="في النطاق الحالي للاستعلام"
          accent="orange"
        />
        <EnterpriseMetricTile
          icon={Layers}
          label="دورات مختلفة"
          value={kpis.uniqCourses}
          hint="حسب course_id"
          accent="blue"
        />
        <EnterpriseMetricTile
          icon={BookOpen}
          label="قيد المعالجة (تقريبي)"
          value={kpis.pending}
          hint="حقل الحالة يحتوي pending"
          accent="mint"
        />
        <EnterpriseMetricTile
          icon={UserX}
          label="بدون user_id"
          value={kpis.guest}
          hint="تسجيلات ضيف أو ترحيل قديم"
          accent="navy"
        />
      </div>

      <SaGlassCard className="space-y-4 p-5">
        <div className="text-right">
          <h2 className="text-lg font-black text-deepBlue">تصفية التسجيلات</h2>
          <p className="mt-1 text-[12px] font-semibold text-muted-600">
            تُرسل إلى الخادم كمعاملات استعلام (search، status، course_id، date_from، date_to).
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-right">
            <span className="text-[11px] font-black text-muted-700">بحث</span>
            <span className="relative">
              <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-400" />
              <input
                value={searchDraft}
                onChange={(ev) => setSearchDraft(ev.target.value)}
                placeholder="اسم، بريد، عنوان دورة…"
                className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 pe-10 ps-3 text-[12px] font-bold text-deepBlue shadow-sm"
              />
            </span>
          </label>

          <label className="flex min-w-[140px] flex-col gap-1 text-right">
            <span className="text-[11px] font-black text-muted-700">الحالة</span>
            <input
              value={statusDraft}
              onChange={(ev) => setStatusDraft(ev.target.value)}
              placeholder="pending، confirmed…"
              className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 px-3 text-[12px] font-bold text-deepBlue shadow-sm"
            />
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

          <label className="flex min-w-[150px] flex-col gap-1 text-right">
            <span className="text-[11px] font-black text-muted-700">من تاريخ</span>
            <input
              type="date"
              value={fromDraft}
              onChange={(ev) => setFromDraft(ev.target.value)}
              className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 px-3 text-[12px] font-bold text-deepBlue shadow-sm"
            />
          </label>

          <label className="flex min-w-[150px] flex-col gap-1 text-right">
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
            className="rounded-2xl bg-deepBlue px-5 py-2.5 text-[12px] font-black text-white shadow-md hover:bg-customBlue"
          >
            تطبيق
          </button>
        </div>

        <p className="border-t border-white/40 pt-4 text-[11px] font-bold text-muted-600">
          الترتيب الافتراضي من الخادم (latest). تُعرض جميع الصفوف بما فيها user_id فارغ إذا أعادها الـ API.
        </p>
      </SaGlassCard>

      {error ?
        <ErrorPanel title="تعذّر تحميل التسجيلات" hint={error} />
      : loading ?
        <LoadingPanel />
      : rows.length === 0 ?
        <EmptyPanel
          title="لا توجد صفوف"
          subtitle="تحقّق من وجود GET /admin/registrations وتطابق مرشّحات التاريخ مع جدولك."
        />
      : (
        <CrudCardTable>
          <CrudTable>
            <thead>
              <Tr>
                <Th>#</Th>
                <Th>الدورة</Th>
                <Th>المتعلّم</Th>
                <Th>البريد</Th>
                <Th>الحالة</Th>
                <Th>تاريخ الإنشاء</Th>
              </Tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-mono text-[11px] font-black">{r.id}</Td>
                  <Td>
                    <div className="max-w-[260px]">
                      <p className="text-[12px] font-black leading-snug text-deepBlue">{r.course_title}</p>
                      <p className="mt-0.5 text-[10px] font-bold text-muted-500">course_id: {r.course_id}</p>
                    </div>
                  </Td>
                  <Td>
                    <p className="text-[12px] font-bold text-deepBlue">{r.student_name ?? '—'}</p>
                    <p className="text-[10px] font-bold text-muted-500">
                      user_id: {r.user_id != null ? r.user_id : 'NULL'}
                    </p>
                  </Td>
                  <Td className="break-all text-[11px] font-bold text-muted-700">{r.email ?? '—'}</Td>
                  <Td>
                    <CrudBadge variant={statusBadgeVariant(r.status)}>{r.status ?? '—'}</CrudBadge>
                  </Td>
                  <Td className="text-[11px] font-bold text-muted-700" dir="ltr">
                    {fmtDate(r.created_at)}
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
