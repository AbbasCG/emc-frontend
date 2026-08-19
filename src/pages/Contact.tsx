import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Handshake,
  Headphones,
  HeartHandshake,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Wrench,
} from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { PublicPageHero } from '@/components/public'
import PublicSeo from '@/components/public/PublicSeo'
import { submitContactMessage } from '@/api/contactApi'
import type { ContactTicketData } from '@/api/contactApi'
import { siteContact } from '@/data/publicPages'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'
import { loadingToast, successToast, errorToast } from '@/lib/toast'
import { ContactFaqSection } from '@/components/contact/ContactFaqSection'

/** M3 i18n: copy lives in the catalogs under contact.options.cards.<key>. */
function buildOptionCards(t: TFunction) {
  return [
    {
      key: 'general',
      icon: MessageCircle,
      title: t('contact.options.cards.general.title'),
      body: t('contact.options.cards.general.body'),
      hint: t('contact.options.cards.general.hint'),
    },
    {
      key: 'program',
      icon: Mail,
      title: t('contact.options.cards.program.title'),
      body: t('contact.options.cards.program.body'),
      hint: (
        <Link to="/submit-workshop" className="font-bold text-accent-700 hover:underline">
          {t('contact.options.cards.program.hint')}
        </Link>
      ),
    },
    {
      key: 'partnership',
      icon: Handshake,
      title: t('contact.options.cards.partnership.title'),
      body: t('contact.options.cards.partnership.body'),
      hint: (
        <Link to="/partnerships" className="font-bold text-customBlue hover:underline">
          {t('contact.options.cards.partnership.hint')}
        </Link>
      ),
    },
    {
      key: 'volunteer',
      icon: HeartHandshake,
      title: t('contact.options.cards.volunteer.title'),
      body: t('contact.options.cards.volunteer.body'),
      hint: (
        <Link to="/volunteer" className="font-bold text-customBlue hover:underline">
          {t('contact.options.cards.volunteer.hint')}
        </Link>
      ),
    },
    {
      key: 'support',
      icon: Wrench,
      title: t('contact.options.cards.support.title'),
      body: t('contact.options.cards.support.body'),
      hint: t('contact.options.cards.support.hint', { email: siteContact.supportEmail }),
    },
  ]
}

const GENERAL_CONTACT_HASH = '#general-contact-form'
const CONTACT_SCROLL_OFFSET = 100

