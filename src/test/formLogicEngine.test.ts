import { describe, expect, it } from 'vitest'
import vectors from '@/test/fixtures/formLogicVectors.json'
import {
  answerOf,
  canBeSource,
  conditionIssue,
  describeRule,
  logicIssues,
  operatorLabel,
  operatorsFor,
  unansweredNote,
  visibility,
} from '@/components/operations/formBuilder/formLogic'
import type { LogicBlock } from '@/components/operations/formBuilder/formLogic'
import type { QuestionLogic, QuestionType } from '@/types/operations'

/**
 * The browser's rules engine, held to the SAME vectors as the server's (tests/fixtures/form_logic_vectors.json in the backend; the
 * two files are identical). If one engine ever reads a rule differently from the other, one of the two suites fails.
 */

type Vector = { name: string; blocks: LogicBlock[]; answers: Record<string, string | string[] | true>; expect: Record<string, boolean> }

describe('the shared vectors', () => {
  const cases = vectors as unknown as Vector[]

  it('is the substantial file the server runs too', () => {
    expect(cases.length).toBeGreaterThan(100)
  })

  it.each(cases.map((c, i) => [`${String(i + 1).padStart(3, '0')} ${c.name}`, c] as const))('%s', (_name, c) => {
    const answers: Record<number, string | string[] | File> = {}
    for (const [id, value] of Object.entries(c.answers)) answers[Number(id)] = value === true ? new File(['x'], 'a.pdf') : value

    const visible = visibility(c.blocks, answers)

    for (const [id, expected] of Object.entries(c.expect)) expect(visible[Number(id)], `block ${id}`).toBe(expected)
  })
})

