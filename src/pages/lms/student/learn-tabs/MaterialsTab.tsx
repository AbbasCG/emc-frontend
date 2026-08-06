import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { MaterialCard, StudentCardGrid } from '@/components/lms'
import type { LmsMaterial, MaterialKind } from '@/types/lms'
import SearchInput from './shared/SearchInput'
import FilterChips from './shared/FilterChips'
import SortSelect from './shared/SortSelect'
import EmptyHint from './shared/EmptyHint'
import { GridCardsSkeleton, ToolbarSkeleton } from './shared/Skeletons'

type TypeFilter = 'all' | MaterialKind
type SortOrder = 'newest' | 'oldest' | 'title'

export type MaterialEntry = { material: LmsMaterial; moduleId: number | null }

type Props = {
  entries: MaterialEntry[]
  moduleTitleById: Map<number, string>
  loading: boolean
}

const KIND_LABEL: Record<MaterialKind, string> = {
  pdf: 'PDF', video: 'فيديو', link: 'رابط', slides: 'عرض', document: 'مستند', zip: 'ZIP', other: 'ملف',
}

export default function MaterialsTab({ entries, moduleTitleById, loading }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [unitFilter, setUnitFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortOrder>('newest')

  const presentKinds = useMemo(() => {
    const set = new Set<MaterialKind>()
    for (const e of entries) set.add(e.material.kind)
    return Array.from(set)
  }, [entries])

  const unitOptions = useMemo(() => {
    const ids = new Set<number>()
    for (const e of entries) if (e.moduleId != null) ids.add(e.moduleId)
    return Array.from(ids).map((id) => ({ value: String(id), label: moduleTitleById.get(id) ?? `وحدة ${id}` }))
  }, [entries, moduleTitleById])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = entries.filter((e) => {
      const m = e.material
      if (q) {
        const hay = `${m.title} ${m.description ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (typeFilter !== 'all' && m.kind !== typeFilter) return false
      if (unitFilter !== 'all') {
        if (unitFilter === 'general' ? e.moduleId != null : String(e.moduleId) !== unitFilter) return false
      }
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'title') return a.material.title.localeCompare(b.material.title, 'ar')
      const ta = a.material.updated_at ? Date.parse(a.material.updated_at) : 0
      const tb = b.material.updated_at ? Date.parse(b.material.updated_at) : 0
      return sort === 'newest' ? tb - ta : ta - tb
    })
    return list
  }, [entries, search, typeFilter, unitFilter, sort])

  const resetFilters = () => { setSearch(''); setTypeFilter('all'); setUnitFilter('all'); setSort('newest') }

  if (loading) {
    return (
      <div className="space-y-4">
        <ToolbarSkeleton />
        <GridCardsSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-[#22334A]">المقررات والمواد</h2>
        {entries.length > 0 && (
          <Link to="/dashboard/student/materials" className="text-[12px] font-black text-[#2691C2] hover:underline">
            عرض كل المواد
          </Link>
        )}
      </div>

      {entries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="ابحث في المواد التعليمية..." />
          <FilterChips
            options={[
              { value: 'all', label: 'الكل' },
              ...presentKinds.map((k) => ({ value: k, label: KIND_LABEL[k] ?? k })),
            ]}
            active={typeFilter}
            onChange={setTypeFilter}
          />
          {unitOptions.length > 0 && (
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="rounded-xl border border-[#22334A]/10 bg-white px-3 py-2.5 text-[11px] font-black text-[#22334A] outline-none focus:border-[#2691C2]/35"
            >
              <option value="all">كل الوحدات</option>
              <option value="general">محتوى عام</option>
              {unitOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <SortSelect
            options={[
              { value: 'newest', label: 'الأحدث' },
              { value: 'oldest', label: 'الأقدم' },
              { value: 'title', label: 'العنوان' },
            ]}
            value={sort}
            onChange={setSort}
          />
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-3xl bg-white/80 p-4 ring-1 ring-[#22334A]/[0.06]">
          <EmptyHint icon={FolderOpen} title="لا توجد مواد تعليمية متاحة حالياً" description="بعد أن يرفع الفريق ملفاتاً أو روابط عبر لوحة المحتوى، ستظهر هنا." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white/80 p-4 ring-1 ring-[#22334A]/[0.06]">
          <EmptyHint icon={FolderOpen} title="لا توجد مواد تعليمية متاحة حالياً" description="جرّب تعديل البحث أو الفلاتر" onReset={resetFilters} />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-[#22334A]/45">{filtered.length} نتيجة</p>
          <StudentCardGrid>
            {filtered.map((e) => (
              <MaterialCard key={e.material.id} material={e.material} />
            ))}
          </StudentCardGrid>
        </div>
      )}
    </div>
  )
}
