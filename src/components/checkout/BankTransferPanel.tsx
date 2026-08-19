import { useState } from 'react'
import { Landmark, Paperclip } from 'lucide-react'

/**
 * «تحويل بنكي محلي» — the third payment option, offered only to visitors whose
 * country is on the local-transfer list (Yemen / Syria / Palestine, §9).
 *
 * There is NO public API for manual payments: `/finance/manual-payments` is a
 * finance-role endpoint (see `src/api/financeApi.ts`) and nothing on the public
 * surface may write to it. So this panel is deliberately a hand-off: the visitor
 * transfers to an approved account, sends the receipt, and the screen settles in
 * «بانتظار تأكيد التحويل» until the finance team matches the transfer.
 *
 * SEAM — when the backend exposes a public «submit transfer receipt» endpoint,
 * post the picked receipt file plus the order reference where `onMarkTransferred`
 * is called below, before the panel switches to its pending state.
 *
 * Measurement (§17): this panel fires NOTHING. `bank_transfer_pending` is emitted
 * by the parent at the single moment the local-transfer option is CHOSEN, so the
 * pending state can re-render (or the visitor can step back and forward) without
 * ever counting the same order twice.
 */

type ApprovedAccount = {
  /** Slot label — the visible name of this approved account. */
  slot: string
  bankName: string
  accountName: string
  accountNumber: string
  iban: string
}

/**
 * APPROVED ACCOUNTS — TWO SLOTS, INTENTIONALLY EMPTY.
 *
 * Real bank details must be supplied by the founder before launch. Nothing here
 * is ever invented: every empty string renders as a labelled empty slot, so the
 * page stays honest instead of showing a plausible-looking wrong account number.
 */
const APPROVED_ACCOUNTS: readonly ApprovedAccount[] = [
  { slot: 'الحساب المعتمد الأول', bankName: '', accountName: '', accountNumber: '', iban: '' },
  { slot: 'الحساب المعتمد الثاني', bankName: '', accountName: '', accountNumber: '', iban: '' },
]

/** Finance WhatsApp line for receipts — supplied by the founder, never invented. */
const FINANCE_WHATSAPP_NUMBER = ''

const EMPTY_SLOT_NOTE = 'بانتظار الاعتماد من إدارة EMC'

type Props = {
  /** Country that unlocked this option — shown so the visitor knows the list applies to them. */
  countryName: string
  /** Formatted total, already carrying its context label in the parent summary. */
  amountLabel: string
  programTitle: string
  /** Full name entered in step one — the reference the finance team matches against. */
  payerName: string
  pending: boolean
  onMarkTransferred: (receiptFileName: string | null) => void
}

function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <dt className="shrink-0 text-xs font-black text-muted-500">{label}</dt>
      {value.trim() ? (
        <dd className="min-w-0 truncate text-sm font-black tabular-nums text-navy" dir="ltr">
          {value}
        </dd>
      ) : (
        <dd className="text-xs font-bold text-muted-400">{EMPTY_SLOT_NOTE}</dd>
      )}
    </div>
  )
}

export default function BankTransferPanel({
  countryName,
  amountLabel,
  programTitle,
  payerName,
  pending,
  onMarkTransferred,
}: Props) {
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null)

  if (pending) {
    return (
      <section
        aria-live="polite"
        className="rounded-2xl border border-ocean/30 bg-brand-50 p-5 text-right sm:p-6"
      >
        <h3 className="font-display text-lg font-black text-navy">بانتظار تأكيد التحويل</h3>
        <p className="mt-3 text-sm font-semibold leading-7 text-ink-500">
          سجّلنا طلبك على برنامج {programTitle}. يصلك تأكيد المقعد على بريدك وواتساب فور مطابقة
          التحويل مع الحساب المعتمد.
        </p>
        {receiptFileName ? (
          <p className="mt-3 flex items-center justify-end gap-2 text-xs font-bold text-customBlue">
            <Paperclip size={13} aria-hidden />
            {receiptFileName}
          </p>
        ) : null}
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 text-right sm:p-6">
      <h3 className="flex items-center justify-end gap-2 font-display text-lg font-black text-navy">
        <Landmark size={18} className="text-ocean" aria-hidden />
        تحويل بنكي محلي
      </h3>
      <p className="mt-2 text-sm font-semibold leading-7 text-ink-500">
        هذا الخيار متاح لك لأن بلدك {countryName}. حوّل المبلغ إلى أحد الحسابين المعتمدين، ثم أرسل
        الإيصال لتأكيد مقعدك.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {APPROVED_ACCOUNTS.map((account) => (
          <div key={account.slot} className="rounded-xl border border-line bg-paper2 p-4">
            <p className="mb-2 text-sm font-black text-navy">{account.slot}</p>
            <dl>
              <AccountField label="البنك" value={account.bankName} />
              <AccountField label="اسم صاحب الحساب" value={account.accountName} />
              <AccountField label="رقم الحساب" value={account.accountNumber} />
              <AccountField label="IBAN" value={account.iban} />
            </dl>
          </div>
        ))}
      </div>

      <dl className="mt-5 rounded-xl border border-line p-4">
        <AccountField label="المبلغ المطلوب تحويله" value={amountLabel} />
        <AccountField label="مرجع التحويل" value={payerName} />
        <AccountField label="واتساب المالية لاستلام الإيصال" value={FINANCE_WHATSAPP_NUMBER} />
      </dl>

      <p className="mt-5 text-sm font-semibold leading-7 text-ink-500">
        اكتب اسمك الكامل في خانة البيان عند التحويل، ثم أرفق صورة الإيصال هنا أو أرسلها عبر واتساب
        المالية مع اسم البرنامج.
      </p>

      <label className="mt-4 block text-sm font-black text-navy">
        إرفاق صورة الإيصال
        <span className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-paper2 px-4 py-3">
          <Paperclip size={16} className="shrink-0 text-muted-500" aria-hidden />
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0]
              setReceiptFileName(file ? file.name : null)
            }}
            className="min-w-0 flex-1 text-xs font-bold text-ink-500 file:ml-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white"
          />
        </span>
      </label>

      <button
        type="button"
        onClick={() => onMarkTransferred(receiptFileName)}
        className="emc-focus-ring mt-5 inline-flex h-14 w-full items-center justify-center rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:brightness-[1.03]"
      >
        أكملت التحويل
      </button>
    </section>
  )
}
