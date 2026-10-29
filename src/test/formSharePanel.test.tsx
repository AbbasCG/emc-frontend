import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import apiClient from '@/api/axios'
import FormSharePanel from '@/components/operations/formAdmin/FormSharePanel'
import type { InvitationRow, PublicStatus, ShareLinkRow, SharingData } from '@/api/formsShareApi'
import type { FormAccessMode, OpsFormDefinition } from '@/types/operations'

/**
 * The Share tab against a fake server that behaves like the real one for sharing: it keeps links (and shows a token only when
 * one is made), the access mode and the invitations, and refuses what the real server refuses.
 */

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))
const api = vi.mocked(apiClient, true)

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

const httpError = (status: number, data: unknown) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } })

const form = { id: 7, title: 'استبيان رضا الطلاب', slug: 'rida-2026', form_type: 'suggestion', questions: [], created_at: '' } as OpsFormDefinition
const OPEN: PublicStatus = { state: 'open', reachable: true, accepting: true, message: 'منشور ويستقبل الإجابات.' }

const person = (id: number, name: string) => ({ id, name })
const link = (over: Partial<ShareLinkRow> = {}): ShareLinkRow => ({
  id: 1, label: 'ملصق المدخل', token_hint: 'k3Zq', status: 'active', uses: 0, max_uses: null, expires_at: null,
  created_at: '2026-10-18T10:00:00+00:00', created_by: person(2, 'نورة'), revoked_at: null, revoked_by: null, ...over,
})

type Server = {
  data: SharingData
  calls: { method: string; path: string; body?: unknown }[]
  nextLinkId: number
  token: string
  people: { id: number; name: string }[]
  failNext: Record<string, unknown>
}

function fakeServer(over: Partial<SharingData> = {}, mode: FormAccessMode = 'public'): Server {
  const server: Server = {
    data: {
      form: { id: 7, slug: 'rida-2026', status: 'active', public_path: '/forms/rida-2026' },
      access: { mode, requires_share_link: false },
      public: OPEN,
      links: [],
      invitations: [],
      abilities: { manage: true },
      ...over,
    },
    calls: [],
    nextLinkId: 100,
    token: 'Zk3dE5gH7jK9mN1pQ3sT5vX7zB9dF1hJ3kL5nP7rT9uW1yA3',
    people: [person(21, 'سلمى العتيبي'), person(22, 'سلطان القحطاني')],
    failNext: {},
  }
  const ok = (data: unknown) => ({ data: { success: true, data } })
  const run = (method: string) => async (url: string, a?: unknown, b?: unknown) => {
    const path = url.replace('/operations/forms/7', '')
    const body = method === 'GET' ? undefined : a
    server.calls.push({ method, path, body })
    const fail = server.failNext[`${method} ${path}`]
    if (fail) { delete server.failNext[`${method} ${path}`]; throw fail }

    if (method === 'GET' && path === '/sharing') return ok(structuredClone(server.data))
    if (method === 'PUT' && path === '/sharing') {
      const req = body as { access_mode: FormAccessMode; requires_share_link: boolean }
      if (req.requires_share_link && !server.data.access.requires_share_link && !server.data.links.some((l) => l.status === 'active')) {
        throw httpError(422, { errors: { requires_share_link: ['أنشئ رابط مشاركة واحداً على الأقل قبل جعل النموذج متاحاً عبر الرابط فقط، وإلا لن يتمكن أحد من فتحه.'] } })
      }
      server.data.access = { mode: req.access_mode, requires_share_link: req.requires_share_link }
      return ok(structuredClone(server.data))
    }
    if (method === 'POST' && path === '/share-links') {
      const req = body as { label: string; expires_at?: string | null; max_uses?: number | null }
      if (!req.label.trim()) throw httpError(422, { errors: { label: ['اكتب اسماً للرابط يساعدك على تمييزه.'] } })
      if (server.data.form.status === 'archived') throw httpError(422, { errors: { form: ['هذا النموذج مؤرشف: لا يمكن إنشاء روابط جديدة له.'] } })
      const row = link({ id: server.nextLinkId++, label: req.label.trim(), token_hint: server.token.slice(-4), expires_at: req.expires_at ?? null, max_uses: req.max_uses ?? null })
      server.data.links = [row, ...server.data.links]
      return ok({ ...row, token: server.token, path: `/forms/rida-2026/s/${server.token}` })
    }
    const revokeLink = /^\/share-links\/(\d+)\/revoke$/.exec(path)
    if (method === 'POST' && revokeLink) {
      const row = server.data.links.find((l) => l.id === Number(revokeLink[1]))!
      Object.assign(row, { status: 'revoked', revoked_at: '2026-10-18T12:00:00+00:00', revoked_by: person(2, 'نورة') })
      return ok(structuredClone(row))
    }
    if (method === 'GET' && path.startsWith('/invitation-candidates')) {
      const q = String((b as { params?: { q?: string } } | undefined)?.params?.q ?? '')
      const taken = server.data.invitations.filter((i) => !i.revoked_at).map((i) => i.user?.id)
      return ok(server.people.filter((p) => p.name.includes(q) && !taken.includes(p.id)))
    }
    if (method === 'POST' && path === '/invitations') {
      const who = server.people.find((p) => p.id === (body as { user_id: number }).user_id)!
      const row: InvitationRow = { id: server.nextLinkId++, user: who, invited_by: person(2, 'نورة'), created_at: '2026-10-18T11:00:00+00:00', revoked_at: null, revoked_by: null }
      server.data.invitations = [row, ...server.data.invitations]
      return ok(row)
    }
    const revokeInv = /^\/invitations\/(\d+)\/revoke$/.exec(path)
    if (method === 'POST' && revokeInv) {
      const row = server.data.invitations.find((i) => i.id === Number(revokeInv[1]))!
      Object.assign(row, { revoked_at: '2026-10-18T12:30:00+00:00', revoked_by: person(2, 'نورة') })
      return ok(structuredClone(row))
    }
    throw new Error(`unexpected request: ${method} ${path}`)
  }
  api.get.mockImplementation(run('GET') as never)
  api.put.mockImplementation(run('PUT') as never)
  api.post.mockImplementation(run('POST') as never)

  return server
}

