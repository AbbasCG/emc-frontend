import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Gauge,
  LineChart,
  Radio,
  RefreshCw,
  Trophy,
  WandSparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchInstructors, type InstructorPublic } from '@/api/instructorsApi'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import {
  EntityDetailDrawer,
  EntityDetailField,
  EntityDetailSection,
} from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { EntityActionMenu } from '@/pages/super-admin/crud/shared/EntityActionMenu'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'
import {
  AnimatedTabular,
  EnterpriseCrudHero,
  EnterpriseMetricTile,
} from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'
import { EnterpriseBarChartRtl, EMC_CHART_PALETTE, EnterpriseTinyArea } from '@/pages/super-admin/crud/shared/enterprise/charts'
import { SaGlassCard, SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

function splitExpertise(raw: string) {
  return raw.split(/[,،؛\/|]/g).flatMap((p) => p.trim()).filter(Boolean)
}

export default function InstructorsManagementPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<InstructorPublic[]>([])
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<'courses' | 'slug'>('courses')
  const [view, setView] = useState<InstructorPublic | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchInstructors()
      setRows(Array.isArray(list) ? list : [])
    } catch {
      toast.error('تعذّر تحميل المدربين من /instructors')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    const base = [...rows]
    base.sort((a, b) => {
      if (sortKey === 'slug') return a.slug.localeCompare(b.slug)
      const ac = a.courses_count ?? 0
      const bc = b.courses_count ?? 0
      return bc - ac
    })
    return base.filter((r) => !t || `${r.name} ${r.slug} ${r.title ?? ''}`.toLowerCase().includes(t))
  }, [rows, q, sortKey])

  const workshopsAgg = rows.reduce((a, i) => a + (i.workshops_count ?? 0), 0)
  const rosterBusy = filtered.filter((i) => (i.courses_count ?? 0) + (i.workshops_count ?? 0) > 0).length

  const topBar = [...filtered].sort((a, b) => (b.courses_count ?? 0) - (a.courses_count ?? 0)).slice(0, 9)

  const tagCloud = useMemo(() => {
    const tally = new Map<string, number>()
    for (const r of filtered) {
      if (!r.expertise?.trim()) continue
      for (const w of splitExpertise(r.expertise)) tally.set(w, (tally.get(w) ?? 0) + 1)
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 42)
  }, [filtered])

  const tagArea = tagCloud.slice(0, 12).map((t, idx) => ({ idx, v: t[1] }))

  return (
    <SaPageRoot className="space-y-8 pb-16">
      <EnterpriseCrudHero
        eyebrow="Faculty network · Marketplace inventory"
        title="المدربون — قياس أثر الكتالوج العام فقط"
        subtitle="البيانات تُستهلك من نقطة الزائر `/instructors`؛ الأرقام هنا عدّية لمخرجات البرمجيات والورش في الاستجابة الحالية وليست بطاقة تقييم أداء حقيقية."
        variant="navy"
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
              to="/dashboard/hr/instructors"
              className="rounded-[18px] bg-[#2691C2] px-5 py-2.5 text-[12px] font-black text-white shadow-lg"
            >
              تشغيل HR تفصيلي
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <EnterpriseMetricTile
          accent="blue"
          icon={Trophy}
          label="مراجع المدرب في النطاق المرشَّح"
          value={<AnimatedTabular value={filtered.length} />}
          hint={`من أصل مجموعة المرجع: ${rows.length}`}
        />
        <EnterpriseMetricTile
          accent="orange"
          icon={Gauge}
          label="ورش مرتبطة باستجابة الكتالوج"
          value={<AnimatedTabular value={workshopsAgg} />}
        />
        <EnterpriseMetricTile
          accent="mint"
          icon={Radio}
          label="ضغط ظاهر في المرشّح الآن"
          value={filtered.length === 0 ? '—' : `${Math.round((rosterBusy / filtered.length) * 100)}٪`}
          hint={`${rosterBusy} من ${filtered.length} لديهم دورات أو ورش وفق هذا الجد.`}
        />
      </div>

      <CrudToolbar
        sticky
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="بحث بالاسم أو السِّلَق أو المسمى الوظيفي المعروض…"
      >
        <MiniSelect
          label="الفرز"
          value={sortKey}
          onChange={(v) => setSortKey(v as 'courses' | 'slug')}
          options={[
            { value: 'courses', labelAr: 'الأكثر برنامجًا' },
            { value: 'slug', labelAr: 'السِلِق أبجديًا' },
          ]}
        />
      </CrudToolbar>

      <div className="grid gap-6 xl:grid-cols-[340px,minmax(0,1fr)]">
        <div className="space-y-5">
          <SaGlassCard glow="orange" className="p-6 text-right">
            <div className="flex items-start justify-between gap-2 rtl:flex-row-reverse">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-accent-950">الأكثر تأثيراً في السجل الحالي</p>
                <p className="mt-2 text-[11px] font-semibold text-muted-700">صفوف حسب مجموع برامج الاستجابة فقط؛ لا نقارن بتقييمات طلّاب خارجية الآن.</p>
              </div>
              <WandSparkles className="h-7 w-7 text-accent-600/80" aria-hidden />
            </div>
            <div className="mt-4 divide-y divide-ink-100/65 border-t border-ink-100/70 rtl:text-right">
              {filtered.length === 0 && !loading ?
                <EmptyPanel title="لا مدرب لتصنيفه في هذا المنظور الآن." />
              : topBar.map((ins, idx) => {
                  const pulse = ((ins.workshops_count ?? 0) + (ins.courses_count ?? 0)) * 3
                  return (
                    <motion.button
                      type="button"
                      key={`${ins.slug}-${idx}`}
                      layout
                      onClick={() => setView(ins)}
                      className="flex w-full items-center gap-3 py-4 text-start rtl:flex-row-reverse"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-gradient-to-bl from-accent-400/25 to-white text-[12px] font-black text-accent-950 ring-1 ring-accent-300/50">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1 rtl:text-right">
                        <p className="truncate font-black text-deepBlue">{ins.name}</p>
                        <div className="mt-2 flex flex-wrap gap-2 justify-start rtl:flex-row-reverse">
                          <CrudBadge variant="brand">{ins.courses_count ?? 0} برنامج</CrudBadge>
                          <CrudBadge variant="accent">{ins.workshops_count ?? 0} ورشة</CrudBadge>
                          {pulse > 28 ?
                            <CrudBadge variant="success">ضغط كتالوج مرتفع</CrudBadge>
                          : pulse > 12 ?
                            <CrudBadge variant="default">ضغط متوسط</CrudBadge>
                          : (
                            <CrudBadge variant="default">حمولة مخفيفة ظاهرة</CrudBadge>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
            </div>
          </SaGlassCard>
          <SaGlassCard className="p-5 ring-2 ring-accent-400/35" glow="blue">
            <p className="text-[11px] font-black text-deepBlue">مزامنة بيانات خارجية مقترحة</p>
            <ul className="mt-4 space-y-3 text-[12px] font-semibold text-muted-700 rtl:text-right">
              <li> لا يصدّره `/instructors` معدلات إكمال فعلية أو آراء؛ أضيف عند ظهور حقل حقيقي لتجنّب مؤثرات LMS وهمية. </li>
              <li> يمكن لمزود خلفى جديد حقن عدّادات SLA استجابة دون مغادرة شكل هذه اللوحة. </li>
            </ul>
          </SaGlassCard>
        </div>

        <div className="space-y-5">
          {loading ?
            <LoadingPanel />
          : !filtered.length ?
            <EmptyPanel title="لم يتم العثور على مدربين" subtitle="تأكد من أن نقطة GET /instructors متاحة وفق شبكة العمل الآن." />
          :
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
              <SaGlassCard className="relative overflow-hidden p-8" glow="orange">
                <div className="absolute end-[-10%] top-[-35%] h-48 w-48 rounded-full bg-[#2691C2]/10 blur-[80px]" aria-hidden />
                <div className="relative flex flex-wrap items-start justify-between gap-4 text-right rtl:text-right">
                  <div>
                    <p className="text-[11px] font-black text-muted-600">مزيج إنتاج المحتوى الظاهري</p>
                    <h2 className="mt-2 text-3xl font-black text-deepBlue">مجموعات التدريس وفق مجموعة المرشّح</h2>
                  </div>
                  <LineChart className="h-11 w-11 text-accent-700/85" aria-hidden />
                </div>
                <div className="relative mt-6 rounded-[26px] border border-white/80 bg-white/70 p-3 shadow-inner backdrop-blur">
                  <EnterpriseBarChartRtl
                    data={topBar.map((r) => ({ nameAr: r.name.length > 16 ? `${r.name.slice(0, 14)}…` : r.name, برامج: r.courses_count ?? 0 }))}
                    dataKey="برامج"
                    nameKey="nameAr"
                    gradientId="ins-bar"
                    height={280}
                  />
                </div>
              </SaGlassCard>

              <SaGlassCard className="flex flex-col gap-4 p-5 text-right" glow="blue">
                <p className="text-[11px] font-black text-deepBlue">سحابة خبرات مفكّكة من النصوص الحرفية</p>
                <p className="text-[11px] font-semibold text-muted-600">يُقسَم حقل expertise عند الفواصل والشرطات حسب استجابة الخادم فقط.</p>
                <div className="rounded-[20px] border border-customBlue/25 bg-brand-500/[0.05] px-2 py-2">
                  {tagArea.length ?
                    <EnterpriseTinyArea data={tagArea} height={86} />
                  : null}
                </div>
                <div className="flex flex-wrap gap-2 justify-start rtl:flex-row-reverse">
                  {tagCloud.length ?
                    tagCloud.map(([label, w]) => (
                      <motion.span
                        key={label}
                        layout
                        className="rounded-full px-3 py-1 text-[11px] font-black ring-1"
                        style={{
                          backgroundColor: `rgba(38,145,194,${0.08 + Math.min(0.22, w * 0.04)})`,
                          color: '#0F172A',
                          borderColor: 'rgba(38,145,194,0.35)',
                        }}
                      >
                        {label} · {w}
                      </motion.span>
                    ))
                  : (
                    <span className="text-[12px] font-bold text-muted-600">لا يوجد نص خبرة قابل للتفكيك في هذه المجموعة.</span>
                  )}
                </div>
              </SaGlassCard>
            </div>
          }

          {!loading && filtered.length ?
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((ins, i) => {
                const busy = (ins.courses_count ?? 0) > 0 || (ins.workshops_count ?? 0) > 0
                return (
                  <motion.div
                    key={ins.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.24) }}
                    className="relative overflow-hidden rounded-[26px] border border-white/70 bg-gradient-to-bl from-white via-white to-slate-50 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)] ring-1 ring-ink-100/60"
                  >
                    <span
                      className="absolute -start-8 top-8 h-24 w-24 rounded-full opacity-40 blur-2xl"
                      style={{ background: EMC_CHART_PALETTE[i % EMC_CHART_PALETTE.length] }}
                      aria-hidden
                    />
                    <div className="relative flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3 rtl:flex-row-reverse">
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-black text-deepBlue ring-1 ring-slate-200">
                          {initialsFromName(ins.name)}
                        </div>
                        <div className="min-w-0 text-right rtl:text-right">
                          <h3 className="font-black text-deepBlue">{ins.name}</h3>
                          <code className="mt-1 block truncate text-[11px] text-muted-600">{ins.slug}</code>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${
                          busy ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
                        }`}
                      >
                        <Radio className={`h-3 w-3 ${busy ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden />
                        {busy ? 'ضغط كتالوج ظاهر' : 'أقل من جلسة برنامج'}
                      </span>
                    </div>
                    {ins.title ?
                      <p className="relative mt-3 text-[12px] font-bold text-muted-700 rtl:text-right">{ins.title}</p>
                    : null}
                    <div className="relative mt-4 flex flex-wrap justify-start gap-2 rtl:flex-row-reverse">
                      {ins.expertise ?
                        splitExpertise(ins.expertise).slice(0, 4).map((tag) => (
                          <CrudBadge key={tag} variant="brand">
                            {tag}
                          </CrudBadge>
                        ))
                      : (
                        <CrudBadge variant="default">تخصّص غير معلن</CrudBadge>
                      )}
                      {ins.image_url ?
                        <CrudBadge variant="accent">بروفايل بصورة</CrudBadge>
                      : (
                        <CrudBadge variant="default">رمز احتياطي</CrudBadge>
                      )}
                    </div>
                    <div className="relative mt-4 rounded-2xl border border-ink-100/80 bg-slate-50/90 px-4 py-3 text-right">
                      <p className="text-[10px] font-black uppercase text-muted-500">ضخّ كتالوج موجز</p>
                      <p className="mt-1 text-[14px] font-black text-deepBlue">
                        {ins.courses_count ?? 0} دورة · {ins.workshops_count ?? 0} ورشة
                      </p>
                    </div>
                    {ins.courses && ins.courses.length > 0 ?
                      <div className="relative mt-3 flex flex-wrap gap-1.5 justify-start rtl:flex-row-reverse">
                        {ins.courses.slice(0, 3).map((c) => (
                          <span key={c.id} className="rounded-lg bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-950 ring-1 ring-brand-400/25">
                            {c.title}
                          </span>
                        ))}
                        {ins.courses.length > 3 ?
                          <span className="text-[10px] font-black text-muted-500">+{ins.courses.length - 3}</span>
                        : null}
                      </div>
                    : null}
                    <div className="relative mt-5 flex justify-end border-t border-ink-100/60 pt-4">
                      <RowActionsMenu
                        ariaLabel={ins.name}
                        actions={[
                          { key: 'v', label: 'لمحة', onClick: () => setView(ins) },
                          { key: 'p', label: 'الموقع العام', onClick: () => window.open(`/instructors/${ins.slug}`, '_blank') },
                        ]}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          : null}
        </div>
      </div>

      <EntityDetailDrawer
        open={view !== null}
        onClose={() => setView(null)}
        title={view?.name ?? ''}
        subtitle={view?.title ?? 'ملف مدرب — كتالوج عام'}
        avatar={
          view ?
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-lg font-black text-deepBlue ring-2 ring-white shadow-md">
              {initialsFromName(view.name)}
            </span>
          : null
        }
        badges={
          view ?
            <>
              <CrudBadge variant="brand">{view.courses_count ?? 0} برنامج</CrudBadge>
              <CrudBadge variant="accent">{view.workshops_count ?? 0} ورشة</CrudBadge>
            </>
          : null
        }
        footerSlot={
          <EntityActionMenu
            onClose={() => setView(null)}
            onEdit={
              view ?
                () => window.open(`/instructors/${view.slug}`, '_blank')
              : undefined
            }
            editLabel="صفحة الزائر"
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
                    <EntityDetailSection title="نبذة" icon={<WandSparkles className="h-4 w-4" aria-hidden />}>
                      <p className="text-[13px] font-semibold leading-relaxed text-muted-700">
                        {view.bio?.trim() ?? 'لم يصل نص سيرة عبر نقطة الاستجابة الحالية.'}
                      </p>
                    </EntityDetailSection>
                    <EntityDetailSection title="مفاتيح سجل" icon={<Radio className="h-4 w-4" aria-hidden />}>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <EntityDetailField label="المعرّف" value={<span className="font-mono">#{view.id}</span>} />
                        <EntityDetailField label="السِلِق" value={<code className="font-mono text-[12px]">{view.slug}</code>} />
                        <EntityDetailField label="المسمى المعروض" value={view.title ?? '—'} />
                        <EntityDetailField
                          label="صورة ملف"
                          value={view.image_url ? 'مرفوع' : 'رمز احتياطي'}
                        />
                      </dl>
                    </EntityDetailSection>
                  </div>
                ),
              },
              {
                id: 'expertise',
                labelAr: 'الخبرات والبرامج',
                content: (
                  <EntityDetailSection title="خبرات معلنة" icon={<LineChart className="h-4 w-4" aria-hidden />}>
                    <div className="flex flex-wrap justify-end gap-2">
                      {splitExpertise(view.expertise ?? '').length ?
                        splitExpertise(view.expertise ?? '').map((t) => (
                          <CrudBadge key={t} variant="brand">
                            {t}
                          </CrudBadge>
                        ))
                      : (
                        <CrudBadge variant="default">لا حقل خبرة قابل للتفكيك</CrudBadge>
                      )}
                    </div>
                    {view.courses?.length ?
                      <div className="mt-4 space-y-2">
                        <p className="text-[11px] font-black text-muted-600">برامج مرتبطة في الاستجابة</p>
                        <ul className="space-y-2 text-[12px] font-semibold text-muted-800 rtl:text-right">
                          {view.courses.map((c) => (
                            <li key={c.id} className="rounded-xl border border-ink-100/70 bg-white px-3 py-2">
                              {c.title}{' '}
                              <code className="text-[10px] text-muted-500">{c.slug}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    : null}
                  </EntityDetailSection>
                ),
              },
              {
                id: 'activity',
                labelAr: 'النشاط',
                content: (
                  <EntityDetailSection title="تدقيق ظرفي" icon={<Gauge className="h-4 w-4" aria-hidden />}>
                    <p className="text-[12px] font-semibold text-muted-700">
                      لا سجل تغييرات خلفي في واجهة `/instructors`؛ هذا القسم تذكير تشغيلي حتى تربط نقطة LMS أو HR.
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
