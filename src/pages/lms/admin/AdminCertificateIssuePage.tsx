import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Award,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  Loader2,
  Search,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import toast from '@/lib/toast'
import { fetchEligibility, bulkIssueCertificates, fetchCertificateTemplates } from '@/api/certificatesApi'
import type { CertificateType, CertificateTemplate, EligibilityResponse } from '@/api/certificatesApi'
import { fetchAdminCourseDetail } from '@/api/adminCoursesApi'
import { getCourseInstructor } from '@/utils/courseInstructor'
import { useAuth } from '@/contexts/AuthContext'
import apiClient from '@/api/axios'

// ── Types & Constants ─────────────────────────────────────────────────────────

type EntityOption = { id: number; label: string }

type EntityContext = {
  title: string
  status?: string | null
  instructor?: string | null
  studentCount?: number | null
}

const ENTITY_LABEL: Record<string, string> = {
  course_completion: 'الدورة',
  workshop_attendance: 'ورشة العمل',
  learning_track: 'المسار',
}

const STATUS_LABEL: Record<string, string> = {
  published: 'منشورة',
  draft: 'مسودة',
  archived: 'مؤرشفة',
  active: 'نشطة',
}

const CERT_TYPES: { value: CertificateType; label: string; icon: string; desc: string; needs_entity: boolean }[] = [
  { value: 'course_completion',   label: 'إتمام دورة',       icon: '🎓', desc: 'للطلاب الذين أتموا الدورة بنجاح',         needs_entity: true  },
  { value: 'workshop_attendance', label: 'حضور ورشة عمل',    icon: '🛠️', desc: 'للمشاركين في ورش العمل',                  needs_entity: true  },
  { value: 'learning_track',      label: 'مسار تعليمي',      icon: '🗺️', desc: 'لإتمام مسار تعليمي متكامل',               needs_entity: true  },
  { value: 'summer_camp',         label: 'مخيم صيفي',        icon: '⛺', desc: 'للمشاركين في المخيمات الصيفية',            needs_entity: false },
  { value: 'volunteer',           label: 'تطوع',              icon: '🤝', desc: 'تقدير لجهود المتطوعين',                   needs_entity: false },
  { value: 'internship',          label: 'تدريب ميداني',     icon: '💼', desc: 'إتمام التدريب الميداني',                   needs_entity: false },
  { value: 'guest_speaker',       label: 'محاضر ضيف',        icon: '🎙️', desc: 'للمحاضرين والضيوف',                       needs_entity: false },
  { value: 'partner',             label: 'شراكة',             icon: '🏢', desc: 'لشركاء البرامج والمؤسسات',                needs_entity: false },
  { value: 'custom',              label: 'مخصص',              icon: '✨', desc: 'شهادة مخصصة حرة',                         needs_entity: false },
]

