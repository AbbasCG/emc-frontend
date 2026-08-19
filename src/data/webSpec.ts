import { toLatinDigits } from '@/utils/publicDetailFormat'

/**
 * EMC-WEB-001 v1.0 — the founder's interface specification, in ONE place.
 *
 * Every public product surface (course cards, course detail, learning-path cards
 * and detail, checkout) imports these strings instead of re-typing them, so the
 * promise the visitor reads is literally the same text everywhere.
 *
 * Spec laws encoded here:
 *   • §1.3 — paid products never show a date. They show «تسجيل مفتوح».
 *   • §1.3 — urgency comes from SEATS, never from a countdown, and only when a
 *     real remaining-seats number exists (see `seatsLine`, which returns null
 *     rather than inventing one).
 *   • §8   — the launch promise and the guarantee line are rendered verbatim on
 *     every paid product page and at checkout.
 *   • §11  — a price is never bare: the upgrade coupon is one of its contexts.
 */

/** §8 — verbatim on every paid product page and at checkout. Never paraphrase. */
export const LAUNCH_PROMISE =
  'مقعدك مؤكد فور الدفع. تبدأ دفعتك خلال 30 يوماً كحد أقصى للدورات، و45 يوماً للمسارات وغالباً أقرب. إن لم ننطلق في الموعد، تسترجع كامل المبلغ أو تحتفظ بمقعدك للدفعة التالية قرارك أنت.'

/** §8 — the guarantee line, rendered directly under the launch promise. */
export const REFUND_LINE = 'استرجاع كامل خلال 7 أيام من انطلاق الدفعة.'

/** §1.3 — the badge that replaces every start date on a paid product. */
export const OPEN_ENROLLMENT_LABEL = 'تسجيل مفتوح'

/** §11 — one of the sanctioned price contexts (course value carries into the path). */
export const UPGRADE_COUPON_NOTE =
  'أنهيتَ الدورة؟ قيمتها كاملة تُخصم من سعر المسار خلال 60 يوماً'

/**
 * §1.3 — seats urgency. Returns the line ONLY when a real number is available;
 * `null` (render nothing) for null / undefined / non-finite input. Scarcity is
 * never manufactured, so callers must not substitute a fallback string.
 */
export function seatsLine(n: number | null | undefined): string | null {
  if (n == null || typeof n !== 'number' || !Number.isFinite(n)) return null
  return `متبقي ${toLatinDigits(Math.round(n))} مقاعد في الدفعة القادمة`
}
