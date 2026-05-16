import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, RefreshCw } from 'lucide-react'
import type { CatalogWorkshopRow } from '@/api/superAdminCatalogApi'
import { fetchWorkshopsStrict } from '@/api/superAdminCatalogApi'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { CrudFilterBar, MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
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
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<Mode>('all')
  const [tab, setTab] = useState<Tab>('upcoming')
  const [view, setView] = useState<CatalogWorkshopRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    const pack = await fetchWorkshopsStrict()
    if (!pack.ok) {
      setFailed(true)
      setRows([])
    } else setRows(pack.rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredBase = useMemo(() => {
    const t = q.trim().toLowerCase()
    const base = [...rows]
    base.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    return base.filter((w) => {
      if (mode === 'online' && !w.is_online) return false
      if (mode === 'offline' && w.is_online) return false
      const hay = `${w.title} ${w.slug} ${w.trainer_name ?? ''}`.toLowerCase()
      return !t || hay.includes(t)
    })
  }, [rows, q, mode])

  const filtered = useMemo(() => {
    const tsNow = Date.now()
    return filteredBase.filter((w) => {
      const ts = workshopTs(w)
      if (tab === 'upcoming') return ts == null || ts >= tsNow
      return ts != null && ts < tsNow
    })
  }, [filteredBase, tab])

  const upcomingCount = useMemo(() => {
    const tsNow = Date.now()
    return rows.filter((w) => {
      const ts = workshopTs(w)
      return ts == null || ts >= tsNow
    }).length
  }, [rows])
  const pastCount = rows.length - upcomingCount

  return (
    <SaPageRoot>
      <SaToolbar
        eyebrow="جدولة التجارب التعليمية"
        title="الورش التدريبية"
        subtitle="عروض تقويمية مختلطة مع قوائم زمنية — البيانات من GET /workshops دون احتياط وهمي عند الخطأ."
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

      <SaGlassCard className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4" glow="blue">
        <div className="flex items-center gap-3 text-right">
          <CalendarDays className="h-9 w-9 text-customBlue" aria-hidden />
          <div>
            <p className="text-[11px] font-black text-deepBlue">الوضع الزمني</p>
            <p className="text-[12px] font-semibold text-muted-600">بدّل بين الجلسات القادمة والمنجزة.</p>
          </div>
        </div>
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
      </SaGlassCard>

      <CrudFilterBar searchValue={q} onSearchChange={setQ} searchPlaceholder="بحث بالاسم أو المعرِّف أو المدرب المعروض…">
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
      </CrudFilterBar>

      {failed ?
        <ErrorPanel title="تعذّر جلب GET /workshops" hint="تتحقَّق الأمور من عنوان الـAPI والسياسات المتصلة بحسابك." />
      : loading ?
        <LoadingPanel />
      : !filtered.length ?
        <EmptyPanel title="لا ورش في هذا الشق الزمني." subtitle="جرّب تبويبًا آخر أو امسح المرشحات." />
      :
        <div className="relative mt-6 space-y-5 before:absolute before:inset-y-0 before:right-4 before:w-px before:bg-gradient-to-b before:from-customBlue/20 before:via-accent-400/30 before:to-transparent sm:before:right-6">
          {filtered.map((w) => {
            const cap = typeof w.duration_hours === 'number' ? Math.min(48, Math.max(8, w.duration_hours * 4)) : 18
            return (
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
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-[10px] font-black uppercase text-muted-500">
                    <span>سعة تقريبية (وقت التجهيز)</span>
                    <span>{cap}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-ink-100/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-customBlue to-accent-400"
                      style={{ width: `${cap}%` }}
                    />
                  </div>
                  {typeof w.duration_hours === 'number' ?
                    <p className="mt-2 text-[11px] font-bold text-muted-500">{w.duration_hours} ساعة تقريبًا في الجدولة</p>
                  : null}
                </div>
              </SaGlassCard>
            )
          })}
        </div>
      }

      <CrudModal open={view !== null} onClose={() => setView(null)} title={view?.title ?? ''} subtitle={view?.slug ?? ''}>
        {view ?
          <div className="space-y-2 text-right text-[13px] font-semibold text-muted-700">
            <p>المدرب الذي يعود به الـJSON: {view.trainer_name ?? '—'}</p>
            <p>جدول الانطلاق: {view.date ?? 'لم يحدد بعد'}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {view.duration_hours ?
                <CrudBadge variant="brand">{view.duration_hours} ساعات</CrudBadge>
              : null}
              <CrudBadge variant={view.is_online ? 'success' : 'default'}>
                {view.is_online ? 'تشغيل رقمي' : 'نشاط ميداني'}
              </CrudBadge>
            </div>
          </div>
        : null}
      </CrudModal>
    </SaPageRoot>
  )
}
