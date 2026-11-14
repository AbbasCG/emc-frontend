import { useEffect, useState } from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import UsersHubPage from '@/pages/super-admin/users/hub/UsersHubPage'
import {
  USERS_HUB_PERMISSIONS,
  USERS_HUB_TABS,
  canSeeHubTab,
  resolveHubTab,
  visibleHubTabs,
  type UsersHubTabDef,
} from '@/pages/super-admin/users/hub/usersHubTabs'

/**
 * مركز المستخدمين: هيكل التبويبات فقط (لا بيانات تحليلية بعد).
 * يغطي: الافتراضي، الروابط المباشرة، الرجوع/التقدم، حفظ حالة الجدول، التحميل الكسول، الصلاحيات، لوحة المفاتيح، ARIA.
 */

const probe = vi.hoisted(() => ({
  usersMounts: 0,
  usersUnmounts: 0,
  loads: { analytics: 0, activity: 0, acquisition: 0 },
}))

const auth = vi.hoisted(() => ({
  user: { id: 1, role: 'super_admin', permissions: [] as string[] },
}))

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }))

// بديل لجدول المستخدمين الحقيقي: يكفي لقياس التركيب والاحتفاظ بالحالة (الجدول نفسه لم يُعدَّل ولديه اختباراته).
vi.mock('@/pages/super-admin/crud/UsersManagementPage', () => ({
  default: function UsersManagementPageStub() {
    const [query, setQuery] = useState('')
    useEffect(() => {
      probe.usersMounts += 1
      return () => {
        probe.usersUnmounts += 1
      }
    }, [])
    return (
      <div>
        <h1>مركز المستخدمين EMC</h1>
        <input aria-label="بحث المستخدمين" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
    )
  },
}))

vi.mock('@/pages/super-admin/users/hub/tabs/AnalyticsTab', () => {
  probe.loads.analytics += 1
  return { default: () => <div>محتوى التحليلات</div> }
})
vi.mock('@/pages/super-admin/users/hub/tabs/ActivityTab', () => {
  probe.loads.activity += 1
  return { default: () => <div>محتوى النشاط</div> }
})
vi.mock('@/pages/super-admin/users/hub/tabs/AcquisitionTab', () => {
  probe.loads.acquisition += 1
  return { default: () => <div>محتوى الاستقطاب</div> }
})

function Probe() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <div>
      <output data-testid="url">{`${location.pathname}${location.search}`}</output>
      <button type="button" onClick={() => navigate(-1)}>
        رجوع
      </button>
      <button type="button" onClick={() => navigate(1)}>
        تقدم
      </button>
    </div>
  )
}

const BASE = '/dashboard/super-admin/crud/users'

function renderHub(initial = BASE) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Probe />
      <UsersHubPage />
    </MemoryRouter>,
  )
}

const url = () => screen.getByTestId('url').textContent
const tab = (name: string) => screen.getByRole('tab', { name })

beforeEach(() => {
  auth.user = { id: 1, role: 'super_admin', permissions: [] }
  probe.usersMounts = 0
  probe.usersUnmounts = 0
})

// ملاحظة: وحدات التبويبات تُحمَّل مرة واحدة لكل ملف اختبار، لذا هذه المجموعة تأتي أولًا ولا يزور كل اختبار فيها إلا
// التبويبات التي يقيس تحميلها (لا اختبار يعتمد على نتيجة سابقه).
describe('التحميل الكسول', () => {
  it('لا يُحمَّل أي تبويب ثقيل قبل زيارته', () => {
    renderHub()

    expect(probe.loads).toEqual({ analytics: 0, activity: 0, acquisition: 0 })
  })

  it('يُحمَّل التبويب عند فتحه فقط، دون غيره', async () => {
    const user = userEvent.setup()
    renderHub()

    await user.click(tab('النشاط'))
    expect(await screen.findByText('محتوى النشاط')).toBeTruthy()

    expect(probe.loads.activity).toBe(1)
    expect(probe.loads.analytics).toBe(0)
    expect(probe.loads.acquisition).toBe(0)
  })

  it('رابط مباشر لتبويب غير مصرَّح به لا يحمّل وحدته', async () => {
    auth.user = { id: 2, role: 'admin', permissions: [] }
    renderHub(`${BASE}?tab=acquisition`)

    expect(screen.getByText('مركز المستخدمين EMC')).toBeTruthy()
    expect(probe.loads.acquisition).toBe(0)
    await waitFor(() => expect(url()).toBe(BASE))
  })
})

