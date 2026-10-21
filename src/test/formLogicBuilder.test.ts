import { describe, expect, it } from 'vitest'
import {
  addStep,
  blockFromQuestion,
  describeBlockRule,
  docFromForm,
  duplicateBlock,
  ensureFirstBreak,
  makeBlock,
  moveStep,
  moveToStep,
  ruleFromWire,
  ruleProblems,
  ruleWarnings,
  stepGroups,
  stripReferences,
  toDraftPayload,
  toQuestions,
} from '@/components/operations/formBuilder/builderDoc'
import type { Block, BuilderDoc, Rule } from '@/components/operations/formBuilder/builderDoc'
import { builderReducer, initialState } from '@/components/operations/formBuilder/builderState'
import type { BuilderAction, BuilderState } from '@/components/operations/formBuilder/builderState'
import { signatureOf } from '@/components/operations/formBuilder/useDraftAutosave'
import { toFormPayload } from '@/api/formsApi'
import type { FormQuestion, QuestionType } from '@/types/operations'

/** The builder's side of conditional logic and steps: how rules are held, converted for the server, kept sound while editing. */

const b = (key: string, type: QuestionType = 'text', extra: Partial<Block> = {}): Block => ({ ...makeBlock(type), key, label: key, ...extra })
const when = (source: string, operator: Rule['conditions'][number]['operator'], value?: string | number | string[], action: Rule['action'] = 'show'): Rule => ({
  action,
  match: 'all',
  conditions: [{ source, operator, ...(value !== undefined ? { value } : {}) }],
})
const docOf = (blocks: Block[], extra: Partial<BuilderDoc> = {}): BuilderDoc => ({ title: 'عنوان', description: '', formType: 'suggestion', blocks, ...extra })
const keys = (blocks: Block[]) => blocks.map((x) => x.key)
const act = (state: BuilderState, action: BuilderAction) => builderReducer(state, action)

describe('a rule in the builder and on the wire', () => {
  it('names its source by block key in the editor and by id on the way to the server', () => {
    const saved = b('s10', 'yes_no', { serverId: 10 })
    const dependent = b('s11', 'text', { serverId: 11, logic: when('s10', 'equals', 'yes') })
    const [first, second] = toQuestions([saved, dependent])

    expect(first.logic).toBeNull()
    expect(second.logic).toEqual({ action: 'show', match: 'all', conditions: [{ question: 10, operator: 'equals', value: 'yes' }] })
  })

  it('points a rule at an unsaved question with the temporary negative id that question is sent with', () => {
    const fresh = b('b1', 'yes_no')
    const dependent = b('b2', 'text', { logic: when('b1', 'equals', 'no') })
    const questions = toQuestions([fresh, dependent])

    expect(questions[0].id).toBe(-1)
    expect(questions[1].logic?.conditions[0].question).toBe(-1)
  })

  it('reads a stored rule back into keys, and ignores a rule with nothing in it', () => {
    expect(ruleFromWire({ action: 'hide', match: 'any', conditions: [{ question: 7, operator: 'any_of', value: ['أ', 'ب'] }] })).toEqual({
      action: 'hide',
      match: 'any',
      conditions: [{ source: 's7', operator: 'any_of', value: ['أ', 'ب'] }],
    })
    expect(ruleFromWire(null)).toBeNull()
    expect(ruleFromWire(undefined)).toBeNull()
    expect(ruleFromWire({ action: 'show', match: 'all', conditions: [] })).toBeNull()
  })

  it('a form without any rule is sent exactly as before: no flow, every question says it has no rule', () => {
    const doc = docOf([b('a'), b('c', 'email')])
    const payload = toDraftPayload(doc)

    expect(payload.flow).toBeNull()
    expect(payload.questions.map((q) => q.logic)).toEqual([null, null])
  })

  it('removing a rule sends null so the server removes it too; the review step is sent only while it is on', () => {
    const doc = docOf([b('s1', 'yes_no', { serverId: 1 }), b('s2', 'text', { serverId: 2, logic: null })], { reviewStep: true })
    const payload = toDraftPayload(doc)

    expect(payload.questions[1].logic).toBeNull()
    expect(payload.flow).toEqual({ review_step: true })
    expect(toDraftPayload({ ...doc, reviewStep: false }).flow).toBeNull()
  })

  it('round-trips a form from the server into the editor and back to the same rules', () => {
    const wire: FormQuestion[] = [
      { id: 21, label: 'هل', type: 'yes_no', required: true, sort_order: 1 },
      { id: 22, label: 'لماذا', type: 'text', required: false, sort_order: 2, logic: { action: 'show', match: 'all', conditions: [{ question: 21, operator: 'equals', value: 'yes' }] } },
    ]
    const doc = docFromForm({ title: 't', description: '', form_type: 'suggestion', questions: wire, flow: { review_step: true } })

    expect(doc.reviewStep).toBe(true)
    expect(doc.blocks[1].logic?.conditions[0].source).toBe('s21')
    expect(toDraftPayload(doc).questions[1].logic).toEqual(wire[1].logic)
  })
})

