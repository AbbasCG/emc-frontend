import { Link } from 'react-router'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import PublicSeo from '@/components/public/PublicSeo'

/**
 * /fellowship — §7.1 scaffolding. Honest, not decorative: the structure the
 * founder's specification calls for is here (dark selective header, one primary
 * decision, five stages, the ethics rule), and every line that must come from
 * the approved document is a labelled empty slot rather than invented copy.
 */

/**
 * SEAM — the official application form is not published yet. Until its slug is
 * supplied (it will be a `/forms/{slug}` route, the same one the public form
 * renderer serves), «قدّم طلبك» hands the applicant to the contact channel
 * instead of a fabricated destination.
 */
const APPLICATION_HREF = '/contact'

const SLOT_NOTE = 'يُستكمل من الوثيقة المعتمدة'

const STAGES = [
  { id: 1, ordinal: 'المرحلة الأولى' },
  { id: 2, ordinal: 'المرحلة الثانية' },
  { id: 3, ordinal: 'المرحلة الثالثة' },
  { id: 4, ordinal: 'المرحلة الرابعة' },
  { id: 5, ordinal: 'المرحلة الخامسة' },
] as const

export default function Fellowship() {
  return (
    <main dir="rtl" className="bg-white pb-24">
      <PublicSeo
        title="زمالة EMC المهنية في الذكاء الاصطناعي"
        description="زمالة EMC المهنية في الذكاء الاصطناعي: 16 أسبوعاً من العمل الحقيقي بإشراف خبراء، بالقبول فقط."
        path="/fellowship"
      />

      {/* Dark selective header — sea family only, never blended with the fire family */}
      <header className="emc-depth pt-28">
        <div className="mx-auto w-full max-w-4xl px-4 pb-16 text-right sm:px-6">
          <p className="text-xs font-black text-ice">بالقبول فقط</p>
          <h1 className="mt-3 font-display text-3xl font-black leading-tight text-white sm:text-4xl">
            زمالة EMC المهنية في الذكاء الاصطناعي
          </h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-ice">
            16 أسبوعاً من العمل الحقيقي بإشراف خبراء — بالقبول فقط
          </p>
          <Link
            to={APPLICATION_HREF}
            className="emc-focus-ring mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-customOrange text-base font-black text-white transition duration-250 ease-emc hover:brightness-[1.03] sm:w-auto sm:px-10"
          >
            قدّم طلبك
            <ArrowLeftIcon size={18} />
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        {/* ── الرحلة: خمس مراحل ─────────────────────────────────────────── */}
        <section className="pt-14">
          <h2 className="text-right font-display text-2xl font-black text-navy">مراحل الزمالة</h2>

          <ol className="mt-6 grid gap-4">
            {STAGES.map((stage) => (
              <li
                key={stage.id}
                className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5 text-right"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-sm font-black tabular-nums text-customBlue">
                  {String(stage.id)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-navy">{stage.ordinal}</h3>
                  {/* Official stage title + description — empty labelled slot until supplied */}
                  <p className="mt-2 text-xs font-bold text-muted-400">عنوان المرحلة ومخرجها: {SLOT_NOTE}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── قاعدة أخلاقية ─────────────────────────────────────────────── */}
        <section className="mt-12 rounded-2xl border border-ocean/30 bg-brand-50 p-5 text-right sm:p-6">
          <h2 className="font-display text-lg font-black text-navy">قاعدتنا الأخلاقية</h2>
          <p className="mt-3 text-sm font-semibold leading-8 text-ink-500">
            إن عمل الزملاء على مشروع تجاري حقيقي، فلهم مقابل موثّق — تعلم بالممارسة، لا عمالة
            مجانية.
          </p>
        </section>

        {/* ── معايير القبول ─────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-right font-display text-2xl font-black text-navy">معايير القبول</h2>
          {/* Admission criteria are catalogue content — labelled slot, never invented */}
          <p className="mt-3 text-right text-xs font-bold text-muted-400">{SLOT_NOTE}</p>
        </section>
      </div>
    </main>
  )
}
