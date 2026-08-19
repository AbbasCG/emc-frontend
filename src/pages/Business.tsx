import PublicSeo from '@/components/public/PublicSeo'
import BusinessInquiryForm from '@/components/business/BusinessInquiryForm'
import { toLatinDigits } from '@/utils/publicDetailFormat'

/**
 * EMC-WEB-001 §10 — /business, the institutional surface.
 *
 * Three audiences (شركات · جامعات · جهات حكومية) as editorial rows, six institutional
 * products as short entries, one inquiry form, one promise line.
 *
 * Two laws shape what is NOT here:
 *   • §11 — no price appears anywhere on this page. Institutional scope is quoted after
 *     a conversation; a listed number would be an invented one.
 *   • §11 — nothing unapproved is displayed. The official institutional catalogue has not
 *     been handed over, so the six products render as neutral structural slots (see
 *     INSTITUTIONAL_PRODUCTS) instead of invented names and marketing lines.
 *
 * Design Language 2.0: hairlines, numbering and typography carry the page — no bordered
 * cards, no shadows. The single orange control is the form's submit (§1).
 */

/** §10 — the three approved audiences. */
const AUDIENCES = [
  {
    id: 'company',
    title: 'شركات',
    body: 'ترفع فرق العمل مهاراتها التطبيقية ضمن جدول يناسب ساعات الدوام، وتقيس ما تغيّر بعد التدريب.',
  },
  {
    id: 'university',
    title: 'جامعات',
    body: 'تُكمل البرامج الأكاديمية بمهارات تطبيقية يطلبها سوق العمل، وتفتح لطلابك مساراً بعد التخرج.',
  },
  {
    id: 'government',
    title: 'جهات حكومية',
    body: 'تبني قدرات موظفيك في التحول الرقمي وتحليل البيانات والذكاء الاصطناعي بلغة عربية مهنية.',
  },
] as const

/**
 * The official institutional catalogue (names · نطاق · مخرجات) has NOT been approved yet.
 * Until it is handed over, these six entries stay deliberately neutral: a number and a
 * structural label, nothing more. Do not write marketing copy here — replace each slot
 * with its approved name and one-line description when the catalogue arrives, and never
 * add a price (§11: institutional pricing is quoted, never listed).
 */
const CATALOGUE_PENDING_NOTE = 'يُستكمل من الكتالوج المعتمد'

const INSTITUTIONAL_PRODUCTS = [
  { id: 1, slot: 'البرنامج المؤسسي الأول' },
  { id: 2, slot: 'البرنامج المؤسسي الثاني' },
  { id: 3, slot: 'البرنامج المؤسسي الثالث' },
  { id: 4, slot: 'البرنامج المؤسسي الرابع' },
  { id: 5, slot: 'البرنامج المؤسسي الخامس' },
  { id: 6, slot: 'البرنامج المؤسسي السادس' },
] as const

/** §10 — the reply promise, rendered verbatim next to the form. */
const REPLY_PROMISE = 'نعود إليك خلال يومي عمل'

export default function Business() {
  return (
    <main dir="rtl" className="bg-white text-foreground">
      <PublicSeo
        title="EMC للمؤسسات"
        description="برامج EMC المؤسسية للشركات والجامعات والجهات الحكومية: تدريب يُبنى على سياق فريقك، وتصور يصلك خلال يومي عمل."
        path="/business"
      />

      {/* ── Editorial header — sea family only, no blend with the fire family (§1) ── */}
      <header className="emc-depth pt-28">
        <div className="mx-auto w-full max-w-5xl px-4 pb-16 text-right sm:px-6">
          <p className="text-xs font-black tracking-[0.18em] text-ice">EMC للمؤسسات</p>
          <h1 className="mt-4 font-display text-3xl font-black leading-[1.15] text-white sm:text-5xl">
            تدريب مؤسسي يُبنى على حاجة فريقك
          </h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-9 text-ice sm:text-lg">
            تكتب لنا سياق جهتك وحاجتها، فنعود إليك بتصور مبني عليها — لا عرضاً عاماً.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {/* ── 1. الجهات التي نعمل معها — editorial rows ── */}
        <section aria-labelledby="business-audiences" className="pt-16 sm:pt-20">
          <h2
            id="business-audiences"
            className="emc-title-arc text-right font-display text-2xl font-black text-navy sm:text-3xl"
          >
            الجهات التي نعمل معها
          </h2>

          <ul className="mt-10">
            {AUDIENCES.map((audience, index) => (
              <li key={audience.id} className="emc-row py-7 sm:py-8">
                <div className="flex flex-col gap-2 pe-1 ps-4 text-right sm:flex-row sm:items-baseline sm:gap-8">
                  <span
                    aria-hidden
                    className="font-latin text-sm font-black tabular-nums text-customBlue sm:w-12"
                    dir="ltr"
                  >
                    {toLatinDigits(index + 1)}
                  </span>
                  <div className="sm:flex-1">
                    <h3 className="font-display text-xl font-black text-navy sm:text-2xl">
                      {audience.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-8 text-ink-500 sm:text-base">
                      {audience.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 2. البرامج المؤسسية — six short entries, no prices ── */}
        <section aria-labelledby="business-products" className="pt-16 sm:pt-20">
          <h2
            id="business-products"
            className="emc-title-arc text-right font-display text-2xl font-black text-navy sm:text-3xl"
          >
            البرامج المؤسسية
          </h2>
          <p className="mt-6 max-w-2xl text-right text-sm font-semibold leading-8 text-ink-500">
            ستة برامج مؤسسية. النطاق والكلفة يُحدَّدان بعد فهم حاجة فريقك، فلا يُعرض هنا رقم قبل ذلك.
          </p>

          <ul className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {INSTITUTIONAL_PRODUCTS.map((product) => (
              <li key={product.id} className="border-t border-line py-6 text-right">
                <span
                  aria-hidden
                  className="font-latin text-xs font-black tabular-nums text-customBlue"
                  dir="ltr"
                >
                  {toLatinDigits(product.id)}
                </span>
                <h3 className="mt-2 text-base font-black text-navy">{product.slot}</h3>
                {/* Approved name + one-line description land here — never invented copy */}
                <p className="mt-2 text-xs font-bold text-ink-400">{CATALOGUE_PENDING_NOTE}</p>
              </li>
            ))}
          </ul>
        </section>

        <div aria-hidden className="emc-hairline mt-16 sm:mt-20" />

        {/* ── 3. طلب التواصل ── */}
        <section aria-labelledby="business-inquiry" className="py-16 sm:py-20">
          <div className="text-right">
            <h2
              id="business-inquiry"
              className="emc-title-arc font-display text-2xl font-black text-navy sm:text-3xl"
            >
              اطلب تصوراً لفريقك
            </h2>
            <p className="mt-6 max-w-2xl text-sm font-semibold leading-8 text-ink-500 sm:text-base">
              خمسة حقول تكفينا لبدء المحادثة الصحيحة. {REPLY_PROMISE}.
            </p>
          </div>

          <div className="mt-10 max-w-xl">
            <BusinessInquiryForm />
          </div>
        </section>
      </div>
    </main>
  )
}
