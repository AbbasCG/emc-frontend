import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Radio,
  RefreshCw,
  Route,
  Video,
  XCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { fetchInstructorSessions } from '@/api/instructorApi'
import { fetchInstructorLearningPaths, type LearningPath } from '@/api/learningPathsApi'
import type { LmsSession } from '@/types/lms'
import { enrichSessionTiming } from '@/utils/lmsSession'
import { InstructorHero } from '@/components/instructor'

/* ── Helpers ───────────────────────────────────────────────────────────── */

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('ar', {
      timeZone: 'Europe/Amsterdam',
      numberingSystem: 'latn',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('ar', {
      timeZone: 'Europe/Amsterdam',
      numberingSystem: 'latn',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

/* ── Status config ────────────────────────────────────────────────────── */

const STATUS_CFG = {
  live: {
    label: 'مباشرة الآن',
    badge: 'bg-rose-500 text-white ring-rose-400',
    dot: 'bg-rose-500',
    sectionIcon: <Radio className="h-3.5 w-3.5 text-rose-500 animate-pulse" />,
    sectionLabel: 'مباشرة الآن',
    sectionCls: 'text-rose-600',
  },
  scheduled: {
    label: 'قادمة',
    badge: 'bg-[#0077B6]/10 text-[#0077B6] ring-[#0077B6]/20',
    dot: 'bg-[#0077B6]',
    sectionIcon: <Clock className="h-3.5 w-3.5 text-[#0077B6]" />,
    sectionLabel: 'جلسات قادمة',
    sectionCls: 'text-[#0077B6]',
  },
  completed: {
    label: 'انتهت',
    badge: 'bg-slate-100 text-slate-500 ring-slate-200',
    dot: 'bg-slate-400',
    sectionIcon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    sectionLabel: 'جلسات منتهية',
    sectionCls: 'text-emerald-600',
  },
  cancelled: {
    label: 'ملغاة',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-400',
    sectionIcon: <XCircle className="h-3.5 w-3.5 text-amber-500" />,
    sectionLabel: 'جلسات ملغاة',
    sectionCls: 'text-amber-600',
  },
}

/* ── Session card ─────────────────────────────────────────────────────── */

function SessionRow({
  session,
  lpName,
  index,
}: {
  session: LmsSession
  lpName?: string
  index: number
}) {
  const cfg = STATUS_CFG[session.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.scheduled

  const dateDisplay = fmtDate(session.starts_at ?? session.date)
  const timeStart   = fmtTime(session.starts_at)
  const timeEnd     = session.ends_at ? fmtTime(session.ends_at) : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-[#0077B6]/30 hover:shadow-md"
    >
      {/* Status dot */}
      <div className="flex flex-col items-center pt-1">
        <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${cfg.dot}`} />
        <div className="mt-2 w-px flex-1 bg-slate-100" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-2">
        {/* Title + badge */}
        <div className="flex flex-wrap items-start gap-2">
          <p className="font-black leading-tight text-[#0C2A4B]">
            {session.title ?? `جلسة #${fmt(session.id)}`}
          </p>
          <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-black ring-1 ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        {/* Course + LP context */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
          {session.course_name && (
            <span className="inline-flex items-center gap-1 text-[#0077B6]">
              <BookOpen className="h-3 w-3" />
              {session.course_name}
            </span>
          )}
          {lpName && (
            <span className="inline-flex items-center gap-1 text-[#F28C00]">
              <Route className="h-3 w-3" />
              {lpName}
            </span>
          )}
        </div>

        {/* Date + time */}
        {(dateDisplay || timeStart) && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar className="h-3 w-3" />
            {dateDisplay}
            {timeStart && (
              <span className="mr-1" dir="ltr">
                {timeStart}{timeEnd ? ` – ${timeEnd}` : ''}
              </span>
            )}
          </div>
        )}

        {/* Location / meeting link */}
        {session.location && (
          <p className="flex items-center gap-1 text-[11px] text-slate-400">
            <MapPin className="h-3 w-3" /> {session.location}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col gap-2">
        {session.meeting_link && (
          <a
            href={session.meeting_link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0C2A4B] px-3 py-1.5 text-[11px] font-black text-white shadow-sm transition hover:bg-[#0077B6]"
          >
            <Video className="h-3.5 w-3.5" />
            انضمام
          </a>
        )}
        {session.course_id && (
          <a
            href={`/dashboard/instructor/courses/${session.course_id}/content`}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-[10px] font-black text-[#0C2A4B] transition hover:border-[#0077B6]/40 hover:text-[#0077B6]"
          >
            <ExternalLink className="h-3 w-3" />
            الدورة
          </a>
        )}
      </div>
    </motion.div>
  )
}

/* ── Section wrapper ──────────────────────────────────────────────────── */

function SessionSection({
  sessions,
  statusKey,
  lpMap,
}: {
  sessions: LmsSession[]
  statusKey: keyof typeof STATUS_CFG
  lpMap: Map<number, string>
}) {
  if (sessions.length === 0) return null
  const cfg = STATUS_CFG[statusKey]

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        {cfg.sectionIcon}
        <h2 className={`text-[12px] font-black uppercase tracking-widest ${cfg.sectionCls}`}>
          {cfg.sectionLabel}
        </h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
          {fmt(sessions.length)}
        </span>
      </div>
      <div className="space-y-3">
        {sessions.map((s, i) => (
          <SessionRow
            key={s.id}
            session={s}
            lpName={s.course_id != null ? lpMap.get(s.course_id) : undefined}
            index={i}
          />
        ))}
      </div>
    </section>
  )
}

/** Pure I/O — kept outside the component so the effect and the refresh button share it
 *  without either having to call a state-mutating function. */
async function fetchSessionsBundle(): Promise<{
  sessions: LmsSession[]
  paths: LearningPath[]
}> {
  const [rawSessions, paths] = await Promise.all([
    fetchInstructorSessions(),
    fetchInstructorLearningPaths().then((r) => r.paths).catch(() => [] as LearningPath[]),
  ])
  // Re-enrich all sessions with live timestamp-based status
  return { sessions: rawSessions.map((s) => enrichSessionTiming(s)), paths }
}

type Tab = 'all' | 'live' | 'scheduled' | 'completed' | 'cancelled'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',       label: 'الكل' },
  { key: 'scheduled', label: 'القادمة' },
  { key: 'live',      label: 'مباشرة' },
  { key: 'completed', label: 'المكتملة' },
  { key: 'cancelled', label: 'الملغاة' },
]

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function InstructorSessionsPage() {
  const [sessions,   setSessions]  = useState<LmsSession[]>([])
  const [lpPaths,    setLpPaths]   = useState<LearningPath[]>([])
  const [loading,    setLoading]   = useState(true)
  const [activeTab,  setActiveTab] = useState<Tab>('all')
  const [, setApiMissing] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const bundle = await fetchSessionsBundle()
        if (!alive) return
        setSessions(bundle.sessions)
        setLpPaths(bundle.paths)
        setApiMissing(false)
      } catch (err) {
        if (!alive || axios.isCancel(err)) return
        setApiMissing(true)
        if (import.meta.env.DEV) console.error('[sessions] load failed:', err)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  /** Imperative refresh from the toolbar button — outside an effect, so the synchronous
   *  loading flip is allowed. */
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const bundle = await fetchSessionsBundle()
      setSessions(bundle.sessions)
      setLpPaths(bundle.paths)
      setApiMissing(false)
    } catch (err) {
      if (!axios.isCancel(err)) {
        setApiMissing(true)
        if (import.meta.env.DEV) console.error('[sessions] load failed:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Build a map: course_id → learning_path_title
   * by iterating all learning paths and their included courses.
   */
  const lpMap = useMemo(() => {
    const m = new Map<number, string>()
    lpPaths.forEach((lp) => {
      ;(lp.courses ?? []).forEach((c) => {
        if (!m.has(c.id)) m.set(c.id, lp.title)
      })
    })
    return m
  }, [lpPaths])

  const grouped = useMemo(() => ({
    live:      sessions.filter((s) => s.status === 'live'),
    scheduled: sessions.filter((s) => s.status === 'scheduled'),
    completed: sessions.filter((s) => s.status === 'completed'),
    cancelled: sessions.filter((s) => s.status === 'cancelled'),
  }), [sessions])

  const tabCount = (tab: Tab) => {
    if (tab === 'all') return sessions.length
    return grouped[tab as keyof typeof grouped]?.length ?? 0
  }

  const visibleSessions = useMemo(() => {
    if (activeTab === 'all') return sessions
    return grouped[activeTab as keyof typeof grouped] ?? []
  }, [activeTab, sessions, grouped])

  const liveAndUpcomingCount = grouped.live.length + grouped.scheduled.length

  return (
    <div className="space-y-6 pb-16" dir="rtl">

      <InstructorHero
        title="الجلسات"
        subtitle="جلساتك من دوراتك ومساراتك التعليمية"
        backTo="/dashboard/instructor/courses"
        backLabel="الدورات"
        refreshing={loading}
        pills={loading ? [] : [
          { label: 'قادمة + مباشرة', value: fmt(liveAndUpcomingCount) },
          { label: 'منتهية',          value: fmt(grouped.completed.length) },
          { label: 'الكل',            value: fmt(sessions.length)          },
        ]}
      >
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/80 transition hover:bg-white/20 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </InstructorHero>

      {/* Tabs */}
      {!loading && sessions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const count = tabCount(tab.key)
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-black transition ${
                  active
                    ? 'bg-[#0C2A4B] text-white shadow-sm'
                    : 'bg-white text-[#0C2A4B]/60 ring-1 ring-slate-200 hover:ring-[#0077B6]/40'
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50">
            <Calendar className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-base font-black text-[#0C2A4B]">لا توجد جلسات مجدولة</p>
          <p className="mx-auto mt-2 max-w-xs text-[13px] text-slate-400">
            ستُعرض الجلسات المرتبطة بدوراتك ومساراتك التعليمية هنا
          </p>
        </div>
      ) : visibleSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <Calendar className="mb-3 h-8 w-8 text-slate-200" />
          <p className="font-black text-[#0C2A4B]">لا توجد جلسات في هذه الفئة</p>
        </div>
      ) : activeTab === 'all' ? (
        <div className="space-y-8">
          <SessionSection sessions={grouped.live}      statusKey="live"      lpMap={lpMap} />
          <SessionSection sessions={grouped.scheduled} statusKey="scheduled" lpMap={lpMap} />
          <SessionSection sessions={grouped.completed} statusKey="completed" lpMap={lpMap} />
          <SessionSection sessions={grouped.cancelled} statusKey="cancelled" lpMap={lpMap} />
        </div>
      ) : (
        <div className="space-y-3">
          {visibleSessions.map((s, i) => (
            <SessionRow key={s.id} session={s} lpName={s.course_id != null ? lpMap.get(s.course_id) : undefined} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
