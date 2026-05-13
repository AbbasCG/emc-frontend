import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Handshake } from 'lucide-react'
import { submitPartnershipApplication } from '@/api/partnersApi'

export default function PartnershipApplyPage() {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr('')
    const fd = new FormData(e.currentTarget)
    const payload = {
      institution_name: String(fd.get('institution_name') ?? ''),
      institution_type: String(fd.get('institution_type') ?? '') || undefined,
      contact_name: String(fd.get('contact_name') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: String(fd.get('phone') ?? '') || undefined,
      message: String(fd.get('message') ?? ''),
    }
    setBusy(true)
    try {
      await submitPartnershipApplication(payload)
      setDone(true)
      e.currentTarget.reset()
    } catch {
      setErr('تعذر إرسال الطلب. تحقق من الاتصال أو جرّب لاحقاً.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[1.35rem] bg-gradient-to-bl from-white via-sky-50/30 to-white p-[1px] shadow-xl ring-1 ring-deepBlue/[0.08]"
      >
        <div className="rounded-[1.3rem] bg-white px-8 py-10 text-right">
          <Handshake className="text-customOrange" size={32} />
          <h1 className="mt-4 text-3xl font-black text-deepBlue">طلب شراكة مؤسسية</h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
            نموذج عام أنيق يعكس هوية EMC — يُرسل إلى خط أنابيب العمليات بعد اعتماد الـ API.
          </p>
        </div>
      </motion.div>

      <div className="mt-10">
        {done ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-emerald-50 px-6 py-12 text-center text-lg font-black text-emerald-800 ring-1 ring-emerald-100"
          >
            شكراً لاهتمامكم — سيُتابع فريق الشراكات طلبكم.
          </motion.p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5 rounded-[1.35rem] bg-deepBlue/[0.02] p-8 ring-1 ring-deepBlue/[0.06]">
            {err && <p className="rounded-xl bg-red-50 px-4 py-2 text-center text-sm font-bold text-red-700">{err}</p>}
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              اسم المؤسسة
              <input name="institution_name" required className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold shadow-sm" />
            </label>
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              نوع المؤسسة
              <select name="institution_type" className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold shadow-sm">
                <option value="">— اختر —</option>
                <option value="أكاديمي">أكاديمي</option>
                <option value="قطاع خاص">قطاع خاص</option>
                <option value="مجتمع مدني">مجتمع مدني</option>
                <option value="حكومي">حكومي</option>
              </select>
            </label>
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              اسم الشخص المسؤول
              <input name="contact_name" required className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold shadow-sm" />
            </label>
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              البريد الإلكتروني
              <input name="email" type="email" required className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold shadow-sm" />
            </label>
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              الجوال
              <input name="phone" className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold shadow-sm" />
            </label>
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              الرسالة والاقتراح
              <textarea name="message" required rows={5} className="resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold shadow-sm" />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-customOrange py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60"
            >
              {busy ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
