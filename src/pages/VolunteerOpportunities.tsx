import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, Search, ShieldAlert } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PublicSeo from '@/components/public/PublicSeo'
import { OpportunityCard } from '@/components/volunteerOpportunities/OpportunityCard'
import { SORT_OPTIONS } from '@/components/volunteerOpportunities/opportunityUi'
import { fetchOpportunities, type OpportunityList, type OpportunityQuery } from '@/api/volunteerOpportunitiesApi'

const FIELD = 'w-full rounded-xl border border-line bg-paper2 px-4 py-3 text-right text-sm font-semibold text-deepBlue outline-none transition placeholder:text-muted-400 focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-brand-100'

type Filters = { q: string; departmentId: number | ''; locationMode: NonNullable<OpportunityQuery['locationMode']>; sort: NonNullable<OpportunityQuery['sort']> }
const INITIAL: Filters = { q: '', departmentId: '', locationMode: '', sort: 'newest' }

/**
 * /volunteer-opportunities — the public list of volunteer opportunities EMC has published.
 * The server returns published, open opportunities only, filtered and paginated; nothing here can
 * make a draft or a closed opportunity appear.
 */
export default function VolunteerOpportunities() {
  const [filters, setFilters] = useState<Filters>(INITIAL)
  const [appliedQ, setAppliedQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<OpportunityList | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const requestRef = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedQ(filters.q)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [filters.q])

  const load = useCallback(async () => {
    const request = ++requestRef.current
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetchOpportunities({ q: appliedQ, departmentId: filters.departmentId, locationMode: filters.locationMode, sort: filters.sort, page })
      if (request === requestRef.current) setData(res)
    } catch {
      if (request === requestRef.current) {
        setData(null)
        setFailed(true)
      }
    } finally {
      if (request === requestRef.current) setLoading(false)
    }
  }, [appliedQ, filters.departmentId, filters.locationMode, filters.sort, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when a filter or the page changes; the loading flag must reset before the request
    void load()
  }, [load])

  function change(patch: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...patch }))
    if (!('q' in patch)) setPage(1)
  }

  const filtered = filters.q !== '' || filters.departmentId !== '' || filters.locationMode !== ''
  const items = data?.items ?? []

  return (
    <div className="bg-paper pt-20" dir="rtl">
      <PublicSeo title="فرص التطوع" description="تعرّف على فرص التطوع المتاحة في مركز ماستر التعليمي وقدّم على ما يناسب مهاراتك ووقتك." path="/volunteer-opportunities" />
      <PageHeader title="فرص التطوع" subtitle="فرص مفتوحة للتقديم في إدارات EMC. اختر ما يناسب مهاراتك ووقتك." breadcrumbs={[{ label: 'الرئيسية', href: '/' }, { label: 'التطوع', href: '/volunteer' }, { label: 'فرص التطوع' }]} />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <form role="search" aria-label="البحث في الفرص" onSubmit={(e) => e.preventDefault()} className="grid gap-3 rounded-3xl bg-white p-4 shadow-emc-md ring-1 ring-line md:grid-cols-2 lg:grid-cols-5">
          <label className="relative block lg:col-span-2">
            <span className="sr-only">بحث</span>
            <Search size={16} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-deepBlue/40" aria-hidden="true" />
            <input type="search" value={filters.q} onChange={(e) => change({ q: e.target.value })} placeholder="ابحث عن فرصة…" className={`${FIELD} ps-11`} />
          </label>
          <label className="block">
            <span className="sr-only">المجال</span>
            <select aria-label="المجال" value={String(filters.departmentId)} onChange={(e) => change({ departmentId: e.target.value ? Number(e.target.value) : '' })} className={FIELD}>
              <option value="">كل المجالات</option>
              {(data?.departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name} ({d.count})</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">نمط العمل</span>
            <select aria-label="نمط العمل" value={filters.locationMode} onChange={(e) => change({ locationMode: e.target.value as Filters['locationMode'] })} className={FIELD}>
              <option value="">كل الأنماط</option>
              {(data?.locationModes ?? []).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">الترتيب</span>
            <select aria-label="الترتيب" value={filters.sort} onChange={(e) => change({ sort: e.target.value as Filters['sort'] })} className={FIELD}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </form>

        <div className="mt-8" aria-live="polite">
          {loading && !data ?
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="جارٍ التحميل" data-testid="opportunities-loading">
              {Array.from({ length: 6 }).map((_, i) => <li key={i} className="h-72 animate-pulse rounded-3xl bg-deepBlue/[0.06]" />)}
            </ul>
          : failed ?
            <div role="alert" className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-emc-md ring-1 ring-line">
              <ShieldAlert size={36} className="mx-auto text-red-500" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-black text-deepBlue">تعذّر تحميل الفرص</h2>
              <p className="mt-1 text-sm font-semibold text-deepBlue/60">حدث خطأ أثناء جلب البيانات. حاول مرة أخرى.</p>
              <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-customOrange px-6 py-3 text-sm font-extrabold text-white shadow-emc-md">إعادة المحاولة</button>
            </div>
          : items.length === 0 ?
            <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-emc-md ring-1 ring-line" data-testid="opportunities-empty">
              <h2 className="text-lg font-black text-deepBlue">{filtered ? 'لا توجد فرص مطابقة' : 'لا توجد فرص مفتوحة حاليًا'}</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-deepBlue/60">
                {filtered ? 'جرّب تغيير البحث أو مسح التصفية.' : 'نضيف فرصًا جديدة باستمرار. يمكنك تقديم طلب تطوع عام لنتواصل معك عند توفر ما يناسبك.'}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {filtered ? <button type="button" onClick={() => { setFilters(INITIAL); setAppliedQ(''); setPage(1) }} className="rounded-xl border border-customBlue/30 px-5 py-2.5 text-sm font-black text-customBlue">مسح التصفية</button> : null}
                <Link to="/volunteer/apply" className="rounded-xl bg-customOrange px-5 py-2.5 text-sm font-extrabold text-white shadow-emc-md">تقديم طلب تطوع عام</Link>
              </div>
            </div>
          : (
            <>
              <p className="mb-4 text-sm font-bold text-deepBlue/60">{data?.meta.total} فرصة متاحة</p>
              <ul className={`grid gap-6 transition-opacity md:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`} aria-label="الفرص المتاحة">
                {items.map((o) => <OpportunityCard key={o.id} o={o} />)}
              </ul>
              {data && data.meta.lastPage > 1 ?
                <nav aria-label="التنقل بين الصفحات" className="mt-10 flex items-center justify-center gap-4">
                  <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-black text-deepBlue disabled:opacity-50">
                    <ChevronRight size={16} aria-hidden="true" /> السابق
                  </button>
                  <span className="text-sm font-bold text-deepBlue/60">صفحة {data.meta.currentPage} من {data.meta.lastPage}</span>
                  <button type="button" onClick={() => setPage((p) => Math.min(data.meta.lastPage, p + 1))} disabled={page >= data.meta.lastPage || loading} className="inline-flex items-center gap-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-black text-deepBlue disabled:opacity-50">
                    التالي <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                </nav>
              : null}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
