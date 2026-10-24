import type { FormQuestion, FormTypeSlug, LogicOperator, OpsFormDefinition, QuestionConfig, QuestionLogic, QuestionType } from '@/types/operations'
import { conditionIssue, describeRule, logicIssues } from './formLogic'
import type { LogicBlock } from './formLogic'
import { OPTIONS_REQUIRED, TYPE_SPECS, hasOptions, isMultiChoice, isStructural } from './questionTypes'

/**
 * The builder's document and the pure operations on it. No React in here: every edit the builder can make (insert, delete,
 * duplicate, move, move between sections, move or duplicate a whole section, change type) is a function from blocks to blocks,
 * so it can be tested without a browser and undone by keeping the previous value.
 *
 * A form is a flat list of blocks. A `section` block starts a section; the blocks after it, up to the next `section`, belong to
 * it. Blocks before the first section form a leading group with no heading. A `page_break` splits the public form into pages.
 */

/** One comparison of a visibility rule. The source is a block's KEY (stable while editing, saved or not), never an id. */
export type RuleCondition = { source: string; operator: LogicOperator; value?: string | number | string[] }

/** The visibility rule of a block, as the builder holds it. It becomes ids only on the way to the server (`toQuestion`). */
export type Rule = { action: 'show' | 'hide'; match: 'all' | 'any'; conditions: RuleCondition[] }

export type Block = {
  /** Stable for the whole editing session: survives saving, reordering and undo. The server id can change meaning; this cannot. */
  key: string
  /** The stored question this block is, once saved. Sent back so answers stay attached to it. */
  serverId: number | null
  type: QuestionType
  label: string
  required: boolean
  options: string[]
  description: string
  placeholder: string
  helpText: string
  config: QuestionConfig
  /** When to show or hide this block; null = always shown. */
  logic: Rule | null
  /** The type of an answered question cannot change (the server refuses it). */
  hasAnswers: boolean
}

export type BuilderDoc = {
  title: string
  description: string
  formType: FormTypeSlug
  /** Show the respondent a review of every answer before the final send. */
  reviewStep?: boolean
  blocks: Block[]
}

export type Group = {
  start: number
  /** Exclusive. */
  end: number
  /** `null` for the leading group of blocks that sit before the first section. */
  section: Block | null
}

let sequence = 0

/** A new key. Keys from the server use the stored id (`s12`); new blocks use a counter (`b1`), so they can never collide. */
export const newKey = (): string => `b${++sequence}`

export function makeBlock(type: QuestionType, overrides: Partial<Block> = {}): Block {
  const defaults = TYPE_SPECS[type].defaults()

  return {
    key: newKey(),
    serverId: null,
    type,
    label: defaults.label,
    required: false,
    options: defaults.options ? [...defaults.options] : [],
    description: defaults.description ?? '',
    placeholder: '',
    helpText: '',
    config: defaults.config ? structuredClone(defaults.config) : {},
    logic: null,
    hasAnswers: false,
    ...overrides,
  }
}

export function blockFromQuestion(q: FormQuestion): Block {
  return {
    key: `s${q.id}`,
    serverId: q.id,
    type: q.type,
    label: q.label ?? '',
    required: Boolean(q.required),
    options: q.options ? [...q.options] : [],
    description: q.description ?? '',
    placeholder: q.placeholder ?? '',
    helpText: q.help_text ?? '',
    config: q.config ? structuredClone(q.config) : {},
    logic: ruleFromWire(q.logic),
    hasAnswers: Boolean(q.has_answers),
  }
}

/** A stored rule names its sources by stored id; the builder names blocks by key, and a stored block's key is `s<id>`. */
export function ruleFromWire(logic: QuestionLogic | null | undefined): Rule | null {
  if (!logic || !Array.isArray(logic.conditions) || logic.conditions.length === 0) return null

  return {
    action: logic.action === 'hide' ? 'hide' : 'show',
    match: logic.match === 'any' ? 'any' : 'all',
    conditions: logic.conditions.map((c) => ({ source: `s${c.question}`, operator: c.operator, ...(c.value !== undefined ? { value: Array.isArray(c.value) ? [...c.value] : c.value } : {}) })),
  }
}