describe('the request body for a draft save', () => {
  it('an unsaved question that a rule reads is sent with its temporary id as `ref`, and no `id`', () => {
    const body = toFormPayload(toDraftPayload(docOf([b('b1', 'yes_no'), b('b2', 'text', { logic: when('b1', 'equals', 'yes') })])))
    const [first, second] = body.questions as Record<string, unknown>[]

    expect(first).not.toHaveProperty('id')
    expect(first.ref).toBe(-1)
    expect(second).not.toHaveProperty('id')
    expect(second).not.toHaveProperty('ref')
    expect(second.logic).toEqual({ action: 'show', match: 'all', conditions: [{ question: -1, operator: 'equals', value: 'yes' }] })
  })

  it('an unsaved question nothing reads carries neither id nor ref, and a stored one carries its id', () => {
    const body = toFormPayload(toDraftPayload(docOf([b('s5', 'text', { serverId: 5 }), b('b1')])))
    const [stored, fresh] = body.questions as Record<string, unknown>[]

    expect(stored.id).toBe(5)
    expect(fresh).not.toHaveProperty('id')
    expect(fresh).not.toHaveProperty('ref')
  })

  it('sends flow, and leaves rules out when the caller did not ask for them', () => {
    expect(toFormPayload({ flow: { review_step: true } }).flow).toEqual({ review_step: true })
    expect(toFormPayload({ flow: null }).flow).toBeNull()
    const question: FormQuestion = { id: 3, label: 'س', type: 'text', required: false, sort_order: 1 }
    expect((toFormPayload({ questions: [question] }).questions as Record<string, unknown>[])[0]).not.toHaveProperty('logic')
  })
})

