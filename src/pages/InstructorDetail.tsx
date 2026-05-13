import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { fetchInstructor, type InstructorPublic } from '@/api/instructorsApi'
import { PublicPageHero } from '@/components/public'

export default function InstructorDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [ins, setIns] = useState<InstructorPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!slug) return
    let alive = true
    fetchInstructor(slug)
      .then((row) => {
        if (!alive) return
        setIns(row)
      })
      .catch(() => {
        if (!alive) return
        setErr('تعذر تحميل بيانات المدرب.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [slug])

  if (loading) {
    return (
      <main className="min-h-[50vh] bg-emcBg px-4 pb-20 pt-28">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-40 rounded-3xl bg-white ring-1 ring-deepBlue/[0.06]" />
          <div className="h-32 rounded-3xl bg-white ring-1 ring-deepBlue/[0.06]" />
        </div>
      </main>
    )
  }

  if (err || !ins) {
    return (
      <main className="bg-emcBg px-4 pb-20 pt-28 text-right">
        <p className="mx-auto max-w-xl rounded-xl bg-orange-50 px-4 py-3 font-bold text-customOrange ring-1 ring-orange-100">
          {err || 'المدرب غير موجود.'}
        </p>
        <Link to="/instructors" className="mt-6 inline-flex font-black text-customBlue">
          العودة للقائمة
        </Link>
      </main>
    )
  }

  const courses = ins.courses ?? []

  return (
    <main className="bg-emcBg pt-20">
      <PublicPageHero
        eyebrow="ملف المدرب"
        title={ins.name}
        subtitle={ins.title ?? 'مدرب ضمن منظومة EMC'}
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'المدربون', href: '/instructors' },
          { label: ins.name },
        ]}
      />

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[1.35rem] border border-deepBlue/[0.08] bg-white p-4 shadow-xl ring-1 ring-white/90"
          >
            <div className="aspect-square overflow-hidden rounded-2xl bg-deepBlue/[0.05] ring-1 ring-deepBlue/[0.06]">
              {ins.image_url ? (
                <img src={ins.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-black text-customBlue">
                  {ins.name.charAt(0)}
                </div>
              )}
            </div>
            {ins.expertise && (
              <p className="mt-4 text-center text-xs font-black text-customOrange">{ins.expertise}</p>
            )}
          </motion.div>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="rounded-[1.35rem] border border-deepBlue/[0.08] bg-white p-8 text-right shadow-xl ring-1 ring-white/90"
          >
            <h2 className="text-xl font-black text-deepBlue">نبذة</h2>
            <span className="mt-3 block h-1 w-14 rounded-full bg-customOrange" />
            <p className="mt-6 whitespace-pre-line text-base font-medium leading-9 text-deepBlue/75">
              {ins.bio ?? 'لم تُضاف نبذة تفصيلية بعد.'}
            </p>

            <h3 className="mt-10 flex items-center gap-2 text-lg font-black text-deepBlue">
              <BookOpen size={20} className="text-customBlue" />
              دورات مرتبطة
            </h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {courses.length === 0 && (
                <li className="text-sm font-semibold text-deepBlue/50">لا توجد دورات منشورة حالياً لهذا المدرب.</li>
              )}
              {courses.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/courses/${c.slug}`}
                    className="flex items-center justify-between rounded-xl border border-deepBlue/[0.08] bg-emcBg px-4 py-3 text-sm font-black text-deepBlue transition hover:border-customBlue/35"
                  >
                    <span className="line-clamp-2">{c.title}</span>
                    <ArrowLeft size={16} className="shrink-0 text-customOrange" />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.article>
        </div>
      </section>
    </main>
  )
}
