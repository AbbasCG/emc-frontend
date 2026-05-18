import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Layers,
  Radar,
  RefreshCw,
  Sparkles,
  UserCircle2,
  UsersRound,
  Crown,
  Shield,
  ImageOff,
} from 'lucide-react'
import { getTeam, resolveTeamMemberImage, type Department, type TeamMember } from '@/services/teamApi'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { EmptyPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import {
  EntityDetailDrawer,
  EntityDetailField,
  EntityDetailSection,
} from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { EntityActionMenu } from '@/pages/super-admin/crud/shared/EntityActionMenu'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'
import {
  EnterpriseColumnChart,
  EMC_CHART_PALETTE,
  EnterprisePieRadial,
  EnterpriseTinyArea,
} from '@/pages/super-admin/crud/shared/enterprise/charts'
import {
  AnimatedTabular,
  EnterpriseCrudHero,
  EnterpriseMetricTile,
  EnterpriseTableSkeleton,
} from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'
import {
  SaGlassCard,
  SaPageRoot,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

type Row = {
  key: string
  member: TeamMember
  departmentTitle: string
  departmentId: number
}

export default function TeamManagementPage() {
  const [loading, setLoading] = useState(true)
  const [depts, setDepts] = useState<Department[]>([])
  const [q, setQ] = useState('')
  const [onlyLeaders, setOnlyLeaders] = useState<'all' | 'leaders' | 'exec'>('all')
  const [view, setView] = useState<Row | null>(null)
  const [deptFilter, setDeptFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const t = await getTeam()
      setDepts(t)
    } catch {
      setDepts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    const flat: Row[] = []
    for (const d of depts) {
      for (const m of d.members) {
        flat.push({ key: `${d.id}-${m.id}`, member: m, departmentTitle: d.name_ar, departmentId: d.id })
      }
    }
    return flat
  }, [depts])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (onlyLeaders === 'leaders' && !r.member.is_leader) return false
      if (onlyLeaders === 'exec' && !r.member.is_executive) return false
      const hay =
        `${r.member.name_ar} ${r.member.name_en ?? ''} ${r.member.position_ar} ${r.departmentTitle} ${r.member.role_key ?? ''}`.toLowerCase()
      return !t || hay.includes(t)
    })
  }, [rows, q, onlyLeaders])

  const filteredByDept = useMemo(() => {
    if (deptFilter === 'all') return filtered
    return filtered.filter((r) => String(r.departmentId) === deptFilter)
  }, [filtered, deptFilter])

  const deptFilterOptions = useMemo(
    () => [{ value: 'all', labelAr: 'كل الإدارات' }, ...depts.map((d) => ({ value: String(d.id), labelAr: d.name_ar }))],
    [depts],
  )

  const headsCount = rows.filter((r) => r.member.is_leader).length
  const execNotLeaderCount = rows.filter((r) => r.member.is_executive && !r.member.is_leader).length
  const baselineCount = rows.filter((r) => !r.member.is_leader && !r.member.is_executive).length
  const execAny = rows.filter((r) => r.member.is_executive).length
  const withPhoto = rows.filter((r) => Boolean(r.member.image?.trim())).length

  const pieTalent = [
    { name: 'قادة وحدات تنظيمية', value: headsCount, fill: EMC_CHART_PALETTE[0] },
    { name: 'تنفيذي دون عنوان قائدة', value: execNotLeaderCount, fill: EMC_CHART_PALETTE[1] },
    { name: 'صف عموم تشغيلي', value: baselineCount, fill: EMC_CHART_PALETTE[3] },
  ].filter((s) => s.value > 0)

  const columnDept = depts.map((d) => ({
    label: d.name_ar.length > 18 ? `${d.name_ar.slice(0, 16)}…` : d.name_ar,
    أعضاء: d.members.length,
    قادة: d.members.filter((m) => m.is_leader).length,
  }))

  const deptHeat = depts.map((d, idx) => ({
    idx,
    v: d.members.reduce((acc, m) => acc + (m.is_leader ? 2 : 1) + (m.is_executive ? 1.2 : 0), 0),
  }))

  return (
    <SaPageRoot className="space-y-8 pb-14">
      <EnterpriseCrudHero
        eyebrow="People Lattice · Operational bench"
        title="الفريق الإداري — مسارح تشغيل متعدّدة الإدارات"
        subtitle="تجميع أعضاء /team وفق وحدة تنظيمية حيّة: صور حيث تُحمَّل، مناصب وفق نقطة الموارد البشرية، دون حقول جاهزية دائمة لمؤشر حضور شبكي خارج المزامنة."
        variant="blue"
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-[18px] border border-white/28 bg-white/95 px-4 py-2.5 text-[12px] font-black text-deepBlue shadow backdrop-blur-md"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <Link
              to="/dashboard/hr/team"
              className="inline-flex items-center gap-2 rounded-[18px] bg-[#2691C2] px-5 py-2.5 text-[12px] font-black text-white shadow-lg"
            >
              لوحة الموارد البشرية
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EnterpriseMetricTile
          accent="blue"
          icon={UsersRound}
          label="مقاصد الموارد البشرية"
          value={<AnimatedTabular value={rows.length} />}
          hint={`${depts.length} وحدة تنظيمية في التغذية الحالية`}
        />
        <EnterpriseMetricTile accent="orange" icon={Crown} label="قادة وحدات" value={<AnimatedTabular value={headsCount} />} />
        <EnterpriseMetricTile accent="navy" icon={Shield} label="تنفيذيون بالعلم (جميع المراتب)" value={<AnimatedTabular value={execAny} />} />
        <EnterpriseMetricTile
          accent="mint"
          icon={Radar}
          label="توفر الصور الرمزية المرصود"
          value={rows.length === 0 ? '—' : `${Math.round((withPhoto / rows.length) * 100)}٪`}
          hint={`${withPhoto}/${rows.length}`}
        />
      </div>

      <CrudToolbar
        sticky
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="بحث عن الاسم العربي أو الإنجليزي أو المنصب أو المفتاح…"
      >
        <MiniSelect label="الإدارة" value={deptFilter} onChange={setDeptFilter} options={deptFilterOptions} />
        <MiniSelect
          label="طبقة مهمة"
          value={onlyLeaders}
          onChange={(v) => setOnlyLeaders(v as 'all' | 'leaders' | 'exec')}
          options={[
            { value: 'all', labelAr: 'الجميع في النطاق' },
            { value: 'leaders', labelAr: 'قوائد وحدة تنظيمية' },
            { value: 'exec', labelAr: 'تنفيذي حسب المصدر' },
          ]}
        />
      </CrudToolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <motion.div layout className="space-y-5">
          {loading ?
            <EnterpriseTableSkeleton cols={5} rows={5} />
          : !filteredByDept.length ?
            <EmptyPanel
              title="لا يوجد أعضاء مطابقون"
              subtitle="إذا كانت النتيجة فارغة بالكامل فغالباً نقطة الفريق لم تكتمل تهيئة في الخلفية."
            />
          :
            <>
              {depts
                .filter((d) => deptFilter === 'all' || String(d.id) === deptFilter)
                .map((dept, laneIdx) => {
                  const laneRows = filteredByDept.filter((r) => r.departmentId === dept.id)
                  if (!laneRows.length) return null
                  const lead = dept.members.filter((m) => m.is_leader).length
                  const execLane = dept.members.filter((m) => m.is_executive).length
                  return (
                    <SaGlassCard key={dept.id} className="overflow-hidden ring-1 ring-white/50" glow="blue">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100/70 px-6 py-4 text-right">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-600">خطّ أفقي · سرب إداري</p>
                          <h2 className="mt-1 text-xl font-black text-deepBlue">{dept.name_ar}</h2>
                          <p className="mt-2 max-w-2xl text-[12px] font-semibold leading-relaxed text-muted-700">
                            {dept.description_ar?.trim()?.slice(0, 220)}
                            {(dept.description_ar?.trim()?.length ?? 0) > 220 ? '…' : ''}
                            {(dept.description_ar?.trim()?.length ?? 0) === 0 ?
                              'لا يوجد شرح وحدة تنظيمية موسّط في نقطة الفريق الآن؛ يمكن إثراؤه على الخلفية عند المراجعة التشغيلية.'
                            : null}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-3 justify-start rtl:flex-row-reverse">
                            <CrudBadge variant="brand">{dept.members.length} أعضاء في النطاق المرشّح</CrudBadge>
                            <CrudBadge variant={lead ? 'accent' : 'default'}>{lead} قائد وحدة تنظيمية</CrudBadge>
                            <CrudBadge variant={execLane ? 'success' : 'default'}>{execLane} عضو بتسمية تنفيذية</CrudBadge>
                          </div>
                        </div>
                        <motion.span
                          initial={{ opacity: 0, rotate: -4 }}
                          animate={{ opacity: 1, rotate: 0 }}
                          transition={{ delay: laneIdx * 0.06 }}
                          className="rounded-3xl bg-gradient-to-bl from-accent-400/18 to-transparent px-4 py-2 text-[11px] font-black text-accent-950 shadow-inner ring-1 ring-accent-300/55"
                        >
                          #{dept.sort_order}
                        </motion.span>
                      </div>

                      <div className="flex gap-3 overflow-x-auto px-4 pb-5 pt-4" dir="rtl">
                        {laneRows.map((r, i) => {
                          const src = resolveTeamMemberImage(r.member.image)
                          return (
                            <motion.article
                              key={r.key}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.035 }}
                              className="min-w-[17.5rem] flex-1 rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.43)] backdrop-blur"
                            >
                              <div className="flex items-start gap-3 rtl:flex-row-reverse">
                                <div className="relative grid h-[4.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-customBlue/[0.12] to-white ring-2 ring-white">
                                  {src ?
                                    <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                                  :
                                    <>
                                      <div className="grid h-full w-full place-items-center text-xl font-black text-deepBlue">{initialsFromName(r.member.name_ar)}</div>
                                      <span className="absolute bottom-1 end-1 grid h-6 w-6 place-items-center rounded-full bg-deepBlue/95 text-[9px] text-white shadow-lg">
                                        <ImageOff className="h-3.5 w-3.5" aria-hidden />
                                      </span>
                                    </>
                                  }
                                </div>
                                <div className="min-w-0 flex-1 text-right rtl:text-right">
                                  <h3 className="font-black text-deepBlue">{r.member.name_ar}</h3>
                                  {r.member.name_en ?
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-500">{r.member.name_en}</p>
                                  : null}
                                  <p className="mt-2 text-[11px] font-bold text-muted-700">{r.member.position_ar}</p>
                                  <div className="mt-3 flex flex-wrap gap-1.5 rtl:flex-row-reverse">
                                    {r.member.is_leader ?
                                      <CrudBadge variant="brand">قائد</CrudBadge>
                                    : null}
                                    {r.member.is_executive ?
                                      <CrudBadge variant="accent">تنفيذي</CrudBadge>
                                    : null}
                                    {r.member.role_key ?
                                      <CrudBadge variant="default">{r.member.role_key}</CrudBadge>
                                    : null}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 flex items-center justify-between border-t border-ink-100/60 pt-3 rtl:flex-row-reverse">
                                <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-[10px] font-black text-deepBlue ring-1 ring-brand-300/55">
                                  <UserCircle2 className="h-3.5 w-3.5" aria-hidden />
                                  {dept.name_ar}
                                </div>
                                <RowActionsMenu
                                  ariaLabel={r.member.name_ar}
                                  actions={[{ key: 'v', label: 'بطاقة موجزة', onClick: () => setView(r) }]}
                                />
                              </div>
                            </motion.article>
                          )
                        })}
                      </div>
                    </SaGlassCard>
                  )
                })}
            </>
          }
        </motion.div>

        <div className="space-y-4">
          <SaGlassCard className="flex flex-col gap-2 p-5 text-right" glow="orange">
            <div className="flex items-start justify-between gap-2 rtl:flex-row-reverse">
              <div>
                <p className="text-[11px] font-black text-muted-600">تشكل الفريق المرصود</p>
                <p className="mt-1 text-[11px] font-semibold text-muted-500">طبقات حصرًا متقطعة: قائد، تنفيذي ليس قائدًا، عمومي.</p>
              </div>
              <Sparkles className="h-6 w-6 text-accent-500/85" aria-hidden />
            </div>
            <div className="rounded-3xl bg-white/70 px-2 py-2 ring-1 ring-ink-100/65">
              <EnterprisePieRadial data={pieTalent} height={200} />
            </div>
            {!pieTalent.length && !loading ? <p className="py-4 text-center text-[11px] font-bold text-muted-600">لم تُحمّل شبكة أعضاء لرسم قطاع.</p> : null}
          </SaGlassCard>
          <SaGlassCard className="p-5 text-right ring-1 ring-white/50" glow="blue">
            <p className="text-[11px] font-black text-deepBlue">حمولة أفقية لكل وحدة تنظيمية</p>
            <p className="mt-1 text-[11px] font-semibold text-muted-600">عداد أعضاء يقابل قادة وحدة حيث يطبِّق العلم المرصود.</p>
            <EnterpriseColumnChart
              data={columnDept}
              height={220}
              bars={[
                { key: 'أعضاء', color: EMC_CHART_PALETTE[2], label: 'الأعضاء' },
                { key: 'قادة', color: EMC_CHART_PALETTE[1], label: 'قادة' },
              ]}
            />
            {!columnDept.length && !loading ? <EmptyPanel title="لم تُحمّل وحدات" /> : null}
          </SaGlassCard>
          <SaGlassCard className="overflow-hidden border border-accent-400/35 p-5" glow="orange">
            <div className="flex items-start justify-between gap-2 rtl:flex-row-reverse">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-accent-950">ذبذبة مساهمة ظرفية</p>
                <p className="mt-2 text-[11px] font-semibold text-muted-700">مركبة من وزن قائد وزن عموم بدون ادّعاء شبكة خارجية حيّة.</p>
              </div>
              <Layers className="h-9 w-9 text-accent-600/60" aria-hidden />
            </div>
            <div className="mt-3 rounded-[20px] border border-accent-400/35 bg-accent-400/[0.07] px-2 py-1">
              {deptHeat.length ?
                <EnterpriseTinyArea data={deptHeat} />
              :
                <div className="py-10 text-[11px] font-bold text-muted-600 rtl:text-center">لا تسلسل وحدة لمخطط ظرف مركّز.</div>
              }
            </div>
          </SaGlassCard>
        </div>
      </div>

      <EntityDetailDrawer
        open={view !== null}
        onClose={() => setView(null)}
        title={view?.member.name_ar ?? ''}
        subtitle={view?.member.position_ar ?? 'منظومة الفريق'}
        avatar={
          view ?
            <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-sm font-black text-deepBlue ring-2 ring-white shadow-md">
              {resolveTeamMemberImage(view.member.image) ?
                <img
                  src={resolveTeamMemberImage(view.member.image)!}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              : (
                initialsFromName(view.member.name_ar)
              )}
            </span>
          : null
        }
        badges={
          view ?
            <>
              {view.member.is_leader ? <CrudBadge variant="success">قائد وحدة</CrudBadge> : null}
              {view.member.is_executive ? <CrudBadge variant="accent">تنفيذي</CrudBadge> : null}
              {view.member.role_key ? <CrudBadge variant="default">{view.member.role_key}</CrudBadge> : null}
            </>
          : null
        }
        footerSlot={
          <EntityActionMenu
            onClose={() => setView(null)}
            onEdit={() => {
              window.location.href = '/dashboard/hr/team'
            }}
            editLabel="لوحة الموارد البشرية"
            extraStart={
              view ?
                <Link
                  to="/dashboard/hr/team"
                  className="me-auto text-[11px] font-black text-customBlue underline-offset-2 hover:underline"
                >
                  فتح مسار التحقق الموظَّف
                </Link>
              : null
            }
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
                    <EntityDetailSection title="هوية في دليل الفريق" icon={<UserCircle2 className="h-4 w-4" aria-hidden />}>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <EntityDetailField label="الاسم العربي" value={view.member.name_ar} />
                        <EntityDetailField label="الاسم الإنجليزي" value={view.member.name_en ?? '—'} />
                        <EntityDetailField label="الوحدة التنظيمية" value={view.departmentTitle} />
                        <EntityDetailField label="معرّف العضو" value={<span className="font-mono">#{view.member.id}</span>} />
                      </dl>
                    </EntityDetailSection>
                    <EntityDetailSection title="أدوار مرصودة" icon={<Shield className="h-4 w-4" aria-hidden />}>
                      <p className="text-[13px] font-semibold text-muted-700">
                        {view.member.role_key ?
                          <>مفتاح الدور المرجعي: <code className="font-mono">{view.member.role_key}</code></>
                        : 'لم يصدّره المصدر حقل Role Key.'}
                      </p>
                    </EntityDetailSection>
                  </div>
                ),
              },
              {
                id: 'links',
                labelAr: 'الارتباطات',
                content: (
                  <EntityDetailSection title="مسارات تشغيل" icon={<Layers className="h-4 w-4" aria-hidden />}>
                    <p className="text-[13px] font-semibold text-muted-700">
                      للمزامنة الكاملة مع بطاقات الموارد البشرية والصلاحيات استخدم لوحة HR الرسمية؛ هذا العرض مركزي للسوبر
                      مشرف فقط.
                    </p>
                  </EntityDetailSection>
                ),
              },
              {
                id: 'activity',
                labelAr: 'النشاط',
                content: (
                  <EntityDetailSection title="تدقيق" icon={<Radar className="h-4 w-4" aria-hidden />}>
                    <p className="text-[12px] font-semibold text-muted-600">
                      لا أثر زمني مستورد من `/team`؛ عند توفر حقول `updated_at` يمكن عرضها هنا دون تهيئة.
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
