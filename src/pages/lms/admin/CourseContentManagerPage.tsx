/**
 * Scoped LMS CMS: modules, sessions, materials, assignments for one course.
 * API paths (axios base URL should include `/api`):
 * - Admin / super_admin: `/admin/courses/{courseId}/…`
 * - Instructor: `/instructor/courses/{courseId}/…`
 */

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal'
import {
  CmsDatetimeField,
  CmsField,
  CmsFormModal,
  CmsFormSection,
  CmsSelect,
  CmsTextarea,
  MATERIAL_KIND_OPTIONS,
  normalizeSessionLocationType,
  SESSION_LOCATION_OPTIONS,
  SESSION_STATUS_OPTIONS,
  sessionShowsLocation,
  sessionShowsMeetingUrl,
  SUBMISSION_TYPE_OPTIONS,
  validateSessionDraft,
  VISIBILITY_OPTIONS,
  YES_NO_OPTIONS,
} from '@/components/lms/CourseCmsFormModal'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateTime } from '@/utils/dateTime'
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

function formatSessionListWhen(s: CourseLearnSession): string {
  const raw = s.start_at ?? s.starts_at ?? (s.date && s.time ? `${s.date}T${s.time}` : s.date)
  if (!raw) return '—'
  const formatted = formatDateTime(String(raw))
  return formatted === '—' ? String(raw) : formatted
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

  type DeleteTarget =
    | { kind: 'module'; id: number; label: string }
    | { kind: 'session'; id: number; label: string }
    | { kind: 'material'; id: number; label: string }
    | { kind: 'assignment'; id: number; label: string }

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  async function performDelete() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      if (deleteTarget.kind === 'module') {
        await adminDeleteCourseModule(courseId, deleteTarget.id, cmsScope)
      } else if (deleteTarget.kind === 'session') {
        await adminDeleteCourseSession(courseId, deleteTarget.id, cmsScope)
      } else if (deleteTarget.kind === 'material') {
        await adminDeleteCourseMaterial(courseId, deleteTarget.id, cmsScope)
      } else {
        await adminDeleteCourseAssignment(courseId, deleteTarget.id, cmsScope)
      }
      toast.success('تم الحذف')
      notifyStudentScopeRefresh()
      setDeleteTarget(null)
      await reload()
    } catch (e) {
      toast.error(getApiErrorMessage(e as AxiosError))
    } finally {
      setDeleteBusy(false)
    }
  }

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
                  draft: { title: '', sort_order: String(mods.length + 1) },
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
                            },
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-deepBlue/15 px-3 py-1.5 text-[11px] font-black text-deepBlue"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ kind: 'module', id: m.id, label: m.title })}
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
                      {formatSessionListWhen(s)}
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
                      onClick={() => setDeleteTarget({ kind: 'session', id: s.id, label: String(s.title ?? 'جلسة') })}
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
                      onClick={() => setDeleteTarget({ kind: 'material', id: m.id, label: m.title })}
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
                      الموعد: {a.due_at ? formatDateTime(String(a.due_at)) : '—'} · نقاط: {a.max_points ?? '—'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setModal({
                          kind: 'assignment',
                          editingId: a.assignment_id ?? a.id,
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
                      onClick={() => setDeleteTarget({
                        kind: 'assignment',
                        id: a.assignment_id ?? a.id,
                        label: a.title,
                      })}
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

      <ConfirmDeleteModal
        open={deleteTarget != null}
        title={
          deleteTarget?.kind === 'module' ? 'حذف الوحدة'
          : deleteTarget?.kind === 'session' ? 'حذف الجلسة'
          : deleteTarget?.kind === 'material' ? 'حذف المادة'
          : 'حذف الواجب'
        }
        itemLabel={deleteTarget?.label}
        description="لا يمكن التراجع عن هذا الإجراء. سيتم إزالة العنصر من محتوى الدورة."
        busy={deleteBusy}
        onClose={() => { if (!deleteBusy) setDeleteTarget(null) }}
        onConfirm={performDelete}
      />
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
        sort_order: Number(d.sort_order ?? 1) || 1,
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
    <CmsFormModal
      formId="cms-module-form"
      title={modal.editingId ? 'تعديل الوحدة' : 'وحدة تعليمية جديدة'}
      subtitle="عنوان الوحدة وترتيبها ضمن محتوى الدورة."
      eyebrow="وحدات الدورة"
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
    >
      <CmsFormSection title="البيانات الأساسية">
        <CmsField
          label="عنوان الوحدة"
          required
          error={fieldErrors.title}
          value={d.title}
          onChange={(v) => {
            clearKey('title')
            setD({ ...d, title: v })
          }}
        />
        <CmsField
          label="ترتيب العرض"
          hint="رقم أصغر = يظهر أولاً في قائمة الطالب"
          error={fieldErrors.sort_order}
          value={d.sort_order ?? '1'}
          dir="ltr"
          type="number"
          onChange={(v) => {
            clearKey('sort_order')
            setD({ ...d, sort_order: v })
          }}
        />
      </CmsFormSection>
    </CmsFormModal>
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

  const locType = normalizeSessionLocationType(d.location_type ?? 'online')

  async function submit() {
    setFieldErrors({})
    const clientErrors = validateSessionDraft(d)
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      return
    }
    setBusy(true)
    try {
      const type = normalizeSessionLocationType(d.location_type)
      const body: Record<string, unknown> = {
        title: d.title.trim(),
        description: d.description.trim() || undefined,
        start_at: datetimeLocalToApi(d.start_at),
        end_at: datetimeLocalToApi(d.end_at),
        location_type: type,
        status: d.status,
      }
      if (sessionShowsMeetingUrl(type)) {
        body.meeting_url = d.meeting_url.trim()
      }
      if (sessionShowsLocation(type)) {
        body.location = d.location.trim()
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
    <CmsFormModal
      formId="cms-session-form"
      title={modal.editingId ? 'تعديل الجلسة' : 'جلسة جديدة'}
      subtitle="حدّد نوع الجلسة — تظهر الحقول المناسبة فقط (أونلاين / حضوري / مختلط)."
      eyebrow="جدولة الجلسات"
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
    >
      <CmsFormSection title="معلومات الجلسة">
        <CmsField
          label="عنوان الجلسة"
          required
          error={fieldErrors.title}
          value={d.title}
          onChange={(v) => {
            clearKey('title')
            setD({ ...d, title: v })
          }}
        />
        <CmsTextarea
          label="الوصف"
          value={d.description}
          error={fieldErrors.description}
          rows={3}
          onChange={(v) => {
            clearKey('description')
            setD({ ...d, description: v })
          }}
        />
      </CmsFormSection>

      <CmsFormSection title="التوقيت">
        <CmsDatetimeField
          label="وقت البداية"
          required
          value={d.start_at}
          error={fieldErrors.start_at}
          onChange={(v) => {
            clearKey('start_at')
            setD({ ...d, start_at: v })
          }}
        />
        <CmsDatetimeField
          label="وقت النهاية"
          value={d.end_at}
          error={fieldErrors.end_at}
          onChange={(v) => {
            clearKey('end_at')
            setD({ ...d, end_at: v })
          }}
        />
      </CmsFormSection>

      <CmsFormSection title="نوع الجلسة والمكان">
        <CmsSelect
          label="نوع الجلسة"
          value={locType}
          error={fieldErrors.location_type}
          options={[...SESSION_LOCATION_OPTIONS]}
          onChange={(v) => {
            clearKey('location_type')
            clearKey('meeting_url')
            clearKey('location')
            setD({ ...d, location_type: v })
          }}
        />
        {sessionShowsMeetingUrl(locType) ?
          <CmsField
            label="رابط الاجتماع"
            required
            dir="ltr"
            type="url"
            hint="Zoom · Teams · Google Meet"
            error={fieldErrors.meeting_url}
            value={d.meeting_url}
            onChange={(v) => {
              clearKey('meeting_url')
              setD({ ...d, meeting_url: v })
            }}
          />
        : null}
        {sessionShowsLocation(locType) ?
          <CmsField
            label="الموقع الحضوري"
            required={locType === 'offline'}
            hint="القاعة، العنوان، أو المبنى"
            error={fieldErrors.location}
            value={d.location}
            onChange={(v) => {
              clearKey('location')
              setD({ ...d, location: v })
            }}
          />
        : null}
        <CmsSelect
          label="حالة الجلسة"
          value={d.status}
          error={fieldErrors.status}
          options={[...SESSION_STATUS_OPTIONS]}
          onChange={(v) => {
            clearKey('status')
            setD({ ...d, status: v })
          }}
        />
      </CmsFormSection>
    </CmsFormModal>
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
          description: d.description.trim() || undefined,
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
    <CmsFormModal
      formId="cms-material-form"
      title={modal.editingId ? 'تعديل المادة' : 'مادة تعليمية جديدة'}
      subtitle="ملف، رابط، أو مستند — يظهر للطلاب حسب إعدادات الظهور."
      eyebrow="مواد الدورة"
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
    >
      <CmsFormSection title="التفاصيل">
        <CmsField
          label="عنوان المادة"
          required
          error={fieldErrors.title}
          value={d.title}
          onChange={(v) => {
            clearKey('title')
            setD({ ...d, title: v })
          }}
        />
        <CmsTextarea
          label="الوصف"
          value={d.description}
          error={fieldErrors.description}
          onChange={(v) => {
            clearKey('description')
            setD({ ...d, description: v })
          }}
        />
        <CmsSelect
          label="نوع المادة"
          value={d.kind}
          error={fieldErrors.kind}
          options={[...MATERIAL_KIND_OPTIONS]}
          onChange={(v) => {
            clearKey('kind')
            setD({ ...d, kind: v })
          }}
        />
      </CmsFormSection>

      <CmsFormSection title="الوصول والملف">
        <CmsField
          label="رابط خارجي"
          dir="ltr"
          type="url"
          hint="بديل عن رفع ملف — YouTube، Drive، …"
          error={fieldErrors.external_url}
          value={d.external_url}
          onChange={(v) => {
            clearKey('external_url')
            setD({ ...d, external_url: v })
          }}
        />
        <CmsSelect
          label="من يرى هذه المادة؟"
          value={d.visibility}
          error={fieldErrors.visibility}
          options={[...VISIBILITY_OPTIONS]}
          onChange={(v) => {
            clearKey('visibility')
            setD({ ...d, visibility: v })
          }}
        />
        <label className="block text-right">
          <span className="text-[12px] font-black text-[#22334A]/70">رفع ملف (اختياري)</span>
          <input
            type="file"
            className={`mt-1.5 block w-full rounded-xl border border-dashed border-[#22334A]/15 bg-white px-3 py-2.5 text-[12px] file:me-3 file:rounded-lg file:border-0 file:bg-[#2691C2] file:px-3 file:py-1.5 file:text-[11px] file:font-black file:text-white ${
              fieldErrors.file ? 'border-rose-400' : ''
            }`}
            onChange={(e) => {
              clearKey('file')
              setFile(e.target.files?.[0] ?? null)
            }}
          />
          {fieldErrors.file ?
            <p className="mt-1 text-[11px] font-bold text-rose-700">{fieldErrors.file}</p>
          : null}
        </label>
      </CmsFormSection>
    </CmsFormModal>
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
    if (!d.title.trim()) {
      setFieldErrors({ title: 'العنوان مطلوب.' })
      return
    }
    if (!d.deadline.trim()) {
      setFieldErrors({ deadline: 'الموعد النهائي مطلوب.' })
      return
    }
    setBusy(true)

    try {
      const due = datetimeLocalToApi(d.deadline)
      const body: Record<string, unknown> = {
        title: d.title.trim(),
        description: d.description.trim() || undefined,
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
    <CmsFormModal
      formId="cms-assignment-form"
      title={modal.editingId ? 'تعديل الواجب' : 'واجب جديد'}
      subtitle="موعد التسليم، الدرجة، ونوع التسليم — كما يراه الطالب."
      eyebrow="واجبات الدورة"
      onClose={onClose}
      onSubmit={submit}
      busy={busy}
    >
      <CmsFormSection title="محتوى الواجب">
        <CmsField
          label="عنوان الواجب"
          required
          error={fieldErrors.title}
          value={d.title}
          onChange={(v) => {
            clearKey('title')
            setD({ ...d, title: v })
          }}
        />
        <CmsTextarea
          label="التعليمات للطالب"
          value={d.description}
          error={fieldErrors.description}
          rows={4}
          onChange={(v) => {
            clearKey('description')
            setD({ ...d, description: v })
          }}
        />
      </CmsFormSection>

      <CmsFormSection title="الموعد والدرجة">
        <CmsDatetimeField
          label="الموعد النهائي للتسليم"
          required
          value={d.deadline}
          error={fieldErrors.deadline ?? fieldErrors.due_at}
          onChange={(v) => {
            clearKey('deadline')
            clearKey('due_at')
            setD({ ...d, deadline: v })
          }}
        />
        <CmsField
          label="الدرجة القصوى"
          dir="ltr"
          type="number"
          error={fieldErrors.max_points}
          value={d.max_points}
          onChange={(v) => {
            clearKey('max_points')
            setD({ ...d, max_points: v })
          }}
        />
        <CmsSelect
          label="نوع التسليم"
          value={d.submission_type}
          error={fieldErrors.submission_type}
          options={[...SUBMISSION_TYPE_OPTIONS]}
          onChange={(v) => {
            clearKey('submission_type')
            setD({ ...d, submission_type: v })
          }}
        />
      </CmsFormSection>

      <CmsFormSection title="الظهور والإلزام">
        <CmsSelect
          label="واجب إلزامي؟"
          value={d.required}
          error={fieldErrors.required}
          options={[...YES_NO_OPTIONS]}
          onChange={(v) => {
            clearKey('required')
            setD({ ...d, required: v })
          }}
        />
        <CmsSelect
          label="ظاهر للطلاب؟"
          value={d.visible}
          error={fieldErrors.visible}
          options={[...YES_NO_OPTIONS]}
          onChange={(v) => {
            clearKey('visible')
            setD({ ...d, visible: v })
          }}
        />
      </CmsFormSection>
    </CmsFormModal>
  )
}
