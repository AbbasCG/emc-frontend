import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'

type ThankYouState = {
  courseName?: string
  registeredAt?: string
  orderNumber?: string
}

export default function ThankYou() {
  const { t, i18n } = useTranslation()
  const { state } = useLocation()
  const navigate = useNavigate()

  // Redirect direct visitors who have no registration state
  useEffect(() => {
    if (!state) {
      navigate('/courses', { replace: true })
    }
  }, [state, navigate])

  const details = (state ?? {}) as ThankYouState
  // M3 i18n: format the date in the active language (ar stays the default).
  const currentDate = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const orderDetails = [
    { label: t('auth.thankYou.details.courseName'), value: details.courseName || t('auth.thankYou.fallback.courseName') },
    { label: t('auth.thankYou.details.registeredAt'), value: details.registeredAt || currentDate },
    { label: t('auth.thankYou.details.orderNumber'), value: details.orderNumber || t('auth.thankYou.fallback.orderNumber') },
  ]

  return (
    <main className="bg-paper pt-20">
      <PageHeader
        title={t('auth.thankYou.title')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('auth.thankYou.breadcrumbRegistration') },
          { label: t('auth.thankYou.breadcrumbCurrent') },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-[480px] rounded-3xl bg-white p-7 text-center shadow-emc-lg ring-1 ring-line sm:p-10"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <motion.div
            className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.2, type: 'spring', stiffness: 180 }}
          >
            <CheckCircle size={54} />
          </motion.div>

          <span className="emc-eyebrow-accent mt-6">{t('auth.thankYou.eyebrow')}</span>
          <h1 className="emc-title-arc mt-3 inline-block font-display text-3xl font-black leading-tight tracking-tight text-deepBlue">
            {t('auth.thankYou.heading')}
          </h1>
          <p className="mt-4 leading-8 text-slate-600">
            {t('auth.thankYou.body')}
          </p>

          <div className="mt-8 rounded-2xl bg-paper2 p-5 text-right ring-1 ring-line">
            <h2 className="font-display text-xl font-black tracking-tight text-deepBlue">{t('auth.thankYou.detailsTitle')}</h2>
            <span className="mt-3 block h-1 w-16 rounded-full bg-customOrange" />
            <div className="mt-5 grid gap-4">
              {orderDetails.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-b-0 last:pb-0">
                  <span className="text-sm font-black text-slate-500">{item.label}</span>
                  <strong className="text-sm font-black text-deepBlue">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.04 }} className="mt-8">
            <Link
              to="/"
              className="emc-focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customOrange px-7 py-4 font-extrabold text-white shadow-emc-md transition duration-250 ease-emc hover:brightness-[1.03]"
            >
              {t('auth.thankYou.backHome')}
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}