const RELATED_TYPE_MAP: Record<string, string> = {
  course_completion: 'course',
  workshop_attendance: 'workshop',
  learning_track: 'learning_path',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchEntities(type: CertificateType): Promise<EntityOption[]> {
  try {
    if (type === 'course_completion') {
      const res = await apiClient.get<unknown>('/admin/courses')
      const raw = res.data as Record<string, unknown>
      const arr = Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : []
      return (arr as Record<string, unknown>[]).map((c) => ({ id: Number(c.id), label: String(c.title ?? c.name ?? c.id) }))
    }
    if (type === 'workshop_attendance') {
      const res = await apiClient.get<unknown>('/admin/workshops')
      const raw = res.data as Record<string, unknown>
      const arr = Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : []
      return (arr as Record<string, unknown>[]).map((w) => ({ id: Number(w.id), label: String(w.title ?? w.name ?? w.id) }))
    }
    if (type === 'learning_track') {
      const res = await apiClient.get<unknown>('/admin/learning-paths')
      const raw = res.data as Record<string, unknown>
      const arr = Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : []
      return (arr as Record<string, unknown>[]).map((t) => ({ id: Number(t.id), label: String(t.name ?? t.title ?? t.id) }))
    }
  } catch { /* ignore */ }
  return []
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepRail({ current }: { current: number }) {
  const labels = ['اختيار المحتوى', 'فحص الأهلية', 'تأكيد وإصدار']
  return (
    <div className="flex items-center justify-center gap-0" dir="rtl">
      {labels.map((label, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={[
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all duration-300',
                done   ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : '',
                active ? 'bg-[#0077B6] text-white shadow-lg shadow-[#0077B6]/30 scale-110' : '',
                !done && !active ? 'border-2 border-slate-200 bg-white text-slate-400' : '',
              ].join(' ')}>
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </div>
              <span className={[
                'text-[10px] font-black whitespace-nowrap',
                active ? 'text-[#0077B6]' : done ? 'text-emerald-500' : 'text-slate-400',
              ].join(' ')}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className={[
                'mx-2 mb-5 h-[2px] w-14 rounded-full transition-all duration-500',
                i < current ? 'bg-emerald-400' : 'bg-slate-200',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />
}

function StatCard({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-[10px] font-black uppercase tracking-wide opacity-60">{label}</p>
      <p className="mt-1.5 text-2xl font-black tabular-nums">{value}</p>
    </div>
  )
}

function ContentSummaryCard({
  certTypeLabel,
  entityLabel,
  context,
  templateName,
  linkedCount,
}: {
  certTypeLabel: string
  entityLabel: string
  context: EntityContext | null
  templateName: string
  linkedCount: number
}) {
  return (
    <div className="rounded-2xl border border-[#0077B6]/15 bg-gradient-to-l from-[#0077B6]/5 via-white to-slate-50 p-5">
      <p className="text-[11px] font-black uppercase tracking-wide text-[#0077B6]">المحتوى المختار</p>
      <div className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
        <div><span className="font-bold text-slate-500">{entityLabel}: </span><span className="font-black text-[#1E2D40]">{context?.title ?? '—'}</span></div>
        <div><span className="font-bold text-slate-500">نوع الشهادة: </span><span className="font-black text-[#1E2D40]">{certTypeLabel}</span></div>
        {context?.status ? (
          <div><span className="font-bold text-slate-500">حالة المحتوى: </span><span className="font-black text-[#1E2D40]">{STATUS_LABEL[context.status] ?? context.status}</span></div>
        ) : null}
        {context?.instructor ? (
          <div><span className="font-bold text-slate-500">المدرب: </span><span className="font-black text-[#1E2D40]">{context.instructor}</span></div>
        ) : null}
        <div><span className="font-bold text-slate-500">عدد الطلاب المرتبطين: </span><span className="font-black tabular-nums text-[#1E2D40]">{linkedCount}</span></div>
        <div><span className="font-bold text-slate-500">القالب: </span><span className="font-black text-[#1E2D40]">{templateName}</span></div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCertificateIssuePage() {
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()
  const { user }       = useAuth()
  const canOverride    = ['super_admin', 'tech_admin', 'admin'].includes(user?.role ?? '')
  const cardRef        = useRef<HTMLDivElement>(null)

  const [step, setStep]             = useState(0)
  const [slideDir, setSlideDir]     = useState<'fwd' | 'bck'>('fwd')

  // Step 1 — `certType` / `entityId` are pre-selected from the URL through lazy
  // initialisers, so the first render already reflects the query string.
  const [certType, setCertType]         = useState<CertificateType>(() => {
    const urlType = searchParams.get('type') as CertificateType | null
    return urlType && CERT_TYPES.some((c) => c.value === urlType) ? urlType : 'course_completion'
  })
  const [entities, setEntities]         = useState<EntityOption[]>([])
  const [entityId, setEntityId]         = useState<number | null>(() => {
    const urlEId = searchParams.get('related_id')
    return urlEId ? Number(urlEId) : null
  })
  const [entitySearch, setEntitySearch] = useState('')
  const [templates, setTemplates]       = useState<CertificateTemplate[]>([])
  const [templateId, setTemplateId]     = useState<number | null>(null)
  const [loadingEnt, setLoadingEnt]     = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templateError, setTemplateError]     = useState<string | null>(null)
  const [entityContext, setEntityContext]   = useState<EntityContext | null>(null)

  // Step 2
  const [eligData, setEligData]         = useState<EligibilityResponse | null>(null)
  const [loadingElig, setLoadingElig]   = useState(false)
  const [eligError, setEligError]       = useState<string | null>(null)
  const [selected, setSelected]         = useState<Set<number>>(new Set())
  const [override, setOverride]         = useState(false)
  const [filter, setFilter]             = useState<'all' | 'eligible' | 'ineligible' | 'issued'>('all')
  const [studentQ, setStudentQ]         = useState('')

  // Step 3
  const [issuing, setIssuing]           = useState(false)
  const [issuedBatch, setIssuedBatch]   = useState<{ id: number; batch_code: string } | null>(null)
  const [issueError, setIssueError]     = useState<string | null>(null)

  // Derived
  const ctMeta      = CERT_TYPES.find((c) => c.value === certType)!
  const needsEntity = ctMeta.needs_entity
  const relatedType = RELATED_TYPE_MAP[certType] ?? certType

  // Arm the per-type loaders during render (react.dev "adjusting state when a prop
  // changes"). Seeded with `null` so the first pass runs too, exactly as the effects
  // below used to do on mount.
  const [seenCertType, setSeenCertType] = useState<CertificateType | null>(null)
  if (seenCertType !== certType) {
    setSeenCertType(certType)
    if (needsEntity) setLoadingEnt(true)
    else setEntities([])
    setLoadingTemplates(true)
    setTemplateError(null)
  }

  // Same for the entity context: every branch but the course lookup is synchronous, so
  // it is resolved during render and only the async branch is left to the effect.
  const [seenEntitySel, setSeenEntitySel] =
    useState<{ entityId: number | null; certType: CertificateType; entities: EntityOption[] } | null>(null)
  if (
    seenEntitySel === null ||
    seenEntitySel.entityId !== entityId ||
    seenEntitySel.certType !== certType ||
    seenEntitySel.entities !== entities
  ) {
    setSeenEntitySel({ entityId, certType, entities })
    if (!entityId || !needsEntity) setEntityContext(null)
    else if (certType !== 'course_completion') {
      setEntityContext({ title: entities.find((e) => e.id === entityId)?.label ?? '—' })
    }
    // course_completion keeps the previous context until the lookup below resolves
  }

  // Load entities on type change
  useEffect(() => {
    if (!needsEntity) return
    let alive = true
    void (async () => {
      try {
        const list = await fetchEntities(certType)
        if (!alive) return
        setEntities(list)
        const urlId = Number(searchParams.get('related_id') ?? 0)
        if (urlId && list.some((e) => e.id === urlId)) setEntityId(urlId)
      } finally {
        if (alive) setLoadingEnt(false)
      }
    })()
    return () => { alive = false }
  }, [certType])

  // Load course context when a course is selected (the only async context branch)
  useEffect(() => {
    if (!entityId || !needsEntity || certType !== 'course_completion') return
    const entityLabelFallback = entities.find((e) => e.id === entityId)?.label ?? '—'
    let alive = true
    void (async () => {
      try {
        const course = await fetchAdminCourseDetail(entityId)
        if (!alive) return
        const instructor = getCourseInstructor(course)
        setEntityContext({
          title: course.title ?? entityLabelFallback,
          status: course.status ?? (course.is_published ? 'published' : 'draft'),
          instructor: instructor?.displayName ?? null,
          studentCount: course.students_count ?? null,
        })
      } catch {
        if (alive) setEntityContext({ title: entityLabelFallback })
      }
    })()
    return () => { alive = false }
  }, [entityId, certType, needsEntity, entities])

  // Load templates on type change
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const list = await fetchCertificateTemplates({ type: certType })
        if (!alive) return
        setTemplates(list)
        setTemplateId(list.length === 1 ? list[0].id : null)
      } catch {
        if (!alive) return
        setTemplates([])
        setTemplateId(null)
        setTemplateError('تعذر تحميل بيانات الشهادات. تحقق من الاتصال وأعد المحاولة.')
      } finally {
        if (alive) setLoadingTemplates(false)
      }
    })()
    return () => { alive = false }
  }, [certType])

  const selectedEntity      = entities.find((e) => e.id === entityId)
  const entityLabel         = ENTITY_LABEL[certType] ?? 'المحتوى'
  const templateName        = templates.find((t) => t.id === templateId)?.name ?? 'الافتراضي'
  const linkedStudentCount  = eligData?.summary.total ?? entityContext?.studentCount ?? 0
  const filteredEntities    = entities.filter((e) => e.label.includes(entitySearch))
  const alreadyIssuedCount  = eligData?.summary.already_issued ?? (eligData?.students ?? []).filter((s) => s.already_issued || s.existing_certificate).length

  const selectableStudent = (s: EligibilityResponse['students'][number]) => s.user.id > 0

  const visibleStudents = (eligData?.students ?? []).filter((s) => {
    if (studentQ) {
      const q = studentQ.toLowerCase()
      if (!s.user.name.toLowerCase().includes(q) && !s.user.email.toLowerCase().includes(q)) return false
    }
    if (filter === 'eligible')   return s.is_eligible && !s.existing_certificate && !s.already_issued
    if (filter === 'ineligible') return !s.is_eligible && !s.existing_certificate && !s.already_issued
    if (filter === 'issued')     return !!s.existing_certificate || !!s.already_issued
    return true
  })

  // Eligibility load
  const loadEligibility = useCallback(() => {
    if (needsEntity && (!entityId || entityId <= 0)) {
      setEligData(null)
      setEligError(certType === 'course_completion' ? 'اختر الدورة أولاً لعرض المتعلمين المؤهلين.' : 'اختر المحتوى أولاً لعرض المتعلمين المؤهلين.')
      setLoadingElig(false)
      return
    }
    if (!needsEntity) {
      setEligData({ summary: { total: 0, eligible: 0, ineligible: 0 }, students: [] })
      setSelected(new Set())
      setEligError(null)
      setLoadingElig(false)
      return
    }
    setLoadingElig(true)
    setEligError(null)
    fetchEligibility({ related_type: relatedType, related_id: entityId!, certificate_type: certType })
      .then((data) => {
        setEligData(data)
        const autoIds = new Set(
          data.students
            .filter((s) => s.is_eligible && !s.existing_certificate && !s.already_issued && s.user.id > 0)
            .map((s) => s.user.id)
        )
        setSelected(autoIds)
      })
      .catch(() => setEligError('تعذر تحميل بيانات الأهلية. تحقق من الاتصال وأعد المحاولة.'))
      .finally(() => setLoadingElig(false))
  }, [certType, entityId, relatedType, needsEntity])

  function goStep(next: number) {
    setSlideDir(next > step ? 'fwd' : 'bck')
    if (next === 1 && step === 0) loadEligibility()
    setStep(next)
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  async function handleIssue() {
    if (!selected.size) return
    setIssuing(true)
    setIssueError(null)
    try {
      const res = await bulkIssueCertificates({
        user_ids: [...selected],
        certificate_type: certType,
        related_type: relatedType,
        related_id: entityId ?? 0,
        template_id: templateId ?? undefined,
        override,
      })
      const b = (res as unknown as Record<string, unknown>)
      const batchData = (b.batch ?? b) as Record<string, unknown>
      setIssuedBatch({
        id: (batchData.batch_id ?? batchData.id) as number,
        batch_code: (batchData.batch_code) as string ?? '—',
      })
      toast.success('تم إنشاء طلب إصدار الشهادات بنجاح.')
    } catch {
      setIssueError('حدث خطأ أثناء إصدار الشهادات. يرجى المحاولة مرة أخرى.')
    } finally {
      setIssuing(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLmsShell title="إصدار الشهادات" description="إصدار شهادات فردية أو جماعية للمتعلمين المؤهلين" breadcrumb="الشهادات / إصدار">
      <div className="min-h-screen bg-slate-50 pb-16" dir="rtl">

        {/* ── Hero ── */}
        <div className="bg-gradient-to-l from-[#1E2D40] via-[#0077B6] to-[#1a4a6e] px-6 py-10 text-center text-white">
          <div className="mx-auto max-w-xl">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Award size={22} />
            </div>
            <h1 className="text-[22px] font-black">إصدار الشهادات</h1>
            <p className="mt-2 text-[13px] font-medium text-white/65">
              إصدار شهادات فردية أو جماعية للمتعلمين المؤهلين
            </p>
          </div>
        </div>

        {/* ── Wizard card ── */}
        <div className="mx-auto -mt-6 max-w-3xl px-4">
          <div
            ref={cardRef}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5"
          >
            {/* Stepper */}
            <div className="border-b border-slate-100 px-8 py-7">
              <StepRail current={step} />
            </div>

            {/* Animated body */}
            <div
              key={step}
              className="px-8 py-8"
              style={{ animation: `${slideDir === 'fwd' ? 'crtSlideIn' : 'crtSlideInBck'} 0.22s ease-out` }}
            >

              {/* ══════════════ STEP 0 ══════════════ */}
              {step === 0 && (
                <div className="space-y-8">

                  {/* Type cards */}
                  <div>
                    <p className="mb-3 text-[13px] font-black text-[#1E2D40]">نوع الشهادة</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {CERT_TYPES.map((ct) => (
                        <button
                          key={ct.value}
                          type="button"
                          onClick={() => { setCertType(ct.value); setEntityId(null) }}
                          className={[
                            'rounded-xl border-2 p-3 text-right transition-all duration-200 hover:shadow-sm',
                            certType === ct.value
                              ? 'border-[#0077B6] bg-[#0077B6]/5 shadow-md shadow-[#0077B6]/10'
                              : 'border-slate-200 hover:border-[#0077B6]/30',
                          ].join(' ')}
                        >
                          <div className="text-lg mb-1">{ct.icon}</div>
                          <p className={`text-[11px] font-black ${certType === ct.value ? 'text-[#0077B6]' : 'text-[#1E2D40]'}`}>
                            {ct.label}
                          </p>
                          <p className="mt-0.5 text-[10px] leading-tight text-slate-400">{ct.desc}</p>
                          {certType === ct.value && (
                            <div className="mt-2 flex justify-end">
                              <Check size={11} className="text-[#0077B6]" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Entity picker */}
                  {needsEntity && (
                    <div>
                      <p className="mb-3 text-[13px] font-black text-[#1E2D40]">
                        {certType === 'course_completion' ? 'الدورة' : certType === 'workshop_attendance' ? 'ورشة العمل' : 'المسار'}
                      </p>
                      {loadingEnt ? (
                        <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-28" /></div>
                      ) : selectedEntity ? (
                        <div className="flex items-center justify-between rounded-xl border-2 border-[#0077B6] bg-[#0077B6]/5 px-4 py-3">
                          <span className="text-[13px] font-black text-[#1E2D40]">{selectedEntity.label}</span>
                          <button type="button" onClick={() => setEntityId(null)} className="text-slate-400 hover:text-red-500">
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="بحث..."
                              value={entitySearch}
                              onChange={(e) => setEntitySearch(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-9 pl-4 text-[13px] outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10"
                            />
                          </div>
                          {filteredEntities.length === 0 ? (
                            <p className="py-4 text-center text-[12px] text-slate-400">لا توجد نتائج</p>
                          ) : (
                            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200">
                              {filteredEntities.map((e) => (
                                <button
                                  key={e.id}
                                  type="button"
                                  onClick={() => setEntityId(e.id)}
                                  className="w-full border-b border-slate-100 px-4 py-2.5 text-right text-[13px] font-medium text-[#1E2D40] transition-colors last:border-0 hover:bg-slate-50"
                                >
                                  {e.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Template */}
                  {(loadingTemplates || templateError || templates.length > 0) && (
                    <div>
                      <p className="mb-3 text-[13px] font-black text-[#1E2D40]">قالب الشهادة</p>
                      {loadingTemplates ? (
                        <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
                      ) : templateError ? (
                        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-bold text-red-600">{templateError}</p>
                      ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setTemplateId(null)}
                          className={`rounded-xl border-2 px-4 py-3 text-right transition-all ${!templateId ? 'border-[#0077B6] bg-[#0077B6]/5' : 'border-slate-200'}`}
                        >
                          <p className="text-[12px] font-black text-[#1E2D40]">القالب الافتراضي</p>
                          <p className="text-[10px] text-slate-400">يُستخدم القالب المدمج للنوع المحدد</p>
                        </button>
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTemplateId(t.id)}
                            className={`rounded-xl border-2 px-4 py-3 text-right transition-all ${templateId === t.id ? 'border-[#0077B6] bg-[#0077B6]/5' : 'border-slate-200'}`}
                          >
                            <p className="text-[12px] font-black text-[#1E2D40]">{t.name}</p>
                            <p className="text-[10px] text-slate-400">{t.language === 'arabic' ? 'عربي' : t.language === 'english' ? 'إنجليزي' : 'ثنائي'}</p>
                          </button>
                        ))}
                      </div>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => goStep(1)}
                      disabled={needsEntity && !entityId}
                      className="flex items-center gap-2 rounded-xl bg-[#0077B6] px-6 py-3 text-[13px] font-black text-white shadow-lg shadow-[#0077B6]/25 transition-all hover:bg-[#1E7FAD] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      فحص الأهلية <ChevronLeft size={15} strokeWidth={2.5} />
                    </button>
                    {needsEntity && !entityId && (
                      <p className="text-[11px] font-medium text-[#F97316]">اختر المحتوى أولاً لعرض المتعلمين المؤهلين.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ══════════════ STEP 1 ══════════════ */}
              {step === 1 && (
                <div className="space-y-6">
                  {needsEntity && entityId && (
                    <ContentSummaryCard
                      certTypeLabel={ctMeta.label}
                      entityLabel={entityLabel}
                      context={entityContext ?? { title: selectedEntity?.label ?? '—' }}
                      templateName={templateName}
                      linkedCount={linkedStudentCount}
                    />
                  )}

                  {loadingElig ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-3">
                        {[0,1,2,3].map((i) => <Skeleton key={i} className="h-20" />)}
                      </div>
                      <Skeleton className="h-10" />
                      {[0,1,2,3].map((i) => <Skeleton key={i} className="h-14" />)}
                    </div>
                  ) : eligError ? (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
                      <AlertCircle size={28} className="mx-auto mb-3 text-red-400" />
                      <p className="text-[13px] font-black text-red-600">{eligError}</p>
                      <button
                        type="button"
                        onClick={loadEligibility}
                        className="mt-4 rounded-xl bg-red-100 px-4 py-2 text-[12px] font-black text-red-600 hover:bg-red-200"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : !eligData ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                      <Users size={28} className="mx-auto mb-3 text-slate-300" />
                      <p className="text-[13px] font-black text-slate-400">
                        {certType === 'course_completion' ? 'اختر الدورة أولاً لعرض المتعلمين المؤهلين.' : 'اختر المحتوى أولاً لعرض المتعلمين المؤهلين.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Summary */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatCard label="إجمالي الطلاب"  value={eligData.summary.total}      cls="bg-slate-50 border-slate-200 text-[#1E2D40]" />
                        <StatCard label="المؤهلون"        value={eligData.summary.eligible}   cls="bg-emerald-50 border-emerald-100 text-emerald-700" />
                        <StatCard label="غير المؤهلين"   value={eligData.summary.ineligible}  cls="bg-amber-50 border-amber-100 text-amber-700" />
                        <StatCard label="سبق إصدارها"    value={alreadyIssuedCount}           cls="bg-blue-50 border-blue-100 text-blue-700" />
                      </div>

                      {/* Quick-select */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black text-slate-400">تحديد سريع:</span>
                        <button type="button" onClick={() => setSelected(new Set(
                          eligData.students
                            .filter((s) => s.is_eligible && !s.existing_certificate && !s.already_issued && s.user.id > 0)
                            .map((s) => s.user.id)
                        ))} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 hover:bg-emerald-100">
                          <Check size={10} className="inline ml-1" strokeWidth={3} />
                          المؤهلون ({eligData.summary.eligible})
                        </button>
                        <button type="button" onClick={() => setSelected(new Set(
                          eligData.students.filter((s) => s.user.id > 0).map((s) => s.user.id)
                        ))}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-600 hover:bg-slate-200">
                          الكل ({eligData.summary.total})
                        </button>
                        <button type="button" onClick={() => setSelected(new Set())}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-600 hover:bg-slate-200">
                          إلغاء التحديد
                        </button>
                        <span className="mr-auto text-[11px] font-black text-[#0077B6]">{selected.size} محدد</span>
                      </div>

                      {/* Filter + search */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[150px]">
                          <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="بحث عن طالب..."
                            value={studentQ}
                            onChange={(e) => setStudentQ(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-8 pl-3 text-[12px] outline-none focus:border-[#0077B6]"
                          />
                        </div>
                        {(['all', 'eligible', 'ineligible', 'issued'] as const).map((f) => (
                          <button key={f} type="button" onClick={() => setFilter(f)}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition-all ${filter === f ? 'bg-[#0077B6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {f === 'all' ? 'الكل' : f === 'eligible' ? 'مؤهل' : f === 'ineligible' ? 'غير مؤهل' : 'صدرت'}
                          </button>
                        ))}
                      </div>

                      {/* Students list */}
                      <div className="max-h-96 space-y-2 overflow-y-auto">
                        {visibleStudents.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                            <p className="text-[12px] font-black text-slate-400">
                              {eligData.summary.total === 0
                                ? 'لا يوجد طلاب مرتبطون بهذه الدورة.'
                                : 'لا توجد نتائج للفلتر المحدد.'}
                            </p>
                          </div>
                        ) : visibleStudents.map((s) => {
                          const isSel = selected.has(s.user.id)
                          const hasEx = !!s.existing_certificate || !!s.already_issued
                          const canSelect = selectableStudent(s) && (!hasEx || canOverride)
                          const assignCompleted = s.assignments_completed ?? 0
                          const assignTotal = s.assignments_total ?? 0
                          return (
                            <div
                              key={`${s.user.id}-${s.user.email}`}
                              onClick={() => {
                                if (!canSelect) return
                                setSelected((prev) => {
                                  const n = new Set(prev)
                                  if (n.has(s.user.id)) n.delete(s.user.id)
                                  else n.add(s.user.id)
                                  return n
                                })
                              }}
                              className={[
                                'flex items-center gap-3 rounded-xl border p-3 transition-all',
                                canSelect ? 'cursor-pointer' : 'cursor-default',
                                isSel ? 'border-[#0077B6] bg-[#0077B6]/4 shadow-sm' : 'border-slate-200 hover:border-[#0077B6]/30 hover:bg-slate-50',
                                !canSelect ? 'opacity-70' : '',
                              ].join(' ')}
                            >
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${isSel ? 'border-[#0077B6] bg-[#0077B6]' : 'border-slate-300'}`}>
                                {isSel && <Check size={10} strokeWidth={3} className="text-white" />}
                              </div>
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0077B6] to-[#1E2D40] text-[11px] font-black text-white">
                                {s.user.name.slice(0, 1)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-[12px] font-black text-[#1E2D40]">{s.user.name}</p>
                                <p className="truncate text-[10px] text-slate-400">{s.user.email}</p>
                                {!s.is_eligible && s.reason ? (
                                  <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-amber-700">{s.reason}</p>
                                ) : null}
                              </div>
                              <div className="hidden sm:flex flex-col items-end gap-1 text-[10px] text-slate-500">
                                <span><TrendingUp size={10} className="inline ml-0.5" />{s.progress_pct}% تقدم</span>
                                <span><Clock size={10} className="inline ml-0.5" />{s.attendance_pct}% حضور</span>
                                <span>واجبات: {assignCompleted}/{assignTotal || '—'}</span>
                              </div>
                              <div className="shrink-0">
                                {hasEx
                                  ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">{s.certificate_status ?? 'صدرت'}</span>
                                  : s.is_eligible
                                    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">مؤهل</span>
                                    : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">غير مؤهل</span>
                                }
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Override */}
                      {canOverride && (
                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="h-4 w-4 accent-[#F97316]" />
                          <span className="text-[12px] font-black text-amber-700">تجاوز شروط الأهلية وإصدار للجميع المحددين</span>
                        </label>
                      )}
                    </>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                    <button type="button" onClick={() => goStep(0)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-slate-600 hover:bg-slate-50">
                      <ChevronRight size={14} strokeWidth={2.5} /> السابق
                    </button>
                    <button type="button" onClick={() => goStep(2)} disabled={selected.size === 0}
                      className="flex items-center gap-2 rounded-xl bg-[#0077B6] px-6 py-2.5 text-[13px] font-black text-white shadow-md shadow-[#0077B6]/20 hover:bg-[#1E7FAD] disabled:cursor-not-allowed disabled:opacity-40">
                      التالي · {selected.size} <ChevronLeft size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}

              {/* ══════════════ STEP 2 ══════════════ */}
              {step === 2 && (
                <div className="space-y-6">
                  {issuedBatch ? (
                    <div className="py-10 text-center space-y-5">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <BadgeCheck size={36} className="text-emerald-500" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-[#1E2D40]">تم إنشاء طلب إصدار الشهادات بنجاح</h2>
                        <p className="mt-1.5 text-[13px] text-slate-500">
                          رقم الدفعة: <span className="font-mono font-black text-[#0077B6]">{issuedBatch.batch_code}</span>
                        </p>
                        <p className="mt-1 text-[12px] text-slate-400">
                          تم حفظ سجلات الشهادات. جاري إنشاء ملفات الشهادات في الخلفية — سيتلقى الطلاب إشعاراً عند اكتمال التوليد.
                        </p>
                      </div>
                      <div className="flex justify-center gap-3">
                        <button type="button" onClick={() => navigate('/dashboard/admin/certificates')}
                          className="rounded-xl bg-[#0077B6] px-5 py-2.5 text-[13px] font-black text-white hover:bg-[#1E7FAD]">
                          عرض الشهادات
                        </button>
                        <button type="button" onClick={() => navigate('/dashboard/admin/certificates/batches')}
                          className="rounded-xl border border-slate-200 px-5 py-2.5 text-[13px] font-black text-slate-600 hover:bg-slate-50">
                          تفاصيل الدفعة
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 divide-y divide-slate-100">
                        {[
                          { label: 'نوع الشهادة',    value: ctMeta.label },
                          { label: 'المحتوى',         value: selectedEntity?.label ?? 'غير محدد' },
                          { label: 'القالب',           value: templates.find((t) => t.id === templateId)?.name ?? 'الافتراضي' },
                          { label: 'عدد المستلمين',   value: `${selected.size} طالب` },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between px-5 py-3.5">
                            <span className="text-[12px] font-black text-slate-500">{label}</span>
                            <span className="text-[13px] font-black text-[#1E2D40]">{value}</span>
                          </div>
                        ))}
                      </div>

                      {issueError && (
                        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-600">{issueError}</p>
                      )}

                      <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[12px] text-amber-700">
                        <strong className="font-black">ملاحظة:</strong> ستُرسل الشهادات للطلاب في الخلفية. قد يستغرق توليدها بضع دقائق.
                      </p>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                        <button type="button" onClick={() => goStep(1)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-slate-600 hover:bg-slate-50">
                          <ChevronRight size={14} strokeWidth={2.5} /> السابق
                        </button>
                        <button
                          type="button"
                          onClick={handleIssue}
                          disabled={issuing || selected.size === 0}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#F97316] to-[#EA580C] px-8 py-3 text-[13px] font-black text-white shadow-lg shadow-orange-200 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {issuing ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                          {issuing ? 'جارٍ الإصدار...' : `إصدار ${selected.size} شهادة`}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes crtSlideIn    { from { opacity:0; transform:translateX(-14px); } to { opacity:1; transform:none; } }
        @keyframes crtSlideInBck { from { opacity:0; transform:translateX(14px);  } to { opacity:1; transform:none; } }
      `}</style>
    </AdminLmsShell>
  )
}
