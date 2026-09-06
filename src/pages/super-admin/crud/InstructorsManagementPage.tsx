import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Bell,
  BookOpen,
  CalendarClock,
  CameraOff,
  GraduationCap,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
  Tag,
  Users,
  Zap,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  fetchAdminInstructorsDirectory,
  type AdminInstructorDirectoryRow,
} from '@/api/adminInstructorsApi'
import { updateAdminUser } from '@/api/adminUsersApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import { resolvePublicAssetUrl } from '@/utils/mediaUrl'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel } from '@/pages/super-admin/crud/shared/States'
import {
  EntityDetailDrawer,
  EntityDetailField,
  EntityDetailSection,
} from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'
import { SaGlassCard, SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

function displayLastActivity(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

function hasPhoto(r: AdminInstructorDirectoryRow): boolean {
  return Boolean(resolvePublicAssetUrl(r.avatar_url ?? r.instructor_image_url))
}

function InstructorAvatar({ row, className }: { row: AdminInstructorDirectoryRow; className?: string }) {
  const url = resolvePublicAssetUrl(row.avatar_url ?? row.instructor_image_url)
  if (url) {
    return (
      <div className={`relative overflow-hidden rounded-2xl ring-2 ring-white shadow-lg ${className ?? ''}`}>
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    )
  }
  const ini = initialsFromName(row.name)
  return (
    <div
      className={`grid place-items-center rounded-2xl bg-gradient-to-br from-[#0077B6] via-[#1e6f96] to-[#0C2A4B] text-lg font-black text-white shadow-inner ring-2 ring-white/30 ${className ?? ''}`}
    >
      {ini.slice(0, 2)}
    </div>
  )
}

const STATUS_FILTER = [
  { value: 'all', labelAr: 'كل الحالات' },
  { value: 'active', labelAr: 'نشط' },
  { value: 'inactive', labelAr: 'موقوف' },
]

const PHOTO_FILTER = [
  { value: 'all', labelAr: 'كل الصور' },
  { value: 'has', labelAr: 'مع صورة' },
  { value: 'none', labelAr: 'بدون صورة' },
]

const ASSIGN_FILTER = [
  { value: 'all', labelAr: 'الكل' },
  { value: 'assigned', labelAr: 'له دورات' },
  { value: 'unassigned', labelAr: 'بدون دورات' },
]

export default function InstructorsManagementPage({ isHrPage = false }: { isHrPage?: boolean } = {}) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AdminInstructorDirectoryRow[]>([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [photoFilter, setPhotoFilter] = useState<string>('all')
  const [assignFilter, setAssignFilter] = useState<string>('all')
  const [expertiseQ, setExpertiseQ] = useState('')
  const [view, setView] = useState<AdminInstructorDirectoryRow | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  /** Manual refresh / post-mutation reload from a handler — outside any effect, so
   *  flipping to the loading state synchronously is both allowed and required here. */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { rows: list } = await fetchAdminInstructorsDirectory()
      setRows(Array.isArray(list) ? list : [])
    } catch {
      toast.error('تعذّر تحميل المدربين من /api/admin/instructors')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load — inlined so no state is set on the effect's synchronous path
  // (`loading` already starts as `true`).
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { rows: list } = await fetchAdminInstructorsDirectory()
        if (alive) setRows(Array.isArray(list) ? list : [])
      } catch {
        if (!alive) return
        toast.error('تعذّر تحميل المدربين من /api/admin/instructors')
        setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const expertiseTags = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) {
      for (const t of r.expertise ?? []) {
        if (t.trim()) s.add(t.trim())
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'ar'))
  }, [rows])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    const ex = expertiseQ.trim().toLowerCase()
    return rows.filter((r) => {
      if (t) {
        const blob = `${r.name} ${r.email} ${r.phone ?? ''} ${r.title ?? ''}`.toLowerCase()
        if (!blob.includes(t)) return false
      }
      if (ex) {
        const hasTag = (r.expertise ?? []).some((x) => x.toLowerCase().includes(ex))
        if (!hasTag && !(r.title ?? '').toLowerCase().includes(ex)) return false
      }
      if (statusFilter === 'active' && !r.is_active) return false
      if (statusFilter === 'inactive' && r.is_active) return false
      if (photoFilter === 'has' && !hasPhoto(r)) return false
      if (photoFilter === 'none' && hasPhoto(r)) return false
      if (assignFilter === 'assigned' && (r.assigned_courses_count ?? 0) <= 0) return false
      if (assignFilter === 'unassigned' && (r.assigned_courses_count ?? 0) > 0) return false
      return true
    })
  }, [rows, q, expertiseQ, statusFilter, photoFilter, assignFilter])

  const kpis = useMemo(() => {
    const total = rows.length
    const active = rows.filter((r) => r.is_active).length
    const courses = rows.reduce((a, r) => a + (r.assigned_courses_count ?? 0), 0)
    const upcoming = rows.reduce((a, r) => a + (r.upcoming_workshops_count ?? 0), 0)
    const noPhoto = rows.filter((r) => !hasPhoto(r)).length
    const noExpertise = rows.filter((r) => (r.expertise?.length ?? 0) === 0).length
    return { total, active, courses, upcoming, noPhoto, noExpertise }
  }, [rows])

  async function toggleActive(row: AdminInstructorDirectoryRow) {
    if (!row.user_id) {
      toast.error('لا يوجد مستخدم مرتبط بهذا السجل لا يمكن تغيير حالة التفعيل من هنا.')
      return
    }
    if (!row.email?.trim()) {
      toast.error('لا يمكن تحديث الحساب بدون بريد إلكتروني.')
      return
    }
    setTogglingId(row.user_id)
    try {
      await updateAdminUser(row.user_id, {
        name: row.name,
        email: row.email.trim(),
        role: row.role,
        is_active: !row.is_active,
      })
      toast.success(!row.is_active ? 'تم التفعيل' : 'تم التعطيل')
      await load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <SaPageRoot className="space-y-8 pb-16">
      <section className="relative overflow-hidden rounded-[28px] border border-white/30 bg-gradient-to-bl from-[#0b1f33] via-[#132b45] to-[#0e3a52] px-6 py-8 text-white shadow-[0_32px_80px_-32px_rgba(15,23,42,0.55)] md:px-10">
        <div className="pointer-events-none absolute -start-24 top-0 h-72 w-72 rounded-full bg-[#0077B6]/25 blur-[100px]" />
        <div className="pointer-events-none absolute -end-16 bottom-0 h-56 w-56 rounded-full bg-[#F28C00]/20 blur-[90px]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3 text-right">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/55">Faculty · EMC</p>
            <h1 className="text-3xl font-black leading-tight md:text-4xl">دليل المدربين</h1>
            <p className="text-[14px] font-semibold leading-relaxed text-white/75">
              مستند إلى <code className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[12px]">GET /api/admin/instructors</code>
 كل سجل في جدول المدربين يُعرَض مع التطبيع المناسب (حتى بدون صورة أو بريد أو ربط مستخدم بعد).
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-[12px] font-black text-white backdrop-blur-md transition hover:bg-white/15"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            {!isHrPage && (
              <Link
                to="/dashboard/super-admin/crud/programs"
                className="rounded-2xl bg-[#F28C00] px-5 py-2.5 text-[12px] font-black text-[#0f172a] shadow-lg transition hover:brightness-105"
              >
                إسناد دورات
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Users} label="إجمالي المدربين" value={kpis.total} tone="sky" />
        <Kpi icon={Zap} label="المدربون النشطون" value={kpis.active} tone="emerald" />
        <Kpi icon={BookOpen} label="الدورات المسندة" value={kpis.courses} tone="blue" />
        <Kpi icon={CalendarClock} label="الورش القادمة" value={kpis.upcoming} tone="amber" />
        <Kpi icon={CameraOff} label="بدون صورة" value={kpis.noPhoto} tone="rose" />
        <Kpi icon={Tag} label="بدون تخصص" value={kpis.noExpertise} tone="violet" />
      </div>

      <CrudToolbar
        sticky
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="بحث بالاسم أو البريد أو الهاتف…"
      >
        <MiniSelect label="الحالة" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER} />
        <MiniSelect label="الصورة" value={photoFilter} onChange={setPhotoFilter} options={PHOTO_FILTER} />
        <MiniSelect label="الإسناد" value={assignFilter} onChange={setAssignFilter} options={ASSIGN_FILTER} />
        <label className="flex min-w-[160px] flex-col gap-1.5 text-right text-[11px] font-black text-deepBlue">
          تخصص
          <select
            value={expertiseQ}
            onChange={(e) => setExpertiseQ(e.target.value)}
            className="rounded-xl border border-deepBlue/[0.12] bg-white px-3 py-2 text-[12px] font-bold text-deepBlue shadow-inner"
          >
            <option value="">الكل</option>
            {expertiseTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </CrudToolbar>

      {loading ?
        <LoadingPanel />
      : rows.length === 0 ?
        <SaGlassCard className="p-12 text-center" glow="blue">
          <div className="mx-auto flex max-w-md flex-col items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
              <AlertCircle className="h-8 w-8" aria-hidden />
            </div>
            <p className="text-lg font-black text-deepBlue">لا يوجد مدربون حاليًا</p>
            <p className="text-[13px] font-semibold leading-relaxed text-muted-700">
              لم تُحمَّل أي صفوف من الخادم بعد التطبيع؛ تحقق من استجابة <code className="font-mono text-[11px]">GET /api/admin/instructors</code> في تبويب الشبكة
              وسجلات الـ console.
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-2xl bg-[#0077B6] px-6 py-2.5 text-[12px] font-black text-white shadow-md"
            >
              إعادة المحاولة
            </button>
          </div>
        </SaGlassCard>
      : filtered.length === 0 ?
        <EmptyPanel title="لا نتائج ضمن المرشحات" subtitle="جرّب توسيع البحث أو إعادة ضبط الفلاتر." />
      :
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {filtered.map((row, i) => (
              <motion.article
                key={row.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                className="group relative flex flex-col overflow-hidden rounded-[26px] border border-white/80 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/70"
              >
                <div className="relative flex flex-col items-center px-5 pb-4 pt-8 text-center">
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0077B6]/12 via-[#0077B6]/5 to-transparent"
                    aria-hidden
                  />
                  <div className="relative mb-4 h-28 w-28 shrink-0 sm:h-32 sm:w-32">
                    <InstructorAvatar row={row} className="h-full w-full" />
                    <span
                      className={`absolute -bottom-1 end-1 rounded-full px-2 py-0.5 text-[9px] font-black ring-2 ring-white ${
                        row.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                      }`}
                    >
                      {row.is_active ? 'نشط' : 'موقوف'}
                    </span>
                  </div>
                  <h2 className="line-clamp-2 min-h-[3rem] text-lg font-black leading-snug text-deepBlue">{row.name}</h2>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 dir-ltr">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-[#0077B6]" aria-hidden />
                    <span className="truncate">{row.email || '—'}</span>
                  </p>
                  {row.phone ?
                    <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-600 dir-ltr">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                      {row.phone}
                    </p>
                  : null}
                  <div className="mt-3 flex min-h-[2.25rem] flex-wrap justify-center gap-1.5">
                    {(row.expertise?.length ?? 0) > 0 ?
                      row.expertise!.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[#0077B6]/25 bg-[#0077B6]/[0.07] px-2.5 py-0.5 text-[10px] font-black text-[#0f3a52]"
                        >
                          {tag}
                        </span>
                      ))
                    : <span className="text-[11px] font-bold text-slate-400">غير محدد</span>}
                    {(row.expertise?.length ?? 0) > 3 ?
                      <span className="text-[10px] font-black text-slate-400">+{row.expertise!.length - 3}</span>
                    : null}
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100/90 bg-slate-50/80 px-2 py-3 [&>div]:px-1 [&>div]:text-center">
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-500">دورات</p>
                    <p className="text-lg font-black tabular-nums text-deepBlue">{row.assigned_courses_count ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-500">ورش</p>
                    <p className="text-lg font-black tabular-nums text-deepBlue">{row.workshops_count ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-500">قادمة</p>
                    <p className="text-lg font-black tabular-nums text-[#F28C00]">{row.upcoming_workshops_count ?? 0}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100/90 px-4 py-2 text-center">
                  <p className="text-[10px] font-bold text-slate-500">آخر نشاط</p>
                  <p className="text-[11px] font-black text-slate-700">{displayLastActivity(row.last_activity_at)}</p>
                </div>

                <div className="flex flex-wrap justify-center gap-1.5 border-t border-slate-100 bg-white/90 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setView(row)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-deepBlue shadow-sm transition hover:border-[#0077B6]/40"
                  >
                    عرض الملف
                  </button>
                  {!isHrPage && row.user_id ?
                    <Link
                      to={`/dashboard/super-admin/crud/users/${row.user_id}/edit`}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-deepBlue shadow-sm transition hover:border-[#0077B6]/40"
                    >
                      تعديل
                    </Link>
                  : null}
                  {!isHrPage && (
                    <Link
                      to="/dashboard/super-admin/crud/programs"
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-900 shadow-sm transition hover:bg-emerald-100"
                    >
                      إسناد دورة
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => toast.message('سيتم ربط إرسال الإشعارات عبر مركز الإشعارات قريبًا')}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-deepBlue shadow-sm"
                  >
                    إشعار
                  </button>
                  {!isHrPage && (
                    <button
                      type="button"
                      disabled={!row.user_id || togglingId === row.user_id}
 title={row.user_id ? undefined: 'لا يوجد مستخدم للحساب أضِف أو اربِط user_id في الخلفية'}
                      onClick={() => void toggleActive(row)}
                      className="rounded-xl border border-slate-800/10 bg-slate-900 px-2.5 py-1.5 text-[10px] font-black text-white shadow-sm disabled:opacity-50"
                    >
                      {row.user_id && togglingId === row.user_id ? '…' : row.is_active ? 'تعطيل' : 'تفعيل'}
                    </button>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      }

      {!loading && rows.length > 0 ?
        <p className="text-center text-[11px] font-bold text-slate-500">
          عرض {filtered.length} من أصل {rows.length} مدربًا
        </p>
      : null}

      <EntityDetailDrawer
        open={view !== null}
        onClose={() => setView(null)}
        title={view?.name ?? ''}
        subtitle={view?.title ?? view?.email ?? ''}
        widthClassName="max-w-xl"
        avatar={view ? <InstructorAvatar row={view} className="mx-auto h-20 w-20 text-xl" /> : null}
        badges={
          view ?
            <>
              <CrudBadge variant={view.is_active ? 'success' : 'default'}>{view.is_active ? 'نشط' : 'موقوف'}</CrudBadge>
              <CrudBadge variant="brand">{view.assigned_courses_count} دورة</CrudBadge>
              <CrudBadge variant="accent">{view.workshops_count} ورشة</CrudBadge>
            </>
          : null
        }
        footerSlot={
          view ?
            <div className="flex flex-wrap justify-end gap-2">
              {!isHrPage && view.user_id ?
                <Link
                  to={`/dashboard/super-admin/crud/users/${view.user_id}/edit`}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-sm"
                >
                  تعديل المستخدم
                </Link>
              : null}
              {!isHrPage && (
                <button
                  type="button"
                  disabled={!view.user_id}
                  title={view.user_id ? undefined : 'لا يوجد حساب مستخدم مرتبط'}
                  onClick={() => view.user_id && void toggleActive(view)}
                  className="rounded-2xl bg-slate-900 px-4 py-2.5 text-[12px] font-black text-white shadow-sm disabled:opacity-50"
                >
                  {view.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                </button>
              )}
            </div>
          : null
        }
        tabs={
          view ?
            [
              {
                id: 'general',
                labelAr: 'البيانات العامة',
                content: (
                  <div className="space-y-4">
                    <EntityDetailSection title="التواصل" icon={<Mail className="h-4 w-4" aria-hidden />}>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <EntityDetailField label="البريد" value={<span dir="ltr">{view.email || '—'}</span>} />
                        <EntityDetailField label="الهاتف" value={view.phone || '—'} />
                        <EntityDetailField
                          label="معرّف المستخدم"
                          value={
                            view.user_id ?
                              <span className="font-mono">#{view.user_id}</span>
: ' (غير مربوط)'
                          }
                        />
                        <EntityDetailField
                          label="معرّف ملف المدرب"
                          value={view.instructor_id ? <span className="font-mono">#{view.instructor_id}</span> : '—'}
                        />
                      </dl>
                    </EntityDetailSection>
                    <EntityDetailSection title="نبذة" icon={<GraduationCap className="h-4 w-4" aria-hidden />}>
                      <p className="text-[13px] font-semibold leading-relaxed text-muted-700">
                        {view.bio?.trim() ? view.bio : 'غير محدد'}
                      </p>
                    </EntityDetailSection>
                    <EntityDetailSection title="التخصص" icon={<Sparkles className="h-4 w-4" aria-hidden />}>
                      <div className="flex flex-wrap justify-end gap-2">
                        {(view.expertise?.length ?? 0) > 0 ?
                          view.expertise!.map((t) => (
                            <CrudBadge key={t} variant="brand">
                              {t}
                            </CrudBadge>
                          ))
                        : (
                          <span className="text-[12px] font-bold text-slate-500">لا توجد وسوم عرض مصفوفة فارغة [] في الـ API</span>
                        )}
                      </div>
                    </EntityDetailSection>
                  </div>
                ),
              },
              {
                id: 'courses',
                labelAr: 'الدورات المسندة',
                content: (
                  <EntityDetailSection title="إحصاء سريع" icon={<BookOpen className="h-4 w-4" aria-hidden />}>
                    <p className="text-[13px] font-semibold text-muted-700">
                      عدد الدورات المسندة وفق سجلات الخادم:{' '}
                      <strong className="text-deepBlue">{view.assigned_courses_count}</strong>. لقائمة العناوين الكاملة، اربط
                      نقطة تفاصيل المدرب لاحقًا أو افتح لوحة البرامج.
                    </p>
                    {!isHrPage && (
                      <Link
                        to="/dashboard/super-admin/crud/programs"
                        className="mt-4 inline-flex rounded-xl bg-[#0077B6] px-4 py-2 text-[12px] font-black text-white shadow-md"
                      >
                        فتح إدارة البرامج
                      </Link>
                    )}
                  </EntityDetailSection>
                ),
              },
              {
                id: 'workshops',
                labelAr: 'الورش',
                content: (
                  <EntityDetailSection title="الورش" icon={<CalendarClock className="h-4 w-4" aria-hidden />}>
                    <EntityDetailField label="إجمالي الورش المسندة" value={String(view.workshops_count)} />
                    <EntityDetailField label="ورش بموعد قادم" value={String(view.upcoming_workshops_count)} />
                  </EntityDetailSection>
                ),
              },
              {
                id: 'ratings',
                labelAr: 'التقييمات',
                content: (
                  <EntityDetailSection title="التقييمات" icon={<Sparkles className="h-4 w-4" aria-hidden />}>
                    <p className="text-[13px] font-semibold text-muted-700">
                      لا تتوفر بيانات تقييمات في استجابة قائمة المدربين حاليًا.
                    </p>
                  </EntityDetailSection>
                ),
              },
              {
                id: 'activity',
                labelAr: 'النشاط',
                content: (
                  <EntityDetailSection title="آخر نشاط" icon={<Zap className="h-4 w-4" aria-hidden />}>
                    <EntityDetailField label="آخر تسجيل دخول" value={displayLastActivity(view.last_login_at)} />
                  </EntityDetailSection>
                ),
              },
              {
                id: 'notifications',
                labelAr: 'الإشعارات',
                content: (
                  <EntityDetailSection title="الإشعارات" icon={<Bell className="h-4 w-4" aria-hidden />}>
                    <p className="text-[13px] font-semibold text-muted-700">
                      لم يتم تسجيل سجل إشعارات لهذا المدرب في هذه الواجهة بعد.
                    </p>
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

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType
  label: string
  value: number
  tone: 'sky' | 'emerald' | 'blue' | 'amber' | 'rose' | 'violet'
}) {
  const ring: Record<typeof tone, string> = {
    sky: 'ring-sky-400/25',
    emerald: 'ring-emerald-400/30',
    blue: 'ring-[#0077B6]/35',
    amber: 'ring-amber-400/35',
    rose: 'ring-rose-400/30',
    violet: 'ring-violet-400/35',
  }
  const bg: Record<typeof tone, string> = {
    sky: 'from-sky-500/15 to-white',
    emerald: 'from-emerald-500/15 to-white',
    blue: 'from-[#0077B6]/15 to-white',
    amber: 'from-amber-500/15 to-white',
    rose: 'from-rose-500/12 to-white',
    violet: 'from-violet-500/12 to-white',
  }
  return (
    <SaGlassCard className={`bg-gradient-to-br ${bg[tone]} p-4 ring-1 ${ring[tone]}`} glow="blue">
      <div className="flex items-center justify-between gap-2 rtl:flex-row-reverse">
        <Icon className="h-5 w-5 opacity-70" aria-hidden />
        <span className="text-2xl font-black tabular-nums text-deepBlue">{value}</span>
      </div>
      <p className="mt-2 text-[10px] font-black uppercase leading-snug tracking-wide text-slate-600">{label}</p>
    </SaGlassCard>
  )
}
