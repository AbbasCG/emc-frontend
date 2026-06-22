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
import { siteContact } from '@/data/publicPages'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/motion'
import { loadingToast, successToast, errorToast } from '@/lib/toast'
import { ContactFaqSection } from '@/components/contact/ContactFaqSection'

const optionCards = [
  {
    icon: MessageCircle,
    title: 'تواصل عام',
    body: 'استفسارات عن البرامج، الخدمات، أو معلومات عامة عن EMC.',
    hint: 'استخدم النموذج أدناه واختر «استفسار عام».',
  },
  {
    icon: Mail,
    title: 'طلب برنامج أو ورشة',
    body: 'للمؤسسات والأفراد الذين يريدون اقتراح برنامج أو ورشة عمل منظمة.',
    hint: (
      <Link to="/submit-workshop" className="font-bold text-accent-700 hover:underline">
        انتقل إلى نموذج تقديم الورشة
      </Link>
    ),
  },
  {
    icon: Handshake,
    title: 'شراكة',
    body: 'للجامعات، الشركات، المدربين، والمبادرات المجتمعية.',
    hint: (
      <Link to="/partnerships" className="font-bold text-customBlue hover:underline">
        صفحة الشراكات
      </Link>
    ),
  },
  {
    icon: HeartHandshake,
    title: 'تطوع',
    body: 'للانضمام كمساهم في إحدى الإدارات أو الأنشطة.',
    hint: (
      <Link to="/volunteer" className="font-bold text-customBlue hover:underline">
        صفحة التطوع
      </Link>
    ),
  },
  {
    icon: Wrench,
    title: 'دعم فني',
    body: 'مشاكل في الدخول، الروابط، أو تجربة المنصة.',
    hint: `بريد الدعم: ${siteContact.supportEmail}`,
  },
]

