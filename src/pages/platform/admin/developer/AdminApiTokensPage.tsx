import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import toast from '@/lib/toast'
import { createApiToken, fetchApiTokens, revokeApiToken } from '@/api/apiTokensApi'
import ApiTokenTable from '@/components/enterprise/ApiTokenTable'
import ScopeSelector from '@/components/enterprise/ScopeSelector'
import { ALL_API_TOKEN_SCOPES } from '@/components/enterprise/apiTokenScopes'
import SecretWarningPanel from '@/components/enterprise/SecretWarningPanel'
import { LoadingSkeletonStack } from '@/components/enterprise/LoadingSkeleton'
import type { ApiAccessTokenRow, ApiTokenScope } from '@/types/phase7'

export default function AdminApiTokensPage() {
  const [rows, setRows] = useState<ApiAccessTokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiTokenScope[]>([ALL_API_TOKEN_SCOPES[0]])
  const [freshToken, setFreshToken] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const list = await fetchApiTokens()
      if (!cancelled) {
        setRows(list)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onCreate() {
    const created = await createApiToken({ name: name || 'token بدون اسم', scopes })
    if (created) {
      setFreshToken(created.token)
      setRows((prev) => [created.record, ...prev])
      setName('')
      toast.success('تم إنشاء الرمز انسخه الآن')
    }
  }

  async function onRevoke(id: number) {
    await revokeApiToken(id)
    setRows((prev) => prev.filter((r) => r.id !== id))
    toast.success('تم إبطال الرمز')
  }

  async function copyOnce() {
    if (!freshToken) return
    try {
      await navigator.clipboard.writeText(freshToken)
      toast.success('تم نسخ الرمز')
    } catch {
      toast.error('تعذّر النسخ')
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-deepBlue">Developer</p>
          <h1 className="text-3xl font-black text-deepBlue">رموز واجهة البرمجة</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-500">
            أنشئ رموزًا ذات نطاقات محددة، مع تحذير أمني صريح وتجربة Stripe-like لنسخ الرمز لمرة واحدة.
          </p>
        </div>
        <Link to="/dashboard/admin/integrations" className="text-xs font-black text-customBlue hover:underline">
          مركز التكاملات
        </Link>
      </motion.div>

      <SecretWarningPanel title="لا تعرض الرموز في الواجهات العامة" body="احفظ الرمز في مدير أسرار معتمد. أي تسريب قد يعرّض بيانات المنظمة بالكامل للخطر." />

      {freshToken && (
        <div className="mt-6 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-inner">
          <p className="text-sm font-black text-emerald-950">انسخ الرمز الآن لن يُعرض مجددًا</p>
          <pre className="overflow-auto rounded-xl bg-white p-3 font-mono text-xs font-bold text-emerald-950 ring-1 ring-emerald-100" dir="ltr">
            {freshToken}
          </pre>
          <button
            type="button"
            onClick={() => void copyOnce()}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-emerald-800"
          >
            نسخ إلى الحافظة
          </button>
          <button type="button" onClick={() => setFreshToken(null)} className="mr-2 text-xs font-black text-emerald-900 underline">
            إخفاء
          </button>
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-dashed border-customBlue/25 bg-white p-6 shadow-inner shadow-sky-50">
        <h2 className="text-sm font-black text-deepBlue">إنشاء رمز جديد</h2>
        <label className="mt-4 block">
          <span className="text-xs font-black text-slate-400">اسم الرمز</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none ring-customBlue/25 focus:ring-2"
            placeholder="مثال: تقارير ذكية ليلية"
          />
        </label>

        <div className="mt-4">
          <p className="text-xs font-black text-slate-400">النطاقات</p>
          <div className="mt-2">
            <ScopeSelector value={scopes} onChange={setScopes} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onCreate()}
          className="mt-6 rounded-xl bg-customBlue px-6 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-95"
        >
          إنشاء الرمز
        </button>
      </section>

      <div className="mt-10">
        <h2 className="mb-4 text-sm font-black text-deepBlue">الرموز النشطة</h2>
        {loading ? (
          <LoadingSkeletonStack rows={3} />
        ) : (
          <ApiTokenTable rows={rows} onRevoke={(id) => void onRevoke(id)} />
        )}
      </div>
    </div>
  )
}
