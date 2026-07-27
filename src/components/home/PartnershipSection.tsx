import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Handshake, Lightbulb } from 'lucide-react'
import { fadeUp } from '../../utils/course'

export default function PartnershipSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 'some', margin: '0px 0px -96px 0px' }}
          transition={{ duration: 0.55 }}
          className="overflow-hidden rounded-3xl bg-deepBlue px-8 py-14 text-right text-white shadow-2xl md:px-14"
        >
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-sky-200 ring-1 ring-white/15">
                <Handshake size={15} aria-hidden="true" />
                الشراكات والمجتمع
              </span>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
                نبني المستقبل معاً
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-9 text-slate-300">
                EMC تؤمن بأن تطوير التعليم والعمل يحتاج إلى تعاون فعّال مع المدربين،
                المؤسسات، المبادرات، والجهات التعليمية.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-4 sm:flex-row lg:flex-col">
              <motion.div whileHover={{ scale: 1.04 }}>
                <Link
                  to="/contact"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customOrange px-6 py-4 font-extrabold text-white shadow-xl shadow-orange-900/30 transition hover:bg-[#d9822f]"
                >
                  <Handshake size={20} aria-hidden="true" />
                  كن شريكاً معنا
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }}>
                <Link
                  to="/submit-workshop"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-4 font-extrabold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  <Lightbulb size={20} aria-hidden="true" />
                  اقترح ورشة أو برنامجاً
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
