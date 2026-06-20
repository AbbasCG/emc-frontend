import { useCallback, useEffect, useState } from 'react'
import { FolderOpen, FileText, Video, Link2, BookOpen } from 'lucide-react'
import { adminListMaterials } from '@/api/adminLmsApi'
import { LmsEmptyState } from '@/components/lms'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { fmtDate, normCourseTitle } from '@/components/lms/lmsFormatters'
import type { LucideIcon } from 'lucide-react'

type MaterialRow = {
  id: number
  title?: string | null
  description?: string | null
  type?: string | null
  kind?: string | null
  file_path?: string | null
  external_url?: string | null
  url?: string | null
  course_id?: number | null
  course_title?: string | null
  course_name?: string | null
  created_at?: string | null
  updated_at?: string | null
}

function normMaterial(r: MaterialRow): MaterialRow {
  return {
    ...r,
    course_title: normCourseTitle(r.course_title ?? r.course_name),
    type: r.type ?? r.kind ?? 'other',
  }
}

type FileTypeDef = { icon: LucideIcon; label: string; bg: string; text: string }

const typeMap: Record<string, FileTypeDef> = {
  pdf:      { icon: FileText, label: 'PDF',   bg: 'bg-rose-50',    text: 'text-rose-600' },
  video:    { icon: Video,    label: 'فيديو', bg: 'bg-purple-50',  text: 'text-purple-600' },
  link:     { icon: Link2,    label: 'رابط',  bg: 'bg-sky-50',     text: 'text-sky-600' },
  slide:    { icon: BookOpen, label: 'شرائح', bg: 'bg-amber-50',   text: 'text-amber-600' },
  document: { icon: FileText, label: 'مستند', bg: 'bg-slate-50',   text: 'text-slate-600' },
  other:    { icon: FolderOpen, label: 'ملف', bg: 'bg-deepBlue/[0.05]', text: 'text-deepBlue/60' },
}

function MaterialCard({ m }: { m: MaterialRow }) {
  const t = typeMap[m.type ?? 'other'] ?? typeMap.other
  const TypeIcon = t.icon
  const href = m.external_url ?? m.url ?? (m.file_path ? `/storage/${m.file_path}` : undefined)

  return (
    <div className="group flex items-start gap-4 rounded-2xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm ring-1 ring-deepBlue/[0.02] transition hover:shadow-md">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.bg} ring-1 ring-deepBlue/[0.06]`}>
        <TypeIcon size={18} className={t.text} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-deepBlue text-sm line-clamp-1">{m.title ?? '—'}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ring-deepBlue/10 ${t.bg} ${t.text}`}>
            {t.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs font-semibold text-customBlue/70 line-clamp-1">{m.course_title}</p>
        {m.description && (
          <p className="mt-1 text-xs text-deepBlue/40 line-clamp-2">{m.description}</p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] font-medium text-deepBlue/35">{fmtDate(m.created_at ?? m.updated_at)}</p>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-customBlue/10 px-2.5 py-1 text-[11px] font-black text-customBlue hover:bg-customBlue/20 transition"
            >
              عرض
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminLmsMaterialsPage() {
  const [rows, setRows] = useState<MaterialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminListMaterials()
      .then((list) => setRows((list as MaterialRow[]).map(normMaterial)))
      .catch(() => setError('تعذّر تحميل المواد.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (r.title ?? '').toLowerCase().includes(q)
      || (r.course_title ?? '').toLowerCase().includes(q)
    const matchType = !filterType || r.type === filterType
    return matchSearch && matchType
  })

  const total = rows.length
  const pdfs = rows.filter((r) => r.type === 'pdf').length
  const videos = rows.filter((r) => r.type === 'video').length
  const links = rows.filter((r) => r.type === 'link').length

  const kpis = [
    { label: 'إجمالي المواد', value: total,  icon: FolderOpen, variant: 'brand'   as const },
    { label: 'ملفات PDF',    value: pdfs,   icon: FileText,   variant: 'accent'  as const },
    { label: 'فيديوهات',    value: videos,  icon: Video,      variant: 'muted'   as const },
    { label: 'روابط خارجية', value: links,  icon: Link2,      variant: 'success' as const },
  ]

  return (
    <AdminLmsShell
      title="إدارة المواد التعليمية"
      description="جميع المواد المنشورة عبر الدورات والورش"
      breadcrumb="المواد"
      kpis={kpis}
      loading={loading}
      error={error}
      onRetry={load}
      onRefresh={load}
    >
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="بحث عن مادة أو دورة…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 flex-1 min-w-48 rounded-xl border border-deepBlue/[0.10] bg-white px-3 text-sm font-semibold text-deepBlue placeholder:font-medium placeholder:text-deepBlue/30 shadow-sm focus:outline-none focus:ring-2 focus:ring-customBlue/30"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-xl border border-deepBlue/[0.10] bg-white px-3 text-sm font-bold text-deepBlue shadow-sm focus:outline-none focus:ring-2 focus:ring-customBlue/30"
        >
          <option value="">كل الأنواع</option>
          <option value="pdf">PDF</option>
          <option value="video">فيديو</option>
          <option value="link">رابط</option>
          <option value="slide">شرائح</option>
          <option value="document">مستند</option>
          <option value="other">أخرى</option>
        </select>
      </div>

      {/* Grid */}
      {!loading && (
        filtered.length === 0 ? (
          <LmsEmptyState
            icon={FolderOpen}
            title="لا توجد مواد"
            description={search || filterType ? 'جرّب تغيير معايير البحث.' : 'لم يتم إضافة أي مواد تعليمية بعد.'}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((m) => <MaterialCard key={m.id} m={m} />)}
            </div>
            <p className="text-xs font-bold text-deepBlue/35">عرض {filtered.length} من {total}</p>
          </>
        )
      )}
    </AdminLmsShell>
  )
}
