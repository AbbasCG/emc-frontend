import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, UserCircle2 } from 'lucide-react'
import { getTeam, type Department, type TeamMember } from '@/services/teamApi'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import { CrudFilterBar, MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { LoadingPanel, EmptyPanel } from '@/pages/super-admin/crud/shared/States'
import { RowActionsMenu } from '@/pages/super-admin/crud/shared/RowActions'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
import {
  SaGlassCard,
  SaPageRoot,
  SaStatChip,
  SaToolbar,
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
      const hay = `${r.member.name_ar} ${r.member.position_ar} ${r.departmentTitle}`.toLowerCase()
      return !t || hay.includes(t)
    })
  }, [rows, q, onlyLeaders])

  const [deptFilter, setDeptFilter] = useState<string>('all')

  const deptFilterOptions = useMemo(
    () => [{ value: 'all', labelAr: 'كل الإدارات' }, ...depts.map((d) => ({ value: String(d.id), labelAr: d.name_ar }))],
    [depts],
  )

  const filteredByDept = useMemo(() => {
    if (deptFilter === 'all') return filtered
    return filtered.filter((r) => String(r.departmentId) === deptFilter)
  }, [filtered, deptFilter])

  const heads = rows.filter((r) => r.member.is_leader).length
  const exec = rows.filter((r) => r.member.is_executive).length

  return (
    <SaPageRoot>
      <SaToolbar
        eyebrow="دليل القيادة"
        title="الفريق الإداري"
        subtitle="بطاقات أعضاء مع مرشّحات الإدارة والقيادة — المصدر الحالي هو API الفريق العام."
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
            <Link
              to="/dashboard/hr/team"
              className="rounded-2xl bg-gradient-to-l from-[#2691C2] to-[#22334A] px-4 py-2.5 text-[12px] font-black text-white"
            >
              عرض الموارد البشرية
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <SaStatChip label="إجمالي الأعضاء" value={rows.length} tone="blue" />
        <SaStatChip label="قادة إدارات" value={heads} tone="orange" />
        <SaStatChip label="تنفيذيون" value={exec} tone="success" />
      </div>

      <CrudFilterBar searchValue={q} onSearchChange={setQ} searchPlaceholder="بحث عن اسم أو منصب أو إدارة…">
        <MiniSelect
          label="الإدارة"
          value={deptFilter}
          onChange={setDeptFilter}
          options={deptFilterOptions}
        />
        <MiniSelect
          label="نوع العضو"
          value={onlyLeaders}
          onChange={(v) => setOnlyLeaders(v as 'all' | 'leaders' | 'exec')}
          options={[
            { value: 'all', labelAr: 'الكل' },
            { value: 'leaders', labelAr: 'قادة فقط' },
            { value: 'exec', labelAr: 'تنفيذيون' },
          ]}
        />
      </CrudFilterBar>

      {loading ?
        <LoadingPanel />
      : !filteredByDept.length ?
        <EmptyPanel
          title="لا يوجد أعضاء مطابقون"
          subtitle="إن كانت القائمة كلها فارغة فغالباً لا تزال نقطة /team تُهيّأ في الخادم."
        />
      :
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredByDept.map((r) => (
            <SaGlassCard key={r.key} className="flex flex-col p-5 text-right" glow="blue">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent-100 to-white text-sm font-black text-accent-900 ring-1 ring-accent-200/60">
                  {initialsFromName(r.member.name_ar)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-black text-deepBlue">{r.member.name_ar}</h2>
                  {r.member.name_en ?
                    <p className="text-[11px] font-bold text-muted-500">{r.member.name_en}</p>
                  : null}
                  <p className="mt-2 text-[12px] font-bold text-muted-700">{r.member.position_ar}</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-black text-brand-950 ring-1 ring-brand-400/25">
                    <UserCircle2 className="h-3.5 w-3.5" aria-hidden />
                    {r.departmentTitle}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-start gap-2">
                {r.member.is_leader ?
                  <CrudBadge variant="brand">قائد</CrudBadge>
                : null}
                {r.member.is_executive ?
                  <CrudBadge variant="accent">تنفيذي</CrudBadge>
                : null}
              </div>
              <div className="mt-auto flex justify-end border-t border-ink-100/60 pt-4">
                <RowActionsMenu
                  ariaLabel={r.member.name_ar}
                  actions={[{ key: 'v', label: 'عرض البطاقة', onClick: () => setView(r) }]}
                />
              </div>
            </SaGlassCard>
          ))}
        </div>
      }

      <CrudModal open={view !== null} onClose={() => setView(null)} title={view?.member.name_ar ?? ''} subtitle={view?.member.position_ar}>
        {view ?
          <div className="space-y-2 text-right text-[13px] font-semibold text-muted-700">
            <p>الإدارة: {view.departmentTitle}</p>
            <p className="text-[12px]">
              المزامنة مع HR الكاملة متاحة عبر{' '}
              <Link className="font-black text-customBlue" to="/dashboard/hr/team">
                لوحة HR
              </Link>
            </p>
          </div>
        : null}
      </CrudModal>
    </SaPageRoot>
  )
}