describe('التبويب الافتراضي والرابط', () => {
  it('يفتح «المستخدمون» افتراضيًا ويبقي الرابط الأصلي كما هو', () => {
    renderHub()

    expect(tab('المستخدمون').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('مركز المستخدمين EMC')).toBeTruthy()
    expect(url()).toBe(BASE)
  })

  it('يعرض الأربعة تبويبات للجذر بالترتيب المطلوب', () => {
    renderHub()

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['المستخدمون', 'التحليلات', 'النشاط', 'الاستقطاب'])
  })

  it('رابط مباشر ?tab=analytics يفتح التحليلات ولا يركّب جدول المستخدمين', async () => {
    renderHub(`${BASE}?tab=analytics`)

    expect(await screen.findByText('محتوى التحليلات')).toBeTruthy()
    expect(tab('التحليلات').getAttribute('aria-selected')).toBe('true')
    expect(probe.usersMounts).toBe(0)
  })

  it('قيمة tab مجهولة تعود إلى المستخدمين وتنظّف الرابط', async () => {
    renderHub(`${BASE}?tab=nonsense`)

    expect(tab('المستخدمون').getAttribute('aria-selected')).toBe('true')
    await waitFor(() => expect(url()).toBe(BASE))
  })

  it('لا يُفقد باقي معاملات الرابط عند تبديل التبويب', async () => {
    const user = userEvent.setup()
    renderHub(`${BASE}?foo=1`)

    await user.click(tab('التحليلات'))

    expect(url()).toBe(`${BASE}?foo=1&tab=analytics`)
  })
})

describe('التنقل والحالة', () => {
  it('الرجوع والتقدم في المتصفح يبدّلان التبويب', async () => {
    const user = userEvent.setup()
    renderHub()

    await user.click(tab('التحليلات'))
    await screen.findByText('محتوى التحليلات')
    await user.click(tab('النشاط'))
    await screen.findByText('محتوى النشاط')
    expect(url()).toBe(`${BASE}?tab=activity`)

    await user.click(screen.getByRole('button', { name: 'رجوع' }))
    expect(url()).toBe(`${BASE}?tab=analytics`)
    expect(tab('التحليلات').getAttribute('aria-selected')).toBe('true')

    await user.click(screen.getByRole('button', { name: 'رجوع' }))
    expect(url()).toBe(BASE)
    expect(tab('المستخدمون').getAttribute('aria-selected')).toBe('true')

    await user.click(screen.getByRole('button', { name: 'تقدم' }))
    expect(tab('التحليلات').getAttribute('aria-selected')).toBe('true')
  })

  it('العودة إلى «المستخدمون» تحذف tab من الرابط', async () => {
    const user = userEvent.setup()
    renderHub(`${BASE}?tab=activity`)

    await screen.findByText('محتوى النشاط')
    await user.click(tab('المستخدمون'))

    expect(url()).toBe(BASE)
  })

  it('يحتفظ جدول المستخدمين بحالته (لا يُعاد تركيبه) عند التنقل بين التبويبات', async () => {
    const user = userEvent.setup()
    renderHub()

    await user.type(screen.getByLabelText('بحث المستخدمين'), 'سارة')
    await user.click(tab('التحليلات'))
    await screen.findByText('محتوى التحليلات')

    // مخفي لا مفكَّك
    const usersPanel = screen.getByLabelText('بحث المستخدمين', { selector: 'input' }).closest('[role="tabpanel"]')
    expect(usersPanel?.hasAttribute('hidden')).toBe(true)

    await user.click(tab('المستخدمون'))

    expect((screen.getByLabelText('بحث المستخدمين') as HTMLInputElement).value).toBe('سارة')
    expect(probe.usersMounts).toBe(1)
    expect(probe.usersUnmounts).toBe(0)
  })

  it('التبويب غير المحتفَظ به يُفكَّك عند مغادرته', async () => {
    const user = userEvent.setup()
    renderHub(`${BASE}?tab=analytics`)

    await screen.findByText('محتوى التحليلات')
    await user.click(tab('المستخدمون'))

    expect(screen.queryByText('محتوى التحليلات')).toBeNull()
  })
})

