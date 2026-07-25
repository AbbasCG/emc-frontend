import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppInput from '@/components/ui/AppInput'
import AppSelect from '@/components/ui/AppSelect'
import AppTextarea from '@/components/ui/AppTextarea'
import AppFormError from '@/components/ui/AppFormError'
import { axeCheck } from './axe'

beforeEach(() => {
  vi.clearAllMocks()
})

/** Wraps a value/onChange(string) primitive so typing exercises the real contract. */
function ControlledInput({
  initial = '',
  onValue,
  ...rest
}: { initial?: string; onValue?: (value: string) => void } & Omit<
  Parameters<typeof AppInput>[0],
  'value' | 'onChange'
>) {
  const [value, setValue] = useState(initial)
  return (
    <AppInput
      {...rest}
      value={value}
      onChange={(next) => {
        setValue(next)
        onValue?.(next)
      }}
    />
  )
}

function ControlledTextarea({
  initial = '',
  onValue,
  ...rest
}: { initial?: string; onValue?: (value: string) => void } & Omit<
  Parameters<typeof AppTextarea>[0],
  'value' | 'onChange'
>) {
  const [value, setValue] = useState(initial)
  return (
    <AppTextarea
      {...rest}
      value={value}
      onChange={(next) => {
        setValue(next)
        onValue?.(next)
      }}
    />
  )
}

describe('AppInput', () => {
  it('associates label and input, and forwards name and type', () => {
    render(<AppInput label="البريد الإلكتروني" name="email" type="email" value="" onChange={() => {}} />)

    const input = screen.getByLabelText('البريد الإلكتروني')
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveValue('')
  })

  it('calls onChange with the raw string value, not the event', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AppInput label="الاسم" name="name" value="" onChange={onChange} />)

    await user.type(screen.getByLabelText('الاسم'), 'أ')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('أ')
  })

  it('accepts Arabic text end to end when controlled by the caller', async () => {
    const user = userEvent.setup()
    const onValue = vi.fn()
    render(<ControlledInput label="الاسم" name="name" onValue={onValue} />)

    const input = screen.getByLabelText('الاسم')
    await user.type(input, 'محمد علي')
    expect(input).toHaveValue('محمد علي')
    expect(onValue).toHaveBeenLastCalledWith('محمد علي')
  })

  it('required sets the native attribute and shows an asterisk in the label', () => {
    render(<AppInput label="الجوال" name="phone" required value="" onChange={() => {}} />)

    const input = screen.getByLabelText(/الجوال/)
    expect(input).toBeRequired()
    expect(screen.getByText(/الجوال/)).toHaveTextContent('*')
  })

  it('is valid and undescribed when neither hint nor error is given', () => {
    render(<AppInput label="الاسم" name="name" value="" onChange={() => {}} />)

    const input = screen.getByLabelText('الاسم')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('points aria-describedby at the hint element', () => {
    render(<AppInput label="الجوال" name="phone" hint="بدون مسافات" value="" onChange={() => {}} />)

    const input = screen.getByLabelText('الجوال')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy as string)).toHaveTextContent('بدون مسافات')
  })

  it('error marks the field invalid, describes it, and announces the message', () => {
    render(
      <AppInput label="البريد" name="email" error="صيغة البريد غير صحيحة" value="" onChange={() => {}} />,
    )

    const input = screen.getByLabelText('البريد')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const errorId = input.getAttribute('aria-describedby') as string
    expect(errorId).toBeTruthy()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('id', errorId)
    expect(alert).toHaveTextContent('صيغة البريد غير صحيحة')
  })

  it('describes the field by both hint and error, and both targets exist in the DOM', () => {
    render(
      <AppInput
        label="البريد"
        name="email"
        hint="مثال: name@emc.sa"
        error="هذا البريد مسجّل"
        value=""
        onChange={() => {}}
      />,
    )

    const input = screen.getByLabelText('البريد')
    const ids = (input.getAttribute('aria-describedby') as string).split(' ').filter(Boolean)
    expect(ids).toHaveLength(2)
    for (const id of ids) {
      expect(document.getElementById(id)).not.toBeNull()
    }
    expect(screen.getByText('مثال: name@emc.sa')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('هذا البريد مسجّل')
  })

  it('clearing the error returns the field to a valid, undescribed state', () => {
    const { rerender } = render(
      <AppInput label="البريد" name="email" error="خطأ" value="" onChange={() => {}} />,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(<AppInput label="البريد" name="email" value="" onChange={() => {}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('البريد')).toHaveAttribute('aria-invalid', 'false')
  })

  it('disabled inputs cannot be typed into', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AppInput label="الاسم" name="name" disabled value="" onChange={onChange} />)

    const input = screen.getByLabelText('الاسم')
    expect(input).toBeDisabled()
    await user.type(input, 'نص')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders the decorative icon hidden from assistive tech', () => {
    const { container } = render(
      <AppInput label="البريد" name="email" icon="mail" value="" onChange={() => {}} />,
    )

    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThanOrEqual(1)
    // The icon must not leak into the field's accessible name.
    expect(screen.getByLabelText('البريد')).toBeInTheDocument()
  })

  it('has no accessibility violations (plain, hinted, invalid, disabled, emc variant)', async () => {
    const plain = render(<AppInput label="الاسم" name="name" value="" onChange={() => {}} />)
    expect(await axeCheck(plain.container)).toHaveNoViolations()
    plain.unmount()

    const hinted = render(
      <AppInput label="الجوال" name="phone" hint="أرقام فقط" icon="phone" value="" onChange={() => {}} />,
    )
    expect(await axeCheck(hinted.container)).toHaveNoViolations()
    hinted.unmount()

    const invalid = render(
      <AppInput label="البريد" name="email" required error="مطلوب" value="" onChange={() => {}} />,
    )
    expect(await axeCheck(invalid.container)).toHaveNoViolations()
    invalid.unmount()

    const disabled = render(
      <AppInput label="مغلق" name="locked" disabled variant="emc" value="" onChange={() => {}} />,
    )
    expect(await axeCheck(disabled.container)).toHaveNoViolations()
  })
})

