import { Link } from 'react-router'
import ArrowLeftIcon from '@/components/ui/ArrowLeftIcon'
import { toLatinDigits } from '@/utils/publicDetailFormat'

/**
 * EMC-WEB-001 §4 — the five stations of the EMC journey, L0 to L4.
 *
 * One rail, five stations: vertical on mobile, horizontal from `lg` up. The rail
 * is a 2px ocean line and the stations are numbered dots in Latin numerals; the
 * final station (الزمالة) is the only one filled in solid customOrange, because
 * it is the end of the road, not a decoration.
 *
 * Design Language 2.0: typography and hairlines carry the structure. No boxes,
 * no shadows, no emoji, and every arrow is the shared inline `ArrowLeftIcon`.
 */

/**
 * SEAM — المعسكرات have no published catalogue route yet, so this station is
 * itself the destination (`/learn#camps`, the anchor below) and its button hands
 * the visitor to the contact channel rather than a fabricated page. The same
 * convention `/fellowship` uses for its application seam. When the camps route
 * is published, replace this constant with it.
 */
const CAMPS_ENQUIRY_HREF = '/contact'

type Station = {
  /** §4 station id — displayed as-is (already Latin). */
  id: string
  /** Anchor target, when the station is a link destination in its own right. */
  anchor?: string
  name: string
  /** الجملة — one sentence, no more. */
  sentence: string
  /** «لمن؟» — the single audience line. */
  who: string
  /** الزر — a catalogue destination, never a named product. */
  cta: { label: string; href: string }
}

const levels: Station[] = [
  {
    id: 'L0',
    name: 'الورش المجانية',
    sentence: 'جلسة واحدة ترى فيها المجال بيدك، دون أن تدفع شيئاً.',
    who: 'لمن لم يبدأ بعد ويريد أن يحكم بنفسه قبل أن يلتزم.',
    cta: { label: 'استكشف الورش المجانية', href: '/workshops' },
  },
  {
    id: 'L1',
    anchor: 'camps',
    name: 'المعسكرات',
    sentence: 'أيام مكثّفة متتابعة تبني فيها أول ناتج حقيقي باسمك.',
    who: 'لمن جرّب الأدوات ويريد تجربة قصيرة تُنهيها بنتيجة ملموسة.',
    cta: { label: 'تواصل مع الفريق', href: CAMPS_ENQUIRY_HREF },
  },
  {
    id: 'L2',
    name: 'الدورات',
    sentence: 'دورة واحدة تتقن فيها مهارة عملية وتنهيها بمشروع تنشره.',
    who: 'لمن حسم اتجاهه ويريد عمقاً في مهارة واحدة.',
    cta: { label: 'استكشف الدورات', href: '/courses' },
  },
  {
    id: 'L3',
    name: 'المسارات',
    sentence: 'دورات مرتّبة في تسلسل واحد تنقلك من الأساس إلى ملف أعمال كامل.',
    who: 'لمن يريد تحوّلاً مهنياً لا مهارة مفردة.',
    cta: { label: 'استكشف المسارات', href: '/learning-paths' },
  },
  {
    id: 'L4',
    name: 'الزمالة',
    sentence: '16 أسبوعاً من العمل الحقيقي بإشراف خبراء — بالقبول فقط.',
    who: 'لمن يعمل في المجال ويريد أثراً موثّقاً لا شهادة إضافية.',
    cta: { label: 'تعرّف على الزمالة', href: '/fellowship' },
  },
]

export default function JourneyTimeline() {
  return (
    <section aria-labelledby="journey-heading" className="mt-16 text-right">
      <h2 id="journey-heading" className="font-display text-2xl font-black text-navy sm:text-3xl">
        محطات الرحلة
      </h2>
      <p className="mt-3 max-w-2xl text-sm font-semibold leading-8 text-ink-500">
        خمس محطات، كل واحدة منها نقطة دخول قائمة بذاتها. تختار المحطة التي تصفك اليوم، لا المحطة
        الأولى.
      </p>

      <div aria-hidden className="emc-hairline mt-8" />

      <ol className="relative mt-10 lg:grid lg:grid-cols-5 lg:gap-0">
        {levels.map((station, index) => {
          const isLast = index === levels.length - 1

          return (
            <li
              key={station.id}
              id={station.anchor}
              className="relative scroll-mt-28 pb-10 ps-12 text-right lg:pb-0 lg:pe-8 lg:ps-0 lg:pt-12"
            >
              {/* The rail — one segment per station, so it stops exactly at L4. */}
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute bottom-0 start-[11px] top-7 w-0.5 bg-ocean/30 lg:-end-3 lg:bottom-auto lg:start-7 lg:top-[11px] lg:h-0.5 lg:w-auto"
                />
              )}

              {/* Station dot — Latin numeral; the final station is solid customOrange. */}
              <span
                aria-hidden
                className={[
                  'absolute start-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-black tabular-nums',
                  isLast ? 'border-customOrange bg-customOrange text-white' : 'border-ocean bg-white text-ocean',
                ].join(' ')}
              >
                {toLatinDigits(index)}
              </span>

              <p className="font-latin text-[11px] font-black tracking-[0.18em] text-ocean">
                {toLatinDigits(station.id)}
              </p>
              <h3 className="mt-1 font-display text-xl font-black leading-snug text-navy">
                {station.name}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-ink-500">{station.sentence}</p>
              <p className="mt-2 text-xs font-bold leading-6 text-ink-400">لمن؟ {station.who}</p>

              <Link
                to={station.cta.href}
                className="emc-cta-line emc-focus-ring mt-4 text-sm"
              >
                {station.cta.label}
                <ArrowLeftIcon size={14} />
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
