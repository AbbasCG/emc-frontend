import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  GraduationCap,
  Mail,
  Phone,
  Route,
  Sparkles,
  UserCircle,
} from 'lucide-react'
import { fetchInstructor, type InstructorPublic } from '@/api/instructorsApi'
import { PublicPageHero } from '@/components/public'

/* ── Helpers ───────────────────────────────────────────────────────── */

const fmt = (n: number | undefined) =>
  n != null ? new Intl.NumberFormat('en-US').format(n) : '0'

/* ── Stat pill ─────────────────────────────────────────────────────── */

function StatPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-deepBlue/[0.08] bg-white px-5 py-4 text-center shadow-emc ring-1 ring-line transition duration-300 ease-emc hover:-translate-y-0.5 hover:shadow-emc-md">
      <Icon className="h-5 w-5 text-customBlue" />
      <p className="font-latin text-[20px] font-black tabular-nums text-deepBlue" dir="ltr">{value}</p>
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
    </div>
  )
}

/* ── Course item ───────────────────────────────────────────────────── */

function CourseItem({ course }: { course: { id: number; slug: string; title: string; image_url?: string | null } }) {
  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group flex items-center justify-between gap-3 rounded-xl border border-deepBlue/[0.08] bg-deepBlue/[0.02] px-4 py-3 text-sm font-black text-deepBlue transition duration-300 ease-emc hover:border-customBlue/35 hover:bg-customBlue/[0.04]"
    >
      <div className="flex items-center gap-3 min-w-0">
        {course.image_url && (
          <img src={course.image_url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-line" />
        )}
        <span className="line-clamp-2 leading-tight">{course.title}</span>
      </div>
      <ArrowLeft className="h-4 w-4 shrink-0 text-customOrange transition group-hover:text-customBlue" />
    </Link>
  )
}

/* ── Learning path item ─────────────────────────────────────────────── */

