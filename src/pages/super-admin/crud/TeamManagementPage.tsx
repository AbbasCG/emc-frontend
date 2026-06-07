import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Building2,
  Crown,
  ImageOff,
  MoreVertical,
  RefreshCw,
  Search,
  Shield,
  Users,
  X,
  ChevronDown,
} from 'lucide-react'
import { getAdminTeam, resolveTeamMemberImage, type Department, type TeamMember } from '@/services/teamApi'
import { errorToast } from '@/lib/toast'

/* ── Helpers ───────────────────────────────────────────────────────── */

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

/* ── Types ─────────────────────────────────────────────────────────── */

type FlatRow = {
  key: string
  member: TeamMember
  dept: Department
}

/* ── Stat card ─────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  accent: 'blue' | 'orange' | 'navy' | 'green'
}) {
  const colors = {
    blue: 'bg-sky-50 text-customBlue border-sky-100',
    orange: 'bg-orange-50 text-customOrange border-orange-100',
    navy: 'bg-deepBlue/[0.06] text-deepBlue border-deepBlue/10',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-deepBlue/[0.04]">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${colors[accent]}`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-black text-deepBlue tabular-nums">{value}</p>
      <p className="mt-1 text-[12px] font-semibold text-slate-500">{label}</p>
    </div>
  )
}

/* ── Member card ───────────────────────────────────────────────────── */

