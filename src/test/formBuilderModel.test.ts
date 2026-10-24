import { describe, expect, it } from 'vitest'
import {
  blockIssue,
  changeType,
  docFromForm,
  docIssues,
  duplicateBlock,
  groupsOf,
  makeBlock,
  moveBlock,
  moveBy,
  moveSectionBy,
  moveToSection,
  pruneConfig,
  removeSection,
  reorderGroups,
  sectionOf,
  toDraftPayload,
  toQuestion,
} from '@/components/operations/formBuilder/builderDoc'
import type { Block, BuilderDoc } from '@/components/operations/formBuilder/builderDoc'
import { COALESCE_MS, HISTORY_LIMIT, builderReducer, initialState } from '@/components/operations/formBuilder/builderState'
import type { BuilderAction, BuilderState } from '@/components/operations/formBuilder/builderState'
import { CANVAS_END, libraryId, resolveDrop } from '@/components/operations/formBuilder/dropResolver'
import { LIBRARY_TYPES, TYPE_SPECS } from '@/components/operations/formBuilder/questionTypes'
import { initialValues, splitPages, validateAnswer } from '@/components/operations/formBuilder/formValidation'
import { signatureOf } from '@/components/operations/formBuilder/useDraftAutosave'
import type { FormQuestion, QuestionType } from '@/types/operations'

const b = (key: string, type: QuestionType = 'text', extra: Partial<Block> = {}): Block => ({ ...makeBlock(type), key, label: key, ...extra })
const keys = (blocks: Block[]) => blocks.map((x) => x.key)
const docOf = (blocks: Block[]): BuilderDoc => ({ title: 'عنوان', description: '', formType: 'suggestion', blocks })

/** q1 s1 q2 q3 s2 q4 */
const sample = () => [b('q1'), b('s1', 'section'), b('q2'), b('q3'), b('s2', 'section'), b('q4')]

describe('the block registry', () => {
  it('every type the library offers is fully described, and only the three layout blocks are structural', () => {
    expect(LIBRARY_TYPES).toHaveLength(20)
    for (const type of LIBRARY_TYPES) {
      const spec = TYPE_SPECS[type]
      expect(spec.label).toBeTruthy()
      expect(spec.defaults().label !== undefined).toBe(true)
    }
    expect(LIBRARY_TYPES.filter((t) => TYPE_SPECS[t].structural).sort()).toEqual(['description', 'page_break', 'section'])
  })
})

describe('moving blocks', () => {
  it('moves a block up, down, and to an exact place, and stays put at the edges', () => {
    const list = [b('a'), b('b'), b('c')]
    expect(keys(moveBy(list, 'b', -1))).toEqual(['b', 'a', 'c'])
    expect(keys(moveBy(list, 'b', 1))).toEqual(['a', 'c', 'b'])
    expect(keys(moveBlock(list, 'a', 2))).toEqual(['b', 'c', 'a'])
    expect(keys(moveBy(list, 'a', -1))).toEqual(['a', 'b', 'c'])
    expect(keys(moveBy(list, 'c', 1))).toEqual(['a', 'b', 'c'])
  })

  it('knows the groups: a leading group without a heading, then one per section', () => {
    const groups = groupsOf(sample())
    expect(groups.map((g) => [g.start, g.end, g.section?.key ?? null])).toEqual([[0, 1, null], [1, 4, 's1'], [4, 6, 's2']])
    expect(sectionOf(sample(), 'q3')?.key).toBe('s1')
    expect(sectionOf(sample(), 'q1')).toBeNull()
    expect(sectionOf(sample(), 's2')?.key).toBe('s2')
  })

  it('moves a block between sections, to the end of the target, and back out to the leading group', () => {
    expect(keys(moveToSection(sample(), 'q1', 's1'))).toEqual(['s1', 'q2', 'q3', 'q1', 's2', 'q4'])
    expect(keys(moveToSection(sample(), 'q2', 's2'))).toEqual(['q1', 's1', 'q3', 's2', 'q4', 'q2'])
    expect(keys(moveToSection(sample(), 'q2', null))).toEqual(['q1', 'q2', 's1', 'q3', 's2', 'q4'])
    expect(moveToSection(sample(), 'q2', 's1')).toEqual(sample().map((x) => expect.objectContaining({ key: x.key })))
  })

  it('moves a whole section with everything in it, and never in front of the headingless group', () => {
    expect(keys(moveSectionBy(sample(), 's2', -1))).toEqual(['q1', 's2', 'q4', 's1', 'q2', 'q3'])
    expect(keys(moveSectionBy(sample(), 's1', 1))).toEqual(['q1', 's2', 'q4', 's1', 'q2', 'q3'])
    expect(keys(moveSectionBy(sample(), 's1', -1))).toEqual(keys(sample()))
    expect(keys(reorderGroups(sample(), 0, 2))).toEqual(keys(sample()))
  })

  it('a section at the very top can move below another', () => {
    const list = [b('s1', 'section'), b('q1'), b('s2', 'section'), b('q2')]
    expect(keys(moveSectionBy(list, 's1', 1))).toEqual(['s2', 'q2', 's1', 'q1'])
  })

  it('deletes a section together with its blocks, leaving the rest', () => {
    expect(keys(removeSection(sample(), 's1'))).toEqual(['q1', 's2', 'q4'])
  })
})