describe('keeping rules sound while editing', () => {
  it('deleting a question takes the conditions that read it, and undo brings both back', () => {
    const doc = docOf([b('yn', 'yes_no'), b('name', 'text', { logic: { action: 'show', match: 'all', conditions: [{ source: 'yn', operator: 'equals', value: 'yes' }, { source: 'age', operator: 'gte', value: 18 }] } }), b('age', 'number')])
    const state = initialState(doc)
    const after = act(state, { type: 'remove', key: 'yn', at: 1 })

    expect(after.doc.blocks.find((x) => x.key === 'name')?.logic?.conditions.map((c) => c.source)).toEqual(['age'])

    const undone = act(after, { type: 'undo' })
    expect(undone.doc.blocks.find((x) => x.key === 'name')?.logic?.conditions).toHaveLength(2)
  })

  it('a rule whose only condition read the deleted question is dropped, so the question is simply always shown', () => {
    const state = initialState(docOf([b('yn', 'yes_no'), b('name', 'text', { logic: when('yn', 'equals', 'yes') })]))
    const after = act(state, { type: 'remove', key: 'yn', at: 1 })

    expect(after.doc.blocks[0].logic).toBeNull()
  })

  it('deleting a whole section strips rules that read anything inside it', () => {
    const blocks = [b('sec', 'section'), b('inside', 'yes_no'), b('sec2', 'section'), b('out', 'text', { logic: when('inside', 'equals', 'yes') })]
    const after = act(initialState(docOf(blocks)), { type: 'remove', key: 'sec', at: 1 })

    expect(keys(after.doc.blocks)).toEqual(['sec2', 'out'])
    expect(after.doc.blocks[1].logic).toBeNull()
  })

  it('stripReferences changes nothing (same array) when no rule reads a removed block', () => {
    const blocks = [b('a'), b('c', 'text', { logic: when('a', 'is_empty') })]
    expect(stripReferences(blocks, new Set(['zzz']))).toBe(blocks)
    expect(stripReferences(blocks, new Set())).toBe(blocks)
  })

  it('duplicating a section gives a copy whose rules read the copy, not the original', () => {
    const blocks = [b('sec', 'section'), b('yn', 'yes_no'), b('why', 'text', { logic: when('yn', 'equals', 'yes') })]
    const { blocks: out, keys: copies } = duplicateBlock(blocks, 'sec')
    const copyYn = out[4]
    const copyWhy = out[5]

    expect(out).toHaveLength(6)
    expect(copies).toEqual([out[3].key, copyYn.key, copyWhy.key])
    expect(copyWhy.logic?.conditions[0].source).toBe(copyYn.key)
    expect(copyYn.key).not.toBe('yn')
    expect(out[2].logic?.conditions[0].source).toBe('yn')
  })

  it('duplicating a single question keeps its rule as it is', () => {
    const blocks = [b('yn', 'yes_no'), b('why', 'text', { logic: when('yn', 'equals', 'yes') })]
    const { blocks: out } = duplicateBlock(blocks, 'why')

    expect(out[2].logic?.conditions[0].source).toBe('yn')
  })

  it('a condition on a later question is only a warning: allowed in a draft, listed as a reason publishing would be refused', () => {
    const blocks = [b('a', 'text', { logic: when('c', 'equals', 'x') }), b('c', 'text')]

    expect(ruleProblems(blocks)).toEqual({})
    expect(Object.keys(ruleWarnings(blocks))).toEqual(['a'])
  })

  it('a rule that reads itself, or that runs in a circle, is a warning on the blocks involved', () => {
    const self = ruleWarnings([b('a', 'text', { logic: when('a', 'equals', 'x') })])
    expect(self.a?.length).toBeGreaterThan(0)

    const circle = ruleWarnings([b('a', 'text', { logic: when('c', 'equals', 'x') }), b('c', 'text', { logic: when('a', 'equals', 'y') })])
    expect(Object.keys(circle).sort()).toEqual(['a', 'c'])
  })

  it('a sound rule has neither problems nor warnings', () => {
    const blocks = [b('yn', 'yes_no'), b('why', 'text', { logic: when('yn', 'equals', 'yes') })]

    expect(ruleProblems(blocks)).toEqual({})
    expect(ruleWarnings(blocks)).toEqual({})
  })

  it('refuses, as the server does, an unfinished condition, an operator the question type has no use for, and a value that is not a choice', () => {
    const blocks = [
      b('yn', 'yes_no'),
      b('pick', 'radio', { options: ['أ', 'ب'] }),
      b('t', 'text'),
      b('r1', 'text', { logic: { action: 'show', match: 'all', conditions: [{ source: '', operator: 'equals', value: 'x' }] } }),
      b('r2', 'text', { logic: when('yn', 'gt', 3) }),
      b('r3', 'text', { logic: when('pick', 'equals', 'ج') }),
      b('r4', 'text', { logic: when('t', 'equals') }),
      b('r5', 'text', { logic: when('pick', 'equals', 'أ') }),
    ]
    const problems = ruleProblems(blocks)

    expect(Object.keys(problems).sort()).toEqual(['r1', 'r2', 'r3', 'r4'])
    expect(problems.r1[0]).toContain('اختر السؤال')
    expect(problems.r5).toBeUndefined()
  })

  it('a heading or description cannot be a source', () => {
    const blocks = [b('h', 'section'), b('x', 'text', { logic: when('h', 'equals', 'x') })]
    expect(ruleProblems(blocks).x?.length).toBeGreaterThan(0)
  })

  it('says each rule in one Arabic sentence, with the verb agreeing with what is shown or hidden', () => {
    const blocks = [b('هل أنت موظف؟', 'yes_no'), b('اسم الشركة', 'text', { logic: when('هل أنت موظف؟', 'equals', 'yes') }), b('خطوة', 'page_break', { logic: when('هل أنت موظف؟', 'equals', 'no', 'hide') })]

    expect(describeBlockRule(blocks, blocks[1])).toBe('يظهر هذا السؤال فقط إذا كانت إجابة «هل أنت موظف؟» تساوي «نعم».')
    expect(describeBlockRule(blocks, blocks[2])).toMatch(/^تُخفى هذه الخطوة إذا/)
    expect(describeBlockRule(blocks, blocks[0])).toBe('هذا السؤال يظهر دائماً.')
  })
})

