import { Plus, X } from 'lucide-react'
import type { LogicOperator, QuestionType } from '@/types/operations'
import { blockName, cleanOptions, describeBlockRule } from './builderDoc'
import type { Block, Rule, RuleCondition } from './builderDoc'
import { MAX_CONDITIONS, canBeSource, needsList, needsValue, operatorLabel, operatorsFor, optionsOf, unansweredNote } from './formLogic'
import { typeLabel } from './questionTypes'

const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-deepBlue outline-none focus:border-customBlue disabled:opacity-60'
const LABEL = 'text-[11px] font-black text-deepBlue'

type Props = {
  block: Block
  blocks: Block[]
  readOnly: boolean
  /** Problems with this block's rule: unfinished conditions first, then order and circles. */
  problems: string[]
  onChange: (rule: Rule | null) => void
}

const numeric = (t: QuestionType) => t === 'number' || t === 'star_rating' || t === 'linear_scale'

/** The value a new (or re-targeted) condition starts with, so a rule is rarely left half-written. */
function startValue(source: Block, operator: LogicOperator): string | string[] | undefined {
  if (!needsValue(operator)) return undefined
  const options = optionsOf({ type: source.type, options: cleanOptions(source.options) })
  if (needsList(operator)) return options.length > 0 ? [options[0]] : []
  if (source.type === 'yes_no') return 'yes'
  if (['select', 'radio', 'checkbox', 'multiselect'].includes(source.type)) return options[0] ?? ''

  return ''
}

function freshCondition(source: Block): RuleCondition {
  const operator = operatorsFor(source.type)[0]
  const value = startValue(source, operator)

  return { source: source.key, operator, ...(value !== undefined ? { value } : {}) }
}