describe('duplicating', () => {
  it('a copy is a new, unsaved block right after the original', () => {
    const original = b('q1', 'radio', { serverId: 42, hasAnswers: true, options: ['أ', 'ب'], label: 'سؤال' })
    const { blocks, keys: made } = duplicateBlock([original, b('q2')], 'q1')

    expect(blocks).toHaveLength(3)
    const copy = blocks[1]
    expect(made).toEqual([copy.key])
    expect(copy.key).not.toBe('q1')
    expect(copy.serverId).toBeNull()
    expect(copy.hasAnswers).toBe(false)
    expect(copy.label).toBe('سؤال (نسخة)')
    expect(copy.options).toEqual(['أ', 'ب'])
    copy.options.push('ج')
    expect(original.options).toEqual(['أ', 'ب'])
  })

  it('a section is copied with everything in it, after its last block', () => {
    const { blocks, keys: made } = duplicateBlock(sample(), 's1')

    expect(blocks.map((x) => x.type)).toEqual(['text', 'section', 'text', 'text', 'section', 'text', 'text', 'section', 'text'])
    expect(blocks).toHaveLength(9)
    expect(keys(blocks).slice(0, 4)).toEqual(['q1', 's1', 'q2', 'q3'])
    expect(made).toHaveLength(3)
    expect(blocks.slice(4, 7).map((x) => x.key)).toEqual(made)
    expect(blocks[4].type).toBe('section')
    expect(blocks[4].label).toBe('s1 (نسخة)')
    expect(blocks.slice(4, 7).every((x) => x.serverId === null)).toBe(true)
    expect(keys(blocks).slice(7)).toEqual(['s2', 'q4'])
  })

  it('a description or a page break is copied as it is (no "copy" suffix on a label that is not there)', () => {
    const { blocks } = duplicateBlock([b('p', 'page_break', { label: '' })], 'p')
    expect(blocks[1].label).toBe('')
  })
})

describe('changing a block', () => {
  it('a type change keeps the text and required flag; options carry between choice types and are dropped otherwise', () => {
    const radio = b('r', 'radio', { options: ['أ', 'ب'], required: true, config: { default_value: 'أ' } })
    const select = changeType(radio, 'select')
    expect(select).toMatchObject({ type: 'select', label: 'r', required: true, options: ['أ', 'ب'] })
    expect(select.config).toEqual({})
    expect(changeType(select, 'radio').options).toEqual(['أ', 'ب'])
    expect(changeType(makeBlock('text', { placeholder: 'x' }), 'email').placeholder).toBe('x')
    expect(changeType(makeBlock('text', { placeholder: 'x' }), 'text')).toBeDefined()
  })
})

