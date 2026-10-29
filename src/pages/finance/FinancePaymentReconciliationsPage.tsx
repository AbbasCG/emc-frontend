import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ChevronLeft, ChevronRight, Info, RefreshCw, Scale, Search } from 'lucide-react'
import { getApiErrorMessage } from '@/api/apiErrors'
import { fetchReconciliations } from '@/api/paymentReconciliationsApi'
import type { ReconciliationCase, ReconciliationFilter, ReconciliationPage, ReconciliationResolution } from '@/api/paymentReconciliationsApi'
import { FinanceSubnav } from '@/components/intelligence'
import ReconciliationDetailDialog from '@/components/finance/reconciliation/ReconciliationDetailDialog'
import ReconciliationList from '@/components/finance/reconciliation/ReconciliationList'
import ReconciliationResolveDialog from '@/components/finance/reconciliation/ReconciliationResolveDialog'
import { formatFinanceCount } from '@/utils/financeFormatters'
import { financeSectionBase } from '@/utils/financeNav'
import toast from '@/lib/toast'

type Tab = 'open' | 'resolved' | 'refund'

const TABS: { key: Tab; label: string; filter: ReconciliationFilter }[] = [
  { key: 'open', label: 'مفتوحة', filter: { status: 'open' } },
  { key: 'resolved', label: 'تمت التسوية', filter: { status: 'resolved' } },
  { key: 'refund', label: 'استرداد معلّق', filter: { refund: 'pending' } },
]

const countOf = (page: ReconciliationPage | null, tab: Tab) => (page ? { open: page.summary.open, resolved: page.summary.resolved, refund: page.summary.refund_pending }[tab] : 0)

/**
 * Payment reconciliation: confirmed payments whose enrollment was withheld because the payer teaches what they paid for.
 * Finance decides the ENROLLMENT (activate it once the conflict is gone, or close the case without enrolling) with a confirmation
 * and a mandatory note. The platform never refunds and never marks a payment refunded: a refund, when due, is made outside it and
 * tracked here as "refund pending".
 */