function ValueInput({ source, condition, index, disabled, onChange }: { source: Block | undefined; condition: RuleCondition; index: number; disabled: boolean; onChange: (value: string | string[]) => void }) {
  if (!source || !needsValue(condition.operator)) return null
  const label = `قيمة الشرط ${index + 1}`
  const options = optionsOf({ type: source.type, options: cleanOptions(source.options) })

  if (needsList(condition.operator)) {
    const picked = Array.isArray(condition.value) ? condition.value : []

    return (
      <div role="group" aria-label={label} className="space-y-1 rounded-xl bg-white p-2 ring-1 ring-deepBlue/[0.06]">
        {options.length === 0 && <p className="text-[10px] font-bold text-slate-400">أضف خيارات للسؤال أولاً.</p>}
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-xs font-bold text-deepBlue">
            <input type="checkbox" checked={picked.includes(o)} disabled={disabled} onChange={(e) => onChange(e.target.checked ? [...picked, o] : picked.filter((x) => x !== o))} className="accent-customBlue" />
            {o}
          </label>
        ))}
      </div>
    )
  }

  const value = typeof condition.value === 'string' || typeof condition.value === 'number' ? String(condition.value) : ''
  if (source.type === 'yes_no') {
    return (
      <select aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={INPUT}>
        <option value="yes">نعم</option>
        <option value="no">لا</option>
      </select>
    )
  }
  if (['select', 'radio', 'checkbox', 'multiselect'].includes(source.type)) {
    return (
      <select aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={INPUT}>
        <option value="">اختر خياراً</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  const type = numeric(source.type) ? 'number' : source.type === 'date' ? 'date' : source.type === 'time' ? 'time' : 'text'

  return <input aria-label={label} type={type} value={value} disabled={disabled} step={type === 'number' ? 'any' : undefined} onChange={(e) => onChange(e.target.value)} className={INPUT} />
}

/**
 * The visibility rule of one block, written without code: show or hide it, when all or any of some conditions hold, each condition
 * being «this earlier question's answer … this value». A condition can only read a question that comes before the block, and the
 * operators offered are the ones that make sense for that question's type. The rule is also said back in one Arabic sentence.
 */
export default function LogicEditor({ block, blocks, readOnly, problems, onChange }: Props) {
  const index = blocks.findIndex((b) => b.key === block.key)
  const sources = blocks.filter((b, i) => i < index && canBeSource(b.type))
  const rule = block.logic
  const subject = block.type === 'section' ? 'هذا القسم' : block.type === 'page_break' ? 'هذه الخطوة' : block.type === 'description' ? 'هذه الفقرة' : 'هذا السؤال'
  const byKey = new Map(blocks.map((b) => [b.key, b]))

  const patch = (next: Partial<Rule>) => rule && onChange({ ...rule, ...next })
  const setCondition = (i: number, c: RuleCondition) => rule && patch({ conditions: rule.conditions.map((x, j) => (j === i ? c : x)) })
  const nameOf = (b: Block) => `${blocks.indexOf(b) + 1}. ${blockName(b)}`

  function retarget(i: number, key: string) {
    const source = byKey.get(key)
    if (!source || !rule) return
    const current = rule.conditions[i]
    const operators = operatorsFor(source.type)
    // Keep the comparison when it still makes sense for the new question, otherwise start it afresh.
    const keeps = operators.includes(current.operator) && key !== current.source && byKey.get(current.source)?.type === source.type && !['select', 'radio', 'checkbox', 'multiselect'].includes(source.type)
    setCondition(i, keeps ? { ...current, source: key } : { ...freshCondition(source), source: key })
  }

  function reoperate(i: number, operator: LogicOperator) {
    const source = byKey.get(rule?.conditions[i].source ?? '')
    if (!source || !rule) return
    const current = rule.conditions[i]
    const sameShape = needsValue(operator) === needsValue(current.operator) && needsList(operator) === needsList(current.operator)
    const value = sameShape ? current.value : startValue(source, operator)
    setCondition(i, { source: current.source, operator, ...(value !== undefined ? { value } : {}) })
  }

  if (!rule) {
    return (
      <div className="space-y-3" data-testid="logic-editor">
        <p className="text-[11px] font-bold leading-5 text-slate-500">{subject} {subject.startsWith('هذه') ? 'تظهر' : 'يظهر'} دائماً. أضف شرطاً ليظهر أو يختفي بحسب إجابة سؤال سابق.</p>
        {sources.length === 0 ? (
          <p role="note" className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-bold leading-5 text-slate-500">لا يوجد سؤال قبل {subject} يمكن بناء شرط عليه. أضف سؤالاً قبله أولاً.</p>
        ) : (
          !readOnly && (
            <button type="button" onClick={() => onChange({ action: 'show', match: 'all', conditions: [freshCondition(sources[0])] })} className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue px-4 py-2 text-xs font-black text-white">
              <Plus size={13} aria-hidden />
              إضافة شرط ظهور
            </button>
          )
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="logic-editor">
      <p role="note" data-testid="rule-sentence" className="rounded-xl bg-sky-50 px-3 py-2.5 text-xs font-bold leading-6 text-sky-900">{describeBlockRule(blocks, block)}</p>
      {problems.map((m) => (
        <p key={m} role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-900">{m}</p>
      ))}

      <label className="grid gap-1">
        <span className={LABEL}>ماذا يحدث عند تحقق الشرط؟</span>
        <select aria-label="نوع الشرط" value={rule.action} disabled={readOnly} onChange={(e) => patch({ action: e.target.value as Rule['action'] })} className={INPUT}>
          <option value="show">أظهر {subject} فقط إذا تحقق الشرط</option>
          <option value="hide">أخفِ {subject} إذا تحقق الشرط</option>
        </select>
      </label>

      {rule.conditions.length > 1 && (
        <label className="grid gap-1">
          <span className={LABEL}>كم شرطاً يلزم أن يتحقق؟</span>
          <select aria-label="طريقة الجمع" value={rule.match} disabled={readOnly} onChange={(e) => patch({ match: e.target.value as Rule['match'] })} className={INPUT}>
            <option value="all">كل الشروط (و)</option>
            <option value="any">أي شرط منها (أو)</option>
          </select>
        </label>
      )}

      <ol className="space-y-2" aria-label="شروط الظهور">
        {rule.conditions.map((c, i) => {
          const source = byKey.get(c.source)
          const stale = c.source !== '' && source !== undefined && !sources.includes(source)

          return (
            <li key={i} data-testid="condition" className="space-y-1.5 rounded-xl bg-slate-50 p-2.5 ring-1 ring-deepBlue/[0.05]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-slate-500">الشرط {i + 1}</span>
                {!readOnly && (
                  <button
                    type="button"
                    aria-label={`حذف الشرط ${i + 1}`}
                    onClick={() => onChange(rule.conditions.length > 1 ? { ...rule, conditions: rule.conditions.filter((_, j) => j !== i) } : null)}
                    className="inline-flex size-6 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                  >
                    <X size={13} aria-hidden />
                  </button>
                )}
              </div>
              <select aria-label={`السؤال المصدر ${i + 1}`} value={c.source} disabled={readOnly} onChange={(e) => retarget(i, e.target.value)} className={INPUT}>
                {c.source === '' && <option value="">اختر السؤال…</option>}
                {stale && source && <option value={source.key}>{nameOf(source)} (يأتي بعد هذا العنصر)</option>}
                {c.source !== '' && !source && <option value={c.source}>سؤال محذوف</option>}
                {sources.map((b) => <option key={b.key} value={b.key}>{nameOf(b)} — {typeLabel(b.type)}</option>)}
              </select>
              {source && (
                <>
                  <select aria-label={`المشغّل ${i + 1}`} value={c.operator} disabled={readOnly} onChange={(e) => reoperate(i, e.target.value as LogicOperator)} className={INPUT}>
                    {operatorsFor(source.type).map((op) => <option key={op} value={op}>{operatorLabel(source.type, op)}</option>)}
                  </select>
                  <ValueInput source={source} condition={c} index={i} disabled={readOnly} onChange={(value) => setCondition(i, { ...c, value })} />
                </>
              )}
            </li>
          )
        })}
      </ol>

      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={rule.conditions.length >= MAX_CONDITIONS || sources.length === 0}
            onClick={() => onChange({ ...rule, conditions: [...rule.conditions, freshCondition(sources[sources.length - 1] ?? sources[0])] })}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black text-customBlue ring-1 ring-customBlue/30 hover:bg-brand-50 disabled:opacity-40"
          >
            <Plus size={12} aria-hidden />
            إضافة شرط آخر
          </button>
          <button type="button" onClick={() => onChange(null)} className="rounded-xl px-3 py-1.5 text-[11px] font-black text-red-700 ring-1 ring-red-200 hover:bg-red-50">
            إزالة الشرط
          </button>
        </div>
      )}
      <p className="text-[10px] font-bold leading-5 text-slate-400">{unansweredNote(rule.conditions.length > 0 ? { action: rule.action, match: rule.match, conditions: rule.conditions.map((c) => ({ question: 0, operator: c.operator })) } : null)}</p>
    </div>
  )
}
