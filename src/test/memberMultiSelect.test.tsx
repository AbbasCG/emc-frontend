import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MemberMultiSelect, { type SelectablePerson } from '@/components/operations/impactPoints/MemberMultiSelect'

/**
 * The Impact Points member selector. What matters to the user:
 *  - the selected value is the person's NAME ONLY, never "name — department — title";
 *  - dropdown rows put the name first and the department · title in a muted line;
 *  - it is searchable (name, department, title), multi-select and keyboard driven;
 *  - long names stay inside the control.
 */

const LONG_TITLE = 'مهندس ذكاء اصطناعي ومسؤول تحليل البيانات والتعلم الآلي للبرامج التدريبية'

const PEOPLE: SelectablePerson[] = [
  { user_id: 1, name: 'Abdulaziz Al-Maslami', department: 'إدارة التقنية والدعم الفني', role_title: LONG_TITLE },
  { user_id: 2, name: 'Arwa Ahmed', department: 'الإدارة المالية', role_title: 'مديرة مالية' },
  { user_id: 3, name: 'afrahshana', department: 'إدارة التسويق والإعلام', role_title: 'Graphic & Video Editor' },
  { user_id: 4, name: 'منى الزهراني', department: null, role_title: null },
]

type HarnessProps = {
  people?: SelectablePerson[]
  status?: 'loading' | 'ready' | 'error'
  initial?: number[]
  onRetry?: () => void
  onChange?: (ids: number[]) => void
  disabled?: boolean
}

function Harness({ people = PEOPLE, status = 'ready', initial = [], onRetry, onChange, disabled }: HarnessProps) {
  const [ids, setIds] = useState<number[]>(initial)
  return (
    <div dir="rtl">
      <MemberMultiSelect
        label="الأعضاء المستحقون"
        people={people}
        selectedIds={ids}
        onChange={(next) => { setIds(next); onChange?.(next) }}
        status={status}
        onRetry={onRetry}
        disabled={disabled}
      />
      <span data-testid="ids">{ids.join(',')}</span>
    </div>
  )
}

const box = () => screen.getByRole('combobox', { name: 'الأعضاء المستحقون' })
const ids = () => screen.getByTestId('ids').textContent

async function open() {
  await userEvent.click(box())
  return screen.findByRole('listbox')
}

describe('MemberMultiSelect — display', () => {
  it('lists every person with the name first and department · title in a muted line', async () => {
    render(<Harness />)
    const list = await open()

    const row = within(list).getByText('Arwa Ahmed').closest('li') as HTMLElement
    expect(within(row).getByText('الإدارة المالية · مديرة مالية')).toBeInTheDocument()
    expect(within(list).getAllByRole('option')).toHaveLength(4)
    expect(within(list).getByText('Graphic & Video Editor', { exact: false })).toBeInTheDocument()
  })

  it('shows no metadata line for a person without department or title', async () => {
    render(<Harness />)
    const list = await open()

    const row = within(list).getByText('منى الزهراني').closest('li') as HTMLElement
    expect(row.querySelectorAll('p')).toHaveLength(1)
  })

  it('shows the placeholder, then an "add another" prompt once someone is chosen', async () => {
    render(<Harness />)
    expect(box()).toHaveAttribute('placeholder', 'اختر المتطوعين…')

    await userEvent.click(await open().then(() => screen.getByText('Arwa Ahmed')))
    expect(box()).toHaveAttribute('placeholder', 'أضف عضواً آخر…')
  })
})

describe('MemberMultiSelect — selection', () => {
  it('adds a chip with the NAME ONLY — no department, no job title', async () => {
    render(<Harness />)
    const list = await open()

    await userEvent.click(within(list).getByText('Abdulaziz Al-Maslami'))

    const chip = screen.getByRole('button', { name: 'إزالة Abdulaziz Al-Maslami' }).closest('span') as HTMLElement
    expect(chip.textContent).toBe('Abdulaziz Al-Maslami')
    expect(chip.textContent).not.toMatch(/إدارة|—|مهندس|·/)
    expect(ids()).toBe('1')
  })

  it('selects several people and keeps the list open for more', async () => {
    render(<Harness />)
    const list = await open()

    await userEvent.click(within(list).getByText('Abdulaziz Al-Maslami'))
    await userEvent.click(within(list).getByText('Arwa Ahmed'))
    await userEvent.click(within(list).getByText('afrahshana'))

    expect(ids()).toBe('1,2,3')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    for (const name of ['Abdulaziz Al-Maslami', 'Arwa Ahmed', 'afrahshana']) {
      expect(screen.getByRole('button', { name: `إزالة ${name}` }).closest('span')?.textContent).toBe(name)
    }
    expect(within(screen.getByRole('listbox')).getAllByRole('option', { selected: true })).toHaveLength(3)
  })

  it('toggles a person off by choosing them again', async () => {
    render(<Harness initial={[2]} />)
    const list = await open()

    await userEvent.click(within(list).getByText('Arwa Ahmed'))

    expect(ids()).toBe('')
  })

  it('removes a person with the chip\'s × button', async () => {
    render(<Harness initial={[1, 2]} />)

    await userEvent.click(screen.getByRole('button', { name: 'إزالة Arwa Ahmed' }))

    expect(ids()).toBe('1')
    expect(screen.queryByRole('button', { name: 'إزالة Arwa Ahmed' })).not.toBeInTheDocument()
  })

  it('clears everyone from the dropdown footer', async () => {
    render(<Harness initial={[1, 2, 3]} />)
    const list = await open()
    expect(screen.getByText('3 محدد')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'مسح التحديد' }))

    expect(ids()).toBe('')
    expect(list).toBeInTheDocument()
  })

  it('ignores a selected id that is not in the list (a person who is no longer eligible)', () => {
    render(<Harness initial={[999, 2]} />)

    expect(screen.getByRole('button', { name: 'إزالة Arwa Ahmed' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^إزالة/ })).toHaveLength(1)
  })
})

