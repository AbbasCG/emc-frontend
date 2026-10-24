import type { ReconciliationCase } from '@/api/paymentReconciliationsApi'
import { TONE_CLASS, badgesOf } from './reconciliationLabels'

export default function ReconciliationBadges({ item }: { item: ReconciliationCase }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5" data-testid="case-badges">
      {badgesOf(item).map((b) => (
        <span key={b.key} data-badge={b.key} className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ring-inset ${TONE_CLASS[b.tone]}`}>
          {b.label}
        </span>
      ))}
    </span>
  )
}
