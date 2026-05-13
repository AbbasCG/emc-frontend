import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  fetchWebhookDeliveries,
  fetchWebhookEndpoint,
  patchWebhookEndpoint,
  testWebhookEndpoint,
  WEBHOOK_EVENT_LABELS_AR,
} from '@/api/webhooksApi'
import WebhookDeliveryTimeline from '@/components/enterprise/WebhookDeliveryTimeline'
import SecretWarningPanel from '@/components/enterprise/SecretWarningPanel'
import { LoadingSkeletonStack } from '@/components/enterprise/LoadingSkeleton'
import type { WebhookEndpoint, WebhookPhaseEvent } from '@/types/phase7'
import { WEBHOOK_PHASE_EVENTS } from '@/types/phase7'

export default function AdminWebhookDetailPage() {
  const { id } = useParams()
  const webhookId = Number(id)
  const [endpoint, setEndpoint] = useState<WebhookEndpoint | undefined>()
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [active, setActive] = useState(true)
  const [events, setEvents] = useState<WebhookPhaseEvent[]>([])
  const [timeline, setTimeline] = useState<Awaited<ReturnType<typeof fetchWebhookDeliveries>>>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const ep = await fetchWebhookEndpoint(webhookId)
      if (!cancelled && ep) {
        setEndpoint(ep)
        setUrl(ep.url)
        setActive(ep.active)
        setEvents(ep.events)
        setLoading(false)
      } else if (!cancelled) {
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [webhookId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const d = await fetchWebhookDeliveries(webhookId)
      if (!cancelled) setTimeline(d)
    })()
    return () => {
      cancelled = true
    }
  }, [webhookId])

  function toggleEvent(ev: WebhookPhaseEvent) {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev]))
  }

  async function onSave() {
    const updated = await patchWebhookEndpoint(webhookId, { url, active, events })
    if (updated) {
      setEndpoint(updated)
      toast.success('تم تحديث نقطة النهاية')
    }
  }

  async function onTest() {
    await testWebhookEndpoint(webhookId, { ping: true })
    toast.success('تم إرسال حدث اختباري')
    setTimeline(await fetchWebhookDeliveries(webhookId))
  }

  if (!Number.isFinite(webhookId)) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl rounded-2xl border border-red-100 bg-red-50 p-6 text-red-900">
        معرّف غير صالح
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Webhook</p>
          <h1 className="text-2xl font-black text-deepBlue">تفاصيل التسليم</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            حدّث عنوان الاستقبال، الأحداث النشطة، واختبر التسليم مع سجل زمني للاستجابات.
          </p>
        </div>
        <Link to="/dashboard/admin/webhooks" className="text-xs font-black text-customBlue hover:underline">
          العودة للقائمة
        </Link>
      </motion.div>

      <SecretWarningPanel body="إذا فقدت سر التوقيع، أنشئ نقطة نهاية جديدة أو أعد التدوير من الخادم — الواجهة لا تعرض السر الكامل بعد الإنشاء." />

      {loading ? (
        <LoadingSkeletonStack rows={4} />
      ) : !endpoint ? (
        <div dir="rtl" className="rounded-2xl border border-slate-100 bg-white p-6 text-sm font-bold text-slate-500">
          تعذّر العثور على هذا السجل.
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-black text-deepBlue">التهيئة</h2>
              <label className="flex items-center gap-2 text-xs font-black text-slate-600">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                مفعّل
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-xs font-black text-slate-400">Endpoint URL</span>
              <input
                dir="ltr"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-xs font-bold outline-none ring-customBlue/25 focus:ring-2"
              />
            </label>

            <div className="mt-4">
              <p className="text-xs font-black text-slate-400">الأحداث المفعّلة</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEBHOOK_PHASE_EVENTS.map((ev) => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleEvent(ev)}
                    className={[
                      'rounded-full px-3 py-1 text-[11px] font-black ring-1 ring-inset transition',
                      events.includes(ev)
                        ? 'bg-customBlue text-white ring-customBlue'
                        : 'bg-white text-slate-500 ring-slate-200 hover:ring-customBlue/40',
                    ].join(' ')}
                    title={WEBHOOK_EVENT_LABELS_AR[ev]}
                    dir="ltr"
                  >
                    {ev}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onSave()}
                className="rounded-xl bg-deepBlue px-5 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-deepBlue/90"
              >
                حفظ التعديلات
              </button>
              <button
                type="button"
                onClick={() => void onTest()}
                className="rounded-xl bg-customOrange px-5 py-2.5 text-xs font-black text-white shadow-md transition hover:opacity-95"
              >
                اختبار الويبهوك
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black text-deepBlue">سجل التسليم</h2>
            <p className="mt-2 text-xs font-bold text-slate-500">استجابات HTTP وأزمنة التنفيذ مع تفاصيل الفشل.</p>
            <div className="mt-6">
              <WebhookDeliveryTimeline deliveries={timeline} />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