const CITY_OPTIONS = [
  { label: 'الرياض', value: 'riyadh' },
  { label: 'جدة', value: 'jeddah' },
  { label: 'الدمام', value: 'dammam' },
]

function ControlledSelect(props: Partial<Parameters<typeof AppSelect>[0]> = {}) {
  const [value, setValue] = useState('')
  return (
    <AppSelect
      label="المدينة"
      name="city"
      options={CITY_OPTIONS}
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next)
        props.onChange?.(next)
      }}
    />
  )
}

describe('AppSelect', () => {
  it('associates the label and renders one option per entry', () => {
    render(<AppSelect label="المدينة" name="city" options={CITY_OPTIONS} value="" onChange={() => {}} />)

    const select = screen.getByLabelText('المدينة')
    expect(within(select).getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'الرياض' })).toHaveAttribute('value', 'riyadh')
  })

  it('reports the chosen option value to onChange and reflects the selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ControlledSelect onChange={onChange} />)

    const select = screen.getByLabelText('المدينة')
    await user.selectOptions(select, 'jeddah')
    expect(onChange).toHaveBeenCalledWith('jeddah')
    expect(select).toHaveValue('jeddah')
  })

  it('prepends an empty-valued placeholder option when a placeholder is given', () => {
    render(
      <AppSelect
        label="المدينة"
        name="city"
        placeholder="اختر المدينة"
        options={CITY_OPTIONS}
        value=""
        onChange={() => {}}
      />,
    )

    const options = within(screen.getByLabelText('المدينة')).getAllByRole('option')
    expect(options).toHaveLength(4)
    expect(options[0]).toHaveTextContent('اختر المدينة')
    expect(options[0]).toHaveAttribute('value', '')
  })

  it('renders no options at all for an empty list without a placeholder', () => {
    render(<AppSelect label="المدينة" name="city" options={[]} value="" onChange={() => {}} />)

    expect(within(screen.getByLabelText('المدينة')).queryAllByRole('option')).toHaveLength(0)
  })

  it('required sets the native attribute and marks the label', () => {
    render(
      <AppSelect label="المدينة" name="city" required options={CITY_OPTIONS} value="" onChange={() => {}} />,
    )

    expect(screen.getByLabelText(/المدينة/)).toBeRequired()
    expect(screen.getByText(/المدينة/)).toHaveTextContent('*')
  })

  it('disabled selects cannot be changed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <AppSelect
        label="المدينة"
        name="city"
        disabled
        options={CITY_OPTIONS}
        value=""
        onChange={onChange}
      />,
    )

    const select = screen.getByLabelText('المدينة') as HTMLSelectElement
    expect(select).toBeDisabled()
    const before = select.value
    await user.selectOptions(select, 'riyadh')
    expect(onChange).not.toHaveBeenCalled()
    expect(select.value).toBe(before)
  })

  it('wires error and hint into aria-invalid / aria-describedby', () => {
    const { rerender } = render(
      <AppSelect label="المدينة" name="city" options={CITY_OPTIONS} value="" onChange={() => {}} />,
    )
    expect(screen.getByLabelText('المدينة')).toHaveAttribute('aria-invalid', 'false')

    rerender(
      <AppSelect
        label="المدينة"
        name="city"
        hint="حسب مكان الإقامة"
        error="اختر مدينة"
        options={CITY_OPTIONS}
        value=""
        onChange={() => {}}
      />,
    )
    const select = screen.getByLabelText('المدينة')
    expect(select).toHaveAttribute('aria-invalid', 'true')
    const ids = (select.getAttribute('aria-describedby') as string).split(' ').filter(Boolean)
    expect(ids).toHaveLength(2)
    for (const id of ids) expect(document.getElementById(id)).not.toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('اختر مدينة')
  })

  it('has no accessibility violations (plain and invalid)', async () => {
    const plain = render(
      <AppSelect
        label="المدينة"
        name="city"
        placeholder="اختر المدينة"
        options={CITY_OPTIONS}
        value=""
        onChange={() => {}}
      />,
    )
    expect(await axeCheck(plain.container)).toHaveNoViolations()
    plain.unmount()

    const invalid = render(
      <AppSelect
        label="المدينة"
        name="city"
        required
        error="اختر مدينة"
        hint="مطلوب"
        options={CITY_OPTIONS}
        value=""
        onChange={() => {}}
      />,
    )
    expect(await axeCheck(invalid.container)).toHaveNoViolations()
  })
})

