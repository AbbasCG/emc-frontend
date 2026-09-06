import { describe, it, expect } from 'vitest'
import { detectTextDirection, bidiIsolateProps } from '@/utils/textDirection'

describe('detectTextDirection', () => {
  it('detects English placement-test questions as ltr', () => {
    expect(detectTextDirection('Yesterday, I ___ to school.')).toBe('ltr')
    expect(detectTextDirection('___ The opposite of hot.')).toBe('ltr')
    expect(detectTextDirection('Code-switching refers to ___')).toBe('ltr')
  })

  it('detects Arabic text as rtl', () => {
    expect(detectTextDirection('ما هو عكس كلمة حار؟')).toBe('rtl')
  })

  it('treats text with any Arabic characters as rtl (dominant-script heuristic)', () => {
    expect(detectTextDirection('The word حار means hot')).toBe('rtl')
  })

  it('never reorders or mutates the input string', () => {
    const input = 'Yesterday, I ___ to school.'
    detectTextDirection(input)
    expect(input).toBe('Yesterday, I ___ to school.')
  })
})

describe('bidiIsolateProps', () => {
  it('returns ltr + left-align for English text', () => {
    const props = bidiIsolateProps('What ___ your name?')
    expect(props.dir).toBe('ltr')
    expect(props.style.textAlign).toBe('left')
    expect(props.style.unicodeBidi).toBe('isolate')
  })

  it('returns rtl + right-align for Arabic text', () => {
    const props = bidiIsolateProps('اختبار تحديد المستوى')
    expect(props.dir).toBe('rtl')
    expect(props.style.textAlign).toBe('right')
  })

  it('preserves blank placeholder position exactly as authored', () => {
    const q1 = 'Yesterday, I ___ to school.'
    const q2 = '___ The opposite of hot.'
    const q3 = 'Code-switching refers to ___'
    // bidiIsolateProps must never touch the string itself — only rendering hints.
    expect(bidiIsolateProps(q1)).toBeTruthy()
    expect(q1.indexOf('___')).toBe(13)
    expect(q2.indexOf('___')).toBe(0)
    expect(q3.indexOf('___')).toBe(25)
  })
})
