import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  Building2,
  Crown,
  Info,
  KeyRound,
  Layers,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { DepartmentPageAccessPanel } from '@/components/access-control/DepartmentPageAccessPanel'
import { RolePageAccessPanel } from '@/components/access-control/RolePageAccessPanel'
import { UserPageAccessPanel } from '@/components/access-control/UserPageAccessPanel'
import { EffectiveAccessPreview } from '@/components/access-control/EffectiveAccessPreview'
import { fetchWorkspaceDepartmentsForSuperAdmin } from '@/api/superAdminOpsApi'
import { searchAdminUsers, type UserSearchHit } from '@/api/adminUsersApi'
import { fetchPageAccessCatalog } from '@/api/pageAccessCatalogApi'
import { SUPER_ADMIN_ROLE_CATALOG_ROWS } from '@/pages/super-admin/users/assignableRoles'
import { SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { getDepartmentName } from '@/utils/workspaceDepartment'
import { useAuth } from '@/contexts/AuthContext'
import type { WorkspaceDepartment } from '@/types/operations'
import { cn } from '@/lib/utils'

/**
 * CENTRAL ACCESS CONTROL — إدارة الوصول والصلاحيات
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PAGE ACCESS != BUSINESS AUTHORIZATION
 * ─────────────────────────────────────────────────────────────────────────
 * Everything on this page configures whether a dashboard PAGE OPENS. It does
 * not grant permission to create, edit, delete, approve or authorise anything.
 * Those remain with Policies, Gates and PermissionDelegationService on the
 * server, and are unaffected by every control here.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS PAGE OWNS NO ACCESS LOGIC
 * ─────────────────────────────────────────────────────────────────────────
 * It is a SHELL: selection, tabs and layout. Every editor below is the same
 * component already used contextually elsewhere — RoleDetailDrawer,
 * DepartmentsManagementPage and the users drawer — and each one fetches its own
 * data, computes its own eligibility from the backend, and saves atomically
 * through the existing endpoints. No eligibility rule, no precedence, no
 * effective-access calculation and no role→page map lives here.
 *
 * Its own visibility comes from the backend manifest like every other page:
 * catalog key `administration.access_control`, SYSTEM_PROTECTED, enforced by
 * DashboardAccessGuard. There is deliberately no `if (role === 'super_admin')`
 * gate in this file.
 */

type TabId = 'departments' | 'roles' | 'users' | 'effective'

const TABS: { id: TabId; labelAr: string; Icon: typeof Building2 }[] = [
  { id: 'departments', labelAr: 'الأقسام', Icon: Building2 },
  { id: 'roles', labelAr: 'الأدوار', Icon: ShieldCheck },
  { id: 'users', labelAr: 'المستخدمون', Icon: Users },
  { id: 'effective', labelAr: 'معاينة الوصول الفعلي', Icon: Layers },
]

const isTabId = (v: string | null): v is TabId => TABS.some((t) => t.id === v)

/* ── Shared shell pieces ────────────────────────────────────────────────── */

function SummaryCard({
  Icon,
  labelAr,
  value,
}: {
  Icon: typeof Building2
  labelAr: string
  value: number | null
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0077B6]/10 text-[#0077B6]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs text-slate-500">{labelAr}</p>
          <p className="text-lg font-bold text-[#0C2A4B]">{value == null ? '—' : value}</p>
        </div>
      </div>
    </div>
  )
}

function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  label: string
}) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pe-10 ps-3 text-sm text-slate-800 outline-none transition focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20"
      />
    </div>
  )
}

