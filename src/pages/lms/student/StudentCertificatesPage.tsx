import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Download, Eye, X } from 'lucide-react'
import { fmtDate } from '@/components/lms/lmsFormatters'
import {
  fetchStudentCertificatesNew,
  getStudentCertificateDownloadUrl,
  type Certificate,
  type CertificateType,
} from '@/api/certificatesApi'

const TYPE_LABELS: Record<CertificateType, string> = {
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

const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  course_completion: { bg: 'bg-[#2691C2]/10', text: 'text-[#2691C2]', icon: 'bg-[#2691C2]/15' },
  workshop_attendance: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'bg-violet-100' },
  summer_camp: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'bg-orange-100' },
  learning_track: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'bg-emerald-100' },
  partner: { bg: 'bg-pink-50', text: 'text-pink-700', icon: 'bg-pink-100' },
  guest_speaker: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'bg-indigo-100' },
  volunteer: { bg: 'bg-teal-50', text: 'text-teal-700', icon: 'bg-teal-100' },
  internship: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'bg-amber-100' },
  sponsor: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', icon: 'bg-fuchsia-100' },
  custom: { bg: 'bg-slate-50', text: 'text-slate-600', icon: 'bg-slate-100' },
}

const STATUS_LABELS: Record<string, string> = {
  issued: 'صادرة',
  pending_generation: 'قيد الإنشاء',
  generation_failed: 'فشل الإنشاء',
  approved: 'معتمدة',
  pending: 'قيد المراجعة',
  draft: 'مسودة',
  revoked: 'ملغاة',
}

const STATUS_CLS: Record<string, string> = {
  issued: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  pending_generation: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  generation_failed: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  approved: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  draft: 'bg-slate-100 text-slate-600',
  revoked: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
}

export default function StudentCertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchStudentCertificatesNew()
      .then((d) => { if (!cancelled) setCerts(d) })
      .catch(() => { if (!cancelled) setError('تعذّر تحميل الشهادات. تحقق من الاتصال وأعد المحاولة.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div dir="rtl" className="space-y-5">
        <header>
          <div className="h-7 w-40 animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded-xl bg-slate-50" />
        </header>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
        <p className="font-black text-rose-800">{error}</p>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-[#0d1b2a]">شهاداتي</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          شهاداتك المعتمدة مع رمز التحقق
        </p>
      </header>

      {certs.some((c) => c.status === 'pending_generation') && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[13px] font-semibold text-violet-800">
          جاري إنشاء ملفات الشهادات في الخلفية. يمكنك تحميل الشهادة عند ظهور حالة «صادرة».
        </div>
      )}

      {certs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 py-20 text-center"
        >
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#2691C2]/10">
            <GraduationCap size={40} className="text-[#2691C2]" />
          </div>
          <h2 className="text-lg font-black text-[#0d1b2a]">لا توجد شهادات بعد</h2>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            أكمل دوراتك وورشاتك للحصول على شهاداتك
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((cert, i) => {
            const colors = TYPE_COLORS[cert.certificate_type] ?? TYPE_COLORS.custom
            const entityName =
              cert.course?.title ??
              cert.workshop?.title ??
              cert.track?.name ??
              null

            return (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`group relative overflow-hidden rounded-2xl border border-white/70 ${colors.bg} p-5 shadow-[0_8px_30px_-12px_rgba(34,51,74,0.15)] transition hover:-translate-y-1 hover:shadow-[0_12px_40px_-15px_rgba(34,51,74,0.22)]`}
              >
                {/* Type icon */}
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${colors.icon}`}>
                  <GraduationCap size={22} className={colors.text} />
                </div>

                {/* Status */}
                <span className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${STATUS_CLS[cert.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABELS[cert.status] ?? cert.status}
                </span>

                <h3 className="mt-1 line-clamp-2 text-sm font-black text-[#0d1b2a]">{cert.title}</h3>

                {entityName && (
                  <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#0d1b2a]/50">{entityName}</p>
                )}

                <p className={`mt-2 text-[11px] font-black ${colors.text}`}>
                  {TYPE_LABELS[cert.certificate_type] ?? cert.certificate_type}
                </p>

                {cert.issued_at ? (
                  <p className="mt-1 text-[11px] font-semibold text-[#0d1b2a]/40">
                    {fmtDate(cert.issued_at)}
                  </p>
                ) : cert.created_at ? (
                  <p className="mt-1 text-[11px] font-semibold text-[#0d1b2a]/40">
                    {fmtDate(cert.created_at)}
                  </p>
                ) : null}

                {cert.certificate_code && (
                  <p className="mt-1 font-mono text-[10px] text-[#0d1b2a]/30">{cert.certificate_code}</p>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  {cert.status === 'issued' && cert.pdf_url ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewCert(cert)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#0d1b2a]/10 bg-white/60 py-2 text-[11px] font-black text-[#0d1b2a]/60 transition hover:bg-white hover:text-[#0d1b2a]"
                      >
                        <Eye size={12} /> معاينة
                      </button>
                      <a
                        href={getStudentCertificateDownloadUrl(cert.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2691C2] py-2 text-[11px] font-black text-white transition hover:bg-[#1e7aaa]"
                      >
                        <Download size={12} /> تحميل
                      </a>
                    </>
                  ) : (
                    <p className="flex flex-1 items-center justify-center rounded-xl border border-violet-200 bg-violet-50/80 py-2 text-[11px] font-black text-violet-700">
                      {cert.status === 'generation_failed' ? 'فشل إنشاء الملف — تواصل مع الإدارة' : 'قيد إنشاء الملف…'}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewCert && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setPreviewCert(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 z-[60] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-8"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="font-black text-[#0d1b2a]">{previewCert.title}</h3>
                <button type="button" onClick={() => setPreviewCert(null)} className="rounded-xl p-2 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={getStudentCertificateDownloadUrl(previewCert.id)}
                  className="h-full w-full border-0"
                  title="معاينة الشهادة"
                />
              </div>
              <div className="border-t border-slate-100 px-5 py-3 flex justify-end">
                <a
                  href={getStudentCertificateDownloadUrl(previewCert.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-[#2691C2] px-5 py-2 text-sm font-black text-white transition hover:bg-[#1e7aaa]"
                >
                  <Download size={14} /> تحميل الشهادة
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
