import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Search,
  Sparkles,
} from 'lucide-react'
import { fetchInstructors, type InstructorPublic } from '@/api/instructorsApi'
import { PublicPageHero } from '@/components/public'
import PublicSeo from '@/components/public/PublicSeo'
import SectionHeader from '@/components/sections/SectionHeader'
import { staggerContainer, staggerItem } from '@/utils/motion'

/* ── Helpers ───────────────────────────────────────────────────────── */

const fmt = (n: number | undefined) =>
  n != null ? new Intl.NumberFormat('en-US').format(n) : '0'

/** Returns a valid route segment (id or slug), or null if neither is usable. */
function getDetailPath(ins: InstructorPublic): string | null {
  if (ins.slug && ins.slug.trim() !== '') return `/instructors/${ins.slug}`
  if (ins.id > 0) return `/instructors/${ins.id}`
  return null
}

/* ── Instructor card ───────────────────────────────────────────────── */

function InstructorCard({ ins }: { ins: InstructorPublic }) {
  const detailPath = getDetailPath(ins)
  const specialization = ins.specialization ?? ins.expertise

  return (
    <motion.article
      variants={staggerItem}
      className="group relative flex flex-col overflow-hidden rounded-[1.4rem] border border-deepBlue/[0.08] bg-white text-right shadow-emc-md ring-1 ring-line transition-all duration-300 ease-emc hover:-translate-y-1 hover:border-customBlue/25 hover:shadow-emc-lg"
    >
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -left-12 -top-8 h-40 w-40 rounded-full bg-customBlue/[0.06] blur-3xl transition duration-500 group-hover:bg-customOrange/[0.08]" />

      {/* Avatar strip */}
      <div className="relative flex items-start gap-4 p-6 pb-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-deepBlue/10 to-customBlue/15 ring-1 ring-deepBlue/[0.08] shadow-inner">
          {ins.image_url ? (
            <img
              src={ins.image_url}
              alt={ins.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="emc-depth flex h-full w-full items-center justify-center font-display text-[28px] font-black text-white">
              {ins.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <h2 className="font-display text-[16px] font-black leading-tight tracking-tight text-deepBlue">{ins.name}</h2>
          {ins.title && (
            <p className="mt-1 text-[11px] font-black text-customBlue">{ins.title}</p>
          )}
          {specialization && (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-customOrange/10 px-2 py-0.5 text-[10px] font-black text-accent-700">
              <Sparkles className="h-2.5 w-2.5" />
              {specialization}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {ins.bio && (
        <p className="line-clamp-2 px-6 pb-3 text-[12px] font-medium leading-relaxed text-deepBlue/60">
          {ins.bio}
        </p>
      )}

      {/* Stats + CTA */}
      <div className="mt-auto flex items-center justify-between border-t border-deepBlue/[0.06] px-6 py-4">
        <div className="flex items-center gap-3 text-[11px] font-black text-deepBlue/45">
          {(ins.courses_count ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-accent-700" />
              <span className="font-latin tabular-nums">{fmt(ins.courses_count)}</span> دورة
            </span>
          )}
          {(ins.learning_paths_count ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5 text-customBlue" />
              <span className="font-latin tabular-nums">{fmt(ins.learning_paths_count)}</span> مسار
            </span>
          )}
          {(ins.courses_count ?? 0) === 0 && (ins.learning_paths_count ?? 0) === 0 && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5 text-customBlue" />
              مدرب معتمد
            </span>
          )}
        </div>

        {detailPath ? (
          <Link
            to={detailPath}
            className="inline-flex items-center gap-1.5 rounded-xl border border-customBlue/20 bg-customBlue/[0.06] px-3.5 py-2 text-[11px] font-black text-customBlue transition duration-300 ease-emc hover:bg-customBlue hover:text-white"
          >
            عرض الملف
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-[11px] font-semibold text-slate-400">
            مدرب EMC
          </span>
        )}
      </div>
    </motion.article>
  )
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function Instructors() {
  const [rows,    setRows]    = useState<InstructorPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    let alive = true
    fetchInstructors()
      .then((list) => { if (alive) setRows(list) })
      .catch(() => { if (alive) setErr('تعذر تحميل قائمة المدربين.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const filtered = search.trim()
    ? rows.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.expertise ?? r.specialization ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : rows

  return (
    <main className="bg-emcBg pt-20">
      <PublicSeo
        title="المدربون"
        description="تعرّف على الكادر التدريبي في EMC: خبراء يقودون الجلسات والمسارات التعليمية بجودة مؤسسية، مع سيرة كل مدرب والدورات والمسارات المرتبطة به."
        path="/instructors"
      />
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

          {/* Search */}
          {!loading && rows.length > 0 && (
            <div className="relative mt-6 max-w-md" dir="rtl">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم أو تخصص..."
                className="emc-focus-ring h-11 w-full rounded-2xl border border-deepBlue/10 bg-white pr-10 pl-4 text-[13px] font-semibold text-deepBlue shadow-emc outline-none transition placeholder:text-slate-400 focus:border-customBlue focus:ring-4 focus:ring-customBlue/10"
              />
            </div>
          )}

          {err && (
            <p className="mt-6 rounded-xl bg-orange-50 px-4 py-3 text-right text-sm font-bold text-accent-700 ring-1 ring-orange-100">
              {err}
            </p>
          )}

          {loading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="emc-skeleton h-64 rounded-[1.4rem] ring-1 ring-deepBlue/[0.06]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-deepBlue/10 bg-white py-20 text-center shadow-emc">
              <GraduationCap className="mb-4 h-12 w-12 text-deepBlue/15" />
              <p className="font-display font-black tracking-tight text-deepBlue">
                {rows.length === 0 ? 'لا يوجد مدربون متاحون حالياً' : 'لا نتائج مطابقة للبحث'}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-3 text-[12px] font-black text-customBlue hover:underline"
                >
                  مسح البحث
                </button>
              )}
              <Link
                to="/courses"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-customBlue px-6 py-2.5 text-[12px] font-black text-white transition hover:opacity-90"
              >
                تصفح الدورات التدريبية
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <motion.div
              className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.08 }}
            >
              {filtered.map((ins) => (
                <InstructorCard key={ins.id} ins={ins} />
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </main>
  )
}
