import { ArrowDown, ArrowUp, GitBranch, Plus, Trash2 } from 'lucide-react'
import { blockName, stepGroups } from './builderDoc'
import type { Block, BuilderDoc } from './builderDoc'
import { isStructural } from './questionTypes'

const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-deepBlue outline-none focus:border-customBlue disabled:opacity-60'

type Props = {
  doc: BuilderDoc
  selectedKey: string | null
  readOnly: boolean
  onSelect: (key: string) => void
  onAddStep: () => void
  onTitleFirstStep: () => void
  onMoveStep: (breakKey: string, delta: -1 | 1) => void
  onRemoveStep: (breakKey: string) => void
  onMoveToStep: (key: string, stepKey: string) => void
  onEditStep: (breakKey: string, patch: { label?: string; description?: string }, field: string) => void
  onToggleReview: (on: boolean) => void
  /** Opens the Logic panel on this step's break, where its visibility rule is written. */
  onOpenRule: (breakKey: string) => void
}

/**
 * Steps: the stages a respondent moves through. A step is a break and what follows it; here they are created, titled, described,
 * reordered, and questions are moved between them. Whether a step is shown at all is its visibility rule (Logic panel).
 * A last review page, listing every answer before the final send, is switched on here.
 */
export default function StepsPanel(props: Props) {
  const { doc, readOnly } = props
  const groups = stepGroups(doc.blocks)
  const first = groups[0]
  const hasImplicitFirst = first?.breakKey === null
  const lowest = hasImplicitFirst ? 1 : 0
  const questionsOf = (blocks: Block[]) => blocks.filter((b) => b.type !== 'page_break')

  return (
    <aside aria-label="الخطوات" data-testid="steps-panel" className="space-y-4 rounded-2xl bg-white p-4 text-right ring-1 ring-deepBlue/[0.06]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-deepBlue">خطوات النموذج</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{groups.length <= 1 ? 'صفحة واحدة' : `${groups.length} خطوات`}</span>
      </div>
      <p className="text-[11px] font-bold leading-5 text-slate-500">قسّم النموذج إلى خطوات يتنقل بينها المجيب. لا يُرسل شيء قبل نهاية الخطوات، ويُتحقق من إجابات كل خطوة قبل الانتقال منها.</p>

      <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-black text-deepBlue">
        <span>صفحة مراجعة قبل الإرسال</span>
        <input type="checkbox" role="switch" aria-label="عرض صفحة مراجعة قبل الإرسال" checked={Boolean(doc.reviewStep)} disabled={readOnly} onChange={(e) => props.onToggleReview(e.target.checked)} className="size-4 accent-customBlue" />
      </label>

      <ol className="space-y-3" aria-label="قائمة الخطوات" data-testid="steps-list">
        {groups.map((g, i) => {
          const isBreak = g.breakBlock !== null
          const number = i + 1
          const title = g.breakBlock?.label.trim() ?? ''

          return (
            <li key={g.key} data-testid="step-item" data-step-key={g.key} className={`space-y-2 rounded-2xl p-3 ring-1 ${props.selectedKey === g.breakKey ? 'bg-brand-50 ring-customBlue' : 'bg-slate-50 ring-deepBlue/[0.05]'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-deepBlue">الخطوة {number}{title ? ` — ${title}` : isBreak ? '' : ' (بلا عنوان)'}</span>
                {isBreak && !readOnly && (
                  <span className="flex items-center gap-1">
                    <button type="button" aria-label={`نقل الخطوة ${number} للأعلى`} disabled={i <= lowest} onClick={() => props.onMoveStep(g.breakKey as string, -1)} className="inline-flex size-7 items-center justify-center rounded-lg text-deepBlue ring-1 ring-deepBlue/10 hover:bg-white disabled:opacity-30">
                      <ArrowUp size={13} aria-hidden />
                    </button>
                    <button type="button" aria-label={`نقل الخطوة ${number} للأسفل`} disabled={i >= groups.length - 1} onClick={() => props.onMoveStep(g.breakKey as string, 1)} className="inline-flex size-7 items-center justify-center rounded-lg text-deepBlue ring-1 ring-deepBlue/10 hover:bg-white disabled:opacity-30">
                      <ArrowDown size={13} aria-hidden />
                    </button>
                    <button type="button" aria-label={`حذف الخطوة ${number}`} title="يُحذف الفاصل فقط؛ تنتقل أسئلة الخطوة إلى الخطوة السابقة" onClick={() => props.onRemoveStep(g.breakKey as string)} className="inline-flex size-7 items-center justify-center rounded-lg text-red-600 ring-1 ring-red-200 hover:bg-red-50">
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </span>
                )}
              </div>

              {isBreak && g.breakBlock ? (
                <div className="space-y-2">
                  <input aria-label={`عنوان الخطوة ${number}`} value={g.breakBlock.label} disabled={readOnly} placeholder={`عنوان الخطوة ${number}`} onFocus={() => props.onSelect(g.breakKey as string)} onChange={(e) => props.onEditStep(g.breakKey as string, { label: e.target.value }, 'label')} className={INPUT} />
                  <textarea aria-label={`وصف الخطوة ${number}`} value={g.breakBlock.description} disabled={readOnly} rows={2} placeholder="وصف اختياري يظهر تحت العنوان" onFocus={() => props.onSelect(g.breakKey as string)} onChange={(e) => props.onEditStep(g.breakKey as string, { description: e.target.value }, 'description')} className={`${INPUT} resize-none`} />
                  <button type="button" onClick={() => props.onOpenRule(g.breakKey as string)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black text-customBlue ring-1 ring-customBlue/30 hover:bg-white">
                    <GitBranch size={12} aria-hidden />
                    {g.breakBlock.logic ? 'تعديل شرط ظهور الخطوة' : 'شرط ظهور الخطوة'}
                  </button>
                  {g.breakBlock.logic && <span className="mr-2 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-800">شرطية</span>}
                </div>
              ) : (
                !readOnly && doc.blocks.length > 0 && (
                  <button type="button" onClick={props.onTitleFirstStep} className="rounded-lg px-2.5 py-1 text-[11px] font-black text-customBlue ring-1 ring-customBlue/30 hover:bg-white">
                    إضافة عنوان لهذه الخطوة
                  </button>
                )
              )}

              <ul className="space-y-1" aria-label={`عناصر الخطوة ${number}`}>
                {questionsOf(g.blocks).length === 0 && <li className="text-[11px] font-bold text-slate-400">خطوة فارغة: لا تظهر للمجيب حتى تضيف إليها سؤالاً.</li>}
                {questionsOf(g.blocks).map((b) => (
                  <li key={b.key} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-deepBlue/[0.04]">
                    <button type="button" onClick={() => props.onSelect(b.key)} className={`min-w-0 flex-1 truncate text-right text-[11px] font-bold ${isStructural(b.type) ? 'text-slate-500' : 'text-deepBlue'}`}>
                      {blockName(b)}
                      {b.logic && <span aria-label="شرطي" className="mr-1 text-sky-700"> ◆</span>}
                    </button>
                    {!readOnly && b.type !== 'section' && groups.length > 1 && (
                      <select aria-label={`نقل «${blockName(b)}» إلى خطوة`} value={g.key} onChange={(e) => props.onMoveToStep(b.key, e.target.value)} className="h-7 max-w-28 rounded-lg border border-slate-200 bg-white px-1.5 text-[10px] font-bold text-deepBlue">
                        {groups.map((target, j) => <option key={target.key} value={target.key}>الخطوة {j + 1}</option>)}
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
        {groups.length === 0 && <li className="text-[11px] font-bold text-slate-400">النموذج فارغ. أضف أسئلة أولاً ثم قسّمها إلى خطوات.</li>}
      </ol>

      {!readOnly && (
        <button type="button" onClick={props.onAddStep} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-customBlue px-4 py-2 text-xs font-black text-white">
          <Plus size={13} aria-hidden />
          إضافة خطوة
        </button>
      )}
    </aside>
  )
}
