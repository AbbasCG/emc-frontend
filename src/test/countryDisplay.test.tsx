import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CountryDisplay from '@/components/ui/CountryDisplay'

describe('CountryDisplay', () => {
  it('renders flag image + single ISO + localized name', () => {
    render(<CountryDisplay code="NL" localizedName="هولندا" />)
    const el = screen.getByTestId('country-value')
    expect(el.textContent?.match(/NL/g)?.length).toBe(1)
    expect(el.textContent).toContain('هولندا')
    expect(el).toHaveAttribute('dir', 'ltr')
    expect(el.querySelector('img[aria-hidden]')).toBeTruthy()
  })

  it('does not duplicate ISO when name is also an ISO code', () => {
    render(<CountryDisplay code="NL" localizedName="NL" />)
    const el = screen.getByTestId('country-value')
    expect(el.textContent?.match(/NL/g)?.length).toBe(1)
  })

  it('falls back to plain text without inventing a flag', () => {
    render(<CountryDisplay code={null} localizedName="مدينة غير معروفة" />)
    const el = screen.getByTestId('country-value')
    expect(el.textContent).toBe('مدينة غير معروفة')
    expect(el.querySelector('img')).toBeNull()
  })
})
