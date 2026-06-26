import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  X,
  XCircle,
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
  type Certificate,
} from '@/api/certificatesApi'
import apiClient from '@/api/axios'
import { CERT_TYPE_LABELS } from './AdminCertificatesPage'

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
  draft:              'bg-slate-100 text-slate-600',
  pending:            'bg-amber-50 text-amber-700',
  approved:           'bg-sky-50 text-sky-700',
  pending_generation: 'bg-violet-50 text-violet-700',
  generation_failed:  'bg-rose-50 text-rose-700',
  issued:             'bg-emerald-50 text-emerald-700',
  revoked:            'bg-rose-50 text-rose-600',
}

// ── Authenticated blob helpers ─────────────────────────────────────────────────

const DOWNLOAD_ERR: Record<number, string> = {
  401: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
  403: 'لا تملك صلاحية تحميل هذه الشهادة.',
  404: 'ملف الشهادة غير موجود.',
  409: 'ملف الشهادة لا يزال قيد الإنشاء. حاول بعد قليل.',
}

async function fetchCertBlob(certId: number): Promise<Blob> {
  const res = await apiClient.get<Blob>(`/admin/certificates/${certId}/download`, {
    responseType: 'blob',
  })
  // Check if server returned a JSON error inside the blob
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

// ── Preview panel ─────────────────────────────────────────────────────────────

function CertificatePreview({ certId }: { certId: number }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchCertBlob(certId)
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        setBlobUrl(url)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const status = (err as { response?: { status?: number } })?.response?.status
        setError(DOWNLOAD_ERR[status ?? 0] ?? 'حدث خطأ غير متوقع أثناء تحميل الشهادة.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => {
      cancelled = true
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null }
    }
  }, [certId])

  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#2691C2]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
        <XCircle size={28} className="text-rose-400" />
        <p className="text-[13px] font-bold text-rose-600">{error}</p>
      </div>
    )
  }

  if (!blobUrl) return null

  return (
    <iframe
      src={blobUrl}
      className="h-[500px] w-full rounded-xl border border-slate-100"
      title="معاينة الشهادة"
    />
  )
}

// ── Download button ───────────────────────────────────────────────────────────

