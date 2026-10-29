import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Archive, ChevronLeft, ChevronRight, ExternalLink, Eye, EyeOff, FileText, Loader2, Lock, Pencil, Plus, RefreshCw, Rocket, ShieldAlert, Users } from 'lucide-react'
import DashboardPageShell from '@/components/ui/DashboardPageShell'
import toast from '@/lib/toast'
import { cn } from '@/lib/utils'
import { classifyIncomingError, incomingErrorMessage, type OpportunityDraft } from '@/api/hrIncomingRequestsApi'
import {
  createAdminOpportunity,
  fetchDepartmentOptions,
  fetchAdminOpportunities,
  fetchOpportunityApplicants,
  runOpportunityAction,
  updateAdminOpportunity,
  validationFields,
  type AdminOpportunity,
  type AdminOpportunityList,
  type OpportunityAction,
} from '@/api/volunteerOpportunitiesAdminApi'
import { ApplicantsPanel } from '@/components/hrIncoming/ApplicantsPanel'
import { OpportunityDraftModal } from '@/components/hrIncoming/OpportunityDraftModal'
import { formatDate } from '@/components/hrIncoming/hrIncomingUi'

/**
 * /dashboard/hr/opportunities — فرص التطوع.
 *
 * Where HR reviews, edits, publishes, unpublishes and closes volunteer opportunities, and sees who
 * applied. Opportunities generated from an incoming request and ones created here live together.
 *
 * Publishing is deliberately a two-step action (publish, then confirm) because it makes the
 * opportunity public. The server validates the mandatory content and the permission; this page
 * shows what is missing and reports a refusal. Publishing sends no notification.
 */

const TONE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 ring-slate-200',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closed: 'bg-amber-50 text-amber-800 ring-amber-200',
  archived: 'bg-slate-100 text-slate-500 ring-slate-200',
}

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'الكل' },
  { value: 'draft', label: 'مسودات' },
  { value: 'published', label: 'منشورة' },
  { value: 'closed', label: 'مغلقة' },
]

const BLANK: OpportunityDraft = {
  id: null, incomingRequestId: 0, departmentId: null, departmentName: null, title: '', summary: '', responsibilities: [], requiredSkills: [], preferredSkills: [],
  volunteersNeeded: null, availability: '', duration: '', locationMode: '', startDate: '', closesAt: '', applicationInstructions: '', status: 'draft', statusLabel: 'مسودة', isPublished: false, publishedAt: null,
}

