export default function DateRangeFilter({
  from,
  to,
  onChange,
  onApply,
}: {
  from: string
  to: string
  onChange: (next: { from: string; to: string }) => void
  onApply: () => void
}) {
  return (
    <div dir="rtl" className="flex flex-wrap items-end justify-end gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-deepBlue/[0.06]">
      <label className="grid gap-1 text-[11px] font-black text-deepBlue">
        من
        <input
          type="date"
          value={from}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold"
        />
      </label>
      <label className="grid gap-1 text-[11px] font-black text-deepBlue">
        إلى
        <input
          type="date"
          value={to}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold"
        />
      </label>
      <button
        type="button"
        onClick={onApply}
        className="rounded-xl bg-customOrange px-4 py-2 text-[11px] font-black text-white shadow-sm"
      >
        تطبيق
      </button>
    </div>
  )
}
