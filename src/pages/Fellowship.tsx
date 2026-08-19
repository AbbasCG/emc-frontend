import PublicSeo from '@/components/public/PublicSeo'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import FellowshipStages from '@/components/fellowship/FellowshipStages'
import FellowshipApplicationForm from '@/components/fellowship/FellowshipApplicationForm'
import { toLatinDigits } from '@/utils/publicDetailFormat'

/**
 * /fellowship — EMC-WEB-001 §7.1, in full.
 *
 * The tone is the whole point: the fellowship is applied to, never sold. So the
 * page carries ONE action («قدّم طلبك»), states the commitment before it states
 * anything attractive, and prints the ethics rule at full size instead of hiding
 * it in the small print.
 *
 * §11 — nothing unapproved is displayed. Two blocks are therefore deliberately
 * ABSENT rather than filled with plausible text: the three first-cohort
 * specialisations (no catalogue) and the founding price (no confirmed figure).
 * Neither shows «قريباً»; a field without an approved value simply does not exist.
 *
 * Design Language 2.0: editorial rows, hairlines and typography. The only boxes on
 * the page are the form fields, and there is not a single shadow.
 */

/**
 * §7.1(d) — «التخصصات الثلاثة للدفعة الأولى».
 *
 * The official catalogue has not arrived. This slot stays EMPTY: it renders
 * nothing at all until a data source supplies the specialisations, because
 * inventing three plausible AI tracks would be exactly the failure §11 forbids.
 * Wiring it later is one line — replace this array with the approved source
 * (a `src/data` module or an API list) and the section appears as designed.
 */
type Specialisation = { id: string; name: string }

const FIRST_COHORT_SPECIALISATIONS: Specialisation[] = []