describe('MemberMultiSelect — search', () => {
  it('filters by name', async () => {
    render(<Harness />)
    await userEvent.type(box(), 'arwa')

    const options = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('Arwa Ahmed')
  })

  it('filters by department', async () => {
    render(<Harness />)
    await userEvent.type(box(), 'التسويق')

    const options = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('afrahshana')
  })

  it('filters by job title', async () => {
    render(<Harness />)
    await userEvent.type(box(), 'graphic')

    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1)
    expect(screen.getByText('afrahshana')).toBeInTheDocument()
  })

  it('forgives Arabic spelling variants (alef/hamza, taa marbuta)', async () => {
    render(<Harness />)
    await userEvent.type(box(), 'اداره المالية')

    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1)
    expect(screen.getByText('Arwa Ahmed')).toBeInTheDocument()
  })

  it('clears the search after choosing someone so the next pick starts fresh', async () => {
    render(<Harness />)
    await userEvent.type(box(), 'arwa')
    await userEvent.click(within(screen.getByRole('listbox')).getByText('Arwa Ahmed'))

    expect(box()).toHaveValue('')
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(4)
  })

  it('shows an empty-result message that names the search', async () => {
    render(<Harness />)
    await userEvent.type(box(), 'zzz')

    expect(screen.getByRole('status')).toHaveTextContent('لا نتائج مطابقة «zzz»')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })
})

describe('MemberMultiSelect — keyboard and focus', () => {
  it('moves with the arrow keys and toggles with Enter', async () => {
    render(<Harness />)
    box().focus()

    await userEvent.keyboard('{ArrowDown}{Enter}')

    expect(ids()).toBe('2')
    expect(box()).toHaveAttribute('aria-activedescendant')
  })

  it('removes the last chip with Backspace on an empty search', async () => {
    render(<Harness initial={[1, 2]} />)
    await userEvent.click(box())

    await userEvent.keyboard('{Backspace}')

    expect(ids()).toBe('1')
  })

  it('does not remove a chip with Backspace while the search has text', async () => {
    render(<Harness initial={[1]} />)
    await userEvent.type(box(), 'a{Backspace}')

    expect(ids()).toBe('1')
  })

  it('closes with Escape and when clicking outside', async () => {
    render(<div><Harness /><button>خارج</button></div>)
    await open()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await open()
    await userEvent.click(screen.getByRole('button', { name: 'خارج' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('exposes combobox / listbox semantics for assistive technology', async () => {
    render(<Harness initial={[2]} />)
    const list = await open()

    expect(box()).toHaveAttribute('aria-expanded', 'true')
    expect(box()).toHaveAttribute('aria-controls', list.id)
    expect(list).toHaveAttribute('aria-multiselectable', 'true')
  })
})

describe('MemberMultiSelect — states', () => {
  it('shows a loading state while people load', async () => {
    render(<Harness people={[]} status="loading" />)
    await userEvent.click(box())

    expect(await screen.findByRole('status')).toHaveTextContent('جارٍ تحميل الأعضاء')
  })

  it('shows a retryable error', async () => {
    const onRetry = vi.fn()
    render(<Harness people={[]} status="error" onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل قائمة الأعضاء المستحقين')
    await userEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('explains an empty scope', () => {
    render(<Harness people={[]} />)

    expect(screen.getByText('لا يوجد أعضاء فريق ضمن نطاق صلاحيتك حالياً.')).toBeInTheDocument()
  })

  it('does nothing when disabled', async () => {
    render(<Harness initial={[1]} disabled />)

    expect(box()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'إزالة Abdulaziz Al-Maslami' })).toBeDisabled()
  })
})

describe('MemberMultiSelect — long names and layout', () => {
  const LONG_NAME = 'عبدالعزيز بن محمد بن عبدالرحمن آل المسلمي الحارثي القحطاني الدوسري الشمري'

  it('truncates a very long name inside its chip and keeps the full name as a tooltip', () => {
    render(<Harness people={[{ user_id: 9, name: LONG_NAME, department: 'د', role_title: 'م' }]} initial={[9]} />)

    const label = screen.getByTitle(LONG_NAME)
    expect(label.className).toContain('truncate')
    expect(label.className).toContain('max-w-')
    expect(screen.getByRole('button', { name: `إزالة ${LONG_NAME}` })).toBeInTheDocument()
  })

  it('truncates long names and long metadata in dropdown rows', async () => {
    render(<Harness people={[{ user_id: 9, name: LONG_NAME, department: LONG_TITLE, role_title: LONG_TITLE }]} />)
    const list = await open()

    const name = within(list).getByTitle(LONG_NAME)
    expect(name.className).toContain('truncate')
    expect(within(list).getByTitle(`${LONG_TITLE} · ${LONG_TITLE}`).className).toContain('truncate')
  })

  it('lets chips wrap onto new lines instead of overflowing the control', () => {
    const { container } = render(<Harness initial={[1, 2, 3, 4]} />)

    const field = container.querySelector('.flex-wrap') as HTMLElement
    expect(field.className).toContain('flex-wrap')
    expect(field.className).toContain('w-full')
    expect(screen.getAllByRole('button', { name: /^إزالة/ })).toHaveLength(4)
  })

  it('renders right-to-left', () => {
    const { container } = render(<Harness />)
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})