function StateCard({ icon: Icon, title, body, action, danger = false }: { icon: typeof FileText; title: string; body: string; action?: React.ReactNode; danger?: boolean }) {
  return (
    <div role={danger ? 'alert' : 'status'} className="mx-auto max-w-lg rounded-3xl border border-deepBlue/[0.07] bg-white p-8 text-center shadow-sm">
      <span className={cn('mx-auto grid h-14 w-14 place-items-center rounded-full ring-1', danger ? 'bg-red-50 text-red-500 ring-red-100' : 'bg-customBlue/[0.07] text-customBlue ring-customBlue/15')}>
        <Icon size={26} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-black text-deepBlue">{title}</h2>
      <p className="mt-1.5 text-sm font-bold leading-relaxed text-deepBlue/60">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

function OpportunityRow({
  o,
  canManage,
  busy,
  onEdit,
  onAction,
}: {
  o: AdminOpportunity
  canManage: boolean
  busy: boolean
  onEdit: () => void
  onAction: (a: OpportunityAction) => void
}) {
  const [confirm, setConfirm] = useState<OpportunityAction | null>(null)
  const [showApplicants, setShowApplicants] = useState(false)
  const loadApplicants = useCallback(() => fetchOpportunityApplicants(o.id), [o.id])
  const missing = Object.values(o.missingForPublish)
  const canPublish = o.status === 'draft' || o.status === 'closed'

  function ask(a: OpportunityAction) {
    setConfirm(a)
  }
  function confirmAction() {
    if (confirm) onAction(confirm)
    setConfirm(null)
  }

  return (
    <li data-testid="opportunity-row" className="space-y-3 rounded-2xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1', TONE[o.status] ?? TONE.draft)} data-testid="opportunity-status">{o.statusLabel}</span>
            {o.status === 'published' && !o.acceptsApplications ? <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-800">انتهى موعد التقديم</span> : null}
            {o.incomingRequest ? <span className="rounded-full bg-customBlue/10 px-2.5 py-0.5 text-[10px] font-black text-customBlue">من طلب وارد</span> : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">فرصة مستقلة</span>}
          </div>
          <h3 className="text-sm font-black leading-snug text-deepBlue">{o.title}</h3>
          <p className="text-[11px] font-bold text-deepBlue/50">
            {o.departmentName ?? 'بدون قسم'}
            {o.closesAt ? ` · آخر موعد ${formatDate(o.closesAt)}` : ''}
            {o.publishedAt ? ` · نُشرت ${formatDate(o.publishedAt)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-black text-deepBlue">
          <Users size={14} className="text-customBlue" aria-hidden="true" />
          <span data-testid="applicants-count">{o.applicantsCount}</span> متقدم
        </div>
      </div>

      {o.status === 'draft' && missing.length > 0 ?
        <p className="rounded-xl bg-amber-50 p-3 text-[11px] font-bold leading-relaxed text-amber-900" data-testid="missing-fields">
          قبل النشر يلزم: {missing.join(' · ')}
        </p>
      : null}

      <div className="flex flex-wrap items-center gap-2">
        {canManage ?
          <button type="button" onClick={onEdit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-deepBlue/10 bg-white px-3.5 py-2 text-xs font-black text-deepBlue transition hover:bg-slate-50 disabled:opacity-60"><Pencil size={13} aria-hidden="true" /> تعديل</button>
        : null}
        {canManage && canPublish ?
          <button type="button" onClick={() => ask('publish')} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"><Rocket size={13} aria-hidden="true" /> نشر</button>
        : null}
        {canManage && o.status === 'published' ?
          <button type="button" onClick={() => ask('close')} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-black text-amber-800 transition hover:bg-amber-50 disabled:opacity-60"><Archive size={13} aria-hidden="true" /> إغلاق التقديم</button>
        : null}
        {canManage && (o.status === 'published' || o.status === 'closed') ?
          <button type="button" onClick={() => ask('unpublish')} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-deepBlue/10 bg-white px-3.5 py-2 text-xs font-black text-deepBlue transition hover:bg-slate-50 disabled:opacity-60"><EyeOff size={13} aria-hidden="true" /> إلغاء النشر</button>
        : null}
        {o.status === 'published' ?
          <Link to={`/volunteer-opportunities/${o.id}`} className="inline-flex items-center gap-1.5 text-xs font-black text-customBlue hover:underline"><Eye size={13} aria-hidden="true" /> الصفحة العامة</Link>
        : null}
        {o.incomingRequest ?
          <Link to="/dashboard/hr/incoming-requests" className="inline-flex items-center gap-1.5 text-xs font-black text-customBlue hover:underline"><ExternalLink size={13} aria-hidden="true" /> الطلب الوارد</Link>
        : null}
        <button type="button" onClick={() => setShowApplicants((v) => !v)} aria-expanded={showApplicants} className="inline-flex items-center gap-1.5 text-xs font-black text-deepBlue/70 hover:underline">
          <Users size={13} aria-hidden="true" /> {showApplicants ? 'إخفاء المتقدمين' : 'عرض المتقدمين'}
        </button>
      </div>

      {confirm ?
        <div role="alertdialog" aria-label="تأكيد الإجراء" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-customOrange/30 bg-customOrange/[0.07] p-3">
          <p className="text-xs font-black text-deepBlue">
            {confirm === 'publish' ? 'سيصبح ظاهرًا لجميع الزوار على الموقع، ويمكن التقديم عليه. لا يُرسَل أي إشعار تلقائيًا.'
            : confirm === 'close' ? 'سيتوقف استقبال طلبات جديدة وتبقى الطلبات الحالية متاحة للمراجعة.'
            : 'ستعود الفرصة مسودة ولن تظهر للزوار.'}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={confirmAction} className="rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white">{confirm === 'publish' ? 'تأكيد النشر' : confirm === 'close' ? 'تأكيد الإغلاق' : 'تأكيد إلغاء النشر'}</button>
            <button type="button" onClick={() => setConfirm(null)} className="rounded-xl border border-deepBlue/10 bg-white px-4 py-2 text-xs font-black text-deepBlue">تراجع</button>
          </div>
        </div>
      : null}

      {showApplicants ? <ApplicantsPanel load={loadApplicants} canReview={canManage} emptyText="لم يتقدم أحد على هذه الفرصة بعد." /> : null}
    </li>
  )
}

export default function HrOpportunitiesPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminOpportunityList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'forbidden' | 'error' | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [form, setForm] = useState<{ initial: OpportunityDraft; editingId: number | null } | null>(null)
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    const request = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetchAdminOpportunities({ status, page })
      if (request === requestRef.current) setData(res)
    } catch (e) {
      if (request === requestRef.current) {
        setData(null)
        setError(classifyIncomingError(e) === 'forbidden' ? 'forbidden' : 'error')
      }
    } finally {
      if (request === requestRef.current) setLoading(false)
    }
  }, [status, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when the filter or page changes; the loading flag must reset before the request
    void load()
  }, [load])

  useEffect(() => {
    // Department choices for a new, standalone opportunity.
    void fetchDepartmentOptions().then(setDepartments).catch(() => setDepartments([]))
  }, [])

  const caps = data?.capabilities
  const canManage = caps?.canManage === true

  async function act(o: AdminOpportunity, action: OpportunityAction) {
    setBusyId(o.id)
    try {
      const res = await runOpportunityAction(o.id, action)
      toast.success(res.message || 'تم تنفيذ الإجراء.')
      await load()
    } catch (e) {
      const fields = Object.values(validationFields(e))
      toast.error(fields.length > 0 ? `لا يمكن النشر: ${fields.join(' · ')}` : incomingErrorMessage(e, 'تعذّر تنفيذ الإجراء.'))
    } finally {
      setBusyId(null)
    }
  }

  function saved(d: OpportunityDraft) {
    toast.success(form?.editingId ? 'تم حفظ التعديلات.' : 'تم حفظ الفرصة كمسودة.')
    setForm(null)
    void load()
    return d
  }

  const refresh = (
    <div className="flex flex-wrap items-center gap-2">
      {canManage ?
        <button type="button" onClick={() => setForm({ initial: BLANK, editingId: null })} className="inline-flex items-center gap-2 rounded-xl bg-customBlue px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:brightness-105"><Plus size={14} aria-hidden="true" /> فرصة جديدة</button>
      : null}
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-deepBlue/10 bg-white px-4 py-2.5 text-xs font-black text-deepBlue shadow-sm transition hover:bg-customBlue/[0.05] disabled:opacity-60">
        <RefreshCw size={14} className={cn(loading && 'animate-spin')} aria-hidden="true" /> تحديث
      </button>
    </div>
  )

  return (
    <div dir="rtl" className="mx-auto w-full max-w-6xl">
      <DashboardPageShell
        eyebrow="الموارد البشرية"
        title="فرص التطوع"
        description="راجع فرص التطوع وعدّلها وانشرها للعامة، وتابع المتقدمين عليها."
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/dashboard/hr' }, { label: 'فرص التطوع' }]}
        actions={refresh}
      >
        {error === 'forbidden' ?
          <StateCard icon={Lock} danger title="لا تملك صلاحية عرض الفرص التطوعية" body="هذه الصفحة خاصة بفريق الموارد البشرية. تواصل مع المسؤول إن كنت تحتاجها." />
        : (
          <div className="space-y-5">
            {data ?
              <section aria-label="المؤشرات" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[['total', 'الإجمالي', data.stats.total], ['draft', 'مسودات', data.stats.draft], ['published', 'منشورة', data.stats.published], ['closed', 'مغلقة', data.stats.closed]].map(([k, label, n]) => (
                  <div key={k as string} data-testid={`kpi-${k}`} className="rounded-2xl border border-deepBlue/[0.07] bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-bold text-deepBlue/60">{label}</p>
                    <p className="mt-2 text-2xl font-black text-deepBlue">{n}</p>
                  </div>
                ))}
              </section>
            : null}

            <nav aria-label="حالة الفرصة" className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button key={f.value} type="button" onClick={() => { setStatus(f.value); setPage(1) }} aria-pressed={status === f.value} className={cn('rounded-full border px-4 py-2 text-xs font-black transition', status === f.value ? 'border-customBlue bg-customBlue text-white' : 'border-deepBlue/10 bg-white text-deepBlue/70 hover:text-deepBlue')}>{f.label}</button>
              ))}
            </nav>

            {loading && !data ?
              <div className="space-y-3" aria-busy="true" aria-label="جارٍ التحميل" data-testid="opportunities-admin-loading">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-deepBlue/[0.06]" />)}
              </div>
            : error ?
              <StateCard icon={ShieldAlert} danger title="تعذّر تحميل الفرص" body="حدث خطأ أثناء جلب البيانات. حاول مرة أخرى." action={<button type="button" onClick={() => void load()} className="rounded-xl bg-customOrange px-5 py-2.5 text-sm font-extrabold text-white shadow-emc-md">إعادة المحاولة</button>} />
            : data && data.items.length === 0 ?
              <StateCard icon={FileText} title={status ? 'لا توجد فرص بهذه الحالة' : 'لا توجد فرص بعد'} body="أنشئ فرصة جديدة، أو أنشئ مسودة من طلب احتياج وارد." />
            : data ?
              <div className={cn('space-y-4 transition-opacity', loading && 'opacity-60')}>
                <ul className="space-y-3" aria-label="قائمة الفرص">
                  {data.items.map((o) => (
                    <OpportunityRow
                      key={o.id}
                      o={o}
                      canManage={canManage}
                      busy={busyId === o.id}
                      onEdit={() => setForm({ initial: o, editingId: o.id })}
                      onAction={(a) => void act(o, a)}
                    />
                  ))}
                </ul>
                {data.meta.lastPage > 1 ?
                  <nav aria-label="التنقل بين الصفحات" className="flex items-center justify-center gap-3">
                    <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="inline-flex items-center gap-1 rounded-xl border border-deepBlue/10 bg-white px-3.5 py-2 text-xs font-black text-deepBlue disabled:opacity-50"><ChevronRight size={14} aria-hidden="true" /> السابق</button>
                    <span className="text-xs font-bold text-deepBlue/60">صفحة {data.meta.currentPage} من {data.meta.lastPage}</span>
                    <button type="button" onClick={() => setPage((p) => Math.min(data.meta.lastPage, p + 1))} disabled={page >= data.meta.lastPage || loading} className="inline-flex items-center gap-1 rounded-xl border border-deepBlue/10 bg-white px-3.5 py-2 text-xs font-black text-deepBlue disabled:opacity-50">التالي <ChevronLeft size={14} aria-hidden="true" /></button>
                  </nav>
                : null}
              </div>
            : null}

            {loading && data ? <p className="flex items-center justify-center gap-2 text-xs font-bold text-deepBlue/55" role="status"><Loader2 size={13} className="animate-spin" aria-hidden="true" /> جارٍ التحديث…</p> : null}
          </div>
        )}
      </DashboardPageShell>

      {form ?
        <OpportunityDraftModal
          key={form.editingId ?? 'new'}
          open
          initial={form.initial}
          title={form.editingId ? 'تعديل الفرصة' : 'فرصة جديدة'}
          subtitle="تُحفظ كمسودة. النشر إجراء منفصل وصريح من قائمة الفرص."
          departments={form.editingId ? undefined : departments}
          onSubmit={(input) => (form.editingId ? updateAdminOpportunity(form.editingId, input) : createAdminOpportunity(input))}
          onClose={() => setForm(null)}
          onSaved={saved}
        />
      : null}
    </div>
  )
}
