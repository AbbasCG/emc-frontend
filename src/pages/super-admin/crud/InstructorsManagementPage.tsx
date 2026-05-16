import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Radio } from 'lucide-react'
import { toast } from 'sonner'
import { fetchInstructors, type InstructorPublic } from '@/api/instructorsApi'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { CrudFilterBar, MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
import { Link } from 'react-router-dom'
import {
  SaGlassCard,
  SaPageRoot,
  SaStatChip,
  SaToolbar,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'

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

  const workshops = rows.reduce((a, i) => a + (i.workshops_count ?? 0), 0)

  return (
    <SaPageRoot>
      <SaToolbar
        eyebrow="شبكة الخبراء"
        title="المدربون"
        subtitle="بطاقات بروفايل مع وسوم التخصّص وحالة النشاط التقريبية من أعداد الدورات والورش في الـ API العام."
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-3 py-2 text-[11px] font-black text-deepBlue"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <Link to="/dashboard/hr/instructors" className="rounded-2xl bg-[#22334A] px-4 py-2.5 text-[12px] font-black text-white">
              HR للمدربين
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <SaStatChip label="المدربون" value={rows.length} tone="blue" />
        <SaStatChip label="ورش مرتبطة بالبيانات" value={workshops} tone="orange" />
        <SaStatChip label="واجهة عامة" value="/instructors" tone="ink" />
      </div>

      <CrudFilterBar searchValue={q} onSearchChange={setQ} searchPlaceholder="بحث بالاسم أو السِّلَق أو المسمى الوظيفي…">
        <MiniSelect
          label="الفرز"
          value={sortKey}
          onChange={(v) => setSortKey(v as 'courses' | 'slug')}
          options={[
            { value: 'courses', labelAr: 'الأكثر دوراتًا' },
            { value: 'slug', labelAr: 'السِلِق أبجديًا' },
          ]}
        />
      </CrudFilterBar>

      {loading ?
        <LoadingPanel />
      : !filtered.length ?
        <EmptyPanel title="لم يتم العثور على مدربين" subtitle="تأكد من أن نقطة GET /instructors متاحة." />
      :
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ins) => {
            const busy = (ins.courses_count ?? 0) > 0 || (ins.workshops_count ?? 0) > 0
            return (
              <SaGlassCard key={ins.id} className="flex flex-col p-5 text-right" glow="blue">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-black text-deepBlue ring-1 ring-slate-200">
                      {initialsFromName(ins.name)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-black text-deepBlue">{ins.name}</h2>
                      <code className="mt-0.5 block truncate text-[11px] text-muted-600">{ins.slug}</code>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${
                      busy ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
                    }`}
                  >
                    <Radio className={`h-3 w-3 ${busy ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden />
                    {busy ? 'نشيط في الكتالوج' : 'خفيف النشاط'}
                  </span>
                </div>
                {ins.title ?
                  <p className="mt-3 text-[12px] font-bold text-muted-700">{ins.title}</p>
                : null}
                <div className="mt-4 flex flex-wrap justify-start gap-2">
                  {ins.expertise ?
                    <CrudBadge variant="brand">{ins.expertise}</CrudBadge>
                  : (
                    <CrudBadge variant="default">تخصّص غير معلن</CrudBadge>
                  )}
                  {ins.image_url ?
                    <CrudBadge variant="accent">بروفايل بصورة</CrudBadge>
                  : (
                    <CrudBadge variant="default">رمز احتياطي</CrudBadge>
                  )}
                </div>
                <div className="mt-4 rounded-xl border border-ink-100/80 bg-slate-50/80 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase text-muted-500">عزم تدريسي</p>
                  <p className="mt-1 text-[13px] font-black text-deepBlue">
                    {ins.courses_count ?? 0} دورة · {ins.workshops_count ?? 0} ورشة
                  </p>
                </div>
                {ins.courses && ins.courses.length > 0 ?
                  <div className="mt-3 flex flex-wrap gap-1.5 justify-start">
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
                <div className="mt-auto flex justify-end border-t border-ink-100/60 pt-4">
                  <RowActionsMenu
                    ariaLabel={ins.name}
                    actions={[
                      { key: 'v', label: 'لمحة', onClick: () => setView(ins) },
                      { key: 'p', label: 'الموقع العام', onClick: () => window.open(`/instructors/${ins.slug}`, '_blank') },
                    ]}
                  />
                </div>
              </SaGlassCard>
            )
          })}
        </div>
      }

      <CrudModal open={view !== null} onClose={() => setView(null)} title={view?.name ?? ''} subtitle={view?.title ?? ''}>
        {view ?
          <div className="space-y-2 text-right text-[13px] font-semibold text-muted-700">
            {view.bio ? <p>{view.bio}</p> : <p className="text-muted-500">لم يصل نص السيرة الذاتية لهذا الموعد.</p>}
            {view.expertise ? <CrudBadge variant="brand">{view.expertise}</CrudBadge> : null}
          </div>
        : null}
      </CrudModal>
    </SaPageRoot>
  )
}
