import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Layers, CheckCircle2, AlertCircle, Clock, Loader2, RefreshCw } from 'lucide-react'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { LmsDataPanel } from '@/components/lms/management'
import { fmtDate, fmtNum } from '@/components/lms/lmsFormatters'
import {
  fetchCertificateBatches,
  fetchCertificateBatch,
  type CertificateBatch,
  type Certificate,
} from '@/api/certificatesApi'
import { CERT_TYPE_LABELS } from './AdminCertificatesPage'

const BATCH_STATUS_CLS: Record<string, string> = {
  pending:               'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  processing:            'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  completed:             'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  completed_with_errors: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  failed:                'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
  cancelled:             'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
}

const BATCH_STATUS_LABELS: Record<string, string> = {
  pending:               'قيد الانتظار',
  processing:            'جارٍ المعالجة',
  completed:             'مكتمل',
  completed_with_errors: 'مكتمل مع أخطاء',
  failed:                'فشل',
  cancelled:             'ملغى',
}

const CERT_STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  pending: 'قيد المراجعة',
  approved: 'معتمدة',
  issued: 'مُصدرة',
  revoked: 'مُلغاة',
}

const CERT_STATUS_CLS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-sky-50 text-sky-700',
  issued: 'bg-emerald-50 text-emerald-700',
  revoked: 'bg-rose-50 text-rose-600',
}

