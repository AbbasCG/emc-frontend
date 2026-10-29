import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'
import type { ReconciliationCase, ReconciliationResolution } from '@/api/paymentReconciliationsApi'
import FinanceDate from '@/components/finance/FinanceDate'
import EmcButton from '@/components/ui/EmcButton'
import { formatMoney } from '@/utils/financeFormatters'
import ReconciliationBadges from './ReconciliationBadges'
import { PAYMENT_STATUS_LABEL, PROGRAM_TYPE_LABEL, REASON_EXPLANATION, REASON_LABEL, REGISTRATION_STATUS_LABEL } from './reconciliationLabels'

type Props = {
  item: ReconciliationCase | null
  /** Whether the signed-in account may decide (the page already knows it can see the list). */
  canResolve: boolean
  onClose: () => void
  onDecide: (item: ReconciliationCase, resolution: ReconciliationResolution) => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-deepBlue/[0.05] py-2.5 last:border-0">
      <dt className="shrink-0 text-[11px] font-black text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-end text-xs font-bold text-deepBlue">{children}</dd>
    </div>
  )
}

/**
 * Everything about one case: who and what, the money and its references, why it needs a decision, what can be done and, once settled,
 * who decided what and when. Opens as a side sheet on wide screens and full-width on a phone.
 */
export default function ReconciliationDetailDialog({ item, canResolve, onClose, onDecide }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (item && !el.open) el.showModal()
    if (!item && el.open) el.close()
  }, [item])

  if (typeof document === 'undefined') return null

  return createPortal(
    <dialog
      ref={ref}
      dir="rtl"
      aria-labelledby={titleId}
      className="emc-dialog m-0 ms-auto h-full max-h-none w-full max-w-[460px] rounded-none border-0 bg-white p-0 text-right shadow-emc-lg sm:rounded-s-2xl"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      {item && (
        <div className="flex h-full flex-col" data-testid="case-detail">
          <header className="flex items-start justify-between gap-3 border-b border-deepBlue/[0.06] p-5">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-base font-black text-deepBlue">
                حالة تسوية #{item.id}
              </h2>
              <div className="mt-2"><ReconciliationBadges item={item} /></div>
            </div>
            <button type="button" onClick={onClose} aria-label="إغلاق" className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-deepBlue ring-1 ring-deepBlue/10 hover:bg-slate-50">
              <X size={16} aria-hidden />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <section aria-label="سبب التسوية" className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="text-xs font-black text-amber-950">{REASON_LABEL[item.reason] ?? item.reason}</p>
              <p className="mt-1.5 text-xs font-semibold leading-6 text-amber-900/90">{REASON_EXPLANATION[item.reason] ?? ''}</p>
            </section>

            <section aria-label="المستخدم والبرنامج">
              <h3 className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">المستخدم والبرنامج</h3>
              <dl>
                <Row label="المستخدم">{item.user?.name ?? '—'}<span className="block font-semibold text-slate-500" dir="ltr">{item.user?.email}</span></Row>
                <Row label="البرنامج">{item.program?.title ?? '—'}{item.program && <span className="block font-semibold text-slate-500">{PROGRAM_TYPE_LABEL[item.program.type]}</span>}</Row>
                <Row label="تاريخ الإنشاء"><FinanceDate value={item.created_at} showTime /></Row>
              </dl>
            </section>

            <section aria-label="الدفعة والمراجع">
              <h3 className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">الدفعة والمراجع</h3>
              <dl>
                <Row label="المبلغ المستلم"><span dir="ltr">{item.payment ? formatMoney(item.payment.amount, item.payment.currency) : '—'}</span></Row>
                <Row label="حالة الدفعة">{item.payment ? (PAYMENT_STATUS_LABEL[item.payment.status] ?? item.payment.status) : '—'}</Row>
                <Row label="مرجع الدفعة"><span className="font-mono text-[11px]" dir="ltr">{item.payment?.provider_reference ?? '—'}</span></Row>
                <Row label="رقم الطلب"><span className="font-mono text-[11px]" dir="ltr">{item.order?.number ?? '—'}</span></Row>
                <Row label="رقم الفاتورة"><span className="font-mono text-[11px]" dir="ltr">{item.invoice?.number ?? '—'}</span></Row>
                <Row label="حالة التسجيل">{item.registration ? (REGISTRATION_STATUS_LABEL[item.registration.status] ?? item.registration.status) : '—'}</Row>
              </dl>
            </section>

            {item.status === 'resolved' ? (
              <section aria-label="سجل القرار" data-testid="resolution-history">
                <h3 className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">سجل القرار</h3>
                <dl>
                  <Row label="القرار"><ReconciliationBadges item={item} /></Row>
                  <Row label="قرّره">{item.resolved_by?.name ?? '—'}</Row>
                  <Row label="تاريخ القرار"><FinanceDate value={item.resolved_at} showTime /></Row>
                  <Row label="الملاحظة الداخلية"><span className="whitespace-pre-wrap font-semibold">{item.resolution_note ?? '—'}</span></Row>
                </dl>
                {item.refund_status === 'pending' && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-6 text-amber-950 ring-1 ring-amber-200">
                    <Info size={14} aria-hidden className="mt-1 shrink-0" />
                    الاسترداد معلّق: يُنفَّذ خارج المنصة. لا تُعلَّم الدفعة «مستردّة» لأن المنصة لا تملك دليل استرداد موثّقاً.
                  </p>
                )}
              </section>
            ) : (
              <section aria-label="القرارات المتاحة" className="space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-wide text-slate-400">القرارات المتاحة</h3>
                {item.conflict_still_present && (
                  <p role="note" className="rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-700 ring-1 ring-deepBlue/[0.06]">
                    الدافع ما زال مدرّب هذا البرنامج، لذلك لا يمكن تفعيل التسجيل الآن. أزل إسناده أولاً أو أغلق الحالة دون تفعيل.
                  </p>
                )}
                {canResolve ? (
                  <div className="flex flex-wrap gap-2">
                    <EmcButton type="button" variant="primary" onClick={() => onDecide(item, 'enrollment_activated')} disabled={item.conflict_still_present === true}>
                      تفعيل التسجيل
                    </EmcButton>
                    <EmcButton type="button" variant="secondary" onClick={() => onDecide(item, 'closed_without_enrollment')}>
                      إغلاق دون تفعيل
                    </EmcButton>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-500">ليست لديك صلاحية تسوية هذه الحالة.</p>
                )}
                <p className="text-[11px] font-semibold leading-5 text-slate-400">
                  لا يوجد استرداد تلقائي، ولا يوجد «تم الاسترداد»: عند الإغلاق يمكنك فقط تسجيل أن الاسترداد معلّق ليُنفَّذ خارج المنصة.
                </p>
              </section>
            )}
          </div>
        </div>
      )}
    </dialog>,
    document.body,
  )
}
