import type { FormEvent } from 'react'
import type { CouponDiscountType, CouponRecord } from '@/types/intelligence'

export default function CouponForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: CouponRecord | null
  onSubmit: (values: Partial<CouponRecord>) => Promise<void>
  onCancel: () => void
}) {
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await onSubmit({
      code: String(fd.get('code') ?? ''),
      name: String(fd.get('name') ?? ''),
      discount_type: String(fd.get('discount_type') ?? 'percent') as CouponDiscountType,
      value: Number(fd.get('value') ?? 0),
      max_uses: fd.get('max_uses') ? Number(fd.get('max_uses')) : null,
      starts_at: String(fd.get('starts_at') ?? '') || null,
      ends_at: String(fd.get('ends_at') ?? '') || null,
      applies_to: String(fd.get('applies_to') ?? ''),
      active: fd.get('active') === 'on',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-black text-deepBlue">
          الرمز
          <input
            name="code"
            required
            defaultValue={initial?.code}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold uppercase"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-deepBlue">
          الاسم
          <input name="name" required defaultValue={initial?.name} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
        </label>
        <label className="grid gap-1 text-xs font-black text-deepBlue">
          نوع الخصم
          <select name="discount_type" defaultValue={initial?.discount_type ?? 'percent'} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold">
            <option value="percent">نسبة مئوية</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black text-deepBlue">
          القيمة
          <input name="value" type="number" step="0.01" required defaultValue={initial?.value} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
        </label>
        <label className="grid gap-1 text-xs font-black text-deepBlue">
          أقصى استخدام
          <input name="max_uses" type="number" defaultValue={initial?.max_uses ?? ''} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
        </label>
        <label className="grid gap-1 text-xs font-black text-deepBlue">
          ينطبق على
          <input name="applies_to" defaultValue={initial?.applies_to} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
        </label>
        <label className="grid gap-1 text-xs font-black text-deepBlue">
          بداية
          <input name="starts_at" type="date" defaultValue={initial?.starts_at ?? ''} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
        </label>
        <label className="grid gap-1 text-xs font-black text-deepBlue">
          نهاية
          <input name="ends_at" type="date" defaultValue={initial?.ends_at ?? ''} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
        </label>
      </div>
      <label className="flex items-center justify-end gap-2 text-xs font-black text-deepBlue">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="accent-customBlue" />
        نشط
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-200">
          إلغاء
        </button>
        <button type="submit" className="rounded-xl bg-customBlue px-5 py-2 text-xs font-black text-white">
          حفظ
        </button>
      </div>
    </form>
  )
}