describe('الصلاحيات', () => {
  it('admin بلا مفاتيح يرى «المستخدمون» فقط ولا يظهر شريط التبويبات', () => {
    auth.user = { id: 2, role: 'admin', permissions: ['view_users'] }
    renderHub()

    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByText('مركز المستخدمين EMC')).toBeTruthy()
  })

  it('رابط مباشر لتبويب غير مصرَّح به يعود إلى المستخدمين دون تحميله', async () => {
    auth.user = { id: 2, role: 'admin', permissions: [] }
    renderHub(`${BASE}?tab=activity`)

    expect(screen.getByText('مركز المستخدمين EMC')).toBeTruthy()
    expect(screen.queryByText('محتوى النشاط')).toBeNull()
    await waitFor(() => expect(url()).toBe(BASE))
  })

  it('كل مفتاح يفتح تبويبه فقط', () => {
    auth.user = { id: 3, role: 'admin', permissions: [USERS_HUB_PERMISSIONS.analytics] }
    renderHub()

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['المستخدمون', 'التحليلات'])
  })

  it('tech_admin يتجاوز الفحص كما في الـ Backend', () => {
    auth.user = { id: 4, role: 'tech_admin', permissions: [] }
    renderHub()

    expect(screen.getAllByRole('tab')).toHaveLength(4)
  })
})

describe('لوحة المفاتيح وإمكانية الوصول', () => {
  it('بنية ARIA: tablist وtab وtabpanel مترابطة', () => {
    renderHub()

    const list = screen.getByRole('tablist')
    expect(list.getAttribute('aria-label')).toBe('أقسام مركز المستخدمين')
    const active = tab('المستخدمون')
    const panel = document.getElementById(active.getAttribute('aria-controls') ?? '')
    expect(panel?.getAttribute('role')).toBe('tabpanel')
    expect(panel?.getAttribute('aria-labelledby')).toBe(active.id)
    expect(within(list).getAllByRole('tab')).toHaveLength(4)
  })

  it('تبويب واحد فقط في ترتيب Tab (roving tabindex)', () => {
    renderHub()

    expect(screen.getAllByRole('tab').map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
  })

  it('RTL: السهم الأيسر ينقل التركيز للتالي والأيمن للسابق، وHome/End، والتفعيل بـ Enter', async () => {
    const user = userEvent.setup()
    renderHub()

    tab('المستخدمون').focus()
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(tab('التحليلات'))
    expect(url()).toBe(BASE) // التركيز لا يفعّل

    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(tab('المستخدمون'))

    await user.keyboard('{End}')
    expect(document.activeElement).toBe(tab('الاستقطاب'))
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(tab('المستخدمون'))

    await user.keyboard('{ArrowRight}') // التفاف للأخير
    expect(document.activeElement).toBe(tab('الاستقطاب'))

    await user.keyboard('{Enter}')
    expect(await screen.findByText('محتوى الاستقطاب')).toBeTruthy()
    expect(url()).toBe(`${BASE}?tab=acquisition`)
  })
})

describe('سجل التبويبات (قابلية التوسّع)', () => {
  const extra: UsersHubTabDef = {
    ...USERS_HUB_TABS[1],
    id: 'quality' as never,
    labelAr: 'جودة الحسابات',
    requiredPermission: 'users.quality.view',
  }

  it('إضافة تبويب = إضافة تعريف واحد، وتخضع للصلاحية نفسها', () => {
    const all = [...USERS_HUB_TABS, extra]

    expect(visibleHubTabs(all, { role: 'admin', permissions: [] }).map((t) => t.id)).toEqual(['users'])
    expect(visibleHubTabs(all, { role: 'admin', permissions: ['users.quality.view'] }).map((t) => t.id)).toEqual(['users', 'quality'])
    expect(visibleHubTabs(all, { role: 'super_admin' })).toHaveLength(5)
    expect(resolveHubTab('quality', all, { role: 'admin', permissions: [] })).toBe('users')
    expect(resolveHubTab('quality', all, { role: 'admin', permissions: ['users.quality.view'] })).toBe('quality')
  })

  it('تبويب بلا requiredPermission متاح للجميع، وغير الجذر يحتاج المفتاح بالضبط', () => {
    expect(canSeeHubTab(USERS_HUB_TABS[0], { role: 'student' })).toBe(true)
    expect(canSeeHubTab(USERS_HUB_TABS[1], { role: 'admin', permissions: ['users.activity.view'] })).toBe(false)
  })

  it('مفاتيح الصلاحيات كما اعتُمدت', () => {
    expect(USERS_HUB_PERMISSIONS).toEqual({
      analytics: 'users.analytics.view',
      activity: 'users.activity.view',
      acquisition: 'users.acquisition.view',
    })
  })
})
