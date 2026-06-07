import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import axios from 'axios'
import {
  BadgeCheck,
  BookMarked,
  ChevronDown,
  ClipboardCheck,
  Flame,
  GraduationCap,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react'
import toast from '@/lib/toast'
import { ADMIN_USER_FORBIDDEN_AR, fetchAdminUsers, type AdminManagedUser } from '@/api/adminUsersApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { normalizeRole } from '@/utils/dashboardAccess'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { CrudCardTable, CrudTable, Th, Tr, Td } from '@/pages/super-admin/crud/shared/TableChrome'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import {
  EntityDetailDrawer,
  EntityDetailField,
  EntityDetailSection,
} from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { EntityActionMenu } from '@/pages/super-admin/crud/shared/EntityActionMenu'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'
import { Link, useNavigate } from 'react-router-dom'
import { SaGlassCard, SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import {
  EnterpriseColumnChart,
  EMC_CHART_PALETTE,
  EnterprisePieRadial,
} from '@/pages/super-admin/crud/shared/enterprise/charts'
import {
  AnimatedTabular,
  EnterpriseCrudHero,
  EnterpriseMetricTile,
} from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'

function deptLabel(raw: AdminManagedUser) {
  const d = raw.department?.trim()
  return d && d.length > 0 ? d : 'جهة بدون عنوان في دليل المستخدمين'
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
  const [expandedId, setExpandedId] = useState<number | null>(null)

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
      if (!t) return true
      const hay = `${u.name} ${u.email} ${u.phone ?? ''} ${u.id} ${u.department ?? ''}`.toLowerCase()
      return hay.includes(t)
    })
  }, [users, q, campus])

  const total = users.length

  const deptBuckets = useMemo(() => {
    const map = new Map<string, number>()
    for (const u of filtered) {
      const k = deptLabel(u)
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [filtered])

  const heatMax = deptBuckets.reduce((m, [, c]) => Math.max(m, c), 0)

  const statusPie =
    filtered.length ?
      [
        { name: 'نشط وفق نقطة المرجع', value: filtered.filter((u) => u.is_active !== false).length, fill: EMC_CHART_PALETTE[0] },
        { name: 'موقوف وفق نقطة المرجع', value: filtered.filter((u) => u.is_active === false).length, fill: EMC_CHART_PALETTE[4] },
      ].filter((s) => s.value > 0)
    : []

  const deptBarSlice = deptBuckets.slice(0, 8).map(([name, cnt]) => ({ nameAr: name.length > 22 ? `${name.slice(0, 20)}…` : name, طلاب: cnt }))

  return (
    <SaPageRoot className="space-y-8 pb-14">
      <EnterpriseCrudHero
        eyebrow="Enrollment directory · Operational signals only"
        title="الطلاب — مركز أداء تعلّم تجاري"
        subtitle="الأعداد والطبقات مأخوذة حصريًا من GET /admin/users للحسابات ذات دور «طالب»؛ الرسوم تُنشأ من مجموعة المرشَّح وليست نقطة LMS خارجية أو حضور حقيقي."
        variant="blue"
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
            <Link
              to="/dashboard/student"
              className="inline-flex items-center gap-2 rounded-[18px] bg-[#EC943C] px-5 py-2.5 text-[12px] font-black text-white shadow-lg"
            >
              <GraduationCap className="h-4 w-4" aria-hidden />
              لوحة الطالب
            </Link>
          </>
        }
      />

      {!forbidden && !error && !loading ?
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <motion.div layout className="grid gap-4 sm:grid-cols-2">
              <EnterpriseMetricTile
                accent="blue"
                icon={GraduationCap}
                label="طلاب ضمن المرجع المرشَّح الآن"
                value={<AnimatedTabular value={filtered.length} />}
                hint={`مجموعة الجذر كاملة: ${total}`}
              />
              <EnterpriseMetricTile
                accent="mint"
                icon={BadgeCheck}
                label="نشط وفق نقطة المرجع (المرشّح)"
                value={<AnimatedTabular value={filtered.filter((u) => u.is_active !== false).length} />}
                deltaLabel={`موقوف في هذه القطعة: ${filtered.filter((u) => u.is_active === false).length}`}
              />
              <EnterpriseMetricTile
                accent="navy"
                icon={BookMarked}
                label="حقول جهة معلنة"
                value={
                  filtered.length === 0 ? '—'
                  : `${Math.round((filtered.filter((u) => Boolean(u.department?.trim())).length / filtered.length) * 100)}٪`
                }
                hint={`يشير إلى حقل department في نقطة دليل الإداريين فقط`}
              />
              <EnterpriseMetricTile
                accent="orange"
                icon={ClipboardCheck}
                label="مزامنة LMS"
                value={filtered.length === 0 ? '—' : 'غير مستوردة'}
                hint="لا نقطة LMS ناشطة في هذا المركز؛ استخدم عمود LMS أدناه كتذكير تشغيلي وليس وقتًا فعلياً أو شهادة."
              />
            </motion.div>

            <SaGlassCard className="relative flex flex-col gap-4 overflow-hidden border border-accent-400/35 p-6" glow="orange">
              <div className="absolute -start-10 top-0 h-36 w-36 rounded-full bg-[#2691C2]/10 blur-[60px]" aria-hidden />
              <div className="relative flex flex-wrap items-start justify-between gap-2 rtl:flex-row-reverse">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-950">مرآة حالة المرشَّح الحالي</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-700">
                    نسب قطاع بدون أن تفترض اكتمال اشتراك في برامج.
                  </p>
                </div>
                <LayoutGrid className="h-7 w-7 text-accent-600/85" aria-hidden />
              </div>
              <div className="relative min-h-[10rem] rounded-[22px] border border-white/70 bg-white/75 px-1 py-1 shadow-inner backdrop-blur">
                {statusPie.length ? <EnterprisePieRadial data={statusPie} height={150} /> : null}
              </div>
              {deptBarSlice.length ?
                <EnterpriseColumnChart data={deptBarSlice} bars={[{ key: 'طلاب', color: EMC_CHART_PALETTE[2], label: 'عدد ظاهري' }]} height={146} />
              :
                <p className="py-10 text-center text-[12px] font-bold text-muted-600">لم تُطبع أسماء جهات كافية لرسم أعمدة.</p>
              }
            </SaGlassCard>
          </div>

          <CrudToolbar sticky searchValue={q} onSearchChange={setQ} searchPlaceholder="بحث بالاسم، البريد، الجوال، المعرّف، الجهة…">
            <MiniSelect
              label="حالة المرجع"
              value={campus}
              onChange={(v) => setCampus(v as 'all' | 'active' | 'inactive')}
              options={[
                { value: 'all', labelAr: 'الكل ضمن مجموعة المرشَّح الآن' },
                { value: 'active', labelAr: 'نشط' },
                { value: 'inactive', labelAr: 'موقوف' },
              ]}
            />
          </CrudToolbar>

          <SaGlassCard className="relative overflow-hidden p-7" glow="blue">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-right rtl:text-right">
              <div>
                <p className="text-[11px] font-black text-deepBlue rtl:text-right">
                  شبكة ظرف جهات مذكورة في نقطة المرجع
                </p>
                <p className="mt-2 max-w-3xl text-[12px] font-semibold text-muted-700">
                  كل مربّع له شدة لون وفق عدد ظاهري في مجموعة المرشّح الآن؛ «بدون عنوان» لا يفترض فقدان قسم فعلياً خارج النظام.
                </p>
              </div>
              <Flame className="h-8 w-8 text-customBlue/65" aria-hidden />
            </div>
            {!deptBuckets.length || loading ?
              <EmptyPanel title="لا عيّنة للطباعة الدافئة الآن." />
            :
              <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(9.75rem,1fr))]" dir="rtl">
                {deptBuckets.slice(0, 24).map(([label, cnt], idx) => {
                  const tier = heatMax === 0 ? 0 : cnt / heatMax
                  const bgMix = tier > 0.66 ? 'from-customBlue/92 to-deepBlue shadow-lg' : tier > 0.33 ? 'from-customBlue/55 to-deepBlue/[0.45]' : 'from-customBlue/25 to-transparent'
                  return (
                    <motion.div
                      key={`${String(idx)}-${String(cnt)}-${label.slice(0, 48)}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.35) }}
                      className={`rounded-[22px] border border-white/65 bg-gradient-to-bl ${bgMix} px-4 py-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] ring-2 ring-white/45 backdrop-blur-sm`}
                      title={`${cnt} حساب`}
                    >
                      <p className="line-clamp-3 text-[12px] font-black leading-snug text-white drop-shadow">{label}</p>
                      <p className="mt-3 text-[20px] font-black tabular-nums text-white/95">{cnt}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/72">نشط وفق المرشّح الآن فقط</p>
                    </motion.div>
                  )
                })}
              </div>
            }
          </SaGlassCard>
        </>
      : null}

      <SaGlassCard glow="orange" className="flex flex-wrap items-center justify-between gap-4 border border-white/65 p-5 text-right shadow-md rtl:text-right">
        <div>
          <p className="text-[11px] font-black text-accent-800">مزامنة مع عمليات قبول ومخرجات</p>
          <p className="mt-2 max-w-xl text-[13px] font-semibold text-muted-700">
            عند المراجعة المالية أو الشهادات استعمل مسارات EMC الرسمية — لا تشغّل موافقة من هذه الشاشة.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard/admin/finance/payments"
            className="rounded-2xl bg-deepBlue px-4 py-2.5 text-center text-[11px] font-black text-white"
          >
            المدفوعات
          </Link>
          <Link to="/dashboard/admin/certificates" className="rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-center text-[11px] font-black text-deepBlue">
            الشهادات
          </Link>
        </div>
      </SaGlassCard>
      {hint && !loading && !error && !forbidden ?
        <div className="rounded-[22px] border border-accent-400/35 bg-accent-400/10 px-4 py-3 text-right text-[12px] font-bold text-accent-950">
          {hint}
        </div>
      : null}

      <div className="space-y-4">
        {forbidden ?
          <ErrorPanel title={ADMIN_USER_FORBIDDEN_AR} />
        : error ?
          <ErrorPanel title="تنبيه البيانات" hint={error} />
        : loading ?
          <LoadingPanel />
        : !filtered.length ?
          <EmptyPanel title="لا طلاب مطابقون" subtitle="جرّب فلتر الحالة أو تحقق من أن المستخدمين أُسند لهم دور طالب." />
        :
          <SaGlassCard className="overflow-hidden p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.42)] ring-2 ring-brand-400/15">
            <CrudCardTable>
              <CrudTable>
                <thead>
                  <tr>
                    <Th>الطالب</Th>
                    <Th>البريد</Th>
                    <Th>الحالة</Th>
                    <Th>طبقة تشغيلية LMS</Th>
                    <Th>جهة وفق نقطة المرجع</Th>
                    <Th>آخر تحديث مسجَّل</Th>
                    <Th className="text-end whitespace-nowrap">إجراءات</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const expanded = expandedId === u.id
                    return (
                      <Fragment key={u.id}>
                        <Tr muted={false}>
                          <Td className="min-w-[12rem]">
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 text-right rtl:flex-row-reverse"
                              onClick={() => setExpandedId((prev) => (prev === u.id ? null : u.id))}
                            >
                              <ChevronDown className={`h-5 w-5 shrink-0 text-muted-500 transition-transform ${expanded ? '-rotate-180' : ''}`} aria-hidden />
                              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-white text-[11px] font-black text-brand-900 ring-1 ring-brand-200/70">
                                {initialsFromName(u.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-black text-deepBlue">{u.name}</p>
                                <p className="text-[11px] font-bold text-muted-500">#{u.id}</p>
                              </div>
                            </button>
                          </Td>
                          <Td className="max-w-[14rem] break-all text-right text-[12px] font-semibold text-muted-700 rtl:text-right">{u.email}</Td>
                          <Td>
                            {u.is_active === false ?
                              <CrudBadge variant="danger">موقوف</CrudBadge>
                            : <CrudBadge variant="success">نشط</CrudBadge>}
                          </Td>
                          <Td className="max-w-[12rem] text-[11px] font-semibold leading-relaxed text-muted-700 rtl:text-right">
                            لا نقطة LMS تقتطع هذا العرض الآن؛ ننتظر واجهة ربط تربط المتعلّم بالمسار دون تهيئة اصطناعية.
                          </Td>
                          <Td className="text-[11px] font-bold text-muted-700 rtl:text-right">{deptLabel(u)}</Td>
                          <Td className="text-[12px] font-bold text-muted-600">
                            {(u.updated_at ?? u.created_at ?? '—').toString().slice(0, 10)}
                          </Td>
                          <Td className="text-end">
                            <RowActionsMenu
                              ariaLabel={u.name}
                              actions={[
                                { key: 'v', label: 'عرض بطاقة', onClick: () => setView(u) },
                                { key: 'u', label: 'إدارة المستخدم الكاملة', onClick: () => navigate('/dashboard/super-admin/crud/users') },
                              ]}
                            />
                          </Td>
                        </Tr>
                        <AnimatePresence initial={false}>
                          {expanded ?
                            <motion.tr
                              layout
                              key={`ex-${String(u.id)}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="bg-accent-400/[0.04]"
                            >
                              <Td colSpan={7} className="!border-t-0">
                                <div className="px-14 py-8 text-[13px] font-semibold text-muted-800 rtl:text-right">
                                  <p>
                                    جهة وفق نقطة المرجع:{' '}
                                    <span className="font-black text-deepBlue">{u.department ?? 'لا حقل ظاهر'}</span>
                                  </p>
                                  <p className="mt-3">
                                    هاتف: <span className="font-black text-muted-700">{u.phone ?? 'لم يصدّره الحقل المرجعي'}</span>
                                  </p>
                                  <p className="mt-3 flex flex-wrap gap-3 rtl:flex-row-reverse">
                                    <CrudBadge variant={u.is_active === false ? 'danger' : 'success'}>{u.is_active === false ? 'موقوف' : 'نشط'}</CrudBadge>
                                    <CrudBadge variant="brand">{deptLabel(u)}</CrudBadge>
                                  </p>
                                  <Link
                                    to="/dashboard/super-admin/crud/users"
                                    className="mt-6 inline-flex rounded-2xl border border-deepBlue/15 bg-white px-5 py-2 text-[11px] font-black text-deepBlue shadow-sm hover:bg-deepBlue/[0.02]"
                                  >
                                    فتح سجل مستخدم واحد شامل
                                  </Link>
                                </div>
                              </Td>
                            </motion.tr>
                          : null}
                        </AnimatePresence>
                      </Fragment>
                    )
                  })}
                </tbody>
              </CrudTable>
            </CrudCardTable>
          </SaGlassCard>
        }
      </div>

      <EntityDetailDrawer
        open={view !== null}
        onClose={() => setView(null)}
        title={view?.name ?? ''}
        subtitle={`طالب · EMC-ID #${view?.id ?? ''}`}
        avatar={
          view ?
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-white text-sm font-black text-deepBlue ring-2 ring-white shadow-md">
              {initialsFromName(view.name)}
            </span>
          : null
        }
        badges={
          view ?
            <>
              <CrudBadge variant="brand">طالب</CrudBadge>
              {view.is_active === false ?
                <CrudBadge variant="danger">موقوف</CrudBadge>
              : <CrudBadge variant="success">نشط</CrudBadge>}
            </>
          : null
        }
        footerSlot={
          <EntityActionMenu
            onClose={() => setView(null)}
            onEdit={() => navigate('/dashboard/super-admin/crud/users')}
            editLabel="إدارة المستخدمين"
          />
        }
        tabs={
          view ?
            [
              {
                id: 'overview',
                labelAr: 'نظرة عامة',
                content: (
                  <div className="space-y-4">
                    <EntityDetailSection title="اتصال وتعريف" icon={<GraduationCap className="h-4 w-4" aria-hidden />}>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <EntityDetailField label="البريد" value={view.email} />
                        <EntityDetailField label="الجوال" value={view.phone ?? '—'} />
                        <EntityDetailField label="جهة المرجع" value={deptLabel(view)} />
                        <EntityDetailField
                          label="آخر تحديث"
                          value={(view.updated_at ?? view.created_at ?? '—').toString().slice(0, 16)}
                        />
                      </dl>
                    </EntityDetailSection>
                  </div>
                ),
              },
              {
                id: 'progress',
                labelAr: 'التفاصيل',
                content: (
                  <EntityDetailSection title="مسار تعلّم" icon={<BookMarked className="h-4 w-4" aria-hidden />}>
                    <p className="text-[13px] font-semibold text-muted-700">
                      لا تكامل LMS مباشر في هذه الشاشة؛ عند الربط يمكن عرض تقدّم برامج وشهادات من دون قيم وهمية.
                    </p>
                  </EntityDetailSection>
                ),
              },
              {
                id: 'activity',
                labelAr: 'النشاط',
                content: (
                  <EntityDetailSection title="زمن السجل" icon={<ClipboardCheck className="h-4 w-4" aria-hidden />}>
                    <EntityDetailField label="أُنشئ" value={(view.created_at ?? '—').toString().slice(0, 19)} />
                    <EntityDetailField label="عُدِّل" value={(view.updated_at ?? '—').toString().slice(0, 19)} />
                  </EntityDetailSection>
                ),
              },
            ]
          : undefined
        }
      />
    </SaPageRoot>
  )
}
