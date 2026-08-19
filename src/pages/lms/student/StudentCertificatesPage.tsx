import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Download, Eye, Loader2, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { fmtDate } from '@/components/lms/lmsFormatters'
import {
  fetchStudentCertificateList,
  downloadStudentCertificate,
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
  course_completion:  { bg: 'bg-[#0077B6]/10', text: 'text-[#0077B6]',    icon: 'bg-[#0077B6]/15' },
  workshop_attendance:{ bg: 'bg-violet-50',     text: 'text-violet-700',   icon: 'bg-violet-100' },
  summer_camp:        { bg: 'bg-orange-50',     text: 'text-orange-700',   icon: 'bg-orange-100' },
  learning_track:     { bg: 'bg-emerald-50',    text: 'text-emerald-700',  icon: 'bg-emerald-100' },
  partner:            { bg: 'bg-pink-50',       text: 'text-pink-700',     icon: 'bg-pink-100' },
  guest_speaker:      { bg: 'bg-indigo-50',     text: 'text-indigo-700',   icon: 'bg-indigo-100' },
  volunteer:          { bg: 'bg-teal-50',       text: 'text-teal-700',     icon: 'bg-teal-100' },
  internship:         { bg: 'bg-amber-50',      text: 'text-amber-700',    icon: 'bg-amber-100' },
  sponsor:            { bg: 'bg-fuchsia-50',    text: 'text-fuchsia-700',  icon: 'bg-fuchsia-100' },
  custom:             { bg: 'bg-slate-50',      text: 'text-slate-600',    icon: 'bg-slate-100' },
}

const STATUS_LABELS: Record<string, string> = {
  issued:             'صادرة',
  pending_generation: 'قيد الإنشاء',
  generation_failed:  'فشل الإنشاء',
  approved:           'معتمدة',
  pending:            'قيد المراجعة',
  draft:              'مسودة',
  revoked:            'ملغاة',
}

const STATUS_CLS: Record<string, string> = {
  issued:             'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  pending_generation: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  generation_failed:  'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  approved:           'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  pending:            'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  draft:              'bg-slate-100 text-slate-600',
  revoked:            'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
}

// ── Download helpers ──────────────────────────────────────────────────────────

function certFilename(cert: Certificate): string {
  return `certificate-${cert.certificate_code ?? cert.id}.pdf`
}

