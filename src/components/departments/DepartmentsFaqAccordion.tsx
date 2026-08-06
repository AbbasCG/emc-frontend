import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'

const faqs = [
  {
    q: 'لماذا تُقسَّم EMC إلى عشر إدارات؟',
    a: 'لضمان أن كل مجال — من البرامج إلى التقنية والجودة — له مسؤول واضح، مع تقليل الازدواجية وتحسين سرعة القرار.',
  },
  {
    q: 'كيف تتعاون الإدارات دون تعقيد على المشارك؟',
    a: 'عبر نقاط تسليم موحدة للمشارك: التسجيل، الدعم، والمتابعة تمر عبر قنوات محددة حتى وإن تعاونت عدة إدارات في الخلفية.',
  },
  {
    q: 'هل يمكن التواصل مع إدارة محددة مباشرة؟',
    a: 'للطلبات العامة يُفضّل التواصل عبر صفحة التواصل مع ذكر الموضوع؛ يتم توجيه الرسالة داخلياً للفريق المناسب.',
  },
  {
    q: 'كيف تُدار الجودة والحوكمة عملياً؟',
    a: 'من خلال سياسات موثقة، مراجعة دورية للمحتوى والتجربة، وقنوات ملاحظات تُغذي تحسيناً مستمراً.',
  },
]

export default function DepartmentsFaqAccordion() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="bg-emcBg px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          align="right"
          className="!mr-0 !text-right"
          eyebrow="أسئلة شائعة"
          title="حول الهيكل والتشغيل"
          description="إجابات موجزة بأسلوب مؤسسي — يمكن توسيع المحتوى لاحقاً من لوحة الإدارة عند الربط بـ API."
        />

        <div className="mt-10 space-y-3">
          {faqs.map((item, i) => {
            const isOpen = open === i
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-deepBlue/10 bg-white/90 shadow-sm backdrop-blur-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-right"
                >
                  <span className="text-sm font-black leading-relaxed text-deepBlue">{item.q}</span>
                  <ChevronDown
                    size={20}
                    className={['shrink-0 text-customBlue transition-transform', isOpen ? '-rotate-180' : ''].join(' ')}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-deepBlue/[0.06]"
                    >
                      <p className="px-5 pb-5 pt-3 text-sm leading-8 text-deepBlue/75">{item.a}</p>
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
