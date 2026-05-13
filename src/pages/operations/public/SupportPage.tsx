import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { LifeBuoy } from 'lucide-react'
import { submitSupportTicket } from '@/api/supportApi'

export default function SupportPage() {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr('')
    const fd = new FormData(e.currentTarget)
    const payload = {
      type: String(fd.get('type') ?? ''),
      priority: String(fd.get('priority') ?? ''),
      subject: String(fd.get('subject') ?? ''),
      message: String(fd.get('message') ?? ''),
      contact_name: String(fd.get('contact_name') ?? ''),
      contact_email: String(fd.get('contact_email') ?? ''),
      contact_phone: String(fd.get('contact_phone') ?? '') || undefined,
    }
    setBusy(true)
    try {
      await submitSupportTicket(payload)
      setDone(true)
      e.currentTarget.reset()
    } catch {
      setErr('تعذر إرسال التذكرة. حاول لاحقاً أو تواصل عبر صفحة الاتصال.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.35rem] bg-gradient-to-bl from-deepBlue to-[#152536] p-8 text-center text-white shadow-xl"
      >
        <LifeBuoy className="mx-auto text-customOrange" size={36} />
        <h1 className="mt-4 text-2xl font-black">مركز المساعدة</h1>
        <p className="mt-3 text-sm font-semibold text-white/75">
          صفحة عامة بتجربة نظيفة — تُنشئ تذكرة دعم لفريق EMC الداخلي.
        </p>
      </motion.div>

      <div className="mt-10">
        {done ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-emerald-50 px-6 py-10 text-center font-black text-emerald-800 ring-1 ring-emerald-100"
          >
            تم استلام طلبك. سنعود إليك قريباً.
          </motion.p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5 rounded-[1.35rem] bg-white p-8 shadow-xl ring-1 ring-deepBlue/[0.06]">
            {err && <p className="rounded-xl bg-red-50 px-4 py-2 text-center text-sm font-bold text-red-700">{err}</p>}
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              نوع الطلب
              <select name="type" required className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold">
                <option value="تقني">تقني</option>
                <option value="مالي">مالي</option>
                <option value="عام">عام</option>
              </select>
            </label>
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              الأولوية
              <select name="priority" required className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold">
                <option value="منخفض">منخفض</option>
                <option value="متوسط">متوسط</option>
                <option value="عالي">عالي</option>
              </select>
            </label>
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              الموضوع
              <input name="subject" required className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold" />
            </label>
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              الرسالة
              <textarea name="message" required rows={5} className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold" />
            </label>
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              الاسم
              <input name="contact_name" required className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold" />
            </label>
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              البريد
              <input name="contact_email" type="email" required className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold" />
            </label>
            <label className="grid gap-2 text-right text-sm font-black text-deepBlue">
              الجوال (اختياري)
              <input name="contact_phone" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold" />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-customBlue py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60"
            >
              {busy ? 'جارٍ الإرسال...' : 'إرسال التذكرة'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
