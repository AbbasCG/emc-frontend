import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { BookOpen, GraduationCap, Layers, Target } from 'lucide-react'

const steps = [
  {
    num: '01',
    icon: BookOpen,
    title: 'ورشة تنفيذية',
    desc: 'تبدأ بتجربة عملية مركّزة — يوم أو يومان تُطبّق فيهما مهارة محددة بإشراف مباشر.',
    accent: '#0077B6',
    tag: 'Workshop',
  },
  {
    num: '02',
    icon: Layers,
    title: 'دورة متخصصة',
    desc: 'تبني قاعدة متينة عبر دورة منظّمة — محتوى، تقييم، وتفاعل حقيقي مع مدرّبك.',
    accent: '#F28C00',
    tag: 'Course',
  },
  {
    num: '03',
    icon: Target,
    title: 'مسار متكامل',
    desc: 'تتعمّق في تخصّصك عبر مسار هيكلي يجمع أكثر من دورة ومشاريع تطبيقية موزونة.',
    accent: '#0077B6',
    tag: 'Track',
  },
  {
    num: '04',
    icon: GraduationCap,
    title: 'مخرج احترافي',
    desc: 'شهادة معتمدة، ملف أعمال قابل للعرض، وانتماء لمجتمع EMC من المتخصصين.',
    accent: '#F28C00',
    tag: 'Outcome',
  },
] as const

function JourneyStep({
  step,
  index,
  isLast,
}: {
  step: (typeof steps)[number]
  index: number
  isLast: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const Icon = step.icon

  return (
    <div ref={ref} className="relative flex flex-col items-center text-center">
      {/* Connector line (not on last item) — spans from this step toward the next (left in RTL) */}
      {!isLast && (
        <div
          aria-hidden
          className="absolute right-[calc(50%+2.5rem)] top-8 hidden h-[2px] w-[calc(100%-5rem)] lg:block"
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: step.accent }}
            initial={{ scaleX: 0, originX: 1 }}
            animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.8, delay: 0.3 + index * 0.15, ease: [0.22, 0.61, 0.36, 1] }}
          />
          {/* Arrowhead at the left end of the connector, pointing toward next step (left in RTL) */}
          <motion.div
            className="absolute -top-1 left-0 h-2 w-2 rotate-45 border-b-2 border-l-2"
            style={{ borderColor: step.accent }}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.3, delay: 1 + index * 0.15 }}
          />
        </div>
      )}

      {/* Icon bubble */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
        transition={{ duration: 0.55, delay: index * 0.12, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white shadow-emc-md"
        style={{ backgroundColor: step.accent }}
      >
        <Icon size={28} className="text-white" aria-hidden />
        <span
          aria-hidden
          className="font-latin absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-lg bg-white text-[10px] font-black shadow-emc-sm"
          style={{ color: step.accent }}
        >
          {step.num}
        </span>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.1 + index * 0.12 }}
      >
        <p
          className="font-latin mb-2 inline-block rounded-lg px-2.5 py-0.5 text-[10px] font-black tracking-widest uppercase"
          style={{ backgroundColor: `${step.accent}18`, color: step.accent }}
        >
          {step.tag}
        </p>
        <h3 className="text-base font-black text-deepBlue sm:text-lg">{step.title}</h3>
        <p className="mx-auto mt-2 max-w-[200px] text-xs font-semibold leading-6 text-foreground/60">
          {step.desc}
        </p>
      </motion.div>
    </div>
  )
}

export default function HomeLearningJourney() {
  return (
    <section
      dir="rtl"
      className="relative overflow-hidden border-y border-deepBlue/[0.06] bg-[#f7f9fb] px-4 py-12 sm:px-6 lg:px-10 lg:py-16"
    >
      {/* Decorative background shape */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-15%] top-[-20%] h-[28rem] w-[28rem] rounded-full bg-customBlue/[0.05] blur-[100px]"
      />

      <div className="relative mx-auto max-w-[1540px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-10 text-right"
        >
          <p className="text-xs font-black tracking-widest text-customBlue uppercase">مسيرة التعلّم</p>
          <h2 className="mt-3 font-display text-3xl font-black leading-tight text-deepBlue sm:text-4xl xl:text-[2.75rem]">
            من الورشة الأولى<br className="hidden sm:block" /> إلى المخرج الاحترافي
          </h2>
          <p className="mt-4 max-w-xl text-base font-semibold leading-8 text-foreground/60">
            مسيرة مصمّمة بعناية — كل خطوة تبني على السابقة وتقرّبك من هدفك الحقيقي.
          </p>
        </motion.div>

        {/* Steps — horizontal on desktop, vertical on mobile */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-4">
          {steps.map((step, i) => (
            <JourneyStep key={step.num} step={step} index={i} isLast={i === steps.length - 1} />
          ))}
        </div>

        {/* Mobile connector (vertical) */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[calc(50%-1px)] top-[170px] hidden w-[2px] bg-gradient-to-b from-customBlue via-customBlue/60 to-customBlue opacity-20 lg:hidden"
          style={{ height: 'calc(100% - 230px)' }}
        />
      </div>
    </section>
  )
}