function PickerList<T>({
  items,
  getKey,
  getLabel,
  getHint,
  selectedKey,
  onSelect,
  emptyAr,
}: {
  items: readonly T[]
  getKey: (item: T) => string
  getLabel: (item: T) => string
  getHint?: (item: T) => string | null
  selectedKey: string | null
  onSelect: (item: T) => void
  emptyAr: string
}) {
  if (items.length === 0) {
    return <EmptyPanel title={emptyAr} />
  }

  return (
    <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto pe-1" role="listbox" aria-label="قائمة الاختيار">
      {items.map((item) => {
        const key = getKey(item)
        const active = key === selectedKey
        const hint = getHint?.(item) ?? null

        return (
          <li key={key}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(item)}
              className={cn(
                'w-full rounded-xl border px-3 py-2.5 text-right transition',
                active
                  ? 'border-[#0077B6] bg-[#0077B6]/10 text-[#0C2A4B]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-[#0077B6]/40 hover:bg-slate-50',
              )}
            >
              <span className="block text-sm font-semibold">{getLabel(item)}</span>
              {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Two-column selector + editor, collapsing to one column on small screens. */
function SplitLayout({ picker, editor }: { picker: React.ReactNode; editor: React.ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <div className="space-y-3">{picker}</div>
      <div className="min-w-0">{editor}</div>
    </div>
  )
}

function ChoosePrompt({ titleAr, subtitleAr }: { titleAr: string; subtitleAr: string }) {
  return <EmptyPanel title={titleAr} subtitle={subtitleAr} />
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */

function DepartmentsTab() {
  const [rows, setRows] = useState<WorkspaceDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<WorkspaceDepartment | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const list = await fetchWorkspaceDepartmentsForSuperAdmin()
        if (!alive) return
        setRows(list)
      } catch {
        if (!alive) return
        setFailed(true)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((d) => getDepartmentName(d).toLowerCase().includes(q))
  }, [rows, query])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#0077B6]/20 bg-[#0077B6]/5 p-4 text-sm leading-relaxed text-[#0C2A4B]">
        <p className="font-semibold">أعضاء القسم وقائد القسم</p>
        <p className="mt-1 text-slate-700">
          قائد القسم يرث صلاحيات أعضاء القسم بالإضافة إلى صلاحيات القيادة. لا حاجة لتكرار صفحات الأعضاء داخل صلاحيات
          القائد.
        </p>
        <p className="mt-1 text-slate-700">
          القيادة تُحتسب من قائد القسم المعتمد في بيانات المنصة، وليس من اسم الدور.
        </p>
      </div>

      {failed ?
        <ErrorPanel title="تعذّر تحميل الأقسام" hint="يرجى المحاولة مرة أخرى." />
      : <SplitLayout
          picker={
            <>
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="ابحث عن قسم…"
                label="البحث عن قسم"
              />
              {loading ?
                <p className="px-1 py-6 text-center text-sm text-slate-500">جارٍ التحميل…</p>
              : <PickerList
                  items={filtered}
                  getKey={(d) => String(d.id)}
                  getLabel={(d) => getDepartmentName(d)}
                  getHint={(d) => (d.leader_name ? `القائد: ${d.leader_name}` : 'لا يوجد قائد معيّن')}
                  selectedKey={selected ? String(selected.id) : null}
                  onSelect={setSelected}
                  emptyAr="لا توجد أقسام مطابقة"
                />
              }
            </>
          }
          editor={
            selected ?
              <DepartmentPageAccessPanel
                key={String(selected.id)}
                departmentId={selected.id}
                departmentName={getDepartmentName(selected)}
              />
            : <ChoosePrompt
                titleAr="اختر قسمًا للبدء"
                subtitleAr="اختر قسمًا من القائمة لإدارة صفحاته الافتراضية للأعضاء وللقائد."
              />
          }
        />
      }
    </div>
  )
}

function RolesTab() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<{ slug: string; labelAr: string } | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SUPER_ADMIN_ROLE_CATALOG_ROWS
    return SUPER_ADMIN_ROLE_CATALOG_ROWS.filter(
      (r) => r.labelAr.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#0077B6]/20 bg-[#0077B6]/5 p-4 text-sm leading-relaxed text-[#0C2A4B]">
        <p className="font-semibold">صفحات الدور الافتراضية</p>
        <p className="mt-1 text-slate-700">
          هذه الصفحات تُمنح افتراضيًا لجميع المستخدمين الذين يحملون هذا الدور. المنح فقط — لا يوجد منع على مستوى الدور.
        </p>
      </div>

      <SplitLayout
        picker={
          <>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="ابحث عن دور…"
              label="البحث عن دور"
            />
            <PickerList
              items={filtered}
              getKey={(r) => r.slug}
              getLabel={(r) => r.labelAr}
              getHint={(r) => r.slug}
              selectedKey={selected?.slug ?? null}
              onSelect={setSelected}
              emptyAr="لا توجد أدوار مطابقة"
            />
          </>
        }
        editor={
          selected ?
            <RolePageAccessPanel key={selected.slug} roleId={selected.slug} roleLabelAr={selected.labelAr} />
          : <ChoosePrompt
              titleAr="اختر دورًا للبدء"
              subtitleAr="اختر دورًا من القائمة لإدارة صفحاته الافتراضية."
            />
        }
      />
    </div>
  )
}

/** Server-side user search, shared by the users and effective-access tabs. */
function UserPicker({
  selected,
  onSelect,
}: {
  selected: UserSearchHit | null
  onSelect: (u: UserSearchHit) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchHit[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }

    let alive = true
    setSearching(true)
    const timer = window.setTimeout(async () => {
      const hits = await searchAdminUsers(q)
      if (!alive) return
      setResults(hits)
      setSearching(false)
    }, 300)

    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [query])

  return (
    <>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="ابحث بالاسم أو البريد الإلكتروني…"
        label="البحث عن مستخدم"
      />
      {query.trim().length < 2 ?
        <p className="px-1 py-6 text-center text-sm text-slate-500">
          اكتب حرفين على الأقل لبدء البحث.
        </p>
      : searching ?
        <p className="px-1 py-6 text-center text-sm text-slate-500">جارٍ البحث…</p>
      : <PickerList
          items={results}
          getKey={(u) => String(u.id)}
          getLabel={(u) => u.name}
          getHint={(u) => u.email}
          selectedKey={selected ? String(selected.id) : null}
          onSelect={onSelect}
          emptyAr="لا توجد نتائج مطابقة"
        />
      }
    </>
  )
}

function UsersTab() {
  const { user: viewer } = useAuth()
  const [selected, setSelected] = useState<UserSearchHit | null>(null)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#0077B6]/20 bg-[#0077B6]/5 p-4 text-sm leading-relaxed text-[#0C2A4B]">
        <p className="font-semibold">استثناءات المستخدم</p>
        <ul className="mt-2 space-y-1 text-slate-700">
          <li>
            <span className="font-semibold">افتراضي:</span> يتم احتساب الوصول من الدور والقسم والقواعد الأساسية.
          </li>
          <li>
            <span className="font-semibold">سماح:</span> استثناء خاص يسمح للمستخدم بالصفحة.
          </li>
          <li>
            <span className="font-semibold">منع:</span> استثناء خاص يمنع المستخدم من الصفحة.
          </li>
        </ul>
        <p className="mt-2 text-slate-700">
          الحالة الافتراضية لا تُخزَّن — الاستثناءات فقط هي التي تُحفظ.
        </p>
      </div>

      <SplitLayout
        picker={<UserPicker selected={selected} onSelect={setSelected} />}
        editor={
          selected ?
            <UserPageAccessPanel
              key={selected.id}
              userId={selected.id}
              userName={selected.name}
              viewerRole={viewer?.role ?? null}
            />
          : <ChoosePrompt
              titleAr="اختر مستخدمًا للبدء"
              subtitleAr="ابحث عن مستخدم لإدارة استثناءات الوصول الخاصة به."
            />
        }
      />
    </div>
  )
}

function EffectiveTab() {
  const [selected, setSelected] = useState<UserSearchHit | null>(null)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#0077B6]/20 bg-[#0077B6]/5 p-4 text-sm leading-relaxed text-[#0C2A4B]">
        <p className="font-semibold">الوصول الفعلي النهائي</p>
        <p className="mt-1 text-slate-700">
          هذه النتيجة محسوبة في الخادم بعد دمج حماية النظام والدور والقسم واستثناءات المستخدم والوصول الأساسي. تُعرض
          كما هي دون أي إعادة حساب في الواجهة.
        </p>
      </div>

      <SplitLayout
        picker={<UserPicker selected={selected} onSelect={setSelected} />}
        editor={
          selected ?
            <EffectiveAccessPreview key={selected.id} userId={selected.id} userName={selected.name} />
          : <ChoosePrompt
              titleAr="اختر مستخدمًا لعرض وصوله الفعلي"
              subtitleAr="ابحث عن مستخدم لعرض الصفحات التي يمكنه فتحها ومصدر كل صلاحية."
            />
        }
      />
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AccessControlCenterPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabId = isTabId(raw) ? raw : 'departments'

  const setTab = useCallback(
    (next: TabId) => {
      const copy = new URLSearchParams(params)
      copy.set('tab', next)
      setParams(copy, { replace: true })
    },
    [params, setParams],
  )

  // Counters come from data the page already needs, plus the catalog the
  // editors fetch anyway. No endpoint exists merely to decorate a card.
  const [departmentCount, setDepartmentCount] = useState<number | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [departments, catalog] = await Promise.all([
        fetchWorkspaceDepartmentsForSuperAdmin().catch(() => null),
        fetchPageAccessCatalog().catch(() => null),
      ])
      if (!alive) return
      if (departments) setDepartmentCount(departments.length)
      if (catalog) setPageCount(catalog.pages.length)
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <SaPageRoot>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0C2A4B] text-white">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-[#0C2A4B] sm:text-2xl">إدارة الوصول والصلاحيات</h1>
            <p className="mt-0.5 text-sm text-slate-600">
              إدارة وصول الأقسام والأدوار والمستخدمين إلى صفحات المنصة من مكان واحد.
            </p>
          </div>
        </div>
      </header>

      <div
        role="note"
        className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          صلاحية الوصول إلى الصفحة تحدد إمكانية فتح الصفحة، بينما تبقى صلاحيات الإنشاء والتعديل والحذف والموافقة
          خاضعة لنظام الصلاحيات والسياسات في الخادم.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard Icon={Building2} labelAr="الأقسام" value={departmentCount} />
        <SummaryCard Icon={ShieldCheck} labelAr="الأدوار" value={SUPER_ADMIN_ROLE_CATALOG_ROWS.length} />
        <SummaryCard Icon={UserCog} labelAr="المستخدمون" value={null} />
        <SummaryCard Icon={Crown} labelAr="الصفحات المسجلة" value={pageCount} />
      </div>

      <div className="mb-5 -mx-1 overflow-x-auto px-1">
        <div role="tablist" aria-label="أقسام إدارة الوصول" className="flex min-w-max gap-2">
          {TABS.map(({ id, labelAr, Icon }) => {
            const active = id === tab
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`access-tab-${id}`}
                aria-selected={active}
                aria-controls={`access-panel-${id}`}
                onClick={() => setTab(id)}
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                  active
                    ? 'border-[#0C2A4B] bg-[#0C2A4B] text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-[#0077B6]/40 hover:text-[#0C2A4B]',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {labelAr}
              </button>
            )
          })}
        </div>
      </div>

      <div role="tabpanel" id={`access-panel-${tab}`} aria-labelledby={`access-tab-${tab}`}>
        {tab === 'departments' && <DepartmentsTab />}
        {tab === 'roles' && <RolesTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'effective' && <EffectiveTab />}
      </div>
    </SaPageRoot>
  )
}