function MemberCard({ member, dept, onDetail }: { member: TeamMember; dept: Department; onDetail: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const src = resolveTeamMemberImage(member.image)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-deepBlue/[0.04] transition hover:shadow-md"
      dir="rtl"
    >
      {/* Avatar + name row */}
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-customBlue/10 to-slate-100 ring-2 ring-white shadow">
          {src ? (
            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <>
              <div className="flex h-full w-full items-center justify-center text-sm font-black text-deepBlue">
                {initials(member.name_ar)}
              </div>
              <span className="absolute bottom-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600/80 shadow">
                <ImageOff size={10} className="text-white" />
              </span>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="truncate font-black text-deepBlue leading-snug">{member.name_ar}</p>
          {member.name_en && (
            <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {member.name_en}
            </p>
          )}
          <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-relaxed text-slate-600">
            {member.position_ar}
          </p>
        </div>

        {/* Actions */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue"
            aria-label="خيارات"
          >
            <MoreVertical size={15} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-8 z-20 min-w-[130px] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl"
                dir="rtl"
              >
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onDetail() }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-[12px] font-semibold text-deepBlue hover:bg-slate-50"
                >
                  عرض التفاصيل
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-[12px] font-semibold text-slate-500 hover:bg-slate-50"
                >
                  إضافة صورة لاحقاً
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {member.is_leader && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
            <Crown size={9} /> قائد
          </span>
        )}
        {member.is_executive && (
          <span className="inline-flex items-center gap-1 rounded-full border border-customBlue/20 bg-customBlue/[0.07] px-2.5 py-0.5 text-[10px] font-black text-customBlue">
            <Shield size={9} /> تنفيذي
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
          <Building2 size={9} /> {dept.name_ar}
        </span>
      </div>
    </motion.article>
  )
}

/* ── Department section ────────────────────────────────────────────── */

function DeptSection({
  dept,
  rows,
  onDetail,
}: {
  dept: Department
  rows: FlatRow[]
  onDetail: (r: FlatRow) => void
}) {
  const leaders = dept.members.filter((m) => m.is_leader).length

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg ring-1 ring-deepBlue/[0.04]"
      dir="rtl"
    >
      {/* Section header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 text-right">
        <div>
          <h2 className="text-lg font-black text-deepBlue">{dept.name_ar}</h2>
          {dept.name_en && (
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{dept.name_en}</p>
          )}
          {dept.description_ar?.trim() && (
            <p className="mt-2 max-w-2xl text-[12px] font-semibold leading-relaxed text-slate-500 line-clamp-2">
              {dept.description_ar}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black text-deepBlue">
            <Users size={12} /> {dept.members.length} عضو
          </span>
          {leaders > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-800">
              <Crown size={12} /> {leaders} قائد
            </span>
          )}
        </div>
      </div>

      {/* Members grid */}
      {rows.length === 0 ? (
        <div className="px-6 py-8 text-center text-[13px] font-semibold text-slate-400">
          لا يوجد أعضاء مطابقون للبحث الحالي في هذا القسم.
        </div>
      ) : (
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r, i) => (
            <motion.div key={r.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <MemberCard member={r.member} dept={r.dept} onDetail={() => onDetail(r)} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  )
}

/* ── Detail drawer ─────────────────────────────────────────────────── */

function DetailDrawer({ row, onClose }: { row: FlatRow | null; onClose: () => void }) {
  const src = row ? resolveTeamMemberImage(row.member.image) : null

  return (
    <AnimatePresence>
      {row && (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-100 bg-white shadow-2xl"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="font-black text-deepBlue">بطاقة العضو</p>
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-gradient-to-br from-customBlue/10 to-slate-100 ring-2 ring-white shadow-lg">
                  {src ? (
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-black text-deepBlue">
                      {initials(row.member.name_ar)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-lg font-black text-deepBlue">{row.member.name_ar}</p>
                  {row.member.name_en && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{row.member.name_en}</p>
                  )}
                  <p className="mt-1 text-[13px] font-semibold text-slate-600">{row.member.position_ar}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {row.member.is_leader && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                      <Crown size={9} /> قائد
                    </span>
                  )}
                  {row.member.is_executive && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-customBlue/20 bg-customBlue/[0.07] px-2.5 py-0.5 text-[10px] font-black text-customBlue">
                      <Shield size={9} /> تنفيذي
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
                {[
                  { label: 'الإدارة', value: row.dept.name_ar },
                  { label: 'رقم العضو', value: `#${row.member.id}` },
                  ...(row.member.role_key ? [{ label: 'مفتاح الدور', value: row.member.role_key }] : []),
                  { label: 'صورة شخصية', value: row.member.image ? 'متوفرة' : 'غير متوفرة' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-400 shrink-0">{label}</span>
                    <span className="text-[13px] font-semibold text-deepBlue text-left ltr" dir="ltr">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-[12px] font-black text-deepBlue hover:bg-slate-50"
              >
                إغلاق
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* ── Main page ─────────────────────────────────────────────────────── */

export default function TeamManagementPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [depts, setDepts] = useState<Department[]>([])
  const [q, setQ] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'leaders' | 'exec'>('all')
  const [detail, setDetail] = useState<FlatRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminTeam()
      setDepts(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'تعذّر تحميل بيانات الفريق'
      setError(msg)
      errorToast('تعذّر تحميل بيانات الفريق. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  /* Flattened rows for filtering */
  const allRows = useMemo<FlatRow[]>(() => {
    const out: FlatRow[] = []
    for (const d of depts) {
      for (const m of d.members) {
        out.push({ key: `${d.id}-${m.id}`, member: m, dept: d })
      }
    }
    return out
  }, [depts])

  const filteredRows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return allRows.filter((r) => {
      if (deptFilter !== 'all' && String(r.dept.id) !== deptFilter) return false
      if (roleFilter === 'leaders' && !r.member.is_leader) return false
      if (roleFilter === 'exec' && !r.member.is_executive) return false
      if (t) {
        const hay = `${r.member.name_ar} ${r.member.name_en ?? ''} ${r.member.position_ar} ${r.dept.name_ar}`.toLowerCase()
        if (!hay.includes(t)) return false
      }
      return true
    })
  }, [allRows, q, deptFilter, roleFilter])

  /* Stats */
  const totalMembers = allRows.length
  const totalDepts = depts.length
  const totalLeaders = allRows.filter((r) => r.member.is_leader).length
  const noPhoto = allRows.filter((r) => !r.member.image?.trim()).length

  /* Visible depts (respecting filters) */
  const visibleDepts = useMemo(() =>
    depts.filter((d) => deptFilter === 'all' || String(d.id) === deptFilter),
    [depts, deptFilter],
  )

  return (
    <div className="space-y-6 pb-14" dir="rtl">

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <header className="overflow-hidden rounded-[1.75rem] bg-gradient-to-bl from-[#22334A] via-[#1c3a56] to-[#162334] p-8 text-right text-white shadow-2xl lg:p-10">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <Users size={14} className="text-sky-300" />
              <span className="text-[11px] font-black uppercase tracking-widest text-white/75">الفريق الإداري</span>
            </div>
            <h1 className="text-2xl font-black leading-snug lg:text-3xl">
              الفريق الإداري
              <span className="mx-2 text-white/40">—</span>
              <span className="text-customBlue/90">إدارات EMC</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-8 text-white/65">
              تجميع أعضاء فريق EMC ضمن إدارات واضحة مع توضيح القيادات والأدوار والمسؤوليات.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[12px] font-black text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              تحديث
            </button>
            <Link
              to="/dashboard/super-admin/crud/departments"
              className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-5 py-2.5 text-[12px] font-black text-white shadow-lg transition hover:bg-customBlue/90"
            >
              <Building2 size={14} />
              الإدارات
            </Link>
          </div>
        </div>

        {/* Quick stats in hero */}
        {!loading && totalMembers > 0 && (
          <div className="mt-6 flex flex-wrap gap-4 border-t border-white/10 pt-5">
            {[
              { label: 'عضو', value: totalMembers },
              { label: 'إدارة', value: totalDepts },
              { label: 'قائد', value: totalLeaders },
            ].map(({ label, value }) => (
              <div key={label} className="text-right">
                <p className="text-2xl font-black text-white tabular-nums">{value}</p>
                <p className="text-[11px] font-semibold text-white/50">{label}</p>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ── Stats cards ─────────────────────────────────────────────── */}
      {!loading && totalMembers > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="إجمالي الأعضاء" value={totalMembers} icon={Users} accent="blue" />
          <StatCard label="عدد الإدارات" value={totalDepts} icon={Building2} accent="navy" />
          <StatCard label="القيادات" value={totalLeaders} icon={Crown} accent="orange" />
          <StatCard label="أعضاء بدون صورة" value={noPhoto} icon={ImageOff} accent="green" />
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────── */}
      {!loading && totalMembers > 0 && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-deepBlue/[0.04]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث بالاسم أو المنصب..."
              dir="rtl"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-3 text-sm font-semibold text-deepBlue outline-none placeholder:text-slate-400 focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          {/* Department filter */}
          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              dir="rtl"
              className="h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-8 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
            >
              <option value="all">كل الإدارات</option>
              {depts.map((d) => (
                <option key={d.id} value={String(d.id)}>{d.name_ar}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Role filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              dir="rtl"
              className="h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-8 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
            >
              <option value="all">جميع الأعضاء</option>
              <option value="leaders">القيادات فقط</option>
              <option value="exec">التنفيذيون فقط</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Clear filters */}
          {(q || deptFilter !== 'all' || roleFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { setQ(''); setDeptFilter('all'); setRoleFilter('all') }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-black text-slate-500 hover:bg-slate-50"
            >
              <X size={13} /> مسح الفلاتر
            </button>
          )}

          {/* Results count */}
          <p className="self-center text-[12px] font-semibold text-slate-400 mr-auto">
            {filteredRows.length} نتيجة
          </p>
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={String(i)} className="animate-pulse rounded-3xl bg-slate-100 h-64" />
          ))}
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-lg font-black text-rose-800">تعذّر تحميل بيانات الفريق</p>
          <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-5 rounded-xl bg-deepBlue px-6 py-2.5 text-sm font-black text-white shadow transition hover:bg-deepBlue/90"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ── True empty state (API returned zero) ─────────────────────── */}
      {!loading && !error && totalMembers === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-24 text-center shadow-sm">
          <Users className="mx-auto h-14 w-14 text-slate-300" />
          <p className="mt-5 text-xl font-black text-deepBlue">لا يوجد أعضاء في الفريق حتى الآن</p>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            لم تُرجع نقطة API أي بيانات. تحقق من الإعدادات في الخلفية.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-6 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-black text-deepBlue hover:bg-slate-50"
          >
            تحديث
          </button>
        </div>
      )}

      {/* ── Department sections ───────────────────────────────────────── */}
      {!loading && !error && totalMembers > 0 && (
        <div className="space-y-5">
          <AnimatePresence mode="popLayout">
            {visibleDepts.map((dept) => {
              const deptRows = filteredRows.filter((r) => r.dept.id === dept.id)
              if (deptFilter === 'all' && deptRows.length === 0) return null
              return (
                <DeptSection
                  key={dept.id}
                  dept={dept}
                  rows={deptRows}
                  onDetail={setDetail}
                />
              )
            })}
          </AnimatePresence>

          {/* No results after filtering */}
          {filteredRows.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
              <Search className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 font-black text-deepBlue">لا نتائج تطابق البحث الحالي</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">حاول تغيير كلمة البحث أو الفلتر.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Detail drawer ─────────────────────────────────────────────── */}
      <DetailDrawer row={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
