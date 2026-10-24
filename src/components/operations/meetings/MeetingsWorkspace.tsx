import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  AlertTriangle, CalendarCheck2, CalendarPlus, ChevronLeft, ChevronRight, Flag, LayoutDashboard, Lock, Plus, RefreshCw, SearchX, Users,
} from 'lucide-react'
import type { MeetingsQuery, MeetingsWhen } from '@/api/meetingsApi'
import { usePageAccess } from '@/contexts/PageAccessContext'
import MeetingCard from '@/components/operations/MeetingCard'
import CreateMeetingForm from '@/components/operations/CreateMeetingForm'
import MeetingReportModal from '@/components/operations/MeetingReportModal'
import type { MeetingType, OpsMeeting } from '@/types/operations'
import { MeetingDetailsDrawer } from './MeetingDetailsDrawer'
import { MeetingsFilters } from './MeetingsFilters'
import { MeetingsKpis } from './MeetingsKpis'
import { EMPTY_MEETING_FILTERS, activeMeetingFilterCount, type MeetingFilters } from './meetingsUi'
import { useDebounced, useMeetings } from './useMeetings'
import { useMeetingAttendance } from './useMeetingAttendance'

/**
 * One workspace, two surfaces over the SAME meetings:
 *  - "admin"  (/dashboard/admin/meetings): the schedule - create and follow meetings.
 *  - "lounge" (/dashboard/department/meeting-lounge): the department view - read
 *    meetings in scope and file each meeting's single official report.
 *
 * What a person can do comes from the server (`access`, per-meeting
 * `capabilities`); nothing here is decided by role names or page access.
 */

export type WorkspaceMode = 'admin' | 'lounge'

const WHEN_TABS: Array<{ value: MeetingsWhen | ''; label: string }> = [
  { value: 'upcoming', label: 'القادمة' },
  { value: 'live', label: 'الجارية الآن' },
  { value: 'past', label: 'السابقة' },
  { value: '', label: 'الكل' },
]

const PAGE_SIZE = 12

const COPY: Record<WorkspaceMode, { eyebrow: string; title: string; description: string; basePath: string }> = {
  admin: {
    eyebrow: 'الاجتماعات',
    title: 'جدول الاجتماعات',
    description: 'هنا تُجدول الاجتماعات وتُتابَع حالتها. التقرير الرسمي لكل اجتماع يُرفع من صالة الاجتماعات، ويراه فريق الجودة فور رفعه.',
    basePath: '/dashboard/admin/meetings',
  },
  lounge: {
    eyebrow: 'الإدارات',
    title: 'صالة الاجتماعات الذكية',
    description: 'عرض الاجتماعات وجدولة التقارير الرسمية وربطها بإدارة الجودة.',
    basePath: '/dashboard/department/meeting-lounge',
  },
}

const QUICK_TYPES: Array<{ type: MeetingType; title: string; hint: string; icon: typeof Users; tone: string }> = [
  { type: 'department', title: 'اجتماع داخلي للإدارة', hint: 'لقاء دوري للأعضاء والوحدات', icon: Users, tone: 'bg-brand-50 text-brand-600' },
  { type: 'executive', title: 'اجتماع مع الإدارة العليا', hint: 'رفع التقارير ومناقشة التوجهات', icon: LayoutDashboard, tone: 'bg-ink-50 text-ink-500' },
  { type: 'general', title: 'اجتماع حدث أو مسار خاص', hint: 'هاكاثون، معسكر، فعالية مخصصة', icon: Flag, tone: 'bg-accent-50 text-accent-700' },
]

