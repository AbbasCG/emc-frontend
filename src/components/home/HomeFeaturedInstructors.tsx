import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'
import SectionHeader from '@/components/sections/SectionHeader'
import { fetchInstructors, type InstructorPublic } from '@/api/instructorsApi'
import { fadeUp, staggerContainer, staggerItem, viewportOnce } from '@/utils/animations'

export default function HomeFeaturedInstructors() {
  const [rows, setRows] = useState<InstructorPublic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchInstructors()
      .then((list) => {
        if (!alive) return
        setRows(list.slice(0, 4))
      })
      .catch(() => {
        if (!alive) return
        setRows([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (!loading && rows.length === 0) return null

  return (
    <section className="border-y border-deepBlue/[0.06] bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          align="right"
          className="!mr-0 !max-w-3xl !text-right"
          eyebrow="المدربون"
          title="خبراء يقودون تجربة التعلم"
          description="فريق مدربين مختار لربط المحتوى بالتطبيق العملي وبناء مسارات واضحة للمتعلم."
        />

        {loading ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-3xl bg-emcBg ring-1 ring-deepBlue/[0.06]" />
            ))}
          </div>
        ) : (
          <motion.div
            className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {rows.map((ins) => (
              <motion.div key={ins.id} variants={staggerItem}>
                <Link
                  to={`/instructors/${ins.slug}`}
                  className="group block h-full rounded-[1.35rem] border border-deepBlue/[0.08] bg-emcBg/80 p-6 text-right backdrop-blur-sm transition hover:-translate-y-1 hover:border-customBlue/25"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-deepBlue/[0.06] ring-1 ring-deepBlue/[0.06]">
                      {ins.image_url ? (
                        <img src={ins.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-black text-customBlue">
                          {ins.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-700">
                        مدرب معتمد
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-base font-black text-deepBlue group-hover:text-customBlue">
                        {ins.name}
                      </h3>
                      {ins.title && (
                        <p className="mt-1 line-clamp-2 text-xs font-semibold text-deepBlue/55">{ins.title}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-deepBlue/[0.06] pt-4 text-xs font-black text-customBlue">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles size={14} className="text-customOrange" />
                      الملف الكامل
                    </span>
                    <ArrowLeft size={16} className="text-deepBlue/35 transition group-hover:-translate-x-0.5 group-hover:text-customOrange" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-10 flex justify-end"
        >
          <Link
            to="/instructors"
            className="inline-flex items-center gap-2 rounded-xl border border-deepBlue/12 bg-white px-5 py-2.5 text-sm font-black text-deepBlue transition hover:border-customBlue/35"
          >
            جميع المدربين
            <ArrowLeft size={18} />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
