import { describe, it, expect } from 'vitest'
import {
  ageFromBirthDate,
  codeLabel,
  commitmentAnswers,
  consentLabel,
  motivationAnswers,
  nationalityLabel,
  situationalAnswers,
  skillRatingLabel,
  textOrNull,
} from '@/lib/volunteerRequestLabels'
import { toHttpUrl } from '@/utils/safeUrl'
import { bioHasHtmlTags, languagesProblem, validateVolunteerStep } from '@/lib/volunteerApply/validation'
import { initialVolunteerForm } from '@/lib/volunteerApply/formModel'

describe('volunteer request labels', () => {
  it('maps stored codes to Arabic and leaves free text alone', () => {
    expect(codeLabel('full_time')).toBe('دوام كامل')
    expect(codeLabel('Flexible')).toBe('مرن')
    expect(codeLabel('yes')).toBe('نعم')
    expect(codeLabel('male')).toBe('ذكر')
    expect(codeLabel('أيام الإجازة فقط')).toBe('أيام الإجازة فقط')
    expect(codeLabel('some_future_code')).toBe('some_future_code')
    expect(codeLabel('  ')).toBeNull()
    expect(codeLabel(null)).toBeNull()
  })

  it('the consent has three states and never turns «not answered» into «no»', () => {
    expect(consentLabel(true)).toBe('نعم')
    expect(consentLabel(false)).toBe('لا')
    expect(consentLabel(null)).toBe('لم يُجب')
    expect(consentLabel(undefined)).toBe('لم يُجب')
  })

  it('computes the age on the birthday and refuses nonsense', () => {
    const now = new Date('2026-11-17T12:00:00Z')
    expect(ageFromBirthDate('2000-11-17', now)).toBe(26)
    expect(ageFromBirthDate('2000-11-18', now)).toBe(25)
    expect(ageFromBirthDate('not a date', now)).toBeNull()
    expect(ageFromBirthDate('2090-01-01', now)).toBeNull()
    expect(ageFromBirthDate(null, now)).toBeNull()
  })

  it('nationality: a demonym or ISO code becomes the country name; free text stays', () => {
    expect(nationalityLabel('يمني')).toBe('اليمن')
    expect(nationalityLabel('YE')).toBe('اليمن')
    expect(nationalityLabel('مواطن عالمي')).toBe('مواطن عالمي')
    expect(nationalityLabel('')).toBeNull()
  })

  it('skill rating and scale answers use the apply form’s own wording; unknown keys are kept', () => {
    expect(skillRatingLabel(4)).toBe('4 / 5 · متقدم')
    expect(skillRatingLabel(9)).toBe('9 / 5')
    expect(skillRatingLabel(null)).toBeNull()

    expect(motivationAnswers({ m1: 5, zzz: 2 })).toEqual([
      { key: 'm1', question: 'أرغب في المساهمة في خدمة المجتمع وتحقيق أثر إيجابي', answer: '5 / 5 · أتفق بشدة' },
      { key: 'zzz', question: 'zzz', answer: '2 / 5 · لا أتفق' },
    ])
    expect(commitmentAnswers({ c3: '4' })[0].answer).toBe('4 / 5 · أتفق')
    expect(situationalAnswers({ sit_feedback: 'أتجاهلها.' })[0]).toMatchObject({ key: 'sit_feedback', answer: 'أتجاهلها.' })
    expect(motivationAnswers(null)).toEqual([])
    expect(textOrNull(0)).toBe('0')

    // a garbage request cannot flood the window: only the first 100 answers are read
    const many = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`q${i}`, 3]))
    expect(motivationAnswers(many)).toHaveLength(100)
    expect(commitmentAnswers(many)).toHaveLength(100)
    expect(situationalAnswers(Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`s${i}`, 'x'])))).toHaveLength(100)
  })
})

