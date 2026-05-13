import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchWhatsAppIntegration, sendWhatsAppTestMessage } from '@/api/integrationsApi'
import SecretWarningPanel from '@/components/enterprise/SecretWarningPanel'
import type { WhatsAppIntegrationPreview } from '@/types/phase7'

type ProviderChoice = WhatsAppIntegrationPreview['mode']

export default function WhatsAppIntegrationPage() {
  const [model, setModel] = useState<WhatsAppIntegrationPreview | null>(null)
  const [provider, setProvider] = useState<ProviderChoice>('fake')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const m = await fetchWhatsAppIntegration()
      if (!cancelled) {
        setModel(m)
        setProvider(m.mode)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onTest() {
    await sendWhatsAppTestMessage({ template: 'emc_smoke_test' })
    toast.success('تم إرسال طلب رسالة الاختبار إلى الطابور')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">WhatsApp</p>
          <h1 className="text-2xl font-black text-deepBlue">إعدادات واتساب</h1>
          <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
            اختيار موفر الرسائل للاختبار — القيم السرية مخفية بالكامل وتُدار من الخادم.
          </p>
        </div>
        <Link to="/dashboard/admin/integrations" className="text-xs font-black text-customBlue hover:underline">
          العودة لمركز التكاملات
        </Link>
      </motion.div>

      <SecretWarningPanel body="لن يتم عرض أي Token أو Secret هنا. أي تغيير حقيقي يتطلب ضبطًا على الخادم وبيئة الإنتاج." />

      <section className="mt-8 space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-black text-deepBlue">موفر الخدمة</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              { id: 'meta_cloud' as const, title: 'Meta Cloud API', hint: 'Production-grade messaging' },
              { id: 'twilio' as const, title: 'Twilio WhatsApp', hint: 'Enterprise routing' },
              { id: 'fake' as const, title: 'وضع تجريبي / محلي', hint: 'بدون إرسال خارجي' },
              { id: 'local' as const, title: 'مزود داخلي', hint: 'محاكاة داخل الشبكة' },
            ] satisfies { id: ProviderChoice; title: string; hint: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setProvider(opt.id)}
              className={[
                'rounded-2xl border px-4 py-4 text-right transition',
                provider === opt.id
                  ? 'border-customBlue bg-sky-50 shadow-inner shadow-sky-100'
                  : 'border-slate-100 bg-[#F6F8FB] hover:border-customBlue/25',
              ].join(' ')}
            >
              <p className="text-sm font-black text-deepBlue">{opt.title}</p>
              <p className="mt-2 text-xs font-bold text-slate-500">{opt.hint}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-[#F6F8FB] p-4 ring-1 ring-slate-100">
            <p className="text-[11px] font-black text-slate-400">Meta Cloud API</p>
            <p className="mt-2 font-mono text-xs font-bold text-deepBlue">{model?.meta_placeholder_ar}</p>
          </div>
          <div className="rounded-xl bg-[#F6F8FB] p-4 ring-1 ring-slate-100">
            <p className="text-[11px] font-black text-slate-400">Twilio</p>
            <p className="mt-2 font-mono text-xs font-bold text-deepBlue">{model?.twilio_placeholder_ar}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onTest()}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-300/40 transition hover:bg-emerald-700"
        >
          إرسال رسالة اختبار
        </button>
      </section>
    </div>
  )
}