describe('operators per question type', () => {
  it('offers only what makes sense for the type', () => {
    expect(operatorsFor('text')).toEqual(['equals', 'not_equals', 'contains', 'not_contains', 'is_empty', 'is_not_empty'])
    expect(operatorsFor('number')).toEqual(['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'is_empty', 'is_not_empty'])
    expect(operatorsFor('date')).toEqual(operatorsFor('number'))
    expect(operatorsFor('select')).toEqual(['equals', 'not_equals', 'any_of', 'none_of', 'is_empty', 'is_not_empty'])
    expect(operatorsFor('checkbox')).toEqual(['contains', 'not_contains', 'any_of', 'none_of', 'is_empty', 'is_not_empty'])
    expect(operatorsFor('yes_no')).toEqual(['equals', 'not_equals', 'is_empty', 'is_not_empty'])
    expect(operatorsFor('file')).toEqual(['is_empty', 'is_not_empty'])
    expect(operatorsFor('consent')).toEqual(['is_empty', 'is_not_empty'])
    for (const type of ['section', 'description', 'page_break'] as QuestionType[]) {
      expect(operatorsFor(type)).toEqual([])
      expect(canBeSource(type)).toBe(false)
    }
  })

  it('names operators for the type: before / after for dates, contains the option for multiple choice', () => {
    expect(operatorLabel('date', 'lt')).toBe('قبل')
    expect(operatorLabel('date', 'gt')).toBe('بعد')
    expect(operatorLabel('number', 'lt')).toBe('أصغر من')
    expect(operatorLabel('checkbox', 'contains')).toBe('تتضمن الخيار')
    expect(operatorLabel('select', 'any_of')).toBe('إحدى هذه القيم')
    expect(operatorLabel('consent', 'is_not_empty')).toBe('تمت الموافقة')
  })
})

describe('reading answers', () => {
  it('trims text, treats blanks as no answer and reads files and lists', () => {
    expect(answerOf('text', '  ab  ')).toBe('ab')
    expect(answerOf('text', '   ')).toBeNull()
    expect(answerOf('text', undefined)).toBeNull()
    expect(answerOf('number', 5)).toBe('5')
    expect(answerOf('checkbox', ['a', ' ', 'b'])).toEqual(['a', 'b'])
    expect(answerOf('checkbox', [])).toBeNull()
    expect(answerOf('file', new File(['x'], 'a.pdf'))).toBe(true)
    expect(answerOf('file', undefined)).toBeNull()
  })
})

describe('checking a condition the way the server does', () => {
  const select = { type: 'select' as QuestionType, options: ['أ', 'ب'] }

  it('accepts what the server accepts', () => {
    expect(conditionIssue(select, { question: 1, operator: 'equals', value: 'أ' })).toBeNull()
    expect(conditionIssue(select, { question: 1, operator: 'any_of', value: ['أ', 'ب'] })).toBeNull()
    expect(conditionIssue({ type: 'text' }, { question: 1, operator: 'is_empty' })).toBeNull()
    expect(conditionIssue({ type: 'number' }, { question: 1, operator: 'gte', value: '18' })).toBeNull()
    expect(conditionIssue({ type: 'date' }, { question: 1, operator: 'lt', value: '2026-02-28' })).toBeNull()
    expect(conditionIssue({ type: 'time' }, { question: 1, operator: 'gt', value: '13:30' })).toBeNull()
    expect(conditionIssue({ type: 'checkbox' }, { question: 1, operator: 'contains', value: 'نعم' })).toBeNull()
  })

  it.each([
    ['a missing source', undefined, { question: 1, operator: 'equals' as const, value: 'x' }],
    ['a heading as the source', { type: 'section' as QuestionType }, { question: 1, operator: 'is_empty' as const }],
    ['an operator of another type', { type: 'text' as QuestionType }, { question: 1, operator: 'gt' as const, value: '1' }],
    ['a blank value', { type: 'text' as QuestionType }, { question: 1, operator: 'equals' as const, value: '  ' }],
    ['a missing value', { type: 'text' as QuestionType }, { question: 1, operator: 'equals' as const }],
    ['a non-numeric number', { type: 'number' as QuestionType }, { question: 1, operator: 'gt' as const, value: 'abc' }],
    ['an impossible date', { type: 'date' as QuestionType }, { question: 1, operator: 'lt' as const, value: '2026-02-30' }],
    ['a time out of range', { type: 'time' as QuestionType }, { question: 1, operator: 'gt' as const, value: '25:00' }],
    ['an option the question lacks', select, { question: 1, operator: 'equals' as const, value: 'د' }],
    ['a list with a foreign option', select, { question: 1, operator: 'any_of' as const, value: ['أ', 'د'] }],
    ['an empty list', select, { question: 1, operator: 'any_of' as const, value: [] }],
    ['yes/no with another word', { type: 'yes_no' as QuestionType }, { question: 1, operator: 'equals' as const, value: 'maybe' }],
  ])('refuses %s', (_name, source, condition) => {
    expect(conditionIssue(source, condition)).not.toBeNull()
  })
})

describe('how rules refer to each other', () => {
  const reads = (id: number): QuestionLogic => ({ action: 'show', match: 'all', conditions: [{ question: id, operator: 'is_not_empty' }] })
  const b = (id: number, type: QuestionType = 'text', logic?: QuestionLogic, label = `س${id}`): LogicBlock => ({ id, type, label, logic })

  it('finds nothing wrong when every rule reads an earlier block', () => {
    expect(logicIssues([b(1), b(2, 'text', reads(1)), b(3, 'text', reads(2))])).toEqual([])
    expect(logicIssues([])).toEqual([])
  })

  it('reports a rule that reads a later block, naming both', () => {
    const issues = logicIssues([b(1, 'text', reads(2), 'الاسم'), b(2, 'text', undefined, 'العمر')])

    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ id: 1, code: 'forward' })
    expect(issues[0].message).toContain('«الاسم»')
    expect(issues[0].message).toContain('«العمر»')
  })

  it('reports a rule that reads itself, or a block that is not there', () => {
    expect(logicIssues([b(1, 'text', reads(1))])[0].code).toBe('self')
    expect(logicIssues([b(1), b(2, 'text', reads(99))])[0]).toMatchObject({ id: 2, code: 'missing' })
  })

  it('reports a ring on every block in it', () => {
    const issues = logicIssues([b(1, 'text', reads(3)), b(2, 'text', reads(1)), b(3, 'text', reads(2))]).filter((i) => i.code === 'cycle')

    expect(issues.map((i) => i.id).sort()).toEqual([1, 2, 3])
    expect(issues[0].message).toContain('حلقة')
  })

  it('treats a section that reads a block inside itself as a cycle', () => {
    expect(logicIssues([b(1, 'section', reads(2)), b(2)]).map((i) => i.code)).toContain('cycle')
  })

  it('evaluates a tangled form to one fixed result', () => {
    const blocks = [b(1, 'text', reads(3)), b(2, 'text', reads(1)), b(3, 'text', reads(2))]

    expect(visibility(blocks, { 1: 'a', 2: 'b', 3: 'c' })).toEqual({ 1: false, 2: false, 3: false })
  })
})

