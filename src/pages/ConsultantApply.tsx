import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { BadgeCheck, Briefcase, CalendarClock, Compass, FileUp, MessageSquareQuote, Send, X } from 'lucide-react'
import axios from 'axios'
import PageHeader from '@/components/PageHeader'
import PublicSeo from '@/components/public/PublicSeo'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { submitConsultantApplication } from '@/api/consultantApi'
import { ADVISABLE_DEPARTMENTS, MULTI_DEPARTMENT_OPTION } from '@/data/departmentsGuide'

/**
 * «قدّم كمستشار» — طلب انضمام إلى إدارة المستشارين في EMC.
 * الصفحة تشرح الدور أولًا (اجتماع أسبوعي واحد يستعرض فيه الفريق كل شيء
 * والمستشار يقول رأيه)، تعرِّف بكل الإدارات، ثم نموذج واحد قصير مع رفع
 * السيرة الذاتية واختيار الإدارة المرغوبة.
 */

const SPECIALTIES = [
  'الذكاء الاصطناعي والبيانات',
  'التعليم والمناهج',
  'ريادة الأعمال والإدارة',
  'الإعلام والتسويق',
  'المالية والحوكمة',
  'التقنية والمنصات',
  'الموارد البشرية والتطوير',
  'الشراكات والعلاقات',
  'أخرى',
]

const DEPARTMENT_CHOICES = [...ADVISABLE_DEPARTMENTS, MULTI_DEPARTMENT_OPTION]

const MAX_CV_MB = 5

const inputClass =
  'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-deepBlue outline-none transition-colors placeholder:text-ink-300 focus:border-customBlue focus:ring-2 focus:ring-customBlue/20'

/** كيف يعمل المستشار — النموذج التشغيلي المعتمد. */
const ROLE_MODEL = [
  {
    icon: CalendarClock,
    title: 'اجتماع واحد في الأسبوع',
    text: 'جلسة دورية واحدة مع فريق الإدارة التي تستشيرها لا أكثر، في وقتٍ يناسبك.',
  },
  {
    icon: MessageSquareQuote,
    title: 'الفريق يستعرض، وأنت توجّه',
    text: 'يعرض الفريق ما أنجزه وما يخطط له وما يواجهه، وتقول رأيك وتوجيهك بخبرتك.',
  },
  {
    icon: Briefcase,
    title: 'رأي بلا عبء تنفيذي',
    text: 'لا مهام تشغيلية عليك: دورك النصح والمراجعة وفتح الآفاق، والتنفيذ على الفريق.',
  },
]