export default function AdminCertificateBatchesPage() {
  const { batchId } = useParams<{ batchId?: string }>()
  const navigate = useNavigate()

  const [batches, setBatches] = useState<CertificateBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drawerBatch, setDrawerBatch] = useState<CertificateBatch | null>(null)
  const [drawerCerts, setDrawerCerts] = useState<Certificate[]>([])
  const [loadingDrawer, setLoadingDrawer] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchCertificateBatches()
      .then(res => {
        // handle both paginated { data: [...] } and plain array
        const list = Array.isArray(res) ? res : (res as { data: CertificateBatch[] }).data
        setBatches(list)
      })
      .catch(() => setError('تعذّر تحميل الإصدارات الجماعية. تحقق من الاتصال وأعد المحاولة.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-open drawer if batchId in URL
  useEffect(() => {
    if (!batchId) return
    const id = Number(batchId)
    if (isNaN(id)) return
    openBatchDrawer(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId])

  async function openBatchDrawer(id: number) {
    setLoadingDrawer(true)
    setDrawerCerts([])
    try {
      const { batch, certificates } = await fetchCertificateBatch(id)
      setDrawerBatch(batch)
      setDrawerCerts(certificates)
    } catch {
      setDrawerBatch(null)
    } finally {
      setLoadingDrawer(false)
    }
  }

  function closeBatchDrawer() {
    setDrawerBatch(null)
    setDrawerCerts([])
    if (batchId) navigate('/dashboard/admin/certificates/batches')
  }

  const completed = batches.filter((b) => b.status === 'completed' || b.status === 'completed_with_errors').length
  const pending   = batches.filter((b) => b.status === 'pending' || b.status === 'processing').length
  const failed    = batches.filter((b) => b.status === 'failed').length

  return (
    <AdminLmsShell
      title="الإصدارات الجماعية"
      description="متابعة حالة إصدار الشهادات الجماعية"
      breadcrumb="الإصدارات الجماعية"
      kpis={[
        { label: 'إجمالي الإصدارات', value: fmtNum(batches.length), icon: Layers, variant: 'brand' },
        { label: 'مكتملة', value: fmtNum(completed), icon: CheckCircle2, variant: 'success' },
        { label: 'قيد المعالجة', value: fmtNum(pending), icon: Clock, variant: 'warning' },
        { label: 'فشلت', value: fmtNum(failed), icon: AlertCircle, variant: 'accent' },
      ]}
      loading={loading}
      error={error}
      onRetry={load}
      onRefresh={load}
    >
      <LmsDataPanel footer={`${fmtNum(batches.length)} إصدار جماعي`}>
        <div className="overflow-x-auto" dir="rtl">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-[#0d1b2a]/[0.05] bg-[#0d1b2a]/[0.02]">
                <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">رمز الإصدار</th>
                <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">النوع</th>
                <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">القالب</th>
                <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">الحالة</th>
                <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">الإجمالي</th>
                <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">مُصدر / فشل</th>
                <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">الإنشاء</th>
                <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wide text-[#0d1b2a]/40">الاكتمال</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0d1b2a]/[0.04]">
              {batches.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-[#0d1b2a]/[0.015]">
                  <td className="px-4 py-3.5 font-mono text-[12px] font-bold text-[#0d1b2a]">{b.batch_code}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex rounded-full bg-[#2691C2]/10 px-2.5 py-1 text-[11px] font-black text-[#2691C2]">
                      {CERT_TYPE_LABELS[b.certificate_type] ?? b.certificate_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 max-w-[100px]">
                    <p className="truncate text-[11px] text-[#0d1b2a]/50">{b.template?.name ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${BATCH_STATUS_CLS[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {b.status === 'processing' && <Loader2 size={10} className="animate-spin" />}
                      {BATCH_STATUS_LABELS[b.status] ?? b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-[#0d1b2a]">{fmtNum(b.total_recipients)}</td>
                  <td className="px-4 py-3.5 text-[12px] font-bold">
                    <span className="text-emerald-600">{fmtNum(b.generated_count)}</span>
                    {' / '}
                    <span className="text-rose-500">{fmtNum(b.failed_count)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-[#0d1b2a]/50 whitespace-nowrap">{fmtDate(b.created_at)}</td>
                  <td className="px-4 py-3.5 text-[12px] text-[#0d1b2a]/50 whitespace-nowrap">
                    {b.completed_at ? fmtDate(b.completed_at) : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void openBatchDrawer(b.id)}
                        className="rounded-xl bg-[#2691C2]/10 px-3 py-1.5 text-[11px] font-black text-[#2691C2] transition hover:bg-[#2691C2]/20"
                      >
                        التفاصيل
                      </button>
                      {(b.status === 'failed' || b.status === 'completed_with_errors') && (
                        <button
                          type="button"
                          onClick={() => void openBatchDrawer(b.id)}
                          title="إعادة المحاولة"
                          className="flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] font-black text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                        >
                          <RefreshCw size={10} /> إعادة
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm font-semibold text-[#0d1b2a]/30">
                    لا توجد إصدارات جماعية بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </LmsDataPanel>

      {/* Batch Detail Drawer */}
      <AnimatePresence>
        {(drawerBatch || loadingDrawer) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={closeBatchDrawer}
            />
            <motion.div
              dir="rtl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
                <h2 className="text-base font-black text-[#0d1b2a]">
                  {drawerBatch ? `إصدار: ${drawerBatch.batch_code}` : 'تحميل...'}
                </h2>
                <button type="button" onClick={closeBatchDrawer} className="rounded-xl p-2 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              {loadingDrawer ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-[#2691C2]" />
                </div>
              ) : drawerBatch ? (
                <div className="space-y-5 p-6">
                  {/* Batch summary */}
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#2691C2]/20 bg-[#2691C2]/5 p-4">
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#0d1b2a]/40">الحالة</p>
                      <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${BATCH_STATUS_CLS[drawerBatch.status] ?? ''}`}>
                        {BATCH_STATUS_LABELS[drawerBatch.status]}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#0d1b2a]/40">النوع</p>
                      <p className="mt-1 text-sm font-black text-[#0d1b2a]">{CERT_TYPE_LABELS[drawerBatch.certificate_type]}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#0d1b2a]/40">الإجمالي</p>
                      <p className="mt-1 text-2xl font-black text-[#2691C2]">{fmtNum(drawerBatch.total_recipients)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#0d1b2a]/40">تم إصداره / فشل</p>
                      <p className="mt-1 text-sm font-black">
                        <span className="text-emerald-600">{fmtNum(drawerBatch.generated_count)}</span>
                        {' / '}
                        <span className="text-rose-500">{fmtNum(drawerBatch.failed_count)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Certificates list */}
                  <h3 className="text-[12px] font-black uppercase tracking-wide text-[#0d1b2a]/40">
                    الشهادات ({fmtNum(drawerCerts.length)})
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-right text-[12px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-3 py-2.5 font-black text-[#0d1b2a]/50">المستلم</th>
                          <th className="px-3 py-2.5 font-black text-[#0d1b2a]/50">الرمز</th>
                          <th className="px-3 py-2.5 font-black text-[#0d1b2a]/50">الحالة</th>
                          <th className="px-3 py-2.5 font-black text-[#0d1b2a]/50">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {drawerCerts.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 font-bold text-[#0d1b2a]">
                              {c.recipient_name ?? c.user?.name ?? '—'}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-[#0d1b2a]/50">
                              {c.certificate_code ?? '—'}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${CERT_STATUS_CLS[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                {CERT_STATUS_LABELS[c.status] ?? c.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-[#0d1b2a]/40">{fmtDate(c.issued_at ?? c.created_at)}</td>
                          </tr>
                        ))}
                        {drawerCerts.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-[#0d1b2a]/30">لا توجد شهادات</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminLmsShell>
  )
}
