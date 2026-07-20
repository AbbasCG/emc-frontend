import { ArrowUpDown } from 'lucide-react'

type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
}

/** Compact sort dropdown — shared across learn tabs. */
export default function SortSelect<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="relative inline-flex items-center">
      <ArrowUpDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#22334A]/35" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="appearance-none rounded-xl border border-[#22334A]/10 bg-white py-2.5 pl-3 pr-8 text-[11px] font-black text-[#22334A] outline-none ring-1 ring-transparent transition focus:border-[#2691C2]/35 focus:ring-[#2691C2]/15"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
