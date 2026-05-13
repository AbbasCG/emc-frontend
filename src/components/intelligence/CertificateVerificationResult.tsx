import { motion } from 'framer-motion'
import { BadgeCheck, ShieldAlert } from 'lucide-react'
import logo from '@/assets/logo.png'
import type { CertificateVerificationResult } from '@/types/intelligence'

export default function CertificateVerificationResult({ result }: { result: CertificateVerificationResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      dir="rtl"
      className="mx-auto max-w-lg rounded-[1.35rem] bg-white p-8 shadow-2xl ring-1 ring-deepBlue/[0.08]"
    >
      <div className="flex flex-col items-center text-center">
        <img src={logo} alt="EMC" className="h-12 w-auto object-contain" />
        {result.valid ? (
          <BadgeCheck className="mt-6 text-emerald-600" size={48} />
        ) : (
          <ShieldAlert className="mt-6 text-red-500" size={48} />
        )}
        <h1 className="mt-4 text-xl font-black text-deepBlue">
          {result.valid ? 'شهادة موثقة' : 'تعذر التحقق'}
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">{result.message ?? (result.valid ? 'الشهادة موجودة في سجل EMC.' : '')}</p>
      </div>

      {result.valid && (
        <dl className="mt-8 space-y-3 rounded-2xl bg-deepBlue/[0.03] p-5 text-right ring-1 ring-deepBlue/[0.06]">
          <div className="flex justify-between gap-2 text-sm">
            <dt className="font-bold text-slate-500">الاسم</dt>
            <dd className="font-black text-deepBlue">{result.student_name}</dd>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <dt className="font-bold text-slate-500">البرنامج / الدورة</dt>
            <dd className="text-left font-bold text-deepBlue">
              {[result.program_name, result.course_name, result.track_name].filter(Boolean).join(' · ') || '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <dt className="font-bold text-slate-500">عنوان الشهادة</dt>
            <dd className="font-black text-deepBlue">{result.title}</dd>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <dt className="font-bold text-slate-500">تاريخ الإصدار</dt>
            <dd className="font-bold text-deepBlue">{result.issued_at}</dd>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <dt className="font-bold text-slate-500">رمز التحقق</dt>
            <dd className="font-mono font-black text-customBlue">{result.verification_code}</dd>
          </div>
        </dl>
      )}
    </motion.div>
  )
}
