import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'

type ThankYouState = {
  courseName?: string
  registeredAt?: string
  orderNumber?: string
}

export default function ThankYou() {
  const { state } = useLocation()
  const details = (state ?? {}) as ThankYouState
  const currentDate = new Intl.DateTimeFormat('ar', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const orderDetails = [
    { label: 'اسم الدورة', value: details.courseName || 'برنامج تدريبي' },
    { label: 'تاريخ التسجيل', value: details.registeredAt || currentDate },
    { label: 'رقم الطلب', value: details.orderNumber || 'EMC-4567' },
  ]

  return (
    <main className="bg-white pt-20">
      <PageHeader
        title="صفحة الشكر"
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'التسجيل' },
          { label: 'شكراً لك' },
        ]}
      />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-[480px] rounded-2xl bg-white p-7 text-center shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-9"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <motion.div
            className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-emerald-50 text-emerald-500"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.2, type: 'spring', stiffness: 180 }}
          >
            <CheckCircle size={54} />
          </motion.div>

          <h1 className="mt-7 text-3xl font-black leading-tight text-deepBlue">
            تم استلام تسجيلك بنجاح!
          </h1>
          <p className="mt-4 leading-8 text-slate-600">
            شكراً لك، تم استلام طلبك بنجاح. سيتم مراجعة بياناتك والتواصل معك خلال
            24-48 ساعة.
          </p>

          <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-right ring-1 ring-slate-100">
            <h2 className="text-xl font-black text-deepBlue">تفاصيل طلبك</h2>
            <span className="mt-3 block h-1 w-16 rounded-full bg-customOrange" />
            <div className="mt-5 grid gap-4">
              {orderDetails.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                  <span className="text-sm font-black text-slate-500">{item.label}</span>
                  <strong className="text-sm font-black text-deepBlue">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.04 }} className="mt-8">
            <Link
              to="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-customOrange px-7 py-4 font-extrabold text-white shadow-lg shadow-orange-100"
            >
              العودة للرئيسية
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}