export default function Contact() {
  const [isSubmitted, setIsSubmitted] = useState(false)
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
      setSubmitError('يرجى تعبئة الاسم والبريد والرسالة.')
      return
    }

    const tid = loadingToast('جاري إرسال رسالتك...')
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
      successToast('تم إرسال رسالتك بنجاح. سيتواصل الفريق معك قريباً.', tid)
    } catch {
      setSubmitError('تعذر إرسال الرسالة. تحقق من الاتصال بالخادم أو حاول لاحقاً.')
      errorToast('تعذر إرسال الرسالة. حاول مرة أخرى.', tid)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="bg-paper pt-20">
      <PublicPageHero
        eyebrow="نحن هنا لمساعدتك"
        title="تواصل معنا"
        subtitle="اختر مسار التواصل المناسب: عام، برنامج، شراكة، تطوع، أو دعم فني — ثم أرسل رسالتك."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'تواصل معنا' },
        ]}
        secondaryAction={{ label: 'الأسئلة الشائعة', href: '#faq' }}
      />

      <section id="trainer" className="scroll-mt-28 border-b border-line bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 rounded-2xl bg-paper2 p-6 text-right ring-1 ring-line sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-customBlue ring-1 ring-brand-100">
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="font-display text-lg font-black tracking-tight text-deepBlue">كن مدرباً مع EMC</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-foreground/70">
                إذا كنت تمتلك خبرة تدريبية وتتوافق مع معايير الجودة لدينا، أرسل لنا عبر النموذج
                أدناه مع اختيار الموضوع المناسب، وسيتم التواصل معك.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="خيارات التواصل"
            description="توصية سريعة: إن كان طلبك يتعلق بتقديم ورشة رسمية، فالنموذج المخصص يضمن جمع الحقول الكاملة."
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
                  className="rounded-3xl bg-white p-7 text-right shadow-emc ring-1 ring-line transition duration-250 ease-emc hover:shadow-emc-md"
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
            className="rounded-3xl bg-white p-7 text-right shadow-emc-lg ring-1 ring-line sm:p-10"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="emc-title-arc font-display text-2xl font-black tracking-tight text-deepBlue">نموذج التواصل العام</h2>
            <p className="mt-5 text-sm leading-7 text-muted-500">
              أرسل رسالتك مباشرة لفريق EMC. للطلبات الرسمية للورش استخدم صفحة التقديم المخصصة.
            </p>

            {submitError && (
              <div className="mt-7 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-right text-red-700 ring-1 ring-red-100">
                <AlertCircle size={22} className="mt-1 shrink-0" />
                <p className="font-bold leading-7">{submitError}</p>
              </div>
            )}

            {isSubmitted && (
              <div className="mt-7 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-right text-customBlue ring-1 ring-brand-100">
                <CheckCircle2 size={22} className="mt-1 shrink-0" />
                <p className="font-bold leading-7">
                  تم إرسال رسالتك بنجاح. سيتواصل الفريق معك عند الحاجة.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField label="الاسم الكامل" name="name" required />
                <FormField label="البريد الإلكتروني" name="email" type="email" required />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField label="رقم الجوال" name="phone" type="tel" />
                <label className="grid gap-2 text-sm font-black text-deepBlue">
                  نوع الطلب
                  <select
                    name="topic"
                    className="h-12 rounded-xl border border-line bg-paper2 px-4 py-2 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-brand-100"
                    defaultValue="general"
                  >
                    <option value="general">استفسار عام</option>
                    <option value="partnership">شراكة</option>
                    <option value="volunteer">تطوع</option>
                    <option value="tech">دعم فني</option>
                  </select>
                </label>
              </div>
              <FormField label="الموضوع" name="subject" />
              <label className="grid gap-2 text-sm font-black text-deepBlue">
                الرسالة
                <textarea
                  name="message"
                  required
                  rows={6}
                  className="resize-none rounded-xl border border-line bg-paper2 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-brand-100"
                />
              </label>
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={isSubmitting ? undefined : { scale: 1.02 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customOrange px-7 py-4 font-extrabold text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                <Send size={20} />
                {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
              </motion.button>
            </form>
          </motion.article>

          <div className="grid gap-6">
            <motion.article
              className="rounded-3xl bg-white p-7 text-right shadow-emc ring-1 ring-line sm:p-8"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="emc-title-arc font-display text-xl font-black tracking-tight text-deepBlue">بيانات التواصل</h2>
              <ul className="mt-7 grid gap-4 text-foreground/70">
                <li className="flex items-start gap-3">
                  <Phone size={18} className="mt-0.5 shrink-0 text-customBlue" />
                  <a href={`tel:${siteContact.phone.replace(/\s/g, '')}`} className="font-semibold hover:text-customBlue">
                    {siteContact.phone}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Mail size={18} className="mt-0.5 shrink-0 text-customBlue" />
                  <div>
                    <a href={`mailto:${siteContact.email}`} className="block font-semibold hover:text-customBlue">
                      {siteContact.email}
                    </a>
                    <span className="text-xs text-slate-400">عام · قانوني · شكاوى</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail size={18} className="mt-0.5 shrink-0 text-customOrange" />
                  <div>
                    <a href={`mailto:${siteContact.supportEmail}`} className="block font-semibold hover:text-accent-700">
                      {siteContact.supportEmail}
                    </a>
                    <span className="text-xs text-slate-400">دعم فني · تذاكر</span>
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
              className="emc-dawn rounded-3xl p-8 text-right text-white shadow-emc-lg"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: 0.06 }}
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-ice ring-1 ring-white/15">
                <Headphones size={24} />
              </div>
              <h2 className="font-display text-2xl font-black tracking-tight">طلب ورشة أو برنامج</h2>
              <p className="mt-4 leading-8 text-ice/90">
                لضمان استلام كامل التفاصيل (الفئة، الوقت، المكان، السعر…) استخدم نموذج التقديم
                المخصص — دون كسر تكامل الـ API.
              </p>
              <motion.div whileHover={{ scale: 1.03 }} className="mt-7">
                <Link
                  to="/submit-workshop"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-3 text-sm font-extrabold text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03]"
                >
                  الانتقال إلى نموذج الورشة
                </Link>
              </motion.div>
            </motion.article>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title="القنوات الاجتماعية" description="سيتم إضافة الروابط الرسمية هنا عند اعتمادها — يرجى الرجوع إلى البريد الرسمي حتى ذلك الحين." />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right shadow-emc ring-1 ring-line"
          >
            <p className="text-foreground/70 leading-8">
              لمزيد من الأمان، تفضّل التواصل عبر البريد المعتمد{' '}
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
            title="الموقع ونطاق الخدمة"
            description={siteContact.location.ar}
          />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="grid min-h-64 place-items-center rounded-3xl bg-white text-center shadow-emc-inset ring-1 ring-line"
          >
            <div className="px-6 py-10">
              <MapPin size={40} className="mx-auto text-customBlue" />
              <p className="mt-4 font-display text-lg font-black tracking-tight text-deepBlue">نطاق الخدمة</p>
              <p className="mt-2 max-w-lg text-sm font-semibold leading-7 text-muted-500">
                برامج أونلاين مع مجتمعات عربية وهولندية، وفعاليات حضورية عند الإعلان عنها في
                الصفحات الرسمية.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <ContactFaqSection />

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title="إرشادات سريعة" />
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-white p-8 text-right shadow-emc ring-1 ring-line"
          >
            <ul className="space-y-4 text-sm font-semibold leading-8 text-foreground/80">
              <li className="flex gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-customOrange" />
                إن لم تكن متأكداً من نوع الطلب، اختر «استفسار عام» ووضّح تفاصيلك وسنعيد التوجيه.
              </li>
              <li className="flex gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-customOrange" />
                للدعم الفني، اذكر المتصفح، الجهاز، ووقت حدوث المشكلة إن أمكن.
              </li>
              <li className="flex gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-customOrange" />
                لا تشارك كلمات مرور أو معلومات حساسة عبر نموذج عام.
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
        className="h-12 rounded-xl border border-line bg-paper2 px-4 py-3 text-right font-semibold text-deepBlue outline-none transition focus:border-customBlue focus:bg-white focus:ring-4 focus:ring-brand-100"
      />
    </label>
  )
}
