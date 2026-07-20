export const WEEKDAYS_AR: Record<string, string> = {
  sunday: 'الأحد',
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
}

export const STATUS_AR: Record<string, string> = {
  draft: 'مسودة',
  ready: 'جاهزة',
  active: 'قيد التنفيذ',
  completed: 'مكتملة',
  archived: 'مؤرشفة',
}

export const STATUS_DOT: Record<string, string> = {
  draft: 'bg-slate-400',
  ready: 'bg-sky-500',
  active: 'bg-[#2691C2] animate-pulse',
  completed: 'bg-emerald-500',
  archived: 'bg-slate-400',
}

export const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80',
  ready: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/80',
  active: 'bg-[#2691C2]/10 text-[#22334A] ring-1 ring-[#2691C2]/25',
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80',
  archived: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/80',
}

export const CEFR_LEVELS = ['Starter', 'A1', 'A2', 'B1', 'B2', 'C1'] as const

export type StatusFilter = 'all' | 'active' | 'draft' | 'ready' | 'completed'

export const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'active', label: 'نشطة' },
  { id: 'ready', label: 'جاهزة' },
  { id: 'draft', label: 'مسودة' },
  { id: 'completed', label: 'مكتملة' },
]

/** EMC instructor surface tokens */
export const EMC = {
  radius: 'rounded-2xl',
  radiusLg: 'rounded-[16px]',
  card: 'rounded-[16px] border border-[#22334A]/[0.06] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
  cardHover:
    'transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2691C2]/20 hover:shadow-[0_12px_32px_-16px_rgba(38,145,194,0.22)]',
  navy: '#22334A',
  blue: '#2691C2',
  orange: '#EC943C',
} as const
