/**
 * Scoped LMS CMS: modules, sessions, materials, assignments for one course.
 * API paths (axios base URL should include `/api`):
 * - Admin / super_admin: `/admin/courses/{courseId}/…`
 * - Instructor: `/instructor/courses/{courseId}/…`
 */

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Layers,
  Calendar,
  ClipboardList,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import toast from '@/lib/toast'
import type { AxiosError } from 'axios'
import {
  adminCreateCourseAssignment,
  adminCreateCourseMaterial,
  adminCreateCourseModule,
  adminCreateCourseSession,
  adminDeleteCourseAssignment,
  adminDeleteCourseMaterial,
  adminDeleteCourseModule,
  adminDeleteCourseSession,
  adminReorderCourseModules,
  adminUpdateCourseAssignment,
  adminUpdateCourseMaterial,
  adminUpdateCourseModule,
  adminUpdateCourseSession,
  fetchCourseCmsContent,
  inferCourseCmsScopeFromUserRole,
  type CourseCmsScope,
} from '@/api/courseLearnApi'
import { getApiErrorMessage, getLaravelFieldErrors, withArabicValidationMessages } from '@/api/apiErrors'
import { notifyStudentScopeRefresh } from '@/api/studentApi'
import { useAuth } from '@/contexts/AuthContext'
import type { CourseLearnAssignment, CourseLearnMaterial, CourseLearnSession, StudentLearnCourseOverview } from '@/types/courseLearn'
import type { LmsModule } from '@/types/platform'

type TabId = 'modules' | 'sessions' | 'materials' | 'assignments'

/** Enable module ↑↓ + POST …/modules/reorder only when backend implements it (`VITE_LMS_MODULE_REORDER=true`). */
const LMS_SUPPORTS_MODULE_REORDER = import.meta.env.VITE_LMS_MODULE_REORDER === 'true'

/**
 * Convert API datetime (ISO, SQL, etc.) to `datetime-local` value in local time (`YYYY-MM-DDTHH:mm`).
 */
