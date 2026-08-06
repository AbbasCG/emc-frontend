/** Shared EMC wizard visual tokens — align with Submit Workshop & brand */
export const EMC_WIZARD_GLASS_CARD =
  'rounded-[1.65rem] border border-white/70 bg-white/75 shadow-[0_20px_60px_-18px_rgba(34,51,74,0.14)] backdrop-blur-md ring-1 ring-slate-200/45'

export const EMC_WIZARD_HEADER_GRADIENT =
  'relative overflow-hidden rounded-[1.65rem] border border-white/80 bg-gradient-to-l from-[#22334A] via-[#1a2940] to-[#0F172A] px-5 py-7 text-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] sm:px-8 sm:py-8'

export const EMC_WIZARD_INPUT_BASE =
  'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-[#22334A] outline-none transition focus:border-[#2691C2]/45 focus:ring-2 focus:ring-[#2691C2]/15'

export const EMC_WIZARD_PROGRESS_GRADIENT = 'bg-gradient-to-l from-[#2691C2] to-[#EC943C]'

export const emcWizardStepAnimation = {
  initial: { opacity: 0, x: -18 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 18 },
  transition: { duration: 0.26, ease: [0.22, 0.61, 0.36, 1] as const },
}
