import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { AssignmentCard } from '@/components/lms'
import type { StudentAssignment } from '@/types/lms'
import { isNeedsResubmission } from '@/utils/lmsAssignment'
import SearchInput from './shared/SearchInput'
import FilterChips from './shared/FilterChips'
import SortSelect from './shared/SortSelect'
import EmptyHint from './shared/EmptyHint'
import { GridCardsSkeleton, ToolbarSkeleton } from './shared/Skeletons'

const STATUS_SUBMITTED: StudentAssignment['status'][] = ['submitted', 'graded']

type StatusBucket = 'all' | 'available' | 'submitted' | 'graded' | 'needs_resubmission' | 'late'

function bucketOf(a: StudentAssignment): StatusBucket {
  const overdue = a.due_at != null && !STATUS_SUBMITTED.includes(a.status) && new Date(a.due_at).getTime() < Date.now()
  if (a.status === 'graded') return 'graded'
  if (a.status === 'submitted') return 'submitted'
  if (overdue || a.status === 'late') return 'late'
  if (isNeedsResubmission(a.status)) return 'needs_resubmission'
  return 'available'
}

function bucketRank(b: StatusBucket): number {
  // needs-action first, then waiting-for-review, then graded/completed
  switch (b) {
    case 'available': case 'needs_resubmission': case 'late': return 0
    case 'submitted': return 1
    case 'graded': return 2
    default: return 3
  }
}

type SortOrder = 'due_asc' | 'due_desc' | 'status'
type RequiredFilter = 'all' | 'required' | 'optional'

export type AssignmentEntry = { assignment: StudentAssignment; moduleId: number | null; required: boolean }

type Props = {
  entries: AssignmentEntry[]
  moduleTitleById: Map<number, string>
  onSubmitAssignment: (a: StudentAssignment) => void
  loading: boolean
}

export default function AssignmentsTab({ entries, moduleTitleById, onSubmitAssignment, loading }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusBucket>('all')
  const [requiredFilter, setRequiredFilter] = useState<RequiredFilter>('all')
  const [unitFilter, setUnitFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortOrder>('due_asc')

  const counts = useMemo(() => {
    const c: Record<StatusBucket, number> = { all: entries.length, available: 0, submitted: 0, graded: 0, needs_resubmission: 0, late: 0 }
    for (const e of entries) c[bucketOf(e.assignment)]++
    return c
  }, [entries])

  const unitOptions = useMemo(() => {
    const ids = new Set<number>()
    for (const e of entries) if (e.moduleId != null) ids.add(e.moduleId)
    return Array.from(ids).map((id) => ({ value: String(id), label: moduleTitleById.get(id) ?? `وحدة ${id}` }))
  }, [entries, moduleTitleById])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = entries.filter((e) => {
      const a = e.assignment
      if (q) {
        const hay = `${a.title}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (statusFilter !== 'all' && bucketOf(a) !== statusFilter) return false
      if (requiredFilter === 'required' && !e.required) return false
      if (requiredFilter === 'optional' && e.required) return false
      if (unitFilter !== 'all') {
        if (unitFilter === 'general' ? e.moduleId != null : String(e.moduleId) !== unitFilter) return false
      }
      return true
    })
    list = [...list].sort((x, y) => {
      if (sort === 'status') return bucketRank(bucketOf(x.assignment)) - bucketRank(bucketOf(y.assignment))
      const tx = x.assignment.due_at ? Date.parse(x.assignment.due_at) : Number.POSITIVE_INFINITY
      const ty = y.assignment.due_at ? Date.parse(y.assignment.due_at) : Number.POSITIVE_INFINITY
      return sort === 'due_asc' ? tx - ty : ty - tx
    })
    return list
  }, [entries, search, statusFilter, requiredFilter, unitFilter, sort])

  const doneCount = entries.filter((e) => STATUS_SUBMITTED.includes(e.assignment.status)).length
  const resetFilters = () => { setSearch(''); setStatusFilter('all'); setRequiredFilter('all'); setUnitFilter('all'); setSort('due_asc') }

  if (loading) {
    return (
      <div className="space-y-5">
        <ToolbarSkeleton />
        <GridCardsSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#0C2A4B]/[0.06] bg-gradient-to-bl from-white/95 to-blue-50/20 p-6 shadow-sm ring-1 ring-[#0C2A4B]/[0.04]">
        <div>
          <h2 className="text-xl font-black text-[#0C2A4B]">الواجبات والتكليفات</h2>
          <p className="mt-1 text-[13px] font-semibold text-[#0C2A4B]/55">
            {entries.length > 0
              ? `${entries.length} واجب متاح · ${doneCount} تم تسليمه`
              : 'لا توجد واجبات ظاهرة في هذه الدورة حتى الآن'}
          </p>
        </div>
        <ClipboardList className="h-6 w-6 text-[#F28C00]/70" />
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="ابحث في الواجبات..." />
            {unitOptions.length > 0 && (
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="rounded-xl border border-[#0C2A4B]/10 bg-white px-3 py-2.5 text-[11px] font-black text-[#0C2A4B] outline-none focus:border-[#0077B6]/35"
              >
                <option value="all">كل الوحدات</option>
                <option value="general">عام</option>
                {unitOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            <select
              value={requiredFilter}
              onChange={(e) => setRequiredFilter(e.target.value as RequiredFilter)}
              className="rounded-xl border border-[#0C2A4B]/10 bg-white px-3 py-2.5 text-[11px] font-black text-[#0C2A4B] outline-none focus:border-[#0077B6]/35"
            >
              <option value="all">إلزامي واختياري</option>
              <option value="required">إلزامي فقط</option>
              <option value="optional">اختياري فقط</option>
            </select>
            <SortSelect
              options={[
                { value: 'due_asc', label: 'الأقرب استحقاقاً' },
                { value: 'due_desc', label: 'الأبعد استحقاقاً' },
                { value: 'status', label: 'الحالة' },
              ]}
              value={sort}
              onChange={setSort}
            />
          </div>
          <FilterChips
            options={[
              { value: 'all', label: 'الكل', count: counts.all },
              { value: 'available', label: 'متاح', count: counts.available },
              { value: 'submitted', label: 'بانتظار المراجعة', count: counts.submitted },
              { value: 'graded', label: 'تم التقييم', count: counts.graded },
              { value: 'needs_resubmission', label: 'يحتاج إعادة تسليم', count: counts.needs_resubmission },
              { value: 'late', label: 'متأخر', count: counts.late },
            ]}
            active={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-3xl bg-white/80 ring-1 ring-[#0C2A4B]/[0.06]">
          <EmptyHint icon={ClipboardList} title="لا توجد واجبات مطابقة للفلاتر" description="عند إضافة واجبات من لوحة المحتوى، ستُعرض هنا." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white/80 ring-1 ring-[#0C2A4B]/[0.06]">
          <EmptyHint icon={ClipboardList} title="لا توجد واجبات مطابقة للفلاتر" description="جرّب تعديل البحث أو الفلاتر" onReset={resetFilters} />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-[#0C2A4B]/45">{filtered.length} نتيجة</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <AssignmentCard
                key={e.assignment.id}
                assignment={e.assignment}
                onSubmit={
                  ['pending', 'revision', 'late', 'needs_resubmission'].includes(String(e.assignment.status))
                    ? () => onSubmitAssignment(e.assignment)
                    : undefined
                }
              />
            ))}
          </div>
          <Link to="/dashboard/student/assignments" className="inline-flex items-center gap-2 text-[12px] font-black text-[#0077B6] hover:underline">
            فتح كل الواجبات
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      )}
    </div>
  )
}
