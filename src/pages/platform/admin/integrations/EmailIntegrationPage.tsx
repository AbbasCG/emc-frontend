import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchEmailIntegration, sendEmailSmokeTest } from '@/api/integrationsApi'
import SecretWarningPanel from '@/components/enterprise/SecretWarningPanel'
import type { EmailIntegrationPreview } from '@/types/phase7'

export default function EmailIntegrationPage() {
  const [model, setModel] = useState<EmailIntegrationPreview | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const m = await fetchEmailIntegration()
      if (!cancelled) setModel(m)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onTest() {
    await sendEmailSmokeTest()
    toast.success('تمت جدولة رسالة الاختبار عبر الخادم')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Email</p>
          <h1 className="text-2xl font-black text-deepBlue">إعدادات البريد</h1>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
            عرض تشغيلي للقوالب ومسارات SMTP دون كشف أي اعتمادات حساسة.
          </p>
        </div>
        <Link to="/dashboard/admin/integrations" className="text-xs font-black text-customBlue hover:underline">
          العودة لمركز التكاملات
        </Link>
      </motion.div>

      <SecretWarningPanel body="مفاتيح SMTP مخزنة على الخادم فقط. الواجهة لا تقرأ أو تعرض القيم الحقيقية أبدًا." />

      <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-slate-400">مزود الإرسال</p>
            <h2 className="mt-1 text-xl font-black text-deepBlue">{model?.driver_label_ar}</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">{model?.driver_hint_ar}</p>
          </div>
          <button
            type="button"
            onClick={() => void onTest()}
            className="rounded-xl bg-customBlue px-5 py-2.5 text-xs font-black text-white shadow-md transition hover:opacity-95"
          >
            إرسال بريد اختبار
          </button>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-[#F6F8FB]">
              <tr className="text-right">
                <th className="px-4 py-3 text-xs font-black text-slate-500">القالب</th>
                <th className="px-4 py-3 text-xs font-black text-slate-500">المعرّف التقني</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(model?.templates ?? []).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-black text-deepBlue">{t.name_ar}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600" dir="ltr">
                    {t.slug}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