describe('toHttpUrl', () => {
  it('accepts http(s) addresses and completes a bare host with https://', () => {
    expect(toHttpUrl('https://www.linkedin.com/in/ali')).toBe('https://www.linkedin.com/in/ali')
    expect(toHttpUrl('http://example.com')).toBe('http://example.com')
    expect(toHttpUrl('linkedin.com/in/ali')).toBe('https://linkedin.com/in/ali')
    expect(toHttpUrl('  www.example.org  ')).toBe('https://www.example.org')
  })

  it('treats «host:port/path» as a bare host (https://), not as a scheme', () => {
    expect(toHttpUrl('example.com:8080/x')).toBe('https://example.com:8080/x')
    expect(toHttpUrl('www.example.org:443')).toBe('https://www.example.org:443')
    expect(toHttpUrl('linkedin.com/in/ali?x=1#top')).toBe('https://linkedin.com/in/ali?x=1#top')
  })

  it('keeps rejecting script-like and non-web schemes, even when they look like host:port', () => {
    for (const bad of ['javascript:alert(1)', 'javascript:alert(document.domain)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'mailto:a.b@example.com', 'vbscript:msgbox(1)', 'file:///etc/passwd', 'tel:+967770000000']) {
      expect(toHttpUrl(bad)).toBeNull()
    }
  })

  it('refuses everything that is not a web address', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://example.com', 'mailto:a@b.com', 'not a url', 'localhost', '', null, undefined, 'https://nodot']) {
      expect(toHttpUrl(bad)).toBeNull()
    }
  })
})

describe('apply form validation of the optional answers', () => {
  const level3 = { ...initialVolunteerForm, has_previous_volunteering: false }

  it('empty optional answers are fine', () => {
    expect(validateVolunteerStep(level3, 3)).toEqual({})
  })

  it('a too-long bio and a bad LinkedIn link each get their own message', () => {
    const errors = validateVolunteerStep({ ...level3, professional_bio: 'x'.repeat(501), linkedin_url: 'hello world' }, 3)
    expect(Object.keys(errors).sort()).toEqual(['linkedin_url', 'professional_bio'])
    expect(validateVolunteerStep({ ...level3, professional_bio: 'x'.repeat(500), linkedin_url: 'https://linkedin.com/in/x' }, 3)).toEqual({})
  })

  it('the bio refuses a real tag, in the server’s words, and accepts a «<» that is not one', () => {
    for (const bad of ['<b>x</b>', 'a </p> b', '< script>', '<!-- x -->', '<?php', 'مرحبا <i>بكم']) expect(bioHasHtmlTags(bad)).toBe(true)
    for (const ok of ['I <3 volunteering', 'أقل من <5 سنوات', '2 < 3', 'a <', 'x <= y', '<', 'سعيد <٣']) expect(bioHasHtmlTags(ok)).toBe(false)

    expect(validateVolunteerStep({ ...level3, professional_bio: '<b>x</b>' }, 3).professional_bio).toBe('لا يُسمح بإدخال وسوم HTML في هذا الحقل.')
    expect(validateVolunteerStep({ ...level3, professional_bio: 'I <3 volunteering' }, 3)).toEqual({})
  })

  it('languages: at most 20, at most 50 characters, no tag, no repeat ignoring case', () => {
    expect(languagesProblem(['العربية', 'English'])).toBeNull()
    expect(languagesProblem(Array.from({ length: 20 }, (_, i) => `L${i}`))).toBeNull()
    expect(languagesProblem(Array.from({ length: 21 }, (_, i) => `L${i}`))).toBe('لا يمكن اختيار أكثر من 20 لغة.')
    expect(languagesProblem(['x'.repeat(50)])).toBeNull()
    expect(languagesProblem(['x'.repeat(51)])).toBe('كل لغة يجب أن تكون نصًا لا يتجاوز 50 حرفًا.')
    expect(languagesProblem(['French', ' french '])).toBe('لا يمكن اختيار نفس اللغة أكثر من مرة')
    expect(languagesProblem(['<b>French</b>'])).toBe('لا يُسمح بإدخال وسوم HTML في أسماء اللغات.')
    expect(languagesProblem(['أقل من <5'])).toBeNull()
    expect(validateVolunteerStep({ ...level3, languages: ['a', 'A'] }, 3).languages).toBeTruthy()
  })

  it('a LinkedIn address longer than 255 characters is refused', () => {
    expect(validateVolunteerStep({ ...level3, linkedin_url: `https://linkedin.com/in/${'a'.repeat(240)}` }, 3).linkedin_url).toBe('رابط LinkedIn لا يزيد عن 255 حرفًا.')
  })

  it('the consent is never required', () => {
    expect(validateVolunteerStep({ ...initialVolunteerForm, primary_value_department: 'الإعلام', agree_terms: true, professional_profile_consent: null }, 5)).toEqual({})
  })
})
