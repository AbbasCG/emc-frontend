import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { FORM_TYPE_AR } from '@/data/operationsLabels'
import type { FormTypeSlug, QuestionType } from '@/types/operations'
import BlockCard from './BlockCard'
import { dependentsOf, describeBlockRule, ruleWarnings, sectionOf, stepGroups } from './builderDoc'
import type { BuilderDoc } from './builderDoc'
import type { MetaPatch } from './builderState'
import { CANVAS_END } from './dropResolver'
import InsertMenu from './InsertMenu'

export type DropIndicator = { key: string; position: 'before' | 'after' } | null

type Props = {
  doc: BuilderDoc
  selectedKey: string | null
  issues: Record<string, string>
  indicator: DropIndicator
  /** While a whole section is dragged, what is inside it is dimmed. */
  draggingSectionKey: string | null
  readOnly: boolean
  titleError?: string
  onSelect: (key: string | null) => void
  onMeta: (patch: MetaPatch, field: string) => void
  onMove: (key: string, delta: -1 | 1) => void
  onDuplicate: (key: string) => void
  onDelete: (key: string) => void
  onInsertAt: (type: QuestionType, index: number) => void
  onMoveToSection: (key: string, sectionKey: string | null) => void
}

function EndZone({ empty, children }: { empty: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_END })

  return (
    <div
      ref={setNodeRef}
      data-testid="canvas-end"
      className={`flex min-h-24 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-4 text-center transition ${
        isOver ? 'border-customOrange bg-customOrange/10' : 'border-slate-200 bg-white/60'
      } ${empty ? 'min-h-56' : ''}`}
    >
      {children}
    </div>
  )
}

/** The form itself: its title and description, then every block in order. The place blocks are dropped and reordered. */
export default function BuilderCanvas(props: Props) {
  const { doc, selectedKey, issues, indicator, draggingSectionKey, readOnly } = props
  const sections = doc.blocks.filter((b) => b.type === 'section').map((b) => ({ key: b.key, label: b.label }))
  const empty = doc.blocks.length === 0
  const warnings = ruleWarnings(doc.blocks)
  const stepNumbers = new Map(stepGroups(doc.blocks).map((g, i) => [g.breakKey, i + 1]))

  return (
    <section aria-label="لوحة النموذج" data-testid="builder-canvas" className="min-w-0 space-y-3">
      <div className="space-y-3 rounded-2xl bg-white p-4 text-right shadow-sm ring-1 ring-deepBlue/[0.06]">
        <label className="grid gap-1">
          <span className="text-[11px] font-black text-slate-500">عنوان النموذج</span>
          <input
            value={doc.title}
            readOnly={readOnly}
            onChange={(e) => props.onMeta({ title: e.target.value }, 'title')}
            aria-invalid={props.titleError ? true : undefined}
            placeholder="مثال: استبيان رضا المتدربين"
            className="rounded-xl border border-transparent bg-slate-50 px-3 py-2 text-lg font-black text-deepBlue outline-none focus:border-customBlue"
          />
          {props.titleError && <span role="alert" className="text-xs font-bold text-red-700">{props.titleError}</span>}
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-black text-slate-500">وصف النموذج</span>
          <textarea
            value={doc.description}
            readOnly={readOnly}
            rows={2}
            onChange={(e) => props.onMeta({ description: e.target.value }, 'description')}
            placeholder="جملة أو جملتان تشرحان الغرض من النموذج"
            className="resize-none rounded-xl border border-transparent bg-slate-50 px-3 py-2 text-sm font-semibold text-deepBlue outline-none focus:border-customBlue"
          />
        </label>
        <label className="grid max-w-xs gap-1">
          <span className="text-[11px] font-black text-slate-500">نوع النموذج</span>
          <select
            value={doc.formType}
            disabled={readOnly}
            onChange={(e) => props.onMeta({ formType: e.target.value as FormTypeSlug }, 'formType')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-deepBlue"
          >
            {(Object.keys(FORM_TYPE_AR) as FormTypeSlug[]).map((k) => (
              <option key={k} value={k}>{FORM_TYPE_AR[k]}</option>
            ))}
            {!(doc.formType in FORM_TYPE_AR) && <option value={doc.formType}>{doc.formType}</option>}
          </select>
        </label>
      </div>

      <SortableContext items={doc.blocks.map((b) => b.key)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3" role="list" aria-label="عناصر النموذج">
          {doc.blocks.map((block, index) => {
            const section = sectionOf(doc.blocks, block.key)

            return (
              <div role="listitem" key={block.key}>
                <BlockCard
                  block={block}
                  index={index}
                  selected={selectedKey === block.key}
                  issue={issues[block.key] ?? null}
                  indicator={indicator?.key === block.key ? indicator.position : null}
                  dimmed={draggingSectionKey !== null && section?.key === draggingSectionKey && block.key !== draggingSectionKey}
                  canMoveUp={index > 0}
                  canMoveDown={index < doc.blocks.length - 1}
                  sections={sections}
                  currentSectionKey={section?.key ?? null}
                  readOnly={readOnly}
                  ruleSentence={block.logic ? describeBlockRule(doc.blocks, block) : null}
                  dependents={dependentsOf(doc.blocks, block.key).length}
                  warned={(warnings[block.key] ?? []).length > 0}
                  stepNumber={block.type === 'page_break' ? (stepNumbers.get(block.key) ?? null) : null}
                  onSelect={() => props.onSelect(block.key)}
                  onMove={(delta) => props.onMove(block.key, delta)}
                  onDuplicate={() => props.onDuplicate(block.key)}
                  onDelete={() => props.onDelete(block.key)}
                  onInsert={(type, where) => props.onInsertAt(type, where === 'before' ? index : index + 1)}
                  onMoveToSection={(sectionKey) => props.onMoveToSection(block.key, sectionKey)}
                />
              </div>
            )
          })}
        </div>
      </SortableContext>

      <EndZone empty={empty}>
        {empty ? (
          <>
            <p className="text-sm font-black text-deepBlue">النموذج فارغ</p>
            <p className="max-w-sm text-xs font-semibold leading-6 text-slate-500">
              ابدأ بإضافة سؤال: اضغط عنصراً من المكتبة، أو اسحبه إلى هنا. يمكنك إضافة أقسام لتنظيم الأسئلة وفواصل صفحات لتقسيم النموذج.
            </p>
          </>
        ) : (
          <p className="text-[11px] font-bold text-slate-400">أفلت هنا لإضافة العنصر في النهاية</p>
        )}
        {!readOnly && (
          <InsertMenu
            label="إضافة عنصر"
            testId="add-block"
            onPick={(type) => props.onInsertAt(type, doc.blocks.length)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue px-4 py-2 text-xs font-black text-white shadow-md hover:opacity-90"
          >
            <Plus size={14} aria-hidden />
            إضافة عنصر
          </InsertMenu>
        )}
      </EndZone>
    </section>
  )
}