describe('steps', () => {
  /** a | break1 b c | break2 d */
  const sample = () => [b('a'), b('p1', 'page_break'), b('bb'), b('cc'), b('p2', 'page_break'), b('dd')]

  it('lists the stage before the first break as the first step, then one step per break', () => {
    const groups = stepGroups(sample())

    expect(groups.map((g) => g.key)).toEqual(['first', 'p1', 'p2'])
    expect(groups.map((g) => keys(g.blocks))).toEqual([['a'], ['bb', 'cc'], ['dd']])
  })

  it('shows an empty step so it can be filled or removed, but not a stage that has nothing at all', () => {
    expect(stepGroups([b('p1', 'page_break'), b('p2', 'page_break'), b('x')]).map((g) => g.key)).toEqual(['p1', 'p2'])
    expect(stepGroups([])).toEqual([])
  })

  it('moves a whole step with its questions, and never above the first stage', () => {
    expect(keys(moveStep(sample(), 'p2', -1))).toEqual(['a', 'p2', 'dd', 'p1', 'bb', 'cc'])
    expect(keys(moveStep(sample(), 'p1', 1))).toEqual(['a', 'p2', 'dd', 'p1', 'bb', 'cc'])
    expect(keys(moveStep(sample(), 'p1', -1))).toEqual(keys(sample()))
    expect(keys(moveStep(sample(), 'p2', 1))).toEqual(keys(sample()))
  })

  it('moves a question to the end of another step, and refuses to move a break or a heading that way', () => {
    expect(keys(moveToStep(sample(), 'a', 'p2'))).toEqual(['p1', 'bb', 'cc', 'p2', 'dd', 'a'])
    expect(keys(moveToStep(sample(), 'dd', 'first'))).toEqual(['a', 'dd', 'p1', 'bb', 'cc', 'p2'])
    const blocks = sample()
    expect(moveToStep(blocks, 'p1', 'p2')).toBe(blocks)
    expect(moveToStep(blocks, 'bb', 'p1')).toBe(blocks)
  })

  it('adds a step at the end, and gives the first stage a break of its own only once', () => {
    const added = addStep([b('a')], () => b('new', 'page_break'))
    expect(keys(added.blocks)).toEqual(['a', 'new'])
    expect(added.key).toBe('new')

    const lead = ensureFirstBreak([b('a')], () => b('lead', 'page_break'))
    expect(keys(lead.blocks)).toEqual(['lead', 'a'])
    expect(ensureFirstBreak(lead.blocks, () => b('other', 'page_break')).blocks).toBe(lead.blocks)
  })

  it('a step title and description are the break block\'s own label and description in the payload', () => {
    const doc = docOf([b('a'), b('p', 'page_break', { label: 'بيانات إضافية', description: 'آخر التفاصيل' }), b('z')])
    const step = toDraftPayload(doc).questions[1]

    expect(step).toMatchObject({ type: 'page_break', label: 'بيانات إضافية', description: 'آخر التفاصيل', required: false })
  })

  it('goes through the reducer as one undoable edit each: add, title, move, move a question', () => {
    let state = initialState(docOf([b('a'), b('c')]))
    state = act(state, { type: 'addStep', at: 1 })
    expect(state.doc.blocks.at(-1)?.type).toBe('page_break')
    expect(state.selectedKey).toBe(state.doc.blocks.at(-1)?.key)

    state = act(state, { type: 'titleFirstStep', at: 2 })
    expect(state.doc.blocks[0].type).toBe('page_break')
    state = act(state, { type: 'titleFirstStep', at: 3 })
    expect(state.doc.blocks.filter((x) => x.type === 'page_break')).toHaveLength(2)

    const stepKey = state.doc.blocks.at(-1)!.key
    state = act(state, { type: 'moveToStep', key: 'a', stepKey, at: 4 })
    expect(state.doc.blocks.at(-1)?.key).toBe('a')
    state = act(state, { type: 'undo' })
    expect(state.doc.blocks.at(-1)?.type).toBe('page_break')
  })

  it('the review step is a setting of the form that autosave and undo treat like any edit', () => {
    let state = initialState(docOf([b('a')]))
    state = act(state, { type: 'editMeta', patch: { reviewStep: true }, field: 'reviewStep', at: 1 })
    expect(toDraftPayload(state.doc).flow).toEqual({ review_step: true })
    state = act(state, { type: 'undo' })
    expect(toDraftPayload(state.doc).flow).toBeNull()
  })
})

