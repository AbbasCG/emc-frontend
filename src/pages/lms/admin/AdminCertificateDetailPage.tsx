import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileX,
  History,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldCheck,
  User,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { LmsDataPanel } from '@/components/lms/management'
import { fmtDate } from '@/components/lms/lmsFormatters'
import {
  fetchCertificate,
  approveCertificate,
  issueCertificate,
  revokeCertificate,
  regenerateCertificate,
  retryPdf,
  fetchCertificateLogs,
  type Certificate,
  type CertificateLog,
} from '@/api/certificatesApi'
import apiClient from '@/api/axios'
import { CERT_TYPE_LABELS } from './certificateLabels'

// ── Status display ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft:              'مسودة',
  pending:            'قيد المراجعة',
  approved:           'معتمدة',
  pending_generation: 'قيد الإنشاء',
  generation_failed:  'فشل الإنشاء',
  issued:             'صادرة',
  revoked:            'ملغاة',
}

const STATUS_CLS: Record<string, string> = {
  draft:              'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  pending:            'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved:           'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  pending_generation: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  generation_failed:  'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  issued:             'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  revoked:            'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
}

const LOAD_ERROR = 'تعذّر تحميل الشهادة. تحقق من الاتصال وأعد المحاولة.'

const DOWNLOAD_ERR: Record<number, string> = {
  401: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
  403: 'لا تملك صلاحية تحميل هذه الشهادة.',
  404: 'ملف الشهادة غير موجود.',
  409: 'ملف الشهادة لا يزال قيد الإنشاء. حاول بعد قليل.',
}

// ── Authenticated blob fetch ───────────────────────────────────────────────────

async function fetchCertBlob(certId: number): Promise<Blob> {
  const res = await apiClient.get<Blob>(`/admin/certificates/${certId}/download`, {
    responseType: 'blob',
  })
  if (res.data.type?.includes('application/json') || res.data.type?.includes('text/plain')) {
    const text = await res.data.text()
    try {
      const parsed = JSON.parse(text) as { message?: string }
      throw new Error(parsed.message ?? 'خطأ غير متوقع')
    } catch {
      throw new Error('خطأ غير متوقع')
    }
  }
  return res.data
}

// ── PDF Preview with zoom ─────────────────────────────────────────────────────

// A4 landscape natural dimensions (at 96dpi: 297mm × 210mm)
const A4_W = 1122
const A4_H = 794

