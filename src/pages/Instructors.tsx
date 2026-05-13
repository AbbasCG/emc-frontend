import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { fetchInstructors, type InstructorPublic } from '@/api/instructorsApi'
import { PublicPageHero } from '@/components/public'
import SectionHeader from '@/components/sections/SectionHeader'
import { staggerContainer, staggerItem } from '@/utils/motion'

export default function Instructors() {
  const [rows, setRows] = useState<InstructorPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    fetchInstructors()
      .then((list) => {
        if (!alive) return
        setRows(list)
      })
      .catch(() => {
        if (!alive) return
        setErr('تعذر تحميل قائمة المدربين.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <main className="bg-emcBg pt-20">
      <PublicPageHero
        eyebrow="الكادر التدريبي"
        title="مدربون يصنعون أثراً حقيقياً"
        subtitle="تعرّف على خبراء EMC الذين يقودون الجلسات والمسارات بجودة مؤسسية وتجربة تعلم حديثة."
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'المدربون' },
        ]}
      />

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            align="right"
            className="!mr-0 !max-w-2xl !text-right"
            title="الكتالوج"
            description="اختر المدرب لقراءة السيرة والدورات المرتبطة به."
          />

          {err && (
            <p className="mt-6 rounded-xl bg-orange-50 px-4 py-3 text-right text-sm font-bold text-customOrange ring-1 ring-orange-100">
              {err}
            </p>
          )}

          {loading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-3xl bg-white ring-1 ring-deepBlue/[0.06]" />
              ))}
            </div>
          ) : (
            <motion.div
              className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.08 }}
            >
              {rows.map((ins) => (
                <motion.article
                  key={ins.id}
                  variants={staggerItem}
                  className="group relative overflow-hidden rounded-[1.35rem] border border-deepBlue/[0.08] bg-white p-6 text-right shadow-[0_24px_56px_-28px_rgba(15,42,67,0.28)] ring-1 ring-white/90"
                >
                  <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-customBlue/[0.07] blur-3xl transition group-hover:bg-customOrange/[0.09]" />
                  <div className="relative flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-deepBlue/[0.05] ring-1 ring-deepBlue/[0.06]">
                      {ins.image_url ? (
                        <img src={ins.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-black text-customBlue">
                          {ins.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-black text-deepBlue">{ins.name}</h2>
                      {ins.title && <p className="mt-1 text-xs font-bold text-customBlue">{ins.title}</p>}
                      <p className="mt-3 line-clamp-3 text-sm font-medium leading-7 text-deepBlue/65">
                        {ins.bio ?? 'مدرب معتمد ضمن منظومة EMC للبرامج والمسارات.'}
                      </p>
                    </div>
                  </div>
                  <div className="relative mt-6 flex items-center justify-between border-t border-deepBlue/[0.06] pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-deepBlue/45">
                      <GraduationCap size={16} className="text-customOrange" />
                      {ins.courses_count ?? 0} دورة
                    </span>
                    <Link
                      to={`/instructors/${ins.slug}`}
                      className="inline-flex items-center gap-2 text-xs font-black text-customBlue transition hover:text-customOrange"
                    >
                      الملف
                      <ArrowLeft size={16} />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </main>
  )
}