export function MeetingsWorkspace({ mode }: { mode: WorkspaceMode }) {
  const copy = COPY[mode]
  const { canAccessPath } = usePageAccess()

  const [filters, setFilters] = useState<MeetingFilters>(EMPTY_MEETING_FILTERS)
  const [page, setPage] = useState(1)
  // The lounge opens on what is coming up; the admin schedule opens on everything.
  const [when, setWhen] = useState<MeetingsWhen | ''>(mode === 'lounge' ? 'upcoming' : '')
  const [openId, setOpenId] = useState<number | null>(null)
  const [formType, setFormType] = useState<MeetingType | null>(null)
  const [reportFor, setReportFor] = useState<{ id: number; title: string } | null>(null)

  const debouncedQ = useDebounced(filters.q.trim(), 300)

  const query = useMemo<MeetingsQuery>(
    () => ({
      page,
      per_page: PAGE_SIZE,
      ...(when ? { when } : {}),
      ...(debouncedQ ? { q: debouncedQ } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.department_id !== '' ? { department_id: filters.department_id } : {}),
      ...(filters.date_from ? { date_from: filters.date_from } : {}),
      ...(filters.date_to ? { date_to: filters.date_to } : {}),
      ...(filters.report_status ? { report_status: filters.report_status } : {}),
    }),
    [page, when, debouncedQ, filters.type, filters.department_id, filters.date_from, filters.date_to, filters.report_status],
  )

  const { data, error, initialLoading, refreshing, reload, patchMeeting } = useMeetings(query)
  const attendance = useMeetingAttendance(patchMeeting)

  const rows = data?.rows ?? []
  const access = data?.access
  const canCreate = access?.can_create === true
  const filtersActive = activeMeetingFilterCount(filters) > 0 || (mode === 'lounge' && when !== '')
  const departmentChoices = access?.creatable_departments ?? []

  function changeFilters(next: MeetingFilters) {
    setFilters(next)
    setPage(1)
  }

  function openForm(type: MeetingType) {
    setFormType(type)
  }

  function onSaved(_meeting: OpsMeeting) {
    // Clear any filter that could hide the new meeting, then refetch so it is on screen at once.
    setFormType(null)
    setFilters(EMPTY_MEETING_FILTERS)
    setWhen('')
    setPage(1)
    reload()
  }

  function startReport(id: number) {
    setOpenId(null)
    setReportFor({ id, title: rows.find((m) => m.id === id)?.title ?? '' })
  }

  const showAdminLink = mode === 'lounge' && canAccessPath('/dashboard/admin/meetings') === true
  const showLoungeLink = mode === 'admin' && canAccessPath('/dashboard/department/meeting-lounge') === true
  const showReportsLink = canAccessPath('/dashboard/operations/meeting-reports') === true

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black tracking-[0.25em] text-accent-700">{copy.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black text-navy sm:text-3xl">{copy.title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm font-medium leading-7 text-muted-500">{copy.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reload}
            aria-label="تحديث القائمة"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-navy shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
            تحديث
          </button>
          {mode === 'admin' && canCreate && (
            <button
              type="button"
              onClick={() => openForm('general')}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-600"
            >
              <Plus size={16} aria-hidden="true" />
              اجتماع جديد
            </button>
          )}
        </div>
      </header>

      {(showAdminLink || showLoungeLink || showReportsLink) && (
        <nav aria-label="صفحات الاجتماعات" className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-brand-50 px-4 py-3 text-xs font-bold text-brand-700">
          <span className="text-muted-600">
            {mode === 'admin' ? 'للمتابعة بعد الانعقاد:' : 'صفحات مرتبطة:'}
          </span>
          {showLoungeLink && <Link to="/dashboard/department/meeting-lounge" className="hover:underline">صالة الاجتماعات (رفع التقارير)</Link>}
          {showAdminLink && <Link to="/dashboard/admin/meetings" className="hover:underline">جدول الاجتماعات (للجدولة والإدارة)</Link>}
          {showReportsLink && <Link to="/dashboard/operations/meeting-reports" className="hover:underline">تقارير الاجتماعات (للجودة)</Link>}
        </nav>
      )}

      {mode === 'lounge' && canCreate && (
        <section aria-label="جدولة اجتماع جديد" className="grid gap-3 sm:grid-cols-3">
          {QUICK_TYPES.map(({ type, title, hint, icon: Icon, tone }) => (
            <button
              key={type}
              type="button"
              onClick={() => openForm(type)}
              className="group flex items-center gap-3 rounded-3xl border border-line bg-white p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`} aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-navy">{title}</span>
                <span className="block truncate text-[11px] font-semibold text-muted-500">{hint}</span>
              </span>
              <CalendarPlus size={16} className="ms-auto shrink-0 text-muted-300 transition group-hover:text-brand-500" aria-hidden="true" />
            </button>
          ))}
        </section>
      )}

      {!error && <MeetingsKpis stats={data?.stats ?? null} loading={initialLoading} />}

      {mode === 'lounge' && (
        <div role="tablist" aria-label="تصنيف الاجتماعات حسب الوقت" className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5 shadow-sm">
          {WHEN_TABS.map((t) => (
            <button
              key={t.value || 'all'}
              type="button"
              role="tab"
              aria-selected={when === t.value}
              onClick={() => {
                setWhen(t.value)
                setPage(1)
              }}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black transition ${when === t.value ? 'bg-navy text-white' : 'text-muted-600 hover:bg-slate-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <MeetingsFilters value={filters} onChange={changeFilters} departments={departmentChoices.length > 1 ? departmentChoices : []} />

      {error ? (
        <section role="alert" className="rounded-3xl border border-rose-100 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500" aria-hidden="true">
            {error.kind === 'forbidden' ? <Lock size={26} /> : <AlertTriangle size={26} />}
          </span>
          <h2 className="mt-4 text-base font-black text-navy">
            {error.kind === 'forbidden' || error.kind === 'unauthenticated' ? error.title : 'تعذّر تحميل الاجتماعات'}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm font-medium leading-7 text-muted-500">{error.message}</p>
          {error.retryable && (
            <button type="button" onClick={reload} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600">
              <RefreshCw size={15} aria-hidden="true" />
              إعادة المحاولة
            </button>
          )}
        </section>
      ) : initialLoading ? (
        <ul aria-busy="true" aria-label="جارٍ تحميل الاجتماعات" className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="h-36 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-line bg-white p-12 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500" aria-hidden="true">
            {filtersActive ? <SearchX size={26} /> : <CalendarCheck2 size={26} />}
          </span>
          <h2 className="mt-4 text-base font-black text-navy">{filtersActive ? 'لا توجد اجتماعات مطابقة' : 'لا توجد اجتماعات حاليًا'}</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm font-medium leading-7 text-muted-500">
            {filtersActive
              ? 'جرّب تعديل البحث أو توسيع نطاق التاريخ.'
              : canCreate
                ? 'ابدأ بجدولة أول اجتماع. سيظهر هنا لأعضاء الإدارة المعنية.'
                : 'ستظهر هنا اجتماعات إدارتك عند جدولتها.'}
          </p>
          {filtersActive ? (
            <button
              type="button"
              onClick={() => {
                changeFilters(EMPTY_MEETING_FILTERS)
                setWhen('')
              }}
              className="mt-5 rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-navy transition hover:bg-slate-50"
            >
              مسح التصفية
            </button>
          ) : canCreate ? (
            <button type="button" onClick={() => openForm('general')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-600">
              <Plus size={16} aria-hidden="true" />
              اجتماع جديد
            </button>
          ) : null}
        </section>
      ) : (
        <>
          <ul className={`grid gap-4 transition-opacity lg:grid-cols-2 ${refreshing ? 'opacity-60' : ''}`} aria-busy={refreshing} data-testid="meetings-list">
            {rows.map((m) => (
              <MeetingCard
                key={m.id}
                m={m}
                onOpen={setOpenId}
                onUploadReport={startReport}
                onJoin={(id) => void attendance.join(id, m.meeting_url)}
                onConfirm={(id) => void attendance.confirm(id)}
                busyId={attendance.busyId}
              />
            ))}
          </ul>

          {data && data.lastPage > 1 && (
            <nav aria-label="التنقل بين الصفحات" className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold text-navy transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={15} aria-hidden="true" />
                السابق
              </button>
              <span className="text-xs font-bold tabular-nums text-muted-500">صفحة {data.page} من {data.lastPage} · {data.total} اجتماع</span>
              <button
                type="button"
                disabled={page >= data.lastPage}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold text-navy transition hover:bg-slate-50 disabled:opacity-40"
              >
                التالي
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}

      {openId !== null && (
        <MeetingDetailsDrawer
          key={openId}
          meetingId={openId}
          titleHint={rows.find((m) => m.id === openId)?.title}
          basePath={copy.basePath}
          onClose={() => setOpenId(null)}
          onUploadReport={startReport}
          onUpdated={patchMeeting}
        />
      )}

      {formType !== null && (
        <CreateMeetingForm
          initialType={formType}
          hideTypeSelector={mode === 'lounge'}
          departments={access?.creatable_departments ?? null}
          onClose={() => setFormType(null)}
          onSaved={onSaved}
        />
      )}

      {reportFor && (
        <MeetingReportModal
          meetingId={reportFor.id}
          meetingTitle={reportFor.title}
          onClose={() => setReportFor(null)}
          onDuplicate={reload}
          onSuccess={(meeting) => {
            patchMeeting(meeting)
            setReportFor(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
