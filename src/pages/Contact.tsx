import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock3,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { fadeUp } from '../utils/course'

const contactCards = [
  {
    icon: Phone,
    title: 'الهاتف',
    value: '+966 55 000 0000',
  },
  {
    icon: Mail,
    title: 'البريد الإلكتروني',
    value: 'info@emc-academy.com',
  },
  {
    icon: MapPin,
    title: 'الموقع',
    value: 'الرياض، المملكة العربية السعودية',
  },
  {
    icon: Clock3,
    title: 'ساعات العمل',
    value: 'الأحد - الخميس، 9 صباحاً - 6 مساءً',
  },
]

export default function Contact() {
  const [isSubmitted, setIsSubmitted] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitted(true)
  }

  return (
    <main className="bg-slate-50 pt-20">
      <PageHeader
        title="تواصل معنا"
        subtitle="يسعدنا تواصلك معنا لأي استفسار أو طلب"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'تواصل معنا' },
        ]}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {contactCards.map((card, index) => {
            const Icon = card.icon
            return (
              <motion.article
                key={card.title}
                className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-customBlue">
                  <Icon size={24} />
                </div>
                <h2 className="text-xl font-black text-deepBlue">{card.title}</h2>
                <p className="mt-3 leading-8 text-slate-600">{card.value}</p>
              </motion.article>
            )
          })}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.85fr]">
          <motion.article
            className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-8"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h2 className="text-3xl font-black text-deepBlue">أرسل رسالتك</h2>
              <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
            </div>

            {isSubmitted && (
              <div className="mt-6 flex items-start gap-3 rounded-xl bg-sky-50 p-4 text-right text-customBlue ring-1 ring-sky-100">
                <CheckCircle2 size={22} className="mt-1 shrink-0" />
                <p className="font-bold leading-7">
                  تم إرسال رسالتك بنجاح، سنقوم بالتواصل معك قريباً.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="الاسم الكامل" name="name" />
                <FormField label="البريد الإلكتروني" name="email" type="email" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="رقم الجوال" name="phone" type="tel" />
                <FormField label="الموضوع" name="subject" />
              </div>
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                الرسالة
                <textarea
                  name="message"
                  rows={6}
                  className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white shadow-lg shadow-orange-100 sm:w-auto"
              >
                <Send size={20} />
                إرسال الرسالة
              </motion.button>
            </form>
          </motion.article>

          <div className="grid gap-8">
            <motion.article
              className="rounded-2xl bg-white p-6 text-right shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-8"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <h2 className="text-3xl font-black text-deepBlue">موقع EMC</h2>
                <span className="mt-4 block h-1 w-20 rounded-full bg-customOrange" />
              </div>
              <div className="mt-7 grid min-h-72 place-items-center rounded-2xl bg-slate-100 text-center ring-1 ring-slate-200">
                <div>
                  <MapPin size={42} className="mx-auto text-customBlue" />
                  <p className="mt-4 text-lg font-black text-deepBlue">موقع EMC</p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    سيتم عرض الخريطة هنا قريباً
                  </p>
                </div>
              </div>
            </motion.article>

            <motion.article
              className="rounded-2xl bg-gradient-to-l from-deepBlue via-[#1c4567] to-[#162334] p-7 text-right text-white shadow-2xl"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: 0.08 }}
            >
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-white">
                <Headphones size={25} />
              </div>
              <h2 className="text-3xl font-black">تحتاج مساعدة؟</h2>
              <p className="mt-4 leading-8 text-slate-200">
                تواصل معنا وسنساعدك في اختيار الدورة المناسبة.
              </p>
              <motion.a
                whileHover={{ scale: 1.03 }}
                href="mailto:info@emc-academy.com"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-customBlue px-6 py-3 font-extrabold text-white"
              >
                <MessageCircle size={20} />
                تحدث معنا
              </motion.a>
            </motion.article>
          </div>
        </div>
      </section>
    </main>
  )
}

function FormField({
  label,
  name,
  type = 'text',
}: {
  label: string
  name: string
  type?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-deepBlue">
      {label}
      <input
        name={name}
        type={type}
        className="h-13 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-sky-100"
      />
    </label>
  )
}
