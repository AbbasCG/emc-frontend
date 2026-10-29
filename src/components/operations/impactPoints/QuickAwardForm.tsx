import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileCheck2,
  FileUp,
  Info,
  Search,
  Send,
  Trash2,
  UserCheck,
} from 'lucide-react'
import toast from '@/lib/toast'
import {
  fetchPointRecipients,
  fetchPointsActivities,
  submitPointsRequest,
  type PointActivity,
  type PointCategoryGroup,
  type PointRecipient,
} from '@/api/volunteerPointsApi'
import { fieldClass, formatNumber, normalizeSearch, serverMessage } from './impactPointsUi'
import apiClient from '@/api/axios'
import { DEFAULT_EMC_DEPARTMENTS } from '@/pages/super-admin/users/assignableRoles'

type Props = {
  monthlyCap: number
  /** نطاق المستخدم من الخادم: organization (HR/Admin) أو department (مدير إدارة) */
  scope?: 'none' | 'department' | 'organization'
  /** Preselect a user when clicking from the people table */
  preselectUserId?: number | null
  /** Refresh callback after submission */
  onAwarded: () => void
}

export default function QuickAwardForm({
  monthlyCap,
  scope: _scope = 'organization',
  preselectUserId,
  onAwarded,
}: Props) {
  const [people, setPeople] = useState<PointRecipient[]>([])
  const [categories, setCategories] = useState<PointCategoryGroup[]>([])
  const [allActivities, setAllActivities] = useState<PointActivity[]>([])
  const [allDepartments, setAllDepartments] = useState<{ id: number; name: string }[]>(() =>
    DEFAULT_EMC_DEPARTMENTS.map((d) => ({ id: d.id, name: d.name_ar || d.name }))
  )
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  // Form states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState<number | 'all'>('all')
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('')
  const [selectedActivityId, setSelectedActivityId] = useState<number | ''>('')
  const [pointsInput, setPointsInput] = useState<string>('')
  const [reasonInput, setReasonInput] = useState<string>('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const formRef = useRef<HTMLElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // جلب جميع الإدارات المعتمدة من الخادم
  useEffect(() => {
    let alive = true
    apiClient
      .get('/departments/options')
      .then((res) => {
        if (!alive) return
        const raw = res.data?.data ?? res.data
        if (Array.isArray(raw) && raw.length > 0) {
          setAllDepartments(
            raw.map((d: any) => ({
              id: Number(d.id),
              name: d.name_ar || d.name || `إدارة #${d.id}`,
            }))
          )
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // جلب الأعضاء والأنشطة عند البداية
  useEffect(() => {
    let alive = true
    Promise.all([fetchPointRecipients(), fetchPointsActivities()])
      .then(([recipients, activitiesData]) => {
        if (!alive) return
        setPeople(recipients)
        setCategories(activitiesData.categories)
        setAllActivities(activitiesData.activities)
        setStatus('ready')
      })
      .catch(() => {
        if (alive) setStatus('error')
      })

    return () => {
      alive = false
    }
  }, [])

  // التعامل مع الاختيار المسبق من الجدول الخارجي
  useEffect(() => {
    if (preselectUserId && people.length > 0) {
      const match = people.find((p) => p.user_id === preselectUserId)
      if (match) {
        setSelectedUserId(match.user_id)
        if (match.department_id) setSelectedDeptId(match.department_id)
        formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [preselectUserId, people])

  // جميع الإدارات المتاحة بالمركز مدمجة مع إدارات الأعضاء
  const departments = useMemo(() => {
    const map = new Map<number, string>()
    for (const d of allDepartments) {
      if (d.id && d.name) map.set(d.id, d.name)
    }
    for (const p of people) {
      if (p.department_id && p.department) {
        if (!map.has(p.department_id)) {
          map.set(p.department_id, p.department)
        }
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [allDepartments, people])

  // تصفية المتطوعين وفق الإدارة والبحث
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      // قيد الإدارة
      if (selectedDeptId !== 'all') {
        const selectedDeptObj = departments.find((d) => d.id === selectedDeptId)
        const selectedDeptName = selectedDeptObj?.name?.trim().toLowerCase()
        const matchId = p.department_id === selectedDeptId
        const matchName =
          selectedDeptName &&
          p.department &&
          (p.department.trim().toLowerCase() === selectedDeptName ||
            p.department.toLowerCase().includes(selectedDeptName) ||
            selectedDeptName.includes(p.department.toLowerCase()))
        if (!matchId && !matchName) {
          return false
        }
      }
      // قيد البحث
      if (searchQuery.trim()) {
        const queryNorm = normalizeSearch(searchQuery)
        const nameNorm = normalizeSearch(p.name)
        const roleNorm = normalizeSearch(p.role_title ?? '')
        if (!nameNorm.includes(queryNorm) && !roleNorm.includes(queryNorm)) {
          return false
        }
      }
      return true
    })
  }, [people, selectedDeptId, searchQuery, departments])

  // المتطوع المختار حالياً
  const currentVolunteer = useMemo(() => {
    return people.find((p) => p.user_id === selectedUserId)
  }, [people, selectedUserId])

  // الأنشطة التابعة للتصنيف المختار
  const currentCategoryActivities = useMemo(() => {
    if (!selectedCategoryKey) return []
    const group = categories.find((c) => c.key === selectedCategoryKey)
    return group?.activities ?? []
  }, [categories, selectedCategoryKey])

  // النشاط المختار حالياً
  const currentActivity = useMemo(() => {
    if (!selectedActivityId) return null
    return allActivities.find((a) => a.id === selectedActivityId) ?? null
  }, [allActivities, selectedActivityId])

  // عند اختيار نشاط، نحدد النقاط تلقائياً إذا كانت ثابتة
  useEffect(() => {
    if (currentActivity) {
      if (currentActivity.type === 'fixed') {
        setPointsInput(String(currentActivity.points_min))
      } else {
        // إذا كان ضمن نطاق ولم يسبق إدخال قيمة صحيحة، نقترح الحد الأدنى
        setPointsInput((prev) => {
          const num = Number(prev)
          if (!prev || num < currentActivity.points_min || num > currentActivity.points_max) {
            return String(currentActivity.points_min)
          }
          return prev
        })
      }
    } else {
      setPointsInput('')
    }
  }, [currentActivity])

  // التحقق من صحة النقاط
  const pointsValidation = useMemo(() => {
    if (!currentActivity || !pointsInput) return { valid: false, error: null }
    const p = Number(pointsInput)
    if (Number.isNaN(p) || p <= 0) return { valid: false, error: 'أدخل قيمة عددية صحيحة للنقاط' }

    if (currentActivity.type === 'fixed') {
      if (p !== currentActivity.points_min) {
        return { valid: false, error: `النقاط لهذا النشاط محددة بـ ${currentActivity.points_min} نقطة فقط` }
      }
    } else {
      if (p < currentActivity.points_min || p > currentActivity.points_max) {
        return {
          valid: false,
          error: `النقاط يجب أن تكون بين ${currentActivity.points_min} و ${currentActivity.points_max}`,
        }
      }
    }

    // فحص السقف الشهري
    if (currentVolunteer) {
      const remaining = Math.max(0, monthlyCap - currentVolunteer.month_points)
      if (p > remaining) {
        return { valid: false, error: `تجاوز السقف الشهري! المتبقي للمتطوع ${formatNumber(remaining)} نقطة فقط` }
      }
    }

    return { valid: true, error: null }
  }, [currentActivity, pointsInput, currentVolunteer, monthlyCap])

  // إرسال الطلب للاعتماد
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedUserId) {
      toast.error('يرجى تحديد المتطوع أولاً')
      return
    }

    if (!selectedActivityId || !currentActivity) {
      toast.error('يرجى اختيار النشاط أو العمل')
      return
    }

    if (!pointsValidation.valid) {
      toast.error(pointsValidation.error || 'يرجى تصحيح قيمة النقاط')
      return
    }

    if (!reasonInput.trim() || reasonInput.trim().length < 6) {
      toast.error('يرجى كتابة سبب مفصل لمنح النقاط (بحد أدنى 6 أحرف)')
      return
    }

    if (currentActivity.requires_attachment && !attachmentFile) {
      toast.error('هذا النشاط يتطلب إرفاق ملف أو صورة إثبات وفق سياسة EMC')
      return
    }

    try {
      setSubmitting(true)
      const formData = new FormData()
      formData.append('user_id', String(selectedUserId))
      if (currentVolunteer?.department_id) {
        formData.append('department_id', String(currentVolunteer.department_id))
      }
      formData.append('activity_id', String(selectedActivityId))
      formData.append('points', pointsInput)
      formData.append('reason', reasonInput.trim())
      if (attachmentFile) {
        formData.append('attachment', attachmentFile)
      }

      const res = await submitPointsRequest(formData)
      toast.success(res.message || 'تم إرسال الطلب للاعتماد بنجاح')

      // إعادة تعيين الحقول
      setSelectedUserId('')
      setSelectedActivityId('')
      setSelectedCategoryKey('')
      setPointsInput('')
      setReasonInput('')
      setAttachmentFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      onAwarded()
    } catch (err) {
      const msg = serverMessage(err, 'تعذر إرسال طلب النقاط')
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      ref={formRef}
      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-black text-navy">منح نقاط لأعضاء الفريق</h2>
          <p className="mt-0.5 text-xs font-semibold text-muted-500">
            واجهة منح نقاط المتطوعين — تُرسل الطلبات للاعتماد إلى إدارة الموارد البشرية.
          </p>
        </div>
        <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-black text-accent-700">
          مسار اعتماد HR
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* 1. حقل البحث باسم المتطوع */}
        <div>
          <label htmlFor="volunteer-search" className="mb-1 block text-xs font-bold text-slate-700">
            1. البحث عن المتطوع
          </label>
          <div className="relative">
            <Search
              size={15}
              className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="volunteer-search"
              type="text"
              placeholder="اكتب اسم المتطوع للبحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${fieldClass} ps-10`}
            />
          </div>
        </div>

        {/* 2. حقل اختيار وتصفية الإدارة — يعرض جميع الإدارات المعتمدة في EMC */}
        <div>
          <label htmlFor="dept-select" className="mb-1 block text-xs font-bold text-slate-700">
            2. الإدارة <span className="text-slate-400 font-normal">(لتصفية المستحقين)</span>
          </label>
          <div className="relative">
            <Building2
              size={15}
              className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <select
              id="dept-select"
              value={selectedDeptId}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value)
                setSelectedDeptId(val)
                setSelectedUserId('') // إعادة تعيين المتطوع عند تغيير الإدارة
              }}
              className={`${fieldClass} ps-10`}
            >
              <option value="all">جميع الإدارات بالمركز ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. حقل المتطوع */}
        <div>
          <label htmlFor="volunteer-select" className="mb-1 block text-xs font-bold text-slate-700">
            3. المتطوع المستحق <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <UserCheck
              size={15}
              className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <select
              id="volunteer-select"
              required
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
              className={`${fieldClass} ps-10`}
              disabled={status === 'loading'}
            >
              <option value="">-- اختر المتطوع --</option>
              {filteredPeople.length === 0 ? (
                <option value="" disabled>
                  {selectedDeptId !== 'all' ? 'لا يوجد أعضاء مسجلين بهذه الإدارة حالياً' : 'لا يوجد أعضاء متاحين'}
                </option>
              ) : (
                filteredPeople.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.name} {p.department ? `(${p.department})` : ''} — {p.role_title ?? 'عضو'}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* بطاقة معلومات المتطوع المختار وسقفه الشهري */}
          {currentVolunteer && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50/80 p-2.5 text-[11px] font-bold text-sky-900 border border-sky-100">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-sky-600" />
                <span>{currentVolunteer.name}</span>
                {currentVolunteer.department && (
                  <span className="text-sky-600">({currentVolunteer.department})</span>
                )}
              </div>
              <div className="tabular-nums">
                رصيد الشهر:{' '}
                <span className="font-black text-navy">{formatNumber(currentVolunteer.month_points)}</span> /{' '}
                {formatNumber(monthlyCap)} · المتبقي:{' '}
                <span className="font-black text-accent-700">
                  {formatNumber(Math.max(0, monthlyCap - currentVolunteer.month_points))} نقطة
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. حقل التصنيف */}
        <div>
          <label htmlFor="category-select" className="mb-1 block text-xs font-bold text-slate-700">
            4. التصنيف الرئيسي <span className="text-rose-500">*</span>
          </label>
          <select
            id="category-select"
            required
            value={selectedCategoryKey}
            onChange={(e) => {
              setSelectedCategoryKey(e.target.value)
              setSelectedActivityId('') // تصفير النشاط التابع
            }}
            className={fieldClass}
          >
            <option value="">-- اختر التصنيف من سياسة EMC --</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name_ar}
              </option>
            ))}
          </select>
        </div>

        {/* 5. حقل النشاط أو العمل */}
        {selectedCategoryKey && (
          <div>
            <label htmlFor="activity-select" className="mb-1 block text-xs font-bold text-slate-700">
              5. النشاط أو العمل <span className="text-rose-500">*</span>
            </label>
            <select
              id="activity-select"
              required
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value ? Number(e.target.value) : '')}
              className={fieldClass}
            >
              <option value="">-- اختر النشاط التابع للتصنيف --</option>
              {currentCategoryActivities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name_ar} ({a.type === 'fixed' ? `${a.points_min} نقطة` : `${a.points_min}–${a.points_max} نقطة`})
                </option>
              ))}
            </select>

            {/* تفاصيل النشاط والقيود والوصف */}
            {currentActivity && (
              <div className="mt-2.5 rounded-2xl border border-slate-200/80 bg-slate-50 p-3 space-y-1.5 text-xs text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-black text-navy">
                    <Info size={14} className="text-accent-500" />
                    <span>النطاق المسموح:</span>
                    <span className="rounded-lg bg-white px-2 py-0.5 text-accent-700 border border-slate-200">
                      {currentActivity.type === 'fixed'
                        ? `${currentActivity.points_min} نقطة ثابتة`
                        : `${currentActivity.points_min} إلى ${currentActivity.points_max} نقطة`}
                    </span>
                  </div>

                  {currentActivity.requires_attachment && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10.5px] font-black text-amber-800">
                      <FileCheck2 size={12} />
                      يتطلب إثبات / مرفق إلزامي
                    </span>
                  )}
                </div>

                {currentActivity.description_ar && (
                  <p className="text-[11.5px] font-semibold leading-relaxed text-slate-600">
                    {currentActivity.description_ar}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. حقل النقاط */}
        {currentActivity && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="points-input" className="text-xs font-bold text-slate-700">
                6. عدد النقاط <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {currentActivity.type === 'fixed' ? 'قيمة ثابتة' : 'ضمن النطاق المعتمد'}
              </span>
            </div>

            <input
              id="points-input"
              type="number"
              dir="ltr"
              required
              readOnly={currentActivity.type === 'fixed'}
              value={pointsInput}
              onChange={(e) => setPointsInput(e.target.value)}
              placeholder="أدخل عدد النقاط"
              className={`${fieldClass} ${
                currentActivity.type === 'fixed'
                  ? 'bg-slate-100/80 cursor-not-allowed font-black text-accent-700'
                  : ''
              }`}
            />

            {pointsValidation.error && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-rose-600">
                <AlertCircle size={12} />
                {pointsValidation.error}
              </p>
            )}
          </div>
        )}

        {/* 7. حقل السبب أو التوثيق */}
        <div>
          <label htmlFor="reason-input" className="mb-1 block text-xs font-bold text-slate-700">
            7. السبب أو التوثيق <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="reason-input"
            required
            rows={2}
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder="اكتب وصفاً واضحاً ومفصلاً لإنجاز المتطوع وسبب استحقاقه..."
            className={`${fieldClass} resize-none`}
          />
          <p className="mt-0.5 text-[10.5px] font-semibold text-slate-400">
            مثال: «إعداد التقرير الشهري للإدارة وتسليمه في الموعد بجودة مكتملة»
          </p>
        </div>

        {/* 8. حقل إرفاق ملف أو صورة — اختياري أو إلزامي */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              8. إرفاق ملف أو صورة داعمة{' '}
              {currentActivity?.requires_attachment ? (
                <span className="text-rose-600 font-black">(إلزامي لهذا النشاط)</span>
              ) : (
                <span className="text-slate-400 font-normal">(اختياري)</span>
              )}
            </label>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setAttachmentFile(file)
            }}
            className="hidden"
            id="attachment-upload"
          />

          {!attachmentFile ? (
            <label
              htmlFor="attachment-upload"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:border-slate-400"
            >
              <FileUp size={16} className="text-slate-400" />
              <span>اختر ملفاً أو صورة للإرفاق (PNG, JPG, PDF, DOCX حتى 10MB)</span>
            </label>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2 text-xs font-bold text-emerald-900">
              <div className="flex items-center gap-2 truncate">
                <FileCheck2 size={16} className="text-emerald-600 shrink-0" />
                <span className="truncate">{attachmentFile.name}</span>
                <span className="text-[10px] text-emerald-600">
                  ({Math.round(attachmentFile.size / 1024)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachmentFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="ms-2 text-rose-500 hover:text-rose-700"
                title="إزالة المرفق"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* 9. زر الإرسال للاعتماد */}
        <button
          type="submit"
          disabled={
            submitting ||
            !selectedUserId ||
            !selectedActivityId ||
            !pointsValidation.valid ||
            !reasonInput.trim() ||
            (currentActivity?.requires_attachment && !attachmentFile)
          }
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-accent-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Send size={15} aria-hidden="true" />
          {submitting ? 'جارٍ إرسال الطلب للاعتماد...' : 'إرسال للاعتماد'}
        </button>

        <p className="text-center text-[11px] font-semibold text-slate-400">
          تنبيه: لن يتم زيادة رصيد المتطوع أو ترقية مستواه إلا بعد اعتماد الطلب من إدارة الموارد البشرية.
        </p>
      </form>
    </section>
  )
}