function FirstCohortSpecialisations() {
  if (FIRST_COHORT_SPECIALISATIONS.length === 0) return null

  return (
    <section className="mt-20 text-right">
      <h2 className="font-display text-2xl font-black text-navy sm:text-3xl">
        تخصصات الدفعة الأولى
      </h2>
      <ul className="mt-8 border-t border-line">
        {FIRST_COHORT_SPECIALISATIONS.map((item) => (
          <li key={item.id} className="emc-row px-1 py-6">
            <p className="font-display text-lg font-black leading-snug text-navy">{item.name}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * §7.1(g) — سعر التأسيس.
 *
 * No approved figure exists anywhere in this repository (searched `src/`, `docs/`
 * and the API surface: there is no fellowship price, product or catalogue entry).
 * The founder must confirm the number in writing before it is displayed, so the
 * constant stays `null` and the entire price block — including the sponsored-seats
 * line that belongs next to it — is ABSENT. Fill the object in, and the block
 * renders exactly where §7.1 puts it: quietly, near the bottom.
 */
type FoundingPrice = { amount: number; currencyLabel: string }

/* The assertion keeps the declared union at every use site: a bare `= null` would
   let the compiler narrow the constant to `null` and make the block below dead. */
const FOUNDING_PRICE = null as FoundingPrice | null

/** §7.1(c) — the three groups we accept. Nothing is added to what was approved. */
const ACCEPTED_GROUPS: Array<{ title: string; note?: string }> = [
  { title: 'خريجو مسارات EMC', note: 'قبول متسارع' },
  { title: 'مهندسون ومطورون بملف أعمال' },
  { title: 'طلاب دراسات عليا وباحثون' },
]

export default function Fellowship() {
  return (
    <main dir="rtl" className="bg-white pb-24">
      <PublicSeo
        title="زمالة EMC المهنية في الذكاء الاصطناعي"
        description="زمالة EMC المهنية في الذكاء الاصطناعي: ستة عشر أسبوعاً من العمل الحقيقي بإشراف خبراء، بالقبول فقط."
        path="/fellowship"
      />

      {/* ── (a) الترويسة dark, sea-family field (emc-dawn). One decision only. ── */}
      <header className="emc-dawn pt-28">
        <div className="mx-auto w-full max-w-5xl px-4 pb-16 text-right sm:px-6">
          <p className="text-xs font-black tracking-[0.18em] text-ice">الزمالة</p>

          <h1 className="mt-5 font-display text-3xl font-black leading-tight text-white sm:text-4xl lg:text-[2.75rem]">
            زمالة EMC المهنية في الذكاء الاصطناعي
          </h1>

          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-ice">
            {`${toLatinDigits(16)} أسبوعاً من العمل الحقيقي بإشراف خبراء بالقبول فقط`}
          </p>

          <a
            href="#fellowship-apply"
            className="emc-focus-ring mt-9 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:brightness-[1.03] sm:w-auto sm:px-10"
          >
            قدّم طلبك
            <ArrowLeftIcon size={18} />
          </a>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {/* ── (b) الفارق ─────────────────────────────────────────────────── */}
        <section className="pt-16 text-right">
          <div aria-hidden className="emc-tricolor" />

          <h2 className="mt-8 font-display text-2xl font-black text-navy sm:text-3xl">الفارق</h2>

          <p className="mt-5 max-w-3xl font-display text-xl font-black leading-relaxed text-navy sm:text-2xl">
            المسار يعلّمك كيف تعمل. الزمالة تجعلك تعمل فعلياً.
          </p>

          <FellowshipStages />
        </section>

        {/* ── (c) من نقبل ────────────────────────────────────────────────── */}
        <section className="mt-20 text-right">
          <div aria-hidden className="emc-hairline" />

          <h2 className="mt-9 font-display text-2xl font-black text-navy sm:text-3xl">من نقبل</h2>

          <p className="mt-4 max-w-2xl text-sm font-semibold leading-8 text-ink-500">
            الالتحاق بالقبول فقط، وثلاث خلفيات تدخل التقييم:
          </p>

          <ul className="mt-8 border-t border-line">
            {ACCEPTED_GROUPS.map((group) => (
              <li key={group.title} className="emc-row px-1 py-6">
                <p className="font-display text-lg font-black leading-snug text-navy">
                  {group.title}
                </p>
                {group.note ?
                  <p className="mt-2 text-sm font-bold text-ocean">{group.note}</p>
                : null}
              </li>
            ))}
          </ul>

          <p className="mt-8 max-w-2xl text-sm font-semibold leading-8 text-ink-500">
            الالتزام المطلوب منك واضح ومعلن قبل أن تتقدم:{' '}
            <span className="font-black text-navy">{`${toLatinDigits('12–15')} ساعة أسبوعياً`}</span>
            .
          </p>
        </section>

        {/* ── (d) تخصصات الدفعة الأولى empty slot: renders nothing (§11). ── */}
        <FirstCohortSpecialisations />

        {/* ── (e) يوم العرض ──────────────────────────────────────────────── */}
        <section className="mt-20 text-right">
          <div aria-hidden className="emc-hairline" />

          <h2 className="mt-9 font-display text-2xl font-black text-navy sm:text-3xl">يوم العرض</h2>

          <p className="mt-5 max-w-3xl text-sm font-semibold leading-8 text-ink-500">
            تختم الزمالة بيوم واحد تعرض فيه ما بنيته أمام حضور مدعوّ من شركات وجامعات: عرض قصير،
            ثم أسئلة مباشرة على قراراتك الهندسية وعلى نتيجتك الموثّقة، لا على شرائح العرض.
          </p>

          <p className="mt-5 max-w-3xl text-sm font-semibold leading-8 text-ink-500">
            لا نعلن اسم أي شركة أو جامعة قبل توقيع مشاركتها. حين يُوقَّع، يظهر الاسم هنا.
          </p>
        </section>

        {/* ── (f) القاعدة الأخلاقية verbatim, at full size. ────────────── */}
        <section className="mt-20 text-right">
          <div aria-hidden className="emc-hairline" />

          <p className="mt-9 text-xs font-black tracking-[0.18em] text-ocean">قاعدة أخلاقية</p>

          <p className="mt-4 max-w-3xl font-display text-xl font-black leading-relaxed text-navy sm:text-2xl">
            إن عمل الزملاء على مشروع تجاري حقيقي، فلهم مقابل موثّق تعلم بالممارسة، لا عمالة
            مجانية.
          </p>

          <div aria-hidden className="emc-rule-orange" />
        </section>

        {/* ── (g) سعر التأسيس ABSENT until the founder confirms the figure. ── */}
        {FOUNDING_PRICE ?
          <section className="mt-20 text-right">
            <div aria-hidden className="emc-hairline" />
            <h2 className="mt-9 text-sm font-black text-ink-400">سعر التأسيس</h2>
            <p className="emc-stat-num mt-3 text-3xl sm:text-4xl">
              {`${toLatinDigits(FOUNDING_PRICE.amount)} ${FOUNDING_PRICE.currencyLabel}`}
            </p>
            <p className="mt-3 text-sm font-semibold text-ink-500">مقاعد مدعومة محدودة برعاية</p>
          </section>
        : null}

        {/* ── (h) نموذج التقدّم ──────────────────────────────────────────── */}
        <section id="fellowship-apply" className="mt-20 scroll-mt-28 text-right">
          <div aria-hidden className="emc-hairline" />

          <h2 className="mt-9 font-display text-2xl font-black text-navy sm:text-3xl">قدّم طلبك</h2>

          <p className="mt-4 max-w-2xl text-sm font-semibold leading-8 text-ink-500">
            سبعة حقول تفتح ملفك. اكتب بإيجاز ودقّة: نقرأ الطلبات بأنفسنا، وأول ما نقرأه هو ما
            أنجزته لا ما تنوي إنجازه.
          </p>

          <FellowshipApplicationForm />
        </section>
      </div>
    </main>
  )
}
