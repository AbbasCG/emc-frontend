import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CertificateVerificationResult as VerificationPanel, IntelligencePageSkeleton } from '@/components/intelligence'
import { verifyCertificatePublicAnonymous } from '@/api/certificatesApi'
import type { CertificateVerificationResult as CVR } from '@/types/intelligence'

export default function CertificateVerifyPage() {
  const { code } = useParams<{ code: string }>()
  const [result, setResult] = useState<CVR | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  useEffect(() => {
    // Without a code there is nothing to verify; the render below short-circuits on
    // `!code` before it ever reads `loading`, so no state update is needed here.
    if (!code) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await verifyCertificatePublicAnonymous(code)
        if (!cancelled) setResult(r)
      } catch {
        if (!cancelled) setVerifyError('تعذّر التحقق من الشهادة. الرمز غير صالح أو انتهت صلاحية الطلب.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [code])

  if (!code) {
    return (
      <div dir="rtl" className="py-20 text-center font-black text-deepBlue">
        رمز غير موجود في الرابط.
      </div>
    )
  }

  if (loading) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl px-4 py-16">
        <IntelligencePageSkeleton />
      </div>
    )
  }

  if (verifyError || !result) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="font-black text-rose-800">{verifyError ?? 'الشهادة غير موجودة.'}</p>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-[70vh] bg-gradient-to-b from-sky-50/50 to-white px-4 py-16">
      <VerificationPanel result={result} />
    </div>
  )
}