describe('a rule edit in the history', () => {
  it('can be undone and redone, and two quick edits of the same rule are one step', () => {
    let state = initialState(docOf([b('yn', 'yes_no'), b('why', 'text')]))
    state = act(state, { type: 'edit', key: 'why', patch: { logic: when('yn', 'equals', 'yes') }, field: 'logic', at: 1000 })
    state = act(state, { type: 'edit', key: 'why', patch: { logic: when('yn', 'equals', 'no') }, field: 'logic', at: 1200 })
    expect(state.past).toHaveLength(1)
    expect(state.doc.blocks[1].logic?.conditions[0].value).toBe('no')

    state = act(state, { type: 'undo' })
    expect(state.doc.blocks[1].logic).toBeNull()
    state = act(state, { type: 'redo' })
    expect(state.doc.blocks[1].logic?.conditions[0].value).toBe('no')
  })

  it('moving a block above its source is a warning, and moving it back clears it', () => {
    let state = initialState(docOf([b('yn', 'yes_no'), b('why', 'text', { logic: when('yn', 'equals', 'yes') })]))
    state = act(state, { type: 'moveBy', key: 'yn', delta: 1, at: 1 })
    expect(Object.keys(ruleWarnings(state.doc.blocks))).toEqual(['why'])
    state = act(state, { type: 'undo' })
    expect(ruleWarnings(state.doc.blocks)).toEqual({})
  })

  it('saving gives blocks ids but never makes the document look edited', () => {
    const doc = docOf([b('b1', 'yes_no'), b('b2', 'text', { logic: when('b1', 'equals', 'yes') })], { reviewStep: true })
    const before = signatureOf(doc)
    const saved = act(initialState(doc), { type: 'saved', serverIds: { b1: 41, b2: 42 } })

    expect(saved.doc.blocks.map((x) => x.serverId)).toEqual([41, 42])
    expect(signatureOf(saved.doc)).toBe(before)
  })

  it('a changed rule does change the signature, so autosave sees it', () => {
    const one = docOf([b('a', 'yes_no'), b('c', 'text', { logic: when('a', 'equals', 'yes') })])
    const two = docOf([b('a', 'yes_no'), b('c', 'text', { logic: when('a', 'equals', 'no') })])
    const three = docOf([b('a', 'yes_no'), b('c', 'text')])

    expect(new Set([signatureOf(one), signatureOf(two), signatureOf(three)]).size).toBe(3)
    expect(signatureOf(docOf(one.blocks, { reviewStep: true }))).not.toBe(signatureOf(one))
  })

  it('a stored block keeps the key s<id> so a rule read from the server points at it', () => {
    const block = blockFromQuestion({ id: 9, label: 'س', type: 'text', required: false, sort_order: 1 })
    expect(block.key).toBe('s9')
    expect(block.logic).toBeNull()
  })
})
