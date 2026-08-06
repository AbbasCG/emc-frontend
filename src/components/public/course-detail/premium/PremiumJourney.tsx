import { motion } from 'framer-motion'
import { Award, BookOpen, CalendarDays, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Course } from '@/types'
import type { CourseDetailDerived } from '@/utils/courseDetailDerived'
import { hasProgramCertificate } from '@/utils/programCertificateAvailability'
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
  const certAvailable = hasProgramCertificate(course)

  const steps: Step[] = [
    {
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
      phase: 'إتمام البرنامج',
      icon: ClipboardCheck,
      desc: derived.completionHint
        ? (derived.completionHint.split('\n')[0] ?? derived.completionHint)
        : 'أتمّ جميع متطلبات البرنامج بنجاح',
      isOrange: false,
    },
    ...(certAvailable
      ? [{
          phase: 'الشهادة',
          icon: Award,
          desc: derived.certificateLine ?? 'استلم شهادة إتمامك المعتمدة',
          isOrange: true,
        }]
      : []),
  ].map((step, index) => ({ ...step, number: index + 1 }))

  return (
    <section aria-label="رحلة التعلم" dir="rtl">
      <h2 className="mb-3 flex items-center gap-2.5 text-sm font-black text-[#22334A]">
        <span className="h-4 w-1 rounded-full bg-[#2691C2]" aria-hidden />
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
                className="pointer-events-none absolute top-6 left-0 block h-px w-full translate-x-[calc(-50%+1.5rem)] bg-gradient-to-l from-transparent via-[#2691C2]/22 to-transparent"
              />
            )}

            {/* Numbered icon circle */}
            <div
              className={cn(
                'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2',
                step.isOrange
                  ? 'border-[#EC943C]/25 bg-gradient-to-br from-[#EC943C]/12 to-[#EC943C]/5 text-[#EC943C] shadow-[0_4px_16px_-4px_rgba(236,148,60,0.22)]'
                  : 'border-[#2691C2]/25 bg-gradient-to-br from-[#2691C2]/12 to-[#2691C2]/5 text-[#2691C2] shadow-[0_4px_16px_-4px_rgba(38,145,194,0.22)]',
              )}
            >
              <step.icon className="h-5 w-5" />
              <span
                className={cn(
                  'absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white',
                  step.isOrange ? 'bg-[#EC943C]' : 'bg-[#2691C2]',
                )}
              >
                {step.number}
              </span>
            </div>

            <p className="mt-3 text-[12.5px] font-black text-[#22334A]">{step.phase}</p>
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
                ? 'border-[#EC943C]/14 bg-gradient-to-l from-[#EC943C]/6 to-white'
                : 'border-[#2691C2]/14 bg-gradient-to-l from-[#2691C2]/6 to-white',
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black',
                step.isOrange
                  ? 'border-[#EC943C]/30 bg-white text-[#EC943C]'
                  : 'border-[#2691C2]/30 bg-white text-[#2691C2]',
              )}
            >
              {step.number}
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-[#22334A]">{step.phase}</p>
              <p className="mt-0.5 text-[11px] leading-[1.55] text-slate-500">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
