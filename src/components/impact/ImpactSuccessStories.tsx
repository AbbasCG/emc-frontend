import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

const stories = [
  {
    name: 'لمى خ. • مشاركة',
    track: 'مسار مهارات مهنية · EMC',
    story:
      'سجّلت في ورشة التوجيه المهني وخرجت بخطة تقديم واضحة؛ حصلت على مقابلة خلال أسابيع بعد ضبط السيرة والقصة الشخصية.',
    outcome: 'انتقال من حيرة التقديم إلى مواعيد مقابلة فعلية.',
    quote:
      'أخيراً فهمت كيف أعرض خبرتي دون مبالغة — الأسلوب احترافي وعربي بالكامل.',
  },
  {
    name: 'عبدالرحمن م. • مشارك',
    track: 'معهد اللغات · مستوى متوسط',
    story:
      'كان التركيز على المحادثة الموجّهة وليس الحفظ فقط؛ تقدّمت في الثقة خلال دورة واحدة مع متابعة أسبوعية.',
    outcome: 'ثقة أعلى في التواصل اليومي والإجراءات الرسمية.',
    quote: 'الوقت في الصف واضح، والتغذية الراجعة مباشرة.',
  },
  {
    name: 'نورة س. • مشاركة',
    track: 'تمكين رقمي · أساسيات',
    story:
      'تعلّمت أدوات العمل اليومية دون إرهاق تقني؛ المخرج ورقة عمل تطبيقية يمكن تحديثها لاحقاً.',
    outcome: 'تنظيم مهام شخصية وفهم أفضل للأدوات الأساسية.',
    quote:
      'أحببت أن الأمثلة قريبة من واقعي؛ لم أضع في قائمة انتظار دعم فني لأسابيع.',
  },
]

export default function ImpactSuccessStories() {
  return (
    <section className="border-t border-deepBlue/[0.06] bg-gradient-to-b from-white to-emcBg/75 px-4 py-20 sm:px-6 lg:px-10" dir="rtl">
      <div className="mx-auto max-w-[1540px]">
        <SectionHeader
          align="right"
          eyebrow="قصص من الميدان"
          title="نجاحات نمثلها باحترام الخصوصية"
          description="أسماء نموذجية أو مختصرة؛ المحتوى يعكس تجارب نمطية نرى صداها ضمن تقييمات البرامج ولا يمس بيانات فردية حقيقية."
        />

        <motion.div
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {stories.map((s) => (
            <motion.article
              key={s.name}
              variants={staggerItem}
              whileHover={{ y: -6, transition: { type: 'spring', stiffness: 380, damping: 28 } }}
              className="flex h-full flex-col rounded-[1.65rem] border border-deepBlue/[0.07] bg-white/[0.92] p-8 text-right shadow-emc-lg shadow-deepBlue/[0.07] ring-1 ring-white backdrop-blur-md"
            >
              <Quote className="text-customOrange/90" size={28} strokeWidth={1.75} aria-hidden />
              <blockquote className="mt-5 flex-1 border-s-2 border-customBlue/35 ps-4">
                <p className="text-[15px] font-semibold leading-[1.85] text-foreground/82">«{s.quote}»</p>
              </blockquote>
              <div className="mt-8 space-y-2 border-t border-deepBlue/[0.06] pt-6">
                <p className="text-sm font-black text-deepBlue">{s.name}</p>
                <p className="text-[11px] font-black text-customBlue">{s.track}</p>
                <p className="mt-3 text-[13px] font-medium leading-relaxed text-foreground/74">{s.story}</p>
                <p className="mt-3 rounded-2xl border border-customOrange/25 bg-accent-50/60 px-3 py-2 text-[12px] font-bold leading-relaxed text-deepBlue ring-1 ring-customOrange/10">
                  النتيجة: {s.outcome}
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