/** The id a block is known by in a payload: its stored id, or a temporary negative one while it has none. */
export function payloadIds(blocks: Block[]): Map<string, number> {
  return new Map(blocks.map((b, i) => [b.key, b.serverId ?? -(i + 1)]))
}

function ruleToWire(rule: Rule | null, ids: Map<string, number>): QuestionLogic | null {
  if (!rule || rule.conditions.length === 0) return null

  return {
    action: rule.action,
    match: rule.match,
    conditions: rule.conditions.map((c) => ({ question: ids.get(c.source) ?? 0, operator: c.operator, ...(c.value !== undefined ? { value: Array.isArray(c.value) ? [...c.value] : c.value } : {}) })),
  }
}

export function docFromForm(form: Pick<OpsFormDefinition, 'title' | 'description' | 'form_type' | 'questions'> & { flow?: OpsFormDefinition['flow'] }): BuilderDoc {
  return {
    title: form.title ?? '',
    description: form.description ?? '',
    formType: form.form_type,
    reviewStep: Boolean(form.flow?.review_step),
    blocks: form.questions.slice().sort((a, b) => a.sort_order - b.sort_order).map(blockFromQuestion),
  }
}

// ── What is sent to the server ─────────────────────────────────────────────

export function cleanOptions(options: string[]): string[] {
  const seen = new Set<string>()
  for (const option of options) {
    const trimmed = option.trim()
    if (trimmed !== '') seen.add(trimmed)
  }

  return Array.from(seen)
}

const isBlank = (v: unknown): boolean => v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v))

/** The config without empty values, so switching a limit off gives exactly the same payload as never setting it. */
export function pruneConfig(config: QuestionConfig | undefined | null): QuestionConfig | null {
  if (!config) return null
  const out: Record<string, unknown> = {}
  for (const [group, value] of Object.entries(config)) {
    if (group === 'default_value') {
      if (Array.isArray(value) ? value.length > 0 : !isBlank(value)) out[group] = value
      continue
    }
    if (value && typeof value === 'object') {
      const inner: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        if (!isBlank(v) && v !== false) inner[k] = v
      }
      if (Object.keys(inner).length > 0) out[group] = inner
    }
  }

  return Object.keys(out).length > 0 ? (out as QuestionConfig) : null
}

/** The block as the API receives it. Properties that do not apply to the type are left out, as the server would drop them. */
export function toQuestion(block: Block, index: number, ids?: Map<string, number>): FormQuestion {
  const spec = TYPE_SPECS[block.type]
  const structural = spec.structural

  return {
    id: block.serverId ?? -(index + 1),
    label: block.label.trim(),
    type: block.type,
    required: structural ? false : block.required,
    options: spec.hasOptions ? cleanOptions(block.options) : undefined,
    sort_order: index + 1,
    description: block.description.trim() === '' ? null : block.description.trim(),
    placeholder: spec.hasPlaceholder && block.placeholder.trim() !== '' ? block.placeholder.trim() : null,
    help_text: structural || block.helpText.trim() === '' ? null : block.helpText.trim(),
    config: pruneConfig(block.config),
    // Only when the caller knows every block's id (a save, the preview): a rule is meaningless without them. A block with no rule
    // sends `null`, so removing a rule in the editor removes it on the server too.
    ...(ids ? { logic: ruleToWire(block.logic, ids) } : {}),
  }
}

export const toQuestions = (blocks: Block[]): FormQuestion[] => {
  const ids = payloadIds(blocks)

  return blocks.map((b, i) => toQuestion(b, i, ids))
}

export function toDraftPayload(doc: BuilderDoc): Pick<OpsFormDefinition, 'title' | 'description' | 'form_type' | 'questions' | 'flow'> {
  return {
    title: doc.title.trim(),
    description: doc.description.trim() === '' ? null : doc.description.trim(),
    form_type: doc.formType,
    flow: doc.reviewStep ? { review_step: true } : null,
    questions: toQuestions(doc.blocks),
  }
}

// ── Editing blocks ─────────────────────────────────────────────────────────

const indexOfKey = (blocks: Block[], key: string): number => blocks.findIndex((b) => b.key === key)

export function insertAt(blocks: Block[], index: number, block: Block): Block[] {
  const at = Math.max(0, Math.min(index, blocks.length))

  return [...blocks.slice(0, at), block, ...blocks.slice(at)]
}