describe('AppTextarea', () => {
  it('associates the label and applies name and rows', () => {
    render(<AppTextarea label="الملاحظات" name="notes" rows={6} value="" onChange={() => {}} />)

    const textarea = screen.getByLabelText('الملاحظات')
    expect(textarea).toHaveAttribute('name', 'notes')
    expect(textarea).toHaveAttribute('rows', '6')
  })

  it('calls onChange with the raw string value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AppTextarea label="الملاحظات" name="notes" value="" onChange={onChange} />)

    await user.type(screen.getByLabelText('الملاحظات'), 'ن')
    expect(onChange).toHaveBeenCalledWith('ن')
  })

  it('shows a live character counter that tracks the current value against maxLength', async () => {
    const user = userEvent.setup()
    render(<ControlledTextarea label="الملاحظات" name="notes" maxLength={10} />)

    expect(screen.getByText('0/10')).toBeInTheDocument()
    await user.type(screen.getByLabelText('الملاحظات'), 'مرحبا')
    expect(screen.getByText('5/10')).toBeInTheDocument()
  })

  it('stops accepting input at maxLength', async () => {
    const user = userEvent.setup()
    render(<ControlledTextarea label="الملاحظات" name="notes" maxLength={5} />)

    const textarea = screen.getByLabelText('الملاحظات')
    await user.type(textarea, 'abcdefghij')
    expect(textarea).toHaveValue('abcde')
    expect(screen.getByText('5/5')).toBeInTheDocument()
  })

  it('renders no counter when maxLength is not set', () => {
    render(<ControlledTextarea label="الملاحظات" name="notes" initial="نص" />)
    expect(screen.queryByText(/\/\d+$/)).not.toBeInTheDocument()
  })

  it('required and disabled are forwarded to the native element', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <AppTextarea label="الملاحظات" name="notes" required value="" onChange={onChange} />,
    )
    expect(screen.getByLabelText(/الملاحظات/)).toBeRequired()

    rerender(<AppTextarea label="الملاحظات" name="notes" disabled value="" onChange={onChange} />)
    const textarea = screen.getByLabelText('الملاحظات')
    expect(textarea).toBeDisabled()
    await user.type(textarea, 'نص')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('wires error and hint into aria-invalid / aria-describedby', () => {
    render(
      <AppTextarea
        label="الملاحظات"
        name="notes"
        hint="اختياري"
        error="النص قصير جدًا"
        value=""
        onChange={() => {}}
      />,
    )

    const textarea = screen.getByLabelText('الملاحظات')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
    const ids = (textarea.getAttribute('aria-describedby') as string).split(' ').filter(Boolean)
    expect(ids).toHaveLength(2)
    for (const id of ids) expect(document.getElementById(id)).not.toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('النص قصير جدًا')
  })

  it('has no accessibility violations (plain, counted, invalid)', async () => {
    const plain = render(<AppTextarea label="الملاحظات" name="notes" value="" onChange={() => {}} />)
    expect(await axeCheck(plain.container)).toHaveNoViolations()
    plain.unmount()

    const counted = render(
      <AppTextarea
        label="الملاحظات"
        name="notes"
        hint="اختياري"
        maxLength={100}
        variant="emc"
        value="نص"
        onChange={() => {}}
      />,
    )
    expect(await axeCheck(counted.container)).toHaveNoViolations()
    counted.unmount()

    const invalid = render(
      <AppTextarea
        label="الملاحظات"
        name="notes"
        required
        error="مطلوب"
        value=""
        onChange={() => {}}
      />,
    )
    expect(await axeCheck(invalid.container)).toHaveNoViolations()
  })
})

