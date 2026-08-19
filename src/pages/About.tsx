import { Link } from 'react-router'
import PublicSeo from '@/components/public/PublicSeo'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { impactMainStats } from '@/data/impactDashboard'
import { formatNumberEn, toLatinDigits } from '@/utils/publicDetailFormat'

/**
 * EMC-WEB-001 §10 — /about.
 *
 * MANDATORY narrative frame: «لا نبدأ من جديد — بل نُتمّ ما بنيناه». EMC is an
 * established institution, so every «انطلاقة جديدة» / fresh-start framing was removed
 * from this page (brand V3 §4 forbids that narrative outright). The spine now reads:
 * frame · story · approved numbers · closing CTA.
 *
 * What is deliberately ABSENT (§11 — nothing unapproved is displayed):
 *   • Partners. No data layer on this site can prove a partner has SIGNED: the only
 *     partner source is `/operations/partners` (auth-gated ops data whose rows include
 *     «negotiation» and «rejected»), and the public partner marks elsewhere in the app
 *     are acknowledged placeholders. A speculative logo row would be an unapproved
 *     claim, so the partners section renders nothing at all.
 *   • Accreditation badges, trainer names, dates, roadmap promises — none are approved.
 *   • Any statistic outside the founder-confirmed set below.
 *
 * Numbers come from `impactMainStats` — the single approved source already used on the
 * public surfaces (13,000+ · 9,000+ · 50+) — and render in Latin digits (§1).
 *
 * Design Language 2.0: editorial header, hairlines and typographic statements. No cards,
 * no shadows, no emoji; the one arrow is the shared left-pointing inline SVG.
 */

const FRAME_SENTENCE = 'لا نبدأ من جديد — بل نُتمّ ما بنيناه'

/** The story, in short formal paragraphs. Narrative only — no figures, no dates, no names. */
const STORY = [
  'بدأت EMC من حاجة واضحة: تعليم عربي يصل إلى المبتدئ قبل المحترف، ويأخذه خطوة بعد خطوة حتى يتقن مهارة يستعملها في عمله ودراسته.',
  'بنينا المنظومة على ثلاث درجات متصلة: ورشة مجانية تعرّفك بالمجال، ودورة تطبيقية تبني بها المهارة، ومسار احترافي يجمع الدورات في طريق واحد ينتهي بشهادة.',
  'ثم جاءت المنصة. لم تُلغِ ما سبقها، بل جمعته في مكان واحد: التسجيل والمتابعة والشهادة والمجتمع. لهذا لا نبدأ من جديد — نُتمّ ما بنيناه.',
  'أنت تدخل مؤسسة قائمة: البرامج تعمل، والمتعلمون فيها الآن، والفريق يواصل البناء على أساس موجود لا على وعد.',
] as const

/** What the platform completes — structural, drawn from surfaces that already exist. */
const CONTINUITY = [
  {
    id: 'learning',
    title: 'التعلّم',
    body: 'ورش ودورات ومسارات في منظومة واحدة، تنتقل بينها دون أن تبدأ من الصفر مرة أخرى.',
  },
  {
    id: 'guidance',
    title: 'الإرشاد',
    body: 'تعرف من أين تبدأ وإلى أين تصل قبل أن تسجّل، فيبقى القرار مبنياً على وضوح لا على تجربة.',
  },
  {
    id: 'community',
    title: 'المجتمع',
    body: 'تتعلّم داخل مجموعة عربية تتقدّم معك، ويبقى أثر ما أنجزته موثّقاً في حسابك.',
  },
] as const