export const removeBlock = (blocks: Block[], key: string): Block[] => blocks.filter((b) => b.key !== key)

/** Moves a block so that it ends at `toIndex` of the resulting list. */
export function moveBlock(blocks: Block[], key: string, toIndex: number): Block[] {
  const from = indexOfKey(blocks, key)
  if (from < 0) return blocks
  const to = Math.max(0, Math.min(toIndex, blocks.length - 1))
  if (from === to) return blocks
  const next = blocks.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)

  return next
}

export const moveBy = (blocks: Block[], key: string, delta: number): Block[] => {
  const from = indexOfKey(blocks, key)

  return from < 0 ? blocks : moveBlock(blocks, key, from + delta)
}

/** A copy that is not yet stored: new key, no stored id, no answers. */
function copyOf(block: Block, suffix: boolean): Block {
  const label = block.label.trim() !== '' && suffix ? `${block.label} (نسخة)` : block.label

  return { ...block, key: newKey(), serverId: null, hasAnswers: false, label, options: [...block.options], config: structuredClone(block.config), logic: block.logic ? structuredClone(block.logic) : null }
}

/** After copying several blocks, a rule that read one of them reads its copy instead (the copy of a section is self-contained). */
function remapRules(copies: Block[], keyMap: Map<string, string>): Block[] {
  return copies.map((b) => (b.logic ? { ...b, logic: { ...b.logic, conditions: b.logic.conditions.map((c) => ({ ...c, source: keyMap.get(c.source) ?? c.source })) } } : b))
}

/** Duplicates a block right after itself; a section is duplicated with everything in it, after its last block. */
export function duplicateBlock(blocks: Block[], key: string): { blocks: Block[]; keys: string[] } {
  const index = indexOfKey(blocks, key)
  if (index < 0) return { blocks, keys: [] }

  if (blocks[index].type === 'section') {
    const group = groupsOf(blocks).find((g) => g.section?.key === key)
    if (!group) return { blocks, keys: [] }
    const originals = blocks.slice(group.start, group.end)
    const fresh = originals.map((b) => copyOf(b, b.type === 'section' || !isStructural(b.type)))
    const copies = remapRules(fresh, new Map(originals.map((b, i) => [b.key, fresh[i].key])))

    return { blocks: [...blocks.slice(0, group.end), ...copies, ...blocks.slice(group.end)], keys: copies.map((c) => c.key) }
  }

  const copy = copyOf(blocks[index], !isStructural(blocks[index].type))

  return { blocks: insertAt(blocks, index + 1, copy), keys: [copy.key] }
}

// ── Sections ───────────────────────────────────────────────────────────────

export function groupsOf(blocks: Block[]): Group[] {
  const groups: Group[] = []
  let start = 0
  let section: Block | null = null

  blocks.forEach((block, i) => {
    if (block.type !== 'section') return
    if (i > start || section !== null) groups.push({ start, end: i, section })
    start = i
    section = block
  })
  if (blocks.length > 0 || section !== null) groups.push({ start, end: blocks.length, section })

  return groups.filter((g) => g.end > g.start)
}

/** The section a block sits in, or null for the leading group. A section is its own. */
export function sectionOf(blocks: Block[], key: string): Block | null {
  const index = indexOfKey(blocks, key)
  if (index < 0) return null
  for (let i = index; i >= 0; i--) {
    if (blocks[i].type === 'section') return blocks[i]
  }

  return null
}

export function groupIndexOf(blocks: Block[], key: string): number {
  const index = indexOfKey(blocks, key)

  return groupsOf(blocks).findIndex((g) => index >= g.start && index < g.end)
}

/** Moves whole groups: the group at `from` ends at `to`. The leading (headingless) group always stays first. */
export function reorderGroups(blocks: Block[], from: number, to: number): Block[] {
  const groups = groupsOf(blocks)
  if (from < 0 || from >= groups.length || groups[from].section === null) return blocks
  const lowest = groups[0].section === null ? 1 : 0
  const target = Math.max(lowest, Math.min(to, groups.length - 1))
  if (from === target) return blocks
  const order = groups.slice()
  const [moved] = order.splice(from, 1)
  order.splice(target, 0, moved)

  return order.flatMap((g) => blocks.slice(g.start, g.end))
}

