import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import Platform from '@/pages/Platform'
import DepartmentsTimelineStrip from '@/components/departments/DepartmentsTimelineStrip'
import Footer from '@/components/Footer'
import PartnershipApplyPage from '@/pages/operations/public/PartnershipApplyPage'
import OperationsDashboard from '@/components/operations/OperationsDashboard'
import type { OperationsDashboardData } from '@/types/operations'
import { axeCheck } from './axe'

type RenderableChildren = import('react').ReactNode

// Several components under test animate through framer-motion (whileInView relies
// on IntersectionObserver, which jsdom lacks). Swap the animation layer for plain
// DOM so these tests stay about content contracts, not animation timing.
vi.mock('framer-motion', async () => {
  const React = await import('react')
  const MOTION_ONLY = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'viewport',
    'whileHover', 'whileTap', 'whileInView', 'whileFocus', 'whileDrag',
    'layout', 'layoutId', 'drag', 'custom', 'onAnimationComplete', 'onAnimationStart',
  ])
  const make = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>(function MotionStub(props, ref) {
      const { children, ...rest } = props
      const domProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rest)) {
        if (!MOTION_ONLY.has(key)) domProps[key] = value
      }
      if (ref) domProps.ref = ref
      return React.createElement(tag, domProps, children as RenderableChildren)
    })
  const cache = new Map<string, unknown>()
  const motion = new Proxy({} as Record<string, unknown>, {
    get(_target, tag) {
      if (typeof tag !== 'string') return undefined
      if (!cache.has(tag)) cache.set(tag, make(tag))
      return cache.get(tag)
    },
  })
  return {
    motion,
    AnimatePresence: (props: { children?: unknown }) => props.children as RenderableChildren,
  }
})

// Catalog-independent i18n: t() echoes the key, so assertions can target keys.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ar' } }),
}))

vi.mock('@/i18n/useLanguage', () => ({
  useLanguage: () => ({ dir: 'rtl', lang: 'ar' }),
}))

// M6: pages now render <PublicSeo/>, which imports LANGS from the i18n module —
// stub it so the real i18next init (and its initReactI18next dependency) never runs.
vi.mock('@/i18n', () => ({
  LANGS: [{ code: 'ar' }, { code: 'en' }],
}))

vi.mock('@/api/partnersApi', () => ({
  submitPartnershipApplication: vi.fn().mockResolvedValue({}),
}))

describe('Platform — hero visual is local and V3-compliant (no Unsplash hotlink)', () => {
  it('renders no externally-hosted <img> anywhere on the page', () => {
    const { container } = render(
      <MemoryRouter>
        <Platform />
      </MemoryRouter>,
    )
    // Old behavior: <img src="https://images.unsplash.com/..."> — an external
    // dependency that rendered as a broken block when blocked.
    expect(container.querySelector('img[src^="http"]')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('keeps the visual accessible: gradient panel exposes the old alt text as its name', () => {
    render(
      <MemoryRouter>
        <Platform />
      </MemoryRouter>,
    )
    expect(screen.getByRole('img', { name: 'platform.intro.imageAlt' })).toBeInTheDocument()
  })
})

describe('DepartmentsTimelineStrip — placeholder strip hidden behind default-off flag', () => {
  it('renders nothing (and therefore never leaks the internal Laravel note)', () => {
    const { container } = render(<DepartmentsTimelineStrip />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(/Laravel/)).toBeNull()
    expect(screen.queryByText(/خط زمني للنضج المؤسسي/)).toBeNull()
  })
})

describe('Footer — unconfirmed placeholder phone is not published', () => {
  function renderFooter() {
    return render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
  }

  it('shows no phone number and no tel: link', () => {
    const { container } = renderFooter()
    expect(screen.queryByText('+31 6 00 000 000')).toBeNull()
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
  })

  it('still shows the confirmed email and address rows', () => {
    renderFooter()
    expect(screen.getByText('info@edumc.nl')).toBeInTheDocument()
    expect(screen.getByText(/أمستردام/)).toBeInTheDocument()
  })
})

describe('PartnershipApplyPage — public copy and page-header pattern', () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <PartnershipApplyPage />
      </MemoryRouter>,
    )
  }

  it('no longer exposes internal implementation copy', () => {
    renderPage()
    // Old intro: 'نموذج عام أنيق يعكس هوية EMC — يُرسل إلى خط أنابيب العمليات بعد اعتماد الـ API.'
    expect(screen.queryByText(/خط أنابيب العمليات/)).toBeNull()
    expect(screen.queryByText(/اعتماد الـ API/)).toBeNull()
    expect(screen.queryByText(/نموذج عام أنيق/)).toBeNull()
  })

  it('uses the site page-header pattern: h1 hero + breadcrumb trail', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'طلب شراكة مؤسسية' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'الشراكات' })).toHaveAttribute('href', '/partnerships')
  })
})

describe('OperationsDashboard — KPI tiles on the empty payload contract', () => {
  it('renders an explicit Latin 0 in all eight tiles when data is {}', () => {
    // API empty-payload contract: {success:true, data:{}} → every count is undefined.
    const empty = {} as OperationsDashboardData
    render(
      <MemoryRouter>
        <OperationsDashboard data={empty} />
      </MemoryRouter>,
    )
    // Old behavior: {undefined} rendered nothing — tiles looked broken.
    expect(screen.getAllByText('0')).toHaveLength(8)
    expect(screen.queryByText('NaN')).toBeNull()
  })

  it('empty-state dashboard has no WCAG A/AA violations', async () => {
    const empty = {} as OperationsDashboardData
    const { container } = render(
      <MemoryRouter>
        <OperationsDashboard data={empty} />
      </MemoryRouter>,
    )
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})
