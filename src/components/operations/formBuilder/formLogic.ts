import type { LogicCondition, LogicOperator, QuestionLogic, QuestionType } from '@/types/operations'

/**
 * The conditional-logic specification of Smart Forms, evaluated in the browser.
 *
 * It is the SAME specification the server enforces (FormLogic.php): both engines are held to one shared file of test vectors
 * (src/test/fixtures/formLogicVectors.json). The browser evaluates rules so the respondent sees the right questions as they
 * answer; the server evaluates them again on every submission and its answer is the one that counts, so nothing here can be
 * used to bypass a rule.
 *
 * A rule is data, never code: a closed list of operators, each checked against the type of the question it reads. Nothing in a
 * rule is ever evaluated as an expression.
 *
 * Semantics (identical on the server):
 *  - Blocks are evaluated in document order. A condition reads only the answers of blocks that come EARLIER and are themselves
 *    VISIBLE: the answer of a hidden question counts as no answer (hiding cascades); a later or missing question is unanswered.
 *  - Unanswered: `is_empty` is true; `not_equals`, `not_contains` and `none_of` are true; every other operator is false.
 *  - `show` shows when the conditions hold, `hide` hides when they hold; `all` is AND, `any` is OR.
 *  - A step break governs the blocks up to the next step break; a section heading governs the blocks up to the next heading.
 *    A block is visible only when its own rule, its step and its section all allow it.
 *  - Text is compared as written (trimmed, case-sensitive); numbers numerically; dates and times as ISO strings.
 */

export type LogicBlock = {
  id: number
  type: QuestionType
  label?: string
  options?: string[] | null
  logic?: QuestionLogic | null
}

/** What an answer can be, as the form holds it: a text, a list, a file, or nothing. */
export type AnswerLike = string | string[] | File | number | null | undefined

export const MAX_CONDITIONS = 10
export const MAX_LIST = 50
export const TEXT_MAX = 255

const TEXT: QuestionType[] = ['text', 'textarea', 'email', 'phone', 'url']
const NUMERIC: QuestionType[] = ['number', 'star_rating', 'linear_scale']
const SINGLE: QuestionType[] = ['select', 'radio']
const MULTI: QuestionType[] = ['checkbox', 'multiselect']
const EMPTINESS: LogicOperator[] = ['is_empty', 'is_not_empty']
const ORDERED: LogicOperator[] = ['gt', 'gte', 'lt', 'lte']

/** The operators of every question type; a block that is not answered (heading, text, step break) offers none. */
export function operatorsFor(type: QuestionType): LogicOperator[] {
  if (TEXT.includes(type)) return ['equals', 'not_equals', 'contains', 'not_contains', ...EMPTINESS]
  if (NUMERIC.includes(type) || type === 'date' || type === 'time') return ['equals', 'not_equals', ...ORDERED, ...EMPTINESS]
  if (SINGLE.includes(type)) return ['equals', 'not_equals', 'any_of', 'none_of', ...EMPTINESS]
  if (MULTI.includes(type)) return ['contains', 'not_contains', 'any_of', 'none_of', ...EMPTINESS]
  if (type === 'yes_no') return ['equals', 'not_equals', ...EMPTINESS]
  if (type === 'consent' || type === 'file' || type === 'image') return [...EMPTINESS]

  return []
}

export const canBeSource = (type: QuestionType): boolean => operatorsFor(type).length > 0

export const needsValue = (operator: LogicOperator): boolean => !EMPTINESS.includes(operator)
export const needsList = (operator: LogicOperator): boolean => operator === 'any_of' || operator === 'none_of'

/** The options a choice question offers, with the checkbox fallback the form builder has always used. */
export function optionsOf(block: Pick<LogicBlock, 'type' | 'options'>): string[] {
  const options = (block.options ?? []).filter((o) => typeof o === 'string' && o !== '')

  return options.length === 0 && block.type === 'checkbox' ? ['نعم', 'لا'] : options
}

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/
export const isNumeric = (text: string): boolean => NUMBER.test(text.trim()) && Number.isFinite(Number(text))