export default function ConsultantApply() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    specialty: SPECIALTIES[0],
    desired_department: '',
    years_experience: '',
    linkedin_url: '',
    motivation: '',
    availability: '',
    agree_terms: false,
  })
  const [cvFile, setCvFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function pickCv(file: File | null) {
    if (file && file.size > MAX_CV_MB * 1024 * 1024) {
      setError(`حجم السيرة الذاتية يتجاوز ${MAX_CV_MB}MB — صغّر الملف ثم أعد المحاولة.`)
      return
    }
    setError(null)
    setCvFile(file)
  }

  /** اختيار إدارة من بطاقات الدليل يعبّئ حقل النموذج وينزل إليه. */
  function chooseDepartment(name: string) {
    set('desired_department', name)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.agree_terms) {
      setError('يلزم الموافقة على معالجة البيانات لغرض دراسة الطلب.')
      return
    }
    setSubmitting(true)
    try {
      await submitConsultantApplication({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        country: form.country.trim() || undefined,
        city: form.city.trim() || undefined,
        specialty: form.specialty,
        desired_department: form.desired_department || undefined,
        years_experience: form.years_experience ? Number(form.years_experience) : undefined,
        linkedin_url: form.linkedin_url.trim() || undefined,
        motivation: form.motivation.trim(),
        availability: form.availability.trim() || undefined,
        cv_file: cvFile,
        agree_terms: true,
      })
      setSubmitted(true)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const errors = (err.response.data as { errors?: Record<string, string[]> }).errors
        setError(Object.values(errors ?? {})[0]?.[0] ?? 'تحقق من الحقول المطلوبة ثم أعد الإرسال.')
      } else {
        setError('تعذر إرسال الطلب الآن. حاول مرة أخرى بعد قليل.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-paper pt-20" dir="rtl">
      <PublicSeo
        title="قدّم كمستشار"
        description="انضم إلى إدارة المستشارين في EMC: اجتماع أسبوعي واحد تستعرض فيه الإدارة عملها وتقول رأيك بخبرتك."
        path="/consultants"
      />
      <PageHeader
        title="قدّم كمستشار"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'قدّم كمستشار' },
        ]}
      />

      {/* ── 1. ما هو المستشار؟ ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pt-14 sm:px-6">
        <div className="max-w-3xl">
          <h2 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue sm:text-3xl">
            ما هو مستشار EMC؟
          </h2>
          <p className="mt-5 text-sm leading-8 text-ink-500 sm:text-base">
            المستشار صاحب خبرة يرافق إحدى إدارات المركز برأيه لا بوقته: الفكرة كلها
            <span className="font-black text-deepBlue"> اجتماع واحد في الأسبوع</span>،
            يستعرض فيه فريق الإدارة كل شيء أمامه — ما أنجزوه، ما يخططون له، وما يقف
            في طريقهم — ويقول لهم رأيه وتوجيهه. خبرتك تختصر عليهم شهور تجربة.
          </p>
        </div>
        <div className="mt-9 grid gap-6 sm:grid-cols-3">
          {ROLE_MODEL.map(({ icon: Icon, title, text }) => (
            <div key={title} className="border-t-2 border-customBlue/70 pt-4">
              <Icon size={20} className="text-customBlue" aria-hidden />
              <h3 className="mt-3 font-display text-base font-black text-deepBlue">{title}</h3>
              <p className="mt-2 text-[13px] leading-7 text-ink-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="emc-hairline mx-auto mt-14 max-w-5xl" aria-hidden />

      {/* ── 2. تعرّف على الإدارات ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
        <h2 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue">
          تعرّف على الإدارات
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-400">
          هذه إدارات المنظومة التي يمكنك أن تكون مستشاراً لإحداها — اقرأ عمل كل واحدة
          ثم اختر من البطاقة مباشرة، أو من قائمة النموذج بالأسفل.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENT_CHOICES.map(({ name, nameEn, desc, icon: Icon }) => {
            const selected = form.desired_department === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => chooseDepartment(name)}
                aria-pressed={selected}
                className={`group rounded-2xl border p-5 text-start transition-colors duration-200 ${
                  selected
                    ? 'border-customBlue bg-sky/40'
                    : 'border-line bg-white hover:border-customBlue/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon size={19} className={selected ? 'text-customBlue' : 'text-ink-400 transition-colors group-hover:text-customBlue'} aria-hidden />
                  {selected && <BadgeCheck size={17} className="text-customBlue" aria-hidden />}
                </div>
                <h3 className="mt-3 font-display text-[15px] font-black leading-snug text-deepBlue">{name}</h3>
                <p className="font-latin mt-0.5 text-[10px] font-bold text-ink-300">{nameEn}</p>
                <p className="mt-2 text-xs leading-6 text-ink-400">{desc}</p>
                <span className={`emc-cta-line mt-3 inline-flex text-[11px] ${selected ? 'after:scale-x-100' : ''}`}>
                  {selected ? 'اخترتها' : 'كن مستشارها'}
                  <ArrowLeftIcon size={12} />
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="emc-hairline mx-auto mt-14 max-w-5xl" aria-hidden />

      {/* ── 3. النموذج ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue">
              خبرتك تصنع أثراً
            </h2>
            <p className="mt-5 text-sm leading-7 text-ink-400">
              ساعات قليلة من وقتك تنعكس على آلاف المتعلمين. أرسل طلبك وسيتواصل
              معك فريق EMC بعد المراجعة.
            </p>
            <ul className="mt-8 space-y-5">
              {[
                { icon: Compass, text: 'توجيه استراتيجي للإدارة التي تختارها' },
                { icon: CalendarClock, text: 'اجتماع أسبوعي واحد فقط، بوقت مرن' },
                { icon: BadgeCheck, text: 'عضوية موثقة في إدارة المستشارين وشهادة مساهمة' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <Icon size={18} className="mt-0.5 shrink-0 text-customBlue" aria-hidden />
                  <span className="text-sm font-semibold leading-6 text-ink-600">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-line bg-white p-10 text-center"
            >
              <BadgeCheck size={40} className="mx-auto text-success" aria-hidden />
              <h3 className="mt-5 font-display text-xl font-black text-deepBlue">تم استلام طلبك</h3>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-ink-400">
                سيراجع فريق EMC طلبك ويتواصل معك عبر بريدك الإلكتروني بعد المراجعة.
              </p>
              <Link to="/" className="emc-cta-line mt-7 inline-flex text-sm">
                العودة إلى الرئيسية
                <ArrowLeftIcon size={14} />
              </Link>
            </motion.div>
          ) : (
            <form
              ref={formRef}
              onSubmit={(e) => void handleSubmit(e)}
              className="grid scroll-mt-28 gap-4 rounded-2xl border border-line bg-white p-6 sm:p-8"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-black text-ink-500">
                  الاسم الكامل *
                  <input required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputClass} />
                </label>
                <label className="grid gap-1.5 text-xs font-black text-ink-500">
                  البريد الإلكتروني *
                  <input required type="email" dir="ltr" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
                </label>
                <label className="grid gap-1.5 text-xs font-black text-ink-500">
                  رقم الجوال (واتساب)
                  <input dir="ltr" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
                </label>
                <label className="grid gap-1.5 text-xs font-black text-ink-500">
                  الدولة
                  <input value={form.country} onChange={(e) => set('country', e.target.value)} className={inputClass} />
                </label>
                <label className="grid gap-1.5 text-xs font-black text-ink-500">
                  مجال الاستشارة *
                  <select value={form.specialty} onChange={(e) => set('specialty', e.target.value)} className={inputClass}>
                    {SPECIALTIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-black text-ink-500">
                  سنوات الخبرة
                  <input type="number" min={0} max={60} dir="ltr" value={form.years_experience} onChange={(e) => set('years_experience', e.target.value)} className={inputClass} />
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-black text-ink-500">
                الإدارة التي تحب أن تكون مستشاراً لها
                <select
                  value={form.desired_department}
                  onChange={(e) => set('desired_department', e.target.value)}
                  className={inputClass}
                >
                  <option value="">اختر من الإدارات أعلاه…</option>
                  {DEPARTMENT_CHOICES.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </label>

              {/* السيرة الذاتية */}
              <div className="grid gap-1.5 text-xs font-black text-ink-500">
                السيرة الذاتية (PDF أو Word، حتى {MAX_CV_MB}MB)
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="sr-only"
                  onChange={(e) => pickCv(e.target.files?.[0] ?? null)}
                />
                {cvFile ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-customBlue/40 bg-sky/30 px-4 py-3">
                    <span className="min-w-0 truncate text-sm font-bold text-deepBlue" dir="ltr">
                      {cvFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        pickCv(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      aria-label="إزالة الملف"
                      className="shrink-0 rounded-lg p-1 text-ink-400 transition hover:text-danger"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-4 text-sm font-bold text-ink-400 transition hover:border-customBlue hover:text-customBlue"
                  >
                    <FileUp size={16} aria-hidden />
                    ارفع سيرتك الذاتية
                  </button>
                )}
              </div>

              <label className="grid gap-1.5 text-xs font-black text-ink-500">
                رابط LinkedIn أو ملف أعمال
                <input dir="ltr" placeholder="https://" value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-xs font-black text-ink-500">
                لماذا تريد الانضمام كمستشار؟ *
                <textarea required minLength={20} rows={4} value={form.motivation} onChange={(e) => set('motivation', e.target.value)} className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-xs font-black text-ink-500">
                الوقت المتاح أسبوعياً
                <input placeholder="مثال: ساعة أسبوعياً للاجتماع الدوري" value={form.availability} onChange={(e) => set('availability', e.target.value)} className={inputClass} />
              </label>
              <label className="flex items-start gap-2.5 text-xs font-semibold leading-6 text-ink-500">
                <input
                  type="checkbox"
                  checked={form.agree_terms}
                  onChange={(e) => set('agree_terms', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-line text-customBlue focus:ring-customBlue"
                />
                أوافق على معالجة بياناتي لغرض دراسة طلب الانضمام وفق
                {' '}
                <Link to="/privacy" className="text-customBlue underline">سياسة الخصوصية</Link>.
              </label>

              {error && (
                <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-xs font-bold text-danger">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="emc-focus-ring mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-customOrange px-7 text-sm font-extrabold text-white transition hover:bg-ember disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={15} aria-hidden />
                {submitting ? 'جارٍ الإرسال…' : 'أرسل طلب الانضمام'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
