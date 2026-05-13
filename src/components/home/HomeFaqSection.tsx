import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'

const faqs = [
  {
    q: 'هل EMC منصة دورات فقط؟',
    a: 'لا. EMC هي منظومة تشغيل تعليمية تجمع بين الموقع العام، إدارة البرامج، التسجيل، والمسارات التعليمية — مع أساس قوي لتوسيع نظام إدارة التعلم لاحقاً.',
  },
  {
    q: 'كيف يتم التسجيل في الدورة المدفوعة؟',
    a: 'تختار الدورة ثم تكمل البيانات وتختار مزود الدفع. في بيئة التطوير يمكنك تجربة الدفع الوهمي من صفحة محاكاة آمنة قبل ربط Stripe أو PayPal في الإنتاج.',
  },
  {
    q: 'هل يمكن للمؤسسات طلب ورشة مخصصة؟',
    a: 'نعم — استخدم نموذج «تقديم ورشة» لإرسال التفاصيل، وسيتواصل الفريق بعد المراجعة الداخلية.',
  },
  {
    q: 'ما الدورات المتاحة حالياً؟',
    a: 'يتم عرض الكتالوج مباشرة من لوحة الإدارة عبر واجهة البرمجة. إذا لم يكن الخادم متصلاً، تعرض الواجهة بيانات احتياطية واضحة للمستخدم.',
  },
  {
    q: 'كيف أنشئ حساباً كطالب؟',
    a: 'من صفحة «سجّل الآن» (إنشاء حساب) أدخل بياناتك ثم انتقل إلى لوحة الطالب لمتابعة التسجيلات والجلسات.',
  },
]

export default function HomeFaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="bg-emcBg px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          align="right"
          className="!mr-0 !text-right"
          eyebrow="أسئلة شائعة"
          title="كل ما تحتاج معرفته قبل البدء"
          description="إجابات موجزة حول التسجيل، الورش، وطبيعة منظومة EMC الرقمية."
        />

        <div className="mt-10 space-y-3">
          {faqs.map((item, i) => {
            const isOpen = open === i
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-deepBlue/[0.08] bg-white shadow-[0_16px_40px_-28px_rgba(15,42,67,0.2)] ring-1 ring-white/80"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-right transition hover:bg-emcBg/80"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-customBlue/[0.08] text-customBlue ring-1 ring-customBlue/15">
                    <HelpCircle size={20} />
                  </span>
                  <span className="flex-1 text-sm font-black leading-relaxed text-deepBlue">{item.q}</span>
                  <ChevronDown
                    size={20}
                    className={['shrink-0 text-deepBlue/40 transition-transform', isOpen ? '-rotate-180' : ''].join(
                      ' ',
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28 }}
                      className="border-t border-deepBlue/[0.06]"
                    >
                      <p className="px-5 pb-5 pt-3 text-right text-sm font-medium leading-8 text-deepBlue/72">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
