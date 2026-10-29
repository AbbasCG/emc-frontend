import { initials } from './impactPointsUi'

const TONES = [
  'bg-brand-50 text-brand-600 ring-brand-100',
  'bg-accent-50 text-accent-700 ring-accent-100',
  'bg-slate-100 text-navy ring-slate-200',
]

/** Initials avatar. No photo is fetched: the list must stay light and carries no contact data. */
export default function PersonAvatar({ name, id, size = 'md' }: { name: string; id: number; size?: 'md' | 'lg' }) {
  const dimension = size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-black ring-1 ${dimension} ${TONES[id % TONES.length]}`}
    >
      {initials(name)}
    </span>
  )
}
