import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { fadeUp, staggerContainer, staggerItem } from '@/utils/animations'

export type ProcessStep = {
  title: string
  description: string
  icon?: LucideIcon
}

type ProcessStepsProps = {
  steps: ProcessStep[]
  title?: string
  subtitle?: string
}

export default function ProcessSteps({ steps, title, subtitle }: ProcessStepsProps) {
  return (
    <motion.div
      className="rounded-3xl border border-slate-100 bg-white p-8 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100/80 lg:p-10"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
    >
      {(title || subtitle) && (
        <div className="mb-8 text-right">
          {title && <h3 className="text-2xl font-black text-deepBlue">{title}</h3>}
          {subtitle && <p className="mt-2 text-sm font-medium leading-7 text-slate-600">{subtitle}</p>}
          <span className="mt-4 block h-1 w-16 rounded-full bg-customOrange" />
        </div>
      )}
      <motion.ol
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
      >
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.li
              key={step.title}
              variants={staggerItem}
              className="relative rounded-2xl bg-[#f4f7fb] p-5 text-right ring-1 ring-slate-100/80"
            >
              <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-deepBlue text-xs font-black text-white">
                {i + 1}
              </span>
              {Icon && (
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-customBlue shadow-sm">
                  <Icon size={20} />
                </div>
              )}
              <p className="pr-12 text-base font-black text-deepBlue">{step.title}</p>
              <p className="mt-2 text-sm font-medium leading-7 text-slate-600">{step.description}</p>
            </motion.li>
          )
        })}
      </motion.ol>
    </motion.div>
  )
}
