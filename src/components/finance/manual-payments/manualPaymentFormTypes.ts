import type { ManualPaymentPurchasableType } from '@/types/intelligence'

export interface ManualPaymentRecipient {
  id: number
  name: string
  email: string | null
  phone: string | null
  role?: string | null
  avatar?: string | null
  status?: string | null
}

export interface SearchablePurchasable {
  id: number
  type: ManualPaymentPurchasableType
  title: string
  slug?: string | null
  price: number | null
  status?: string | null
  subtitle?: string | null
}

export interface ManualPaymentFormValues {
  recipient_id: number | null
  recipient: ManualPaymentRecipient | null
  relation_type: ManualPaymentPurchasableType | null
  relation_id: number | null
  relation: SearchablePurchasable | null
  paid_amount: string
  relation_amount: number | null
  payment_date: string
  payment_method: string
  destination_account_id: number | null
  currency: string
  external_reference: string
  notes: string
  proof: File | null
}

export function emptyManualPaymentForm(): ManualPaymentFormValues {
  return {
    recipient_id: null,
    recipient: null,
    relation_type: null,
    relation_id: null,
    relation: null,
    paid_amount: '',
    relation_amount: null,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    destination_account_id: null,
    currency: '',
    external_reference: '',
    notes: '',
    proof: null,
  }
}

export function relationAmountLabel(type: ManualPaymentPurchasableType | null): string {
  if (type === 'course') return 'سعر الدورة'
  if (type === 'workshop') return 'سعر الورشة'
  if (type === 'learning_path') return 'سعر المسار'
  return 'قيمة العنصر'
}