function isoOrDateToDatetimeLocal(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === '') return ''
  const s = String(raw).trim()
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) {
    const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
    return m ? `${m[1]}T${m[2]}` : s.slice(0, 16)
  }
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${day}T${h}:${min}`
}

/** Normalize `datetime-local` to API format `YYYY-MM-DDTHH:mm` (no seconds / timezone). */
function datetimeLocalToApi(value: string): string | undefined {
  const t = value.trim()
  if (!t) return undefined
  const m16 = t.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/)
  if (m16) return m16[1]
  const withSec = t.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?/)
  if (withSec) return `${withSec[1]}T${withSec[2]}`
  return t
}

function mergeServerErrors(e: unknown): Record<string, string> {
  return withArabicValidationMessages(getLaravelFieldErrors(e))
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-deepBlue/55 p-4 backdrop-blur-sm sm:items-center" dir="rtl">
      <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-[1] max-h-[92vh] w-full max-w-lg overflow-auto rounded-[1.5rem] border border-deepBlue/[0.08] bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-black text-deepBlue">{title}</h2>
          <button type="button" className="text-xs font-black text-deepBlue/55 hover:text-deepBlue" onClick={onClose}>
            إغلاق
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

export default function CourseContentManagerPage() {
  const { user } = useAuth()
  const { courseId: cid } = useParams()
  const courseId = Number(cid)
  const navigate = useNavigate()
  const valid = Number.isFinite(courseId) && courseId > 0
  const cmsScope = useMemo(() => inferCourseCmsScopeFromUserRole(user?.role), [user?.role])

  const [tab, setTab] = useState<TabId>('modules')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [mods, setMods] = useState<LmsModule[]>([])
  const [sess, setSess] = useState<CourseLearnSession[]>([])
  const [mats, setMats] = useState<CourseLearnMaterial[]>([])
  const [asgn, setAsgn] = useState<CourseLearnAssignment[]>([])
  const [courseMeta, setCourseMeta] = useState<StudentLearnCourseOverview | null>(null)

  const [modal, setModal] = useState<
    | { kind: 'module'; draft: Record<string, string>; editingId?: number }
    | { kind: 'session'; draft: Record<string, string>; editingId?: number }
    | { kind: 'material'; draft: Record<string, string>; editingId?: number; file?: File | null }
    | { kind: 'assignment'; draft: Record<string, string>; editingId?: number }
    | null
  >(null)

  const reload = useCallback(async () => {
    if (!valid) return
    setRefreshing(true)
    try {
      const b = await fetchCourseCmsContent(courseId, cmsScope)
      setCourseMeta(b.course ?? null)
      setMods([...b.modules].sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0)))
      setSess(b.sessions)
      setAsgn(b.assignments)
      setMats(b.materials)
    } catch (e) {
      toast.error(getApiErrorMessage(e as AxiosError))
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [courseId, valid, cmsScope])

  useEffect(() => {
    void reload()
  }, [reload])

  const sortedModuleIds = useMemo(() => [...mods].sort((a, b) => a.sort_order - b.sort_order).map((x) => x.id), [mods])

  async function reorderModules(ids: number[]) {
    if (!LMS_SUPPORTS_MODULE_REORDER) return
    try {
      await adminReorderCourseModules(courseId, ids, cmsScope)
      toast.success('تم حفظ ترتيب الوحدات')
      notifyStudentScopeRefresh()
      await reload()
    } catch (e) {
      toast.error(getApiErrorMessage(e as AxiosError))
    }
  }

  function moveModule(id: number, dir: -1 | 1) {
    if (!LMS_SUPPORTS_MODULE_REORDER) return
    const order = [...sortedModuleIds]
    const ix = order.indexOf(id)
    if (ix < 0) return
    const j = ix + dir
    if (j < 0 || j >= order.length) return
    ;[order[ix], order[j]] = [order[j]!, order[ix]!]
    void reorderModules(order)
  }

  if (!valid)
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50 p-8 text-center font-black text-rose-900">
        معرّف دورة غير صالح
      </div>
    )

  return (
    <div className="space-y-8 pb-24 text-right rtl" dir="rtl">
      <header className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-bl from-deepBlue via-[#1f3049] to-customBlue px-8 py-10 text-white shadow-2xl">
        <div aria-hidden className="pointer-events-none absolute -left-20 top-0 h-52 w-52 rounded-full bg-customOrange/30 blur-[90px]" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">إدارة LMS</p>
            <h1 className="mt-2 text-3xl font-black">{courseMeta?.title?.trim() || 'محتوى الدورة'}</h1>
            {courseMeta?.slug?.trim() ?
              <p className="mt-2 text-[12px] font-bold text-white/75">{courseMeta.slug}</p>
            : null}
            <p className="mt-3 max-w-xl text-[14px] font-semibold leading-relaxed text-white/82">
              أضِف الوحدات والجلسات والمواد والواجبات المعروضة على{' '}
              <code className="rounded bg-black/25 px-1.5 py-0.5 text-[11px] font-mono dir-ltr">/dashboard/student/learn/</code>{' '}
              عبر{' '}
              <code className="rounded bg-black/25 px-1.5 py-0.5 text-[11px] font-mono">GET …/student/courses/{'{id}'}/learn</code>.
            </p>
            <p className="mt-3 text-[11px] font-black text-white/72">
              واجهة البرمجة للمحتوى:{' '}
              <span className="rounded-lg bg-black/30 px-2 py-1 font-mono text-[10px] dir-ltr">
                {cmsScope === 'instructor' ? `/instructor/courses/${courseId}/…` : `/admin/courses/${courseId}/…`}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void reload()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/35 bg-white/12 px-5 py-3 text-[12px] font-black backdrop-blur transition hover:bg-white/20 disabled:opacity-55"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              تحديث
            </button>
            <Link
              to={`/dashboard/student/learn/${courseId}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-customOrange px-5 py-3 text-[12px] font-black shadow-lg hover:brightness-105"
              target="_blank"
              rel="noreferrer"
            >
              معاينة مساحة الطالب
              <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-2xl border border-white/25 px-5 py-3 text-[12px] font-black hover:bg-white/10"
            >
              رجوع
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 rounded-3xl border border-deepBlue/[0.06] bg-white/90 p-2 shadow-inner backdrop-blur">
        {(
          [
            ['modules', 'الوحدات', Layers],
            ['sessions', 'الجلسات', Calendar],
            ['materials', 'المواد', FolderOpen],
            ['assignments', 'الواجبات', ClipboardList],
          ] as const
        ).map(([id, lab, Ico]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[12px] font-black transition sm:flex-none ${
              tab === id ? 'bg-deepBlue text-white shadow-lg shadow-deepBlue/20' : 'text-deepBlue/55 hover:bg-slate-50'
            }`}
          >
            <Ico className="h-4 w-4 shrink-0" aria-hidden />
            {lab}
          </button>
        ))}
      </div>

      {loading ?
        <div className="flex min-h-[12rem] items-center justify-center rounded-3xl border border-deepBlue/[0.06] bg-white">
          <Loader2 className="h-10 w-10 animate-spin text-customBlue" aria-hidden />
        </div>
      : null}

      {!loading && tab === 'modules' ?
        <section className="space-y-4 rounded-3xl border border-deepBlue/[0.06] bg-white/92 p-6 shadow-emc backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-deepBlue">الوحدات</h2>
            <button
              type="button"
              onClick={() =>
                setModal({
                  kind: 'module',
                  draft: { title: '', sort_order: String(mods.length + 1), lessons_count: '0' },
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-customBlue px-4 py-2 text-[11px] font-black text-white"
            >
              <Plus className="h-4 w-4" aria-hidden />
              وحدة جديدة
            </button>
          </div>
          {mods.length === 0 ?
            <p className="rounded-2xl border border-dashed border-deepBlue/15 bg-emcBg/40 px-4 py-10 text-center text-[13px] font-semibold text-deepBlue/58">
              لا توجد وحدات — أنشئ أول وحدة لتظهر على محتوى التعلّم.
            </p>
          : (
            <div className="space-y-3">
              {sortedModuleIds.map((mid) => {
                const m = mods.find((x) => x.id === mid)!
                const ix = sortedModuleIds.indexOf(mid)
                return (
                  <div
                    key={mid}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-deepBlue/[0.06] bg-white px-4 py-3 shadow-sm ring-1 ring-deepBlue/[0.03]"
                  >
                    <div className="min-w-0 text-right">
                      <p className="font-black text-deepBlue">{m.title}</p>
                      <p className="mt-1 text-[11px] font-bold text-deepBlue/50">
                        الدروس: {m.lessons_count} · ترتيب #{m.sort_order}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        aria-label="أعلى"
                        disabled={!LMS_SUPPORTS_MODULE_REORDER || ix === 0}
                        title={!LMS_SUPPORTS_MODULE_REORDER ? 'ترتيب الوحدات غير مفعّل في الخادم' : undefined}
                        onClick={() => moveModule(mid, -1)}
                        className="rounded-xl border border-deepBlue/10 px-3 py-1.5 text-[11px] font-black disabled:opacity-35"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="أسفل"
                        disabled={!LMS_SUPPORTS_MODULE_REORDER || ix === sortedModuleIds.length - 1}
                        title={!LMS_SUPPORTS_MODULE_REORDER ? 'ترتيب الوحدات غير مفعّل في الخادم' : undefined}
                        onClick={() => moveModule(mid, 1)}
                        className="rounded-xl border border-deepBlue/10 px-3 py-1.5 text-[11px] font-black disabled:opacity-35"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setModal({
                            kind: 'module',
                            editingId: m.id,
                            draft: {
                              title: m.title,
                              sort_order: String(m.sort_order),
                              lessons_count: String(m.lessons_count),
                            },
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-deepBlue/15 px-3 py-1.5 text-[11px] font-black text-deepBlue"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> تعديل
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm('حذف هذه الوحدة؟')) return
                          try {
                            await adminDeleteCourseModule(courseId, m.id, cmsScope)
                            toast.success('تم الحذف')
                            notifyStudentScopeRefresh()
                            await reload()
                          } catch (e) {
                            toast.error(getApiErrorMessage(e as AxiosError))
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden /> حذف
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      : null}

      {!loading && tab === 'sessions' ?
        <section className="space-y-4 rounded-3xl border border-deepBlue/[0.06] bg-white/92 p-6 shadow-emc backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-deepBlue">الجلسات</h2>
            <button
              type="button"
              onClick={() =>
                setModal({
                  kind: 'session',
                  draft: {
                    title: '',
                    description: '',
                    start_at: '',
                    end_at: '',
                    meeting_url: '',
                    recording_url: '',
                    location_type: 'online',
                    location: '',
                    status: 'scheduled',
                  },
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-customBlue px-4 py-2 text-[11px] font-black text-white"
            >
              <Plus className="h-4 w-4" aria-hidden />
              جلسة جديدة
            </button>
          </div>
          {sess.length === 0 ?
            <p className="rounded-2xl border border-dashed border-deepBlue/15 bg-emcBg/40 px-4 py-10 text-center text-[13px] font-semibold text-deepBlue/58">
              لا توجد جلسات — سيظهر تنبيه نظيف على صفحة الطالب.
            </p>
          : (
            <div className="grid gap-3">
              {sess.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-deepBlue/[0.06] bg-white p-4 ring-1 ring-deepBlue/[0.03]"
                >
                  <div className="min-w-0 flex-1 text-right">
                    <p className="font-black text-deepBlue">{s.title ?? `جلسة #${s.id}`}</p>
                    <p className="mt-2 text-[12px] font-semibold leading-relaxed text-deepBlue/60">{s.description}</p>
                    <p className="mt-2 text-[11px] font-bold text-deepBlue/50">
                      {(s.start_at ?? s.starts_at ?? s.date ?? '—')?.toString()}{s.time ? ` · ${s.time}` : ''}
                    </p>
                    {s.meeting_url ?
                      <a
                        href={s.meeting_url}
                        className="mt-2 inline-flex text-[11px] font-black text-customBlue underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        رابط الاجتماع
                      </a>
                    : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setModal({
                          kind: 'session',
                          editingId: s.id,
                          draft: {
                            title: String(s.title ?? ''),
                            description: String(s.description ?? ''),
                            start_at: isoOrDateToDatetimeLocal(s.start_at ?? s.starts_at ?? ''),
                            end_at: isoOrDateToDatetimeLocal(s.end_at ?? s.ends_at ?? ''),
                            meeting_url: String(s.meeting_url ?? ''),
                            recording_url: String(s.recording_url ?? ''),
                            location_type: String(s.location_type ?? 'online'),
                            location: String(s.location ?? ''),
                            status: String(s.status ?? 'scheduled'),
                          },
                        })
                      }
                      className="rounded-xl border border-deepBlue/15 px-3 py-1.5 text-[11px] font-black"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('حذف الجلسة؟')) return
                        try {
                          await adminDeleteCourseSession(courseId, s.id, cmsScope)
                          toast.success('تم الحذف')
                          notifyStudentScopeRefresh()
                          await reload()
                        } catch (e) {
                          toast.error(getApiErrorMessage(e as AxiosError))
                        }
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-800"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      : null}

      {!loading && tab === 'materials' ?
        <section className="space-y-4 rounded-3xl border border-deepBlue/[0.06] bg-white/92 p-6 shadow-emc backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-deepBlue">المواد</h2>
            <button
              type="button"
              onClick={() =>
                setModal({
                  kind: 'material',
                  file: null,
                  draft: { title: '', description: '', kind: 'pdf', external_url: '', visibility: 'enrolled' },
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-customBlue px-4 py-2 text-[11px] font-black text-white"
            >
              <Plus className="h-4 w-4" aria-hidden />
              مادة جديدة
            </button>
          </div>
          {mats.length === 0 ?
            <p className="rounded-2xl border border-dashed border-deepBlue/15 bg-emcBg/40 px-4 py-10 text-center text-[13px] font-semibold text-deepBlue/58">
              لا توجد مواد لهذه الدورة.
            </p>
          : (
            <div className="grid gap-3 sm:grid-cols-2">
              {mats.map((m) => (
                <div key={m.id} className="rounded-2xl border border-deepBlue/[0.06] bg-white p-4 shadow-sm">
                  <p className="font-black text-deepBlue">{m.title}</p>
                  <p className="mt-1 text-[11px] font-bold text-deepBlue/50">{m.kind} · {m.visibility ?? '—'}</p>
                  {(m.external_url ?? m.url ?? m.file_url) ?
                    <a
                      href={String(m.external_url ?? m.url ?? m.file_url)}
                      className="mt-3 inline-block text-[11px] font-black text-customBlue underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      فتح الرابط / التحميل
                    </a>
                  : null}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setModal({
                          kind: 'material',
                          editingId: m.id,
                          file: null,
                          draft: {
                            title: m.title,
                            description: String(m.description ?? ''),
                            kind: String(m.kind ?? 'pdf'),
                            external_url: String(m.external_url ?? m.url ?? m.file_url ?? ''),
                            visibility: String(m.visibility ?? 'enrolled'),
                          },
                        })
                      }
                      className="rounded-xl border border-deepBlue/15 px-3 py-1.5 text-[11px] font-black"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('حذف المادة؟')) return
                        try {
                          await adminDeleteCourseMaterial(courseId, m.id, cmsScope)
                          toast.success('تم الحذف')
                          notifyStudentScopeRefresh()
                          await reload()
                        } catch (e) {
                          toast.error(getApiErrorMessage(e as AxiosError))
                        }
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-800"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      : null}

      {!loading && tab === 'assignments' ?
        <section className="space-y-4 rounded-3xl border border-deepBlue/[0.06] bg-white/92 p-6 shadow-emc backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-deepBlue">الواجبات</h2>
            <button
              type="button"
              onClick={() =>
                setModal({
                  kind: 'assignment',
                  draft: {
                    title: '',
                    description: '',
                    deadline: '',
                    max_points: '10',
                    submission_type: 'both',
                    required: '1',
                    visible: '1',
                  },
                })
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-customBlue px-4 py-2 text-[11px] font-black text-white"
            >
              <Plus className="h-4 w-4" aria-hidden />
              واجب جديد
            </button>
          </div>
          {asgn.length === 0 ?
            <p className="rounded-2xl border border-dashed border-deepBlue/15 bg-emcBg/40 px-4 py-10 text-center text-[13px] font-semibold text-deepBlue/58">
              لا واجبات — أنشئ واجبات لتظهر لطلاب هذه الدورة.
            </p>
          : (
            <div className="space-y-3">
              {asgn.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-deepBlue/[0.06] bg-white p-4"
                >
                  <div>
                    <p className="font-black text-deepBlue">{a.title}</p>
                    <p className="mt-1 text-[11px] font-bold text-deepBlue/50">
                      الموعد النهائي: {a.due_at ?? '—'} · نقاط: {a.max_points ?? '—'} · النوع: {a.submission_type}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setModal({
                          kind: 'assignment',
                          editingId: a.id,
                          draft: {
                            title: a.title,
                            description: String(a.description ?? ''),
                            deadline: isoOrDateToDatetimeLocal(a.due_at ?? ''),
                            max_points: String(a.max_points ?? 10),
                            submission_type: String(a.submission_type ?? 'both'),
                            required: a.required === false ? '0' : '1',
                            visible: a.visible === false ? '0' : '1',
                          },
                        })
                      }
                      className="rounded-xl border border-deepBlue/15 px-3 py-1.5 text-[11px] font-black"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('حذف الواجب؟')) return
                        try {
                          await adminDeleteCourseAssignment(courseId, a.id, cmsScope)
                          toast.success('تم الحذف')
                          notifyStudentScopeRefresh()
                          await reload()
                        } catch (e) {
                          toast.error(getApiErrorMessage(e as AxiosError))
                        }
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-800"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      : null}

      {modal?.kind === 'module' ?
        <ModuleModalBody
          modal={modal}
          cmsScope={cmsScope}
          onClose={() => setModal(null)}
          courseId={courseId}
          onSaved={() => {
            setModal(null)
            notifyStudentScopeRefresh()
            void reload()
          }}
        />
      : null}

      {modal?.kind === 'session' ?
        <SessionModalBody
          modal={modal}
          cmsScope={cmsScope}
          courseId={courseId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            notifyStudentScopeRefresh()
            void reload()
          }}
        />
      : null}

      {modal?.kind === 'material' ?
        <MaterialModalBody
          modal={modal}
          cmsScope={cmsScope}
          courseId={courseId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            notifyStudentScopeRefresh()
            void reload()
          }}
        />
      : null}

      {modal?.kind === 'assignment' ?
        <AssignmentModalBody
          modal={modal}
          cmsScope={cmsScope}
          courseId={courseId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            notifyStudentScopeRefresh()
            void reload()
          }}
        />
      : null}
    </div>
  )
}

/** Map Laravel keys (starts_at, due_at, …) onto our form field keys for display. */
function normalizeLaravelKeys(raw: Record<string, string>): Record<string, string> {
  const o = { ...raw }
  if (!o.start_at && raw.starts_at) o.start_at = raw.starts_at
  if (!o.end_at && raw.ends_at) o.end_at = raw.ends_at
  if (!o.deadline && raw.due_at) o.deadline = raw.due_at
  if (!o.file && raw.attachment) o.file = raw.attachment
  return o
}

function applyCmsValidationErrors(e: unknown, setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>) {
  const ax = e as AxiosError
  const fe = normalizeLaravelKeys(mergeServerErrors(e))
  setFieldErrors(fe)
  const st = ax.response?.status
  const hasFieldMsgs = Object.keys(fe).length > 0
  if (st !== 422 || !hasFieldMsgs) toast.error(getApiErrorMessage(ax))
}

/** Modal bodies */
function ModuleModalBody({
  modal,
  courseId,
  cmsScope,
  onClose,
  onSaved,
}: {
  modal: { draft: Record<string, string>; editingId?: number }
  courseId: number
  cmsScope: CourseCmsScope
  onClose: () => void
  onSaved: () => void
}) {
  const [d, setD] = useState(() => modal.draft)
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function clearKey(key: string) {
    setFieldErrors((p) => {
      const n = { ...p }
      delete n[key]
      return n
    })
  }

  async function submit() {
    setFieldErrors({})
    if (!d.title.trim()) {
      setFieldErrors({ title: 'العنوان مطلوب.' })
      return
    }
    setBusy(true)
    try {
      const body = {
        title: d.title.trim(),
        sort_order: Number(d.sort_order ?? 1),
        lessons_count: Number(d.lessons_count ?? 0),
      }

      modal.editingId ?
        await adminUpdateCourseModule(courseId, modal.editingId, body, cmsScope)
      : await adminCreateCourseModule(courseId, body, cmsScope)
      toast.success('تم حفظ الوحدة')

      onSaved()
    } catch (e: unknown) {
      applyCmsValidationErrors(e, setFieldErrors)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={modal.editingId ? 'تعديل وحدة' : 'وحدة جديدة'} onClose={onClose}>
      <div className="space-y-4">
        <Field
          label="العنوان"
          error={fieldErrors.title}
          value={d.title}
          on={(v) => {
            clearKey('title')
            setD({ ...d, title: v })
          }}
        />
        <Field
          label="الترتيب"
          error={fieldErrors.sort_order}
          value={d.sort_order}
          on={(v) => {
            clearKey('sort_order')
            setD({ ...d, sort_order: v })
          }}
          dir="ltr"
        />
        <Field
          label="عدد الدروس"
          error={fieldErrors.lessons_count}
          value={d.lessons_count}
          on={(v) => {
            clearKey('lessons_count')
            setD({ ...d, lessons_count: v })
          }}
          dir="ltr"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="w-full rounded-2xl bg-deepBlue py-3 text-[12px] font-black text-white"
        >
          {busy ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
      </div>
    </Modal>
  )
}

function SessionModalBody({
  modal,
  courseId,
  cmsScope,
  onClose,
  onSaved,
}: {
  modal: { draft: Record<string, string>; editingId?: number }
  courseId: number
  cmsScope: CourseCmsScope
  onClose: () => void
  onSaved: () => void
}) {
  const [d, setD] = useState(() => modal.draft)

  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function clearKey(key: string) {
    setFieldErrors((p) => {
      const n = { ...p }
      delete n[key]
      return n
    })
  }

  async function submit() {
    setFieldErrors({})
    setBusy(true)
    try {
      const body: Record<string, unknown> = {
        title: d.title.trim(),
        description: d.description || undefined,
        start_at: datetimeLocalToApi(d.start_at),
        end_at: datetimeLocalToApi(d.end_at),
        meeting_url: d.meeting_url || undefined,
        recording_url: d.recording_url || undefined,

        location_type: d.location_type,
        location: d.location || undefined,
        status: d.status,
      }

      modal.editingId ?
        await adminUpdateCourseSession(courseId, modal.editingId, body, cmsScope)
      : await adminCreateCourseSession(courseId, body, cmsScope)

      toast.success('تم حفظ الجلسة')

      onSaved()
    } catch (e: unknown) {
      applyCmsValidationErrors(e, setFieldErrors)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={modal.editingId ? 'تعديل الجلسة' : 'جلسة جديدة'} onClose={onClose}>
      <div className="max-h-[70vh] space-y-4 overflow-auto pr-1">
        <Field
          label="العنوان"
          error={fieldErrors.title}
          value={d.title}
          on={(v) => {
            clearKey('title')
            setD({ ...d, title: v })
          }}
        />
        <div>
          <span className="text-[11px] font-black text-deepBlue/55">الوصف</span>
          <textarea
            placeholder="الوصف"
            className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-[13px] font-semibold outline-none ring-2 ring-transparent focus:ring-customBlue/25 ${
              fieldErrors.description ? 'border-rose-400 ring-rose-100' : 'border-deepBlue/12'
            }`}
            rows={4}
            value={d.description}
            onChange={(ev) => {
              clearKey('description')
              setD({ ...d, description: ev.target.value })
            }}
          />
          {fieldErrors.description ?
            <p className="mt-1 text-[11px] font-bold text-rose-700">{fieldErrors.description}</p>
          : null}
        </div>
        <DatetimeField
          label="البداية"
          hint="التنسيق: YYYY-MM-DDTHH:mm"
          value={d.start_at}
          error={fieldErrors.start_at}
          on={(v) => {
            clearKey('start_at')
            setD({ ...d, start_at: v })
          }}
        />
        <DatetimeField
          label="النهاية"
          hint="اختياري"
          value={d.end_at}
          error={fieldErrors.end_at}
          on={(v) => {
            clearKey('end_at')
            setD({ ...d, end_at: v })
          }}
        />
        <Field
          label="رابط الاجتماع"
          error={fieldErrors.meeting_url}
          dir="ltr"
          value={d.meeting_url}
          on={(v) => {
            clearKey('meeting_url')
            setD({ ...d, meeting_url: v })
          }}
        />

        <Field
          label="التسجيل"
          error={fieldErrors.recording_url}
          dir="ltr"
          value={d.recording_url}
          on={(v) => {
            clearKey('recording_url')
            setD({ ...d, recording_url: v })
          }}
        />
        <SelectField
          label="نوع الشكل المكاني"
          error={fieldErrors.location_type}
          value={d.location_type}
          on={(v) => {
            clearKey('location_type')
            setD({ ...d, location_type: v })
          }}
          options={[['online', 'online'], ['offline', 'offline'], ['hybrid', 'hybrid']]}
        />

        <Field
          label="الموقع الفعلي"
          error={fieldErrors.location}
          value={d.location}
          on={(v) => {
            clearKey('location')
            setD({ ...d, location: v })
          }}
        />
        <SelectField
          label="الحالة"
          error={fieldErrors.status}
          value={d.status}
          on={(v) => {
            clearKey('status')
            setD({ ...d, status: v })
          }}
          options={[['scheduled', 'scheduled'], ['live', 'live'], ['completed', 'completed'], ['cancelled', 'cancelled']]}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="w-full rounded-2xl bg-deepBlue py-3 text-[12px] font-black text-white"
        >
          {busy ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
      </div>
    </Modal>
  )
}

function MaterialModalBody({
  modal,
  courseId,
  cmsScope,
  onClose,
  onSaved,
}: {
  modal: { draft: Record<string, string>; editingId?: number; file?: File | null }
  courseId: number
  cmsScope: CourseCmsScope
  onClose: () => void
  onSaved: () => void
}) {
  const [d, setD] = useState(() => modal.draft)

  const [file, setFile] = useState<File | null>(modal.file ?? null)

  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function clearKey(key: string) {
    setFieldErrors((p) => {
      const n = { ...p }
      delete n[key]
      return n
    })
  }

  function buildMaterialFormData(): FormData {
    const fd = new FormData()
    fd.append('title', d.title.trim())
    fd.append('description', d.description)
    fd.append('kind', d.kind)
    fd.append('visibility', d.visibility)
    if (d.external_url.trim()) fd.append('external_url', d.external_url.trim())
    return fd
  }

  async function submit() {
    setFieldErrors({})
    if (!d.title.trim()) {
      setFieldErrors({ title: 'العنوان مطلوب.' })
      return
    }
    setBusy(true)
    try {
      if (file) {
        const fd = buildMaterialFormData()
        fd.append('file', file)
        modal.editingId ?
          await adminUpdateCourseMaterial(courseId, modal.editingId, fd, cmsScope)
        : await adminCreateCourseMaterial(courseId, fd, cmsScope)
      } else {
        const body: Record<string, unknown> = {
          title: d.title.trim(),

          description: d.description || undefined,

          kind: d.kind,

          external_url: d.external_url.trim() || undefined,
          visibility: d.visibility,
        }

        modal.editingId ?
          await adminUpdateCourseMaterial(courseId, modal.editingId, body as Record<string, unknown>, cmsScope)
        : await adminCreateCourseMaterial(courseId, body, cmsScope)
      }

      toast.success('تم حفظ المادة')

      onSaved()
    } catch (e: unknown) {
      applyCmsValidationErrors(e, setFieldErrors)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={modal.editingId ? 'تعديل مادة' : 'مادة جديدة'} onClose={onClose}>
      <div className="space-y-4">
        <Field
          label="العنوان"
          error={fieldErrors.title}
          value={d.title}
          on={(v) => {
            clearKey('title')
            setD({ ...d, title: v })
          }}
        />
        <div>
          <span className="text-[11px] font-black text-deepBlue/55">الوصف</span>
          <textarea
            placeholder="الوصف"
            className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-[13px] font-semibold ${
              fieldErrors.description ? 'border-rose-400 ring-1 ring-rose-100' : 'border-deepBlue/12'
            }`}
            rows={3}
            value={d.description}
            onChange={(ev) => {
              clearKey('description')
              setD({ ...d, description: ev.target.value })
            }}
          />
          {fieldErrors.description ?
            <p className="mt-1 text-[11px] font-bold text-rose-700">{fieldErrors.description}</p>
          : null}
        </div>
        <SelectField
          label="النوع"
          error={fieldErrors.kind}
          value={d.kind}
          on={(v) => {
            clearKey('kind')
            setD({ ...d, kind: v })
          }}
          options={[
            ['pdf', 'pdf'],
            ['video', 'video'],
            ['link', 'link'],
            ['slides', 'slides'],
            ['document', 'document'],
            ['other', 'other'],
          ]}
        />

        <Field
          label="الرابط الخارجي"
          error={fieldErrors.external_url}
          hint="بديل عن رفع ملف"
          dir="ltr"
          value={d.external_url}
          on={(v) => {
            clearKey('external_url')
            setD({ ...d, external_url: v })
          }}
        />

        <SelectField
          label="الإظهار"
          error={fieldErrors.visibility}
          value={d.visibility}
          on={(v) => {
            clearKey('visibility')
            setD({ ...d, visibility: v })
          }}
          options={[['public', 'public'], ['enrolled', 'enrolled']]}
        />

        <div className="text-right">
          <p className="text-[11px] font-bold text-deepBlue/55">رفع ملف (مرفق — multipart/form-data)</p>

          <input
            type="file"
            className={`mt-2 block w-full text-[12px] ${fieldErrors.file ? 'rounded border border-rose-300 p-1' : ''}`}
            onChange={(e) => {
              clearKey('file')
              setFile(e.target.files?.[0] ?? null)
            }}
          />
          {fieldErrors.file ? <p className="mt-1 text-[11px] font-bold text-rose-700">{fieldErrors.file}</p> : null}
        </div>

        <button type="button" disabled={busy} onClick={() => void submit()} className="w-full rounded-2xl bg-deepBlue py-3 text-[12px] font-black text-white">
          {busy ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
      </div>
    </Modal>
  )
}

function AssignmentModalBody({
  modal,
  courseId,
  cmsScope,
  onClose,
  onSaved,
}: {
  modal: { draft: Record<string, string>; editingId?: number }
  courseId: number
  cmsScope: CourseCmsScope
  onClose: () => void
  onSaved: () => void
}) {
  const [d, setD] = useState(() => modal.draft)

  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function clearKey(key: string) {
    setFieldErrors((p) => {
      const n = { ...p }
      delete n[key]
      return n
    })
  }

  async function submit() {
    setFieldErrors({})
    setBusy(true)

    try {
      const due = datetimeLocalToApi(d.deadline)
      const body: Record<string, unknown> = {
        title: d.title.trim(),
        description: d.description || undefined,
        deadline: due,
        due_at: due,
        max_points: Number(d.max_points ?? 10),
        submission_type: d.submission_type,

        required: d.required !== '0',
        visible: d.visible !== '0',
      }

      modal.editingId ?
        await adminUpdateCourseAssignment(courseId, modal.editingId, body, cmsScope)
      : await adminCreateCourseAssignment(courseId, body, cmsScope)

      toast.success('تم حفظ الواجب')

      onSaved()
    } catch (e: unknown) {
      applyCmsValidationErrors(e, setFieldErrors)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={modal.editingId ? 'تعديل الواجب' : 'واجب جديد'} onClose={onClose}>
      <div className="space-y-4">
        <Field
          label="العنوان"
          error={fieldErrors.title}
          value={d.title}
          on={(v) => {
            clearKey('title')
            setD({ ...d, title: v })
          }}
        />
        <div>
          <span className="text-[11px] font-black text-deepBlue/55">الوصف للطالب</span>
          <textarea
            placeholder="الوصف للطالب"
            className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-[13px] font-semibold ${
              fieldErrors.description ? 'border-rose-400 ring-1 ring-rose-100' : 'border-deepBlue/12'
            }`}
            rows={3}
            value={d.description}
            onChange={(ev) => {
              clearKey('description')
              setD({ ...d, description: ev.target.value })
            }}
          />
          {fieldErrors.description ?
            <p className="mt-1 text-[11px] font-bold text-rose-700">{fieldErrors.description}</p>
          : null}
        </div>
        <DatetimeField
          label="الموعد النهائي"
          hint="التنسيق: YYYY-MM-DDTHH:mm"
          value={d.deadline}
          error={fieldErrors.deadline ?? fieldErrors.due_at}
          on={(v) => {
            clearKey('deadline')
            clearKey('due_at')
            setD({ ...d, deadline: v })
          }}
        />
        <Field
          label="الدرجة القصوى"
          error={fieldErrors.max_points}
          dir="ltr"
          value={d.max_points}
          on={(v) => {
            clearKey('max_points')
            setD({ ...d, max_points: v })
          }}
        />
        <SelectField
          label="نوع التسليم"
          error={fieldErrors.submission_type}
          value={d.submission_type}
          on={(v) => {
            clearKey('submission_type')
            setD({ ...d, submission_type: v })
          }}
          options={[
            ['text', 'text'],
            ['file', 'file'],
            ['both', 'both'],
          ]}
        />

        <SelectField
          label="إجباري"
          error={fieldErrors.required}
          value={d.required}
          on={(v) => {
            clearKey('required')
            setD({ ...d, required: v })
          }}
          options={[
            ['1', 'نعم'],
            ['0', 'لا'],
          ]}
        />

        <SelectField
          label="ظاهر"
          error={fieldErrors.visible}
          value={d.visible}
          on={(v) => {
            clearKey('visible')
            setD({ ...d, visible: v })
          }}
          options={[
            ['1', 'نعم'],
            ['0', 'لا'],
          ]}
        />

        <button type="button" disabled={busy} onClick={() => void submit()} className="w-full rounded-2xl bg-deepBlue py-3 text-[12px] font-black text-white">
          {busy ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
      </div>
    </Modal>
  )
}

function Field({
  label,
  value,
  on,
  hint,
  dir = 'rtl',
  type = 'text',
  error,
}: {
  label: string
  value: string
  on: (v: string) => void
  hint?: string
  dir?: 'rtl' | 'ltr'
  type?: string
  error?: string
}) {
  return (
    <label className="block text-right">
      <span className="text-[11px] font-black text-deepBlue/55">{label}</span>
      {hint ? <span className="mr-2 text-[10px] font-bold text-deepBlue/40">{hint}</span> : null}
      <input
        type={type}
        dir={dir}
        className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[13px] font-semibold outline-none focus:ring-2 focus:ring-customBlue/25 ${
          error ? 'border-rose-400 ring-1 ring-rose-200' : 'border-deepBlue/12'
        }`}
        value={value}
        onChange={(e) => on(e.target.value)}
      />
      {error ? <p className="mt-1 text-[11px] font-bold text-rose-700">{error}</p> : null}
    </label>
  )
}

function DatetimeField({
  label,
  value,
  on,
  hint,
  error,
}: {
  label: string
  value: string
  on: (v: string) => void
  hint?: string
  error?: string
}) {
  return (
    <label className="block text-right">
      <span className="text-[11px] font-black text-deepBlue/55">{label}</span>
      {hint ? <span className="mr-2 text-[10px] font-bold text-deepBlue/40">{hint}</span> : null}
      <input
        type="datetime-local"
        dir="ltr"
        step={60}
        className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[13px] font-semibold outline-none focus:ring-2 focus:ring-customBlue/25 ${
          error ? 'border-rose-400 ring-1 ring-rose-200' : 'border-deepBlue/12'
        }`}
        value={value}
        onChange={(e) => on(e.target.value)}
      />
      {error ? <p className="mt-1 text-[11px] font-bold text-rose-700">{error}</p> : null}
    </label>
  )
}

function SelectField({
  label,
  value,
  on,
  options,
  error,
}: {
  label: string
  value: string
  on: (v: string) => void
  options: [string, string][]
  error?: string
}) {
  return (
    <label className="block text-right">
      <span className="text-[11px] font-black text-deepBlue/55">{label}</span>
      <select
        dir="ltr"
        className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[13px] font-semibold ${
          error ? 'border-rose-400 ring-1 ring-rose-200' : 'border-deepBlue/12'
        }`}
        value={value}
        onChange={(e) => on(e.target.value)}
      >
        {options.map(([v, lab]) => (
          <option key={v} value={v}>
            {lab}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-[11px] font-bold text-rose-700">{error}</p> : null}
    </label>
  )
}
