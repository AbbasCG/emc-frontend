import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Award, TrendingUp, Clock, XCircle, Plus, Download, Eye } from 'lucide-react'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { LmsDataPanel } from '@/components/lms/management'
import { fmtDate, fmtNum } from '@/components/lms/lmsFormatters'
import {
  fetchCertificateStats,
  getCertificateDownloadUrl,
  type CertificateStats,
  type Certificate,
  type CertificateType,
} from '@/api/certificatesApi'

export const CERT_TYPE_LABELS: Record<CertificateType, string> = {
  course_completion: 'إتمام دورة',
  workshop_attendance: 'حضور ورشة',
  summer_camp: 'معسكر صيفي',
  learning_track: 'مسار تعليمي',
  partner: 'شهادة شراكة',
  guest_speaker: 'متحدث ضيف',
  volunteer: 'تطوع',
  internship: 'تدريب',
  sponsor: 'رعاية',
  custom: 'مخصص',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  pending: 'قيد المراجعة',
  approved: 'معتمدة',
  pending_generation: 'قيد الإنشاء',
  generation_failed: 'فشل الإنشاء',
  issued: 'صادرة',
  revoked: 'ملغاة',
}

const STATUS_CLS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  pending_generation: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  generation_failed: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  issued: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  revoked: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
}

const TYPE_COLORS: Record<string, string> = {
  course_completion: 'bg-[#2691C2]/10 text-[#2691C2]',
  workshop_attendance: 'bg-violet-100 text-violet-700',
  summer_camp: 'bg-orange-100 text-orange-700',
  learning_track: 'bg-emerald-100 text-emerald-700',
  partner: 'bg-pink-100 text-pink-700',
  guest_speaker: 'bg-indigo-100 text-indigo-700',
  volunteer: 'bg-teal-100 text-teal-700',
  internship: 'bg-amber-100 text-amber-700',
  sponsor: 'bg-fuchsia-100 text-fuchsia-700',
  custom: 'bg-slate-100 text-slate-600',
}

export default function AdminCertificatesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [stats, setStats] = useState<CertificateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasPendingGeneration = (stats?.recent ?? []).some(
    (c) => c.status === 'pending_generation' || c.status === 'approved',
  )

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchCertificateStats()
      .then(setStats)
      .catch(() => setError('تعذّر تحميل إحصائيات الشهادات. تحقق من الاتصال وأعد المحاولة.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load, location.key])

  const byType = stats?.by_type ?? {}
  const totalByType = Object.values(byType).reduce((a, b) => a + b, 0) || 1

  return (
    <AdminLmsShell
      title="إدارة الشهادات"
      description="إصدار، اعتماد، ومتابعة شهادات المتعلمين"
      breadcrumb="الشهادات"
      kpis={[
        { label: 'إجمالي الشهادات', value: fmtNum(stats?.total ?? 0), icon: Award, variant: 'brand' },
        { label: 'مُصدرة هذا الشهر', value: fmtNum(stats?.issued_this_month ?? 0), icon: TrendingUp, variant: 'success' },
        { label: 'قيد المراجعة', value: fmtNum(stats?.pending ?? 0), icon: Clock, variant: 'warning' },
        { label: 'مُلغاة', value: fmtNum(stats?.revoked ?? 0), icon: XCircle, variant: 'accent' },
      ]}
      loading={loading}
      error={error}
      onRetry={load}
      onRefresh={load}
      action={
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/certificates/issue')}
          className="flex items-center gap-2 rounded-xl bg-[#f4a320] px-4 py-2 text-xs font-black text-white shadow-md transition hover:bg-[#e0921a]"
        >
          <Plus size={14} />
          إصدار شهادة جديدة
        </button>
      }
    >
      {hasPendingGeneration && (
        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[13px] font-semibold text-violet-800">
          جاري إنشاء ملفات الشهادات في الخلفية. ستظهر حالة «صادرة» عند اكتمال التوليد.
          {import.meta.env.DEV && (
            <span className="mt-1 block text-[11px] font-normal text-violet-600">
              للتوليد الفوري: تأكد من تشغيل <code className="font-mono">php artisan queue:work --timeout=300</code>
            </span>
          )}
        </div>
      )}
      {/* By-type chart */}
      {!loading && stats && Object.keys(byType).length > 0 && (
        <LmsDataPanel>
          <div className="px-5 py-4">
            <h2 className="mb-4 text-sm font-black text-[#0d1b2a]">توزيع الشهادات حسب النوع</h2>
            <div className="space-y-2.5">
              {Object.entries(byType).map(([type, count]) => {
                const label = CERT_TYPE_LABELS[type as CertificateType] ?? type
                const pct = Math.round((count / totalByType) * 100)
                const colorCls = TYPE_COLORS[type] ?? 'bg-slate-100 text-slate-600'
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className={`w-28 shrink-0 rounded-full px-2.5 py-1 text-center text-[11px] font-black ${colorCls}`}>
                      {label}
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-3">
                      <div
                        className="h-3 rounded-full bg-[#2691C2] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-left text-[12px] font-black text-[#0d1b2a]">
                      {fmtNum(count)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </LmsDataPanel>
      )}

      {/* Recent Certificates Table */}
      {!loading && (
        <LmsDataPanel footer={`آخر ${fmtNum(stats?.recent?.length ?? 0)} شهادة`}>
          <div className="px-5 pb-2 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-[#0d1b2a]">أحدث الشهادات</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/admin/certificates/templates')}
                  className="rounded-xl border border-[#2691C2]/30 px-3 py-1.5 text-[11px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/5"
                >
                  القوالب
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/admin/certificates/batches')}
                  className="rounded-xl border border-[#2691C2]/30 px-3 py-1.5 text-[11px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/5"
                >
                  الإصدارات الجماعية
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-[#0d1b2a]/[0.05] bg-[#0d1b2a]/[0.02]">
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">الرمز</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">المستلم</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">النوع</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">الحالة</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">التاريخ</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1b2a]/[0.04]">
                  {(stats?.recent ?? []).map((cert: Certificate) => (
                    <tr key={cert.id} className="transition-colors hover:bg-[#0d1b2a]/[0.015]">
                      <td className="px-4 py-3.5 font-mono text-[11px] text-[#0d1b2a]/60">
                        {cert.certificate_code ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-[#0d1b2a]">{cert.recipient_name ?? cert.user?.name ?? '—'}</p>
                        <p className="text-[11px] text-[#0d1b2a]/40">{cert.recipient_email ?? cert.user?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${TYPE_COLORS[cert.certificate_type] ?? 'bg-slate-100 text-slate-600'}`}>
                          {CERT_TYPE_LABELS[cert.certificate_type] ?? cert.certificate_type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${STATUS_CLS[cert.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_LABELS[cert.status] ?? cert.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] font-semibold text-[#0d1b2a]/50">
                        {fmtDate(cert.issued_at ?? cert.created_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/dashboard/admin/certificates/${cert.id}`)}
                            className="flex items-center gap-1 rounded-lg bg-[#2691C2]/10 px-2.5 py-1 text-[11px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/20"
                          >
                            <Eye size={11} /> عرض
                          </button>
                          {cert.pdf_url && (
                            <a
                              href={getCertificateDownloadUrl(cert.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <Download size={11} /> تحميل
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(stats?.recent ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm font-semibold text-[#0d1b2a]/30">
                        لا توجد شهادات حتى الآن
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </LmsDataPanel>
      )}
    </AdminLmsShell>
  )
}