export default function FinancePaymentReconciliationsPage() {
  const { pathname } = useLocation()
  const base = financeSectionBase(pathname)

  const [tab, setTab] = useState<Tab>('open')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [reloads, setReloads] = useState(0)
  // The last answer and which request it answered: while they differ a newer request is in flight (that is "loading").
  const [answer, setAnswer] = useState<{ key: string; data: ReconciliationPage | null; error: string; forbidden: boolean } | null>(null)
  const [data, setData] = useState<ReconciliationPage | null>(null)
  const [detail, setDetail] = useState<ReconciliationCase | null>(null)
  const [deciding, setDeciding] = useState<{ item: ReconciliationCase; resolution: ReconciliationResolution } | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(query)
      setPage(1)
    }, 350)

    return () => window.clearTimeout(t)
  }, [query])

  const requestKey = `${tab}|${debounced}|${page}|${reloads}`

  useEffect(() => {
    let current = true
    const filter = { ...(TABS.find((t) => t.key === tab)?.filter ?? {}), q: debounced, page }
    fetchReconciliations(filter)
      .then((result) => {
        if (!current) return
        setData(result)
        setAnswer({ key: requestKey, data: result, error: '', forbidden: false })
      })
      .catch((e: unknown) => {
        if (!current) return
        const status = (e as { response?: { status?: number } })?.response?.status
        setAnswer({ key: requestKey, data: null, error: status === 403 ? '' : getApiErrorMessage(e), forbidden: status === 403 })
      })

    return () => {
      current = false
    }
  }, [tab, debounced, page, requestKey])

  const loading = answer?.key !== requestKey
  const forbidden = !loading && answer?.forbidden === true
  const error = !loading ? (answer?.error ?? '') : ''
  const reload = () => setReloads((n) => n + 1)

  function onResolved(updated: ReconciliationCase) {
    setDeciding(null)
    setDetail(null)
    toast.success(updated.resolution === 'enrollment_activated' ? 'فُعّل التسجيل وسُجّل القرار.' : 'أُغلقت الحالة دون تفعيل التسجيل وسُجّل القرار.')
    reload()
  }

  const rows = data?.rows ?? []

  return (
    <div className="min-h-screen bg-paper2 px-4 pb-16 pt-6 sm:px-6 lg:px-8" dir="rtl" data-testid="reconciliations-page">
      <div className="mx-auto max-w-7xl space-y-5">
        <FinanceSubnav />

        <header>
          <nav aria-label="مسار التنقل" className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <Link to={base} className="transition hover:text-customBlue">لوحة المالية</Link>
            <ChevronLeft className="h-3.5 w-3.5 rotate-180 text-slate-400" aria-hidden />
            <span className="font-black text-deepBlue">تسوية المدفوعات</span>
          </nav>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Scale className="h-6 w-6 text-customBlue" aria-hidden />
                <h1 className="text-2xl font-black text-deepBlue">تسوية المدفوعات</h1>
              </div>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
                مدفوعات مؤكَّدة لم يُفعَّل تسجيلها لأن الدافع صار مدرّب البرنامج. المبلغ مسجَّل وسليم؛ المطلوب قرارك في التسجيل.
              </p>
            </div>
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              aria-label="تحديث البيانات"
              className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-2xl border border-deepBlue/10 bg-white px-4 text-xs font-black text-deepBlue transition hover:border-customBlue/35 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 text-customBlue ${loading ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
          </div>
        </header>

        <p role="note" className="flex items-start gap-2.5 rounded-2xl bg-white p-4 text-xs font-semibold leading-6 text-slate-700 ring-1 ring-deepBlue/[0.06]">
          <Info className="mt-1 h-4 w-4 shrink-0 text-customBlue" aria-hidden />
          <span>
            لا تُجري المنصة استرداداً تلقائياً ولا تعلّم أي دفعة «مستردّة»، لأنه لا يوجد لديها دليل استرداد موثّق. إن كان المبلغ مستحقاً للإرجاع فاختر ذلك عند إغلاق الحالة، ويُسجَّل
            «استرداد معلّق» للمتابعة خارج المنصة.
          </span>
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="تصفية الحالات" className="flex flex-wrap gap-1.5 rounded-2xl bg-white p-1.5 ring-1 ring-deepBlue/[0.06]">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => {
                  setTab(t.key)
                  setPage(1)
                }}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black transition ${tab === t.key ? 'bg-deepBlue text-white shadow-md' : 'text-deepBlue hover:bg-slate-50'}`}
              >
                {t.label}
                <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[10px] ${tab === t.key ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`} data-testid={`count-${t.key}`}>
                  {formatFinanceCount(countOf(data, t.key))}
                </span>
              </button>
            ))}
          </div>

          <label className="relative block sm:w-72">
            <span className="sr-only">بحث بالمستخدم أو البرنامج أو مرجع الدفعة</span>
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث: مستخدم، برنامج، مرجع…"
              className="h-11 w-full rounded-2xl border border-deepBlue/10 bg-white pe-10 ps-3 text-xs font-bold text-deepBlue outline-none focus:border-customBlue focus:ring-2 focus:ring-customBlue/15"
            />
          </label>
        </div>

        <section className="overflow-hidden rounded-[20px] border border-deepBlue/[0.08] bg-white shadow-emc-sm" aria-busy={loading} aria-live="polite">
          {forbidden ? (
            <div className="px-6 py-12 text-center" role="alert">
              <p className="text-base font-black text-deepBlue">ليس لديك صلاحية للوصول إلى تسوية المدفوعات</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">تواصل مع مسؤول النظام إذا كنت بحاجة إلى هذه الصلاحية.</p>
            </div>
          ) : error && !data ? (
            <div className="px-6 py-12 text-center" role="alert">
              <p className="text-base font-black text-red-800">{error}</p>
              <button type="button" onClick={reload} className="mt-4 rounded-2xl bg-deepBlue px-5 py-2.5 text-xs font-black text-white">إعادة المحاولة</button>
            </div>
          ) : loading && !data ? (
            <div className="animate-pulse space-y-2 p-4" aria-label="جارٍ التحميل">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-14 text-center" data-testid="empty">
              <p className="text-base font-black text-deepBlue">
                {debounced ? 'لا توجد حالات مطابقة للبحث' : tab === 'open' ? 'لا توجد حالات مفتوحة' : tab === 'refund' ? 'لا توجد حالات استرداد معلّق' : 'لا توجد حالات مسوّاة بعد'}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {tab === 'open' && !debounced ? 'كل المدفوعات المؤكَّدة فُعِّلت تسجيلاتها. ستظهر هنا أي دفعة تحتاج قراراً.' : 'جرّب تغيير التصفية أو البحث.'}
              </p>
            </div>
          ) : (
            <ReconciliationList rows={rows} onOpen={setDetail} />
          )}

          {data && data.lastPage > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-deepBlue/[0.06] bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold text-slate-500">{formatFinanceCount(data.total)} حالة</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="الصفحة السابقة" className="flex h-10 w-10 items-center justify-center rounded-xl border border-deepBlue/10 bg-white disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
                <span className="min-w-[4.5rem] text-center text-xs font-black text-deepBlue">{page} / {data.lastPage}</span>
                <button type="button" disabled={page >= data.lastPage} onClick={() => setPage(page + 1)} aria-label="الصفحة التالية" className="flex h-10 w-10 items-center justify-center rounded-xl border border-deepBlue/10 bg-white disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <ReconciliationDetailDialog
        item={detail}
        canResolve
        onClose={() => setDetail(null)}
        onDecide={(item, resolution) => setDeciding({ item, resolution })}
      />
      <ReconciliationResolveDialog item={deciding?.item ?? null} resolution={deciding?.resolution ?? null} onClose={() => setDeciding(null)} onResolved={onResolved} />
    </div>
  )
}