describe('what is sent', () => {
  it('a block that has never been saved is sent with a negative id; a saved one keeps its id', () => {
    const doc = docOf([b('a', 'text', { serverId: 11 }), b('c')])
    const payload = toDraftPayload(doc)
    expect(payload.questions.map((q) => q.id)).toEqual([11, -2])
    expect(payload.questions.map((q) => q.sort_order)).toEqual([1, 2])
  })

  it('does not send what does not apply: required on a heading, options on a text field, empty options', () => {
    const heading = toQuestion(b('h', 'section', { required: true, helpText: 'x', options: ['a'] }), 0)
    expect(heading.required).toBe(false)
    expect(heading.help_text).toBeNull()
    expect(heading.options).toBeUndefined()
    expect(toQuestion(b('t', 'text', { options: ['a'] }), 0).options).toBeUndefined()
    expect(toQuestion(b('r', 'radio', { options: [' أ ', '', 'أ', 'ب'] }), 0).options).toEqual(['أ', 'ب'])
    expect(toQuestion(b('t', 'select', { placeholder: 'اختر' }), 0).placeholder).toBe('اختر')
    expect(toQuestion(b('t', 'date', { placeholder: 'ignored' }), 0).placeholder).toBeNull()
  })

  it('empty settings are the same as no settings, so switching a limit off leaves nothing behind', () => {
    expect(pruneConfig({ validation: { min_length: undefined, integer_only: false }, scale: {}, default_value: '' })).toBeNull()
    expect(pruneConfig({ validation: { max_length: 10, min_length: undefined } })).toEqual({ validation: { max_length: 10 } })
    expect(pruneConfig({ default_value: ['a'] })).toEqual({ default_value: ['a'] })
  })

  it('the save signature ignores stored ids but sees every real change', () => {
    const doc = docOf([b('a'), b('c')])
    const stored = docOf(doc.blocks.map((x, i) => ({ ...x, serverId: 100 + i })))
    expect(signatureOf(stored)).toBe(signatureOf(doc))
    expect(signatureOf({ ...doc, title: 'آخر' })).not.toBe(signatureOf(doc))
    expect(signatureOf(docOf(moveBy(doc.blocks, 'c', -1)))).not.toBe(signatureOf(doc))
    expect(signatureOf(docOf([{ ...doc.blocks[0], required: true }, doc.blocks[1]]))).not.toBe(signatureOf(doc))
  })

  it('loads a form from the API and sends it back unchanged', () => {
    const questions: FormQuestion[] = [
      { id: 5, label: 'ب', type: 'radio', required: true, sort_order: 2, options: ['x'], help_text: 'h', config: { default_value: 'x' } },
      { id: 4, label: 'أ', type: 'star_rating', required: false, sort_order: 1, config: { scale: { max: 7 } }, has_answers: true },
    ]
    const doc = docFromForm({ title: 'ت', description: 'و', form_type: 'complaint', questions })

    expect(doc.blocks.map((x) => [x.key, x.serverId, x.hasAnswers])).toEqual([['s4', 4, true], ['s5', 5, false]])
    const sent = toDraftPayload(doc).questions
    expect(sent[0]).toMatchObject({ id: 4, type: 'star_rating', config: { scale: { max: 7 } } })
    expect(sent[1]).toMatchObject({ id: 5, options: ['x'], help_text: 'h', config: { default_value: 'x' } })
  })
})

describe('mistakes the server would refuse', () => {
  it('names each of them in words', () => {
    expect(blockIssue(b('q', 'text', { label: '  ' }))).toBe('اكتب نص السؤال.')
    expect(blockIssue(b('s', 'section', { label: '' }))).toBe('اكتب عنوان القسم.')
    expect(blockIssue(b('d', 'description', { description: '' }))).toBe('اكتب نص الفقرة التوضيحية.')
    expect(blockIssue(b('p', 'page_break', { label: '' }))).toBeNull()
    expect(blockIssue(b('r', 'radio', { options: ['', ' '] }))).toBe('أضف خياراً واحداً على الأقل لهذا السؤال.')
    expect(blockIssue(b('c', 'checkbox', { options: [] }))).toBeNull()
    expect(blockIssue(b('t', 'text', { config: { validation: { min_length: 10, max_length: 5 } } }))).toContain('الحد الأقصى')
    expect(blockIssue(b('n', 'number', { config: { validation: { min: 9, max: 1 } } }))).toContain('الحد الأعلى')
    expect(blockIssue(b('n', 'number', { config: { validation: { min: 1, max: 5 }, default_value: 9 } }))).toContain('خارج الحدود')
    expect(blockIssue(b('l', 'linear_scale', { config: { scale: { min: 1, max: 1 } } }))).toContain('نهاية المقياس')
    expect(blockIssue(b('m', 'checkbox', { options: ['a', 'b'], config: { validation: { min_choices: 3 } } }))).toContain('أكبر من عدد الخيارات')
    expect(blockIssue(b('r', 'radio', { options: ['a'], config: { default_value: 'z' } }))).toContain('من الخيارات')
    expect(blockIssue(b('ok', 'star_rating', { config: { scale: { max: 5 } } }))).toBeNull()
  })

  it('a document with no title is not ready to save', () => {
    expect(docIssues({ ...docOf([b('q')]), title: ' ' }).__title).toBeTruthy()
    expect(docIssues(docOf([b('q')]))).toEqual({})
  })
})

