import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Loader2, MapPin, Phone, X } from 'lucide-react'
import CountrySelector, { COUNTRIES, type Country } from '@/components/ui/CountrySelector'
import PaymentProviderSelector from '@/components/payments/PaymentProviderSelector'
import type { Course } from '@/types'
import { formatPrice } from '@/utils/course'

export type EnrollmentFieldValues = {
  phone: string
  city: string
  gender: string
  notes: string
  registration_code?: string
  payment_provider?: 'stripe' | 'paypal' | 'fake'
  country?: string
  country_code?: string
  phone_country_code?: string
}

type MissingField = 'phone' | 'city' | 'gender'

type Props = {
  open: boolean
  course: Course
  missing: MissingField[]
  initial?: Partial<EnrollmentFieldValues>
  submitting?: boolean
  error?: string
  fieldErrors?: Partial<Record<'phone' | 'city' | 'gender' | 'notes' | 'payment_provider' | 'registration_code', string>>
  onClose: () => void
  onSubmit: (values: EnrollmentFieldValues) => void
}

const inputCls = (err?: string) =>
  `h-12 w-full rounded-xl border bg-slate-50 px-4 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-sky-100 ${err ? 'border-red-400' : 'border-slate-200 focus:border-customBlue'}`

export default function CourseEnrollmentFieldsModal({
  open,
  course,
  missing,
  initial,
  submitting = false,
  error,
  fieldErrors = {},
  onClose,
  onSubmit,
}: Props) {
  const isPaid = course.is_paid === true || course.type === 'paid'
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [localPhone, setLocalPhone] = useState('')
  const [city, setCity] = useState('')
  const [gender, setGender] = useState('')
  const [notes, setNotes] = useState('')
  const [registrationCode, setRegistrationCode] = useState('')
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'paypal' | 'fake'>('stripe')

  const requiresRegistrationCode = Boolean(course.requires_registration_code)

  useEffect(() => {
    if (!open) return
    setCity(initial?.city ?? '')
    setGender(initial?.gender ?? '')
    setNotes(initial?.notes ?? '')
    setRegistrationCode(initial?.registration_code ?? '')
    setPaymentProvider(initial?.payment_provider ?? 'stripe')

    const phoneRaw = initial?.phone?.trim() ?? ''
    if (initial?.country_code) {
      const co = COUNTRIES.find((c) => c.code === initial.country_code) ?? null
      setSelectedCountry(co)
    } else {
      setSelectedCountry(null)
    }

    if (phoneRaw && initial?.phone_country_code) {
      setLocalPhone(phoneRaw.startsWith(initial.phone_country_code) ? phoneRaw.slice(initial.phone_country_code.length) : phoneRaw)
    } else if (phoneRaw) {
      for (const co of COUNTRIES) {
        if (phoneRaw.startsWith(co.dialCode)) {
          setSelectedCountry(co)
          setLocalPhone(phoneRaw.slice(co.dialCode.length).trim())
          return
        }
      }
      setLocalPhone(phoneRaw)
    } else {
      setLocalPhone('')
    }
  }, [open, initial])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedCountry && missing.includes('phone')) return
    if (requiresRegistrationCode && !registrationCode.trim()) return
    const phone =
      selectedCountry && localPhone.trim() ? `${selectedCountry.dialCode}${localPhone.trim()}` : initial?.phone ?? ''
    onSubmit({
      phone,
      city: city.trim() || initial?.city || '',
      gender: gender || initial?.gender || '',
      notes: notes.trim(),
      ...(requiresRegistrationCode ? { registration_code: registrationCode.trim() } : {}),
      ...(isPaid ? { payment_provider: paymentProvider } : {}),
      country: selectedCountry?.name,
      country_code: selectedCountry?.code,
      phone_country_code: selectedCountry?.dialCode,
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => !submitting && onClose()}
        >
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(ev) => ev.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
            dir="rtl"
          >
            <div className="mb-5 flex items-start justify-between gap-3 text-right">
              <div>
                <h2 className="text-lg font-black text-deepBlue">إكمال بيانات الالتحاق</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">نحتاج بعض الحقول قبل تأكيد التسجيل.</p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              {missing.includes('phone') && (
                <>
                  <div className="grid gap-2 text-sm font-black text-deepBlue">
                    الدولة
                    <CountrySelector
                      value={selectedCountry}
                      onChange={setSelectedCountry}
                      error={fieldErrors.phone}
                    />
                  </div>
                  <div className="grid gap-2 text-sm font-black text-deepBlue">
                    رقم الجوال
                    <div
                      dir="ltr"
                      className={`flex h-12 w-full overflow-hidden rounded-xl border bg-slate-50 ${fieldErrors.phone ? 'border-red-400' : 'border-slate-200'}`}
                    >
                      <div className="flex shrink-0 items-center gap-1.5 border-r border-slate-200 bg-slate-100 px-3 text-sm font-bold text-deepBlue">
                        {selectedCountry ?
                          <>
                            <span>{selectedCountry.flag}</span>
                            <span>{selectedCountry.dialCode}</span>
                          </>
                        : <Phone size={16} className="text-slate-400" />}
                      </div>
                      <input
                        type="tel"
                        value={localPhone}
                        onChange={(e) => setLocalPhone(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent px-3 text-left font-semibold text-deepBlue outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {missing.includes('city') && (
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  المدينة
                  <span className="relative block">
                    <MapPin size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls(fieldErrors.city)} />
                  </span>
                </label>
              )}

              {missing.includes('gender') && (
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  الجنس
                  <span className="relative block">
                    <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className={`${inputCls(fieldErrors.gender)} appearance-none pl-9`}
                    >
                      <option value="">اختر الجنس</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </span>
                </label>
              )}

              {requiresRegistrationCode ?
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  رمز التسجيل
                  <input
                    value={registrationCode}
                    required
                    onChange={(e) => setRegistrationCode(e.target.value)}
                    className={inputCls(fieldErrors.registration_code)}
                    placeholder="أدخل رمز التسجيل للدورة"
                    autoComplete="off"
                  />
                  {fieldErrors.registration_code ?
                    <span className="text-xs text-red-600">{fieldErrors.registration_code}</span>
                  : null}
                </label>
              : null}

              <label className="grid gap-2 text-sm font-black text-deepBlue">
                ملاحظات <span className="font-semibold text-slate-400">(اختياري)</span>
                <textarea
                  value={notes}
                  rows={3}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-deepBlue outline-none focus:border-customBlue"
                />
              </label>

              {isPaid && (
                <div>
                  <p className="mb-2 text-sm font-black text-deepBlue">طريقة الدفع · {formatPrice(course.price)}</p>
                  <PaymentProviderSelector
                    value={paymentProvider}
                    onChange={(v) => setPaymentProvider(v as 'stripe' | 'paypal' | 'fake')}
                    disabled={submitting}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-sm font-black text-white shadow-md disabled:opacity-60"
              >
                {submitting ?
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ التسجيل…
                  </>
                : 'تأكيد الالتحاق'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
