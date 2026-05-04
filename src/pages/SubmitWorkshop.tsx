import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import api from '../api/axios'
import PageHeader from '../components/PageHeader'
import AppAlert from '../components/ui/AppAlert'
import AppBadge from '../components/ui/AppBadge'
import AppButton from '../components/ui/AppButton'
import AppCard from '../components/ui/AppCard'
import AppCheckboxGroup from '../components/ui/AppCheckboxGroup'
import AppFileUpload from '../components/ui/AppFileUpload'
import AppInput from '../components/ui/AppInput'
import AppRadioGroup from '../components/ui/AppRadioGroup'
import AppSectionHeader from '../components/ui/AppSectionHeader'
import AppTextarea from '../components/ui/AppTextarea'

type ValidationErrors = Record<string, string[]>

type WorkshopFormValues = {
  requester_name: string
  requester_email: string
  requester_phone: string
  requester_department: string
  program_name: string
  speaker_name: string
  speaker_job_title: string
  topics: string
  target_audience: string
  proposed_date: string
  proposed_time: string
  price_type: 'free' | 'paid'
  price_amount: string
}

const categories = [
  'المسارات الأكاديمية والمهنية',
  'التعلم الدولي والتبادل',
  'معهد اللغة والتواصل',
  'الذكاء الاصطناعي والتمكين الرقمي',
  'تطوير المهارات والمسار المهني',
  'القيادة وريادة الأعمال',
  'مساحات الوعي والمعرفة',
  'الصحة النفسية ونمط الحياة',
  'الوعي المالي',
  'التعلم التجريبي والأنشطة الميدانية',
  'تطوير الأطفال والناشئة Future Minds',
  'الشراكات والتعاون الاستراتيجي',
]

const locationTypes = ['مقر المركز', 'Google Meet', 'Zoom', 'أخرى']

const initialForm: WorkshopFormValues = {
  requester_name: '',
  requester_email: '',
  requester_phone: '',
  requester_department: '',
  program_name: '',
  speaker_name: '',
  speaker_job_title: '',
  topics: '',
  target_audience: '',
  proposed_date: '',
  proposed_time: '',
  price_type: 'free',
  price_amount: '',
}

const stepAnimation = {
  initial: { opacity: 0, x: 22 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -22 },
  transition: { duration: 0.22 },
}