export function moveSectionBy(blocks: Block[], sectionKey: string, delta: number): Block[] {
  const gi = groupIndexOf(blocks, sectionKey)

  return gi < 0 ? blocks : reorderGroups(blocks, gi, gi + delta)
}

/** Moves a block to the end of another section (`null`: the leading group). */
export function moveToSection(blocks: Block[], key: string, sectionKey: string | null): Block[] {
  const block = blocks.find((b) => b.key === key)
  if (!block || block.type === 'section') return blocks
  if ((sectionOf(blocks, key)?.key ?? null) === sectionKey) return blocks

  const rest = removeBlock(blocks, key)
  if (sectionKey === null) {
    const firstSection = rest.findIndex((b) => b.type === 'section')

    return insertAt(rest, firstSection < 0 ? rest.length : firstSection, block)
  }
  const group = groupsOf(rest).find((g) => g.section?.key === sectionKey)

  return group ? insertAt(rest, group.end, block) : blocks
}

/** Deletes a section and everything in it. */
export function removeSection(blocks: Block[], sectionKey: string): Block[] {
  const group = groupsOf(blocks).find((g) => g.section?.key === sectionKey)

  return group ? [...blocks.slice(0, group.start), ...blocks.slice(group.end)] : blocks
}

// ── Changing a block ───────────────────────────────────────────────────────

/** Switches a block to a compatible type, keeping what still makes sense (the text, whether it is required, the options). */
export function changeType(block: Block, type: QuestionType): Block {
  if (block.type === type) return block
  const spec = TYPE_SPECS[type]
  const defaults = spec.defaults()
  const options = spec.hasOptions ? (block.options.length > 0 ? block.options : defaults.options ?? []) : []

  return {
    ...block,
    type,
    options,
    placeholder: spec.hasPlaceholder ? block.placeholder : '',
    required: spec.structural ? false : block.required,
    config: defaults.config ? structuredClone(defaults.config) : {},
  }
}

// ── Mistakes the server would also refuse ──────────────────────────────────

/** The first thing wrong with a block, in words; null when it can be saved. Mirrors the server so autosave can wait for a fix. */
export function blockIssue(block: Block): string | null {
  const label = block.label.trim()
  if (block.type === 'section' && label === '') return 'اكتب عنوان القسم.'
  if (block.type === 'description' && block.description.trim() === '') return 'اكتب نص الفقرة التوضيحية.'
  if (!['description', 'page_break', 'section'].includes(block.type) && label === '') return 'اكتب نص السؤال.'

  const options = cleanOptions(block.options)
  if (OPTIONS_REQUIRED.includes(block.type) && options.length === 0) return 'أضف خياراً واحداً على الأقل لهذا السؤال.'

  const v = block.config.validation ?? {}
  const s = block.config.scale ?? {}
  const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null)

  const pair = (lo: number | null, hi: number | null): boolean => lo !== null && hi !== null && lo > hi
  if ((block.type === 'text' || block.type === 'textarea') && pair(num(v.min_length), num(v.max_length))) return 'الحد الأقصى للطول يجب ألا يقل عن الحد الأدنى.'
  if (block.type === 'number' && pair(num(v.min), num(v.max))) return 'الحد الأعلى يجب ألا يقل عن الحد الأدنى.'
  if (block.type === 'date' && v.min_date && v.max_date && v.min_date > v.max_date) return 'أحدث تاريخ يجب ألا يسبق أقدم تاريخ.'
  if (isMultiChoice(block.type)) {
    if (pair(num(v.min_choices), num(v.max_choices))) return 'الحد الأقصى للاختيارات يجب ألا يقل عن الحد الأدنى.'
    const count = options.length || 2
    if ((num(v.min_choices) ?? 0) > count) return 'الحد الأدنى للاختيارات أكبر من عدد الخيارات.'
  }
  if (block.type === 'linear_scale' && (num(s.min) ?? 1) >= (num(s.max) ?? 5)) return 'نهاية المقياس يجب أن تكون أكبر من بدايته.'
  if (block.type === 'star_rating' && s.max !== undefined && (num(s.max) === null || (s.max as number) < 3 || (s.max as number) > 10)) return 'عدد النجوم يجب أن يكون بين 3 و10.'

  const d = block.config.default_value
  if (hasOptions(block.type) && d !== undefined && d !== '') {
    const picked = Array.isArray(d) ? d : [d]
    if (picked.some((x) => !options.includes(String(x)) && !(block.type === 'checkbox' && options.length === 0))) return 'القيمة الافتراضية يجب أن تكون من الخيارات.'
  }
  if (block.type === 'number' && d !== undefined && d !== '') {
    const n = Number(d)
    if (Number.isNaN(n)) return 'القيمة الافتراضية يجب أن تكون رقماً.'
    if ((num(v.min) !== null && n < (v.min as number)) || (num(v.max) !== null && n > (v.max as number))) return 'القيمة الافتراضية خارج الحدود المسموحة.'
  }

  return null
}