async function triggerDownload(certId: number, filename: string): Promise<void> {
  const blob = await downloadStudentCertificate(certId)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

async function buildPreviewUrl(certId: number): Promise<string> {
  const blob = await downloadStudentCertificate(certId)
  return URL.createObjectURL(blob)
}

// ── Download button ───────────────────────────────────────────────────────────

type DownloadPhase = 'idle' | 'generating' | 'preparing' | 'done' | 'error'

const PHASE_LABELS: Record<DownloadPhase, string> = {
  idle:       'تحميل',
  generating: 'جاري إنشاء الشهادة…',
  preparing:  'جاري التحضير…',
  done:       'تحميل',
  error: 'فشل أعد المحاولة',
}

function DownloadCardBtn({ cert, large }: { cert: Certificate; large?: boolean }) {
  const [phase, setPhase] = useState<DownloadPhase>('idle')
  const busy = phase === 'generating' || phase === 'preparing'

  const handle = useCallback(async () => {
    if (busy) return
    setPhase('generating')
    try {
      setPhase('preparing')
      await triggerDownload(cert.id, certFilename(cert))
      setPhase('done')
      setTimeout(() => setPhase('idle'), 2000)
    } catch {
      setPhase('error')
      setTimeout(() => setPhase('idle'), 3000)
    }
  }, [cert, busy])

  const label = PHASE_LABELS[phase]
  const isError = phase === 'error'

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void handle()}
      className={large
        ? `flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-black text-white transition disabled:opacity-50 ${isError ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#0077B6] hover:bg-[#1e7aaa]'}`
        : `flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-black text-white transition disabled:opacity-50 ${isError ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#0077B6] hover:bg-[#1e7aaa]'}`
      }
    >
      {busy
        ? <Loader2 size={large ? 14 : 12} className="animate-spin" />
        : <Download size={large ? 14 : 12} />
      }
      {large ? label : (busy ? 'جاري التحضير…' : 'تحميل')}
    </button>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CertSkeleton() {
  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <div className="h-7 w-40 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded-xl bg-slate-50" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StudentCertificatesPage() {
  const [certs, setCerts]             = useState<Certificate[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [page, setPage]               = useState(1)
  const [lastPage, setLastPage]       = useState(1)
  const [total, setTotal]             = useState(0)
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const prevUrlRef = useRef<string | null>(null)

  const load = useCallback((p: number) => {
    setLoading(true)
    setError(null)
    fetchStudentCertificateList({ page: p, per_page: 20 })
      .then((res) => {
        setCerts(res.data)
        setLastPage(res.meta.last_page)
        setTotal(res.meta.total)
        setPage(p)
      })
      .catch(() => setError('تعذّر تحميل الشهادات. تحقق من الاتصال وأعد المحاولة.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = await fetchStudentCertificateList({ page: 1, per_page: 20 })
        if (!alive) return
        setCerts(res.data)
        setLastPage(res.meta.last_page)
        setTotal(res.meta.total)
        setPage(1)
      } catch {
        if (alive) setError('تعذّر تحميل الشهادات. تحقق من الاتصال وأعد المحاولة.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Reset the preview surface during render when the selected certificate changes
  // (react.dev "adjusting state when a prop changes"), so the modal never paints a
  // frame holding the previous certificate's blob.
  const [seenPreviewCert, setSeenPreviewCert] = useState(previewCert)
  if (seenPreviewCert !== previewCert) {
    setSeenPreviewCert(previewCert)
    setPreviewUrl(null)
    setPreviewLoading(previewCert !== null)
  }

  // Preview blob lifecycle
  useEffect(() => {
    const prev = prevUrlRef.current
    if (prev) { URL.revokeObjectURL(prev); prevUrlRef.current = null }

    if (!previewCert) return

    buildPreviewUrl(previewCert.id)
      .then((url) => { prevUrlRef.current = url; setPreviewUrl(url) })
      .catch(() => setPreviewUrl(null))
      .finally(() => setPreviewLoading(false))

    return () => {
      if (prevUrlRef.current) { URL.revokeObjectURL(prevUrlRef.current); prevUrlRef.current = null }
    }
  }, [previewCert])

  if (loading && certs.length === 0) return <CertSkeleton />

  if (error) {
    return (
      <div dir="rtl" className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center space-y-4">
        <p className="font-black text-rose-800">{error}</p>
        <button
          type="button"
          onClick={() => load(page)}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-700"
        >
          <RefreshCw size={14} /> أعد المحاولة
        </button>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-[#06182C]">شهاداتي</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          شهاداتك المعتمدة مع رمز التحقق
          {total > 0 && <span className="mr-2 text-[#0077B6]">({total})</span>}
        </p>
      </header>

      {certs.some((c) => c.status === 'pending_generation' || c.status === 'approved') && (
        <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-[13px] font-semibold text-violet-800">
          <Loader2 size={15} className="shrink-0 animate-spin text-violet-600" />
          شهادة أو أكثر قيد الإنشاء في الخلفية. ستتمكن من التحميل عند ظهور حالة «صادرة».
        </div>
      )}

      {certs.length === 0 && !loading ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 py-20 text-center"
        >
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#0077B6]/10">
            <GraduationCap size={40} className="text-[#0077B6]" />
          </div>
          <h2 className="text-lg font-black text-[#06182C]">لا توجد شهادات بعد</h2>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            أكمل دوراتك وورشاتك للحصول على شهاداتك
          </p>
        </motion.div>
      ) : (
        <>
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
                  className={`group relative overflow-hidden rounded-2xl border border-white/70 ${colors.bg} p-5 shadow-[0_8px_30px_-12px_rgba(12,42,75,0.15)] transition hover:-translate-y-1 hover:shadow-[0_12px_40px_-15px_rgba(12,42,75,0.22)]`}
                >
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${colors.icon}`}>
                    <GraduationCap size={22} className={colors.text} />
                  </div>

                  <span className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${STATUS_CLS[cert.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABELS[cert.status] ?? cert.status}
                  </span>

                  <h3 className="mt-1 line-clamp-2 text-sm font-black text-[#06182C]">{cert.title}</h3>

                  {entityName && (
                    <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#06182C]/50">{entityName}</p>
                  )}

                  <p className={`mt-2 text-[11px] font-black ${colors.text}`}>
                    {TYPE_LABELS[cert.certificate_type] ?? cert.certificate_type}
                  </p>

                  {cert.issued_at ? (
                    <p className="mt-1 text-[11px] font-semibold text-[#06182C]/40">{fmtDate(cert.issued_at)}</p>
                  ) : cert.created_at ? (
                    <p className="mt-1 text-[11px] font-semibold text-[#06182C]/40">{fmtDate(cert.created_at)}</p>
                  ) : null}

                  {cert.certificate_code && (
                    <p className="mt-1 font-mono text-[10px] text-[#06182C]/30">{cert.certificate_code}</p>
                  )}

                  <div className="mt-4 flex gap-2">
                    {cert.status === 'issued' && !!cert.pdf_url ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewCert(cert)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#06182C]/10 bg-white/60 py-2 text-[11px] font-black text-[#06182C]/60 transition hover:bg-white hover:text-[#06182C]"
                        >
                          <Eye size={12} /> معاينة
                        </button>
                        <DownloadCardBtn cert={cert} />
                      </>
                    ) : cert.status === 'revoked' ? (
                      <p className="flex flex-1 items-center justify-center rounded-xl border border-rose-200 bg-rose-50/80 py-2 text-[11px] font-black text-rose-700">
                        تم إلغاء هذه الشهادة
                      </p>
                    ) : cert.status === 'rejected' ? (
                      <p className="flex flex-1 items-center justify-center rounded-xl border border-orange-200 bg-orange-50/80 py-2 text-[11px] font-black text-orange-700">
                        لم يتم اعتماد الشهادة تواصل مع الإدارة
                      </p>
                    ) : cert.status === 'generation_failed' ? (
                      <p className="flex flex-1 items-center justify-center rounded-xl border border-rose-200 bg-rose-50/80 py-2 text-[11px] font-black text-rose-700">
                        فشل إنشاء الملف تواصل مع الإدارة
                      </p>
                    ) : cert.status === 'pending_generation' || cert.status === 'approved' ? (
                      <p className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50/80 py-2 text-[11px] font-black text-violet-700">
                        <Loader2 size={11} className="animate-spin" /> قيد إنشاء الملف…
                      </p>
                    ) : (
                      <p className="flex flex-1 items-center justify-center rounded-xl border border-amber-200 bg-amber-50/80 py-2 text-[11px] font-black text-amber-700">
                        قيد المراجعة
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => load(page - 1)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-[#06182C] transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={14} /> السابق
              </button>
              <span className="text-sm font-semibold text-slate-500">
                {page} / {lastPage}
              </span>
              <button
                type="button"
                disabled={page >= lastPage || loading}
                onClick={() => load(page + 1)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-[#06182C] transition hover:bg-slate-50 disabled:opacity-40"
              >
                التالي <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </>
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
                <h3 className="font-black text-[#06182C]">{previewCert.title}</h3>
                <button type="button" onClick={() => setPreviewCert(null)} className="rounded-xl p-2 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
              <div className="relative flex-1 overflow-hidden">
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="h-full w-full border-0"
                    title="معاينة الشهادة"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    {previewLoading
                      ? <Loader2 size={28} className="animate-spin text-[#0077B6]" />
                      : <p className="text-sm font-semibold text-slate-400">تعذّر تحميل المعاينة</p>
                    }
                  </div>
                )}
                {previewLoading && previewUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <Loader2 size={28} className="animate-spin text-[#0077B6]" />
                  </div>
                )}
              </div>
              <div className="flex justify-end border-t border-slate-100 px-5 py-3">
                <DownloadCardBtn cert={previewCert} large />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