export default function About() {
  return (
    <main dir="rtl" className="bg-white text-foreground">
      <PublicSeo
        title="عن المركز"
        description="EMC مؤسسة تعليمية عربية قائمة: ورش ودورات ومسارات تجمعها منصة واحدة. لا نبدأ من جديد — بل نُتمّ ما بنيناه."
        path="/about"
      />

      {/* ── Editorial header — carries the mandatory frame sentence (sea family only) ── */}
      <header className="emc-depth pt-28">
        <div className="mx-auto w-full max-w-5xl px-4 pb-16 text-right sm:px-6">
          <p className="text-xs font-black tracking-[0.18em] text-ice">عن EMC</p>
          <h1 className="mt-4 font-display text-3xl font-black leading-[1.2] text-white sm:text-5xl">
            {FRAME_SENTENCE}
          </h1>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-9 text-ice sm:text-lg">
            مركز ماستر التعليمي (EMC) مؤسسة تعليمية عربية غير ربحية مقرّها هولندا. ما تراه اليوم منصة
            واحدة تجمع ما بنيناه على مدى سنوات، لا بداية جديدة تلغي ما قبلها.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {/* ── 1. القصة ── */}
        <section aria-labelledby="about-story" className="pt-16 sm:pt-20">
          <h2
            id="about-story"
            className="emc-title-arc text-right font-display text-2xl font-black text-navy sm:text-3xl"
          >
            القصة
          </h2>
          <div className="mt-10 max-w-2xl text-right">
            {STORY.map((paragraph) => (
              <p
                key={paragraph.slice(0, 24)}
                className="mt-6 text-base font-semibold leading-9 text-ink-500 first:mt-0 sm:text-lg sm:leading-10"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {/* ── 2. ما نُتمّه — editorial rows, no cards ── */}
        <section aria-labelledby="about-continuity" className="pt-16 sm:pt-20">
          <h2
            id="about-continuity"
            className="emc-title-arc text-right font-display text-2xl font-black text-navy sm:text-3xl"
          >
            ما نُتمّه اليوم
          </h2>
          <ul className="mt-10">
            {CONTINUITY.map((item, index) => (
              <li key={item.id} className="emc-row py-7 sm:py-8">
                <div className="flex flex-col gap-2 pe-1 ps-4 text-right sm:flex-row sm:items-baseline sm:gap-8">
                  <span
                    aria-hidden
                    dir="ltr"
                    className="font-latin text-sm font-black tabular-nums text-customBlue sm:w-12"
                  >
                    {toLatinDigits(index + 1)}
                  </span>
                  <div className="sm:flex-1">
                    <h3 className="font-display text-xl font-black text-navy sm:text-2xl">{item.title}</h3>
                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-8 text-ink-500 sm:text-base">
                      {item.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 3. الأرقام المعتمدة — typographic statements, nothing beyond the approved set ── */}
        <section aria-labelledby="about-numbers" className="pt-16 sm:pt-20">
          <h2
            id="about-numbers"
            className="emc-title-arc text-right font-display text-2xl font-black text-navy sm:text-3xl"
          >
            ما بنيناه حتى اليوم
          </h2>

          <div className="mt-12 grid gap-y-12 sm:grid-cols-3 sm:gap-x-10">
            {impactMainStats.map((stat) => (
              <div key={stat.id} className="text-right">
                <p className="emc-stat-num font-display text-5xl sm:text-6xl" dir="ltr">
                  {stat.suffix ?? ''}
                  {toLatinDigits(formatNumberEn(stat.value))}
                </p>
                <p className="mt-4 text-sm font-black text-navy sm:text-base">{stat.labelAr}</p>
                <p className="mt-1 text-xs font-semibold text-ink-400">{stat.hintAr}</p>
              </div>
            ))}
          </div>
        </section>

        {/*
          Partners section: intentionally not rendered. See the file header — no public
          data proves a signed partnership, and a speculative list is an unapproved claim.
          Restore this section only with a data source that carries a signed flag.
        */}

        <div aria-hidden className="emc-hairline mt-16 sm:mt-20" />

        {/* ── 4. الدعوة الختامية ── */}
        <section aria-labelledby="about-cta" className="py-16 text-right sm:py-20">
          <h2
            id="about-cta"
            className="font-display text-2xl font-black text-navy sm:text-3xl"
          >
            ابدأ من حيث وصلنا
          </h2>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-9 text-ink-500">
            تفتح صفحة التعلّم على الورش والدورات والمسارات كما هي اليوم، فتختار نقطة دخولك بنفسك.
          </p>
          <Link
            to="/learn"
            className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-customOrange px-8 text-base font-black text-white transition duration-250 ease-emc hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            ابدأ رحلتك التعليمية
            <ArrowLeftIcon size={18} />
          </Link>
        </section>
      </div>
    </main>
  )
}