// ── The editing state and its history ───────────────────────────────────────

const run = (state: BuilderState, ...actions: BuilderAction[]) => actions.reduce(builderReducer, state)
const at = (n: number) => n

describe('undo and redo', () => {
  it('insert, move, duplicate, change type and delete are each one step, and undo walks them back in order', () => {
    let s = initialState(docOf([b('a'), b('c')]))
    s = run(s,
      { type: 'insert', blockType: 'email', index: 1, at: at(1) },
      { type: 'move', key: 'a', toIndex: 2, at: at(2) },
      { type: 'duplicate', key: 'c', at: at(3) },
      { type: 'changeType', key: 'c', blockType: 'textarea', at: at(4) },
      { type: 'remove', key: 'c', at: at(5) },
    )
    expect(s.past).toHaveLength(5)

    for (let i = 5; i > 0; i--) s = builderReducer(s, { type: 'undo' })
    expect(keys(s.doc.blocks)).toEqual(['a', 'c'])
    expect(s.future).toHaveLength(5)

    for (let i = 0; i < 5; i++) s = builderReducer(s, { type: 'redo' })
    expect(s.future).toHaveLength(0)
    expect(s.doc.blocks.find((x) => x.key === 'c')).toBeUndefined()
  })

  it('typing in one field is one step per burst; another field or a pause starts a new one', () => {
    let s = initialState(docOf([b('a'), b('c')]))
    const type = (key: string, field: string, value: string, t: number): BuilderAction => ({ type: 'edit', key, patch: { label: value }, field, at: t })

    s = run(s, type('a', 'label', 'س', 1000), type('a', 'label', 'سؤ', 1100), type('a', 'label', 'سؤا', 1200))
    expect(s.past).toHaveLength(1)
    s = run(s, type('c', 'label', 'ص', 1300))
    expect(s.past).toHaveLength(2)
    s = run(s, type('c', 'label', 'صص', 1300 + COALESCE_MS + 1))
    expect(s.past).toHaveLength(3)

    s = builderReducer(s, { type: 'undo' })
    expect(s.doc.blocks[1].label).toBe('ص')
    s = builderReducer(s, { type: 'undo' })
    s = builderReducer(s, { type: 'undo' })
    expect(s.doc.blocks[0].label).toBe('a')
  })

  it('a new edit after an undo drops the redo branch', () => {
    let s = run(initialState(docOf([b('a')])), { type: 'insert', blockType: 'text', at: 1 }, { type: 'undo' })
    expect(s.future).toHaveLength(1)
    s = run(s, { type: 'insert', blockType: 'email', at: 2 })
    expect(s.future).toHaveLength(0)
  })

  it('does nothing when there is nothing to undo or redo, and a no-op edit is not a step', () => {
    const s = initialState(docOf([b('a')]))
    expect(builderReducer(s, { type: 'undo' })).toBe(s)
    expect(builderReducer(s, { type: 'redo' })).toBe(s)
    expect(builderReducer(s, { type: 'edit', key: 'a', patch: {}, field: 'x', at: 1 })).toBe(s)
    expect(builderReducer(s, { type: 'moveBy', key: 'a', delta: -1, at: 1 })).toBe(s)
  })

  it('history is bounded', () => {
    let s = initialState(docOf([]))
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) s = builderReducer(s, { type: 'insert', blockType: 'text', at: i })
    expect(s.past).toHaveLength(HISTORY_LIMIT)
  })

  it('insert goes after the selected block, or at the end; inserting selects the new block', () => {
    let s = initialState(docOf([b('a'), b('c')]))
    s = run(s, { type: 'select', key: 'a' }, { type: 'insert', blockType: 'email', at: 1 })
    expect(s.doc.blocks.map((x) => x.type)).toEqual(['text', 'email', 'text'])
    expect(s.selectedKey).toBe(s.doc.blocks[1].key)
    s = run(initialState(docOf([b('a')])), { type: 'insert', blockType: 'url', at: 1 })
    expect(s.doc.blocks[1].type).toBe('url')
  })

  it('deleting a section removes what is in it, and undo brings all of it back', () => {
    let s = run(initialState(docOf(sample())), { type: 'remove', key: 's1', at: 1 })
    expect(keys(s.doc.blocks)).toEqual(['q1', 's2', 'q4'])
    s = builderReducer(s, { type: 'undo' })
    expect(keys(s.doc.blocks)).toEqual(keys(sample()))
  })

  it('selection survives undo only while the block exists', () => {
    let s = run(initialState(docOf([b('a')])), { type: 'insert', blockType: 'text', at: 1 })
    const added = s.selectedKey
    s = builderReducer(s, { type: 'undo' })
    expect(s.selectedKey).not.toBe(added)
    expect(s.selectedKey).toBeNull()
  })

  it('remembers the ids the server gave, in the present and in every undo step', () => {
    let s = run(initialState(docOf([b('a')])), { type: 'insert', blockType: 'text', at: 1 })
    const added = s.doc.blocks[1].key
    s = builderReducer(s, { type: 'saved', serverIds: { [added]: 77 } })
    expect(s.doc.blocks[1].serverId).toBe(77)

    s = builderReducer(s, { type: 'undo' })
    expect(s.doc.blocks).toHaveLength(1)
    s = builderReducer(s, { type: 'redo' })
    expect(s.doc.blocks[1].serverId).toBe(77)
  })

  it('an id given to a block that only exists in an undone step is not lost when that step is redone', () => {
    let s = run(initialState(docOf([b('a')])), { type: 'insert', blockType: 'text', at: 1 })
    const first = s.doc.blocks[1].key
    s = run(s, { type: 'insert', blockType: 'email', at: 2 }, { type: 'undo' })
    // The editor saved while the second insert was undone: the server stored the first block only.
    s = builderReducer(s, { type: 'saved', serverIds: { [first]: 55 } })
    s = builderReducer(s, { type: 'redo' })

    expect(s.doc.blocks.find((x) => x.key === first)?.serverId).toBe(55)
    expect(s.doc.blocks[2].serverId).toBeNull()
  })

  it('replacing the document (load the latest) starts the history over', () => {
    let s = run(initialState(docOf([b('a')])), { type: 'insert', blockType: 'text', at: 1 })
    s = builderReducer(s, { type: 'replace', doc: docOf([b('z')]) })
    expect(s.past).toHaveLength(0)
    expect(keys(s.doc.blocks)).toEqual(['z'])
  })
})