export function isDate(text: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))

  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

export const isTime = (text: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(text)

// ── Evaluation ──────────────────────────────────────────────────────────────

type Read = string | string[] | true

/** An answer as the engine reads it: trimmed text, a list of texts, `true` for an attachment, or null when nothing was answered. */
export function answerOf(type: QuestionType, raw: AnswerLike): Read | null {
  if (type === 'file' || type === 'image') return raw instanceof File || (typeof raw === 'string' && raw !== '') ? true : null
  if (MULTI.includes(type)) {
    const list = (Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw])
      .map((v) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : ''))
      .filter((v) => v !== '')

    return list.length === 0 ? null : list
  }
  if (typeof raw === 'string' || typeof raw === 'number') {
    const text = String(raw).trim()

    return text === '' ? null : text
  }

  return null
}

/** -1, 0, 1, or null when the two cannot be ordered (an answer that is not a number): then no ordering operator holds. */
function compare(numeric: boolean, answer: string | string[], value: unknown): number | null {
  if (Array.isArray(answer) || Array.isArray(value)) return null
  if (numeric) {
    if (!isNumeric(answer) || !(typeof value === 'number' || (typeof value === 'string' && isNumeric(value)))) return null
    const a = Number(answer)
    const b = Number(value)

    return a < b ? -1 : a > b ? 1 : 0
  }
  const a = answer
  const b = String(value ?? '')

  return a < b ? -1 : a > b ? 1 : 0
}

function holds(operator: LogicOperator, type: QuestionType, answer: Read | null, value: unknown): boolean {
  if (operator === 'is_empty') return answer === null
  if (operator === 'is_not_empty') return answer !== null
  if (answer === null) return operator === 'not_equals' || operator === 'not_contains' || operator === 'none_of'
  const read = answer === true ? '' : answer

  const numeric = NUMERIC.includes(type)
  const multi = MULTI.includes(type)
  const list = multi ? (Array.isArray(read) ? read : [read]) : []
  const listValue = Array.isArray(value) ? value.map(String) : []
  const cmp = compare(numeric, read, value)

  switch (operator) {
    case 'equals':
      return cmp === 0
    case 'not_equals':
      return cmp !== 0
    case 'gt':
      return cmp !== null && cmp > 0
    case 'gte':
      return cmp !== null && cmp >= 0
    case 'lt':
      return cmp !== null && cmp < 0
    case 'lte':
      return cmp !== null && cmp <= 0
    case 'contains':
      return multi ? list.includes(String(value)) : String(read).includes(String(value))
    case 'not_contains':
      return multi ? !list.includes(String(value)) : !String(read).includes(String(value))
    case 'any_of':
      return multi ? list.some((v) => listValue.includes(v)) : listValue.includes(String(read))
    case 'none_of':
      return multi ? !list.some((v) => listValue.includes(v)) : !listValue.includes(String(read))
    default:
      return false
  }
}

function ownVisibility(logic: QuestionLogic | null | undefined, byId: Map<number, LogicBlock>, effective: Map<number, Read>): boolean {
  const conditions = logic?.conditions ?? []
  if (!logic || conditions.length === 0) return true

  const results = conditions.map((c) => {
    const source = byId.get(Number(c.question))
    if (!source || !operatorsFor(source.type).includes(c.operator)) return holds(c.operator, source?.type ?? 'text', null, null)

    return holds(c.operator, source.type, effective.get(source.id) ?? null, c.value)
  })
  const met = logic.match === 'any' ? results.includes(true) : !results.includes(false)

  return logic.action === 'hide' ? !met : met
}

/**
 * Which blocks a respondent sees, given the answers. `blocks` must be in document order.
 * Evaluation always terminates and has one result: a block reads only what came before it.
 */
