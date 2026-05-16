import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, ChevronLeft, RefreshCw, Users } from 'lucide-react'
import { fetchWorkspaceDepartmentsForSuperAdmin } from '@/api/superAdminOpsApi'
import type { WorkspaceDepartment } from '@/types/operations'
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

function healthBadge(h: WorkspaceDepartment['status']) {
  if (h === 'healthy') return <CrudBadge variant="success">سليم</CrudBadge>
  if (h === 'risk') return <CrudBadge variant="danger">خطر</CrudBadge>
  return <CrudBadge variant="accent">انتباه</CrudBadge>
}

export default function DepartmentsManagementPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<WorkspaceDepartment[]>([])
  const [apiOk, setApiOk] = useState(true)

  const [q, setQ] = useState('')
  const [health, setHealth] = useState<'all' | WorkspaceDepartment['status']>('all')
  const [view, setView] = useState<WorkspaceDepartment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchWorkspaceDepartmentsForSuperAdmin()
      setRows(list)
      setApiOk(list.length > 0)
    } catch {
      setRows([])
      setApiOk(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (health !== 'all' && r.status !== health) return false
      const hay = `${r.title} ${r.leader_name ?? ''}`.toLowerCase()
      return !t || hay.includes(t)
    })
  }, [rows, q, health])

  const hierarchyPreview = useMemo(() => filtered.slice(0, 8), [filtered])

  return (
    <SaPageRoot>
      <SaToolbar
        eyebrow="الهيكل المؤسسي"
        title="الإدارات"
        subtitle="بطاقات إدارات مساحة العمل مع مؤشرات القيادة والمهام — البيانات من GET /operations/departments."
        actions={
          <>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue shadow-sm transition hover:bg-brand-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <Link
              to="/dashboard/admin/departments"
              className="rounded-2xl bg-gradient-to-l from-[#22334A] to-[#0F172A] px-4 py-2.5 text-[12px] font-black text-white shadow-lg"
            >
              مساحة التشغيل
            </Link>
          </>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SaStatChip label="إدارات مرتبطة" value={rows.length} tone="blue" />
        <SaStatChip label="مهام مفتوحة" value={rows.reduce((acc, r) => acc + r.open_tasks, 0)} tone="orange" />
        <SaStatChip label="بحاجة تركيز" value={rows.filter((r) => r.status !== 'healthy').length} tone="ink" />
        <SaStatChip
          label="لقاءات أسبوعية"
          value={rows.reduce((a, r) => a + (r.meetings_week ?? 0), 0)}
          tone="success"
        />
      </div>

      <SaGlassCard className="mt-8 overflow-hidden p-5" glow="blue">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-100/70 pb-4">
          <div className="text-right">
            <p className="text-[11px] font-black text-deepBlue">مخطط تنظيمي سريع</p>
            <p className="mt-1 text-[12px] font-semibold text-muted-600">
              يظهر أعلى الدفعة الحالية وفق المرشحات — ليس شجرة كاملة من الـ API.
            </p>
          </div>
          <Building2 className="h-7 w-7 text-customBlue/40" aria-hidden />
        </div>
        {hierarchyPreview.length === 0 ?
          <p className="mt-4 text-center text-[13px] font-semibold text-muted-500">لا إدارات للعرض في هذا المقطع.</p>
        :
          <div dir="rtl" className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {hierarchyPreview.map((d, i) => (
              <div key={d.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView(d)}
                  className="rounded-2xl border border-white/90 bg-white/90 px-3 py-2 text-[11px] font-black text-deepBlue shadow-sm ring-1 ring-ink-100/70 transition hover:border-customBlue/30"
                >
                  {d.title}
                </button>
                {i < hierarchyPreview.length - 1 ?
                  <ChevronLeft className="h-4 w-4 text-muted-400" aria-hidden />
                : null}
              </div>
            ))}
          </div>
        }
      </SaGlassCard>

      <div className="mt-6 space-y-4">
        <CrudFilterBar searchValue={q} onSearchChange={setQ} searchPlaceholder="بحث اسم الإدارة أو القائد…">
          <MiniSelect
            label="الجودة الصحّية"
            value={health}
            onChange={(v) => setHealth(v === 'all' ? 'all' : (v as WorkspaceDepartment['status']))}
            options={[
              { value: 'all', labelAr: 'الجميع' },
              { value: 'healthy', labelAr: 'سليم' },
              { value: 'attention', labelAr: 'انتباه' },
              { value: 'risk', labelAr: 'خطر' },
            ]}
          />
        </CrudFilterBar>

        {!apiOk && !loading ?
          <EmptyPanel
            title="لا تتوفر إدارات حالياً"
            subtitle="تأكد من صلاحية GET /operations/departments للحساب، أو أن المنصّة لم تكتمل تهيئة بيانات التشغيل."
          />
        : loading ?
          <LoadingPanel />
        : !filtered.length ?
          <EmptyPanel title="لا نتائج للمرشّح الحالي" />
        :
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((r) => (
              <SaGlassCard key={r.id} className="flex flex-col p-5" glow="orange">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 text-right">
                    <h2 className="text-lg font-black text-deepBlue">{r.title}</h2>
                    <p className="mt-2 flex items-center gap-2 text-[12px] font-bold text-muted-600">
                      <Users className="h-4 w-4 shrink-0 text-customBlue" aria-hidden />
                      القائد: {r.leader_name ?? '—'}
                    </p>
                  </div>
                  {healthBadge(r.status)}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-ink-100/80 bg-slate-50/80 px-3 py-2.5 text-right">
                    <p className="text-[10px] font-black uppercase text-muted-500">الأعضاء</p>
                    <p className="text-lg font-black text-deepBlue">{r.members_count}</p>
                  </div>
                  <div className="rounded-xl border border-ink-100/80 bg-slate-50/80 px-3 py-2.5 text-right">
                    <p className="text-[10px] font-black uppercase text-muted-500">مهام مفتوحة</p>
                    <p className="text-lg font-black text-accent-700">{r.open_tasks}</p>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-ink-100/60 pt-4">
                  <RowActionsMenu
                    ariaLabel={r.title}
                    actions={[
                      { key: 'v', label: 'لمحة تنفيذية', onClick: () => setView(r) },
                      {
                        key: 'deptdash',
                        label: 'تفاصيل التشغيل',
                        onClick: () => navigate(`/dashboard/admin/departments/${r.id}`),
                      },
                    ]}
                  />
                </div>
              </SaGlassCard>
            ))}
          </div>
        }
      </div>

      <CrudModal
        open={view !== null}
        onClose={() => setView(null)}
        title={(view?.title ?? '') + ''}
        subtitle="قائدة الجودة وربط LMS"
      >
        {view ?
          <div className="space-y-2 text-right text-[13px] font-semibold text-muted-700">
            <p>القائد: {view.leader_name ?? '—'}</p>
            <p>التقدير الصحي: {healthBadge(view.status)}</p>
            <p className="text-[12px] text-muted-600">
              تُكمّل هذه النافذة بتفاصيل الأقسام عند ظهور واجهة إدارتها الكاملة.
            </p>
          </div>
        : null}
      </CrudModal>
    </SaPageRoot>
  )
}