/** The first issue per block key. */
export function docIssues(doc: BuilderDoc): Record<string, string> {
  const out: Record<string, string> = {}
  const rules = ruleProblems(doc.blocks)
  for (const block of doc.blocks) {
    const issue = blockIssue(block) ?? rules[block.key]?.[0] ?? null
    if (issue) out[block.key] = issue
  }
  if (doc.title.trim() === '') out.__title = 'عنوان النموذج مطلوب.'

  return out
}

// ── Visibility rules ───────────────────────────────────────────────────────

/** A block's rule with every condition that reads one of the removed blocks taken out; a rule left with none is dropped. */
export function stripReferences(blocks: Block[], removed: Set<string>): Block[] {
  if (removed.size === 0) return blocks
  let changed = false
  const next = blocks.map((b) => {
    if (!b.logic || !b.logic.conditions.some((c) => removed.has(c.source))) return b
    changed = true
    const conditions = b.logic.conditions.filter((c) => !removed.has(c.source))

    return { ...b, logic: conditions.length > 0 ? { ...b.logic, conditions } : null }
  })

  return changed ? next : blocks
}

/** The blocks that have a rule reading this block (what would stop working if it were deleted or moved down). */
export const dependentsOf = (blocks: Block[], key: string): Block[] => blocks.filter((b) => b.logic?.conditions.some((c) => c.source === key))

/** The blocks as the rules engine reads them: ids are positions, so the engine can run on a document that is not saved yet. */
export function toLogicBlocks(blocks: Block[]): LogicBlock[] {
  const idOf = new Map(blocks.map((b, i) => [b.key, i + 1]))

  return blocks.map((b, i) => ({
    id: i + 1,
    type: b.type,
    label: b.label,
    options: cleanOptions(b.options),
    logic: b.logic && b.logic.conditions.length > 0 ? { action: b.logic.action, match: b.logic.match, conditions: b.logic.conditions.map((c) => ({ question: idOf.get(c.source) ?? 0, operator: c.operator, ...(c.value !== undefined ? { value: c.value } : {}) })) } : null,
  }))
}

/**
 * What is wrong with each block's rule, by block key. The first kind is what the server refuses on SAVE (unfinished or impossible
 * conditions), so autosave waits for it; the second kind (a rule that reads a later block, itself or a circle) is allowed in a draft
 * but refused when publishing, so it is shown as a warning.
 */
