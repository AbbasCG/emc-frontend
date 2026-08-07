import { useState } from 'react'
import type { FormEvent } from 'react'
import CouponCourseSelector from './CouponCourseSelector'
import type { CouponDiscountType, CouponEligibilityType, CouponRecord, CouponStatus } from '@/types/intelligence'

export default function CouponForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: CouponRecord | null
  onSubmit: (values: Partial<CouponRecord>) => Promise<void>
  onCancel: () => void
}) {
  const [eligibilityType, setEligibilityType] = useState<CouponEligibilityType>(initial?.eligibility_type ?? 'all_paid_courses')
  const [courseIds, setCourseIds] = useState<number[]>(initial?.courses?.map((c) => c.id) ?? [])
  const [courseError, setCourseError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCourseError('')

    if (eligibilityType === 'selected_courses' && courseIds.length === 0) {
      setCourseError('يجب اختيار دورة واحدة على الأقل عند تحديد "دورات محددة".')
      return
    }

    const fd = new FormData(e.currentTarget)
    setSubmitting(true)
    try {
      await onSubmit({
        code: String(fd.get('code') ?? '') || undefined,
        name: String(fd.get('name') ?? ''),
        discount_type: String(fd.get('discount_type') ?? 'percentage') as CouponDiscountType,
        discount_value: Number(fd.get('discount_value') ?? 0),
        maximum_discount_amount: fd.get('maximum_discount_amount') ? Number(fd.get('maximum_discount_amount')) : null,
        minimum_order_amount: fd.get('minimum_order_amount') ? Number(fd.get('minimum_order_amount')) : null,
        max_uses: fd.get('max_uses') ? Number(fd.get('max_uses')) : null,
        usage_limit_per_user: fd.get('usage_limit_per_user') ? Number(fd.get('usage_limit_per_user')) : null,
        starts_at: String(fd.get('starts_at') ?? '') || null,
        expires_at: String(fd.get('expires_at') ?? '') || null,
        status: String(fd.get('status') ?? 'active') as CouponStatus,
        eligibility_type: eligibilityType,
        course_ids: eligibilityType === 'selected_courses' ? courseIds : [],
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 text-right">
      {/* ── General ─────────────────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">عام</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black text-deepBlue">
            الرمز
            <input
              name="code"
              defaultValue={initial?.code}
              placeholder="يُولَّد تلقائياً إن ترك فارغاً"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold uppercase"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-deepBlue">
            الاسم
            <input name="name" required defaultValue={initial?.name} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
          </label>
          <label className="grid gap-1 text-xs font-black text-deepBlue">
            نوع الخصم
            <select name="discount_type" defaultValue={initial?.discount_type ?? 'percentage'} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold">
              <option value="percentage">نسبة مئوية</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black text-deepBlue">
            القيمة
            <input name="discount_value" type="number" step="0.01" required defaultValue={initial?.discount_value} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
          </label>
          <label className="grid gap-1 text-xs font-black text-deepBlue">
            حد أقصى للخصم (اختياري)
            <input name="maximum_discount_amount" type="number" step="0.01" defaultValue={initial?.maximum_discount_amount ?? ''} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
          </label>
          <label className="grid gap-1 text-xs font-black text-deepBlue">
            الحد الأدنى لقيمة الطلب (اختياري)
            <input name="minimum_order_amount" type="number" step="0.01" defaultValue={initial?.minimum_order_amount ?? ''} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
          </label>
        </div>
      </div>

      {/* ── Course restrictions ─────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">الدورات المشمولة</p>
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setEligibilityType('all_paid_courses')}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-black transition-colors ${
              eligibilityType === 'all_paid_courses' ? 'border-customBlue bg-customBlue/10 text-customBlue' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            ✓ جميع الدورات المدفوعة
          </button>
          <button
            type="button"
            onClick={() => setEligibilityType('selected_courses')}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-black transition-colors ${
              eligibilityType === 'selected_courses' ? 'border-customBlue bg-customBlue/10 text-customBlue' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            دورات محددة
          </button>
        </div>

        {eligibilityType === 'selected_courses' && (
          <CouponCourseSelector value={courseIds} onChange={(ids) => { setCourseIds(ids); setCourseError('') }} error={courseError} />
        )}
      </div>

      {/* ── Usage limits ─────────────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">حدود الاستخدام</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black text-deepBlue">
            أقصى استخدام إجمالي
            <input name="max_uses" type="number" defaultValue={initial?.max_uses ?? ''} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
          </label>
          <label className="grid gap-1 text-xs font-black text-deepBlue">
            أقصى استخدام لكل مستخدم
            <input name="usage_limit_per_user" type="number" defaultValue={initial?.usage_limit_per_user ?? ''} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
          </label>
        </div>
      </div>

      {/* ── Validity ─────────────────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">فترة الصلاحية</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black text-deepBlue">
            بداية الصلاحية
            <input name="starts_at" type="date" defaultValue={initial?.starts_at?.slice(0, 10) ?? ''} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
          </label>
          <label className="grid gap-1 text-xs font-black text-deepBlue">
            نهاية الصلاحية
            <input name="expires_at" type="date" defaultValue={initial?.expires_at?.slice(0, 10) ?? ''} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" />
          </label>
        </div>
      </div>

      <label className="grid gap-1 text-xs font-black text-deepBlue">
        الحالة
        <select name="status" defaultValue={initial?.status ?? 'active'} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold">
          <option value="active">نشط</option>
          <option value="inactive">موقوف</option>
          <option value="draft">مسودة</option>
          <option value="archived">مؤرشف</option>
        </select>
      </label>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onCancel} disabled={submitting} className="rounded-xl px-4 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-200 disabled:opacity-50">
          إلغاء
        </button>
        <button type="submit" disabled={submitting} className="rounded-xl bg-customBlue px-5 py-2 text-xs font-black text-white disabled:opacity-60">
          {submitting ? 'جارٍ الحفظ...' : 'حفظ'}
        </button>
      </div>
    </form>
  )
}
