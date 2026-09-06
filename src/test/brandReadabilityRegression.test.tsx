import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import CookieBanner from '@/components/legal/CookieBanner'
import ProgramsManagerDashboardView from '@/components/programs-manager/ProgramsManagerDashboardView'
import SuperAdminOverviewPage from '@/pages/super-admin/SuperAdminOverviewPage'
import type { ProgramsManagerDashboardPayload } from '@/api/programsManagerApi'
import { axeCheck } from './axe'

/**
 * Brand-law / readability regression pass:
 *  1. CookieBanner — was a translucent glass card (backdrop-blur over light pages)
 *     with an orange (#F28C00) policy link: unreadable + orange-text-on-light
 *     violation. Now a solid #0C2A4B card; links are #A6D6F2; orange lives only
 *     on the solid primary "accept" button.
 *  2. ProgramsManagerDashboardView — hero date rendered Arabic-Indic numerals
 *     via 'ar-SA' (also Hijri calendar) and the operations heading mixed raw
 *     English ("هل pipeline التعلم ينمو؟"). Now 'ar-EG-u-nu-latn' (Latin digits,
 *     Gregorian) and clean Arabic wording.
 *  3. SuperAdminOverviewPage — "آخر تحديث" time ("07:25 AM") was reordered by
 *     the RTL bidi algorithm into "AM 07:25". The span is now dir="ltr".
 */

vi.mock('framer-motion', async () => {
  const React = await import('react')
  const MOTION_ONLY = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'viewport',
    'whileHover', 'whileTap', 'whileInView', 'whileFocus', 'whileDrag',
    'layout', 'layoutId', 'drag', 'custom', 'onAnimationComplete', 'onAnimationStart',
  ])
  type StubProps = Record<string, unknown> & { children?: import('react').ReactNode }
  const make = (tag: string) =>
    React.forwardRef<HTMLElement, StubProps>(function MotionStub(props, ref) {
      const { children, ...rest } = props
      const domProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rest)) {
        if (!MOTION_ONLY.has(key)) domProps[key] = value
      }
      if (ref) domProps.ref = ref
      // Record<string, unknown> in StubProps widens `children` back to unknown.
      return React.createElement(tag, domProps, children as import('react').ReactNode)
    })
  const cache = new Map<string, unknown>()
  const motion = new Proxy({} as Record<string, unknown>, {
    get(_target, tag: string) {
      if (!cache.has(tag)) cache.set(tag, make(tag))
      return cache.get(tag)
    },
  })
  return {
    motion,
    AnimatePresence: (props: { children?: import('react').ReactNode }) => props.children,
  }
})

// jsdom has no ResizeObserver — recharts' ResponsiveContainer would throw, and the
// defects under test are text/color, not charts.
vi.mock('recharts', () => {
  const Stub = ({ children }: { children?: import('react').ReactNode }) => <div>{children}</div>
  const Leaf = () => null
  return {
    ResponsiveContainer: Stub,
    LineChart: Stub,
    AreaChart: Stub,
    BarChart: Stub,
    Line: Leaf,
    Area: Leaf,
    Bar: Leaf,
    XAxis: Leaf,
    YAxis: Leaf,
    CartesianGrid: Leaf,
    Tooltip: Leaf,
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/i18n/useLanguage', () => ({
  useLanguage: () => ({ dir: 'rtl', lang: 'ar' }),
}))

vi.mock('@/contexts/useCookieConsent', () => ({
  DEFAULT_PREFS: { analytics: false, marketing: false },
  useCookieConsent: () => ({
    bannerVisible: true,
    preferencesOpen: false,
    consent: null,
    acceptAll: vi.fn(),
    rejectNonEssential: vi.fn(),
    openPreferences: vi.fn(),
    closePreferences: vi.fn(),
    savePreferences: vi.fn(),
    withdrawAll: vi.fn(),
  }),
}))

// SuperAdminOverviewPage fires several dashboard fetches on mount; the header under
// test renders unconditionally, so pending promises keep every section in its
// skeleton state without any unhandled data-shape assumptions.
const hoisted = vi.hoisted(() => ({
  pending: () => new Promise<never>(() => {}),
}))
vi.mock('@/api/adminUsersApi', () => ({
  fetchAdminUsers: hoisted.pending,
  fetchSuperAdminStats: hoisted.pending,
}))
vi.mock('@/api/volunteersApi', () => ({
  fetchVolunteers: hoisted.pending,
  fetchVolunteerRequestsStats: hoisted.pending,
}))
vi.mock('@/api/adminRegistrationsApi', () => ({
  fetchAdminRegistrations: hoisted.pending,
}))
vi.mock('@/api/superAdminCatalogApi', () => ({
  fetchCoursesStrict: hoisted.pending,
}))
vi.mock('@/api/adminInstructorsApi', () => ({
  fetchAdminInstructorsDirectory: hoisted.pending,
}))
vi.mock('@/api/superAdminOpsApi', () => ({
  fetchWorkspaceDepartmentsForSuperAdmin: hoisted.pending,
}))
vi.mock('@/api/financeApi', () => ({
  fetchFinanceDashboard: hoisted.pending,
}))

const ARABIC_INDIC_DIGITS = /[٠-٩]/