describe('what a finished drag means', () => {
  const list = sample()

  it('a library item dropped on a block goes before or after it, on empty space at the end', () => {
    expect(resolveDrop(libraryId('email'), 'q2', list, false)).toEqual({ kind: 'insert', blockType: 'email', index: 2 })
    expect(resolveDrop(libraryId('email'), 'q2', list, true)).toEqual({ kind: 'insert', blockType: 'email', index: 3 })
    expect(resolveDrop(libraryId('url'), CANVAS_END, list, false)).toEqual({ kind: 'insert', blockType: 'url', index: 6 })
    expect(resolveDrop(libraryId('url'), null, list, false)).toBeNull()
  })

  it('a block dropped on another takes its place, including across a section heading', () => {
    expect(resolveDrop('q1', 'q3', list, false)).toEqual({ kind: 'move', key: 'q1', toIndex: 3 })
    expect(resolveDrop('q4', 's1', list, false)).toEqual({ kind: 'move', key: 'q4', toIndex: 1 })
    expect(resolveDrop('q2', CANVAS_END, list, false)).toEqual({ kind: 'move', key: 'q2', toIndex: 5 })
    expect(resolveDrop('q2', 'q2', list, false)).toBeNull()
  })

  it('a section dropped on a block of another section moves the whole group', () => {
    expect(resolveDrop('s2', 'q2', list, false)).toEqual({ kind: 'reorderGroups', from: 2, to: 1 })
    expect(resolveDrop('s1', 'q4', list, false)).toEqual({ kind: 'reorderGroups', from: 1, to: 2 })
    expect(resolveDrop('s1', 'q3', list, false)).toBeNull()
    expect(resolveDrop('s1', CANVAS_END, list, false)).toEqual({ kind: 'reorderGroups', from: 1, to: 2 })
  })
})

// ── The respondent's side of the same rules ─────────────────────────────────

const q = (type: QuestionType, extra: Partial<FormQuestion> = {}): FormQuestion => ({ id: 1, label: 'س', type, required: false, sort_order: 1, ...extra })