const mount = () => render(<FormSharePanel form={form} />)
const ready = async () => { mount(); await screen.findByTestId('share-panel') }

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})
afterEach(() => vi.useRealTimers())

describe('is the form publicly accessible?', () => {
  it.each([
    ['open', OPEN, 'النموذج متاح للعامة'],
    ['closed', { state: 'closed', reachable: true, accepting: false, message: 'هذا النموذج مغلق ولا يستقبل إجابات حالياً.' }, 'النموذج لا يستقبل الإجابات الآن'],
    ['ended', { state: 'ended', reachable: true, accepting: false, message: 'انتهى موعد استقبال الإجابات على هذا النموذج.' }, 'النموذج لا يستقبل الإجابات الآن'],
    ['draft', { state: 'draft', reachable: false, accepting: false, message: 'مسودة: لا يراها العامة. الرابط لا يعمل قبل نشر النموذج.' }, 'النموذج غير متاح للعامة'],
    ['archived', { state: 'archived', reachable: false, accepting: false, message: 'مؤرشف: توقف الرابط العام. استعد النموذج من الأرشيف لإتاحته مجدداً.' }, 'النموذج غير متاح للعامة'],
    ['share_link_required', { state: 'share_link_required', reachable: false, accepting: false, message: 'هذا النموذج متاح عبر رابط مشاركة خاص فقط.' }, 'النموذج غير متاح للعامة'],
  ] as const)('says so in words for %s, from the server\'s own answer', async (state, pub, heading) => {
    fakeServer({ public: pub as PublicStatus, form: { id: 7, slug: 'rida-2026', status: state === 'archived' ? 'archived' : 'active', public_path: '/forms/rida-2026' } })
    await ready()

    const banner = screen.getByTestId('public-status')
    expect(banner).toHaveAttribute('data-state', state)
    expect(within(banner).getByRole('heading', { name: heading })).toBeTruthy()
    expect(within(banner).getByRole('status')).toHaveTextContent(pub.message)
  })
})

