import { Link, Navigate, useParams } from 'react-router'
import {
  Award,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  Hammer,
  ListChecks,
  Route as RouteIcon,
  Users,
  Wrench,
} from 'lucide-react'
import PublicSeo from '@/components/public/PublicSeo'
import PageHeader from '@/components/PageHeader'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { PROFESSIONAL_TRACKS } from '@/data/officialTracks'
import { TRACK_FAQ, findTrackPage } from '@/data/trackPages'

/**
 * صفحة الهبوط الموحدة للمسار (/tracks/<slug>) — القالب المعتمد بترتيبه:
 * نظرة عامة ← المدة/المستوى/السعر ← لمن ← لماذا/ماذا ستستفيد ← الرحلة
 * التعليمية بمحاورها ← الورش ← المخرجات ← الأدوات ← التقييم والشهادة ←
 * ما بعد المسار ← الأسئلة الشائعة ← CTA. كل مسار Landing Page مستقلة
 * تصلح للتسويق المنفرد.
 */

function SectionTitle({ icon: Icon, children }: { icon: typeof Users; children: React.ReactNode }) {
  return (
    <h2 className="emc-title-arc flex items-center gap-2.5 font-display text-2xl font-black tracking-tight text-deepBlue">
      <Icon size={20} className="shrink-0 text-customBlue" aria-hidden />
      {children}
    </h2>
  )
}