const emptyPayload: ProgramsManagerDashboardPayload = {
  summary: {
    programs: 0,
    published_programs: 0,
    courses: 0,
    published_courses: 0,
    ended_courses: 0,
    draft_courses: 0,
    learning_paths: 0,
    published_paths: 0,
    registrations: 0,
    pending_registrations: 0,
    active_students: 0,
    active_instructors: 0,
    upcoming_sessions: 0,
    pending_assignments: 0,
    pending_reviews: 0,
    materials_total: 0,
    attendance_average: 0,
    completion_average: 0,
  },
  registration_pipeline: [],
  assignment_stats: { pending_review: 0, needs_resubmission: 0, completed: 0, total_submissions: 0 },
  analytics: { registrations_monthly: [], courses_monthly: [], sessions_monthly: [], paths_monthly: [] },
  courses: [],
  learning_paths: [],
  pending_registrations: [],
  upcoming_sessions: [],
  instructor_activity: [],
  program_alerts: [],
  recent_activity: [],
}

describe('CookieBanner — solid V3 surface, no orange links', () => {
  function renderBanner() {
    return render(
      <MemoryRouter>
        <CookieBanner />
      </MemoryRouter>,
    )
  }

  // The three guards below keep their original INTENT; only the colour spelling
  // moved from raw hex to design tokens, because raw hex is now lint-fatal
  // (bg-[#0C2A4B] -> bg-navy, text-[#A6D6F2] -> text-ice).
  it('renders a solid deep-navy card with no glass blur on the surface', () => {
    const { container } = renderBanner()
    // Old surface: translucent navy + backdrop-blur-xl over light pages.
    expect(container.querySelector('[class*="backdrop-blur"]')).toBeNull()
    const card = container.querySelector('[class*="bg-navy"]')
    expect(card).not.toBeNull()
    // Solid, never bg-navy/80 and friends.
    expect(card!.className).not.toMatch(/bg-navy\/\d/)
  })

  it('policy/privacy links are light-blue (ice), never orange text', () => {
    renderBanner()
    const policy = screen.getByRole('link', { name: 'cookie.policyLink' })
    const privacy = screen.getByRole('link', { name: 'cookie.privacyLink' })
    for (const link of [policy, privacy]) {
      expect(link.className).not.toMatch(/F28C00|FFA733|C97208|customOrange|amber|ember/i)
      expect(link.className).toContain('text-ice')
    }
  })

  it('gives accept and refuse EQUAL prominence — no orange nudge on either', () => {
    // EMC-WEB-001 §17: the consent banner must offer «خيارين متساويي الوضوح»,
    // with refusal the pre-decision default. Painting «قبول» in the primary
    // action colour while «رفض» stays plain is exactly the nudge that rule
    // forbids, so the previous "orange accept button" guard is replaced by this
    // stricter one: neither decision may carry fire, and both must be built from
    // one identical class string so prominence is equal by construction.
    const { container } = renderBanner()
    expect(container.querySelectorAll('[class*="F28C00"]')).toHaveLength(0)

    const accept = screen.getByRole('button', { name: 'cookie.acceptAll' })
    const reject = screen.getByRole('button', { name: 'cookie.rejectNonEssential' })
    for (const button of [accept, reject]) {
      expect(button.className).not.toMatch(/F28C00|FFA733|C97208|customOrange|accent-\d|amber|ember/i)
    }
    expect(accept.className).toBe(reject.className)
  })

  it('has no WCAG 2.1 A/AA violations', async () => {
    const { container } = renderBanner()
    expect(await axeCheck(container)).toHaveNoViolations()
  })
})

describe('ProgramsManagerDashboardView — Latin digits + clean Arabic heading', () => {
  function renderView() {
    return render(
      <MemoryRouter>
        <ProgramsManagerDashboardView
          data={emptyPayload}
          userName="مدير الاختبار"
          onRefresh={() => {}}
          loading={false}
        />
      </MemoryRouter>,
    )
  }

  it('hero date uses Latin digits — no Arabic-Indic numerals anywhere', () => {
    const { container } = renderView()
    // Old locale 'ar-SA' rendered '٢٧ يوليو ...' (and a Hijri year); brand law
    // requires Latin digits 0-9 everywhere.
    expect(container.textContent).not.toMatch(ARABIC_INDIC_DIGITS)
    // The Gregorian year must appear as 4 Latin digits.
    expect(container.textContent).toMatch(/\d{4}/)
  })

  it('operations heading is clean Arabic without the raw English word "pipeline"', () => {
    renderView()
    expect(screen.getByText('هل مسار التعلّم ينمو؟')).toBeInTheDocument()
    expect(screen.queryByText(/pipeline/i)).toBeNull()
  })
})

describe('SuperAdminOverviewPage — "آخر تحديث" time is bidi-isolated', () => {
  it('wraps the clock in a dir="ltr" span so "07:25 AM" cannot flip to "AM 07:25"', () => {
    render(
      <MemoryRouter>
        <SuperAdminOverviewPage />
      </MemoryRouter>,
    )
    const clock = screen.getByText((content, element) => {
      return element?.tagName === 'SPAN' && /\d{1,2}:\d{2}/.test(content) && /AM|PM/.test(content)
    })
    expect(clock).toHaveAttribute('dir', 'ltr')
  })
})
