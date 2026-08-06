import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import PublicCatalogHero from '@/components/public/PublicCatalogHero'
import PublicSeo from '@/components/public/PublicSeo'
import WorkshopCard from '@/components/public/WorkshopCard'
import {
  fetchPublicWorkshopsPage,
  type PublicWorkshop,
  type WorkshopsQuery,
} from '@/api/workshopsApi.public'

const PER_PAGE = 200 // load all, filter client-side

export default function WorkshopsPage() {
  const [allWorkshops, setAllWorkshops] = useState<PublicWorkshop[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Pagination (client-side)
  const [page, setPage] = useState(1)
  const CLIENT_PER_PAGE = 12

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState<WorkshopsQuery['location_type']>('all')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [instructorFilter, setInstructorFilter] = useState<string>('all')

  // Debounce search
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 280)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    const res = await fetchPublicWorkshopsPage({ page: 1, per_page: PER_PAGE })
    if (!res.ok) {
      setLoadError(true)
      setAllWorkshops([])
    } else {
      setAllWorkshops(res.workshops)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  // Instructor options from loaded data
  const instructorOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const w of allWorkshops) {
      if (w.instructor_name) seen.set(w.instructor_name, w.instructor_name)
    }
    const opts: { value: string; label: string }[] = [{ value: 'all', label: 'كل المدربين' }]
    for (const [v, label] of seen) opts.push({ value: v, label })
    return opts
  }, [allWorkshops])

  // Client-side filtering
  const filtered = useMemo(() => {
    let rows = allWorkshops
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (w) =>
          w.title?.toLowerCase().includes(q) ||
          w.description?.toLowerCase().includes(q) ||
          w.short_description?.toLowerCase().includes(q) ||
          w.instructor_name?.toLowerCase().includes(q),
      )
    }
    if (locationFilter && locationFilter !== 'all') {
      rows = rows.filter((w) => {
        const lt = String(w.location_type ?? '').toLowerCase()
        if (locationFilter === 'online') return w.is_online || lt === 'online'
        if (locationFilter === 'offline') return lt === 'offline' || (!w.is_online && lt !== 'online' && lt !== 'hybrid')
        if (locationFilter === 'hybrid') return lt === 'hybrid'
        return true
      })
    }
    if (priceFilter !== 'all') {
      rows = rows.filter((w) =>
        priceFilter === 'free' ? w.is_free : !w.is_free,
      )
    }
    if (statusFilter !== 'all') {
      rows = rows.filter((w) => w.status === statusFilter)
    }
    if (instructorFilter !== 'all') {
      rows = rows.filter((w) => w.instructor_name === instructorFilter)
    }
    return rows
  }, [allWorkshops, search, locationFilter, priceFilter, statusFilter, instructorFilter])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [search, locationFilter, priceFilter, statusFilter, instructorFilter])

  const totalFiltered = filtered.length
  const lastPage = Math.max(1, Math.ceil(totalFiltered / CLIENT_PER_PAGE))
  const safePage = Math.min(Math.max(1, page), lastPage)
  const pageRows = filtered.slice((safePage - 1) * CLIENT_PER_PAGE, safePage * CLIENT_PER_PAGE)

  const hasFilters =
    search || locationFilter !== 'all' || priceFilter !== 'all' || statusFilter !== 'all' || instructorFilter !== 'all'

  const emptyMessage = useMemo(() => {
    if (loadError) return null
    if (hasFilters) return 'لا توجد ورش مطابقة لمعايير البحث الحالية.'
    return 'لا توجد ورش منشورة في الكتالوج حالياً.'
  }, [loadError, hasFilters])

  return (
    <div className="min-h-screen bg-slate-50 text-right" dir="rtl">
      <PublicSeo
        title="الورش التدريبية"
        description="استكشف ورش EMC القادمة — تدريب عملي بالعربية، أونلاين وحضوري، مع شهادات ومسارات مهنية."
        path="/workshops"
      />

      <PublicCatalogHero
        eyebrow="ورش EMC"
        title="الورش التدريبية"
        subtitle="ورش قصيرة مركّزة — من الذكاء الاصطناعي إلى المسارات المهنية. سجّل مباشرة أو عبر حسابك في المنصة."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الورش' },
        ]}
        searchPlaceholder="ابحث عن ورشة، مدرب، أو موضوع…"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
      />

      {/* Filter bar */}
      <div className="sticky top-[4.5rem] z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          {/* Row 1: chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">النمط</span>
            <Chip active={locationFilter === 'all'} onClick={() => setLocationFilter('all')} label="الكل" />
            <Chip active={locationFilter === 'online'} onClick={() => setLocationFilter('online')} label="أونلاين" />
            <Chip active={locationFilter === 'offline'} onClick={() => setLocationFilter('offline')} label="حضوري" />
            <Chip active={locationFilter === 'hybrid'} onClick={() => setLocationFilter('hybrid')} label="هجين" />

            <span className="me-1 ms-3 text-[11px] font-bold text-slate-400">السعر</span>
            <Chip active={priceFilter === 'all'} onClick={() => setPriceFilter('all')} label="الكل" />
            <Chip active={priceFilter === 'free'} onClick={() => setPriceFilter('free')} label="مجاني" />
            <Chip active={priceFilter === 'paid'} onClick={() => setPriceFilter('paid')} label="برسوم" />

            <span className="me-1 ms-3 text-[11px] font-bold text-slate-400">الحالة</span>
            <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="الكل" />
            <Chip active={statusFilter === 'published'} onClick={() => setStatusFilter('published')} label="منشورة" />
            <Chip active={statusFilter === 'scheduled'} onClick={() => setStatusFilter('scheduled')} label="مجدولة" />
            <Chip active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} label="نشطة" />

            <span className="ms-auto text-[12px] font-bold text-slate-500">
              {loading
                ? 'جارٍ التحميل…'
                : `عرض ${totalFiltered} ورشة`}
            </span>
          </div>

          {/* Row 2: Instructor select (only when options exist) */}
          {!loading && instructorOptions.length > 1 && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold text-slate-400">المدرب</span>
              <select
                value={instructorFilter}
                onChange={(e) => setInstructorFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2691C2]/30"
              >
                {instructorOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    setSearch('')
                    setLocationFilter('all')
                    setPriceFilter('all')
                    setStatusFilter('all')
                    setInstructorFilter('all')
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100"
                >
                  <X className="h-3 w-3" />
                  مسح الفلاتر
                </button>
              )}
            </div>
          )}
          {!loading && instructorOptions.length <= 1 && hasFilters && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  setSearch('')
                  setLocationFilter('all')
                  setPriceFilter('all')
                  setStatusFilter('all')
                  setInstructorFilter('all')
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100"
              >
                <X className="h-3 w-3" />
                مسح الفلاتر
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {loadError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>تعذّر تحميل الورش من الخادم. تحقّق من الاتصال ثم أعد تحميل الصفحة.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-[#2691C2]" />
          </div>
        ) : pageRows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-base font-black text-deepBlue">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {pageRows.map((w, i) => (
                <WorkshopCard key={w.id} workshop={w} index={(safePage - 1) * CLIENT_PER_PAGE + i} />
              ))}
            </div>

            {lastPage > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-deepBlue disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </button>
                <span className="text-sm font-bold text-slate-600">
                  صفحة {safePage} من {lastPage}
                </span>
                <button
                  type="button"
                  disabled={safePage >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-deepBlue disabled:opacity-40"
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
        active
          ? 'bg-deepBlue text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-600 hover:border-[#2691C2]/40'
      }`}
    >
      {label}
    </button>
  )
}