function PathItem({ path }: { path: { id: number; slug: string; title: string } }) {
  return (
    <Link
      to={`/learning-paths/${path.slug}`}
      className="group flex items-center justify-between gap-3 rounded-xl border border-customOrange/15 bg-customOrange/[0.04] px-4 py-3 text-sm font-black text-deepBlue transition duration-300 ease-emc hover:border-customOrange/40 hover:bg-customOrange/[0.08]"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Route className="h-3.5 w-3.5 shrink-0 text-accent-700" />
        <span className="line-clamp-1">{path.title}</span>
      </div>
      <ArrowLeft className="h-4 w-4 shrink-0 text-accent-700 opacity-50 transition group-hover:opacity-100" />
    </Link>
  )
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function InstructorDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [ins,     setIns]     = useState<InstructorPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')

  useEffect(() => {
    if (!slug) { setErr('رابط المدرب غير صحيح.'); setLoading(false); return }
    let alive = true
    fetchInstructor(slug)
      .then((row) => {
        if (!alive) return
        if (row) setIns(row)
        else setErr('المدرب غير موجود.')
      })
      .catch(() => { if (alive) setErr('تعذر تحميل بيانات المدرب.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [slug])

  /* ── Loading ── */
  if (loading) {
    return (
      <main className="min-h-[50vh] bg-emcBg px-4 pb-20 pt-28">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="emc-skeleton h-44 rounded-3xl ring-1 ring-deepBlue/[0.06]" />
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <div className="emc-skeleton h-64 rounded-3xl ring-1 ring-deepBlue/[0.06]" />
            <div className="emc-skeleton h-64 rounded-3xl ring-1 ring-deepBlue/[0.06]" />
          </div>
        </div>
      </main>
    )
  }

  /* ── Error / not found ── */
  if (err || !ins) {
    return (
      <main className="bg-emcBg px-4 pb-20 pt-28 text-right" dir="rtl">
        <div className="mx-auto max-w-xl">
          <div className="flex flex-col items-center justify-center rounded-3xl border border-orange-200 bg-orange-50 py-16 text-center shadow-emc">
            <UserCircle className="mb-4 h-14 w-14 text-accent-700/40" />
            <p className="font-display text-[18px] font-black tracking-tight text-deepBlue">
              {err || 'المدرب غير موجود'}
            </p>
            <p className="mt-2 text-[13px] text-slate-500">
              تأكد من الرابط أو ابحث في قائمة المدربين
            </p>
          </div>
          <Link
            to="/instructors"
            className="mt-6 inline-flex items-center gap-2 font-black text-customBlue hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة لقائمة المدربين
          </Link>
        </div>
      </main>
    )
  }

  const courses      = ins.courses ?? []
  const learningPaths = ins.learning_paths ?? []
  const specialization = ins.specialization ?? ins.expertise
  const showContact  = ins.show_contact === true && (ins.email || ins.phone)

  return (
    <main className="bg-emcBg pt-20" dir="rtl">
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

        {/* ── Stats strip ──────────────────────────────────────────── */}
        {((ins.courses_count ?? 0) > 0 || (ins.learning_paths_count ?? 0) > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {(ins.courses_count ?? 0) > 0 && (
              <StatPill icon={BookOpen} label="دورة تدريبية" value={fmt(ins.courses_count)} />
            )}
            {(ins.learning_paths_count ?? 0) > 0 && (
              <StatPill icon={Route} label="مسار تعليمي" value={fmt(ins.learning_paths_count)} />
            )}
            {(ins.workshops_count ?? 0) > 0 && (
              <StatPill icon={GraduationCap} label="ورشة عمل" value={fmt(ins.workshops_count)} />
            )}
          </motion.div>
        )}

        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">

          {/* ── Avatar sidebar ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="overflow-hidden rounded-[1.35rem] border border-deepBlue/[0.08] bg-white p-4 shadow-emc-lg ring-1 ring-line">
              <div className="aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-deepBlue/10 to-customBlue/15 ring-1 ring-deepBlue/[0.06]">
                {ins.image_url ? (
                  <img src={ins.image_url} alt={ins.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="emc-depth flex h-full w-full items-center justify-center font-display text-[56px] font-black text-white">
                    {ins.name.charAt(0)}
                  </div>
                )}
              </div>
              {specialization && (
                <div className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-customOrange/10 px-3 py-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent-700" />
                  <p className="text-center text-[12px] font-black text-accent-700">{specialization}</p>
                </div>
              )}
            </div>

            {/* Contact — only shown when backend allows it */}
            {showContact && (
              <div className="rounded-[1.35rem] border border-deepBlue/[0.08] bg-white p-4 shadow-emc ring-1 ring-line">
                <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-deepBlue/40">تواصل</p>
                {ins.email && (
                  <a
                    href={`mailto:${ins.email}`}
                    className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5 text-[12px] font-semibold text-deepBlue transition duration-300 ease-emc hover:border-customBlue/30 hover:text-customBlue"
                    dir="ltr"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-customBlue" />
                    {ins.email}
                  </a>
                )}
                {ins.phone && (
                  <a
                    href={`tel:${ins.phone}`}
                    className="mt-2 flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5 text-[12px] font-semibold text-deepBlue transition duration-300 ease-emc hover:border-customBlue/30 hover:text-customBlue"
                    dir="ltr"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-accent-700" />
                    {ins.phone}
                  </a>
                )}
              </div>
            )}
          </motion.div>

          {/* ── Main content ────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="space-y-6"
          >

            {/* Bio card */}
            <div className="rounded-[1.35rem] border border-deepBlue/[0.08] bg-white p-8 text-right shadow-emc-lg ring-1 ring-line">
              <h2 className="flex items-center gap-2 font-display text-[18px] font-black tracking-tight text-deepBlue">
                <UserCircle className="h-5 w-5 text-customBlue" />
                نبذة تعريفية
              </h2>
              <span className="mt-3 block h-1 w-12 rounded-full bg-customOrange" />
              {ins.bio ? (
                <p className="mt-5 whitespace-pre-line text-[14px] font-medium leading-9 text-deepBlue/75">
                  {ins.bio}
                </p>
              ) : (
                <p className="mt-5 text-[14px] text-slate-400 italic">لم تُضاف نبذة تفصيلية بعد.</p>
              )}
            </div>

            {/* Related courses */}
            <div className="rounded-[1.35rem] border border-deepBlue/[0.08] bg-white p-8 text-right shadow-emc-lg ring-1 ring-line">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-[16px] font-black tracking-tight text-deepBlue">
                  <BookOpen className="h-5 w-5 text-customBlue" />
                  دورات مرتبطة
                </h3>
                {courses.length > 0 && (
                  <Link
                    to="/courses"
                    className="flex items-center gap-1 text-[11px] font-black text-customBlue hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    جميع الدورات
                  </Link>
                )}
              </div>
              {courses.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-[13px] font-semibold text-slate-400">
                  لا توجد دورات منشورة حالياً لهذا المدرب.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {courses.map((c) => (
                    <li key={c.id}>
                      <CourseItem course={c} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Related learning paths */}
            {learningPaths.length > 0 && (
              <div className="rounded-[1.35rem] border border-deepBlue/[0.08] bg-white p-8 text-right shadow-emc-lg ring-1 ring-line">
                <h3 className="mb-5 flex items-center gap-2 font-display text-[16px] font-black tracking-tight text-deepBlue">
                  <Route className="h-5 w-5 text-accent-700" />
                  مسارات تعليمية
                </h3>
                <ul className="space-y-2.5">
                  {learningPaths.map((p) => (
                    <li key={p.id}>
                      <PathItem path={p} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </motion.div>
        </div>

        {/* Back link */}
        <div className="mt-10 text-right">
          <Link
            to="/instructors"
            className="inline-flex items-center gap-2 rounded-2xl border border-deepBlue/10 bg-white px-5 py-3 text-[13px] font-black text-deepBlue shadow-emc transition duration-300 ease-emc hover:border-customBlue/30 hover:shadow-emc-md hover:text-customBlue"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة لقائمة المدربين
          </Link>
        </div>
      </section>
    </main>
  )
}
