import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { describeLoadError, FORBIDDEN_MESSAGE_AR, NETWORK_MESSAGE_AR, OTHER_MESSAGE_AR, SERVER_MESSAGE_AR } from '@/lib/describeLoadError'

function httpError(status: number, message = 'Forbidden') {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, {}, { status, statusText: '', headers: {}, config, data: { message } })
}

describe('describeLoadError', () => {
  it('403 is forbidden, not retryable, and ignores the server English message', () => {
    const d = describeLoadError(httpError(403, 'This action is unauthorized.'))
    expect(d).toEqual({ kind: 'forbidden', message_ar: FORBIDDEN_MESSAGE_AR, retryable: false })
    expect(d.message_ar).not.toMatch(/[A-Za-z]/)
  })

  it('uses the page-specific forbidden text when given', () => {
    expect(describeLoadError(httpError(403), { forbiddenMessage: 'نص خاص' }).message_ar).toBe('نص خاص')
  })

  it('no response is a retryable network failure', () => {
    const e = new AxiosError('Network Error', 'ERR_NETWORK')
    expect(describeLoadError(e)).toEqual({ kind: 'network', message_ar: NETWORK_MESSAGE_AR, retryable: true })
  })

  it('5xx is a retryable server failure', () => {
    expect(describeLoadError(httpError(500))).toEqual({ kind: 'server', message_ar: SERVER_MESSAGE_AR, retryable: true })
    expect(describeLoadError(httpError(503)).kind).toBe('server')
  })

  it('other statuses and non-axios errors are "other" and retryable', () => {
    expect(describeLoadError(httpError(404))).toEqual({ kind: 'other', message_ar: OTHER_MESSAGE_AR, retryable: true })
    expect(describeLoadError(new Error('boom')).kind).toBe('other')
    expect(describeLoadError(undefined).kind).toBe('other')
  })
})
