import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchNotificationPreferences, updateNotificationPreferences } from '@/api/notificationPreferencesApi'
import NotificationPreferenceRow from '@/components/enterprise/NotificationPreferenceRow'
import SecretWarningPanel from '@/components/enterprise/SecretWarningPanel'
import { LoadingSkeletonStack } from '@/components/enterprise/LoadingSkeleton'
import type { NotificationPreferenceRow as PreferenceRowModel } from '@/types/phase7'

export default function NotificationPreferencesPage() {
  const [rows, setRows] = useState<PreferenceRowModel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const data = await fetchNotificationPreferences()
      if (!cancelled) {
        setRows(data)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSave() {
    setSaving(true)
    const next = await updateNotificationPreferences(rows)
    setRows(next)
    setSaving(false)
    toast.success('تم حفظ التفضيلات')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-customOrange">Phase 7</p>
            <h1 className="text-2xl font-black text-deepBlue">تفضيلات الإشعارات</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-500">
              حدد كيف تصلك الرسائل الحساسة للوقت عبر المنصّة والبريد وواتساب — بدون كشف أي أسرار اتصال.
            </p>
          </div>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void onSave()}
            className="rounded-xl bg-deepBlue px-6 py-3 text-sm font-black text-white shadow-lg shadow-deepBlue/15 transition hover:bg-deepBlue/90 disabled:opacity-60"
          >
            {saving ? 'جارٍ الحفظ…' : 'حفظ التفضيلات'}
          </button>
        </div>
        <SecretWarningPanel body="تنعكس هذه الإعدادات على الخادم عند التفعيل. بعض القنوات تتطلب إعدادات تشغيل إضافية من مركز التكاملات." />
      </motion.div>

      {loading ? (
        <LoadingSkeletonStack rows={6} />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <NotificationPreferenceRow
              key={row.key}
              row={row}
              disabled={saving}
              onChange={(next) => setRows((prev) => prev.map((r) => (r.key === next.key ? next : r)))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