describe('answer checks', () => {
  it('required is enforced for every kind of value and never for blocks that are not answered', () => {
    for (const type of ['text', 'email', 'number', 'date', 'time', 'yes_no', 'star_rating', 'file'] as QuestionType[]) {
      expect(validateAnswer(q(type, { required: true }), undefined), type).toBe('هذا الحقل مطلوب.')
    }
    expect(validateAnswer(q('checkbox', { required: true, options: ['a'] }), [])).toBe('هذا الحقل مطلوب.')
    expect(validateAnswer(q('consent', { required: true }), '')).toContain('الموافقة')
    for (const type of ['section', 'description', 'page_break'] as QuestionType[]) expect(validateAnswer(q(type, { required: true }), undefined)).toBeNull()
  })

  it('each type refuses what does not belong to it and accepts what does', () => {
    const ok = (type: QuestionType, v: string | string[], extra: Partial<FormQuestion> = {}) => expect(validateAnswer(q(type, extra), v), `${type} ${v}`).toBeNull()
    const bad = (type: QuestionType, v: string | string[], extra: Partial<FormQuestion> = {}) => expect(validateAnswer(q(type, extra), v), `${type} ${v}`).toBeTruthy()

    ok('email', 'a@b.co'); bad('email', 'nope')
    ok('phone', '+966 50 123 4567'); bad('phone', 'abc')
    ok('url', 'https://example.com/a'); bad('url', 'javascript:alert(1)'); bad('url', 'example.com')
    ok('number', '5'); bad('number', 'x')
    ok('number', '3', { config: { validation: { min: 1, max: 5 } } }); bad('number', '6', { config: { validation: { min: 1, max: 5 } } })
    bad('number', '2.5', { config: { validation: { integer_only: true } } })
    ok('date', '2026-10-18'); bad('date', '18/10/2026')
    bad('date', '2019-12-31', { config: { validation: { min_date: '2020-01-01' } } })
    ok('time', '14:30'); bad('time', '25:00')
    ok('text', 'abc', { config: { validation: { min_length: 2, max_length: 5 } } }); bad('text', 'a', { config: { validation: { min_length: 2 } } }); bad('text', 'abcdef', { config: { validation: { max_length: 5 } } })
    ok('radio', 'a', { options: ['a', 'b'] }); bad('radio', 'z', { options: ['a', 'b'] })
    ok('checkbox', ['a', 'b'], { options: ['a', 'b'] }); bad('checkbox', ['a', 'b'], { options: ['a', 'b'], config: { validation: { max_choices: 1 } } })
    bad('checkbox', ['a'], { options: ['a', 'b'], config: { validation: { min_choices: 2 } } })
    ok('yes_no', 'yes'); ok('yes_no', 'no'); bad('yes_no', 'maybe')
    ok('consent', 'yes'); bad('consent', 'no')
    ok('star_rating', '5'); bad('star_rating', '6'); ok('star_rating', '7', { config: { scale: { max: 7 } } }); bad('star_rating', '0')
    ok('linear_scale', '10', { config: { scale: { min: 1, max: 10 } } }); bad('linear_scale', '11', { config: { scale: { min: 1, max: 10 } } })
    ok('linear_scale', '0', { config: { scale: { min: 0, max: 5 } } })
  })

  it('files: size, and images only for an image question', () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'a.png')
    expect(validateAnswer(q('file'), big)).toContain('5 ميغابايت')
    expect(validateAnswer(q('image'), new File(['x'], 'a.pdf'))).toContain('صور')
    expect(validateAnswer(q('image'), new File(['x'], 'a.PNG'))).toBeNull()
    expect(validateAnswer(q('file'), new File(['x'], 'a.pdf'))).toBeNull()
  })

  it('starts with each question\'s default and splits pages at page breaks', () => {
    const defaults = initialValues([
      q('text', { id: 1, config: { default_value: 'مرحبا' } }),
      q('checkbox', { id: 2, options: ['a', 'b'], config: { default_value: ['a'] } }),
      q('number', { id: 3, config: { default_value: 5 } }),
      q('text', { id: 4 }),
    ])
    expect(defaults).toEqual({ 1: 'مرحبا', 2: ['a'], 3: '5' })

    const pages = splitPages([q('text', { id: 1 }), q('page_break', { id: 2 }), q('text', { id: 3 }), q('page_break', { id: 4 }), q('page_break', { id: 5 }), q('text', { id: 6 })])
    expect(pages.map((p) => p.map((x) => x.id))).toEqual([[1], [3], [6]])
    expect(splitPages([]).length).toBe(1)
  })
})