describe('saying a rule in Arabic', () => {
  const sources: Record<number, { type: QuestionType; options?: string[]; name: string }> = {
    1: { type: 'yes_no', name: 'هل أنت موظف؟' },
    2: { type: 'number', name: 'العمر' },
    3: { type: 'checkbox', options: ['برمجة', 'تصميم'], name: 'الاهتمامات' },
    4: { type: 'consent', name: 'الموافقة' },
    5: { type: 'file', name: 'السيرة' },
    6: { type: 'date', name: 'تاريخ الميلاد' },
  }
  const say = (logic: QuestionLogic) => describeRule(logic, (id) => sources[id])

  it('says a single condition as one sentence', () => {
    expect(say({ action: 'show', match: 'all', conditions: [{ question: 1, operator: 'equals', value: 'yes' }] })).toBe('يظهر هذا العنصر فقط إذا كانت إجابة «هل أنت موظف؟» تساوي «نعم».')
    expect(say({ action: 'hide', match: 'all', conditions: [{ question: 2, operator: 'lt', value: 18 }] })).toBe('يُخفى هذا العنصر إذا كانت إجابة «العمر» أصغر من «18».')
    expect(say({ action: 'show', match: 'all', conditions: [{ question: 6, operator: 'lt', value: '2026-01-01' }] })).toBe('يظهر هذا العنصر فقط إذا كانت إجابة «تاريخ الميلاد» قبل «2026-01-01».')
  })

  it('says emptiness, consent and attachments in plain words', () => {
    expect(say({ action: 'show', match: 'all', conditions: [{ question: 2, operator: 'is_empty' }] })).toBe('يظهر هذا العنصر فقط إذا لم يُجب على «العمر».')
    expect(say({ action: 'show', match: 'all', conditions: [{ question: 4, operator: 'is_not_empty' }] })).toBe('يظهر هذا العنصر فقط إذا وافق المجيب على «الموافقة».')
    expect(say({ action: 'hide', match: 'all', conditions: [{ question: 5, operator: 'is_empty' }] })).toBe('يُخفى هذا العنصر إذا لم يُرفق ملف في «السيرة».')
  })

  it('says every condition when there are several, with AND or OR', () => {
    const both = say({ action: 'show', match: 'all', conditions: [{ question: 1, operator: 'equals', value: 'yes' }, { question: 3, operator: 'any_of', value: ['برمجة', 'تصميم'] }] })
    expect(both).toBe('يظهر هذا العنصر فقط إذا تحققت كل الشروط التالية: (1) كانت إجابة «هل أنت موظف؟» تساوي «نعم»، (2) كانت إجابة «الاهتمامات» تتضمن أياً من «برمجة» أو «تصميم».')

    const either = say({ action: 'show', match: 'any', conditions: [{ question: 2, operator: 'gte', value: 18 }, { question: 1, operator: 'equals', value: 'no' }] })
    expect(either).toContain('تحقق أي شرط من الشروط')
  })

  it('says what a block without a rule does, and names a deleted source', () => {
    expect(describeRule(null, () => undefined)).toBe('هذا العنصر يظهر دائماً.')
    expect(describeRule({ action: 'show', match: 'all', conditions: [{ question: 77, operator: 'is_empty' }] }, () => undefined)).toContain('محذوف')
    expect(describeRule({ action: 'show', match: 'all', conditions: [{ question: 1, operator: 'equals', value: 'yes' }] }, (id) => sources[id], 'هذه الخطوة')).toContain('هذه الخطوة')
  })

  it('is honest about unanswered questions', () => {
    expect(unansweredNote({ action: 'show', match: 'all', conditions: [{ question: 1, operator: 'equals', value: 'yes' }] })).toContain('لا يتحقق')
    expect(unansweredNote({ action: 'show', match: 'all', conditions: [{ question: 1, operator: 'not_equals', value: 'yes' }] })).toContain('تتحقق')
  })
})
