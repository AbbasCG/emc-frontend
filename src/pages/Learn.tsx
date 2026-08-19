import { useEffect } from 'react'
import { useLocation } from 'react-router'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import PublicSeo from '@/components/public/PublicSeo'
import JourneyTimeline from '@/components/learn/JourneyTimeline'
import PlacementTest from '@/components/learn/PlacementTest'
import { OPEN_ENROLLMENT_LABEL } from '@/data/webSpec'

/**
 * /learn — EMC-WEB-001 §4, the orientation page.
 *
 * The single question this page answers is "where do I start?", and it answers it
 * twice: once as a map (the five stations, L0 to L4) and once as an instrument
 * (five questions that name one station for you). Everything else is removed.
 *
 * §1 — ONE primary decision on the screen: «حدّد نقطة انطلاقك». The stations
 * carry text CTAs, never competing buttons, and the second orange button on the
 * page only exists after the questionnaire has produced a result.
 */
export default function Learn() {
  const { hash } = useLocation()

  // Anchor landings (/learn#camps from the placement result, /learn#placement
  // from the header). `ScrollToTop` resets the window on every pathname change,
  // so the fragment has to be honoured here, once this page has mounted. The
  // effect only reads the DOM — no state is set from it.
  useEffect(() => {
    if (!hash) return
    const target = document.getElementById(hash.slice(1))
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <main dir="rtl" className="bg-white pb-24">
      <PublicSeo
        title="ابدأ رحلتك محطات التعلّم"
        description="خمس محطات تعلّم في EMC، من الورش المجانية إلى الزمالة، وخمسة أسئلة قصيرة تحدد نقطة انطلاقك أنت."
        path="/learn"
      />

      {/* ── Editorial header ─────────────────────────────────────────────── */}
      <header className="border-b border-line bg-paper pt-28">
        <div className="mx-auto w-full max-w-6xl px-4 pb-14 text-right sm:px-6">
          <p className="emc-eyebrow">دليل البداية</p>

          <h1 className="emc-title-arc mt-5 font-display text-3xl font-black leading-tight text-navy sm:text-4xl lg:text-[2.75rem]">
            ابدأ من حيث أنت، لا من الصفر
          </h1>

          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-ink-500">
            رحلة التعلّم في EMC خمس محطات واضحة. لست مطالباً بالمرور بها كلها أنت تحتاج محطة
            واحدة: التي تصف حالك اليوم. هذه الصفحة تريك المحطات الخمس، ثم تسمّي لك واحدة منها.
          </p>

          <a
            href="#placement"
            className="emc-focus-ring mt-9 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:brightness-[1.03] sm:w-auto sm:px-10"
          >
            حدّد نقطة انطلاقك
            <ArrowLeftIcon size={18} />
          </a>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* ── §4 the five stations ─────────────────────────────────────── */}
        <JourneyTimeline />

        {/* ── §4 entering at your own level ────────────────────────────── */}
        <section className="mt-20 text-right">
          <div aria-hidden className="emc-tricolor" />

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-14">
            <h2 className="font-display text-2xl font-black leading-snug text-navy sm:text-3xl">
              لست مضطراً للبدء من الصفر
            </h2>

            <div>
              <p className="text-sm font-semibold leading-8 text-ink-500">
                المحطات الخمس ترتيب للوضوح، لا سلّم تصعده درجة درجة. من يعمل في المجال منذ سنوات
                يدخل من المحطة الرابعة مباشرة، ومن أنهى دورة من قبل لا يعيد الأساسيات مرة أخرى.
              </p>
              <p className="mt-5 text-sm font-semibold leading-8 text-ink-500">
                كل محطة نقطة دخول مستقلة: تلتحق بها دون اشتراط اجتياز ما قبلها. وإن ترددت بين
                محطتين، فالأسئلة الخمسة أدناه تحسم اختيارك في دقيقتين.
              </p>
            </div>
          </div>
        </section>

        {/* ── §4 «حدّد نقطة انطلاقك» (id="placement") ─────────────────── */}
        <PlacementTest />

        {/* ── Closing line ───────────────────────────────────────────────── */}
        <section className="mt-20 text-right">
          <div aria-hidden className="emc-hairline" />
          <p className="mt-9 max-w-3xl font-display text-xl font-black leading-relaxed text-navy sm:text-2xl">
            حين تعرف محطتك تكون قد أنجزت أصعب جزء. الباقي خطوة واحدة: تفتح صفحة المحطة وتبدأ.
          </p>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-8 text-ink-500">
            برامج EMC المدفوعة حالتها «{OPEN_ENROLLMENT_LABEL}»، فأنت تحجز مقعدك متى قررت.
          </p>
        </section>
      </div>
    </main>
  )
}
