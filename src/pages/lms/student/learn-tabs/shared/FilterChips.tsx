type Option<T extends string> = { value: T; label: string; count?: number }

type Props<T extends string> = {
  options: Option<T>[]
  active: T
  onChange: (v: T) => void
}

/** Small segmented filter bar — shared visual language across learn tabs. */
export default function FilterChips<T extends string>({ options, active, onChange }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isActive = opt.value === active
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
              isActive
                ? 'bg-[#0C2A4B] text-white shadow-sm'
                : 'border border-[#0C2A4B]/10 bg-white text-[#0C2A4B]/60 hover:border-[#0077B6]/25 hover:text-[#0C2A4B]'
            }`}
          >
            {opt.label}
            {opt.count != null && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums leading-none ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