describe('AppFormError', () => {
  it('renders nothing when there is no message', () => {
    const { container } = render(<AppFormError message={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for an empty string', () => {
    const { container } = render(<AppFormError message="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('announces a single message through role="alert"', () => {
    render(<AppFormError message="هذا الحقل مطلوب" />)
    expect(screen.getByRole('alert')).toHaveTextContent('هذا الحقل مطلوب')
  })

  it('renders every message of an array in order', () => {
    render(<AppFormError message={['كلمة المرور قصيرة', 'يجب أن تحتوي رقمًا']} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('كلمة المرور قصيرة')
    expect(alert).toHaveTextContent('يجب أن تحتوي رقمًا')
    expect(within(alert).getAllByText(/./, { selector: 'p' })).toHaveLength(2)
  })

  it('keeps duplicate messages distinct instead of collapsing them', () => {
    render(<AppFormError message={['مطلوب', 'مطلوب']} />)
    expect(within(screen.getByRole('alert')).getAllByText('مطلوب')).toHaveLength(2)
  })

  it('forwards the id so a field can reference it with aria-describedby', () => {
    render(<AppFormError id="name-error" message="خطأ" />)
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'name-error')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<AppFormError id="e1" message={['خطأ أول', 'خطأ ثانٍ']} />)
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})