function DownloadButton({ certId, filename }: { certId: number; filename: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleDownload() {
    setBusy(true)
    setErr(null)
    try {
      const blob = await fetchCertBlob(certId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      setErr(DOWNLOAD_ERR[status ?? 0] ?? 'حدث خطأ غير متوقع أثناء تحميل الشهادة.')
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
        className="flex items-center gap-2 rounded-xl bg-[#2691C2] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#1e7aaa] disabled:opacity-50"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        تحميل الشهادة
      </button>
      {err && <p className="text-[11px] font-bold text-rose-600">{err}</p>}
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

  const load = useCallback(() => {
    if (!certId || isNaN(certId)) return
    setLoading(true)
    setError(null)
    fetchCertificate(certId)
      .then(setCert)
      .catch(() => setError('تعذّر تحميل الشهادة. تحقق من الاتصال وأعد المحاولة.'))
      .finally(() => setLoading(false))
  }, [certId])

  useEffect(() => { load() }, [load])

  async function handleApprove() {
    if (!cert) return
    setActionBusy(true)
    try { setCert(await approveCertificate(cert.id)) } catch { /* ignore */ } finally { setActionBusy(false) }
  }

  async function handleIssue() {
    if (!cert) return
    setActionBusy(true)
    try { setCert(await issueCertificate(cert.id)) } catch { /* ignore */ } finally { setActionBusy(false) }
  }

  async function handleRevoke() {
    if (!cert || !revokeReason.trim()) return
    setActionBusy(true)
    try {
      setCert(await revokeCertificate(cert.id, revokeReason))
      setRevokeOpen(false)
      setRevokeReason('')
    } catch { /* ignore */ } finally { setActionBusy(false) }
  }

  async function handleRegenerate() {
    if (!cert) return
    setActionBusy(true)
    try { setCert(await regenerateCertificate(cert.id)) } catch { /* ignore */ } finally { setActionBusy(false) }
  }

  const isPending    = cert?.status === 'pending_generation'
  const hasFile      = !!(cert?.pdf_url)
  const canDownload  = hasFile && !isPending
  const filename     = `certificate-${cert?.certificate_code ?? certId}.html`

  const timeline = cert ? [
    cert.created_at && { label: 'إنشاء الشهادة', date: cert.created_at, icon: Award, cls: 'text-slate-500 bg-slate-100' },
    cert.status !== 'draft' && cert.status !== 'pending' && cert.created_at && { label: 'مراجعة', date: cert.created_at, icon: Clock, cls: 'text-amber-600 bg-amber-50' },
    (cert.status === 'issued' || cert.status === 'revoked' || cert.status === 'approved') && cert.issued_at && { label: 'إصدار الشهادة', date: cert.issued_at, icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
    cert.status === 'revoked' && cert.revoked_at && { label: 'إلغاء الشهادة', date: cert.revoked_at, icon: XCircle, cls: 'text-rose-500 bg-rose-50' },
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
          onClick={() => navigate('/dashboard/admin/certificates')}
          className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          <ArrowRight size={14} />
          رجوع
        </button>
      }
    >
      {!loading && cert && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Main info */}
          <div className="space-y-5 lg:col-span-2">
            <LmsDataPanel>
              <div className="space-y-4 p-5" dir="rtl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-[#0d1b2a]">{cert.title}</h2>
                    <p className="mt-1 font-mono text-[12px] text-[#0d1b2a]/40">{cert.certificate_code ?? 'لم يُحدَّد بعد'}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-black ${STATUS_CLS[cert.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABELS[cert.status] ?? cert.status}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-black uppercase text-[#0d1b2a]/40">المستلم</p>
                    <p className="mt-1 font-bold text-[#0d1b2a]">{cert.recipient_name ?? cert.user?.name ?? '—'}</p>
                    <p className="text-[12px] text-[#0d1b2a]/50">{cert.recipient_email ?? cert.user?.email ?? ''}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-[#0d1b2a]/40">نوع الشهادة</p>
                    <p className="mt-1 font-bold text-[#0d1b2a]">{CERT_TYPE_LABELS[cert.certificate_type] ?? cert.certificate_type}</p>
                  </div>
                  {cert.course && (
                    <div>
                      <p className="text-[11px] font-black uppercase text-[#0d1b2a]/40">الدورة</p>
                      <p className="mt-1 font-bold text-[#0d1b2a]">{cert.course.title}</p>
                    </div>
                  )}
                  {cert.workshop && (
                    <div>
                      <p className="text-[11px] font-black uppercase text-[#0d1b2a]/40">الورشة</p>
                      <p className="mt-1 font-bold text-[#0d1b2a]">{cert.workshop.title}</p>
                    </div>
                  )}
                  {cert.track && (
                    <div>
                      <p className="text-[11px] font-black uppercase text-[#0d1b2a]/40">المسار</p>
                      <p className="mt-1 font-bold text-[#0d1b2a]">{cert.track.name}</p>
                    </div>
                  )}
                  {cert.template && (
                    <div>
                      <p className="text-[11px] font-black uppercase text-[#0d1b2a]/40">القالب</p>
                      <p className="mt-1 font-bold text-[#0d1b2a]">{cert.template.name}</p>
                    </div>
                  )}
                  {cert.issued_at && (
                    <div>
                      <p className="text-[11px] font-black uppercase text-[#0d1b2a]/40">تاريخ الإصدار</p>
                      <p className="mt-1 font-bold text-[#0d1b2a]">{fmtDate(cert.issued_at)}</p>
                    </div>
                  )}
                  {cert.issued_by && (
                    <div>
                      <p className="text-[11px] font-black uppercase text-[#0d1b2a]/40">أصدرها</p>
                      <p className="mt-1 font-bold text-[#0d1b2a]">{cert.issued_by.name}</p>
                    </div>
                  )}
                  {cert.status === 'revoked' && cert.revoke_reason && (
                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-black uppercase text-rose-500">سبب الإلغاء</p>
                      <p className="mt-1 text-sm font-semibold text-rose-700">{cert.revoke_reason}</p>
                    </div>
                  )}
                </div>

                {/* pending_generation notice */}
                {isPending && (
                  <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-3 ring-1 ring-violet-200">
                    <Loader2 size={14} className="animate-spin text-violet-600" />
                    <p className="text-[12px] font-bold text-violet-700">
                      ملف الشهادة قيد الإنشاء. سيتم تفعيله بعد اكتمال المعالجة.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2">
                  {canDownload && (
                    <DownloadButton certId={cert.id} filename={filename} />
                  )}
                  {cert.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => void handleApprove()}
                      disabled={actionBusy}
                      className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white transition hover:bg-amber-600 disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} /> اعتماد
                    </button>
                  )}
                  {cert.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => void handleIssue()}
                      disabled={actionBusy}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} /> إصدار
                    </button>
                  )}
                  {cert.status !== 'revoked' && (
                    <button
                      type="button"
                      onClick={() => setRevokeOpen(true)}
                      disabled={actionBusy}
                      className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-xs font-black text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <XCircle size={13} /> إلغاء
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleRegenerate()}
                    disabled={actionBusy}
                    className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-[#0d1b2a]/60 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    <RefreshCw size={13} /> إعادة توليد
                  </button>
                </div>
              </div>
            </LmsDataPanel>

            {/* PDF Preview — only when file exists and not pending */}
            {canDownload && (
              <LmsDataPanel>
                <div className="p-4">
                  <h3 className="mb-3 text-[12px] font-black uppercase tracking-wide text-[#0d1b2a]/40" dir="rtl">
                    معاينة الشهادة
                  </h3>
                  <CertificatePreview certId={cert.id} />
                </div>
              </LmsDataPanel>
            )}
          </div>

          {/* Timeline sidebar */}
          <div>
            <LmsDataPanel>
              <div className="p-5" dir="rtl">
                <h3 className="mb-4 text-[12px] font-black uppercase tracking-wide text-[#0d1b2a]/40">التسلسل الزمني</h3>
                <div className="relative space-y-4 border-r-2 border-[#2691C2]/20 pr-4">
                  {timeline.map((item, i) => {
                    if (!item) return null
                    const Icon = item.icon
                    return (
                      <div key={i} className="relative">
                        <div className={`absolute -right-[22px] flex h-8 w-8 items-center justify-center rounded-full ${item.cls}`}>
                          <Icon size={14} />
                        </div>
                        <p className="text-[12px] font-bold text-[#0d1b2a]">{item.label}</p>
                        <p className="text-[11px] text-[#0d1b2a]/40">{fmtDate(item.date)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </LmsDataPanel>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      <AnimatePresence>
        {revokeOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setRevokeOpen(false)}
            />
            <motion.div
              dir="rtl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 z-[60] w-[min(100%-2rem,440px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black text-[#0d1b2a]">إلغاء الشهادة</h2>
                <button type="button" onClick={() => setRevokeOpen(false)} className="rounded-xl p-1.5 hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>
              <label className="grid gap-1.5">
                <span className="text-[12px] font-black text-[#0d1b2a]">سبب الإلغاء</span>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={4}
                  placeholder="اذكر سبب إلغاء الشهادة..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-300 focus:outline-none"
                />
              </label>
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setRevokeOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-black text-[#0d1b2a]/60">
                  إلغاء
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
          </>
        )}
      </AnimatePresence>
    </AdminLmsShell>
  )
}
