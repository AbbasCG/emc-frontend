import type { InstructorPlacementTestRow } from '@/api/placementApi'
import { PIPELINE_STAGES, type PipelineStageId } from './constants'
import { PlacementPipelineCard } from './PlacementPipelineCard'

type Props = {
  stageId: PipelineStageId
  rows: InstructorPlacementTestRow[]
  selectedId: number | null
  onSelect: (row: InstructorPlacementTestRow) => void
  onViewDetails: (row: InstructorPlacementTestRow) => void
  onReviewWritten: (row: InstructorPlacementTestRow) => void
  onReviewOral: (row: InstructorPlacementTestRow) => void
}

export function PlacementPipelineSection({
  stageId,
  rows,
  selectedId,
  onSelect,
  onViewDetails,
  onReviewWritten,
  onReviewOral,
}: Props) {
  if (!rows.length) return null

  const stage = PIPELINE_STAGES.find((s) => s.id === stageId)!

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
        <h3 className="text-[13px] font-black text-deepBlue">{stage.label}</h3>
        <span className="rounded-full bg-[#0C2A4B]/8 px-2 py-0.5 font-mono text-[11px] font-black tabular-nums text-deepBlue/60">
          {rows.length}
        </span>
        <span className="hidden text-[10px] font-semibold text-deepBlue/35 sm:inline">— {stage.description}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {rows.map((row, i) => (
          <PlacementPipelineCard
            key={`${row.attempt_id}-${row.student_id}`}
            row={row}
            index={i}
            selected={selectedId === row.student_id}
            onSelect={() => onSelect(row)}
            onViewDetails={() => onViewDetails(row)}
            onReviewWritten={() => onReviewWritten(row)}
            onReviewOral={() => onReviewOral(row)}
          />
        ))}
      </div>
    </section>
  )
}
