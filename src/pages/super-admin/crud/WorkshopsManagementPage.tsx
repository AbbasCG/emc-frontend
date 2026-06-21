import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNow } from '@/hooks/useNow'
import { Link } from 'react-router-dom'
import { CalendarDays, RefreshCw } from 'lucide-react'
import type { CatalogWorkshopRow } from '@/api/superAdminCatalogApi'
import { fetchWorkshopRequestsStrict } from '@/api/workshopRequestsApi'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import {
  EntityDetailDrawer,
  EntityDetailField,
  EntityDetailSection,
} from '@/pages/super-admin/crud/shared/EntityDetailDrawer'
import { EntityActionMenu } from '@/pages/super-admin/crud/shared/EntityActionMenu'
import { CrudToolbar } from '@/pages/super-admin/crud/shared/CrudToolbar'
import {
  EMC_CHART_PALETTE,
  EnterpriseColumnChart,
} from '@/pages/super-admin/crud/shared/enterprise/charts'
import {
  SaGlassCard,
  SaPageRoot,
  SaStatChip,
  SaToolbar,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

type Mode = 'all' | 'online' | 'offline'
type Tab = 'upcoming' | 'past'

function workshopTs(w: CatalogWorkshopRow): number | null {
  if (!w.date) return null
  const t = Date.parse(String(w.date))
  return Number.isFinite(t) ? t : null
}

export default function WorkshopsManagementPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<CatalogWorkshopRow[]>([])
  const [failed, setFailed] = useState(false)
  const [fetchStatus, setFetchStatus] = useState<number | undefined>(undefined)
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<Mode>('all')
  const [tab, setTab] = useState<Tab>('upcoming')
  const [view, setView] = useState<CatalogWorkshopRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    setFetchStatus(undefined)
    const pack = await fetchWorkshopRequestsStrict()
    if (!pack.ok) {
      setFailed(true)
      setFetchStatus(pack.status)
      setRows([])
    } else {
      setRows(pack.rows)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const nowMs = useNow()

  const filteredBase = useMemo(() => {
    const t = q.trim().toLowerCase()
    const base = [...rows]
    base.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    return base.filter((w) => {
      if (mode === 'online' && !w.is_online) return false
      if (mode === 'offline' && w.is_online) return false
      const hay =
        `${w.title} ${w.slug} ${w.trainer_name ?? ''} ${w.requester_email ?? ''} ${w.requester_name ?? ''}`.toLowerCase()
      return !t || hay.includes(t)
    })
  }, [rows, q, mode])

  const filtered = useMemo(() => {
    return filteredBase.filter((w) => {
      const ts = workshopTs(w)
      if (tab === 'upcoming') return ts == null || ts >= nowMs
      return ts != null && ts < nowMs
    })
  }, [filteredBase, tab, nowMs])

  const upcomingCount = useMemo(() => {
    return rows.filter((w) => {
      const ts = workshopTs(w)
      return ts == null || ts >= nowMs
    }).length
  }, [rows, nowMs])
  const pastCount = rows.length - upcomingCount

  const monthlySeries = useMemo(() => {
    const m = new Map<string, number>()
    for (const w of filtered) {
      const d = w.date ? String(w.date) : ''
      const key = d.length >= 7 && d.includes('-') ? d.slice(0, 7) : 'بدون شهر ظاهر في المرجع'
      m.set(key, (m.get(key) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([label, عدد]) => ({ label, عدد }))
  }, [filtered])

  return (
    <SaPageRoot>
      <SaToolbar
        eyebrow="جدولة التجارب التعليمية"
        title="الورش التدريبية"
        subtitle="طلبات الورش المرسلة من «تقديم ورشة» — GET /api/workshop-requests (Sanctum + دور إداري) دون احتياط وهمي عند الخطأ."
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
            <Link to="/submit-workshop" className="rounded-2xl bg-[#EC943C] px-4 py-2.5 text-[12px] font-black text-white shadow-md">
              قبول ورش من الزوار
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <SaStatChip label="كل الورش" value={rows.length} tone="blue" />
        <SaStatChip label="قادمة / بدون تاريخ" value={upcomingCount} tone="success" />
        <SaStatChip label="منتهية" value={pastCount} tone="orange" />
        <SaStatChip label="عبر الإنترنت" value={rows.filter((w) => w.is_online).length} tone="ink" />
        <SaStatChip label="بمدرب معيّن" value={rows.filter((w) => !!w.trainer_name?.trim()).length} tone="blue" />
      </div>

      <CrudToolbar
        sticky
        className="mt-6"
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="بحث بالاسم أو المعرِّف أو المدرب المعروض…"
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <span className="text-[10px] font-black uppercase tracking-wide text-muted-500">الوضع الزمني</span>
            <div className="flex rounded-2xl border border-ink-100 bg-slate-50/90 p-1">
              <button
                type="button"
                onClick={() => setTab('upcoming')}
                className={`rounded-xl px-4 py-2 text-[12px] font-black transition ${
                  tab === 'upcoming' ? 'bg-white text-deepBlue shadow-sm ring-1 ring-ink-100' : 'text-muted-600'
                }`}
              >
                قادمة
              </button>
              <button
                type="button"
                onClick={() => setTab('past')}
                className={`rounded-xl px-4 py-2 text-[12px] font-black transition ${
                  tab === 'past' ? 'bg-white text-deepBlue shadow-sm ring-1 ring-ink-100' : 'text-muted-600'
                }`}
              >
                مكتملة
              </button>
            </div>
          </div>
        }
      >
        <MiniSelect
          label="البيئة التدريبية"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: 'all', labelAr: 'جميع الوضعيات' },
            { value: 'online', labelAr: 'متزامنة رقمياً' },
            { value: 'offline', labelAr: 'ميدانية حضورياً' },
          ]}
        />
      </CrudToolbar>

      {!failed && !loading && monthlySeries.length > 0 ?
        <SaGlassCard className="mt-6 p-6 text-right rtl:text-right" glow="orange">
          <p className="text-[11px] font-black text-deepBlue">كميات شهرية حيث جدولة GET تُظهر yyyy-MM؛ يخضع لمجموعة المرشَّح المرئية فقط الآن على الشاشة.</p>
          <div className="mt-4 rounded-[22px] border border-ink-100/70 bg-white/70 px-2 py-1 shadow-inner">
            <EnterpriseColumnChart data={monthlySeries} height={212} bars={[{ key: 'عدد', color: EMC_CHART_PALETTE[0], label: 'عدد ظاهرة' }]} />
          </div>
        </SaGlassCard>
      : null}

      {failed ?
        <ErrorPanel
          title="تعذّر جلب GET /workshop-requests"
          hint={
            fetchStatus === 403 ?
              'قد لا يملك حسابك دور إداري مطلوباً على هذا المسار، أو انتهت الجلسة. تحقق من التسجيل وصلاحيات «role:admin».'
            : 'تتحقَّق الأمور من عنوان الـAPI (يجب أن يشتمل الأساس على ‎/api‎) وحامل ‎Bearer‎ والسياسات المتصلة بحسابك.'
          }
        />
      : loading ?
        <LoadingPanel />
      : rows.length === 0 ?
        <EmptyPanel
          title="لا توجد ورش محفوظة حاليًا"
          subtitle="لا تظهر هنا أي طلبات بعد. عند تقديم ورشة من «تقديم ورشة» ستُعرض في هذه القائمة بعد نجاح الاستلام."
        />
      : !filtered.length ?
        <EmptyPanel title="لا ورش في هذا الشق الزمني." subtitle="جرّب تبويبًا آخر أو امسح المرشحات." />
      :
        <div className="relative mt-6 space-y-5 before:absolute before:inset-y-0 before:right-4 before:w-px before:bg-gradient-to-b before:from-customBlue/20 before:via-accent-400/30 before:to-transparent sm:before:right-6">
          {filtered.map((w) => (
              <SaGlassCard key={w.id} className="relative me-10 p-5 sm:me-14" glow="orange">
                <span className="absolute -right-1 top-6 grid h-10 w-10 place-items-center rounded-2xl border-2 border-white bg-gradient-to-br from-[#2691C2] to-[#22334A] text-xs font-black text-white shadow-lg sm:right-1">
                  {w.date ?
                    String(w.date).slice(8, 10)
                  : '—'}
                </span>
                <div className="flex flex-wrap items-start justify-between gap-4 text-right">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-400/25 text-xs font-black text-accent-950 ring-1 ring-accent-400/35">
                      {initialsFromName(w.title)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-black text-deepBlue">{w.title}</h2>
                      <code className="mt-1 block truncate text-[11px] text-muted-600">{w.slug}</code>
                    </div>
                  </div>
                  <RowActionsMenu ariaLabel={w.title} actions={[{ key: 'v', label: 'لمحة', onClick: () => setView(w) }]} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] font-bold text-muted-700">
                  {w.date ?
                    <CrudBadge variant="accent">{String(w.date).slice(0, 10)}</CrudBadge>
                  : (
                    <CrudBadge variant="default">بدون وقت معلن</CrudBadge>
                  )}
                  {w.is_online ?
                    <CrudBadge variant="success">عن بعد</CrudBadge>
                  : (
                    <CrudBadge variant="default">حضوري</CrudBadge>
                  )}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                    مدرب: {w.trainer_name ?? 'لم يحدد'}
                  </span>
                </div>
                {typeof w.duration_hours === 'number' ?
                  <p className="mt-4 text-[12px] font-bold text-muted-700">
                    وقت جدولة مرصود في GET:{' '}
                    <span className="font-black text-deepBlue">{w.duration_hours}</span> ساعة
                  </p>
                :
                  <p className="mt-4 text-[11px] font-semibold text-muted-500">
                    نقطة الانطلاق لم ترفع عدد ساعات في هذه العيّنة — لا نُحمِّل أي سعة ظرفية مخترعة أمامكم.
                  </p>
                }
              </SaGlassCard>
            ))}
        </div>
      }

      <EntityDetailDrawer
        open={view !== null}
        onClose={() => setView(null)}
        title={view?.title ?? ''}
        subtitle={view?.slug ?? ''}
        avatar={
          view ?
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-400/25 text-sm font-black text-accent-950 ring-2 ring-white shadow-md">
              {initialsFromName(view.title)}
            </span>
          : null
        }
        badges={
          view ?
            <>
              {view.date ?
                <CrudBadge variant="accent">{String(view.date).slice(0, 10)}</CrudBadge>
              : (
                <CrudBadge variant="default">بدون تاريخ</CrudBadge>
              )}
              <CrudBadge variant={view.is_online ? 'success' : 'default'}>
                {view.is_online ? 'عن بُعد' : 'حضوري'}
              </CrudBadge>
            </>
          : null
        }
        footerSlot={<EntityActionMenu onClose={() => setView(null)} />}
        tabs={
          view ?
            [
              {
                id: 'overview',
                labelAr: 'نظرة عامة',
                content: (
                  <div className="space-y-4">
                    <EntityDetailSection title="تعريف الطلب" icon={<CalendarDays className="h-4 w-4" aria-hidden />}>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <EntityDetailField label="المعرّف" value={<span className="font-mono">#{view.id}</span>} />
                        <EntityDetailField label="المختصر" value={<code className="font-mono">{view.slug}</code>} />
                        <EntityDetailField label="تاريخ الجلسة" value={view.date ?? '—'} />
                        <EntityDetailField
                          label="السعة الزمنية"
                          value={typeof view.duration_hours === 'number' ? `${view.duration_hours} ساعة` : 'غير مرصود'}
                        />
                      </dl>
                    </EntityDetailSection>
                  </div>
                ),
              },
              {
                id: 'people',
                labelAr: 'الفريق والتسجيل',
                content: (
                  <EntityDetailSection title="جهات الاتصال" icon={<RefreshCw className="h-4 w-4" aria-hidden />}>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <EntityDetailField label="المدرّب / المتحدث" value={view.trainer_name ?? '—'} />
                      <EntityDetailField label="مقدّم الطلب" value={view.requester_name ?? '—'} />
                      <EntityDetailField label="بريد مقدّم الطلب" value={view.requester_email ?? '—'} />
                    </dl>
                  </EntityDetailSection>
                ),
              },
              {
                id: 'activity',
                labelAr: 'النشاط',
                content: (
                  <EntityDetailSection title="مراجعة تشغيلية">
                    <p className="text-[12px] font-semibold text-muted-600">
                      سجل التعديلات والمستخدم المعدِّل غير متوفر من GET /workshop-requests في هذا العرض؛ يُحتفظ بالحقول
                      الظاهرة فقط.
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