export default function SubmitWorkshop() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<WorkshopFormValues>(initialForm)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [speakerPhoto, setSpeakerPhoto] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const updateField = (name: keyof WorkshopFormValues, value: string) => {
    setForm((previous) => ({
      ...previous,
      [name]: name === 'price_type' ? (value as WorkshopFormValues['price_type']) : value,
      price_amount: name === 'price_type' && value === 'free' ? '' : previous.price_amount,
    }))
    setApiError('')
  }

  const getError = (...keys: string[]) => keys.map((key) => validationErrors[key]?.[0]).find(Boolean)

  const validateStep = (targetStep = step) => {
    const errors: ValidationErrors = {}
    const required = (key: keyof WorkshopFormValues, message: string) => {
      if (!form[key].trim()) errors[key] = [message]
    }

    if (targetStep === 1) {
      required('requester_name', 'يرجى إدخال اسم مقدم الطلب.')
      required('requester_email', 'يرجى إدخال البريد الإلكتروني.')
      required('requester_phone', 'يرجى إدخال رقم الجوال.')
      required('requester_department', 'يرجى إدخال القسم أو الجهة.')
    }

    if (targetStep === 2) {
      required('program_name', 'يرجى إدخال اسم البرنامج.')
      required('speaker_name', 'يرجى إدخال اسم المتحدث.')
      required('speaker_job_title', 'يرجى إدخال المسمى الوظيفي للمتحدث.')
      if (selectedCategories.length === 0) errors.categories = ['يرجى اختيار فئة واحدة على الأقل.']
    }

    if (targetStep === 3) {
      required('topics', 'يرجى كتابة محاور الورشة.')
      required('target_audience', 'يرجى تحديد الجمهور المستهدف.')
      required('proposed_date', 'يرجى اختيار التاريخ المقترح.')
      required('proposed_time', 'يرجى اختيار الوقت المقترح.')
      if (selectedLocations.length === 0) errors.location_types = ['يرجى اختيار طريقة تنفيذ واحدة على الأقل.']
    }

    if (targetStep === 4 && form.price_type === 'paid') {
      required('price_amount', 'يرجى إدخال قيمة السعر عند اختيار ورشة مدفوعة.')
    }

    return errors
  }

  const goToNextStep = () => {
    const errors = validateStep()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setApiError('يرجى إكمال الحقول المطلوبة في هذه الخطوة قبل المتابعة.')
      return
    }

    setValidationErrors({})
    setApiError('')
    setStep((current) => Math.min(current + 1, 4))
  }

  const goToPreviousStep = () => {
    setValidationErrors({})
    setApiError('')
    setStep((current) => Math.max(current - 1, 1))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApiError('')
    setSuccessMessage('')

    const allErrors = [1, 2, 3, 4].reduce<ValidationErrors>(
      (errors, currentStep) => ({ ...errors, ...validateStep(currentStep) }),
      {},
    )

    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(allErrors)
      setApiError('يرجى مراجعة الحقول المطلوبة قبل إرسال الطلب.')
      setStep(Number(Object.keys({ 1: true, 2: true, 3: true, 4: true }).find((currentStep) => {
        const stepErrors = validateStep(Number(currentStep))
        return Object.keys(stepErrors).length > 0
      }) ?? step))
      return
    }

    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      payload.append(key, value)
    })
    selectedCategories.forEach((category) => payload.append('categories[]', category))
    selectedLocations.forEach((locationType) => payload.append('location_types[]', locationType))
    if (speakerPhoto) payload.append('speaker_photo', speakerPhoto)

    try {
      setIsSubmitting(true)
      await api.post('/workshop-requests', payload)
      setValidationErrors({})
      setSuccessMessage('تم إرسال طلب الورشة بنجاح. سيقوم فريق مركز التمكين بالتواصل معك بعد مراجعة البيانات.')
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const backendErrors = error.response.data?.errors ?? {}
        setValidationErrors(backendErrors)
        setApiError(error.response.data?.message ?? 'يرجى التحقق من البيانات المدخلة.')
        return
      }

      setApiError('تعذر إرسال الطلب الآن. يرجى المحاولة مرة أخرى لاحقا.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="bg-[#fbf7ef] pt-20">
      <PageHeader
        title="تقديم ورشة عمل"
        subtitle="شارك خبرتك مع مجتمع مركز التمكين عبر طلب واضح ومنظم يصل مباشرة إلى الفريق المختص."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'تقديم ورشة عمل' },
        ]}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 grid gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className={`h-2 rounded-full transition ${item <= step ? 'bg-[#b9872f]' : 'bg-white shadow-inner'}`}
                aria-hidden="true"
              />
            ))}
          </div>

          <div className="space-y-6" aria-live="polite">
            {successMessage && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                <AppAlert type="success" title="تم استلام الطلب" message={successMessage} />
              </motion.div>
            )}

            {apiError && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
                <AppAlert type="error" title="تنبيه" message={apiError} dismissible onDismiss={() => setApiError('')} />
              </motion.div>
            )}
          </div>

          <AppCard className="mt-6 p-5 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="requester" {...stepAnimation} className="space-y-6">
                    <AppSectionHeader
                      title="معلومات مقدم الطلب"
                      description="بيانات التواصل الأساسية التي سيستخدمها فريق المركز لمتابعة الطلب."
                      step={1}
                      totalSteps={4}
                    />

                    <div className="grid gap-5 sm:grid-cols-2">
                      <AppInput
                        label="الاسم الكامل"
                        name="requester_name"
                        value={form.requester_name}
                        onChange={(value) => updateField('requester_name', value)}
                        placeholder="اكتب الاسم الكامل"
                        error={getError('requester_name')}
                        required
                        icon="user"
                      />
                      <AppInput
                        label="البريد الإلكتروني"
                        name="requester_email"
                        type="email"
                        value={form.requester_email}
                        onChange={(value) => updateField('requester_email', value)}
                        placeholder="name@example.com"
                        error={getError('requester_email')}
                        required
                        icon="mail"
                      />
                      <AppInput
                        label="رقم الجوال"
                        name="requester_phone"
                        type="tel"
                        value={form.requester_phone}
                        onChange={(value) => updateField('requester_phone', value)}
                        placeholder="+966 5X XXX XXXX"
                        error={getError('requester_phone')}
                        required
                        icon="phone"
                      />
                      <AppInput
                        label="القسم أو الجهة"
                        name="requester_department"
                        value={form.requester_department}
                        onChange={(value) => updateField('requester_department', value)}
                        placeholder="مثال: كلية الأعمال"
                        error={getError('requester_department')}
                        required
                      />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="program" {...stepAnimation} className="space-y-6">
                    <AppSectionHeader
                      title="معلومات البرنامج والمتحدث"
                      description="عرّفنا بفكرة الورشة، مسارها، والشخص الذي سيقدمها."
                      step={2}
                      totalSteps={4}
                    />

                    <AppInput
                      label="اسم البرنامج"
                      name="program_name"
                      value={form.program_name}
                      onChange={(value) => updateField('program_name', value)}
                      placeholder="مثال: مقدمة عملية في الذكاء الاصطناعي"
                      error={getError('program_name')}
                      required
                      icon="text"
                    />

                    <AppCheckboxGroup
                      label="فئات البرنامج"
                      name="categories"
                      options={categories.map((category) => ({ label: category, value: category }))}
                      selected={selectedCategories}
                      onChange={setSelectedCategories}
                      error={getError('categories', 'categories[]')}
                      required
                      columns={2}
                    />

                    <div className="grid gap-5 sm:grid-cols-2">
                      <AppInput
                        label="اسم المتحدث"
                        name="speaker_name"
                        value={form.speaker_name}
                        onChange={(value) => updateField('speaker_name', value)}
                        placeholder="اسم المتحدث الرئيسي"
                        error={getError('speaker_name')}
                        required
                        icon="user"
                      />
                      <AppInput
                        label="المسمى الوظيفي"
                        name="speaker_job_title"
                        value={form.speaker_job_title}
                        onChange={(value) => updateField('speaker_job_title', value)}
                        placeholder="مثال: مستشار تطوير مهني"
                        error={getError('speaker_job_title')}
                        required
                      />
                    </div>

                    <AppFileUpload
                      label="صورة المتحدث"
                      name="speaker_photo"
                      file={speakerPhoto}
                      onChange={setSpeakerPhoto}
                      accept="image/*"
                      hint="JPG أو PNG، ويفضل ألا تتجاوز 5MB"
                      error={getError('speaker_photo')}
                    />
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="details" {...stepAnimation} className="space-y-6">
                    <AppSectionHeader
                      title="تفاصيل الورشة"
                      description="المحاور، الجمهور المستهدف، والموعد أو طريقة التنفيذ المقترحة."
                      step={3}
                      totalSteps={4}
                    />

                    <AppTextarea
                      label="المواضيع والمحاور"
                      name="topics"
                      value={form.topics}
                      onChange={(value) => updateField('topics', value)}
                      placeholder="اكتب أهم المحاور التي ستغطيها الورشة."
                      error={getError('topics')}
                      required
                      rows={5}
                      maxLength={1000}
                    />
                    <AppTextarea
                      label="الجمهور المستهدف"
                      name="target_audience"
                      value={form.target_audience}
                      onChange={(value) => updateField('target_audience', value)}
                      placeholder="مثال: طلبة السنة الأولى، الخريجون، أو المهتمون بريادة الأعمال."
                      error={getError('target_audience')}
                      required
                      rows={3}
                      maxLength={500}
                    />

                    <div className="grid gap-5 sm:grid-cols-2">
                      <AppInput
                        label="التاريخ المقترح"
                        name="proposed_date"
                        type="date"
                        value={form.proposed_date}
                        onChange={(value) => updateField('proposed_date', value)}
                        error={getError('proposed_date')}
                        required
                        icon="calendar"
                      />
                      <AppInput
                        label="الوقت المقترح"
                        name="proposed_time"
                        type="time"
                        value={form.proposed_time}
                        onChange={(value) => updateField('proposed_time', value)}
                        error={getError('proposed_time')}
                        required
                        icon="time"
                      />
                    </div>

                    <AppCheckboxGroup
                      label="طريقة أو مكان التنفيذ"
                      name="location_types"
                      options={locationTypes.map((locationType) => ({ label: locationType, value: locationType }))}
                      selected={selectedLocations}
                      onChange={setSelectedLocations}
                      error={getError('location_types', 'location_types[]')}
                      required
                      columns={2}
                    />
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div key="pricing" {...stepAnimation} className="space-y-6">
                    <AppSectionHeader
                      title="التسعير والمراجعة"
                      description="حدد إن كانت الورشة مجانية أو مدفوعة، ثم راجع ملخص الطلب قبل الإرسال."
                      step={4}
                      totalSteps={4}
                    />

                    <AppRadioGroup
                      label="نوع السعر"
                      name="price_type"
                      options={[
                        { label: 'مجانية', value: 'free' },
                        { label: 'مدفوعة', value: 'paid' },
                      ]}
                      selected={form.price_type}
                      onChange={(value) => updateField('price_type', value)}
                      error={getError('price_type')}
                      required
                      columns={2}
                    />

                    {form.price_type === 'paid' && (
                      <AppInput
                        label="قيمة السعر"
                        name="price_amount"
                        type="number"
                        value={form.price_amount}
                        onChange={(value) => updateField('price_amount', value)}
                        placeholder="اكتب المبلغ بالريال السعودي"
                        error={getError('price_amount')}
                        required
                      />
                    )}

                    <div className="rounded-2xl border border-amber-100 bg-[#fffaf0] p-5 text-right">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black text-deepBlue">ملخص الطلب</h3>
                        <AppBadge label={form.price_type === 'free' ? 'مجانية' : 'مدفوعة'} variant="secondary" size="sm" />
                      </div>
                      <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="font-bold text-slate-500">اسم البرنامج</dt>
                          <dd className="mt-1 font-bold text-deepBlue">{form.program_name || 'غير محدد'}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-slate-500">المتحدث</dt>
                          <dd className="mt-1 font-bold text-deepBlue">{form.speaker_name || 'غير محدد'}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-slate-500">الفئات</dt>
                          <dd className="mt-1 font-bold text-deepBlue">{selectedCategories.length} فئة مختارة</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-slate-500">التنفيذ</dt>
                          <dd className="mt-1 font-bold text-deepBlue">{selectedLocations.join('، ') || 'غير محدد'}</dd>
                        </div>
                      </dl>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-3 border-t border-amber-100 pt-6 sm:flex-row">
                {step > 1 && (
                  <AppButton type="button" variant="outline" onClick={goToPreviousStep} fullWidth>
                    <ArrowRight size={20} aria-hidden="true" />
                    السابق
                  </AppButton>
                )}

                {step < 4 ? (
                  <AppButton type="button" variant="primary" onClick={goToNextStep} fullWidth>
                    التالي
                    <ArrowLeft size={20} aria-hidden="true" />
                  </AppButton>
                ) : (
                  <AppButton type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting} fullWidth>
                    {!isSubmitting && <CheckCircle2 size={20} aria-hidden="true" />}
                    إرسال الطلب
                  </AppButton>
                )}
              </div>
            </form>
          </AppCard>
        </div>
      </section>
    </main>
  )
}
