import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AppFileUpload from '@/components/ui/AppFileUpload'

describe('AppFileUpload — mobile filename overflow', () => {
  it('truncates long filenames and keeps the remove control shrink-safe', () => {
    const longName =
      'Mohammed_Jamoom_Backend_Developer_Professional_Curriculum_Vitae_2026.pdf'
    const file = new File(['%PDF'], longName, { type: 'application/pdf' })

    const { container } = render(
      <div style={{ width: 320 }}>
        <AppFileUpload
          label="السيرة الذاتية"
          name="cv_file"
          file={file}
          onChange={vi.fn()}
          hint="PDF أو Word، بحد أقصى 5 ميجابايت"
        />
      </div>,
    )

    const nameEl = screen.getByText(longName)
    expect(nameEl.className).toMatch(/truncate/)
    expect(nameEl.className).toMatch(/overflow-hidden/)
    expect(nameEl).toHaveAttribute('title', longName)
    expect(nameEl).toHaveAttribute('dir', 'auto')

    const nameWrap = nameEl.parentElement
    expect(nameWrap?.className).toMatch(/min-w-0/)
    expect(nameWrap?.className).toMatch(/flex-1/)

    const remove = screen.getByRole('button', { name: /إزالة/ })
    expect(remove.parentElement?.className).toMatch(/shrink-0/)

    // No justify-between on the selected-file row (edge-to-edge push causes overflow).
    const selectedCard = container.querySelector('.border-amber-200')
    expect(selectedCard?.querySelector('.justify-between')).toBeNull()
  })

  it('truncates long Arabic filenames safely', () => {
    const longName = 'سيرة_ذاتية_محمد_عبدالله_المطور_الخلفي_النسخة_النهائية.pdf'
    const file = new File(['x'], longName, { type: 'application/pdf' })

    render(
      <AppFileUpload
        label="السيرة الذاتية"
        name="cv_file"
        file={file}
        onChange={vi.fn()}
      />,
    )

    const nameEl = screen.getByText(longName)
    expect(nameEl.className).toMatch(/truncate/)
    expect(nameEl).toHaveAttribute('dir', 'auto')
  })
})
