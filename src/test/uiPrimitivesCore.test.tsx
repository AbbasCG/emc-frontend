import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmcButton, { type EmcButtonSize, type EmcButtonVariant } from '@/components/ui/EmcButton'
import FormField from '@/components/ui/FormField'
import SectionHeading from '@/components/ui/SectionHeading'
import Eyebrow, { type EyebrowTone } from '@/components/ui/Eyebrow'
import Surface from '@/components/ui/Surface'
import { axeCheck } from './axe'

type RenderableChildren = import('react').ReactNode

// framer-motion drives <SectionHeading>'s entrance. jsdom has no IntersectionObserver
// and no layout, so the animation layer is replaced with plain DOM elements — what is
// under test here is the markup and semantics, not the tween.
vi.mock('framer-motion', async () => {
  const React = await import('react')
  const MOTION_ONLY = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'viewport',
    'whileHover', 'whileTap', 'whileInView', 'whileFocus', 'whileDrag',
    'layout', 'layoutId', 'drag', 'custom', 'onAnimationComplete', 'onAnimationStart',
  ])
  const make = (tag: string) =>
    function MotionStub(props: Record<string, unknown>) {
      const { children, ...rest } = props
      const domProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rest)) {
        if (!MOTION_ONLY.has(key)) domProps[key] = value
      }
      return React.createElement(tag, domProps, children as RenderableChildren)
    }
  return {
    motion: { header: make('header'), div: make('div'), button: make('button'), span: make('span') },
    AnimatePresence: (props: { children?: unknown }) => props.children as RenderableChildren,
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

const ALL_VARIANTS: EmcButtonVariant[] = [
  'primary', 'secondary', 'ghost', 'danger', 'gradient', 'outline', 'accent', 'dark',
]
const ALL_SIZES: EmcButtonSize[] = ['xs', 'sm', 'md', 'lg']

describe('EmcButton', () => {
  it('exposes its children as the accessible name and defaults to type="button"', () => {
    render(<EmcButton>سجّل الآن</EmcButton>)
    const button = screen.getByRole('button', { name: 'سجّل الآن' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toBeEnabled()
    expect(button).not.toHaveAttribute('aria-busy')
  })

  it('calls onClick once per user click', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<EmcButton onClick={onClick}>حفظ</EmcButton>)

    await user.click(screen.getByRole('button', { name: 'حفظ' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('stays operable and keeps its accessible name across every variant and size', async () => {
    const user = userEvent.setup()
    for (const variant of ALL_VARIANTS) {
      for (const size of ALL_SIZES) {
        const onClick = vi.fn()
        const { unmount } = render(
          <EmcButton variant={variant} size={size} onClick={onClick}>
            {`${variant}-${size}`}
          </EmcButton>,
        )
        await user.click(screen.getByRole('button', { name: `${variant}-${size}` }))
        expect(onClick).toHaveBeenCalledTimes(1)
        unmount()
      }
    }
  })

  it('does not fire onClick while disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<EmcButton disabled onClick={onClick}>حفظ</EmcButton>)

    const button = screen.getByRole('button', { name: 'حفظ' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('loading marks the button busy, disables it, and swallows clicks', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<EmcButton loading onClick={onClick}>جارٍ الحفظ</EmcButton>)

    const button = screen.getByRole('button', { name: 'جارٍ الحفظ' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders leading and trailing icons, and hides both while loading', () => {
    const { rerender } = render(
      <EmcButton leadingIcon={<span>سهم-يمين</span>} trailingIcon={<span>سهم-يسار</span>}>
        تصدير
      </EmcButton>,
    )
    expect(screen.getByText('سهم-يمين')).toBeInTheDocument()
    expect(screen.getByText('سهم-يسار')).toBeInTheDocument()

    rerender(
      <EmcButton loading leadingIcon={<span>سهم-يمين</span>} trailingIcon={<span>سهم-يسار</span>}>
        تصدير
      </EmcButton>,
    )
    expect(screen.queryByText('سهم-يمين')).not.toBeInTheDocument()
    expect(screen.queryByText('سهم-يسار')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('تصدير')).toBeInTheDocument()
  })

  it('forwards type="submit" so it submits its surrounding form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <EmcButton type="submit">إرسال</EmcButton>
      </form>,
    )

    await user.click(screen.getByRole('button', { name: 'إرسال' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('forwards arbitrary button attributes such as aria-label for icon-only usage', () => {
    render(<EmcButton aria-label="حذف العنصر"><span aria-hidden>×</span></EmcButton>)
    expect(screen.getByRole('button', { name: 'حذف العنصر' })).toBeInTheDocument()
  })

  it('has no accessibility violations (default and loading)', async () => {
    const plain = render(<EmcButton>متابعة</EmcButton>)
    expect(await axeCheck(plain.container)).toHaveNoViolations()
    plain.unmount()

    const busy = render(<EmcButton loading variant="danger">حذف</EmcButton>)
    expect(await axeCheck(busy.container)).toHaveNoViolations()
  })
})

function ControlledFormField(props: { error?: string; hint?: string; required?: boolean }) {
  const [value, setValue] = useState('')
  return (
    <FormField
      id="email"
      label="البريد الإلكتروني"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      {...props}
    />
  )
}

describe('FormField', () => {
  it('associates the label with the input via htmlFor ↔ id', () => {
    render(<FormField id="full-name" label="الاسم الكامل" defaultValue="" />)
    const input = screen.getByLabelText('الاسم الكامل')
    expect(input).toHaveAttribute('id', 'full-name')
    expect(input.tagName).toBe('INPUT')
  })

  it('accepts Arabic input and reflects every keystroke back to the caller', async () => {
    const user = userEvent.setup()
    render(<ControlledFormField />)

    const input = screen.getByLabelText('البريد الإلكتروني')
    await user.type(input, 'أحمد')
    expect(input).toHaveValue('أحمد')
  })

  it('wires a hint through aria-describedby and leaves the field valid', () => {
    render(<FormField id="phone" label="رقم الجوال" hint="مثال: 05xxxxxxxx" defaultValue="" />)

    const input = screen.getByLabelText('رقم الجوال')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).toHaveAttribute('aria-describedby', 'phone-hint')
    expect(document.getElementById('phone-hint')).toHaveTextContent('مثال: 05xxxxxxxx')
  })

  it('marks the field invalid and announces the error through role="alert"', () => {
    render(<FormField id="phone" label="رقم الجوال" error="رقم غير صالح" defaultValue="" />)

    const input = screen.getByLabelText('رقم الجوال')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'phone-error')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('id', 'phone-error')
    expect(alert).toHaveTextContent('رقم غير صالح')
  })

  it('replaces the hint with the error once the field becomes invalid', () => {
    const { rerender } = render(<ControlledFormField hint="نستخدمه للتواصل" />)
    expect(screen.getByText('نستخدمه للتواصل')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    rerender(<ControlledFormField hint="نستخدمه للتواصل" error="البريد مستخدم مسبقًا" />)
    expect(screen.queryByText('نستخدمه للتواصل')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('البريد مستخدم مسبقًا')
    expect(screen.getByLabelText('البريد الإلكتروني')).toHaveAttribute('aria-invalid', 'true')
  })

  it('clearing the error removes aria-invalid and the alert', () => {
    const { rerender } = render(<ControlledFormField error="مطلوب" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(<ControlledFormField />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('البريد الإلكتروني')).not.toHaveAttribute('aria-invalid')
  })

  it('required renders the native attribute plus an explained asterisk', () => {
    render(<FormField id="city" label="المدينة" required defaultValue="" />)

    const input = screen.getByLabelText(/المدينة/)
    expect(input).toBeRequired()
    expect(screen.getByTitle('مطلوب')).toHaveTextContent('*')
  })

  it('renders the adornment slot next to the field', () => {
    render(
      <FormField
        id="code"
        label="رمز الخصم"
        defaultValue=""
        adornment={<button type="button">تطبيق</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'تطبيق' })).toBeInTheDocument()
    expect(screen.getByLabelText('رمز الخصم')).toBeInTheDocument()
  })

  it('disabled fields reject typing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FormField id="locked" label="مغلق" disabled value="" onChange={onChange} />)

    const input = screen.getByLabelText('مغلق')
    expect(input).toBeDisabled()
    await user.type(input, 'abc')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('has no accessibility violations (plain, hinted, invalid, required)', async () => {
    const plain = render(<FormField id="a1" label="الاسم" defaultValue="" />)
    expect(await axeCheck(plain.container)).toHaveNoViolations()
    plain.unmount()

    const hinted = render(<FormField id="a2" label="الجوال" hint="أرقام فقط" defaultValue="" />)
    expect(await axeCheck(hinted.container)).toHaveNoViolations()
    hinted.unmount()

    const invalid = render(<FormField id="a3" label="البريد" error="صيغة خاطئة" defaultValue="" />)
    expect(await axeCheck(invalid.container)).toHaveNoViolations()
    invalid.unmount()

    const required = render(
      <FormField id="a4" label="المدينة" required leadingIcon={<i />} defaultValue="" />,
    )
    expect(await axeCheck(required.container)).toHaveNoViolations()
  })
})

describe('SectionHeading', () => {
  it('renders the title as a level-2 heading', () => {
    render(<SectionHeading title="برامجنا التدريبية" />)
    expect(screen.getByRole('heading', { level: 2, name: 'برامجنا التدريبية' })).toBeInTheDocument()
  })

  it('renders the subtitle, and falls back to description when no subtitle is given', () => {
    const { rerender } = render(<SectionHeading title="عنوان" subtitle="نص فرعي" />)
    expect(screen.getByText('نص فرعي')).toBeInTheDocument()

    rerender(<SectionHeading title="عنوان" description="وصف بديل" />)
    expect(screen.getByText('وصف بديل')).toBeInTheDocument()
  })

  it('prefers subtitle over description when both are supplied', () => {
    render(<SectionHeading title="عنوان" subtitle="الفرعي" description="الوصف" />)
    expect(screen.getByText('الفرعي')).toBeInTheDocument()
    expect(screen.queryByText('الوصف')).not.toBeInTheDocument()
  })

  it('renders the eyebrow and the actions slot alongside the heading', () => {
    render(
      <SectionHeading
        eyebrow="جديد"
        eyebrowTone="accent"
        title="الدورات"
        actions={<button type="button">عرض الكل</button>}
      />,
    )
    expect(screen.getByText('جديد')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'الدورات' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'عرض الكل' })).toBeInTheDocument()
  })

  it('omits the supporting paragraph entirely when neither subtitle nor description is given', () => {
    const { container } = render(<SectionHeading title="بدون وصف" />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('renders the same content whether centered, animated, or rule-less', () => {
    for (const props of [
      { align: 'center' as const },
      { align: 'right' as const },
      { animate: true },
      { rule: false },
    ]) {
      const { unmount } = render(<SectionHeading title="ثابت" subtitle="وصف" {...props} />)
      expect(screen.getByRole('heading', { level: 2, name: 'ثابت' })).toBeInTheDocument()
      expect(screen.getByText('وصف')).toBeInTheDocument()
      unmount()
    }
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <SectionHeading
        eyebrow="عن المركز"
        title="من نحن"
        subtitle="مركز تدريب معتمد"
        actions={<button type="button">تواصل معنا</button>}
      />,
    )
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

describe('Eyebrow', () => {
  it('renders its children as visible text', () => {
    render(<Eyebrow>الأكثر طلبًا</Eyebrow>)
    expect(screen.getByText('الأكثر طلبًا')).toBeInTheDocument()
  })

  it('renders a decorative dot by default and drops it when dot={false}', () => {
    const withDot = render(<Eyebrow title="نغمة">مع نقطة</Eyebrow>)
    expect(screen.getByTitle('نغمة').childElementCount).toBe(1)
    expect(screen.getByTitle('نغمة')).toHaveTextContent('مع نقطة')
    withDot.unmount()

    render(<Eyebrow dot={false} title="نغمة">بدون نقطة</Eyebrow>)
    expect(screen.getByTitle('نغمة').childElementCount).toBe(0)
    expect(screen.getByText('بدون نقطة')).toBeInTheDocument()
  })

  it('renders every tone without losing the label', () => {
    const tones: EyebrowTone[] = ['brand', 'accent', 'ink', 'success', 'danger']
    for (const tone of tones) {
      const { unmount } = render(<Eyebrow tone={tone}>{`نغمة-${tone}`}</Eyebrow>)
      expect(screen.getByText(`نغمة-${tone}`)).toBeInTheDocument()
      unmount()
    }
  })

  it('forwards native span attributes to the root element', () => {
    render(<Eyebrow id="badge-1" title="شارة">مميز</Eyebrow>)
    const root = screen.getByTitle('شارة')
    expect(root).toHaveAttribute('id', 'badge-1')
    expect(root).toHaveTextContent('مميز')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<Eyebrow tone="success">معتمد</Eyebrow>)
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

describe('Surface', () => {
  it('renders its children', () => {
    render(<Surface><p>محتوى البطاقة</p></Surface>)
    expect(screen.getByText('محتوى البطاقة')).toBeInTheDocument()
  })

  it('renders every variant / elevation / padding combination without dropping content', () => {
    const variants = ['default', 'soft', 'glass', 'inverse', 'subtle'] as const
    const elevations = [0, 1, 2, 3, 4] as const
    const paddings = ['none', 'sm', 'md', 'lg', 'xl'] as const

    variants.forEach((variant, index) => {
      const { unmount } = render(
        <Surface variant={variant} elevation={elevations[index]} padding={paddings[index]}>
          {`سطح-${variant}`}
        </Surface>,
      )
      expect(screen.getByText(`سطح-${variant}`)).toBeInTheDocument()
      unmount()
    })
  })

  it('forwards interaction and ARIA props so an interactive surface is operable', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Surface interactive role="button" tabIndex={0} aria-label="فتح الدورة" onClick={onClick}>
        دورة اللغة
      </Surface>,
    )

    const card = screen.getByRole('button', { name: 'فتح الدورة' })
    await user.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Surface variant="glass" elevation={2} padding="lg">
        <h3>بطاقة</h3>
        <p>وصف قصير</p>
      </Surface>,
    )
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})
