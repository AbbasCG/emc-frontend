import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import apiClient from '@/api/axios'
import OpsFormDetailPage from '@/pages/operations/admin/OpsFormDetailPage'
import PublicFormPage from '@/pages/operations/public/PublicFormPage'
import { submitPublicForm } from '@/api/formsApi'
import contract from '@/test/fixtures/formsApiContract.json'

/**
 * The visitor's side of sharing: a share-link address sends its token (in a header, never in the address the server sees), every
 * refusal is said in words and shows nothing of the form, and the Share tab exists only for people who may see it.
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/components/operations/OpsPageSkeleton', () => ({ default: () => <div>loading</div> }))
const api = vi.mocked(apiClient, true)

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})
beforeEach(() => vi.clearAllMocks())

const TOKEN = 'Zk3dE5gH7jK9mN1pQ3sT5vX7zB9dF1hJ3kL5nP7rT9uW1yA3'

const publicBody = (state: string, message: string | null, extra: Record<string, unknown> = {}) => ({
  data: {
    success: true,
    data: {
      id: 1, title: state === 'open' ? 'استبيان' : 'نموذج مقيَّد', slug: 'rida', description: null, form_type: null, status: 'active', version: 1, preview: false,
      availability: { state, message, opens_at: null, closes_at: null, requires_login: false, access_mode: 'public' },
      questions: state === 'open' ? [{ id: 5, label: 'الاسم', type: 'text', required: false, sort_order: 1, options: null }] : [],
      ...extra,
    },
  },
})

function LoginProbe() {
  const l = useLocation()

  return <div data-testid="login">{String((l.state as { from?: string } | null)?.from ?? '')}</div>
}

const mountPublic = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/forms/:slug" element={<PublicFormPage />} />
        <Route path="/forms/:slug/s/:token" element={<PublicFormPage />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  )

describe('opening a form through a share link', () => {
  it('sends the token in a header and in nothing else, and shows the form', async () => {
    api.get.mockResolvedValueOnce(publicBody('open', null))
    mountPublic(`/forms/rida/s/${TOKEN}`)

    expect(await screen.findByLabelText(/الاسم/)).toBeTruthy()
    const [url, config] = api.get.mock.calls[0] as [string, { headers: Record<string, string> }]
    expect(url).toBe('/forms/rida')
    expect(config.headers).toEqual({ 'X-Form-Share': TOKEN })
    expect(JSON.stringify(api.get.mock.calls)).not.toMatch(new RegExp(`${TOKEN}.*(params|\\?)`))
  })

  it('the plain address sends no token, exactly as before', async () => {
    api.get.mockResolvedValueOnce(publicBody('open', null))
    mountPublic('/forms/rida')

    await screen.findByLabelText(/الاسم/)
    expect(api.get.mock.calls[0]).toEqual(['/forms/rida'])
  })

  it('submits through the link with the same header, as JSON or as multipart', async () => {
    api.post.mockResolvedValue({ data: {} })
    await submitPublicForm('rida', { '5': 'سارة' }, TOKEN)
    await submitPublicForm('rida', { '5': new File(['%PDF-1.4'], 'a.pdf') }, TOKEN)
    await submitPublicForm('rida', { '5': 'x' })

    const [, , json] = api.post.mock.calls[0] as [string, unknown, { headers: Record<string, string> }]
    const [, form, multipart] = api.post.mock.calls[1] as [string, unknown, { headers: Record<string, string> }]
    const [, , plain] = api.post.mock.calls[2] as [string, unknown, Record<string, unknown>]
    expect(json.headers).toEqual({ 'X-Form-Share': TOKEN })
    expect(multipart.headers).toEqual({ 'X-Form-Share': TOKEN })
    expect(form).toBeInstanceOf(FormData)
    expect(plain).not.toHaveProperty('headers')
  })

  it.each([
    ['share_link_required', 'هذا النموذج متاح عبر رابط مشاركة خاص فقط. اطلب الرابط من الجهة المسؤولة عنه.'],
    ['share_link_invalid', 'رابط المشاركة غير صحيح.'],
    ['share_link_revoked', 'أُلغي رابط المشاركة هذا ولم يعد صالحاً.'],
    ['share_link_expired', 'انتهت صلاحية رابط المشاركة هذا.'],
    ['share_link_exhausted', 'اكتمل العدد المسموح به من الإجابات عبر رابط المشاركة هذا.'],
    ['not_invited', 'هذا النموذج مخصص لمدعوّين فقط، وحسابك ليس ضمنهم.'],
  ])('%s: says why in words and shows nothing of the form', async (state, message) => {
    api.get.mockResolvedValueOnce(publicBody(state, message))
    mountPublic(`/forms/rida/s/${TOKEN}`)

    expect(await screen.findByTestId(`availability-${state}`)).toBeTruthy()
    expect(screen.getByRole('status')).toHaveTextContent(message)
    expect(screen.getByRole('heading', { name: 'نموذج مقيَّد' })).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'إرسال' })).toBeNull()
    expect(document.body.textContent).not.toContain('استبيان')
  })

  it('a form that needs signing in sends the visitor to the sign-in page and remembers where they were', async () => {
    api.get.mockResolvedValueOnce(publicBody('login_required', 'هذا النموذج مخصص لمدعوّين. سجّل الدخول بحسابك لتعبئته.'))
    mountPublic(`/forms/rida/s/${TOKEN}`)

    await userEvent.click(await screen.findByRole('link', { name: 'تسجيل الدخول' }))

    expect((await screen.findByTestId('login')).textContent).toBe(`/forms/rida/s/${TOKEN}`)
  })

  it('a server refusal at submit time (the link was used up meanwhile) is shown next to the form, which stays filled in', async () => {
    api.get.mockResolvedValueOnce(publicBody('open', null))
    api.post.mockRejectedValueOnce(Object.assign(new Error('403'), { isAxiosError: true, response: { status: 403, data: { success: false, code: 'share_link_exhausted', message: 'اكتمل العدد المسموح به من الإجابات عبر رابط المشاركة هذا.' } } }))
    mountPublic(`/forms/rida/s/${TOKEN}`)
    await userEvent.type(await screen.findByLabelText(/الاسم/), 'سارة')

    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('اكتمل العدد المسموح به من الإجابات عبر رابط المشاركة هذا.')
    expect(screen.getByLabelText(/الاسم/)).toHaveValue('سارة')
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('the Share tab on the form page', () => {
  const FORM = (contract.publishResponse as { data: Record<string, unknown> }).data
  const ID = FORM.id as number
  const withAbilities = (abilities: Record<string, boolean>) => ({ success: true, data: { ...FORM, abilities: { ...(FORM.abilities as object), ...abilities } } })

  const mountDetail = () =>
    render(
      <MemoryRouter initialEntries={[`/dashboard/admin/forms/${ID}`]}>
        <Routes>
          <Route path="/dashboard/admin/forms/:id" element={<OpsFormDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
  const tabs = () => screen.getAllByRole('tab').filter((t) => ['المحرر', 'الإرسالات', 'إعدادات النشر', 'المشاركة', 'المتعاونون', 'سجل النشاط', 'الإصدارات'].includes(t.textContent ?? '')).map((t) => t.textContent)

  it('is offered to someone who may see how the form is shared, between settings and collaborators', async () => {
    api.get.mockResolvedValueOnce({ data: withAbilities({ view_sharing: true, manage_sharing: true }) })
    mountDetail()
    await screen.findByRole('heading', { name: String(FORM.title) })

    expect(tabs()).toEqual(['المحرر', 'الإرسالات', 'إعدادات النشر', 'المشاركة', 'المتعاونون', 'سجل النشاط', 'الإصدارات'])
  })

  it('is absent for someone who may not (a viewer)', async () => {
    api.get.mockResolvedValueOnce({ data: withAbilities({ view_sharing: false, manage_sharing: false, edit: false, publish: false, manage_access: false }) })
    mountDetail()
    await screen.findByRole('heading', { name: String(FORM.title) })

    expect(tabs()).not.toContain('المشاركة')
  })

  it('opens the Share screen when chosen', async () => {
    const sharing = { form: { id: ID, slug: 'x', status: 'active', public_path: '/forms/x' }, access: { mode: 'public', requires_share_link: false }, public: { state: 'open', reachable: true, accepting: true, message: 'منشور ويستقبل الإجابات.' }, links: [], invitations: [], abilities: { manage: true } }
    api.get.mockImplementation((async (url: string) => (url.endsWith('/sharing') ? { data: { success: true, data: sharing } } : { data: withAbilities({ view_sharing: true, manage_sharing: true }) })) as never)
    mountDetail()
    await screen.findByRole('heading', { name: String(FORM.title) })

    await userEvent.click(screen.getByRole('tab', { name: 'المشاركة' }))

    expect(await screen.findByTestId('share-panel')).toBeTruthy()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(`/operations/forms/${ID}/sharing`, expect.anything()))
  })
})
