import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import { submitContactMessage } from '@/api/contactApi'
import { useTranslation } from 'react-i18next'
import { siteContact, t as contentT } from '@/data/publicPages'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'

export default function Contact() {
  const { t } = useTranslation()
  const [isSubmitted, setIsSubmitted] = useState(false)

  const optionCards = [
    {
      icon: MessageCircle,
      title: t('contact.general'),
      body: t('contact.cardGeneralBody'),
      hint: t('contact.cardGeneralHint'),
    },
    {
      icon: Mail,
      title: t('contact.workshop'),
      body: t('contact.cardWorkshopBody'),
      hint: (
        <Link to="/submit-workshop" className="font-bold text-customOrange hover:underline">
          {t('contact.ctaWorkshop')}
        </Link>
      ),
    },
    {
      icon: Handshake,
      title: t('contact.partnership'),
      body: t('contact.cardPartnershipBody'),
      hint: (
        <Link to="/partnerships" className="font-bold text-customBlue hover:underline">
          {t('contact.partnership')}
        </Link>
      ),
    },
    {
      icon: HeartHandshake,
      title: t('contact.volunteering'),
      body: t('contact.cardVolunteerBody'),
      hint: (
        <Link to="/volunteer" className="font-bold text-customBlue hover:underline">
          {t('contact.volunteering')}
        </Link>
      ),
    },
    {
      icon: Wrench,
      title: t('contact.technicalSupport'),
      body: t('contact.cardSupportBody'),
      hint: `بريد مقترح: ${siteContact.email}`,
    },
  ]
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    setIsSubmitted(false)

    const form = event.currentTarget
    const fd = new FormData(form)
    const name = String(fd.get('name') ?? '').trim()
    const email = String(fd.get('email') ?? '').trim()
    const phone = String(fd.get('phone') ?? '').trim()
    const subject = String(fd.get('subject') ?? '').trim()
    const message = String(fd.get('message') ?? '').trim()
    const topic = String(fd.get('topic') ?? 'general')

    if (!name || !email || !message) {
      setSubmitError(t('contact.validationError'))
      return
    }

    try {
      setIsSubmitting(true)
      await submitContactMessage({
        name,
        email,
        phone: phone || undefined,
        subject: subject || undefined,
        category: topic,
        message,
      })
      setIsSubmitted(true)
      form.reset()
    } catch {
      setSubmitError(t('contact.sendError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="bg-[#f4f7fb] pt-20">
      <PublicPageHero
        eyebrow={t('contact.heroTitle')}
        title={t('contact.title')}
        subtitle={t('contact.heroSubtitle')}
        breadcrumbs={[
          { label: t('contact.breadcrumbHome'), href: '/' },
          { label: t('contact.title') },
        ]}
      />

      <section id="trainer" className="scroll-mt-28 border-b border-slate-200/80 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 rounded-2xl bg-[#f4f7fb] p-6 text-right ring-1 ring-slate-200/60 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-customBlue">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-deepBlue">{t('contact.becomeTrainer')}</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                {t('contact.becomeTrainerDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title={t('contact.optionsSectionTitle')}
            description={t('contact.optionsSectionDesc')}
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
                  key={card.title}
                  variants={staggerItem}
                  className="rounded-3xl bg-white p-6 text-right shadow-lg ring-1 ring-slate-100"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-customBlue">
                    <Icon size={22} />
                  </div>
                  <h2 className="text-lg font-black text-deepBlue">{card.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{card.body}</p>
                  <div className="mt-4 text-sm text-slate-500">{card.hint}</div>
                </motion.article>
              )
            })}
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr]">
          <motion.article
            className="rounded-3xl bg-white p-6 text-right shadow-xl ring-1 ring-slate-100 sm:p-8"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-black text-deepBlue">{t('contact.general')}</h2>
            <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
            <p className="mt-4 text-sm leading-7 text-slate-500">
              {t('contact.formSectionText')}
            </p>

            {submitError && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-right text-red-700 ring-1 ring-red-100">
                <AlertCircle size={22} className="mt-1 shrink-0" />
                <p className="font-bold leading-7">{submitError}</p>
              </div>
            )}

            {isSubmitted && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-sky-50 p-4 text-right text-customBlue ring-1 ring-sky-100">
                <CheckCircle2 size={22} className="mt-1 shrink-0" />
                <p className="font-bold leading-7">
                  {t('contact.successMessage')}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label={t('contact.fullName')} name="name" required />
                <FormField label={t('contact.email')} name="email" type="email" required />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label={t('contact.phone')} name="phone" type="tel" />
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  {t('contact.requestType')}
                  <select
                    name="topic"
                    className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                    defaultValue="general"
                  >
                    <option value="general">{t('contact.optionGeneral')}</option>
                    <option value="partnership">{t('contact.optionPartnership')}</option>
                    <option value="volunteer">{t('contact.optionVolunteering')}</option>
                    <option value="tech">{t('contact.optionSupport')}</option>
                  </select>
                </label>
              </div>
              <FormField label={t('contact.subjectLabel')} name="subject" />
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                {t('contact.message')}
                <textarea
                  name="message"
                  required
                  rows={6}
                  className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={isSubmitting ? undefined : { scale: 1.02 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customOrange px-7 py-4 font-extrabold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                <Send size={20} />
                {isSubmitting ? t('contact.sendingMessage') : t('contact.sendMessage')}
              </motion.button>
            </form>
          </motion.article>

          <div className="grid gap-6">
            <motion.article
              className="rounded-3xl bg-white p-6 text-right shadow-xl ring-1 ring-slate-100 sm:p-8"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-xl font-black text-deepBlue">{t('contact.contactInfo')}</h2>
              <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
              <ul className="mt-6 grid gap-4 text-slate-600">
                <li className="flex items-start gap-3">
                  <Phone size={18} className="mt-0.5 shrink-0 text-customBlue" />
                  <a href={`tel:${siteContact.phone.replace(/\s/g, '')}`} className="font-semibold hover:text-customBlue">
                    {siteContact.phone}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Mail size={18} className="mt-0.5 shrink-0 text-customBlue" />
                  <a href={`mailto:${siteContact.email}`} className="font-semibold hover:text-customBlue">
                    {siteContact.email}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-customBlue" />
                  <span className="leading-7">{contentT(siteContact.location)}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock3 size={18} className="mt-0.5 shrink-0 text-customBlue" />
                  <span className="leading-7">{contentT(siteContact.hours)}</span>
                </li>
              </ul>
            </motion.article>

            <motion.article
              className="rounded-3xl bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] p-7 text-right text-white shadow-2xl"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: 0.06 }}
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Headphones size={24} />
              </div>
              <h2 className="text-2xl font-black">{t('contact.ctaWorkshop')}</h2>
              <p className="mt-3 leading-8 text-slate-200">
                {t('contact.quickGuideDesc')}
              </p>
              <motion.div whileHover={{ scale: 1.03 }} className="mt-6">
                <Link
                  to="/submit-workshop"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-3 text-sm font-extrabold text-white"
                >
                  {t('contact.ctaWorkshop')}
                </Link>
              </motion.div>
            </motion.article>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title={t('contact.socialChannels')} description={t('contact.socialChannelsDesc')} />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right shadow-md ring-1 ring-slate-100"
          >
            <p className="text-slate-600 leading-8">
              {t('contact.socialChannelsText')}{' '}
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
            title={t('contact.locationSectionTitle')}
            description={contentT(siteContact.location)}
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="grid min-h-64 place-items-center rounded-3xl bg-white text-center shadow-inner ring-1 ring-slate-200"
          >
            <div className="px-6 py-10">
              <MapPin size={40} className="mx-auto text-customBlue" />
              <p className="mt-4 text-lg font-black text-deepBlue">{t('contact.locationCardTitle')}</p>
              <p className="mt-2 max-w-lg text-sm font-semibold leading-7 text-slate-500">
                {t('contact.locationCardDesc')}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title={t('contact.quickGuide')} />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right shadow-lg ring-1 ring-slate-100"
          >
            <ul className="space-y-4 text-sm font-semibold leading-8 text-slate-700">
              <li className="flex gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-customOrange" />
                {t('contact.guideItem1')}
              </li>
              <li className="flex gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-customOrange" />
                {t('contact.guideItem2')}
              </li>
              <li className="flex gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-customOrange" />
                {t('contact.guideItem3')}
              </li>
            </ul>
          </motion.div>
        </div>
      </section>
    </main>
  )
}

function FormField({
  label,
  name,
  type = 'text',
  required = false,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-deepBlue">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
      />
    </label>
  )
}