export default function Contact() {
  const { t } = useTranslation()
  const optionCards = useMemo(() => buildOptionCards(t), [t])
  const location = useLocation()
  const highlightTimeoutRef = useRef<number | null>(null)
  const [isFormHighlighted, setIsFormHighlighted] = useState(false)
  const [form, setFormData] = useState({
    name: '', email: '', phone: '', category: 'general', subject: '', message: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticketData, setTicketData] = useState<ContactTicketData | null>(null)

  useEffect(() => {
    if (location.hash !== GENERAL_CONTACT_HASH) return

    const scrollTimer = window.setTimeout(() => {
      const element = document.getElementById('general-contact-form')
      if (!element) return

      const y = element.getBoundingClientRect().top + window.scrollY - CONTACT_SCROLL_OFFSET
      window.scrollTo({ top: y, behavior: 'smooth' })

      setIsFormHighlighted(true)
      if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current)
      highlightTimeoutRef.current = window.setTimeout(() => setIsFormHighlighted(false), 1300)
    }, 100)

    return () => window.clearTimeout(scrollTimer)
  }, [location])

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current)
    }
  }, [])

  function setField(k: keyof typeof form, v: string) {
    setFormData(f => ({ ...f, [k]: v }))
    if (fieldErrors[k]) setFieldErrors(e => ({ ...e, [k]: '' }))
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    const nameOk = /^[؀-ۿa-zA-Z\s'-]+$/

    const n = form.name.trim()
    if (!n)                    errs.name = 'الاسم مطلوب.'
    else if (n.length < 2)    errs.name = 'يجب أن يكون الاسم حرفين على الأقل.'
    else if (n.length > 100)  errs.name = 'يجب ألا يتجاوز الاسم 100 حرف.'
    else if (!nameOk.test(n)) errs.name = 'يجب أن يحتوي الاسم على أحرف فقط.'

    const em = form.email.trim()
    if (!em)                                            errs.email = 'البريد الإلكتروني مطلوب.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) errs.email = 'يرجى إدخال بريد إلكتروني صحيح.'
    else if (em.length > 150)                          errs.email = 'البريد الإلكتروني طويل جداً.'

    const ph = form.phone.trim()
    if (ph) {
      if (/[a-zA-Z]/.test(ph))                        errs.phone = 'رقم الهاتف يجب أن يحتوي على أرقام فقط.'
      else if (ph.replace(/[\s+-]/g, '').length < 7) errs.phone = 'يرجى إدخال رقم هاتف صحيح.'
      else if (ph.length > 20)                         errs.phone = 'رقم الهاتف طويل جداً.'
    }

    const sub = form.subject.trim()
    if (!sub)                   errs.subject = 'الموضوع مطلوب.'
    else if (sub.length < 3)   errs.subject = 'يجب أن يكون الموضوع 3 أحرف على الأقل.'
    else if (sub.length > 150) errs.subject = 'يجب ألا يتجاوز الموضوع 150 حرفاً.'

    const msg = form.message.trim()
    if (!msg)                    errs.message = 'الرسالة مطلوبة.'
    else if (msg.length < 10)   errs.message = 'يجب ألا تقل الرسالة عن 10 أحرف.'
    else if (msg.length > 2000) errs.message = 'يجب ألا تتجاوز الرسالة 2000 حرف.'

    return errs
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError('')

    const errs = validate()
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    const tid = loadingToast('جاري إرسال رسالتك...')
    try {
      setIsSubmitting(true)
      const result = await submitContactMessage({
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        phone:    form.phone.trim() || undefined,
        category: form.category,
        subject:  form.subject.trim(),
        message:  form.message.trim(),
      })
      setTicketData(result)
      setIsSubmitted(true)
      setFormData({ name: '', email: '', phone: '', category: 'general', subject: '', message: '' })
      setFieldErrors({})
      successToast('تم إرسال رسالتك بنجاح. سيتواصل الفريق معك قريباً.', tid)
    } catch (err: unknown) {
      type AxErr = { response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } } }
      const e = err as AxErr
      if (e.response?.status === 422) {
        const be: Record<string, string> = {}
        for (const [k, v] of Object.entries(e.response.data?.errors ?? {})) {
          be[k] = Array.isArray(v) ? v[0] : String(v)
        }
        setFieldErrors(be)
        setServerError(e.response.data?.message ?? 'يرجى التحقق من البيانات المدخلة.')
        errorToast('يرجى التحقق من البيانات المدخلة.', tid)
      } else {
        setServerError('تعذر إرسال الرسالة. تحقق من الاتصال بالخادم أو حاول لاحقاً.')
        errorToast('تعذر إرسال الرسالة. حاول مرة أخرى.', tid)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="bg-paper pt-20">
      <PublicSeo
        title="تواصل معنا"
        description="تواصل مع فريق EMC: نموذج رسائل عام مع رقم تذكرة للمتابعة، بيانات الهاتف والبريد وساعات العمل، وقنوات مخصصة للشراكات والتطوع والدعم الفني."
        path="/contact"
      />
      <PublicPageHero
        eyebrow={t('contact.hero.eyebrow')}
        title={t('contact.hero.title')}
        subtitle={t('contact.hero.subtitle')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('contact.hero.breadcrumbCurrent') },
        ]}
        secondaryAction={{ label: t('contact.hero.faqCta'), href: '#faq' }}
      />

      <section id="trainer" className="scroll-mt-28 border-b border-line bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 rounded-2xl bg-paper2 p-6 text-right ring-1 ring-line sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-customBlue ring-1 ring-brand-100">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="font-display text-lg font-black tracking-tight text-deepBlue">{t('contact.trainer.title')}</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-foreground/70">
                {t('contact.trainer.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title={t('contact.options.title')}
            description={t('contact.options.description')}
          />
          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {optionCards.map((card) => {
              const Icon = card.icon
              return (
                <motion.article
                  key={card.key}
                  variants={staggerItem}
                  className="rounded-3xl bg-white p-7 text-right ring-1 ring-line transition duration-250 ease-emc hover:ring-customBlue/25"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-customBlue ring-1 ring-brand-100">
                    <Icon size={22} />
                  </div>
                  <h2 className="font-display text-lg font-black tracking-tight text-deepBlue">{card.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-foreground/70">{card.body}</p>
                  <div className="mt-4 text-sm text-muted-500">{card.hint}</div>
                </motion.article>
              )
            })}
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr]">
          <motion.article
            id="general-contact-form"
            className={`rounded-3xl bg-white p-6 text-right ring-1 sm:p-8 transition-[ring-color] duration-300 ${
              isFormHighlighted
                ? 'ring-2 ring-customBlue/55'
                : 'ring-line'
            }`}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue">{t('contact.form.title')}</h2>
            <p className="mt-5 text-sm leading-7 text-muted-500">
              {t('contact.form.intro')}
            </p>

            {serverError && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-right text-red-700 ring-1 ring-red-100">
                <AlertCircle size={22} className="mt-1 shrink-0" />
                <p className="font-bold leading-7">{serverError}</p>
              </div>
            )}

            {isSubmitted && (
              <div className="mt-6 rounded-2xl bg-sky-50 p-4 text-right text-customBlue ring-1 ring-sky-100">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={22} className="mt-1 shrink-0" />
                  <p className="font-bold leading-7">
                    {t('contact.form.successMessage')}
                  </p>
                </div>
                {ticketData?.ticket_number && (
                  <div className="mt-3 rounded-xl bg-white/70 px-4 py-2.5 text-center">
                    <p className="text-xs font-semibold text-slate-500">{t('contact.form.ticketLabel')}</p>
                    <p className="mt-0.5 font-extrabold text-deepBlue">{ticketData.ticket_number}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{t('contact.form.ticketKeep')}</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-7 grid gap-5">
              {/* honeypot — invisible to real users, bots auto-fill it */}
              <input name="_honey" type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label={t('contact.form.fields.name')} name="name" value={form.name} onChange={v => setField('name', v)} error={fieldErrors.name} maxLength={100} required />
                <FormField label={t('contact.form.fields.email')} name="email" type="email" value={form.email} onChange={v => setField('email', v)} error={fieldErrors.email} maxLength={150} required />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-black text-deepBlue">
                  {t('contact.form.fields.phone')}
                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="+31 6 12345678"
                    value={form.phone}
                    onChange={e => setField('phone', e.target.value.replace(/[a-zA-Z]/g, ''))}
                    maxLength={20}
                    className={`h-12 rounded-xl border bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 ${fieldErrors.phone ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-customBlue focus:ring-sky-100'}`}
                  />
                  {fieldErrors.phone && <FieldError msg={fieldErrors.phone} />}
                </label>
                <label className="grid gap-1.5 text-sm font-black text-deepBlue">
                  {t('contact.form.fields.category')}
                  <select
                    name="category"
                    value={form.category}
                    onChange={e => setField('category', e.target.value)}
                    className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                  >
                    <option value="general">{t('contact.form.categories.general')}</option>
                    <option value="partnership">{t('contact.form.categories.partnership')}</option>
                    <option value="volunteer">{t('contact.form.categories.volunteer')}</option>
                    <option value="tech">{t('contact.form.categories.tech')}</option>
                  </select>
                </label>
              </div>
              <FormField label={t('contact.form.fields.subject')} name="subject" value={form.subject} onChange={v => setField('subject', v)} error={fieldErrors.subject} maxLength={150} required />
              <TextareaField label={t('contact.form.fields.message')} name="message" value={form.message} onChange={v => setField('message', v)} error={fieldErrors.message} maxLength={2000} rows={6} required />
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={isSubmitting ? undefined : { scale: 1.02 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customOrange px-7 py-4 font-extrabold text-white transition duration-250 ease-emc hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                <Send size={20} />
                {isSubmitting ? t('contact.form.submitting') : t('contact.form.submit')}
              </motion.button>
            </form>
          </motion.article>

          <div className="grid gap-6">
            <motion.article
              className="rounded-3xl bg-white p-7 text-right ring-1 ring-line sm:p-8"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="emc-title-arc font-display text-xl font-black tracking-tight text-deepBlue">{t('contact.info.title')}</h2>
              <ul className="mt-7 grid gap-4 text-foreground/70">
                <li className="flex items-start gap-3">
                  <Phone size={18} className="mt-0.5 shrink-0 text-customBlue" />
                  <a href={siteContact.telLink} className="font-semibold dir-ltr text-right hover:text-customBlue">
                    {siteContact.phone}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Mail size={18} className="mt-0.5 shrink-0 text-customBlue" />
                  <div>
                    <a href={`mailto:${siteContact.email}`} className="block font-semibold hover:text-customBlue">
                      {siteContact.email}
                    </a>
                    <span className="text-xs text-slate-400">{t('contact.info.emailNote')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail size={18} className="mt-0.5 shrink-0 text-customOrange" />
                  <div>
                    <a href={`mailto:${siteContact.supportEmail}`} className="block font-semibold hover:text-accent-700">
                      {siteContact.supportEmail}
                    </a>
                    <span className="text-xs text-slate-400">{t('contact.info.supportNote')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-customBlue" />
                  <span className="leading-7">{siteContact.location.ar}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock3 size={18} className="mt-0.5 shrink-0 text-customBlue" />
                  <span className="leading-7">{siteContact.hours.ar}</span>
                </li>
              </ul>
            </motion.article>

            <motion.article
              className="emc-dawn rounded-3xl p-8 text-right text-white"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: 0.06 }}
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-ice ring-1 ring-white/15">
                <Headphones size={24} />
              </div>
              <h2 className="font-display text-2xl font-black tracking-tight">{t('contact.workshopCard.title')}</h2>
              <p className="mt-4 leading-8 text-ice/90">
                {t('contact.workshopCard.body')}
              </p>
              <motion.div whileHover={{ scale: 1.03 }} className="mt-7">
                <Link
                  to="/submit-workshop"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-3 text-sm font-extrabold text-white transition duration-250 ease-emc hover:brightness-[1.03]"
                >
                  {t('contact.workshopCard.cta')}
                </Link>
              </motion.div>
            </motion.article>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title={t('contact.social.title')} description={t('contact.social.description')} />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right ring-1 ring-line"
          >
            <p className="text-foreground/70 leading-8">
              {t('contact.social.notePrefix')}{' '}
              <a href={`mailto:${siteContact.email}`} className="font-bold text-customBlue hover:underline">
                {siteContact.email}
              </a>
              .
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title={t('contact.location.title')}
            description={siteContact.location.ar}
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="grid min-h-64 place-items-center rounded-3xl bg-white text-center ring-1 ring-line"
          >
            <div className="px-6 py-10">
              <MapPin size={40} className="mx-auto text-customBlue" />
              <p className="mt-4 font-display text-lg font-black tracking-tight text-deepBlue">{t('contact.location.serviceTitle')}</p>
              <p className="mt-2 max-w-lg text-sm font-semibold leading-7 text-muted-500">
                {t('contact.location.serviceBody')}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <ContactFaqSection />

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title={t('contact.guidelines.title')} />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right ring-1 ring-line"
          >
            <ul className="space-y-4 text-sm font-semibold leading-8 text-foreground/80">
              {(['unsure', 'techDetails', 'noSensitive'] as const).map((key) => (
                <li key={key} className="flex gap-3">
                  <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-customOrange" />
                  {t(`contact.guidelines.items.${key}`)}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>
    </main>
  )
}

function FieldError({ msg }: { msg: string }) {
  return (
    <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-red-600">
      <AlertCircle size={11} className="shrink-0" />
      {msg}
    </span>
  )
}

const INPUT_CLS = (err?: string) =>
  `h-12 rounded-xl border bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 ${err ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-customBlue focus:ring-sky-100'}`

function FormField({
  label, name, type = 'text', value, onChange, error, maxLength, required = false,
}: {
  label: string
  name: string
  type?: string
  value: string
  onChange: (v: string) => void
  error?: string
  maxLength?: number
  required?: boolean
}) {
  return (
    <label className="grid gap-1.5 text-sm font-black text-deepBlue">
      <span>
        {label}
        {required && <span className="mr-0.5 text-red-500" aria-hidden="true">*</span>}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={maxLength}
        className={INPUT_CLS(error)}
      />
      {error && <FieldError msg={error} />}
    </label>
  )
}

function TextareaField({
  label, name, value, onChange, error, maxLength = 2000, rows = 6, required = false,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  error?: string
  maxLength?: number
  rows?: number
  required?: boolean
}) {
  const count = value.length
  const near  = count > maxLength * 0.85
  const over  = count > maxLength
  return (
    <label className="grid gap-1.5 text-sm font-black text-deepBlue">
      <span className="flex items-center justify-between">
        <span>
          {label}
          {required && <span className="mr-0.5 text-red-500" aria-hidden="true">*</span>}
        </span>
        <span className={`text-[11px] font-semibold tabular-nums ${over ? 'text-red-500' : near ? 'text-amber-500' : 'text-slate-400'}`}>
          {count} / {maxLength}
        </span>
      </span>
      <textarea
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={maxLength}
        rows={rows}
        className={`resize-none rounded-xl border bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:bg-white focus:ring-4 ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-customBlue focus:ring-sky-100'}`}
      />
      {error && <FieldError msg={error} />}
    </label>
  )
}