describe('the public address and its QR code', () => {
  it('shows the unchanged /forms/<slug> address, copies it and says it was copied', async () => {
    fakeServer()
    await ready()

    const field = screen.getByRole('textbox', { name: 'رابط النموذج العام' }) as HTMLInputElement
    expect(field.value).toBe(`${window.location.origin}/forms/rida-2026`)
    expect(field).toHaveAttribute('readonly')

    await userEvent.click(screen.getByRole('button', { name: 'نسخ الرابط' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(field.value)
    expect(await screen.findByRole('button', { name: 'تم النسخ' })).toBeTruthy()
  })

  it('previews a QR code of that address and offers PNG, SVG and print', async () => {
    fakeServer()
    await ready()

    const image = (await screen.findByTestId('qr-image')) as HTMLImageElement
    expect(image.src.startsWith('data:image/png;base64,')).toBe(true)
    expect(image).toHaveAttribute('alt', 'رمز QR: امسح الرمز لفتح النموذج')
    for (const name of ['تنزيل PNG', 'تنزيل SVG', 'طباعة']) expect(screen.getByRole('button', { name })).toBeEnabled()
  })

  it('downloads the PNG and SVG with names made from the slug, and prints from a hidden frame', async () => {
    fakeServer()
    await ready()
    await screen.findByTestId('qr-image')
    const names: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download) })
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()

    await userEvent.click(screen.getByRole('button', { name: 'تنزيل PNG' }))
    await userEvent.click(screen.getByRole('button', { name: 'تنزيل SVG' }))
    expect(names).toEqual(['emc-form-rida-2026-qr.png', 'emc-form-rida-2026-qr.svg'])

    await userEvent.click(screen.getByRole('button', { name: 'طباعة' }))
    const frame = document.querySelector('iframe') as HTMLIFrameElement
    expect(frame.srcdoc).toContain('استبيان رضا الطلاب')
    expect(frame.srcdoc).toContain(`${window.location.origin}/forms/rida-2026`)
    frame.remove()
  })

  it('a form that needs a link does not offer a QR code for the plain address, which would not open it', async () => {
    fakeServer({ access: { mode: 'public', requires_share_link: true }, links: [link()], public: { state: 'share_link_required', reachable: false, accepting: false, message: 'x' } })
    await ready()

    expect(screen.queryByTestId('qr-image')).toBeNull()
    expect(screen.getByText(/لا يفتحه وحده، ولذلك لا يُعرض له رمز QR/)).toBeTruthy()
  })
})

