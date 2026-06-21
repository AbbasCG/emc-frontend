import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import PublicCatalogHero from '@/components/public/PublicCatalogHero'
import PublicSeo from '@/components/public/PublicSeo'
import WorkshopCard from '@/components/public/WorkshopCard'
import {
  fetchPublicWorkshopsPage,
  type PublicWorkshop,
  type WorkshopsQuery,
} from '@/api/workshopsApi.public'

const PER_PAGE = 12

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<PublicWorkshop[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState<WorkshopsQuery['location_type']>('all')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all')

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    const res = await fetchPublicWorkshopsPage({
      page,
      per_page: PER_PAGE,
      search: search || undefined,
      location_type: locationFilter,
    })
    if (!res.ok) {
      setLoadError(true)
      setWorkshops([])
      setTotal(0)
      setLastPage(1)
    } else {
      let rows = res.workshops
      if (priceFilter === 'free') rows = rows.filter((w) => w.is_free)
      else if (priceFilter === 'paid') rows = rows.filter((w) => !w.is_free)
      setWorkshops(rows)
      setTotal(res.total)
      setLastPage(res.lastPage)
    }
    setLoading(false)
  }, [page, search, locationFilter, priceFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [search, locationFilter, priceFilter])

  const emptyMessage = useMemo(() => {
    if (loadError) return null
    if (search || locationFilter !== 'all' || priceFilter !== 'all') {
      return 'لا توجد ورش مطابقة لمعايير البحث الحالية.'
    }
    return 'لا توجد ورش منشورة في الكتالوج حالياً.'
  }, [loadError, search, locationFilter, priceFilter])

  return (
    <div className="min-h-screen bg-slate-50 text-right" dir="rtl">
      <PublicSeo
        title="ورش العمل"
        description="استكشف ورش EMC القادمة — تدريب عملي بالعربية، أونلاين وحضوري، مع شهادات ومسارات مهنية."
        path="/workshops"
      />

      <PublicCatalogHero
        eyebrow="ورش EMC"
        title="ورش عمل وتدريب عملي"
        subtitle="ورش قصيرة مركّزة — من الذكاء الاصطناعي إلى المسارات المهنية. سجّل مباشرة أو عبر حسابك في المنصة."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الورش' },
        ]}
        searchPlaceholder="ابحث عن ورشة، مدرب، أو موضوع…"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
      />

      <div className="sticky top-[4.5rem] z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          <FilterChip active={locationFilter === 'all'} onClick={() => setLocationFilter('all')} label="كل الأنماط" />
          <FilterChip active={locationFilter === 'online'} onClick={() => setLocationFilter('online')} label="أونلاين" />
          <FilterChip active={locationFilter === 'offline'} onClick={() => setLocationFilter('offline')} label="حضوري" />
          <FilterChip active={priceFilter === 'all'} onClick={() => setPriceFilter('all')} label="كل الأسعار" />
          <FilterChip active={priceFilter === 'free'} onClick={() => setPriceFilter('free')} label="مجاني" />
          <FilterChip active={priceFilter === 'paid'} onClick={() => setPriceFilter('paid')} label="برسوم" />
          <span className="ms-auto text-[12px] font-bold text-slate-500">
            {loading ? 'جارٍ التحميل…' : `${total} ورشة`}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {loadError ?
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>تعذّر تحميل الورش من الخادم. تحقّق من الاتصال ثم أعد تحميل الصفحة.</p>
          </div>
        : loading ?
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-[#0077B6]" />
          </div>
        : workshops.length === 0 ?
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-base font-black text-deepBlue">{emptyMessage}</p>
          </div>
        : <>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {workshops.map((w, i) => (
                <WorkshopCard key={w.id} workshop={w} index={i} />
              ))}
            </div>

            {lastPage > 1 ?
              <div className="mt-10 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-deepBlue disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </button>
                <span className="text-sm font-bold text-slate-600">
                  صفحة {page} من {lastPage}
                </span>
                <button
                  type="button"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-deepBlue disabled:opacity-40"
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            : null}
          </>
        }
      </div>
    </div>
  )
}

function FilterChip({
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
      className={`rounded-xl px-3.5 py-2 text-[11px] font-black transition ${
        active ?
          'bg-deepBlue text-white shadow-sm'
        : 'border border-slate-200 bg-white text-slate-600 hover:border-[#0077B6]/40'
      }`}
    >
      {label}
    </button>
  )
}
