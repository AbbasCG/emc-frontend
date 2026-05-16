import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar,
  ChevronLeft,
  FileStack,
  FolderOpen,
  LayoutGrid,
  Users,
} from 'lucide-react'
import OpsPageSkeleton from '@/components/operations/OpsPageSkeleton'
import TaskCard from '@/components/operations/TaskCard'
import MeetingCard from '@/components/operations/MeetingCard'
import { fetchDepartmentDetail } from '@/api/operationsApi'
import { fetchTasks } from '@/api/tasksApi'
import { fetchMeetings } from '@/api/meetingsApi'
import { seedDepartmentDetail, seedMeetings, seedTasks } from '@/data/operationsSeed'
import DepartmentHealthBadge from '@/components/operations/DepartmentHealthBadge'
import type { DepartmentDetail, OpsMeeting, OpsTask } from '@/types/operations'

const tabs = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'sections', label: 'محاور' },
  { id: 'members', label: 'الأعضاء' },
  { id: 'tasks', label: 'المهام' },
  { id: 'meetings', label: 'الاجتماعات' },
  { id: 'files', label: 'ملفات' },
  { id: 'kpi', label: 'مؤشرات' },
] as const

type TabId = (typeof tabs)[number]['id']

export default function OpsDepartmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const departmentsListPath = location.pathname.startsWith('/dashboard/department')
    ? '/dashboard/department'
    : '/dashboard/admin/departments'

  const [detail, setDetail] = useState<DepartmentDetail | null>(null)
  const [tasks, setTasks] = useState<OpsTask[]>([])
  const [meetings, setMeetings] = useState<OpsMeeting[]>([])
  const [tab, setTab] = useState<TabId>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const [d, t, m] = await Promise.all([
          fetchDepartmentDetail(id),
          fetchTasks(),
          fetchMeetings(),
        ])
        if (!cancelled) {
          setDetail(d)
          setTasks(t.filter((x) => x.department_id === id))
          setMeetings(m.filter((x) => x.department_id === id))
        }
      } catch {
        const seedD = seedDepartmentDetail(id)
        if (!cancelled) {
          setDetail(seedD)
          setTasks(seedTasks().filter((x) => x.department_id === id))
          setMeetings(seedMeetings().filter((x) => x.department_id === id))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const title = detail?.title ?? 'إدارة'

  const tabContent = useMemo(() => {
    if (!detail) return null
    switch (tab) {
      case 'overview':
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 ring-1 ring-deepBlue/[0.06]">
              <h3 className="text-sm font-black text-deepBlue">الوصف</h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{detail.description}</p>
              <dl className="mt-6 grid gap-3 text-right text-xs font-bold text-slate-500">
                <div className="flex justify-between gap-2">
                  <dt>القائد</dt>
                  <dd className="text-deepBlue">{detail.leader_name ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>المهام المفتوحة</dt>
                  <dd className="text-customOrange">{detail.open_tasks}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl bg-deepBlue text-white p-6 shadow-xl ring-1 ring-white/10">
              <h3 className="text-sm font-black text-white/90">لقطة صحة</h3>
              <div className="mt-4 flex items-center justify-between">
                <DepartmentHealthBadge health={detail.status} />
                <span className="text-4xl font-black text-customOrange">{detail.health_score ?? '—'}</span>
              </div>
              <p className="mt-4 text-xs font-semibold leading-relaxed text-white/65">
                تُحدَّث المؤشرات تلقائياً عند ربط مسارات `/operations/departments/:id` بالخادم.
              </p>
            </div>
          </div>
        )
      case 'sections':
        return (
          <ul className="space-y-4">
            {(detail.sections ?? []).map((s, i) => (
              <li
                key={i}
                className="rounded-2xl border border-deepBlue/[0.06] bg-white px-5 py-4 text-right shadow-sm"
              >
                <p className="text-xs font-black text-customBlue">{s.title}</p>
                <p className="mt-2 text-sm font-medium text-slate-600">{s.body}</p>
              </li>
            ))}
          </ul>
        )
      case 'members':
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {(detail.members_preview ?? []).map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-deepBlue/[0.06]"
              >
                <Users size={18} className="text-customBlue" />
                <div className="text-right">
                  <p className="text-sm font-black text-deepBlue">{m.name}</p>
                  <p className="text-[11px] font-bold text-slate-500">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        )
      case 'tasks':
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} onOpen={() => navigate('/dashboard/admin/tasks')} />
            ))}
          </div>
        )
      case 'meetings':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {meetings.map((m) => (
              <MeetingCard key={m.id} m={m} />
            ))}
          </div>
        )
      case 'files':
        return (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center">
            <FileStack className="mx-auto text-slate-300" size={40} />
            <p className="mt-4 text-sm font-black text-deepBlue">مكتبة الملفات</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              placeholder — رفع المستندات ومزامنة التخزين عبر Phase 3 backend.
            </p>
          </div>
        )
      case 'kpi':
        return (
          <div className="grid gap-4 sm:grid-cols-3">
            {(detail.kpi_placeholder ?? []).map((k) => (
              <div
                key={k}
                className="rounded-2xl bg-gradient-to-br from-white to-sky-50/50 p-5 text-right ring-1 ring-deepBlue/[0.06]"
              >
                <LayoutGrid className="text-customOrange" size={20} />
                <p className="mt-3 text-sm font-black text-deepBlue">{k}</p>
                <p className="mt-2 text-[11px] font-bold text-slate-500">بانتظار البيانات الحية</p>
              </div>
            ))}
          </div>
        )
      default:
        return null
    }
  }, [detail, tab, tasks, meetings])

  if (loading || !id) return <OpsPageSkeleton />
  if (!detail) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center font-black text-deepBlue ring-1 ring-deepBlue/[0.06]">
        لم يتم العثور على الإدارة.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={departmentsListPath}
          className="inline-flex items-center gap-1 text-xs font-black text-customBlue hover:text-customOrange"
        >
          <ChevronLeft size={14} />
          كل الإدارات
        </Link>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.35rem] bg-white p-8 text-right shadow-lg ring-1 ring-deepBlue/[0.06]"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <DepartmentHealthBadge health={detail.status} />
          <div>
            <h1 className="text-2xl font-black text-deepBlue">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">{detail.description}</p>
            <div className="mt-4 flex flex-wrap justify-end gap-4 text-[11px] font-bold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Users size={14} /> {detail.members_count} أعضاء
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar size={14} /> {detail.meetings_week ?? 0} اجتماعات / أسبوع
              </span>
              <span className="inline-flex items-center gap-1">
                <FolderOpen size={14} /> {detail.open_tasks} مهام
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="flex flex-wrap justify-end gap-2 rounded-2xl bg-deepBlue/[0.03] p-2 ring-1 ring-deepBlue/[0.06]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'rounded-xl px-4 py-2 text-xs font-black transition',
              tab === t.id
                ? 'bg-deepBlue text-white shadow-md'
                : 'bg-white text-deepBlue ring-1 ring-deepBlue/[0.08] hover:border-customBlue/20',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tabContent}
      </motion.div>
    </div>
  )
}