export default function TrackLandingPage() {
  const { trackSlug } = useParams<{ trackSlug: string }>()
  const page = trackSlug ? findTrackPage(trackSlug) : undefined

  if (!page) return <Navigate to="/learning-paths" replace />

  const meta = PROFESSIONAL_TRACKS.find((t) => t.id === page.trackId)

  return (
    <div className="bg-paper pt-20" dir="rtl">
      <PublicSeo
        title={page.title}
        description={page.cardDesc}
        path={`/tracks/${page.slug}`}
      />
      <PageHeader
        title={page.title}
        breadcrumbs={[
          { label: 'الرئيسية', href: '/' },
          { label: 'المسارات', href: '/learning-paths' },
          { label: page.title },
        ]}
      />

      {/* ── نظرة عامة ── */}
      <section className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
        <p className="font-latin text-sm font-black tracking-wide text-customBlue">{page.titleEn}</p>
        <p className="mt-4 max-w-3xl text-base leading-8 text-ink-600">{page.cardDesc}</p>

        {/* الشريط الحقائقي: المدة · المستوى · السعر (المعتمد فقط) */}
        <div className="mt-7 flex flex-wrap items-stretch gap-x-8 gap-y-4 border-y border-line py-5">
          <div className="flex items-center gap-2.5">
            <CalendarClock size={18} className="text-customBlue" aria-hidden />
            <div>
              <p className="text-[10px] font-black tracking-[0.14em] text-ink-400">المدة</p>
              <p className="text-sm font-black text-deepBlue">{meta?.duration ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Award size={18} className="text-customBlue" aria-hidden />
            <div>
              <p className="text-[10px] font-black tracking-[0.14em] text-ink-400">الشهادة</p>
              <p className="font-latin text-sm font-black text-deepBlue">{meta?.certificate ?? 'Professional Track Certificate'}</p>
            </div>
          </div>
          {meta?.price != null && (
            <div className="flex items-center gap-2.5">
              <BadgeCheck size={18} className="text-customBlue" aria-hidden />
              <div>
                <p className="text-[10px] font-black tracking-[0.14em] text-ink-400">المسار الكامل</p>
                <p dir="ltr" className="emc-stat-num text-2xl text-deepBlue">{'€'}{meta.price}</p>
              </div>
            </div>
          )}
          <div className="ms-auto flex items-center gap-3">
            <Link
              to="/contact"
              className="emc-cta-line text-sm"
            >
              تحدث مع فريق EMC
              <ArrowLeftIcon size={14} />
            </Link>
            <Link
              to="/ai-level"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-customBlue/40 px-5 text-sm font-extrabold text-customBlue transition hover:bg-sky/30"
            >
              اختبر مستواك
            </Link>
            <Link
              to="/courses"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-customOrange px-6 text-sm font-extrabold text-white transition hover:bg-ember"
            >
              ابدأ المسار
              <ArrowLeftIcon size={15} />
            </Link>
          </div>
        </div>

        {/* عن المسار */}
        <div className="mt-10 max-w-3xl space-y-4">
          {page.about.map((para) => (
            <p key={para.slice(0, 30)} className="text-[15px] leading-8 text-ink-500">{para}</p>
          ))}
        </div>
      </section>

      {/* ── لمن + ماذا ستستفيد ── */}
      <section className="mx-auto grid max-w-5xl gap-12 px-4 pt-14 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionTitle icon={Users}>لمن هذا المسار؟</SectionTitle>
          <ul className="mt-6 space-y-2.5">
            {page.audience.map((a) => (
              <li key={a} className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-ink-600">
                <BadgeCheck size={15} className="mt-1 shrink-0 text-customBlue" aria-hidden />
                {a}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionTitle icon={ListChecks}>ماذا ستتمكن من فعله؟</SectionTitle>
          <ul className="mt-6 space-y-2.5">
            {page.outcomes.map((o) => (
              <li key={o} className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-ink-600">
                <BadgeCheck size={15} className="mt-1 shrink-0 text-success" aria-hidden />
                {o}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── الرحلة التعليمية ── */}
      <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6">
        <SectionTitle icon={RouteIcon}>الرحلة التعليمية</SectionTitle>
        <div className="mt-8 space-y-10">
          {page.phases.map((phase) => (
            <div key={phase.title}>
              <h3 className="font-display text-lg font-black text-deepBlue">
                {phase.title}
                {phase.titleEn && <span className="font-latin ms-3 text-xs font-bold text-ink-400">{phase.titleEn}</span>}
              </h3>
              <div className="mt-4 space-y-1">
                <div aria-hidden className="emc-hairline" />
                {phase.units.map((unit, i) => (
                  <div key={unit.name} className="emc-row py-4 ps-3 sm:ps-4">
                    <div className="flex items-baseline gap-3">
                      <span className="font-latin text-xs font-black text-ink-300">{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0">
                        <p className="text-[15px] font-black text-deepBlue">
                          {unit.name}
                          {unit.nameEn && <span className="font-latin ms-2 text-[11px] font-bold text-ink-400">{unit.nameEn}</span>}
                        </p>
                        {unit.axes && unit.axes.length > 0 && (
                          <p className="mt-1.5 text-xs leading-6 text-ink-400">{unit.axes.join(' · ')}</p>
                        )}
                        {unit.note && <p className="mt-1 text-xs font-bold text-customBlue">{unit.note}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── الورش + المخرجات + الأدوات ── */}
      <section className="mx-auto grid max-w-5xl gap-12 px-4 pt-16 sm:px-6 lg:grid-cols-3">
        <div>
          <SectionTitle icon={Hammer}>الورش التطبيقية</SectionTitle>
          <ul className="mt-5 space-y-2">
            {page.workshops.map((w) => (
              <li key={w} className="text-sm font-semibold leading-6 text-ink-600">{w}</li>
            ))}
          </ul>
        </div>
        <div>
          <SectionTitle icon={ClipboardCheck}>ماذا ستبني؟</SectionTitle>
          <ul className="mt-5 space-y-2">
            {page.deliverables.map((d) => (
              <li key={d} className="text-sm font-semibold leading-6 text-ink-600">{d}</li>
            ))}
          </ul>
        </div>
        <div>
          <SectionTitle icon={Wrench}>الأدوات</SectionTitle>
          <p className="font-latin mt-5 text-sm font-bold leading-8 text-ink-500">
            {page.tools.join(' — ')}
          </p>
          <p className="mt-6 border-t border-line pt-4 text-xs leading-6 text-ink-400">
            التقييم: تكليفات ومشاريع مرحلية ومشروع نهائي. الشهادة تُمنح بعد
            استيفاء شروط الإتمام.
          </p>
        </div>
      </section>

      {/* ── ما بعد المسار ── */}
      <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6">
        <SectionTitle icon={Award}>ما بعد المسار</SectionTitle>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          {page.afterPath.map((a) => (
            <span key={a} className="text-sm font-bold text-ink-600">{a}</span>
          ))}
        </div>
      </section>

      {/* ── الأسئلة الشائعة ── */}
      <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6">
        <SectionTitle icon={ListChecks}>الأسئلة الشائعة</SectionTitle>
        <div className="mt-6 max-w-3xl space-y-1">
          <div aria-hidden className="emc-hairline" />
          {TRACK_FAQ.map((f) => (
            <details key={f.q} className="emc-row group py-4 ps-3">
              <summary className="cursor-pointer list-none text-sm font-black text-deepBlue transition-colors hover:text-customBlue">
                {f.q}
              </summary>
              <p className="mt-2 text-sm leading-7 text-ink-500">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ختامي ── */}
      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-display text-2xl font-black text-deepBlue">جاهز تبدأ رحلتك؟</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/courses"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-customOrange px-8 text-sm font-extrabold text-white transition hover:bg-ember"
          >
            ابدأ المسار
            <ArrowLeftIcon size={15} />
          </Link>
          <Link
            to="/ai-level"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-customBlue/40 px-6 text-sm font-extrabold text-customBlue transition hover:bg-sky/30"
          >
            اختبر مستواك
          </Link>
          <Link to="/contact" className="emc-cta-line text-sm">
            تحدث مع فريق EMC
            <ArrowLeftIcon size={14} />
          </Link>
        </div>
      </section>
    </div>
  )
}
