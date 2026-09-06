import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Loader2, ShieldCheck } from 'lucide-react'
import PublicSeo from '@/components/public/PublicSeo'
import { verifyCertificatePublicAnonymous } from '@/api/certificatesApi'
import { formatEnglishDate } from '@/utils/formatEnglishNumber'
import { formatNumberEn } from '@/utils/publicDetailFormat'
import type { CertificateVerificationResult } from '@/types/intelligence'

/**
 * /verify — §10. One field, one answer. This page is a quality argument: it must
 * be fast, calm and never claim more than the record actually holds.
 *
 * It reuses the existing anonymous verification contract
 * (`GET /certificates/verify/{code}` via `verifyCertificatePublicAnonymous`) —
 * the same one the `/certificates/verify/:code` page already uses. No endpoint
 * is invented here.
 */

/**
 * The shared verification type carries name / program / date / code. Hours and
 * award criteria are not part of it yet, so they are read defensively here: shown
 * when the backend sends them, and left as a labelled slot when it does not.
 * SEAM: once the backend returns them, add the fields to
 * `CertificateVerificationResult` and delete this widening.
 */
type VerifiedCertificate = CertificateVerificationResult & {
  training_hours?: number | string | null
  hours?: number | string | null
  award_criteria?: string | string[] | null
  criteria?: string | string[] | null
}

type LookupStatus = 'idle' | 'checking' | 'found' | 'missing'

type LookupOutcome = {
  status: Exclude<LookupStatus, 'idle' | 'checking'>
  certificate: VerifiedCertificate | null
}

const NOT_IN_RECORD = 'غير مُدرج في سجل هذه الشهادة'

/** Never throws — the caller stays free of try/catch inside effects. */
async function lookupCertificate(code: string): Promise<LookupOutcome> {
  try {
    const result = (await verifyCertificatePublicAnonymous(code)) as VerifiedCertificate
    if (!result || result.valid === false) return { status: 'missing', certificate: null }
    return { status: 'found', certificate: result }
  } catch {
    return { status: 'missing', certificate: null }
  }
}

function resolveHours(certificate: VerifiedCertificate): string | null {
  const raw = certificate.training_hours ?? certificate.hours
  if (raw == null || raw === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return null
  return `${formatNumberEn(value)} ساعة`
}

function resolveCriteria(certificate: VerifiedCertificate): string[] {
  const raw = certificate.award_criteria ?? certificate.criteria
  if (Array.isArray(raw)) return raw.map((item) => String(item).trim()).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
  return []
}

function ResultRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <dt className="shrink-0 text-xs font-black text-muted-500">{label}</dt>
      {value ? (
        <dd className="min-w-0 text-left text-sm font-black text-navy sm:text-base">{value}</dd>
      ) : (
        <dd className="text-xs font-bold text-muted-400">{NOT_IN_RECORD}</dd>
      )}
    </div>
  )
}

export default function Verify() {
  const [searchParams] = useSearchParams()
  const queryCode = (searchParams.get('code') ?? '').trim()

  const [code, setCode] = useState(queryCode)
  const [status, setStatus] = useState<LookupStatus>(queryCode ? 'checking' : 'idle')
  const [certificate, setCertificate] = useState<VerifiedCertificate | null>(null)

  // Deep-linked code (?code=…) — P1 in docs/04-references/effect-patterns.md:
  // the initial state already says «checking», and every setState lands after the await.
  useEffect(() => {
    if (!queryCode) return
    let cancelled = false
    void (async () => {
      const outcome = await lookupCertificate(queryCode)
      if (cancelled) return
      setCertificate(outcome.certificate)
      setStatus(outcome.status)
    })()
    return () => {
      cancelled = true
    }
  }, [queryCode])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed || status === 'checking') return
    setStatus('checking')
    setCertificate(null)
    const outcome = await lookupCertificate(trimmed)
    setCertificate(outcome.certificate)
    setStatus(outcome.status)
  }

  const programName =
    certificate?.program_name?.trim() ||
    certificate?.course_name?.trim() ||
    certificate?.track_name?.trim() ||
    certificate?.title?.trim() ||
    ''
  const criteria = certificate ? resolveCriteria(certificate) : []

  return (
    <main dir="rtl" className="bg-white pb-24 pt-24">
      <PublicSeo
        title="التحقق من شهادة"
        description="تحقق من صحة أي شهادة صادرة عن EMC برقم الشهادة: الاسم والبرنامج وتاريخ الإصدار والساعات ومعايير المنح."
        path="/verify"
      />

      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        <header className="text-right">
          <p className="text-xs font-black text-customBlue">التحقق</p>
          <h1 className="mt-2 font-display text-2xl font-black leading-snug text-navy sm:text-3xl">
            تحقق من شهادة EMC
          </h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-ink-500">
            أدخل رقم الشهادة لتقرأ ما يقوله السجل عنها: صاحبها، برنامجها، تاريخ إصدارها، ساعاتها،
            ومعايير منحها.
          </p>
        </header>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-8">
          <label className="block text-sm font-black text-navy" htmlFor="verify-code">
            رقم الشهادة
          </label>
          <input
            id="verify-code"
            value={code}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCode(e.target.value)}
            className="mt-2 h-14 w-full rounded-xl border border-line bg-paper2 px-4 text-left font-bold tabular-nums text-navy outline-none transition duration-250 ease-emc focus:border-customBlue focus:bg-white"
          />
          <button
            type="submit"
            disabled={!code.trim() || status === 'checking'}
            className="emc-focus-ring mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === 'checking' ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : (
              <ShieldCheck size={18} aria-hidden />
            )}
            تحقق الآن
          </button>
        </form>

        <div className="mt-8" aria-live="polite">
          {status === 'found' && certificate ? (
            <section className="rounded-2xl border border-line bg-white p-5 text-right sm:p-6">
              <p className="text-xs font-black text-success">شهادة سارية في سجل EMC</p>
              <dl className="mt-4">
                <ResultRow label="الاسم" value={certificate.student_name?.trim() || null} />
                <ResultRow label="البرنامج" value={programName || null} />
                <ResultRow label="التاريخ" value={certificate.issued_at ? formatEnglishDate(certificate.issued_at) : null} />
                <ResultRow label="الساعات" value={resolveHours(certificate)} />
                <ResultRow
                  label="رقم الشهادة"
                  value={certificate.verification_code?.trim() || code.trim() || null}
                />
              </dl>

              <div className="mt-5 border-t border-line pt-4">
                <h2 className="text-xs font-black text-muted-500">معايير المنح</h2>
                {criteria.length > 0 ? (
                  <ul className="mt-2 grid gap-1.5">
                    {criteria.map((item) => (
                      <li key={item} className="text-sm font-semibold leading-7 text-ink-500">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  // Award criteria come from the approved catalogue — left as a
                  // labelled slot rather than described from guesswork.
                  <p className="mt-2 text-xs font-bold text-muted-400">{NOT_IN_RECORD}</p>
                )}
              </div>
            </section>
          ) : null}

          {status === 'missing' ? (
            <section className="rounded-2xl border border-line bg-paper2 p-5 text-right sm:p-6">
              <p className="text-sm font-black text-navy">لم نعثر على شهادة بهذا الرقم</p>
              <p className="mt-2 text-sm font-semibold leading-7 text-ink-500">
                راجع الرقم كما هو مطبوع على الشهادة، ثم أعد المحاولة.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  )
}
