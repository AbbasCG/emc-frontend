import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { loadingToast, successToast, errorToast } from '@/lib/toast'
import {
  createWebhookEndpoint,
  fetchWebhookEndpoints,
  WEBHOOK_EVENT_LABELS_AR,
} from '@/api/webhooksApi'
import WebhookEndpointCard from '@/components/enterprise/WebhookEndpointCard'
import SecretWarningPanel from '@/components/enterprise/SecretWarningPanel'
import EmptyState from '@/components/dashboard/EmptyState'
import { LoadingSkeletonStack } from '@/components/enterprise/LoadingSkeleton'
import type { WebhookEndpoint, WebhookPhaseEvent } from '@/types/phase7'
import { WEBHOOK_PHASE_EVENTS } from '@/types/phase7'

export default function AdminWebhooksPage() {
  const [items, setItems] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<WebhookPhaseEvent[]>([...WEBHOOK_PHASE_EVENTS])
  const [freshSecret, setFreshSecret] = useState<string | null>(null)

  async function refresh() {
    setItems(await fetchWebhookEndpoints())
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const list = await fetchWebhookEndpoints()
      if (!cancelled) {
        setItems(list)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function toggleEvent(ev: WebhookPhaseEvent) {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev]))
  }

  async function onCreate() {
    const tid = loadingToast('جاري إنشاء نقطة النهاية...')
    try {
      const created = await createWebhookEndpoint({ url: url || 'https://example.com/hook', events })
      setFreshSecret(created.secret ?? 'whsec_demo_once')
      await refresh()
      setUrl('')
      successToast('تم إنشاء نقطة النهاية', tid)
    } catch {
      errorToast('تعذّر إنشاء نقطة النهاية. تحقق من الاتصال وأعد المحاولة.', tid)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-deepBlue">Webhooks</p>
          <h1 className="text-3xl font-black text-deepBlue">إدارة الويبهوكس</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-500">
            أنشئ نقاط نهاية، اختر الأحداث، وراقب عمليات التسليم مع شارات الاستجابة والحالة.
          </p>
        </div>
        <Link to="/dashboard/admin/integrations" className="text-xs font-black text-customBlue hover:underline">
          مركز التكاملات
        </Link>
      </motion.div>

      <SecretWarningPanel title="سر التوقيع يُعرض مرة واحدة فقط" body="انسخ القيمة فور الإنشاء واحفظها في مدير أسرار معتمد لن نتمكن من إظهارها لاحقًا من الواجهة." />

      {freshSecret && (
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 font-mono text-xs font-black text-emerald-950 shadow-inner" dir="ltr">
          {freshSecret}
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-dashed border-customBlue/25 bg-white p-6 shadow-inner shadow-sky-50">
        <h2 className="text-sm font-black text-deepBlue">إنشاء نقطة نهاية</h2>
        <label className="mt-4 block">
          <span className="text-xs font-black text-slate-400">URL</span>
          <input
            dir="ltr"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://partner.example/emc-hook"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-xs font-bold outline-none ring-customBlue/25 focus:ring-2"
          />
        </label>

        <div className="mt-4">
          <p className="text-xs font-black text-slate-400">الأحداث</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEBHOOK_PHASE_EVENTS.map((ev) => (
              <button
                key={ev}
                type="button"
                onClick={() => toggleEvent(ev)}
                className={[
                  'rounded-full px-3 py-1 text-[11px] font-black ring-1 ring-inset transition',
                  events.includes(ev)
                    ? 'bg-deepBlue text-white ring-deepBlue'
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

        <button
          type="button"
          onClick={() => void onCreate()}
          className="mt-6 rounded-xl bg-customOrange px-6 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-95"
        >
          حفظ وإنشاء
        </button>
      </section>

      <div className="mt-10 grid gap-5">
        {loading ? (
          <LoadingSkeletonStack rows={3} />
        ) : items.length === 0 ? (
          <EmptyState title="لا نقاط نهاية بعد" description="أنشئ أول Webhook لتفعيل التكامل مع أنظمتكم." />
        ) : (
          items.map((w) => <WebhookEndpointCard key={w.id} endpoint={w} />)
        )}
      </div>
    </div>
  )
}