export function visibility(blocks: LogicBlock[], answers: Record<number, AnswerLike>): Record<number, boolean> {
  const byId = new Map<number, LogicBlock>(blocks.map((b) => [b.id, b]))
  const out: Record<number, boolean> = {}
  const effective = new Map<number, Read>()
  let stepShown = true
  let sectionShown = true

  for (const b of blocks) {
    const own = ownVisibility(b.logic, byId, effective)
    let shown: boolean
    if (b.type === 'page_break') {
      stepShown = own
      shown = own
    } else if (b.type === 'section') {
      shown = own && stepShown
      sectionShown = own
    } else {
      shown = own && stepShown && sectionShown
    }
    out[b.id] = shown

    if (shown && canBeSource(b.type)) {
      const read = answerOf(b.type, answers[b.id])
      if (read !== null) effective.set(b.id, read)
    }
  }

  return out
}

// ── Checking a rule (the builder's side of what the server refuses) ─────────

export type LogicSource = Pick<LogicBlock, 'type' | 'options'>

/** The message for one condition, or null when the server would accept it. */
export function conditionIssue(source: LogicSource | undefined, c: LogicCondition): string | null {
  if (!source) return 'الشرط يعتمد على سؤال غير موجود أو محذوف.'
  if (!canBeSource(source.type)) return 'لا يمكن بناء شرط على هذا العنصر لأنه لا يُجاب عنه.'
  if (!operatorsFor(source.type).includes(c.operator)) return 'هذا المشغّل لا يناسب نوع السؤال المختار.'
  if (!needsValue(c.operator)) return null

  const options = optionsOf(source)
  if (needsList(c.operator)) {
    const list = Array.isArray(c.value) ? c.value.map((v) => String(v).trim()) : []
    if (list.length === 0 || list.includes('')) return 'اختر خياراً واحداً على الأقل.'
    if (list.length > MAX_LIST) return 'عدد الخيارات يتجاوز الحد المسموح.'

    return list.every((v) => options.includes(v)) ? null : 'القيمة المختارة ليست من خيارات السؤال.'
  }

  if (Array.isArray(c.value) || c.value === undefined || c.value === null) return 'أدخل قيمة للشرط.'
  const text = String(c.value).trim()
  if (text === '') return 'أدخل قيمة للشرط.'

  if (NUMERIC.includes(source.type)) return isNumeric(text) ? null : 'أدخل رقماً صالحاً.'
  if (source.type === 'date') return isDate(text) ? null : 'أدخل تاريخاً صالحاً.'
  if (source.type === 'time') return isTime(text) ? null : 'أدخل وقتاً صالحاً بصيغة HH:MM.'
  if (source.type === 'yes_no') return text === 'yes' || text === 'no' ? null : 'اختر نعم أو لا.'
  if (SINGLE.includes(source.type) || MULTI.includes(source.type)) return options.includes(text) ? null : 'القيمة المختارة ليست من خيارات السؤال.'

  return text.length <= TEXT_MAX ? null : `القيمة أطول من المسموح (${TEXT_MAX} حرفاً).`
}

export type LogicIssue = { id: number; code: 'missing' | 'self' | 'forward' | 'cycle'; message: string }

const nameOf = (b: LogicBlock): string => {
  const label = (b.label ?? '').trim()
  if (label !== '') return label

  return b.type === 'page_break' ? 'فاصل الخطوة' : b.type === 'section' ? 'قسم' : b.type === 'description' ? 'فقرة توضيحية' : 'عنصر'
}

