import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { Building2, CalendarClock, CheckCircle2, Clock, Hourglass, Lock, MapPin, ShieldAlert, Users } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PublicSeo from '@/components/public/PublicSeo'
import { useAuth } from '@/contexts/AuthContext'
import { OpportunityApplyForm } from '@/components/volunteerOpportunities/OpportunityApplyForm'
import { STATUS_BADGE, deadlineText, formatDay } from '@/components/volunteerOpportunities/opportunityUi'
import { classifyOpportunityError, fetchOpportunity, type PublicOpportunityDetail } from '@/api/volunteerOpportunitiesApi'
import { cn } from '@/lib/utils'

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section aria-label={title} className="rounded-3xl bg-white p-6 shadow-emc-md ring-1 ring-line">
      <h2 className="text-lg font-black text-deepBlue">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((i) => <li key={i} className="flex items-start gap-2 text-sm font-semibold leading-7 text-deepBlue/75"><CheckCircle2 size={16} className="mt-1.5 shrink-0 text-customBlue" aria-hidden="true" />{i}</li>)}
      </ul>
    </section>
  )
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={17} className="mt-0.5 shrink-0 text-customBlue" aria-hidden="true" />
      <div><dt className="text-[11px] font-bold text-deepBlue/50">{label}</dt><dd className="text-sm font-black text-deepBlue">{value}</dd></div>
    </div>
  )
}

/**
 * /volunteer-opportunities/:id — one published opportunity and its application form.
 * A closed or expired opportunity can still be read, and says clearly that applications are closed;
 * a draft or unknown one is a plain "not available".
 */
