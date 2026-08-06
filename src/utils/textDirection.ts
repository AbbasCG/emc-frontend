/**
 * Detects the dominant script of a string to pick the correct `dir` for
 * bidi-isolated rendering. Used for exam question/option text, which is
 * authored in English but displayed inside an RTL (Arabic) page shell —
 * without an explicit dir + unicode-bidi isolation, the browser's bidi
 * algorithm can misplace trailing punctuation relative to the container's
 * base direction.
 *
 * Never reorders or rewrites the text itself — only chooses how to render it.
 */

const ARABIC_RANGE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/

export type TextDirection = 'ltr' | 'rtl'

export function detectTextDirection(text: string): TextDirection {
  return ARABIC_RANGE.test(text) ? 'rtl' : 'ltr'
}

/** Inline style + dir props to spread onto an element rendering possibly-mixed-language text. */
export function bidiIsolateProps(text: string): { dir: TextDirection; style: { unicodeBidi: 'isolate'; textAlign: 'left' | 'right' } } {
  const dir = detectTextDirection(text)
  return {
    dir,
    style: { unicodeBidi: 'isolate', textAlign: dir === 'ltr' ? 'left' : 'right' },
  }
}