/** What is wrong with the way rules refer to each other (publishing refuses all of it). `blocks` in document order. */
export function logicIssues(blocks: LogicBlock[]): LogicIssue[] {
  const position = new Map<number, number>(blocks.map((b, i) => [b.id, i]))
  const byId = new Map<number, LogicBlock>(blocks.map((b) => [b.id, b]))
  const sourcesOf = (b: LogicBlock): number[] => Array.from(new Set((b.logic?.conditions ?? []).map((c) => Number(c.question))))

  // Every block depends on what its rule reads and on the step and the section it sits in.
  const graph = new Map<number, number[]>()
  let step: number | null = null
  let section: number | null = null
  for (const b of blocks) {
    const edges = sourcesOf(b)
    if (b.type !== 'page_break' && step !== null) edges.push(step)
    if (b.type !== 'page_break' && b.type !== 'section' && section !== null) edges.push(section)
    graph.set(b.id, Array.from(new Set(edges)))
    if (b.type === 'page_break') step = b.id
    if (b.type === 'section') section = b.id
  }

  const inCycle = new Map<number, number[]>()
  const state = new Map<number, number>()
  const stack: number[] = []
  const visit = (node: number) => {
    state.set(node, 1)
    stack.push(node)
    for (const next of graph.get(node) ?? []) {
      if (!graph.has(next)) continue
      if (state.get(next) === 1) {
        const cycle = stack.slice(stack.indexOf(next))
        for (const m of cycle) if (!inCycle.has(m)) inCycle.set(m, cycle)
      } else if (!state.get(next)) visit(next)
    }
    stack.pop()
    state.set(node, 2)
  }
  for (const id of graph.keys()) if (!state.get(id)) visit(id)

  const issues: LogicIssue[] = []
  for (const b of blocks) {
    const name = nameOf(b)
    for (const sourceId of sourcesOf(b)) {
      const source = byId.get(sourceId)
      if (!source) issues.push({ id: b.id, code: 'missing', message: `شرط «${name}» يعتمد على سؤال غير موجود أو محذوف.` })
      else if (sourceId === b.id) issues.push({ id: b.id, code: 'self', message: `شرط «${name}» يعتمد على نفسه.` })
      else if (inCycle.has(b.id)) continue
      else if ((position.get(sourceId) ?? 0) > (position.get(b.id) ?? 0)) {
        issues.push({ id: b.id, code: 'forward', message: `شرط «${name}» يعتمد على سؤال «${nameOf(source)}» الذي يأتي بعده. يجب أن يعتمد الشرط على سؤال يسبقه.` })
      }
    }
  }
  for (const b of blocks) {
    const cycle = inCycle.get(b.id)
    if (cycle && sourcesOf(b).length > 0) {
      const names = cycle.map((id) => `«${nameOf(byId.get(id) as LogicBlock)}»`).join(' ← ')
      issues.push({ id: b.id, code: 'cycle', message: `شرط «${nameOf(b)}» جزء من حلقة شرطية دائرية: ${names}. اكسر الحلقة.` })
    }
  }

  return issues
}

// ── Saying a rule in Arabic ─────────────────────────────────────────────────

const OPERATOR_LABELS: Record<LogicOperator, string> = {
  equals: 'تساوي',
  not_equals: 'لا تساوي',
  contains: 'تحتوي على',
  not_contains: 'لا تحتوي على',
  is_empty: 'بلا إجابة',
  is_not_empty: 'لها إجابة',
  gt: 'أكبر من',
  gte: 'أكبر من أو تساوي',
  lt: 'أصغر من',
  lte: 'أصغر من أو تساوي',
  any_of: 'إحدى هذه القيم',
  none_of: 'ليست أياً من هذه القيم',
}

/** The operator's name for a question type: «قبل» for a date, «تتضمن الخيار» for a multiple choice, and so on. */
export function operatorLabel(type: QuestionType, operator: LogicOperator): string {
  if (type === 'date' || type === 'time') {
    return ({ gt: 'بعد', gte: 'في أو بعد', lt: 'قبل', lte: 'في أو قبل', equals: 'تساوي', not_equals: 'لا تساوي' } as Partial<Record<LogicOperator, string>>)[operator] ?? OPERATOR_LABELS[operator]
  }
  if (MULTI.includes(type)) {
    return ({ contains: 'تتضمن الخيار', not_contains: 'لا تتضمن الخيار', any_of: 'تتضمن أياً من', none_of: 'لا تتضمن أياً من', is_empty: 'بلا إجابة', is_not_empty: 'لها إجابة' } as Partial<Record<LogicOperator, string>>)[operator] ?? OPERATOR_LABELS[operator]
  }
  if (type === 'consent') return operator === 'is_not_empty' ? 'تمت الموافقة' : 'لم تتم الموافقة'
  if (type === 'file' || type === 'image') return operator === 'is_not_empty' ? 'أُرفق ملف' : 'لم يُرفق ملف'

  return OPERATOR_LABELS[operator]
}