export default function VolunteerOpportunityDetails() {
  const { id } = useParams()
  const opportunityId = Number(id)
  const { user } = useAuth()
  const [data, setData] = useState<PublicOpportunityDetail | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading')
  const { hash } = useLocation()
  // A link to #apply (including /:id/apply) lands on the form once the page has loaded it.
  useEffect(() => {
    if (state === 'ready' && hash === '#apply') document.getElementById('apply')?.scrollIntoView({ block: 'start' })
  }, [state, hash])

  const load = useCallback(async () => {
    if (!Number.isFinite(opportunityId) || opportunityId <= 0) {
      setState('not_found')
      return
    }
    setState('loading')
    try {
      setData(await fetchOpportunity(opportunityId))
      setState('ready')
    } catch (e) {
      setState(classifyOpportunityError(e) === 'not_found' ? 'not_found' : 'error')
    }
  }, [opportunityId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount / id change; the loading state must reset before the request
    void load()
  }, [load])

  const crumbs = [{ label: 'الرئيسية', href: '/' }, { label: 'فرص التطوع', href: '/volunteer-opportunities' }, { label: data?.title ?? 'تفاصيل الفرصة' }]

  return (
    <div className="bg-paper pt-20" dir="rtl">
      <PublicSeo title={data?.title ?? 'فرصة تطوعية'} description={data?.summary} path={`/volunteer-opportunities/${opportunityId || ''}`} noIndex={state !== 'ready'} />
      <PageHeader title={data?.title ?? 'فرصة تطوعية'} subtitle={data?.field ?? undefined} breadcrumbs={crumbs} />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {state === 'loading' ?
          <div className="space-y-4" aria-busy="true" aria-label="جارٍ التحميل" data-testid="opportunity-loading">
            <div className="h-40 animate-pulse rounded-3xl bg-deepBlue/[0.06]" /><div className="h-64 animate-pulse rounded-3xl bg-deepBlue/[0.06]" />
          </div>
        : state === 'not_found' ?
          <div role="alert" className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-emc-md ring-1 ring-line">
            <Lock size={34} className="mx-auto text-deepBlue/40" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-black text-deepBlue">هذه الفرصة غير متاحة</h2>
            <p className="mt-1 text-sm font-semibold text-deepBlue/60">ربما أُلغي نشرها أو لم تعد موجودة.</p>
            <Link to="/volunteer-opportunities" className="mt-5 inline-block rounded-xl bg-customOrange px-6 py-3 text-sm font-extrabold text-white shadow-emc-md">تصفح الفرص المتاحة</Link>
          </div>
        : state === 'error' || !data ?
          <div role="alert" className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-emc-md ring-1 ring-line">
            <ShieldAlert size={34} className="mx-auto text-red-500" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-black text-deepBlue">تعذّر تحميل الفرصة</h2>
            <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-customOrange px-6 py-3 text-sm font-extrabold text-white shadow-emc-md">إعادة المحاولة</button>
          </div>
        : (
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-6">
              <section className="rounded-3xl bg-white p-6 shadow-emc-md ring-1 ring-line" aria-label="وصف الفرصة">
                <span className={cn('inline-block rounded-full px-3 py-1 text-[11px] font-black ring-1', STATUS_BADGE[data.status])} data-testid="opportunity-status">{data.statusLabel}</span>
                <h2 className="mt-3 text-lg font-black text-deepBlue">عن الفرصة</h2>
                <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-8 text-deepBlue/75">{data.summary}</p>
              </section>

              <List title="المهام والمسؤوليات" items={data.responsibilities} />
              <List title="المهارات المطلوبة" items={data.requiredSkills} />
              <List title="مهارات مفضّلة" items={data.preferredSkills} />

              {data.applicationInstructions ?
                <section className="rounded-3xl bg-white p-6 shadow-emc-md ring-1 ring-line" aria-label="تعليمات التقديم">
                  <h2 className="text-lg font-black text-deepBlue">تعليمات التقديم</h2>
                  <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-8 text-deepBlue/75">{data.applicationInstructions}</p>
                </section>
              : null}

              <div id="apply">
                {data.acceptingApplications ?
                  <OpportunityApplyForm opportunityId={data.id} department={data.field} initial={{ fullName: user?.name ?? '', email: user?.email ?? '' }} />
                : (
                  <div role="status" data-testid="applications-closed" className="rounded-3xl bg-slate-50 p-8 text-center ring-1 ring-line">
                    <Lock size={32} className="mx-auto text-deepBlue/40" aria-hidden="true" />
                    <h2 className="mt-3 text-lg font-black text-deepBlue">{data.closedReason === 'deadline_passed' ? 'انتهى موعد التقديم' : 'أُغلق باب التقديم'}</h2>
                    <p className="mt-1 text-sm font-semibold text-deepBlue/60">لم تعد هذه الفرصة تستقبل طلبات جديدة. يمكنك استعراض فرص أخرى أو تقديم طلب تطوع عام.</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <Link to="/volunteer-opportunities" className="rounded-xl bg-customOrange px-5 py-2.5 text-sm font-extrabold text-white shadow-emc-md">فرص أخرى</Link>
                      <Link to="/volunteer/apply" className="rounded-xl border border-customBlue/30 px-5 py-2.5 text-sm font-black text-customBlue">طلب تطوع عام</Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <aside className="h-fit rounded-3xl bg-white p-6 shadow-emc-md ring-1 ring-line lg:sticky lg:top-28" aria-label="ملخص الفرصة">
              <dl className="space-y-4">
                {data.field ? <Fact icon={Building2} label="المجال" value={data.field} /> : null}
                {data.locationLabel ? <Fact icon={MapPin} label="نمط المشاركة" value={data.locationLabel} /> : null}
                {data.commitment ? <Fact icon={Clock} label="الالتزام الزمني" value={data.commitment} /> : null}
                {data.duration ? <Fact icon={Hourglass} label="المدة" value={data.duration} /> : null}
                {data.volunteersNeeded ? <Fact icon={Users} label="العدد المطلوب" value={String(data.volunteersNeeded)} /> : null}
                {data.startDate ? <Fact icon={CalendarClock} label="تاريخ البدء" value={formatDay(data.startDate)} /> : null}
                <Fact icon={CalendarClock} label="التقديم" value={data.closesAt ? deadlineText(data.closesAt, data.daysLeft) : 'بدون موعد نهائي'} />
              </dl>
              {data.acceptingApplications ?
                <a href="#apply" className="mt-6 block rounded-xl bg-customOrange px-5 py-3 text-center text-sm font-extrabold text-white shadow-emc-md transition hover:brightness-105">قدّم الآن</a>
              : <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-black text-deepBlue/60">التقديم مغلق</p>}
            </aside>
          </div>
        )}
      </section>
    </div>
  )
}
