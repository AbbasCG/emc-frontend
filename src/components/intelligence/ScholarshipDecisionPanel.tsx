import type { ScholarshipApplication, ScholarshipStatus } from '@/types/intelligence'

const AR: Record<ScholarshipStatus, string> = {
  pending: 'قيد المراجعة',
  accepted: 'مقبولة',
  rejected: 'مرفوضة',
}

export default function ScholarshipDecisionPanel({
  row,
  busy,
  onDecision,
}: {
  row: ScholarshipApplication
  busy?: boolean
  onDecision: (id: number, status: ScholarshipStatus) => Promise<void>
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-deepBlue/[0.06] pt-4">
      <span className="rounded-full bg-deepBlue/[0.06] px-3 py-1 text-[10px] font-black text-deepBlue">{AR[row.status]}</span>
      {row.status === 'pending' && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecision(row.id, 'rejected')}
            className="rounded-xl bg-red-50 px-4 py-2 text-[11px] font-black text-red-800 ring-1 ring-red-100 disabled:opacity-50"
          >
            رفض
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecision(row.id, 'accepted')}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-[11px] font-black text-white shadow-sm disabled:opacity-50"
          >
            قبول
          </button>
        </>
      )}
    </div>
  )
}
