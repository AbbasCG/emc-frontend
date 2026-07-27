import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { submitSupportTicket } from '@/api/supportApi'

const REQUEST_TYPES = [
  { value: 'general', label: 'استفسار عام' },
  { value: 'technical', label: 'دعم فني' },
  { value: 'partnership', label: 'شراكة' },
  { value: 'volunteer', label: 'تطوع' },
]

type FieldErrors = Record<string, string>

export default function SupportPage() {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  function validate(fd: FormData): FieldErrors {
    const e: FieldErrors = {}
    if (!String(fd.get('full_name') ?? '').trim()) e.full_name = 'الاسم الكامل مطلوب'
    const email = String(fd.get('email') ?? '').trim()
    if (!email) e.email = 'البريد الإلكتروني مطلوب'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'بريد إلكتروني غير صحيح'
    if (!String(fd.get('phone') ?? '').trim()) e.phone = 'رقم الجوال مطلوب'
    if (!String(fd.get('request_type') ?? '').trim()) e.request_type = 'نوع الطلب مطلوب'
    if (!String(fd.get('subject') ?? '').trim()) e.subject = 'الموضوع مطلوب'
    if (!String(fd.get('message') ?? '').trim()) e.message = 'الرسالة مطلوبة'
    return e
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const errs = validate(fd)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setBusy(true)
    try {
      await submitSupportTicket({
        full_name:    String(fd.get('full_name') ?? '').trim(),
        email:        String(fd.get('email') ?? '').trim(),
        phone:        String(fd.get('phone') ?? '').trim(),
        request_type: String(fd.get('request_type') ?? 'general'),
        subject:      String(fd.get('subject') ?? '').trim(),
        message:      String(fd.get('message') ?? '').trim(),
      })
      setDone(true)
      e.currentTarget.reset()
    } catch {
      setErrors({ _: 'تعذر إرسال التذكرة. حاول لاحقاً أو تواصل عبر صفحة الاتصال.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main dir="rtl" className="bg-white pt-[4.75rem] lg:pt-[5rem]">
      <PageHeader
        title="مركز المساعدة"
        subtitle="أرسل طلبك وسيتواصل معك فريق EMC في أقرب وقت."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'الدعم' },
        ]}
      />

      <div className="mx-auto max-w-2xl px-4 py-16">
        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-emerald-50 px-6 py-10 text-center ring-1 ring-emerald-100"
          >
            <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
            <p className="mt-4 font-black text-emerald-800 text-lg">تم استلام طلبك</p>
            <p className="mt-2 text-sm text-emerald-700">سيتواصل معك الفريق خلال وقت قصير.</p>
            <button
              onClick={() => setDone(false)}
              className="mt-6 rounded-xl bg-emerald-600 text-white px-6 py-2.5 text-sm font-black hover:bg-emerald-700 transition-colors"
            >
              إرسال طلب جديد
            </button>
          </motion.div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-[1.35rem] bg-white p-8 shadow-xl ring-1 ring-deepBlue/[0.06]">
            {errors._ && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
                <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
                {errors._}
              </div>
            )}

            <Field label="الاسم الكامل" name="full_name" required error={errors.full_name} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="البريد الإلكتروني" name="email" type="email" required error={errors.email} />
              <Field label="رقم الجوال" name="phone" type="tel" required error={errors.phone} />
            </div>

            <div>
              <label className="block text-sm font-black text-deepBlue mb-1.5">
                نوع الطلب <span className="text-rose-500">*</span>
              </label>
              <select
                name="request_type"
                className={`w-full rounded-xl border bg-slate-50 px-4 py-3 font-bold text-deepBlue focus:outline-none focus:ring-2 focus:ring-customBlue/30 ${errors.request_type ? 'border-rose-400' : 'border-slate-200'}`}
                defaultValue=""
              >
                <option value="" disabled>اختر نوع الطلب</option>
                {REQUEST_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.request_type && <p className="mt-1 text-xs text-rose-600">{errors.request_type}</p>}
            </div>

            <Field label="الموضوع" name="subject" required error={errors.subject} />
            <div>
              <label className="block text-sm font-black text-deepBlue mb-1.5">
                الرسالة <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="message"
                rows={5}
                className={`w-full resize-none rounded-xl border bg-slate-50 px-4 py-3 font-semibold text-deepBlue focus:outline-none focus:ring-2 focus:ring-customBlue/30 ${errors.message ? 'border-rose-400' : 'border-slate-200'}`}
                placeholder="اكتب رسالتك بالتفصيل..."
              />
              {errors.message && <p className="mt-1 text-xs text-rose-600">{errors.message}</p>}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-customBlue py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60 hover:bg-customBlue/90 transition-colors"
            >
              {busy ? 'جارٍ الإرسال...' : 'إرسال التذكرة'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

function Field({
  label, name, type = 'text', required = false, error,
}: {
  label: string; name: string; type?: string; required?: boolean; error?: string
}) {
  return (
    <div>
      <label className="block text-sm font-black text-deepBlue mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        name={name}
        type={type}
        className={`w-full rounded-xl border bg-slate-50 px-4 py-3 font-semibold text-deepBlue focus:outline-none focus:ring-2 focus:ring-customBlue/30 ${error ? 'border-rose-400' : 'border-slate-200'}`}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  )
}
