export const SESSION_STATUS_LABEL: Record<string, string> = {
  scheduled: 'مجدولة', live: 'مباشرة', completed: 'منتهية', cancelled: 'ملغاة', missed: 'فائتة', archived: 'مؤرشفة',
}

export const SESSION_STATUS_CLS: Record<string, string> = {
  scheduled: 'bg-sky-50 text-sky-700', live: 'bg-emerald-50 text-emerald-700', completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-50 text-red-700', missed: 'bg-amber-50 text-amber-700', archived: 'bg-slate-200 text-slate-500',
}

export function sessionStatusLabel(status: string): string {
  return SESSION_STATUS_LABEL[status] ?? status
}
