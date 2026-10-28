import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import apiClient from '@/api/axios'
import OpsFormTemplatesPage from '@/pages/operations/admin/OpsFormTemplatesPage'
import FormTemplateActions from '@/components/operations/formTemplates/FormTemplateActions'
import { parseTemplateError, templateAsForm } from '@/api/formsTemplatesApi'
import type { FormTemplateDetail, FormTemplateSummary } from '@/api/formsTemplatesApi'
import type { OpsFormDefinition } from '@/types/operations'

/**
 * Smart Forms Phase 6 screens: the template library, using a template, and the "duplicate" / "save as template" actions of a form.
 * The response shapes are the ones FormTemplateService::presentSystem / presentSaved return (tests/Feature/Forms/FormTemplatesTest).
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

const httpError = (status: number, data: unknown) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } })

const SYSTEM: FormTemplateSummary = {
  id: 'system:course_evaluation', source: 'system', key: 'course_evaluation', name: 'تقييم دورة', description: 'تقييم المتعلمين للدورة بعد انتهائها.',
  category: 'feedback', form_type: 'course_eval', domain_notice: null, visibility: 'organization', department: null, owner: null,
  question_count: 8, block_count: 8, uses_count: null, updated_at: null, abilities: { edit: false, delete: false },
}
const NOTICE = 'طلبات التطوع الرسمية وملفات المتطوعين ونقاطهم تدار من وحدة المتطوعين.'
const VOLUNTEER: FormTemplateSummary = { ...SYSTEM, id: 'system:volunteer_application', key: 'volunteer_application', name: 'طلب تطوع', category: 'community', domain_notice: NOTICE }
const MINE: FormTemplateSummary = {
  ...SYSTEM, id: '7', source: 'saved', key: null, name: 'استطلاع القسم', category: 'general', visibility: 'department',
  department: { id: 3, name: 'قسم أ' }, owner: { id: 1, name: 'أحمد' }, is_mine: true, uses_count: 2, abilities: { edit: true, delete: true },
}
const META = { categories: [], can_create: true, can_share_organization: false, departments: [{ id: 3, name: 'Dept A', name_ar: 'قسم أ' }] }

const DETAIL: FormTemplateDetail = {
  ...SYSTEM,
  definition: {
    title: 'تقييم دورة', description: null, type: 'course_eval', flow: null,
    questions: [
      { ref: -1, type: 'yes_no', label: 'هل حققت الدورة توقعاتك؟', required: true },
      { ref: -2, type: 'textarea', label: 'ما الذي لم يحقق توقعاتك؟', required: false, logic: { action: 'show', match: 'all', conditions: [{ question: -1, operator: 'equals', value: 'no' }] } },
      { ref: -3, type: 'textarea', label: 'اقتراحات لتحسين الدورة', required: false },
    ],
  },
}

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>
}

function mountLibrary() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/admin/forms/templates']}>
      <Routes>
        <Route path="/dashboard/admin/forms/templates" element={<OpsFormTemplatesPage />} />
        <Route path="/dashboard/admin/forms/:id" element={<div>builder</div>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  api.get.mockImplementation((async (url: string) => {
    if (url === '/operations/form-templates') return { data: { success: true, data: [SYSTEM, VOLUNTEER, MINE], meta: META } }
    if (url === '/operations/form-templates/system%3Acourse_evaluation') return { data: { success: true, data: DETAIL } }
    throw new Error(`unexpected GET ${url}`)
  }) as never)
})

describe('template library', () => {
  it('lists built-in and saved templates, with the workflow notice and the controls each one allows', async () => {
    mountLibrary()
    const cards = await screen.findAllByTestId('template-card')
    expect(cards).toHaveLength(3)

    expect(within(cards[1]).getByText(NOTICE)).toBeInTheDocument()
    expect(within(cards[0]).getByText('من مكتبة المنصة')).toBeInTheDocument()
    expect(within(cards[0]).queryByRole('button', { name: /تعديل القالب/ })).toBeNull()
    expect(within(cards[2]).getByText('مشترك مع القسم')).toBeInTheDocument()
    expect(within(cards[2]).getByText('بواسطة أنت')).toBeInTheDocument()
    expect(within(cards[2]).getByRole('button', { name: 'حذف القالب استطلاع القسم' })).toBeInTheDocument()
  })

  it('filters by category and source on the server', async () => {
    const user = userEvent.setup()
    mountLibrary()
    await screen.findAllByTestId('template-card')

    await user.click(screen.getByRole('button', { name: 'الموارد البشرية' }))
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/operations/form-templates', expect.objectContaining({ params: { category: 'hr' } })))

    await user.click(screen.getByRole('button', { name: 'قوالبي' }))
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/operations/form-templates', expect.objectContaining({ params: { category: 'hr', source: 'mine' } })))
  })

  it('creates a private draft from a template and opens it in the builder', async () => {
    const user = userEvent.setup()
    api.post.mockResolvedValue({ data: { success: true, data: { id: 41, title: 'تقييم الربيع', status: 'draft' } } } as never)
    mountLibrary()
    const cards = await screen.findAllByTestId('template-card')

    await user.click(within(cards[0]).getByRole('button', { name: 'استخدام القالب' }))
    const dialog = await screen.findByTestId('new-form-dialog')
    const title = within(dialog).getByRole('textbox')
    expect(title).toHaveValue('تقييم دورة')
    await user.clear(title)
    await user.type(title, 'تقييم الربيع')
    await user.selectOptions(within(dialog).getByRole('combobox'), '3')
    await user.click(within(dialog).getByRole('button', { name: 'إنشاء المسودة وفتح المحرر' }))

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard/admin/forms/41'))
    expect(api.post).toHaveBeenCalledWith('/operations/form-templates/system%3Acourse_evaluation/use', { title: 'تقييم الربيع', department_id: 3 }, { skipErrorToast: true })
  })

  it('shows the server refusal in the dialog and stays on the page', async () => {
    const user = userEvent.setup()
    api.post.mockRejectedValue(httpError(422, { errors: { department_id: ['لا تملك صلاحية إنشاء نماذج لهذا القسم.'] } }))
    mountLibrary()
    const cards = await screen.findAllByTestId('template-card')

    await user.click(within(cards[0]).getByRole('button', { name: 'استخدام القالب' }))
    const dialog = await screen.findByTestId('new-form-dialog')
    await user.click(within(dialog).getByRole('button', { name: 'إنشاء المسودة وفتح المحرر' }))

    expect(await within(dialog).findAllByText('لا تملك صلاحية إنشاء نماذج لهذا القسم.')).not.toHaveLength(0)
    expect(screen.getByTestId('where')).toHaveTextContent('/dashboard/admin/forms/templates')
  })

  it('previews a template with its conditions working', async () => {
    const user = userEvent.setup()
    mountLibrary()
    const cards = await screen.findAllByTestId('template-card')

    await user.click(within(cards[0]).getByRole('button', { name: /معاينة/ }))
    const preview = await screen.findByTestId('template-preview')
    expect(await within(preview).findByText('هل حققت الدورة توقعاتك؟')).toBeInTheDocument()
    expect(within(preview).getByText('اقتراحات لتحسين الدورة')).toBeInTheDocument()
    // shown only when the first answer is "no": hidden while unanswered
    expect(within(preview).queryByText('ما الذي لم يحقق توقعاتك؟')).toBeNull()
  })

  it('hides "use template" from people who cannot create forms', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [SYSTEM], meta: { ...META, can_create: false } } } as never)
    mountLibrary()
    const [card] = await screen.findAllByTestId('template-card')
    expect(within(card).queryByRole('button', { name: 'استخدام القالب' })).toBeNull()
  })

  it('deletes a saved template after confirmation', async () => {
    const user = userEvent.setup()
    api.delete.mockResolvedValue({ data: { success: true } } as never)
    mountLibrary()
    const cards = await screen.findAllByTestId('template-card')

    await user.click(within(cards[2]).getByRole('button', { name: 'حذف القالب استطلاع القسم' }))
    await user.click(await screen.findByRole('button', { name: 'حذف' }))

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/operations/form-templates/7', { skipErrorToast: true }))
    expect(await screen.findByText('حُذف القالب.')).toBeInTheDocument()
  })
})

describe('form page actions', () => {
  const FORM = { id: 9, title: 'استطلاع القسم', slug: 'x', form_type: 'suggestion', description: null, department_id: 3, questions: [] } as OpsFormDefinition

  function mountActions() {
    return render(
      <MemoryRouter initialEntries={['/dashboard/admin/forms/9']}>
        <Routes>
          <Route path="/dashboard/admin/forms/:id" element={<FormTemplateActions form={FORM} />} />
        </Routes>
        <Where />
      </MemoryRouter>,
    )
  }

  it('duplicates the form into its department and opens the copy', async () => {
    const user = userEvent.setup()
    api.post.mockResolvedValue({ data: { success: true, data: { id: 55, title: 'نسخة من استطلاع القسم', status: 'draft' } } } as never)
    mountActions()

    await user.click(screen.getByRole('button', { name: /نسخ النموذج/ }))
    const dialog = await screen.findByTestId('new-form-dialog')
    expect(within(dialog).getByRole('textbox')).toHaveValue('نسخة من استطلاع القسم')
    await user.click(within(dialog).getByRole('button', { name: 'إنشاء النسخة وفتحها' }))

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard/admin/forms/55'))
    expect(api.post).toHaveBeenCalledWith('/operations/forms/9/duplicate', { title: 'نسخة من استطلاع القسم', department_id: 3 }, { skipErrorToast: true })
  })

  it('saves the form as a department template', async () => {
    const user = userEvent.setup()
    api.post.mockResolvedValue({ data: { success: true, data: MINE } } as never)
    mountActions()

    await user.click(screen.getByRole('button', { name: /حفظ كقالب/ }))
    const dialog = await screen.findByTestId('template-details-dialog')
    expect(within(dialog).queryByText('متاح للمؤسسة')).toBeNull() // only platform managers share with everyone
    await user.click(within(dialog).getByText('مشترك مع القسم'))
    await user.click(within(dialog).getByRole('button', { name: 'حفظ القالب' }))

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/operations/form-templates',
      { name: 'استطلاع القسم', description: null, category: 'general', visibility: 'department', department_id: 3, form_id: 9 },
      { skipErrorToast: true },
    ))
    expect(await screen.findByText('حُفظ القالب. تجده في مكتبة القوالب.')).toBeInTheDocument()
  })

  it('says so when the person cannot create forms', async () => {
    const user = userEvent.setup()
    api.get.mockResolvedValue({ data: { success: true, data: [], meta: { ...META, can_create: false } } } as never)
    mountActions()

    await user.click(screen.getByRole('button', { name: /نسخ النموذج/ }))
    expect(await screen.findByText('لا تملك صلاحية إنشاء النماذج.')).toBeInTheDocument()
    expect(screen.queryByTestId('new-form-dialog')).toBeNull()
  })
})

describe('template helpers', () => {
  it('turns a definition into a renderable form whose rules point at the block ids', () => {
    const form = templateAsForm(DETAIL)
    expect(form.questions.map((q) => q.id)).toEqual([-1, -2, -3])
    expect(form.questions[0].required).toBe(true)
    expect(form.questions[1].logic?.conditions[0].question).toBe(-1)
    expect(form.form_type).toBe('course_eval')
  })

  it('explains failures in one sentence', () => {
    expect(parseTemplateError(httpError(404, {})).message).toContain('غير موجود')
    expect(parseTemplateError(httpError(403, {})).message).toContain('صلاحية')
    expect(parseTemplateError(httpError(422, { errors: { visibility: ['x'] } })).fieldErrors).toEqual({ visibility: 'x' })
    expect(parseTemplateError(new Error('offline')).message).toContain('الاتصال')
  })
})
