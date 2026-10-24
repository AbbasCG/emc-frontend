import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, ArrowDown, ArrowUp, Copy, GitBranch, GripVertical, Plus, Trash2 } from 'lucide-react'
import type { QuestionType } from '@/types/operations'
import type { Block } from './builderDoc'
import { toQuestion } from './builderDoc'
import InsertMenu from './InsertMenu'
import QuestionField from './QuestionField'
import { TYPE_SPECS } from './questionTypes'

export type SectionOption = { key: string; label: string }

export type BlockCardProps = {
  block: Block
  index: number
  selected: boolean
  issue: string | null
  /** A drop indicator for a block dragged in from the library: a bar above or below this card. */
  indicator: 'before' | 'after' | null
  dimmed: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  sections: SectionOption[]
  currentSectionKey: string | null
  readOnly: boolean
  /** The block's visibility rule said in words, or null when it always shows. */
  ruleSentence?: string | null
  /** How many other blocks have a rule that reads this one. */
  dependents?: number
  /** The rule cannot be published (it reads a later block, itself, or runs in a circle). */
  warned?: boolean
  /** For a step break: which step it opens. */
  stepNumber?: number | null
  onSelect: () => void
  onMove: (delta: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
  onInsert: (type: QuestionType, where: 'before' | 'after') => void
  onMoveToSection: (sectionKey: string | null) => void
}

const ACTION = 'inline-flex size-8 items-center justify-center rounded-lg text-deepBlue ring-1 ring-deepBlue/10 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-customBlue disabled:opacity-30'

/** One block on the canvas: drawn by the same field component the public form uses, with its handle and actions. */
export default function BlockCard(props: BlockCardProps) {
  const { block, selected, issue, indicator, dimmed, readOnly } = props
  const spec = TYPE_SPECS[block.type]
  const Icon = spec.icon
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: block.key, disabled: readOnly })
  const isSection = block.type === 'section'
  const question = toQuestion(block, props.index)
  const title = block.label.trim() || spec.label

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="block-card"
      data-block-key={block.key}
      data-block-type={block.type}
      data-selected={selected ? 'true' : undefined}
      className={`relative ${isDragging ? 'z-20 opacity-50' : ''} ${dimmed ? 'opacity-60' : ''}`}
    >
      {indicator === 'before' && <div aria-hidden data-testid="drop-indicator" className="absolute -top-2 inset-x-0 h-1 rounded-full bg-customOrange" />}
      <div
        role="group"
        aria-label={`${spec.label}: ${title}`}
        tabIndex={0}
        onClick={props.onSelect}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            props.onSelect()
          } else if (e.altKey && e.key === 'ArrowUp' && !readOnly) {
            e.preventDefault()
            props.onMove(-1)
          } else if (e.altKey && e.key === 'ArrowDown' && !readOnly) {
            e.preventDefault()
            props.onMove(1)
          }
        }}
        className={`rounded-2xl p-3 text-right outline-none ring-1 transition focus-visible:ring-2 focus-visible:ring-customBlue ${
          selected ? 'bg-white ring-2 ring-customBlue shadow-md' : isSection ? 'bg-customBlue/[0.06] ring-customBlue/20 hover:ring-customBlue/40' : 'bg-white ring-deepBlue/[0.08] hover:ring-customBlue/30'
        } ${isSection ? 'border-r-4 border-customBlue' : ''}`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {!readOnly && (
              <button
                ref={setActivatorNodeRef}
                type="button"
                aria-label={`اسحب لإعادة ترتيب «${title}»`}
                data-testid="drag-handle"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-deepBlue active:cursor-grabbing"
              >
                <GripVertical size={16} aria-hidden />
              </button>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
              <Icon size={12} aria-hidden />
              {spec.label}
            </span>
            {block.required && <span className="text-[11px] font-black text-customOrange">إلزامي</span>}
            {props.ruleSentence && (
              <span data-testid="rule-badge" title={props.ruleSentence} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${props.warned ? 'bg-amber-50 text-amber-900' : 'bg-sky-50 text-sky-800'}`}>
                {props.warned ? <AlertTriangle size={11} aria-hidden /> : <GitBranch size={11} aria-hidden />}
                شرطي
              </span>
            )}
            {(props.dependents ?? 0) > 0 && (
              <span data-testid="source-badge" className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-800">
                مصدر لـ {props.dependents} {props.dependents === 1 ? 'شرط' : 'شروط'}
              </span>
            )}
            {block.hasAnswers && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-800">لديه إجابات</span>}
          </div>

          {selected && !readOnly && (
            <div className="flex flex-wrap items-center justify-end gap-1" role="toolbar" aria-label="إجراءات العنصر" onClick={(e) => e.stopPropagation()}>
              <button type="button" aria-label="نقل للأعلى" title="نقل للأعلى" disabled={!props.canMoveUp} onClick={() => props.onMove(-1)} className={ACTION}>
                <ArrowUp size={14} aria-hidden />
              </button>
              <button type="button" aria-label="نقل للأسفل" title="نقل للأسفل" disabled={!props.canMoveDown} onClick={() => props.onMove(1)} className={ACTION}>
                <ArrowDown size={14} aria-hidden />
              </button>
              <InsertMenu label="إضافة قبل" onPick={(t) => props.onInsert(t, 'before')} className={ACTION}>
                <span aria-hidden className="inline-flex items-center"><Plus size={13} /><ArrowUp size={11} /></span>
              </InsertMenu>
              <InsertMenu label="إضافة بعد" onPick={(t) => props.onInsert(t, 'after')} className={ACTION}>
                <span aria-hidden className="inline-flex items-center"><Plus size={13} /><ArrowDown size={11} /></span>
              </InsertMenu>
              <button type="button" aria-label={isSection ? 'تكرار القسم' : 'تكرار'} title={isSection ? 'تكرار القسم بكل ما فيه' : 'تكرار'} onClick={props.onDuplicate} className={ACTION}>
                <Copy size={14} aria-hidden />
              </button>
              <button type="button" aria-label={isSection ? 'حذف القسم' : 'حذف'} title={isSection ? 'حذف القسم بكل ما فيه' : 'حذف'} onClick={props.onDelete} className={`${ACTION} text-red-600`}>
                <Trash2 size={14} aria-hidden />
              </button>
              {!isSection && props.sections.length > 0 && (
                <select
                  aria-label="نقل إلى قسم"
                  value={props.currentSectionKey ?? ''}
                  onChange={(e) => props.onMoveToSection(e.target.value === '' ? null : e.target.value)}
                  className="h-8 max-w-36 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-deepBlue"
                >
                  <option value="">بلا قسم</option>
                  {props.sections.map((s) => (
                    <option key={s.key} value={s.key}>{s.label || 'قسم بلا عنوان'}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {block.type === 'page_break' ? (
          <div className="flex items-center gap-3 py-2 text-[11px] font-black text-slate-500" data-testid="page-break-line">
            <span className="h-px flex-1 border-t-2 border-dashed border-slate-300" />
            {props.stepNumber ? `بداية الخطوة ${props.stepNumber}${block.label.trim() ? `: ${block.label.trim()}` : ''}` : 'ينتقل ما بعد هذا الفاصل إلى صفحة جديدة'}
            <span className="h-px flex-1 border-t-2 border-dashed border-slate-300" />
          </div>
        ) : (
          <div className="pointer-events-none select-none" aria-hidden={false}>
            <QuestionField q={question} fieldId={`canvas-${block.key}`} value={undefined} onChange={() => undefined} disabled />
          </div>
        )}

        {props.ruleSentence && selected && <p data-testid="rule-sentence-card" className="mt-2 rounded-lg bg-sky-50 px-3 py-1.5 text-[11px] font-bold leading-5 text-sky-900">{props.ruleSentence}</p>}

        {issue && (
          <p role="alert" data-testid="block-issue" className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
            {issue}
          </p>
        )}
      </div>
      {indicator === 'after' && <div aria-hidden data-testid="drop-indicator" className="absolute -bottom-2 inset-x-0 h-1 rounded-full bg-customOrange" />}
    </div>
  )
}
