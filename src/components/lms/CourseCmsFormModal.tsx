import { type FormEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import EmcDateTimePicker from '@/components/ui/EmcDateTimePicker'
import { cn } from '@/lib/utils'
import { formatDatetimeLocalPreview } from '@/utils/datetimeLocal'

export { formatDatetimeLocalPreview }

const INPUT =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#22334A] outline-none transition focus:border-[#2691C2]/50 focus:ring-4 focus:ring-[#2691C2]/10'
const INPUT_ERR = 'border-rose-400 focus:border-rose-400 focus:ring-rose-100'
const INPUT_OK = 'border-[#22334A]/12'

type ModalProps = {
  title: string
  subtitle?: string
  eyebrow?: string
  onClose: () => void
  onSubmit: () => void | Promise<void>
  busy?: boolean
  submitLabel?: string
  cancelLabel?: string
  formId: string
  children: ReactNode
}

export function CmsFormModal({
  title,
  subtitle,
  eyebrow,
  onClose,
  onSubmit,
  busy = false,
  submitLabel = 'حفظ التغييرات',
  cancelLabel = 'إلغاء',
  formId,
  children,
}: ModalProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void onSubmit()
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-[#22334A]/50 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      dir="rtl"
      role="presentation"
    >
      <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={onClose} disabled={busy} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="relative z-[210] flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#22334A]/10 bg-white shadow-[0_24px_64px_-16px_rgba(34,51,74,0.35)]"
      >
        <div className="border-b border-slate-100 bg-gradient-to-l from-[#22334A] to-[#1a2940] px-5 py-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-right">
              {eyebrow ?
                <p className="text-[10px] font-black tracking-[0.14em] text-[#2691C2]">{eyebrow}</p>
              : null}
              <h2 id={`${formId}-title`} className="text-lg font-black leading-snug">
                {title}
              </h2>
              {subtitle ?
                <p className="mt-1 text-[12px] font-medium leading-relaxed text-white/65">{subtitle}</p>
              : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <form id={formId} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 pb-8 sm:px-6">{children}</div>

          <div className="sticky bottom-0 flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur-sm sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-[#22334A] transition hover:bg-slate-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-[#2691C2] px-5 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:bg-[#1e7dab] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {busy ? 'جارٍ الحفظ…' : submitLabel}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export function CmsFormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <h3 className="mb-3 text-[11px] font-black tracking-wide text-[#EC943C]">{title}</h3>
      <div className="space-y-3.5">{children}</div>
    </section>
  )
}

export function CmsField({
  label,
  value,
  onChange,
  hint,
  dir = 'rtl',
  type = 'text',
  error,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  dir?: 'rtl' | 'ltr'
  type?: string
  error?: string
  required?: boolean
}) {
  return (
    <label className="block text-right">
      <span className="text-[12px] font-black text-[#22334A]/70">
        {label}
        {required ? <span className="text-[#EC943C]"> *</span> : null}
      </span>
      {hint ? <p className="mt-0.5 text-[11px] font-medium text-slate-400">{hint}</p> : null}
      <input
        type={type}
        dir={dir}
        required={required}
        className={cn('mt-1.5', INPUT, error ? INPUT_ERR : INPUT_OK)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="mt-1 text-[11px] font-bold text-rose-700">{error}</p> : null}
    </label>
  )
}

export function CmsTextarea({
  label,
  value,
  onChange,
  rows = 3,
  error,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  error?: string
  placeholder?: string
}) {
  return (
    <label className="block text-right">
      <span className="text-[12px] font-black text-[#22334A]/70">{label}</span>
      <textarea
        rows={rows}
        placeholder={placeholder}
        className={cn('mt-1.5 resize-none', INPUT, error ? INPUT_ERR : INPUT_OK)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="mt-1 text-[11px] font-bold text-rose-700">{error}</p> : null}
    </label>
  )
}

export function CmsSelect({
  label,
  value,
  onChange,
  options,
  error,
  dir = 'rtl',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  error?: string
  dir?: 'rtl' | 'ltr'
}) {
  return (
    <label className="block text-right">
      <span className="text-[12px] font-black text-[#22334A]/70">{label}</span>
      <select
        dir={dir}
        className={cn('mt-1.5 appearance-none', INPUT, error ? INPUT_ERR : INPUT_OK)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-[11px] font-bold text-rose-700">{error}</p> : null}
    </label>
  )
}

/** Modern EMC date/time picker with Arabic preview. */
export function CmsDatetimeField({
  label,
  value,
  onChange,
  error,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  required?: boolean
}) {
  return (
    <EmcDateTimePicker
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      required={required}
    />
  )
}

export type SessionLocationType = 'online' | 'offline' | 'hybrid'

export function normalizeSessionLocationType(raw: string): SessionLocationType {
  const v = raw.trim().toLowerCase()
  if (v === 'offline' || v === 'onsite' || v === 'in_person' || v === 'حضوري') return 'offline'
  if (v === 'hybrid' || v === 'mixed') return 'hybrid'
  return 'online'
}

export function sessionShowsMeetingUrl(type: SessionLocationType): boolean {
  return type === 'online' || type === 'hybrid'
}

export function sessionShowsLocation(type: SessionLocationType): boolean {
  return type === 'offline' || type === 'hybrid'
}

export function validateSessionDraft(d: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {}
  const locType = normalizeSessionLocationType(d.location_type ?? 'online')

  if (!d.title?.trim()) errors.title = 'العنوان مطلوب.'
  if (!d.start_at?.trim()) errors.start_at = 'وقت البداية مطلوب.'

  if (sessionShowsMeetingUrl(locType) && !d.meeting_url?.trim()) {
    errors.meeting_url = 'رابط الاجتماع مطلوب للجلسات الأونلاين.'
  }
  if (sessionShowsLocation(locType) && !d.location?.trim()) {
    errors.location = 'الموقع مطلوب للجلسات الحضورية.'
  }

  if (d.start_at?.trim() && d.end_at?.trim()) {
    const start = new Date(d.start_at)
    const end = new Date(d.end_at)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
      errors.end_at = 'وقت النهاية يجب أن يكون بعد وقت البداية.'
    }
  }

  return errors
}

export const SESSION_LOCATION_OPTIONS = [
  { value: 'online', label: 'أونلاين' },
  { value: 'offline', label: 'حضوري' },
  { value: 'hybrid', label: 'مختلط (أونلاين + حضور)' },
] as const

export const SESSION_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'مجدولة' },
  { value: 'live', label: 'مباشرة الآن' },
  { value: 'completed', label: 'منتهية' },
  { value: 'cancelled', label: 'ملغاة' },
] as const

export const MATERIAL_KIND_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'video', label: 'فيديو' },
  { value: 'link', label: 'رابط' },
  { value: 'slides', label: 'شرائح' },
  { value: 'document', label: 'مستند' },
  { value: 'other', label: 'أخرى' },
] as const

export const VISIBILITY_OPTIONS = [
  { value: 'enrolled', label: 'المسجّلون فقط' },
  { value: 'public', label: 'عام' },
] as const

export const SUBMISSION_TYPE_OPTIONS = [
  { value: 'text', label: 'نص فقط' },
  { value: 'file', label: 'ملف فقط' },
  { value: 'both', label: 'نص + ملف' },
] as const

export const YES_NO_OPTIONS = [
  { value: '1', label: 'نعم' },
  { value: '0', label: 'لا' },
] as const