describe('who may answer', () => {
  it('saves the chosen mode and says so; Save is only available when something changed', async () => {
    const server = fakeServer()
    await ready()
    const save = screen.getByRole('button', { name: 'حفظ إعدادات الوصول' })
    expect(save).toBeDisabled()

    await userEvent.click(screen.getByRole('radio', { name: /مستخدمو EMC المسجّلون/ }))
    expect(save).toBeEnabled()
    await userEvent.click(save)

    expect(await screen.findByText('تم حفظ إعدادات الوصول.')).toBeTruthy()
    expect(server.calls.find((c) => c.method === 'PUT')?.body).toEqual({ access_mode: 'authenticated', requires_share_link: false })
    expect(screen.getByRole('radio', { name: /مستخدمو EMC المسجّلون/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'حفظ إعدادات الوصول' })).toBeDisabled()
  })

  it('shows the server\'s refusal in words and changes nothing: a link must exist before one is required', async () => {
    const server = fakeServer()
    await ready()
    await userEvent.click(screen.getByRole('checkbox', { name: /لا يُفتح إلا عبر رابط مشاركة/ }))
    expect(screen.getByText('أنشئ رابط مشاركة نشطاً أولاً، وإلا لن يفتح النموذج لأحد.')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'حفظ إعدادات الوصول' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('أنشئ رابط مشاركة واحداً على الأقل')
    expect(server.data.access.requires_share_link).toBe(false)
    expect(screen.queryByText('تم حفظ إعدادات الوصول.')).toBeNull()
  })

  it('does not lose an unsaved choice when a link is made in the meantime', async () => {
    fakeServer()
    await ready()
    await userEvent.click(screen.getByRole('radio', { name: /مدعوّون فقط/ }))

    await userEvent.click(screen.getByRole('button', { name: /رابط جديد/ }))
    await userEvent.type(screen.getByLabelText(/اسم الرابط/), 'ملصق')
    await userEvent.click(screen.getByRole('button', { name: 'إنشاء الرابط' }))
    await screen.findByTestId('created-link-dialog')

    expect(screen.getByRole('radio', { name: /مدعوّون فقط/ })).toBeChecked()
  })
})

describe('share links', () => {
  it('a new link is shown once, with its address and QR code, and never again afterwards', async () => {
    const server = fakeServer()
    await ready()

    await userEvent.click(screen.getByRole('button', { name: /رابط جديد/ }))
    await userEvent.type(screen.getByLabelText(/اسم الرابط/), '  حملة الجامعة ')
    await userEvent.type(screen.getByLabelText(/أقصى عدد للإجابات/), '50')
    await userEvent.click(screen.getByRole('button', { name: 'إنشاء الرابط' }))

    const dialog = await screen.findByTestId('created-link-dialog')
    const address = within(dialog).getByLabelText('رابط المشاركة') as HTMLInputElement
    expect(address.value).toBe(`${window.location.origin}/forms/rida-2026/s/${server.token}`)
    expect(await within(dialog).findByTestId('qr-image')).toBeTruthy()
    expect(within(dialog).getByText(/لن يظهر مرة أخرى/)).toBeTruthy()
    expect(server.calls.find((c) => c.path === '/share-links')?.body).toMatchObject({ label: 'حملة الجامعة', max_uses: 50, expires_at: null })

    await userEvent.click(within(dialog).getByRole('button', { name: 'نسخ' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(address.value)
    await userEvent.click(within(dialog).getByRole('button', { name: /إغلاق|close/i }))

    await waitFor(() => expect(screen.queryByTestId('created-link-dialog')).toBeNull())
    const row = await screen.findByTestId('share-link-row')
    expect(row).toHaveTextContent('حملة الجامعة')
    expect(row).toHaveTextContent('0 من 50 إجابة')
    expect(document.body.innerHTML).not.toContain(server.token)
  })

  it('refuses an empty name with the server\'s message and keeps the form open', async () => {
    fakeServer()
    await ready()
    await userEvent.click(screen.getByRole('button', { name: /رابط جديد/ }))

    await userEvent.click(screen.getByRole('button', { name: 'إنشاء الرابط' }))

    expect(await screen.findByText('اكتب اسماً للرابط يساعدك على تمييزه.')).toBeTruthy()
    expect(screen.getByTestId('create-link-dialog')).toBeTruthy()
    expect(screen.queryByTestId('created-link-dialog')).toBeNull()
  })

  it('lists every link with its status, usage, expiry and who made and who revoked it', async () => {
    fakeServer({
      links: [
        link({ id: 4, label: 'مفتوح', uses: 3, max_uses: 10 }),
        link({ id: 3, label: 'منتهٍ', status: 'expired', expires_at: '2026-10-01T00:00:00+00:00' }),
        link({ id: 2, label: 'ممتلئ', status: 'exhausted', uses: 5, max_uses: 5 }),
        link({ id: 1, label: 'ملغى', status: 'revoked', revoked_at: '2026-10-17T09:00:00+00:00', revoked_by: person(9, 'عمر') }),
      ],
    })
    await ready()

    const rows = screen.getAllByTestId('share-link-row')
    expect(rows.map((r) => r.getAttribute('data-status'))).toEqual(['active', 'expired', 'exhausted', 'revoked'])
    expect(rows[0]).toHaveTextContent('3 من 10 إجابة')
    expect(rows[1]).toHaveTextContent('منتهي الصلاحية')
    expect(rows[2]).toHaveTextContent('اكتمل عدد الإجابات')
    expect(rows[3]).toHaveTextContent('ألغاه')
    expect(rows[3]).toHaveTextContent('عمر')
    expect(within(rows[3]).queryByRole('button', { name: /إلغاء الرابط/ })).toBeNull()
    expect(within(rows[0]).getByRole('button', { name: 'إلغاء الرابط مفتوح' })).toBeTruthy()
  })

  it('asks before revoking, says nothing is deleted, then marks the link revoked', async () => {
    const server = fakeServer({ links: [link({ id: 4, label: 'ملصق المدخل', uses: 2 })] })
    await ready()

    await userEvent.click(screen.getByRole('button', { name: 'إلغاء الرابط ملصق المدخل' }))
    expect(await screen.findByText(/لا يُحذف شيء: تبقى الإجابات التي وصلت عبره/)).toBeTruthy()
    expect(server.calls.some((c) => c.path.endsWith('/revoke'))).toBe(false)
    await userEvent.click(screen.getAllByRole('button', { name: 'إلغاء الرابط' }).at(-1)!)

    expect(await screen.findByText(/أُلغي الرابط «ملصق المدخل»/)).toBeTruthy()
    const row = screen.getByTestId('share-link-row')
    expect(row).toHaveAttribute('data-status', 'revoked')
    expect(row).toHaveTextContent('2 إجابة')
    expect(within(row).queryByRole('button', { name: /إلغاء الرابط/ })).toBeNull()
  })

  it('a failed revoke is reported and the link stays active', async () => {
    const server = fakeServer({ links: [link({ id: 4 })] })
    server.failNext['POST /share-links/4/revoke'] = httpError(500, {})
    await ready()

    await userEvent.click(screen.getByRole('button', { name: /^إلغاء الرابط ملصق/ }))
    await userEvent.click(screen.getAllByRole('button', { name: 'إلغاء الرابط' }).at(-1)!)

    expect(await screen.findByText(/لم تتم العملية/)).toBeTruthy()
    expect(screen.getByTestId('share-link-row')).toHaveAttribute('data-status', 'active')
  })

  it('an archived form gets no new links but its existing ones can still be revoked', async () => {
    fakeServer({ form: { id: 7, slug: 'rida-2026', status: 'archived', public_path: '/forms/rida-2026' }, links: [link({ id: 4 })] })
    await ready()

    expect(screen.getByRole('button', { name: /رابط جديد/ })).toBeDisabled()
    expect(screen.getByText(/النموذج مؤرشف: لا تُنشأ روابط جديدة/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /^إلغاء الرابط ملصق/ })).toBeEnabled()
  })
})

describe('invited people', () => {
  const invited = (over: Partial<InvitationRow> = {}): InvitationRow => ({ id: 50, user: person(21, 'سلمى العتيبي'), invited_by: person(2, 'نورة'), created_at: '2026-10-18T09:00:00+00:00', revoked_at: null, revoked_by: null, ...over })

  it('is not offered unless the form is open to invited people only', async () => {
    fakeServer()
    await ready()
    expect(screen.queryByRole('heading', { name: 'المدعوّون' })).toBeNull()
  })

  it('searches by name after three letters, invites, and shows the person in the list', async () => {
    const server = fakeServer({}, 'invited')
    await ready()
    expect(screen.getByTestId('no-invitees')).toBeTruthy()

    const box = screen.getByLabelText(/ابحث عن مستخدم بالاسم/)
    await userEvent.type(box, 'سل')
    expect(server.calls.some((c) => c.path.startsWith('/invitation-candidates'))).toBe(false)
    await userEvent.type(box, 'م')
    await userEvent.click(await screen.findByRole('button', { name: 'دعوة سلمى العتيبي' }, { timeout: 3000 }))

    expect(await screen.findByText(/دُعي سلمى العتيبي. عليه فتح رابط النموذج وتسجيل الدخول بحسابه/)).toBeTruthy()
    const row = await screen.findByTestId('invitation-row')
    expect(row).toHaveTextContent('سلمى العتيبي')
    expect(screen.queryByTestId('no-invitees')).toBeNull()
    expect(server.calls.find((c) => c.path === '/invitations')?.body).toEqual({ user_id: 21 })
  })

  it('revoking an invitation says the earlier answers stay, and moves it to the revoked list', async () => {
    fakeServer({ invitations: [invited()] }, 'invited')
    await ready()

    await userEvent.click(screen.getByRole('button', { name: 'إلغاء دعوة سلمى العتيبي' }))

    expect(await screen.findByText(/بقيت إجاباته السابقة كما هي/)).toBeTruthy()
    expect(screen.queryByTestId('invitation-row')).toBeNull()
    expect(screen.getByText('دعوات أُلغيت (1)')).toBeTruthy()
  })

  it('never shows an e-mail address, only names', async () => {
    fakeServer({ invitations: [invited()] }, 'invited')
    await ready()
    expect(document.body.textContent).not.toMatch(/@/)
  })
})

describe('who may change it', () => {
  it('a person who may only edit sees how the form is shared but is offered nothing that changes it', async () => {
    fakeServer({ abilities: { manage: false }, links: [link({ id: 4 })], invitations: [{ id: 50, user: person(21, 'سلمى'), invited_by: null, created_at: null, revoked_at: null, revoked_by: null }] }, 'invited')
    await ready()

    expect(screen.queryByRole('button', { name: /رابط جديد/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^إلغاء الرابط ملصق/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'حفظ إعدادات الوصول' })).toBeNull()
    expect(screen.queryByLabelText(/ابحث عن مستخدم بالاسم/)).toBeNull()
    expect(screen.queryByRole('button', { name: /إلغاء دعوة/ })).toBeNull()
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    expect(screen.getAllByRole('note').map((n) => n.textContent).join(' ')).toContain('من صلاحية المالك ومديري المنصة')
  })
})

describe('when the screen cannot load', () => {
  it('says the person may not see it (403) instead of blaming the connection, and can retry', async () => {
    const server = fakeServer()
    server.failNext['GET /sharing'] = httpError(403, {})
    mount()

    expect(await screen.findByRole('alert')).toHaveTextContent('لا تملك صلاحية عرض إعدادات المشاركة لهذا النموذج.')
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))
    expect(await screen.findByTestId('share-panel')).toBeTruthy()
  })

  it('a lost connection is reported as such', async () => {
    const server = fakeServer()
    server.failNext['GET /sharing'] = new Error('Network Error')
    mount()

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر الاتصال بالخادم')
    await act(async () => undefined)
  })
})