export function valueText(type: QuestionType, value: LogicCondition['value']): string {
  if (Array.isArray(value)) return value.map((v) => `«${v}»`).join(' أو ')
  if (value === undefined || value === null) return ''
  if (type === 'yes_no') return value === 'yes' ? '«نعم»' : '«لا»'

  return `«${value}»`
}

/** One condition as a clause that reads after «إذا»: كانت إجابة «هل أنت موظف؟» تساوي «نعم». */
export function describeCondition(c: LogicCondition, source: LogicSource | undefined, name: string): string {
  if (!source) return 'كان السؤال المصدر محذوفاً'
  const given = c.operator === 'is_not_empty'
  if (source.type === 'consent') return given ? `وافق المجيب على «${name}»` : `لم يوافق المجيب على «${name}»`
  if (source.type === 'file' || source.type === 'image') return given ? `أُرفق ملف في «${name}»` : `لم يُرفق ملف في «${name}»`
  if (!needsValue(c.operator)) return given ? `أُجيب على «${name}»` : `لم يُجب على «${name}»`

  return `كانت إجابة «${name}» ${operatorLabel(source.type, c.operator)} ${valueText(source.type, c.value)}`
}

/**
 * A rule as one Arabic sentence the editor can check against what they meant, e.g.
 * «يظهر هذا العنصر فقط إذا كانت إجابة «هل أنت موظف؟» تساوي «نعم».»
 */
export function describeRule(logic: QuestionLogic | null | undefined, sourceOf: (id: number) => (LogicSource & { name: string }) | undefined, subject = 'هذا العنصر'): string {
  const conditions = logic?.conditions ?? []
  // The verb agrees with the subject: «يظهر هذا السؤال» but «تظهر هذه الخطوة».
  const feminine = subject.startsWith('هذه')
  const shows = feminine ? 'تظهر' : 'يظهر'
  const hides = feminine ? 'تُخفى' : 'يُخفى'
  if (!logic || conditions.length === 0) return `${subject} ${shows} دائماً.`

  const clauses = conditions.map((c) => {
    const s = sourceOf(c.question)

    return describeCondition(c, s, s?.name ?? '')
  })
  const lead = logic.action === 'hide' ? `${hides} ${subject} إذا` : `${shows} ${subject} فقط إذا`
  if (clauses.length === 1) return `${lead} ${clauses[0]}.`

  return `${lead} ${logic.match === 'any' ? 'تحقق أي شرط من الشروط' : 'تحققت كل الشروط'} التالية: ${clauses.map((cl, i) => `(${i + 1}) ${cl}`).join('، ')}.`
}

/** The honest footnote about unanswered questions, so a rule is never a surprise. */
export function unansweredNote(logic: QuestionLogic | null | undefined): string {
  return logic?.conditions.some((c) => c.operator === 'not_equals' || c.operator === 'not_contains' || c.operator === 'none_of')
    ? 'ملاحظة: إذا لم يُجب المجيب على السؤال المصدر فالشروط «لا تساوي» و«لا تحتوي» و«ليست أياً من» تتحقق، وبقية الشروط لا تتحقق.'
    : 'ملاحظة: إذا لم يُجب المجيب على السؤال المصدر (أو كان مخفياً) فالشرط لا يتحقق، إلا شرط «بلا إجابة».'
}
