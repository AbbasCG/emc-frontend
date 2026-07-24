import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, PhoneForwarded, RefreshCw } from 'lucide-react'
import { fetchPartnersForSuperAdmin } from '@/api/partnersApi'
import type { PartnerRecord } from '@/types/operations'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { EnterpriseBarChartRtl } from '@/pages/super-admin/crud/shared/enterprise/charts'
import {
  SaGlassCard,
  SaPageRoot,
  SaStatChip,
  SaToolbar,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import {
  EntityDetailDrawer,
  EntityDetailField,
  EntityDetailSection,
} from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { EntityActionMenu } from '@/pages/super-admin/crud/shared/EntityActionMenu'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'

/** Load-failure copy for the partners endpoint — shared by the mount effect and the
 *  imperative `load` so the two can never drift apart. */
function partnersLoadErrorMessage(status: number | undefined): string {
  return status === 403
    ? 'لا تملك صلاحيات كافية لقراءة /operations/partners — تحقَّق من ربط المستخدم بتجربة الموظف المناسب.'
    : 'لم يمكن إكمال الاتصال بـ /operations/partners حاليًا؛ راجع حالة الشبكة والخلفية.'
}

export default function PartnersManagementPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<PartnerRecord[]>([])
  const [status, setStatus] = useState<'all' | 'named' | 'typed'>('all')
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<PartnerRecord | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  /** Manual retry/refresh from a button — outside any effect, so flipping to the
   *  loading state synchronously is both allowed and required here. */
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const pack = await fetchPartnersForSuperAdmin()
    if (!pack.ok) {
      setRows([])
      setLoadError(partnersLoadErrorMessage(pack.status))
    } else setRows(pack.rows)
    setLoading(false)
  }, [])

  // Initial load — inlined so no state is set on the effect's synchronous path
  // (`loading` already starts as `true` and `loadError` as `null`).
  useEffect(() => {
    let alive = true
    void (async () => {
      const pack = await fetchPartnersForSuperAdmin()
      if (!alive) return
      if (!pack.ok) {
        setRows([])
        setLoadError(partnersLoadErrorMessage(pack.status))
      } else setRows(pack.rows)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter((p) => {
      if (status === 'named' && !(p.name?.trim()?.length ?? 0)) return false
      if (status === 'typed' && !(p.institution_type?.trim()?.length ?? 0)) return false
      const hay = `${p.name} ${p.institution_type ?? ''} ${p.status ?? ''}`.toLowerCase()
      return !t || hay.includes(t)
    })
  }, [rows, q, status])

  const typed = rows.filter((p) => (p.institution_type?.trim()?.length ?? 0) > 0).length
  const activeish = rows.filter((p) => {
    const st = `${p.status ?? ''}`.toLowerCase()
    return st.includes('نش') || st.includes('active')
  }).length

  const institutionMix = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of rows) {
      const k = `${p.institution_type ?? ''}`.trim().length ? `${p.institution_type}`.trim() : 'بدون نوع مؤسسي ظاهرة'
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([title, qty]) => ({ nameAr: title.length > 28 ? `${title.slice(0, 26)}…` : title, عدد: qty }))
  }, [rows])

  return (
    <SaPageRoot>
      <SaToolbar
        eyebrow="علاقات المؤسسات"
        title="الشراكات"
        subtitle="شبكة بطاقات شركاء مع لوحة جانبية للاتصال والإجراءات السريعة — المصدر GET /operations/partners."
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
            <Link to="/dashboard/admin/partners" className="rounded-2xl bg-[#0077B6] px-4 py-2.5 text-[12px] font-black text-white shadow-md">
              إدارة كاملة (Ops)
            </Link>
            <Link
              to="/dashboard/admin/partnership-requests"
              className="rounded-2xl border border-accent-300 bg-accent-400/15 px-4 py-2.5 text-[12px] font-black text-accent-950"
            >
              طلبات خارجية
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <SaStatChip label="شركاء مسجّلون" value={rows.length} tone="blue" />
        <SaStatChip label="بنوع مؤسسي" value={typed} tone="success" />
        <SaStatChip label="حالات نشطة (تقديرية)" value={activeish} tone="orange" />
      </div>

      <CrudToolbar
        className="mt-6"
        sticky
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="بحث بالجهة أو النمط أو الحالة…"
      >
        <MiniSelect
          label="جودة البيانات"
          value={status}
          onChange={(v) => setStatus(v as 'all' | 'named' | 'typed')}
          options={[
            { value: 'all', labelAr: 'جميع المحتويات' },
            { value: 'named', labelAr: 'بتسمية مؤكدة' },
            { value: 'typed', labelAr: 'بتصنيف مؤسسي' },
          ]}
        />
      </CrudToolbar>

      {!loading && !loadError && institutionMix.length > 0 ?
        <SaGlassCard className="mt-8 p-7 text-right rtl:text-right ring-4 ring-accent-400/10" glow="orange">
          <p className="text-[11px] font-black text-deepBlue">
            توزيع الشركاء حسب institution_type ضمن مجموعة المرجع الحالية (مصدر القائمة: GET /operations/partners).
          </p>
          <div className="mt-4 rounded-[22px] border border-ink-100/70 bg-white/70 p-2 shadow-inner backdrop-blur">
            <EnterpriseBarChartRtl data={institutionMix} dataKey="عدد" nameKey="nameAr" height={236} />
          </div>
        </SaGlassCard>
      : null}

      {loadError ?
        <ErrorPanel title="خطأ قراءة البيانات من الخادم" hint={loadError} />
      : loading ?
        <LoadingPanel />
      : !filtered.length ?
        <EmptyPanel title="لا شركاء يطابق المرشّح الآن." subtitle="يمكنك العودة للوحة التشغيل أو تهيئة بيانات جديدة بعد التأشير من الفريق الأساسي." />
      :
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const rel =
              p.status?.includes('نش') || `${p.status ?? ''}`.toLowerCase().includes('active') ?
                'نشطة'
              : 'تحت التقييم'
            return (
              <SaGlassCard key={p.id} className="flex flex-col p-5 text-right" glow="orange">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-500/15 text-sm font-black text-deepBlue ring-1 ring-brand-500/35">
                    {initialsFromName(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-black text-deepBlue">{p.name}</h2>
                    <p className="mt-1 text-[11px] font-bold text-muted-500">#{p.id}</p>
                    <div className="mt-3 flex flex-wrap gap-2 justify-start">
                      {p.institution_type ?
                        <CrudBadge variant="brand">{p.institution_type}</CrudBadge>
                      : (
                        <CrudBadge variant="default">نوع غير معلن</CrudBadge>
                      )}
                      <CrudBadge variant={rel === 'نشطة' ? 'success' : 'accent'}>{rel}</CrudBadge>
                    </div>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-ink-100/80 bg-slate-50/80 px-3 py-3">
                  <p className="text-[10px] font-black uppercase text-muted-500">آخر نشاط مسجّل</p>
                  <p className="mt-1 text-[13px] font-black text-deepBlue">{(p.updated_at ?? '—').toString().slice(0, 10)}</p>
                </div>
                <div className="mt-auto flex flex-wrap justify-between gap-2 border-t border-ink-100/60 pt-4">
                  <button
                    type="button"
                    onClick={() => setDetail(p)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-customBlue/25 bg-brand-500/10 px-3 py-2 text-[11px] font-black text-customBlue transition hover:bg-brand-500/15"
                  >
                    <PhoneForwarded className="h-4 w-4" aria-hidden />
                    لوحة الاتصال
                  </button>
                  <RowActionsMenu
                    ariaLabel={p.name}
                    actions={[
                      { key: 'v', label: 'تفاصيل', onClick: () => setDetail(p) },
                      { key: 'ops', label: 'لوحة الموظّف', onClick: () => navigate('/dashboard/admin/partners') },
                    ]}
                  />
                </div>
              </SaGlassCard>
            )
          })}
        </div>
      }

      <EntityDetailDrawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ''}
        subtitle={detail ? `مرجع شراكة · #${detail.id}` : undefined}
        avatar={
          detail ?
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/15 text-lg font-black text-deepBlue ring-2 ring-white shadow-md">
              {initialsFromName(detail.name)}
            </span>
          : null
        }
        badges={
          detail ?
            <>
              {detail.institution_type ?
                <CrudBadge variant="brand">{detail.institution_type}</CrudBadge>
              : (
                <CrudBadge variant="default">نوع غير معلن</CrudBadge>
              )}
              {detail.status ? <CrudBadge variant="accent">{detail.status}</CrudBadge> : null}
            </>
          : null
        }
        footerSlot={
          detail ?
            <EntityActionMenu
              onClose={() => setDetail(null)}
              onEdit={() => navigate('/dashboard/admin/partners')}
              editLabel="لوحة الموظّف الكاملة"
              extraStart={
                <Link
                  to="/dashboard/admin/partnership-requests"
                  className="me-auto text-[11px] font-black text-customBlue underline-offset-2 hover:underline"
                >
                  طلبات الشراكة
                </Link>
              }
            />
          : null
        }
        tabs={
          detail ?
            [
              {
                id: 'overview',
                labelAr: 'نظرة عامة',
                content: (
                  <div className="space-y-4">
                    <EntityDetailSection title="ملف الجهة" icon={<Mail className="h-4 w-4" aria-hidden />}>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <EntityDetailField label="المعرّف" value={<span className="font-mono">#{detail.id}</span>} />
                        <EntityDetailField label="التسمية" value={detail.name} />
                        <EntityDetailField label="نوع مؤسسي" value={detail.institution_type ?? '—'} />
                        <EntityDetailField label="حالة" value={detail.status ?? '—'} />
                      </dl>
                    </EntityDetailSection>
                    <EntityDetailSection title="ملخص تشغيلي">
                      <p className="text-[13px] font-semibold text-muted-700">
                        يمكن لمزامنة أعمق إظهار جهات اتصال وتقارير أداء عند توفر حقول إضافية من الخلفية.
                      </p>
                    </EntityDetailSection>
                  </div>
                ),
              },
              {
                id: 'activity',
                labelAr: 'النشاط',
                content: (
                  <EntityDetailSection title="تحديثات">
                    <EntityDetailField
                      label="آخر تحديث مرصود"
                      value={detail.updated_at ?? 'لم يُرفع طابع زمني'}
                    />
                  </EntityDetailSection>
                ),
              },
              {
                id: 'links',
                labelAr: 'الارتباطات',
                content: (
                  <EntityDetailSection title="مسارات قيادة">
                    <p className="text-[12px] font-semibold text-muted-700">
                      للطلبات الواردة استخدم مسار طلبات الشراكة من روابط الصفحة أو من لوحة التشغيل الكاملة.
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
