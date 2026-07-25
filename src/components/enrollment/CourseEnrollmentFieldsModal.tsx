import { useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Loader2, MapPin, Phone, X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
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

/** Splits the incoming phone into (country, national part) exactly as the form stores it. */
function hydratePhone(initial?: Partial<EnrollmentFieldValues>): {
  country: Country | null
  localPhone: string
} {
  const phoneRaw = initial?.phone?.trim() ?? ''
  const country =
    initial?.country_code ? COUNTRIES.find((c) => c.code === initial.country_code) ?? null : null

  if (phoneRaw && initial?.phone_country_code) {
    return {
      country,
      localPhone:
        phoneRaw.startsWith(initial.phone_country_code) ?
          phoneRaw.slice(initial.phone_country_code.length)
        : phoneRaw,
    }
  }
  if (phoneRaw) {
    for (const co of COUNTRIES) {
      if (phoneRaw.startsWith(co.dialCode)) {
        return { country: co, localPhone: phoneRaw.slice(co.dialCode.length).trim() }
      }
    }
    return { country, localPhone: phoneRaw }
  }
  return { country, localPhone: '' }
}

const inputCls = (err?: string) =>
  `h-12 w-full rounded-xl border bg-paper2 px-4 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 focus:ring-brand-100 ${err ? 'border-red-400' : 'border-line focus:border-customBlue'}`

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
  const panelRef = useRef<HTMLDivElement | null>(null)

  useFocusTrap(panelRef, { active: open, onEscape: onClose })

  const requiresRegistrationCode = Boolean(course.requires_registration_code)

  // Hydrate the form from `initial` during render whenever the modal opens or the
  // incoming values change (react.dev "adjusting state when a prop changes").
  // `seenOpen` starts as `null` so the first pass still runs, matching the mount run
  // of the effect this replaces.
  const [seenOpen, setSeenOpen] = useState<boolean | null>(null)
  const [seenInitial, setSeenInitial] = useState(initial)
  if (seenOpen !== open || seenInitial !== initial) {
    setSeenOpen(open)
    setSeenInitial(initial)
    if (open) {
      setCity(initial?.city ?? '')
      setGender(initial?.gender ?? '')
      setNotes(initial?.notes ?? '')
      setRegistrationCode(initial?.registration_code ?? '')
      setPaymentProvider(initial?.payment_provider ?? 'stripe')

      const hydrated = hydratePhone(initial)
      setSelectedCountry(hydrated.country)
      setLocalPhone(hydrated.localPhone)
    }
  }

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
          aria-labelledby="enrollment-fields-title"
          onClick={() => !submitting && onClose()}
        >
          <motion.div
            ref={panelRef}
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(ev) => ev.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-7 shadow-emc-xl ring-1 ring-line"
            dir="rtl"
          >
            <div className="mb-6 flex items-start justify-between gap-3 text-right">
              <div>
                <h2 id="enrollment-fields-title" className="font-display text-lg font-black tracking-tight text-deepBlue">إكمال بيانات الالتحاق</h2>
                <p className="mt-1.5 text-sm font-semibold text-muted-500">نحتاج بعض الحقول قبل تأكيد التسجيل.</p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="rounded-lg p-1 text-muted-400 transition hover:bg-paper2 hover:text-foreground"
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
                      className={`flex h-12 w-full overflow-hidden rounded-xl border bg-paper2 transition focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100 ${fieldErrors.phone ? 'border-red-400' : 'border-line focus-within:border-customBlue'}`}
                    >
                      <div className="flex shrink-0 items-center gap-1.5 border-r border-line bg-paper2 px-3 text-sm font-bold text-deepBlue">
                        {selectedCountry ?
                          <>
                            <span>{selectedCountry.flag}</span>
                            <span className="font-latin tabular-nums">{selectedCountry.dialCode}</span>
                          </>
                        : <Phone size={16} className="text-muted-400" />}
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
                    <MapPin size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-400" />
                    <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls(fieldErrors.city)} />
                  </span>
                </label>
              )}

              {missing.includes('gender') && (
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  الجنس
                  <span className="relative block">
                    <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
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
                ملاحظات <span className="font-semibold text-muted-400">(اختياري)</span>
                <textarea
                  value={notes}
                  rows={3}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none rounded-xl border border-line bg-paper2 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-brand-100"
                />
              </label>

              {isPaid && (
                <div>
                  <p className="mb-2 text-sm font-black text-deepBlue">طريقة الدفع · <span className="font-latin tabular-nums text-accent-700" dir="ltr">{formatPrice(course.price)}</span></p>
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
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-sm font-black text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03] disabled:opacity-60"
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
