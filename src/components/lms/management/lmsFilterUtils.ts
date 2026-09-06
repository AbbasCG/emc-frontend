export function lmsSelectClass() {
  return 'h-10 rounded-xl border border-[#0C2A4B]/10 bg-[#f8fafc] px-3 text-[13px] font-bold text-[#0C2A4B] outline-none focus:ring-2 focus:ring-[#0077B6]/25'
}

export function countActiveFilters(values: unknown[]): number {
  return values.filter((v) => v !== '' && v != null && v !== false).length
}
