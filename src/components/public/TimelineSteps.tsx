import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/utils/motion'

export type TimelineStep = { title: string; description: string }

type TimelineStepsProps = {
  steps: TimelineStep[]
  title?: string
}

export default function TimelineSteps({ steps, title }: TimelineStepsProps) {
  return (
    <div className="mx-auto max-w-3xl text-right">
      {title && (
        <h3 className="mb-8 text-2xl font-black text-deepBlue">{title}</h3>
      )}
      <motion.ol
        className="relative border-r-2 border-customBlue/25 pr-8"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
      >
        {steps.map((step, i) => (
          <motion.li
            key={step.title}
            variants={staggerItem}
            className="relative pb-10 last:pb-0"
          >
            <span className="absolute -right-[11px] top-1.5 h-5 w-5 rounded-full border-4 border-white bg-customOrange ring-2 ring-customOrange/30" />
            <span className="mb-1 inline-block text-xs font-black text-customBlue">
              الخطوة {i + 1}
            </span>
            <p className="text-lg font-black text-deepBlue">{step.title}</p>
            <p className="mt-2 leading-8 text-slate-600">{step.description}</p>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  )
}
