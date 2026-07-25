import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchIntegrations } from '@/api/integrationsApi'
import IntegrationCard from '@/components/enterprise/IntegrationCard'
import SecretWarningPanel from '@/components/enterprise/SecretWarningPanel'
import EmptyState from '@/components/dashboard/EmptyState'
import { LoadingSkeletonStack } from '@/components/enterprise/LoadingSkeleton'
import type { IntegrationSummary } from '@/types/phase7'

export default function AdminIntegrationsPage() {
  const [items, setItems] = useState<IntegrationSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const list = await fetchIntegrations()
      if (!cancelled) {
        setItems(list)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-customBlue">Integrations</p>
          <h1 className="text-3xl font-black text-deepBlue">مركز التكاملات</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-500">
            صِل EMC بواجهات الدفع، الرسائل، التقويم، والمطوّرين — كل بطاقة تعرض حالة الاتصال الحالية مع مسار الإعدادات المناسب.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard/admin/webhooks"
            className="rounded-xl bg-white px-4 py-2 text-xs font-black text-deepBlue shadow-sm ring-1 ring-slate-200 transition hover:ring-customBlue/40"
          >
            إدارة الويبهوكس
          </Link>
          <Link
            to="/dashboard/admin/developer/api-tokens"
            className="rounded-xl bg-customOrange px-4 py-2 text-xs font-black text-white shadow-md transition hover:opacity-95"
          >
            رموز المطوّر
          </Link>
        </div>
      </motion.div>

      <SecretWarningPanel
        title="سياسة الأسرار"
        body="لا تُعرض المفاتيح السرية في هذه الواجهة. أي عمليات حساسة تتم عبر الخادم ومخازن التشفير فقط."
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {loading ? (
          <div className="lg:col-span-2">
            <LoadingSkeletonStack rows={4} />
          </div>
        ) : items.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState title="لا توجد تكاملات بعد" description="سيظهر التكوين هنا عند ربط الواجهات الخلفية." />
          </div>
        ) : (
          items.map((item) => <IntegrationCard key={item.provider} item={item} />)
        )}
      </div>
    </div>
  )
}
