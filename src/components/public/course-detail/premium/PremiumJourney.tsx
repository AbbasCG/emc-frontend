import { motion } from 'framer-motion'
import { Award, BookOpen, CalendarDays, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Course } from '@/types'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'
import { courseHasCertificate } from '@/utils/courseDetailPageData'
import { formatPublicDate } from '@/utils/publicDetailFormat'

type Step = {
  number: number
  phase: string
  icon: typeof CalendarDays
  desc: string
  isOrange: boolean
}

type Props = { course: Course; derived: CourseDetailDerived }

export default function PremiumJourney({ course, derived }: Props) {
  const startDate = formatPublicDate(course.start_date)

  const steps: Step[] = [
    {
      number: 1,
      phase: 'قبل الدورة',
      icon: CalendarDays,
      desc:
        derived.registration.open && !derived.seatsFull
          ? startDate
            ? `ابدأ التسجيل — يبدأ البرنامج ${startDate}`
            : 'ابدأ التسجيل واحجز مقعدك الآن'
          : startDate
            ? `يبدأ البرنامج ${startDate}`
            : 'احجز مقعدك في البرنامج القادم',
      isOrange: false,
    },
    {
      number: 2,
      phase: 'أثناء الدورة',
      icon: BookOpen,
      desc:
        [
          derived.sessionsLabel ? `احضر ${derived.sessionsLabel}` : '',
          derived.hoursLabel ? `إجمالي ${derived.hoursLabel}` : '',
          derived.deliveryAr ? `(${derived.deliveryAr})` : '',
        ]
          .filter(Boolean)
          .join(' ') || 'احضر الجلسات وأكمل المهام المطلوبة',
      isOrange: true,
    },
    {
      number: 3,
      phase: 'إتمام البرنامج',
      icon: ClipboardCheck,
      desc: derived.completionHint
        ? (derived.completionHint.split('\n')[0] ?? derived.completionHint)
        : 'أتمّ جميع متطلبات البرنامج بنجاح',
      isOrange: false,
    },
    {
      number: 4,
      phase: 'الشهادة',
      icon: Award,
      desc: derived.certificateLine ?? 'استلم شهادة إتمامك المعتمدة',
      isOrange: true,
    },
  ].filter((step) => step.phase !== 'الشهادة' || courseHasCertificate(course))

  return (
    <section aria-label="رحلة التعلم" dir="rtl">
      <h2 className="mb-3 flex items-center gap-2.5 text-sm font-black text-[#0C2A4B]">
        <span className="h-4 w-1 rounded-full bg-[#0077B6]" aria-hidden />
        رحلة التعلم
      </h2>

      {/* Desktop: horizontal 4-step */}
      <div className={cn('hidden sm:grid sm:gap-3', steps.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4')}>
        {steps.map((step, i) => (
          <motion.div
            key={step.phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.32 }}
            className="relative flex flex-col items-center text-center"
          >
            {/* Connector line between steps */}
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className="pointer-events-none absolute top-6 left-0 block h-px w-full translate-x-[calc(-50%+1.5rem)] bg-gradient-to-l from-transparent via-[#0077B6]/22 to-transparent"
              />
            )}

            {/* Numbered icon circle */}
            <div
              className={cn(
                'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2',
                step.isOrange
                  ? 'border-[#F28C00]/25 bg-gradient-to-br from-[#F28C00]/12 to-[#F28C00]/5 text-[#F28C00] shadow-[0_4px_16px_-4px_rgba(242, 140, 0,0.22)]'
                  : 'border-[#0077B6]/25 bg-gradient-to-br from-[#0077B6]/12 to-[#0077B6]/5 text-[#0077B6] shadow-[0_4px_16px_-4px_rgba(0, 119, 182,0.22)]',
              )}
            >
              <step.icon className="h-5 w-5" />
              <span
                className={cn(
                  'absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white',
                  step.isOrange ? 'bg-[#F28C00]' : 'bg-[#0077B6]',
                )}
              >
                {step.number}
              </span>
            </div>

            <p className="mt-3 text-[12.5px] font-black text-[#0C2A4B]">{step.phase}</p>
            <p className="mt-1 px-1 text-[10.5px] leading-[1.55] text-slate-500">{step.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Mobile: vertical compact list */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        {steps.map((step) => (
          <div
            key={step.phase}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3',
              step.isOrange
                ? 'border-[#F28C00]/14 bg-gradient-to-l from-[#F28C00]/6 to-white'
                : 'border-[#0077B6]/14 bg-gradient-to-l from-[#0077B6]/6 to-white',
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black',
                step.isOrange
                  ? 'border-[#F28C00]/30 bg-white text-[#F28C00]'
                  : 'border-[#0077B6]/30 bg-white text-[#0077B6]',
              )}
            >
              {step.number}
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-[#0C2A4B]">{step.phase}</p>
              <p className="mt-0.5 text-[11px] leading-[1.55] text-slate-500">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
