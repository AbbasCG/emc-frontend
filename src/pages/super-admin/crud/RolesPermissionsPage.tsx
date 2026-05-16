import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Shield, Sparkles, X } from 'lucide-react'
import { SUPER_ADMIN_ROLE_CATALOG_ROWS } from '@/pages/super-admin/users/assignableRoles'
import {
  SaGlassCard,
  SaPageRoot,
  SaToolbar,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { CrudFilterBar } from '@/pages/super-admin/crud/shared/FilterBar'
import { EmptyPanel } from '@/pages/super-admin/crud/shared/States'
import { CrudDrawer } from '@/pages/super-admin/crud/shared/CrudDrawer'

const CAPABILITIES = [
  { id: 'governance', labelAr: 'الحوكمة والسوبر مشرف' },
  { id: 'learning', labelAr: 'التعلّم والمحتوى' },
  { id: 'finance', labelAr: 'المالية والعقود' },
  { id: 'people', labelAr: 'الموارد البشرية والإدارات' },
  { id: 'growth', labelAr: 'التسويق والشراكة والدعم' },
] as const

function capabilityGranted(roleSlug: string, capId: (typeof CAPABILITIES)[number]['id']): boolean {
  const r = roleSlug
  if (capId === 'governance') return ['super_admin', 'executive_admin', 'admin'].includes(r)
  if (capId === 'learning')
    return ['super_admin', 'executive_admin', 'admin', 'instructor', 'quality_manager', 'student'].includes(r)
  if (capId === 'finance') return ['super_admin', 'executive_admin', 'finance_manager'].includes(r)
  if (capId === 'people')
    return ['super_admin', 'executive_admin', 'hr_manager', 'department_manager'].includes(r)
  if (capId === 'growth')
    return ['super_admin', 'executive_admin', 'marketing_manager', 'support_agent', 'partner', 'volunteer'].includes(r)
  return false
}

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

/** الأدوار ككتالوج منصّة — نقطة RBAC المتقدمة تُنشأ عادة على الخادم. */
export default function RolesPermissionsPage() {
  const [q, setQ] = useState('')
  const [detailSlug, setDetailSlug] = useState<string | null>(null)

  const elevated = useMemo(() => new Set(['super_admin', 'admin', 'executive_admin']), [])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return SUPER_ADMIN_ROLE_CATALOG_ROWS.filter((r) => !t || r.slug.includes(t) || r.labelAr.includes(q.trim()))
  }, [q])

  const detailRole = detailSlug ? SUPER_ADMIN_ROLE_CATALOG_ROWS.find((r) => r.slug === detailSlug) : undefined

  const matrixRoles = SUPER_ADMIN_ROLE_CATALOG_ROWS

  return (
    <SaPageRoot>
      <SaToolbar
        eyebrow="حوكمة الوصول"
        title="الأدوار والصلاحيات"
        subtitle="مصفوفة القدرات المعروضة أمام السوبر مشرف — المرجع النهائي يبقى على سياسات Laravel عند ربط نقطة الإدارة."
        actions={
          <button
            type="button"
            disabled
            className="rounded-2xl border border-dashed border-customBlue/40 bg-brand-50/70 px-4 py-2.5 text-[12px] font-black text-muted-600"
            title="يُنشىء عادة عبر الخلفية"
          >
            تعريف دور (قريباً)
          </button>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {ROLE_GROUPS.map((g) => (
          <SaGlassCard key={g.titleAr} glow="blue" className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100/70 pb-4">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-700">مجموعة أدوار</p>
                <h2 className="mt-1 text-lg font-black text-deepBlue">{g.titleAr}</h2>
              </div>
              <Shield className="h-8 w-8 shrink-0 text-customBlue/35" aria-hidden />
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {SUPER_ADMIN_ROLE_CATALOG_ROWS.filter((r) => g.slugs.includes(r.slug)).map((r) => {
                const sec = securityBadge(r.slug)
                return (
                  <li key={r.slug}>
                    <button
                      type="button"
                      onClick={() => setDetailSlug(r.slug)}
                      className="flex w-full flex-col rounded-2xl border border-white/80 bg-white/85 p-4 text-right shadow-sm ring-1 ring-ink-100/60 transition hover:border-customBlue/25 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-black text-deepBlue">{r.labelAr}</p>
                          <code className="mt-1 block truncate font-mono text-[11px] text-muted-600">{r.slug}</code>
                        </div>
                        <Sparkles className="h-4 w-4 shrink-0 text-accent-500" aria-hidden />
                      </div>
                      <div className="mt-3 flex flex-wrap justify-start gap-2">
                        <CrudBadge variant={sec.variant}>{sec.label}</CrudBadge>
                        {elevated.has(r.slug) ?
                          <CrudBadge variant="accent">صلاحيات موسعة</CrudBadge>
                        : null}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </SaGlassCard>
        ))}
      </div>

      <SaGlassCard className="mt-8 overflow-hidden p-0" glow="orange">
        <div className="border-b border-ink-100/80 bg-gradient-to-l from-accent-400/12 via-white to-brand-50/40 px-5 py-4 text-right">
          <p className="text-[11px] font-black text-deepBlue">مصفوفة الصلاحيات</p>
          <p className="mt-1 text-[12px] font-semibold text-muted-600">
            نظرة تشغيلية على مجالات الوصول — لا تحل محل سياسات الخادم.
          </p>
        </div>
        <CrudFilterBar searchValue={q} onSearchChange={setQ} searchPlaceholder="تصفية صفوف المصفوفة بالدور أو التسمية…" />
        <div className="overflow-x-auto px-2 pb-4">
          {!rows.length ?
            <EmptyPanel title="لا نتائج" subtitle="اضبط مرشح البحث أو اعتمد كامل الكتالوج." />
          : (
            <table className="min-w-[720px] w-full border-collapse text-right text-[12px] rtl:text-right">
              <thead>
                <tr className="border-b border-ink-100 bg-slate-50/90">
                  <th className="sticky right-0 z-[1] bg-slate-50/95 px-4 py-3 font-black text-deepBlue shadow-[inset_-1px_0_0_rgba(226,232,240,0.9)]">
                    الدور
                  </th>
                  {CAPABILITIES.map((c) => (
                    <th key={c.id} className="px-3 py-3 text-center font-black text-muted-700">
                      <span className="block max-w-[7rem] leading-snug">{c.labelAr}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRoles.map((r) => {
                  if (!rows.some((x) => x.slug === r.slug)) return null
                  const sec = securityBadge(r.slug)
                  return (
                    <tr key={r.slug} className="border-b border-ink-100/70 hover:bg-brand-500/[0.03]">
                      <td className="sticky right-0 bg-white/95 px-4 py-3 shadow-[inset_-1px_0_0_rgba(226,232,240,0.9)] backdrop-blur-sm">
                        <button
                          type="button"
                          onClick={() => setDetailSlug(r.slug)}
                          className="block w-full text-right font-black text-deepBlue hover:text-customBlue"
                        >
                          {r.labelAr}
                        </button>
                        <div className="mt-1 flex flex-wrap gap-1 justify-start">
                          <CrudBadge variant={sec.variant}>{sec.label}</CrudBadge>
                        </div>
                      </td>
                      {CAPABILITIES.map((c) => {
                        const ok = capabilityGranted(r.slug, c.id)
                        return (
                          <td key={c.id} className="px-2 py-3 text-center align-middle">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-inner ring-1 ring-ink-100/80">
                              {ok ?
                                <Check className="h-4 w-4 text-emerald-600" aria-label="مسموح" />
                              : <X className="h-4 w-4 text-slate-300" aria-label="غير مسموح" />}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </SaGlassCard>

      <CrudDrawer
        open={detailSlug !== null}
        onClose={() => setDetailSlug(null)}
        title={detailRole?.labelAr ?? ''}
        subtitle={detailRole ? `المعرّف ${detailRole.slug}` : undefined}
        footerSlot={
          <Link
            to="/dashboard/super-admin/crud/users"
            className="inline-flex w-full justify-center rounded-2xl bg-customBlue px-4 py-2.5 text-[12px] font-black text-white"
          >
            رحلة المستخدم والأدوار
          </Link>
        }
      >
        {detailRole ?
          <div className="space-y-4 text-right">
            <p className="text-[13px] font-semibold leading-relaxed text-muted-700">
              يُخطّط لفصل الموارد المتعددة لهذا الدور ضمن وحدة Laravel Policy/Permission عند طرح نقطة الإدارة الكاملة.
            </p>
            <div className="rounded-2xl border border-ink-100 bg-slate-50/80 p-4">
              <p className="text-[11px] font-black text-muted-600">مجالات مفعّلة في هذه الواجهة</p>
              <ul className="mt-3 grid gap-2">
                {CAPABILITIES.filter((c) => capabilityGranted(detailRole.slug, c.id)).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-[12px] font-bold text-deepBlue">
                    <span>{c.labelAr}</span>
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        : null}
      </CrudDrawer>
    </SaPageRoot>
  )
}