export function ruleProblems(blocks: Block[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const add = (key: string, message: string) => (out[key] ??= []).push(message)
  const byKey = new Map(blocks.map((b) => [b.key, b]))

  for (const b of blocks) {
    for (const c of b.logic?.conditions ?? []) {
      if (c.source === '') {
        add(b.key, 'اختر السؤال الذي يعتمد عليه الشرط.')
        continue
      }
      const source = byKey.get(c.source)
      const message = conditionIssue(source ? { type: source.type, options: cleanOptions(source.options) } : undefined, { question: 0, operator: c.operator, value: c.value })
      if (message) add(b.key, message)
    }
  }

  return out
}

/** The warnings the server would only raise at publishing (order and cycles), by block key. */
export function ruleWarnings(blocks: Block[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const logic = toLogicBlocks(blocks)
  for (const issue of logicIssues(logic)) {
    const key = blocks[issue.id - 1]?.key
    if (key && issue.code !== 'missing') (out[key] ??= []).push(issue.message)
  }

  return out
}

// ── Steps ──────────────────────────────────────────────────────────────────

/**
 * One step of the form as the editor lists it: the break that opens it (null for the stage before any break) and what follows it.
 * Unlike the respondent's list, an empty step is shown here, so it can be filled or removed.
 */
export type StepGroup = { key: string; breakKey: string | null; start: number; end: number; breakBlock: Block | null; blocks: Block[] }

export function stepGroups(blocks: Block[]): StepGroup[] {
  const groups: StepGroup[] = []
  let start = 0
  let current: Block | null = null
  blocks.forEach((b, i) => {
    if (b.type !== 'page_break') return
    if (i > start || current !== null) groups.push(makeGroup(blocks, start, i, current))
    start = i
    current = b
  })
  if (blocks.length > start || current !== null) groups.push(makeGroup(blocks, start, blocks.length, current))

  return groups
}

function makeGroup(blocks: Block[], start: number, end: number, breakBlock: Block | null): StepGroup {
  return { key: breakBlock?.key ?? 'first', breakKey: breakBlock?.key ?? null, start, end, breakBlock, blocks: blocks.slice(breakBlock ? start + 1 : start, end) }
}

/** Moves a whole step (its break and what follows it) up or down. The stage before the first break stays where it is. */
export function moveStep(blocks: Block[], breakKey: string, delta: -1 | 1): Block[] {
  const groups = stepGroups(blocks)
  const from = groups.findIndex((g) => g.breakKey === breakKey)
  const to = from + delta
  const lowest = groups[0]?.breakKey === null ? 1 : 0
  if (from < 0 || to < lowest || to >= groups.length) return blocks
  const order = groups.slice()
  const [moved] = order.splice(from, 1)
  order.splice(to, 0, moved)

  return order.flatMap((g) => blocks.slice(g.start, g.end))
}

/** Moves a question to the end of another step. Headings and breaks move on the canvas, not here. */
export function moveToStep(blocks: Block[], key: string, stepKey: string): Block[] {
  const block = blocks.find((b) => b.key === key)
  if (!block || block.type === 'page_break' || block.type === 'section') return blocks
  const groups = stepGroups(blocks)
  const from = groups.find((g) => g.blocks.some((b) => b.key === key))
  const target = groups.find((g) => g.key === stepKey)
  if (!target || !from || from.key === target.key) return blocks

  const rest = removeBlock(blocks, key)
  const after = stepGroups(rest).find((g) => g.key === stepKey)

  return after ? insertAt(rest, after.end, block) : blocks
}

/** Adds a step: a break at the end of the form. The blocks before the first break are the first step, so a plain form becomes two steps. */
export function addStep(blocks: Block[], makeBreak: () => Block): { blocks: Block[]; key: string } {
  const created = makeBreak()

  return { blocks: [...blocks, created], key: created.key }
}

/** Gives the first stage a break of its own (so it can have a title and a description like the others). No-op when it has one. */
export function ensureFirstBreak(blocks: Block[], makeBreak: () => Block): { blocks: Block[]; key: string | null } {
  if (blocks.length === 0 || blocks[0].type === 'page_break') return { blocks, key: blocks[0]?.key ?? null }
  const lead = makeBreak()

  return { blocks: [lead, ...blocks], key: lead.key }
}

/** What a block's name is, for the places that refer to a block: its text, or the kind of block when it has none. */
export const blockName = (block: Pick<Block, 'label' | 'type'>): string => block.label.trim() || TYPE_SPECS[block.type].label

/** A block's rule as one Arabic sentence, with its sources named as they are in the form. */
export function describeBlockRule(blocks: Block[], block: Block): string {
  const ids = new Map(blocks.map((b, i) => [b.key, i + 1]))
  const logic = block.logic && block.logic.conditions.length > 0
    ? { action: block.logic.action, match: block.logic.match, conditions: block.logic.conditions.map((c) => ({ question: ids.get(c.source) ?? 0, operator: c.operator, ...(c.value !== undefined ? { value: c.value } : {}) })) }
    : null
  const subject = block.type === 'section' ? 'هذا القسم' : block.type === 'page_break' ? 'هذه الخطوة' : block.type === 'description' ? 'هذه الفقرة' : 'هذا السؤال'

  return describeRule(logic, (id) => {
    const b = blocks[id - 1]

    return b ? { type: b.type, options: cleanOptions(b.options), name: blockName(b) } : undefined
  }, subject)
}
