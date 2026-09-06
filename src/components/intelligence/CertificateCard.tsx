import { motion } from 'framer-motion'
import { Award, ExternalLink, Download } from 'lucide-react'
import type { CertificateRecord } from '@/types/intelligence'

export default function CertificateCard({
  cert,
  verifyBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/certificates/verify/` : '/certificates/verify/',
}: {
  cert: CertificateRecord
  verifyBaseUrl?: string
}) {
  const link = `${verifyBaseUrl}${encodeURIComponent(cert.verification_code)}`
  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-2xl border border-white/90 bg-gradient-to-bl from-white via-sky-50/25 to-white p-6 text-right shadow-[0_20px_50px_-24px_rgba(12,42,75,0.35)] ring-1 ring-deepBlue/[0.06]"
    >
      <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-customOrange/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <Award className="shrink-0 text-customOrange" size={28} />
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-customBlue">{cert.certificate_type}</p>
          <h3 className="mt-1 text-lg font-black text-deepBlue">{cert.title}</h3>
          <p className="mt-2 text-xs font-bold text-slate-600">{cert.program_name ?? cert.course_name ?? cert.track_name ?? 'EMC'}</p>
          <p className="mt-3 font-mono text-[11px] font-black text-deepBlue/70">{cert.verification_code}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">إصدار: {cert.issued_at ?? '—'}</p>
        </div>
      </div>
      <div className="relative mt-6 flex flex-wrap justify-end gap-2">
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-xl bg-deepBlue px-4 py-2 text-[11px] font-black text-white"
        >
          تحقق
          <ExternalLink size={14} />
        </a>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-xl border border-deepBlue/[0.12] bg-white px-4 py-2 text-[11px] font-black text-deepBlue opacity-80"
          title="placeholder ربط ملف PDF من الخادم"
        >
          تنزيل
          <Download size={14} />
        </button>
      </div>
    </motion.article>
  )
}
