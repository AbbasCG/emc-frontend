import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Cpu, Layers, Radar, Shield, Sparkles, UserCheck, Users, X } from 'lucide-react'
import { fetchAdminUsers } from '@/api/adminUsersApi'
import { SUPER_ADMIN_ROLE_CATALOG_ROWS } from '@/pages/super-admin/users/assignableRoles'
import { CAPABILITIES, roleHasCapabilitySlug } from '@/pages/super-admin/users/roleScopeHints'
import { normalizeRole } from '@/utils/dashboardAccess'
import { EmptyPanel } from '@/pages/super-admin/crud/shared/States'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { SaGlassCard, SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'
import {
  EntityDetailDrawer,
  EntityDetailField,
  EntityDetailSection,
} from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { EntityActionMenu } from '@/pages/super-admin/crud/shared/EntityActionMenu'
import { EnterpriseCrudHero, EnterpriseMetricTile } from '@/pages/super-admin/crud/shared/enterprise'

function securityBadge(slug: string): { label: string; variant: 'accent' | 'brand' | 'success' | 'default' } {
  if (slug === 'super_admin' || slug === 'executive_admin')
    return { label: 'سيادة كاملة', variant: 'accent' }
  if (slug === 'admin') return { label: 'إشراف عام', variant: 'brand' }
  if (slug === 'finance_manager' || slug === 'hr_manager') return { label: 'بيانات حسّاسة', variant: 'accent' }
  if (slug === 'student' || slug === 'partner' || slug === 'volunteer') return { label: 'مسار خارجي', variant: 'success' }
  return { label: 'تشغيلي', variant: 'default' }
}

const ROLE_GROUPS: { titleAr: string; slugs: readonly string[] }[] = [
  { titleAr: 'القيادة والحوكمة', slugs: ['super_admin', 'executive_admin', 'admin'] },
  { titleAr: 'التعليم والجودة', slugs: ['instructor', 'student', 'quality_manager'] },
  { titleAr: 'التشغيل المؤسسي', slugs: ['finance_manager', 'hr_manager', 'department_manager'] },
  { titleAr: 'النمو والشراكة', slugs: ['marketing_manager', 'support_agent', 'partner', 'volunteer'] },
]

/** دليل RBAC المرئي — يُكمِّل Laravel Policies ولا يحل محلها. */
export default function RolesPermissionsPage() {
  const [q, setQ] = useState('')
  const [detailSlug, setDetailSlug] = useState<string | null>(null)
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    fetchAdminUsers()
      .then((rows) => {
        if (cancelled) return
        const counts: Record<string, number> = {}
        rows.forEach((u) => {
          const slug = normalizeRole(u.role ?? null)
          if (!slug) return
          counts[slug] = (counts[slug] ?? 0) + 1
        })
        setUsageCounts(counts)
      })
      .catch(() => {
        /* صامت؛ صف المصفوفة يبقى صالحاً بدون عدّاد */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const elevated = useMemo(() => new Set(['super_admin', 'admin', 'executive_admin']), [])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return SUPER_ADMIN_ROLE_CATALOG_ROWS.filter((r) => !t || r.slug.includes(t) || r.labelAr.includes(q.trim()))
  }, [q])

  const catalogSize = SUPER_ADMIN_ROLE_CATALOG_ROWS.length
  const countedUsersTotal = Object.values(usageCounts).reduce((acc, x) => acc + x, 0)
  const elevatedAssignments = SUPER_ADMIN_ROLE_CATALOG_ROWS.reduce(
    (sum, row) => (elevated.has(row.slug) ? sum + (usageCounts[row.slug] ?? 0) : sum),
    0,
  )

  const dominantRole = useMemo(() => {
    let bestSlug = ''
    let bestCount = -1
    Object.entries(usageCounts).forEach(([slug, n]) => {
      if (n > bestCount) {
        bestCount = n
        bestSlug = slug
      }
    })
    const labelRow = SUPER_ADMIN_ROLE_CATALOG_ROWS.find((x) => x.slug === bestSlug)
    return { slug: bestSlug, count: Math.max(bestCount, 0), labelAr: labelRow?.labelAr ?? '—' }
  }, [usageCounts])

  const detailRole = detailSlug ? SUPER_ADMIN_ROLE_CATALOG_ROWS.find((r) => r.slug === detailSlug) : undefined

  const matrixRoles = SUPER_ADMIN_ROLE_CATALOG_ROWS

  return (
    <SaPageRoot className="space-y-8">
      <EnterpriseCrudHero
        eyebrow="RBAC · Zero Trust Visualization"
        title="الأدوار والصلاحيات"
        subtitle="شبكة مؤسسيّة لمطابقة أدوار الدليل مع مجالات المنصّة — العدّادات تأتي من دليل مستخدمي الإدارة الحقيقي دون تهيئة."
        variant="orange"
        actions={
          <button
            type="button"
            disabled
            className="rounded-[18px] border border-white/25 bg-white/10 px-4 py-2.5 text-[12px] font-black text-white/70 backdrop-blur-sm"
            title="يُدار عادةً من وحدة Laravel"
          >
            تعريف دور (قيد التكامل)
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <EnterpriseMetricTile
          accent="navy"
          icon={Shield}
          label="أدوار في الكتالوج"
          value={catalogSize}
          hint="أدوار قياسية مُعرّفة أمام الواجهة"
        />
        <EnterpriseMetricTile
          accent="blue"
          icon={Users}
          label="مجموع المستخدمين المُحصى"
          value={countedUsersTotal || '—'}
          hint={countedUsersTotal === 0 ? 'ربما نقطة الدليل غير مستجيبة؛ المصفوفة تظل نشطة.' : 'من جميع مستخدمي GET /admin/users'}
        />
        <EnterpriseMetricTile
          accent="orange"
          icon={Radar}
          label="إسناد أدوار مرتفعة الثقة"
          value={elevatedAssignments}
          hint="سوبر مشرف أو إدارات عليا حسب مجموعة المصنِّف المحلي"
        />
        <EnterpriseMetricTile
          accent="mint"
          icon={UserCheck}
          label="غالِب الإسنادات"
          value={dominantRole.count > 0 ? dominantRole.count : '—'}
          hint={dominantRole.count > 0 ? `${dominantRole.labelAr}` : undefined}
        />
      </div>

      <CrudToolbar sticky searchValue={q} onSearchChange={setQ} searchPlaceholder="صفِّ بحسب التسمية أو المعرّف…" />

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <SaGlassCard glow="blue" className="relative overflow-hidden p-5">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-emc-grid bg-grid-32 opacity-[0.06]" />
          <div className="relative text-right">
            <p className="text-[11px] font-black text-muted-700">طبقة مخاطرة مرئية (تكميلية)</p>
            <p className="mt-2 text-[12px] font-semibold leading-relaxed text-muted-600">
              تأطير شبكي يسرد كثافة الأدوار الحسّاسة قبل ربط تدفّق السياسة على Laravel Spatie أو ما يُعادله.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-end">
              {SUPER_ADMIN_ROLE_CATALOG_ROWS.filter((r) => elevated.has(r.slug)).map((r) => (
                <span key={r.slug} className="rounded-full bg-gradient-to-l from-accent-400/35 to-transparent px-3 py-1 text-[11px] font-black text-deepBlue ring-1 ring-accent-400/55">
                  {r.labelAr}
                </span>
              ))}
              <CrudBadge variant="brand">مزامنة يدوية الآن — قريبًا تلقائي</CrudBadge>
            </div>
          </div>
        </SaGlassCard>

        <div className="grid gap-6 lg:grid-cols-2">
          {ROLE_GROUPS.map((g) => (
            <SaGlassCard key={g.titleAr} glow="orange" className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100/70 pb-4">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-700 font-latin">{g.titleAr}</p>
                  <p className="mt-2 text-[12px] font-semibold leading-relaxed text-muted-600">بطاقات أدوار مرتكزة على دليل EMI.</p>
                </div>
                <Shield className="h-9 w-9 shrink-0 text-customBlue/35" aria-hidden />
              </div>
              <ul className="mt-4 grid gap-3">
                {SUPER_ADMIN_ROLE_CATALOG_ROWS.filter((r) => g.slugs.includes(r.slug)).map((r) => {
                  const sec = securityBadge(r.slug)
                  const usage = usageCounts[r.slug] ?? 0
                  return (
                    <li key={r.slug}>
                      <button
                        type="button"
                        onClick={() => setDetailSlug(r.slug)}
                        className="relative flex w-full flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white/88 p-4 text-right shadow-md ring-1 ring-ink-100/65 transition hover:-translate-y-0.5 hover:border-customBlue/30"
                      >
                        <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/80 to-transparent" />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-black text-deepBlue">{r.labelAr}</p>
                            <code className="mt-1 block truncate font-mono text-[11px] text-muted-600">{r.slug}</code>
                          </div>
                          <Sparkles className="h-4 w-4 shrink-0 text-accent-500" aria-hidden />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-2">
                            <CrudBadge variant={sec.variant}>{sec.label}</CrudBadge>
                            {elevated.has(r.slug) ? <CrudBadge variant="accent">ثقة موسعة</CrudBadge> : null}
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-800 ring-1 ring-slate-200">
                            مستخدمون: <span className="font-mono">{usage}</span>
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </SaGlassCard>
          ))}
        </div>
      </div>

      <SaGlassCard className="overflow-hidden p-0" glow="blue">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-100/85 bg-gradient-to-l from-brand-400/12 via-white to-accent-400/14 px-5 py-4 text-right rtl:text-right">
          <div className="min-w-0">
            <div className="flex items-center gap-2 justify-end flex-wrap-reverse">
              <Layers className="h-8 w-8 text-customBlue opacity-85" aria-hidden />
              <p className="text-[13px] font-black text-deepBlue">مصفوفة المصار التشغيليّة · Capability Matrix</p>
            </div>
            <p className="mt-2 max-w-xl text-[12px] font-semibold text-muted-600">
              تطابق عمودي لمزامنة الأعمال، المصار المالي، الموارد البشرية، وباقي محاور النمو وفق مجموعة المصنَّف الموحّدة.
            </p>
          </div>
          <EnterpriseMetricTile
            accent="navy"
            icon={Cpu}
            label="طبقة المعالجة المرئية"
            value={`${SUPER_ADMIN_ROLE_CATALOG_ROWS.length}×${CAPABILITIES.length}`}
            hint={`${SUPER_ADMIN_ROLE_CATALOG_ROWS.length} أدوار × ${CAPABILITIES.length} محاور`}
          />
        </div>

        <div className="overflow-x-auto px-3 pb-4">
          {!rows.length ?
            <EmptyPanel title="لا توجد دور مطابقة" subtitle="ارجع المرشّح لمشاهدة كامل كتالوج الأدوار." />
          :
            <table className="min-w-[760px] w-full border-collapse text-right text-[12px] rtl:text-right">
              <thead>
                <tr className="border-b border-ink-100 bg-[#22334A]/[0.04]">
                  <th className="sticky right-0 z-[2] whitespace-nowrap bg-white/94 px-4 py-3 text-[11px] font-black text-deepBlue shadow-[inset_-1px_0_0_rgba(226,232,240,1)] rtl:text-right">
                    الدور
                  </th>
                  {CAPABILITIES.map((c) => (
                    <th key={c.id} className="px-2 py-3 text-center text-[11px] font-black text-muted-600">
                      <span className="block max-w-[6.75rem] leading-snug rtl:text-center">{c.labelAr}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRoles.map((r) => {
                  if (!rows.some((x) => x.slug === r.slug)) return null
                  const sec = securityBadge(r.slug)
                  const usage = usageCounts[r.slug] ?? 0
                  return (
                    <tr key={r.slug} className="border-b border-ink-100/70 transition hover:bg-brand-500/[0.03]">
                      <td className="sticky right-0 bg-white/95 px-4 py-3 shadow-[inset_-1px_0_0_rgba(226,232,240,1)] rtl:text-right">
                        <button
                          type="button"
                          onClick={() => setDetailSlug(r.slug)}
                          className="block w-full text-right font-black text-deepBlue hover:text-customBlue rtl:text-right"
                        >
                          {r.labelAr}
                        </button>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <CrudBadge variant={sec.variant}>{sec.label}</CrudBadge>
                          <span className="text-[10px] font-bold text-muted-500">محجوز على {usage} مستخدم</span>
                        </div>
                      </td>
                      {CAPABILITIES.map((c) => {
                        const ok = roleHasCapabilitySlug(r.slug, c.id)
                        return (
                          <td key={c.id} className="px-2 py-3 text-center align-middle">
                            <span
                              className={`mx-auto grid h-9 w-9 place-items-center rounded-xl shadow-inner ring-1 ${ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-slate-50 ring-slate-200'}`}
                            >
                              {ok ?
                                <Check className="h-4 w-4 text-emerald-600" aria-label="مسموح" />
                              : <X className="h-4 w-4 text-slate-300" aria-label="لا بيان تشغيلي ظاهر" />}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          }
        </div>
      </SaGlassCard>

      <EntityDetailDrawer
        open={detailSlug !== null}
        onClose={() => setDetailSlug(null)}
        title={detailRole?.labelAr ?? ''}
        subtitle={detailRole ? `slug · ${detailRole.slug}` : undefined}
        avatar={
          detailRole ?
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-deepBlue/10 text-lg font-black text-deepBlue ring-2 ring-white">
              <Shield className="h-7 w-7 opacity-80" aria-hidden />
            </span>
          : null
        }
        badges={
          detailRole ?
            <>
              {(() => {
                const sec = securityBadge(detailRole.slug)
                return <CrudBadge variant={sec.variant}>{sec.label}</CrudBadge>
              })()}
              <CrudBadge variant="brand">مستخدِمون: {usageCounts[detailRole.slug] ?? 0}</CrudBadge>
            </>
          : null
        }
        footerSlot={
          <EntityActionMenu
            onClose={() => setDetailSlug(null)}
            extraStart={
              <Link
                to="/dashboard/super-admin/crud/users"
                className="me-auto text-[11px] font-black text-customBlue underline-offset-2 hover:underline"
              >
                إدارة المستخدمين
              </Link>
            }
          />
        }
        tabs={
          detailRole ?
            [
              {
                id: 'overview',
                labelAr: 'نظرة عامة',
                content: (
                  <EntityDetailSection title="دليل الدور" icon={<Shield className="h-4 w-4" aria-hidden />}>
                    <p className="text-[13px] font-semibold leading-relaxed text-muted-700">
                      يمكن لاحقاً ربط فئات الموارد المتعددة مباشرة مع حزمة Laravel Policies/Permission لتفاصيل أدق.
                    </p>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      <EntityDetailField label="المعرّف" value={<code className="font-mono">{detailRole.slug}</code>} />
                      <EntityDetailField label="التسمية العربية" value={detailRole.labelAr} />
                      <EntityDetailField
                        label="مستخدِمون (GET /admin/users)"
                        value={usageCounts[detailRole.slug] ?? 0}
                      />
                    </dl>
                  </EntityDetailSection>
                ),
              },
              {
                id: 'permissions',
                labelAr: 'الصلاحيات',
                content: (
                  <EntityDetailSection title="مجالات مفتوحة ضمن الشبكة المرئية" icon={<Cpu className="h-4 w-4" aria-hidden />}>
                    <ul className="mt-3 grid gap-2">
                      {CAPABILITIES.filter((c) => roleHasCapabilitySlug(detailRole.slug, c.id)).map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-200/65 bg-emerald-50/60 px-3 py-2 text-[12px] font-black text-deepBlue"
                        >
                          <span>{c.labelAr}</span>
                          <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                        </li>
                      ))}
                    </ul>
                  </EntityDetailSection>
                ),
              },
              {
                id: 'activity',
                labelAr: 'النشاط',
                content: (
                  <EntityDetailSection title="مراقبة إسناد">
                    <p className="text-[12px] font-semibold text-muted-600">
                      لا سجل تدقيق مستخدم لهذا الدور في الواجهة؛ العدّاد أعلاه يعكس دليل المستخدمين فقط.
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
