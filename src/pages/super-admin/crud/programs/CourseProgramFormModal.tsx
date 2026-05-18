import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CatalogTrackRow } from '@/api/superAdminCatalogApi'
import { upsertCourse, type CourseUpsertPayload, type OpsDepartmentOption } from '@/api/adminCoursesApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import type { Course } from '@/types'
import { CrudModal } from '@/pages/super-admin/crud/shared/Modal'
import { defaultSlugFromTitle, inferProgramKind, type ProgramKind } from '@/pages/super-admin/crud/programs/programConsoleUtils'

const KINDS: ProgramKind[] = ['course', 'workshop', 'program', 'track']

const LOC_TYPES = [
  { v: 'online', label: 'عن بُعد' },
  { v: 'offline', label: 'حضوري' },
  { v: 'hybrid', label: 'مختلط' },
]

type Props = {
  open: boolean
  initial: Course | null
  tracks: CatalogTrackRow[]
  departments: OpsDepartmentOption[]
  onClose: () => void
  onSaved: () => void
}

export function CourseProgramFormModal({ open, initial, tracks, departments, onClose, onSaved }: Props) {
  const editing = initial != null
  const [busy, setBusy] = useState(false)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [kind, setKind] = useState<ProgramKind>('course')
  const [trackId, setTrackId] = useState<string>('')
  const [departmentId, setDepartmentId] = useState<string>('')
  const [instructorId, setInstructorId] = useState<string>('')
  const [priceFree, setPriceFree] = useState(true)
  const [price, setPrice] = useState('0')
  const [capacity, setCapacity] = useState('')
  const [status, setStatus] = useState('draft')
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [locationType, setLocationType] = useState('online')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [meetingLink, setMeetingLink] = useState('')

  useEffect(() => {
    if (!open) return
    if (!initial) {
      setTitle('')
      setSlug('')
      setDescription('')
      setShortDescription('')
      setKind('course')
      setTrackId('')
      setDepartmentId('')
      setInstructorId('')
      setPriceFree(true)
      setPrice('0')
      setCapacity('')
      setStatus('draft')
      setRegistrationOpen(true)
      setIsOnline(true)
      setLocationType('online')
      setStartDate('')
      setStartTime('')
      setEndDate('')
      setMeetingLink('')
      return
    }
    setTitle(initial.title ?? '')
    setSlug(initial.slug ?? '')
    setDescription(initial.description ?? '')
    setShortDescription(initial.short_description ?? '')
    setKind(inferProgramKind(initial))
    setTrackId(initial.track_id != null ? String(initial.track_id) : '')
    setDepartmentId(initial.department_id != null ? String(initial.department_id) : '')
    setInstructorId(initial.instructor_id != null ? String(initial.instructor_id) : '')
    const free = String(initial.type) !== 'paid'
    setPriceFree(free)
    setPrice(String(initial.price ?? '0'))
    setCapacity(initial.capacity != null ? String(initial.capacity) : '')
    setStatus(String(initial.status ?? 'draft'))
    setRegistrationOpen(
      typeof initial.registration_open === 'boolean' ? initial.registration_open :
        typeof initial.registration_open === 'number' ?
          initial.registration_open === 1
        : true,
    )
    setIsOnline(Boolean(initial.is_online))
    setLocationType((initial.location_type as string) || (initial.is_online ? 'online' : 'offline'))
    setStartDate(initial.start_date ? String(initial.start_date).slice(0, 10) : '')
    setStartTime(initial.start_time ? String(initial.start_time).slice(0, 8) : '')
    setEndDate(initial.end_date ? String(initial.end_date).slice(0, 10) : '')
    setMeetingLink(initial.meeting_link ?? '')
  }, [open, initial])

  async function submit() {
    if (!title.trim()) {
      toast.warning('عنوان الدورة مطلوب')
      return
    }
    setBusy(true)
    try {
      const payload: CourseUpsertPayload = {
        title: title.trim(),
        slug: slug.trim() || defaultSlugFromTitle(title),
        description: description.trim() || undefined,
        short_description: shortDescription.trim() || undefined,
        program_kind: kind,
        type: priceFree ? 'free' : 'paid',
        price: priceFree ? 0 : Number(price) || 0,
        is_online: isOnline,
        location_type: locationType,
        capacity: capacity.trim() ? Number(capacity) : null,
        status,
        registration_open: registrationOpen,
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        study_time: startTime.trim() || null,
        meeting_link: meetingLink.trim() || null,
        track_id: trackId ? Number(trackId) : null,
        department_id: departmentId ? Number(departmentId) : null,
        instructor_id: instructorId ? Number(instructorId) : null,
        is_published: String(status).toLowerCase() === 'published',
      }
      await upsertCourse(payload, editing ? initial?.id : undefined)
      toast.success(editing ? 'تم تحديث البرنامج' : 'تم إنشاء البرنامج')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <CrudModal
      open={open}
      onClose={onClose}
      title={editing ? 'تعديل برنامج / دورة' : 'إنشاء برنامج / دورة'}
      subtitle="التواريخ اختيارية — الفراغ يعني دفعة قادمة بدون موعد محدد بعد."
      widthClassName="max-w-2xl"
    >
      <div className="max-h-[min(70vh,640px)] space-y-6 overflow-y-auto pe-1 text-right" dir="rtl">
        <section className="space-y-3 rounded-2xl border border-deepBlue/[0.06] bg-white/90 p-4 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">المحتوى</h3>
          <label className="block text-xs font-black text-deepBlue">
            العنوان
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none ring-customBlue/0 focus:ring-2"
            />
          </label>
          <label className="block text-xs font-black text-deepBlue">
            المختصر (slug)
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              dir="ltr"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-customBlue/25"
            />
          </label>
          <label className="block text-xs font-black text-deepBlue">
            الوصف
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-customBlue/25"
            />
          </label>
          <label className="block text-xs font-black text-deepBlue">
            تعريف قصير
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-customBlue/25"
            />
          </label>
        </section>

        <section className="grid gap-3 rounded-2xl border border-deepBlue/[0.06] bg-slate-50/80 p-4 sm:grid-cols-2">
          <label className="block text-xs font-black text-deepBlue">
            النوع
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ProgramKind)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k === 'course' ? 'دورة' : k === 'workshop' ? 'ورشة' : k === 'program' ? 'برنامج' : 'مسار'}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-black text-deepBlue">
            الإدارة
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">— اختياري —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-black text-deepBlue sm:col-span-2">
            المسار / البرنامج الأب
            <select
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">— اختياري —</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-black text-deepBlue">
            معرّف مدرب (اختياري)
            <input
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-customBlue/25"
              placeholder="رقم المستخدم في النظام"
            />
          </label>
        </section>

        <section className="grid gap-3 rounded-2xl border border-deepBlue/[0.06] bg-white p-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-xs font-black text-deepBlue">
            <input
              type="checkbox"
              checked={priceFree}
              onChange={(e) => setPriceFree(e.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            مجانية
          </label>
          {!priceFree ?
            <label className="block text-xs font-black text-deepBlue">
              السعر
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm"
              />
            </label>
          : <span />}
          <label className="block text-xs font-black text-deepBlue">
            السعة
            <input
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block text-xs font-black text-deepBlue">
            حالة النشر
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="draft">مسودّة</option>
              <option value="published">منشور</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-black text-deepBlue sm:col-span-2">
            <input
              type="checkbox"
              checked={registrationOpen}
              onChange={(e) => setRegistrationOpen(e.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            التسجيل مفتوح
          </label>
        </section>

        <section className="grid gap-3 rounded-2xl border border-deepBlue/[0.06] bg-[#FAFCFF] p-4 sm:grid-cols-2">
          <h3 className="sm:col-span-2 text-xs font-black uppercase tracking-widest text-slate-500">الجدولة (اختيارية)</h3>
          <label className="block text-xs font-black text-deepBlue">
            تاريخ البداية
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm"
            />
          </label>
          <label className="block text-xs font-black text-deepBlue">
            وقت البداية
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm"
            />
          </label>
          <label className="block text-xs font-black text-deepBlue">
            تاريخ الانتهاء
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm"
            />
          </label>
          <label className="block text-xs font-black text-deepBlue">
            نوع الموقع
            <select
              value={locationType}
              onChange={(e) => {
                setLocationType(e.target.value)
                setIsOnline(e.target.value === 'online' || e.target.value === 'hybrid')
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              {LOC_TYPES.map((x) => (
                <option key={x.v} value={x.v}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-black text-deepBlue sm:col-span-2">
            رابط الاجتماع
            <input
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              dir="ltr"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm"
            />
          </label>
        </section>

        <div className="flex flex-wrap justify-end gap-2 pb-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-black text-deepBlue hover:bg-slate-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#EC943C] to-[#2691C2] px-6 py-2.5 text-sm font-black text-white shadow-lg disabled:opacity-50"
          >
            {busy ?
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> جاري الحفظ…
              </>
            : editing ?
              'حفظ التعديلات'
            : 'إنشاء'}
          </button>
        </div>
      </div>
    </CrudModal>
  )
}