function CertificatePreview({ certId }: { certId: number }) {
  const [blobUrl, setBlobUrl]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [zoom, setZoom]         = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const urlRef   = useRef<string | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  // Re-arm the loading state during render when the certificate changes (react.dev
  // "adjusting state when a prop changes"); `loading` already starts true on mount.
  const [seenCertId, setSeenCertId] = useState(certId)
  if (seenCertId !== certId) {
    setSeenCertId(certId)
    setLoading(true)
    setError(null)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const blob = await fetchCertBlob(certId)
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        setBlobUrl(url)
        // default: fit-width zoom once container size is known
        requestAnimationFrame(() => {
          if (wrapRef.current) {
            const w = wrapRef.current.clientWidth - 32
            setZoom(Math.min(1, w / A4_W))
          }
        })
      } catch (err: unknown) {
        if (cancelled) return
        const status = (err as { response?: { status?: number } })?.response?.status
        setError(DOWNLOAD_ERR[status ?? 0] ?? 'حدث خطأ غير متوقع أثناء تحميل الشهادة.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null }
    }
  }, [certId])

  function fitWidth() {
    if (wrapRef.current) {
      const w = wrapRef.current.clientWidth - 32
      setZoom(Math.min(1, w / A4_W))
    }
  }

  function changeZoom(delta: number) {
    setZoom(z => Math.min(2, Math.max(0.3, parseFloat((z + delta).toFixed(1)))))
  }

  if (loading) {
    return (
      <div className="flex h-[700px] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#0077B6]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-center">
        <XCircle size={32} className="text-rose-400" />
        <p className="text-[13px] font-bold text-rose-600">{error}</p>
      </div>
    )
  }

  if (!blobUrl) return null

  const scaledH = Math.round(A4_H * zoom)

  const iframeBlock = (
    // dir="ltr" prevents RTL inheritance from misaligning the centered certificate
    <div
      ref={wrapRef}
      dir="ltr"
      className="relative overflow-hidden bg-[#f8f9fb]"
      style={{ height: Math.max(700, scaledH + 32), textAlign: 'center' }}
    >
      <div
        style={{
          width: A4_W,
          height: A4_H,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          display: 'inline-block',
          marginTop: 16,
        }}
      >
        <iframe
          src={blobUrl}
          style={{ width: A4_W, height: A4_H, border: 'none', display: 'block' }}
          title="معاينة الشهادة"
        />
      </div>
    </div>
  )

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5" dir="rtl">
        <p className="text-[11px] font-black uppercase tracking-wide text-[#06182C]/30">معاينة الشهادة</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="تصغير"
            onClick={() => changeZoom(-0.1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#06182C]/40 transition hover:bg-slate-100 hover:text-[#06182C]"
          >
            <ZoomOut size={13} />
          </button>
          <span className="min-w-[3rem] text-center text-[11px] font-black tabular-nums text-[#06182C]/50">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            title="تكبير"
            onClick={() => changeZoom(0.1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#06182C]/40 transition hover:bg-slate-100 hover:text-[#06182C]"
          >
            <ZoomIn size={13} />
          </button>
          <div className="mx-1.5 h-4 w-px bg-slate-200" />
          <button
            type="button"
            title="ملاءمة العرض"
            onClick={fitWidth}
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-black text-[#06182C]/40 transition hover:bg-slate-100 hover:text-[#06182C]"
          >
            <Minimize2 size={12} /> ملاءمة
          </button>
          <button
            type="button"
            title="ملء الشاشة"
            onClick={() => setFullscreen(true)}
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-black text-[#06182C]/40 transition hover:bg-slate-100 hover:text-[#06182C]"
          >
            <Maximize2 size={12} /> ملء الشاشة
          </button>
          <button
            type="button"
            title="فتح في تبويب جديد"
            onClick={() => window.open(blobUrl, '_blank')}
            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-black text-[#06182C]/40 transition hover:bg-slate-100 hover:text-[#06182C]"
          >
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* Iframe */}
      {iframeBlock}

      {/* Fullscreen modal */}
      <AnimatePresence>
        {fullscreen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm"
              onClick={() => setFullscreen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="fixed inset-4 z-[9999] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3" dir="rtl">
                <p className="text-[12px] font-black text-[#06182C]">معاينة الشهادة</p>
                <button type="button" onClick={() => setFullscreen(false)} className="rounded-xl p-1.5 hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>
              <div dir="ltr" className="flex flex-1 items-center justify-center overflow-auto bg-[#f8f9fb] p-4">
                <iframe
                  src={blobUrl}
                  className="border-0"
                  style={{ width: '100%', maxWidth: A4_W, aspectRatio: `${A4_W}/${A4_H}` }}
                  title="معاينة الشهادة - ملء الشاشة"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Download button ───────────────────────────────────────────────────────────

function DownloadButton({ certId, filename }: { certId: number; filename: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState<string | null>(null)

  async function handleDownload() {
    setBusy(true)
    setErr(null)
    try {
      const blob = await fetchCertBlob(certId)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      setErr(DOWNLOAD_ERR[status ?? 0] ?? 'حدث خطأ غير متوقع.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={busy}
        className="flex items-center gap-2 rounded-xl bg-[#0077B6] px-4 py-2.5 text-[12px] font-black text-white shadow-sm transition hover:bg-[#1e7aaa] disabled:opacity-50"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        تحميل الشهادة
      </button>
      {err && <p className="text-[11px] font-bold text-rose-600">{err}</p>}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <LmsDataPanel>
      <div className="p-5" dir="rtl">
        <p className="mb-4 text-[11px] font-black uppercase tracking-wide text-[#06182C]/30">{title}</p>
        {children}
      </div>
    </LmsDataPanel>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wide text-[#06182C]/30">{label}</p>
      <p className="mt-0.5 text-[13px] font-bold text-[#06182C]">{value}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCertificateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const certId = Number(id)

  const [cert, setCert]   = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [revokeOpen, setRevokeOpen]     = useState(false)
  const [revokeReason, setRevokeReason] = useState('')
  const [actionBusy, setActionBusy]     = useState(false)
  const [actionError, setActionError]   = useState<string | null>(null)

  const [logs, setLogs]         = useState<CertificateLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  /** Imperative refresh/retry from a button — outside any effect, so flipping to the
   *  loading state synchronously is fine here. */
  const load = useCallback(async () => {
    if (!certId || isNaN(certId)) return
    setLoading(true)
    setError(null)
    try {
      const c = await fetchCertificate(certId)
      setCert(c)
      setLogsLoading(true)
      setLoading(false)
      try {
        setLogs(await fetchCertificateLogs(c.id))
      } catch {
        /* non-critical */
      } finally {
        setLogsLoading(false)
      }
    } catch {
      setError(LOAD_ERROR)
      setLoading(false)
    }
  }, [certId])

  // Re-arm the loading state during render when the route id changes (react.dev
  // "adjusting state when a prop changes"); `loading` already starts true on mount.
  // Invalid ids are skipped, exactly as the loader below bails out on them.
  const [seenCertId, setSeenCertId] = useState(certId)
  if (!Object.is(seenCertId, certId)) {
    setSeenCertId(certId)
    if (certId && !isNaN(certId)) {
      setLoading(true)
      setError(null)
    }
  }

  useEffect(() => {
    if (!certId || isNaN(certId)) return
    let alive = true
    void (async () => {
      let c: Certificate
      try {
        c = await fetchCertificate(certId)
      } catch {
        if (alive) {
          setError(LOAD_ERROR)
          setLoading(false)
        }
        return
      }
      if (!alive) return
      setCert(c)
      setLogsLoading(true)
      setLoading(false)
      try {
        const rows = await fetchCertificateLogs(c.id)
        if (alive) setLogs(rows)
      } catch {
        /* non-critical */
      } finally {
        if (alive) setLogsLoading(false)
      }
    })()
    return () => { alive = false }
  }, [certId])

  function wrapAction<T>(fn: () => Promise<T>, onSuccess: (v: T) => void, errMsg: string) {
    setActionBusy(true)
    setActionError(null)
    fn()
      .then(onSuccess)
      .catch(() => setActionError(errMsg))
      .finally(() => setActionBusy(false))
  }

  function handleApprove() {
    if (!cert) return
    wrapAction(
      () => approveCertificate(cert.id),
      setCert,
      'فشلت عملية الموافقة. تحقق من الاتصال وأعد المحاولة.',
    )
  }

  function handleIssue() {
    if (!cert) return
    wrapAction(
      () => issueCertificate(cert.id),
      setCert,
      'فشل إصدار الشهادة. تحقق من الاتصال وأعد المحاولة.',
    )
  }

  async function handleRevoke() {
    if (!cert || !revokeReason.trim()) return
    setActionBusy(true)
    setActionError(null)
    try {
      setCert(await revokeCertificate(cert.id, revokeReason))
      setRevokeOpen(false)
      setRevokeReason('')
    } catch {
      setActionError('فشل إلغاء الشهادة. تحقق من الاتصال وأعد المحاولة.')
    } finally {
      setActionBusy(false)
    }
  }

  function handleRegenerate() {
    if (!cert) return
    wrapAction(
      () => regenerateCertificate(cert.id),
      setCert,
      'فشل طلب إعادة التوليد. تحقق من الاتصال وأعد المحاولة.',
    )
  }

  function handleRetryPdf() {
    if (!cert) return
    wrapAction(
      () => retryPdf(cert.id),
      setCert,
      'فشلت إعادة محاولة توليد PDF. تحقق من الاتصال وأعد المحاولة.',
    )
  }

  function goBack() {
    if (window.history.length > 2) {
      navigate(-1)
    } else {
      navigate('/dashboard/admin/certificates')
    }
  }

  const isPending   = cert?.status === 'pending_generation'
  const hasFile     = !!(cert?.pdf_url)
  const canDownload = hasFile && !isPending
  const filename    = `certificate-${cert?.certificate_code ?? certId}.html`

  const timeline = cert ? [
    cert.created_at   && { label: 'إنشاء الطلب',      date: cert.created_at,  icon: Award,         cls: 'text-slate-500 bg-slate-100' },
    (cert.status !== 'draft') && cert.created_at && { label: 'مراجعة إدارية', date: cert.created_at, icon: Clock,         cls: 'text-amber-600 bg-amber-50'  },
    (cert.status === 'issued' || cert.status === 'approved') && cert.issued_at && {
      label: 'إصدار الشهادة', date: cert.issued_at, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50',
    },
    cert.status === 'revoked' && cert.revoked_at && {
      label: 'إلغاء الشهادة', date: cert.revoked_at, icon: XCircle, cls: 'text-rose-500 bg-rose-50',
    },
  ].filter(Boolean) : []

  return (
    <AdminLmsShell
      title="تفاصيل الشهادة"
      description="عرض وإدارة بيانات الشهادة"
      breadcrumb="تفاصيل الشهادة"
      loading={loading}
      error={error}
      onRetry={load}
      onRefresh={load}
      action={
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          <ArrowRight size={14} />
          رجوع
        </button>
      }
    >
      {!loading && cert && (
        <div className="space-y-5" dir="rtl">

          {/* ── Hero card ──────────────────────────────────────────────────────── */}
          <LmsDataPanel>
            {actionError && (
              <div className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700" dir="rtl">
                {actionError}
              </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-black ${STATUS_CLS[cert.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABELS[cert.status] ?? cert.status}
                  </span>
                  <span className="rounded-full bg-[#06182C]/5 px-3 py-1 text-[11px] font-black text-[#06182C]/50">
                    {CERT_TYPE_LABELS[cert.certificate_type as keyof typeof CERT_TYPE_LABELS] ?? cert.certificate_type}
                  </span>
                </div>
                <h1 className="text-xl font-black text-[#06182C]">{cert.title}</h1>
                {cert.certificate_code && (
                  <p className="font-mono text-[12px] text-[#06182C]/40">{cert.certificate_code}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {canDownload && (
                  <DownloadButton certId={cert.id} filename={filename} />
                )}
                <button
                  type="button"
                  onClick={() => handleRegenerate()}
                  disabled={actionBusy}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[12px] font-black text-[#06182C]/60 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw size={13} /> إعادة توليد
                </button>
                {cert.status !== 'revoked' && (
                  <button
                    type="button"
                    onClick={() => setRevokeOpen(true)}
                    disabled={actionBusy}
                    className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-[12px] font-black text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    <XCircle size={13} /> إلغاء
                  </button>
                )}
                {cert.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => handleApprove()}
                    disabled={actionBusy}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-[12px] font-black text-white transition hover:bg-amber-600 disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} /> اعتماد
                  </button>
                )}
                {cert.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => handleIssue()}
                    disabled={actionBusy}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[12px] font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} /> إصدار
                  </button>
                )}
              </div>
            </div>
          </LmsDataPanel>

          {/* ── Pending generation notice ──────────────────────────────────────── */}
          {isPending && (
            <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
              <Loader2 size={16} className="shrink-0 animate-spin text-violet-600" />
              <p className="text-[13px] font-bold text-violet-700">
                ملف الشهادة قيد الإنشاء. سيظهر بعد اكتمال المعالجة.
              </p>
            </div>
          )}

          {/* ── Two-column body ───────────────────────────────────────────────── */}
          <div className="grid gap-5 lg:grid-cols-3">

            {/* Left column — metadata */}
            <div className="space-y-5 lg:col-span-2">

              {/* Recipient */}
              <Section title="المستلم">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0077B6]/10">
                    <User size={18} className="text-[#0077B6]" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 flex-1">
                    <Field label="الاسم"          value={cert.recipient_name ?? cert.user?.name} />
                    <Field label="البريد الإلكتروني" value={cert.recipient_email ?? cert.user?.email} />
                  </div>
                </div>
              </Section>

              {/* Course / Workshop / Track */}
              {(cert.course || cert.workshop || cert.track) && (
                <Section title="التفاصيل الأكاديمية">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="الدورة"   value={cert.course?.title} />
                    <Field label="الورشة"   value={cert.workshop?.title} />
                    <Field label="المسار"   value={cert.track?.name} />
                    <Field label="القالب"   value={cert.template?.name} />
                    <Field label="تاريخ الإصدار" value={cert.issued_at ? fmtDate(cert.issued_at) : undefined} />
                    <Field label="أصدرها"   value={cert.issued_by?.name} />
                  </div>
                  {cert.status === 'revoked' && cert.revoke_reason && (
                    <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200">
                      <p className="text-[11px] font-black uppercase text-rose-500">سبب الإلغاء</p>
                      <p className="mt-1 text-[13px] font-semibold text-rose-700">{cert.revoke_reason}</p>
                    </div>
                  )}
                </Section>
              )}

            </div>

            {/* Right column — timeline */}
            <div>
              <Section title="التسلسل الزمني">
                <div className="relative space-y-4 border-r-2 border-[#0077B6]/20 pr-4">
                  {timeline.map((item, i) => {
                    if (!item) return null
                    const Icon = item.icon
                    return (
                      <div key={i} className="relative">
                        <div className={`absolute -right-[22px] flex h-8 w-8 items-center justify-center rounded-full ${item.cls}`}>
                          <Icon size={14} />
                        </div>
                        <p className="text-[12px] font-bold text-[#06182C]">{item.label}</p>
                        <p className="text-[11px] text-[#06182C]/40">{fmtDate(item.date)}</p>
                      </div>
                    )
                  })}
                </div>
              </Section>
            </div>
          </div>

          {/* ── PDF info section ──────────────────────────────────────────────── */}
          {cert.pdf_info && (
            <Section title="معلومات ملف PDF">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-[#06182C]/30">حالة الملف</p>
                  <div className="mt-1">
                    {cert.pdf_info.generation_status === 'ready' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">
                        <FileCheck size={11} /> جاهز
                      </span>
                    ) : cert.pdf_info.generation_status === 'failed' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700 ring-1 ring-rose-200">
                        <FileX size={11} /> فشل الإنشاء
                      </span>
                    ) : cert.pdf_info.generation_status === 'generating' || cert.status === 'pending_generation' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700 ring-1 ring-violet-200">
                        <Loader2 size={11} className="animate-spin" /> قيد الإنشاء
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                        غير متوفر
                      </span>
                    )}
                  </div>
                </div>
                {cert.pdf_info.generated_at && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#06182C]/30">تاريخ الإنشاء</p>
                    <p className="mt-0.5 text-[13px] font-bold text-[#06182C]">{fmtDate(cert.pdf_info.generated_at)}</p>
                  </div>
                )}
                {cert.pdf_info.file_size_bytes != null && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#06182C]/30">حجم الملف</p>
                    <p className="mt-0.5 text-[13px] font-bold text-[#06182C]">
                      {cert.pdf_info.file_size_bytes > 1024 * 1024
                        ? `${(cert.pdf_info.file_size_bytes / (1024 * 1024)).toFixed(2)} MB`
                        : `${Math.round(cert.pdf_info.file_size_bytes / 1024)} KB`}
                    </p>
                  </div>
                )}
                {cert.pdf_info.template_id_used != null && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#06182C]/30">القالب المستخدم</p>
                    <p className="mt-0.5 text-[13px] font-bold text-[#06182C]">#{cert.pdf_info.template_id_used}</p>
                  </div>
                )}
              </div>
              {cert.pdf_info.last_error && (
                <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200">
                  <p className="text-[10px] font-black uppercase tracking-wide text-rose-500">خطأ الإنشاء الأخير</p>
                  <p className="mt-1 font-mono text-[11px] text-rose-700 whitespace-pre-wrap break-all">{cert.pdf_info.last_error}</p>
                  <button
                    type="button"
                    onClick={() => handleRetryPdf()}
                    disabled={actionBusy}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-200 disabled:opacity-50"
                  >
                    {actionBusy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    إعادة المحاولة
                  </button>
                </div>
              )}
            </Section>
          )}

          {/* ── Approval section ──────────────────────────────────────────────── */}
          {cert.approvals && cert.approvals.length > 0 && (
            <Section title="سجل الاعتماد">
              <div className="space-y-3">
                {cert.approvals.map((approval, i) => (
                  <div key={i} className={`rounded-xl p-4 ring-1 ${
                    approval.status === 'approved'
                      ? 'bg-emerald-50 ring-emerald-200'
                      : approval.status === 'rejected'
                      ? 'bg-rose-50 ring-rose-200'
                      : 'bg-amber-50 ring-amber-200'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className={
                          approval.status === 'approved' ? 'text-emerald-600'
                          : approval.status === 'rejected' ? 'text-rose-600'
                          : 'text-amber-600'
                        } />
                        <div>
                          <p className="text-[12px] font-black text-[#06182C]">{approval.type_label}</p>
                          {approval.approver && (
                            <p className="text-[11px] text-[#06182C]/50">{approval.approver.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                          approval.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                          : approval.status === 'rejected' ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                        }`}>
                          {approval.status === 'approved' ? 'معتمد' : approval.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                        </span>
                        {approval.actioned_at && (
                          <p className="mt-0.5 text-[10px] text-[#06182C]/40">{fmtDate(approval.actioned_at)}</p>
                        )}
                      </div>
                    </div>
                    {approval.notes && (
                      <p className="mt-2 text-[12px] text-[#06182C]/60 border-t border-black/5 pt-2">{approval.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── PDF preview ───────────────────────────────────────────────────── */}
          {canDownload && (
            <LmsDataPanel>
              <CertificatePreview certId={cert.id} />
            </LmsDataPanel>
          )}

          {/* ── Audit Log ─────────────────────────────────────────────────────── */}
          <Section title="سجل النشاط">
            {logsLoading ? (
              <div className="flex items-center gap-2 py-4 text-[12px] font-bold text-[#06182C]/40">
                <Loader2 size={14} className="animate-spin" /> جارٍ تحميل السجل...
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <History size={24} className="text-[#06182C]/15" />
                <p className="text-[12px] font-bold text-[#06182C]/30">لا توجد إجراءات مسجّلة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-[12px]">
                  <thead>
                    <tr className="border-b border-[#06182C]/[0.05]">
                      <th className="pb-2 pl-3 font-black text-[10px] uppercase tracking-wide text-[#06182C]/30">الإجراء</th>
                      <th className="pb-2 pl-3 font-black text-[10px] uppercase tracking-wide text-[#06182C]/30">المسؤول</th>
                      <th className="pb-2 pl-3 font-black text-[10px] uppercase tracking-wide text-[#06182C]/30">عنوان IP</th>
                      <th className="pb-2 font-black text-[10px] uppercase tracking-wide text-[#06182C]/30">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#06182C]/[0.04]">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-[#06182C]/[0.015]">
                        <td className="py-2 pl-3 font-mono text-[11px] text-[#0077B6]">{log.action}</td>
                        <td className="py-2 pl-3 font-semibold text-[#06182C]/60">{log.actor?.name ?? '—'}</td>
                        <td className="py-2 pl-3 font-mono text-[10px] text-[#06182C]/40">{log.ip_address ?? '—'}</td>
                        <td className="py-2 whitespace-nowrap text-[11px] text-[#06182C]/40">{fmtDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

        </div>
      )}

      {/* ── Revoke Modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {revokeOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
              onClick={() => setRevokeOpen(false)}
            />
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div
                dir="rtl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-black text-[#06182C]">إلغاء الشهادة</h2>
                  <button type="button" onClick={() => setRevokeOpen(false)} className="rounded-xl p-1.5 hover:bg-slate-100">
                    <X size={16} />
                  </button>
                </div>
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-black text-[#06182C]">سبب الإلغاء</span>
                  <textarea
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    rows={4}
                    placeholder="اذكر سبب إلغاء الشهادة..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-300 focus:outline-none"
                  />
                </label>
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setRevokeOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-black text-[#06182C]/60">
                    إغلاق
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRevoke()}
                    disabled={actionBusy || !revokeReason.trim()}
                    className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-black text-white disabled:opacity-50"
                  >
                    {actionBusy ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </AdminLmsShell>
  )
}
