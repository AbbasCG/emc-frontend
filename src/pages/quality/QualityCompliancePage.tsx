import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BookOpen, CheckCircle2, ClipboardCheck } from 'lucide-react'
import { fetchQualityCompliance } from '@/api/qualityApi'
import toast from '@/lib/toast'

interface ComplianceData {
  overall_compliance?: number
  workshop_compliance?: number
  review_compliance?: number
  pending_actions?: number
  workshops_approved?: number
  workshops_total?: number
  reviews_approved?: number
  reviews_total?: number
}

function ComplianceRing({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e'
  const r = 70
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 160 160" className="w-44 h-44 -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>{pct.toFixed(1)}%</span>
        <span className="text-xs text-slate-500 mt-1">نسبة الامتثال</span>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="w-44 h-44 rounded-full bg-slate-200 mx-auto" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
      </div>
    </div>
  )
}

export default function QualityCompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQualityCompliance()
      .then(d => setData(d))
      .catch(() => toast.error('تعذّر تحميل بيانات الامتثال'))
      .finally(() => setLoading(false))
  }, [])

  const compliance = data?.overall_compliance ?? 0
  const workshopCompliance = data?.workshop_compliance ?? 0
  const reviewCompliance = data?.review_compliance ?? 0
  const pendingActions = data?.pending_actions ?? 0

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6">
        <h1 className="text-xl font-black text-deepBlue">الامتثال</h1>
        <p className="text-sm text-slate-500 mt-1">مستوى الامتثال للمعايير والسياسات المعتمدة</p>
      </div>

      {loading ? <Skeleton /> : (
        <div className="space-y-6">
          {/* Big Gauge */}
          <div className="bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm p-8">
            <ComplianceRing value={compliance} />
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'امتثال الورش', value: workshopCompliance, icon: BookOpen, color: 'border-blue-500 text-blue-600' },
              { label: 'امتثال المراجعات', value: reviewCompliance, icon: ClipboardCheck, color: 'border-violet-500 text-violet-600' },
              { label: 'إجراءات معلقة', value: pendingActions, icon: AlertTriangle, color: 'border-amber-500 text-amber-600' },
            ].map(metric => (
              <motion.div key={metric.label}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm border-t-[3px] p-6 ${metric.color.split(' ')[0]}`}>
                <div className="flex items-center justify-between mb-3">
                  <metric.icon className={`w-5 h-5 ${metric.color.split(' ')[1]}`} />
                </div>
                <p className={`text-3xl font-black ${metric.color.split(' ')[1]}`}>
                  {typeof metric.value === 'number' && metric.label.includes('امتثال')
                    ? `${metric.value.toFixed(1)}%`
                    : Number(metric.value).toLocaleString('en-US')}
                </p>
                <p className="text-sm text-slate-500 mt-1">{metric.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Stats Table */}
          {(data?.workshops_approved !== undefined || data?.reviews_approved !== undefined) && (
            <div className="bg-white rounded-2xl border border-deepBlue/[0.07] shadow-sm p-6">
              <h2 className="text-base font-black text-deepBlue mb-4">تفاصيل الامتثال</h2>
              <div className="space-y-4">
                {data?.workshops_approved !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-600">الورش المعتمدة</span>
                      <span className="font-semibold text-deepBlue">
                        {Number(data.workshops_approved).toLocaleString('en-US')} / {Number(data.workshops_total ?? 0).toLocaleString('en-US')}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${data.workshops_total ? (data.workshops_approved / data.workshops_total) * 100 : 0}%` }} />
                    </div>
                  </div>
                )}
                {data?.reviews_approved !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-600">المراجعات المعتمدة</span>
                      <span className="font-semibold text-deepBlue">
                        {Number(data.reviews_approved).toLocaleString('en-US')} / {Number(data.reviews_total ?? 0).toLocaleString('en-US')}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${data.reviews_total ? (data.reviews_approved / data.reviews_total) * 100 : 0}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alerts if pending_actions > 0 */}
          {pendingActions > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-amber-800">يوجد {pendingActions} إجراء معلق</p>
                  <p className="text-sm text-amber-700 mt-0.5">يُرجى مراجعة الإجراءات التصحيحية المفتوحة لرفع نسبة الامتثال</p>
                </div>
              </div>
            </div>
          )}

          {pendingActions === 0 && compliance >= 80 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="font-bold text-emerald-800">مستوى الامتثال ممتاز — استمر في المحافظة على هذا المستوى</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
