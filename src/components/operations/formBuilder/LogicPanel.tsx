import { useMemo, useState } from 'react'
import { AlertTriangle, GitBranch } from 'lucide-react'
import { blockName, cleanOptions, dependentsOf, describeBlockRule, toLogicBlocks } from './builderDoc'
import type { Block, BuilderDoc, Rule } from './builderDoc'
import LogicEditor from './LogicEditor'
import { canBeSource, visibility } from './formLogic'
import type { AnswerLike } from './formLogic'
import { typeLabel } from './questionTypes'

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-deepBlue outline-none focus:border-customBlue'

type Props = {
  doc: BuilderDoc
  selected: Block | null
  readOnly: boolean
  /** Every problem of every rule, by block key: what autosave waits for first, then what only publishing refuses. */
  problems: Record<string, string[]>
  warnings: Record<string, string[]>
  onSelect: (key: string) => void
  onChangeRule: (key: string, rule: Rule | null) => void
}

type Sim = Record<string, string | string[]>

/** One answer a person is trying out in the path simulator. */
function SimInput({ block, value, onChange }: { block: Block; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const label = `جرّب إجابة: ${blockName(block)}`
  const options = cleanOptions(block.options)
  const text = typeof value === 'string' ? value : ''

  if (block.type === 'yes_no') {
    return (
      <select aria-label={label} value={text} onChange={(e) => onChange(e.target.value)} className={INPUT}>
        <option value="">بلا إجابة</option>
        <option value="yes">نعم</option>
        <option value="no">لا</option>
      </select>
    )
  }
  if (block.type === 'select' || block.type === 'radio') {
    return (
      <select aria-label={label} value={text} onChange={(e) => onChange(e.target.value)} className={INPUT}>
        <option value="">بلا إجابة</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (block.type === 'checkbox' || block.type === 'multiselect') {
    const picked = Array.isArray(value) ? value : []
    const list = options.length > 0 ? options : ['نعم', 'لا']

    return (
      <div role="group" aria-label={label} className="space-y-1">
        {list.map((o) => (
          <label key={o} className="flex items-center gap-2 text-xs font-bold text-deepBlue">
            <input type="checkbox" checked={picked.includes(o)} onChange={(e) => onChange(e.target.checked ? [...picked, o] : picked.filter((x) => x !== o))} className="accent-customBlue" />
            {o}
          </label>
        ))}
      </div>
    )
  }
  if (block.type === 'consent' || block.type === 'file' || block.type === 'image') {
    const yes = block.type === 'consent' ? 'yes' : 'file'

    return (
      <label className="flex items-center gap-2 text-xs font-bold text-deepBlue">
        <input type="checkbox" aria-label={label} checked={text !== ''} onChange={(e) => onChange(e.target.checked ? yes : '')} className="accent-customBlue" />
        {block.type === 'consent' ? 'تمت الموافقة' : 'أُرفق ملف'}
      </label>
    )
  }
  const type = ['number', 'star_rating', 'linear_scale'].includes(block.type) ? 'number' : block.type === 'date' ? 'date' : block.type === 'time' ? 'time' : 'text'

  return <input aria-label={label} type={type} value={text} step={type === 'number' ? 'any' : undefined} onChange={(e) => onChange(e.target.value)} className={INPUT} />
}

/**
 * Try the rules: answer the questions that other blocks depend on and see, live, which blocks a respondent would see. It evaluates
 * the unsaved document with the same engine the public form uses.
 */
function PathSimulator({ blocks }: { blocks: Block[] }) {
  const [answers, setAnswers] = useState<Sim>({})
  const logicBlocks = useMemo(() => toLogicBlocks(blocks), [blocks])
  const sourceKeys = useMemo(() => new Set(blocks.flatMap((b) => b.logic?.conditions.map((c) => c.source) ?? [])), [blocks])
  const sources = blocks.filter((b) => sourceKeys.has(b.key) && canBeSource(b.type))

  const byId: Record<number, AnswerLike> = {}
  blocks.forEach((b, i) => {
    const v = answers[b.key]
    if (v !== undefined) byId[i + 1] = v
  })
  const shown = visibility(logicBlocks, byId)

  if (sources.length === 0) return <p className="text-[11px] font-bold leading-5 text-slate-400">أضف شروطاً لتجربة المسارات هنا.</p>

  return (
    <div className="space-y-3" data-testid="path-simulator">
      <div className="space-y-2">
        {sources.map((b) => (
          <div key={b.key} className="grid gap-1">
            <span className="text-[11px] font-black text-deepBlue">{blockName(b)}</span>
            <SimInput block={b} value={answers[b.key]} onChange={(v) => setAnswers((a) => ({ ...a, [b.key]: v }))} />
          </div>
        ))}
        <button type="button" onClick={() => setAnswers({})} className="rounded-lg px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">مسح التجربة</button>
      </div>
      <ul aria-label="ما سيراه المجيب" className="space-y-1">
        {blocks.map((b, i) => (
          <li key={b.key} data-testid="sim-block" data-visible={shown[i + 1] ? 'true' : 'false'} className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${shown[i + 1] ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-400 line-through'}`}>
            <span className="truncate">{blockName(b)}</span>
            <span className="shrink-0 no-underline">{shown[i + 1] ? 'ظاهر' : 'مخفي'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The Logic panel of the builder: the rule of the selected block, an overview of every rule with who depends on whom, warnings for
 * rules that cannot be published, and a simulator for trying answer paths.
 */
export default function LogicPanel({ doc, selected, readOnly, problems, warnings, onSelect, onChangeRule }: Props) {
  const blocks = doc.blocks
  const ruled = blocks.filter((b) => b.logic)
  const sources = blocks.filter((b) => canBeSource(b.type) && dependentsOf(blocks, b.key).length > 0)
  const warnCount = Object.values(warnings).reduce((n, list) => n + list.length, 0)
  const selectedProblems = selected ? [...(problems[selected.key] ?? []), ...(warnings[selected.key] ?? [])] : []

  return (
    <aside aria-label="المنطق والشروط" data-testid="logic-panel" className="space-y-4 rounded-2xl bg-white p-4 text-right ring-1 ring-deepBlue/[0.06]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-black text-deepBlue"><GitBranch size={14} aria-hidden />المنطق والشروط</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{ruled.length} شرط</span>
      </div>

      {warnCount > 0 && (
        <p role="alert" data-testid="logic-warnings" className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-900">
          <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0" />
          {warnCount === 1 ? 'يوجد شرط لا يمكن نشر النموذج به.' : `يوجد ${warnCount} تحذيرات في الشروط تمنع نشر النموذج.`} راجع القائمة أدناه.
        </p>
      )}

      <section className="space-y-2 border-t border-deepBlue/[0.06] pt-3">
        <h4 className="text-[11px] font-black text-slate-500">شرط العنصر المحدد</h4>
        {selected ? (
          <>
            <p className="text-xs font-black text-deepBlue">{blockName(selected)} <span className="font-bold text-slate-400">· {typeLabel(selected.type)}</span></p>
            <LogicEditor block={selected} blocks={blocks} readOnly={readOnly} problems={selectedProblems} onChange={(rule) => onChangeRule(selected.key, rule)} />
          </>
        ) : (
          <p className="text-[11px] font-bold leading-5 text-slate-500">اختر سؤالاً أو قسماً أو خطوة من النموذج لتحديد متى يظهر.</p>
        )}
      </section>

      <section className="space-y-2 border-t border-deepBlue/[0.06] pt-3">
        <h4 className="text-[11px] font-black text-slate-500">نظرة عامة على الشروط</h4>
        {ruled.length === 0 && sources.length === 0 && <p className="text-[11px] font-bold text-slate-400">لا توجد شروط بعد. كل عناصر النموذج تظهر دائماً.</p>}
        <ul className="space-y-1.5" data-testid="rules-overview">
          {ruled.map((b) => {
            const needs = Array.from(new Set((b.logic?.conditions ?? []).map((c) => c.source))).map((k) => blocks.find((x) => x.key === k))
            const warn = warnings[b.key] ?? []

            return (
              <li key={b.key}>
                <button type="button" onClick={() => onSelect(b.key)} aria-pressed={selected?.key === b.key} className={`w-full rounded-xl p-2.5 text-right ring-1 transition ${selected?.key === b.key ? 'bg-brand-50 ring-customBlue' : 'bg-slate-50 ring-deepBlue/[0.05] hover:ring-customBlue/40'}`}>
                  <span className="flex items-center justify-between gap-2 text-xs font-black text-deepBlue">
                    <span className="truncate">{blockName(b)}</span>
                    {warn.length > 0 && <AlertTriangle size={13} aria-label="تحذير" className="shrink-0 text-amber-600" />}
                  </span>
                  <span className="mt-1 block text-[10px] font-bold leading-5 text-slate-500">{describeBlockRule(blocks, b)}</span>
                  <span className="mt-1 block text-[10px] font-black text-slate-400">يعتمد على: {needs.map((n) => (n ? blockName(n) : 'سؤال محذوف')).join('، ')}</span>
                </button>
              </li>
            )
          })}
          {sources.filter((s) => !s.logic).map((b) => (
            <li key={b.key}>
              <button type="button" onClick={() => onSelect(b.key)} className="w-full rounded-xl bg-slate-50 p-2.5 text-right text-xs font-black text-deepBlue ring-1 ring-deepBlue/[0.05] hover:ring-customBlue/40">
                {blockName(b)}
                <span className="mt-0.5 block text-[10px] font-bold text-slate-400">مصدر لـ {dependentsOf(blocks, b.key).length} {dependentsOf(blocks, b.key).length === 1 ? 'شرط' : 'شروط'}</span>
              </button>
            </li>
          ))}
        </ul>
        {Object.entries(warnings).map(([key, list]) => {
          const b = blocks.find((x) => x.key === key)

          return list.map((m) => (
            <p key={`${key}-${m}`} role="note" className="rounded-lg bg-amber-50 px-3 py-1.5 text-[10px] font-bold leading-5 text-amber-900" data-block={b?.key}>{m}</p>
          ))
        })}
      </section>

      <section className="space-y-2 border-t border-deepBlue/[0.06] pt-3">
        <h4 className="text-[11px] font-black text-slate-500">تجربة المسارات</h4>
        <PathSimulator blocks={blocks} />
      </section>
    </aside>
  )
}
