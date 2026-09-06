import { useState } from 'react'
import { Link } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { siteContact } from '@/data/publicPages'
import { cn } from '@/lib/utils'

const FAQ_ITEMS = [
  {
    q: 'كيف أسجّل في دورة أو برنامج؟',
    a: 'تصفّح كتالوج البرامج من صفحة «الدورات»، اختر البرنامج المناسب، واتبع خطوات التسجيل. قد يُطلب منك إنشاء حساب أو اجتياز اختبار تحديد مستوى (Placement) حسب البرنامج.',
  },
  {
    q: 'ما الفرق بين info@edumc.nl و support@edumc.nl؟',
    a: `استخدم ${siteContact.email} للاستفسارات العامة، الخصوصية، الشكاوى، والشراكات. استخدم ${siteContact.supportEmail} للدعم الفني ومشاكل تسجيل الدخول والمنصة.`,
  },
  {
    q: 'كيف أقدّم طلب ورشة رسمي؟',
    a: 'استخدم نموذج «تقديم ورشة» المخصص لا يكفي نموذج التواصل العام لضمان جمع كل التفاصيل التشغيلية.',
  },
  {
    q: 'هل يمكنني استرداد رسوم التسجيل؟',
    a: (
      <>
        تعتمد سياسة الاسترداد على نوع البرنامج وموعد الإلغاء. راجع{' '}
        <Link to="/refund-policy" className="font-bold text-customBlue hover:underline">
          سياسة الإلغاء والاسترداد
        </Link>{' '}
        أو راسل {siteContact.email}.
      </>
    ),
  },
  {
    q: 'كيف أتحقق من شهادتي؟',
    a: 'استخدم صفحة التحقق من الشهادات عبر الرمز أو الرابط المرفق في الشهادة. إن واجهت مشكلة، أرسل الرمز إلى البريد العام.',
  },
  {
    q: 'كيف تتعامل EMC مع بياناتي الشخصية؟',
    a: (
      <>
        نلتزم بـ AVG/GDPR. اقرأ{' '}
        <Link to="/privacy" className="font-bold text-customBlue hover:underline">
          سياسة الخصوصية
        </Link>{' '}
        و{' '}
        <Link to="/cookies" className="font-bold text-customBlue hover:underline">
          سياسة ملفات تعريف الارتباط
        </Link>
        . يمكنك إدارة موافقة ملفات تعريف الارتباط من تذييل الموقع.
      </>
    ),
  },
  {
    q: 'لدي شكوى ما الإجراء؟',
    a: (
      <>
        راجع{' '}
        <Link to="/complaints" className="font-bold text-customBlue hover:underline">
          إجراءات الشكاوى
        </Link>{' '}
        وأرسل تفاصيلك إلى {siteContact.email}. للمشاكل التقنية العاجلة: {siteContact.supportEmail}.
      </>
    ),
  },
  {
    q: 'هل المنصة متاحة على الهاتف؟',
    a: (
      <>
        نعم التصميم متجاوب. لمزيد من التفاصيل حول إمكانية الوصول راجع{' '}
        <Link to="/accessibility" className="font-bold text-customBlue hover:underline">
          بيان إمكانية الوصول
        </Link>
        .
      </>
    ),
  },
] as const

export function ContactFaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-28 px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title="الأسئلة الشائعة"
          description="إجابات سريعة إن لم تجد ما تبحث عنه، استخدم نموذج التواصل أو البريد المناسب."
        />
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const open = openIndex === index
            return (
              <motion.div
                key={item.q}
                layout
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100"
              >
                <button
                  type="button"
                  id={`faq-btn-${index}`}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-right transition hover:bg-slate-50/80 sm:px-6 sm:py-5"
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-customOrange" aria-hidden />
                    <span className="text-[15px] font-black leading-relaxed text-deepBlue">{item.q}</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300',
                      open && 'rotate-180 text-customBlue',
                    )}
                    aria-hidden
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open ?
                    <motion.div
                      id={`faq-panel-${index}`}
                      role="region"
                      aria-labelledby={`faq-btn-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <div className="border-t border-slate-100 px-5 pb-5 pt-1 text-right sm:px-6 sm:pb-6">
                        <div className="text-sm font-medium leading-8 text-slate-600">{item.a}</div>
                      </div>
                    </motion.div>
                  : null}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
