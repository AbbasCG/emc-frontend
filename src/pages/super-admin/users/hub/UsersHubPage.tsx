import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import SectionErrorBoundary from '@/components/errors/SectionErrorBoundary'
import { SaPageRoot } from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import UsersManagementPage from '@/pages/super-admin/crud/UsersManagementPage'
import { normalizeRole } from '@/utils/dashboardAccess'
import {
  DEFAULT_USERS_HUB_TAB,
  USERS_HUB_TABS,
  resolveHubTab,
  visibleHubTabs,
  hubPanelDomId,
  hubTabDomId,
  type UsersHubTabDef,
  type UsersHubTabId,
} from './usersHubTabs'
import { UsersHubTabBar } from './UsersHubTabBar'

/**
 * مركز المستخدمين: نفس الرابط `/dashboard/super-admin/crud/users`، وتبويبات تُختار بـ `?tab=`.
 *
 *  - «المستخدمون» هو الافتراضي ولا يظهر في الرابط (الرابط الأصلي لا يتغير).
 *  - لا يُركَّب تبويب (ولا يجلب بياناته) قبل أول زيارة له.
 *  - ما كان `keepMounted` يبقى مركّبًا ومخفيًا بعد أول زيارة، فيحتفظ جدول المستخدمين بالبحث والفلاتر والصفحة.
 *  - تبديل التبويب يُضيف إدخالًا لسجل المتصفح (رجوع/تقدم)، وقيمة غير صالحة أو غير مصرَّح بها تعود للافتراضي.
 *  - التبويبات تُعرَّف في `usersHubTabs.ts` وحده.
 */

function PanelFallback({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-4 py-2">
      <span className="sr-only">{`جارٍ تحميل ${label}`}</span>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-3xl bg-slate-100" aria-hidden="true" />
    </div>
  )
}

function TabPanel({ tab, active }: { tab: UsersHubTabDef; active: boolean }) {
  const reduceMotion = useReducedMotion()
  const Component = tab.component

  return (
    <motion.div
      role="tabpanel"
      id={hubPanelDomId(tab.id)}
      aria-labelledby={hubTabDomId(tab.id)}
      hidden={!active}
      tabIndex={-1}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="outline-none"
    >
      {Component ?
        <SectionErrorBoundary title={`تعذّر تحميل ${tab.labelAr}`}>
          <Suspense fallback={<PanelFallback label={tab.labelAr} />}>
            <Component />
          </Suspense>
        </SectionErrorBoundary>
      : <UsersManagementPage />}
    </motion.div>
  )
}

export default function UsersHubPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()

  const viewer = useMemo(
    () => ({ role: normalizeRole(user?.role ?? null), permissions: user?.permissions ?? null }),
    [user?.role, user?.permissions],
  )
  const tabs = useMemo(() => visibleHubTabs(USERS_HUB_TABS, viewer), [viewer])
  const rawTab = params.get('tab')
  const active = resolveHubTab(rawTab, USERS_HUB_TABS, viewer)

  // قيمة مجهولة/غير مصرَّح بها في الرابط: نظّف الرابط إلى الأصلي دون إضافة إدخال لسجل المتصفح.
  useEffect(() => {
    if (rawTab !== null && rawTab !== active) {
      const next = new URLSearchParams(params)
      next.delete('tab')
      setParams(next, { replace: true })
    }
  }, [rawTab, active, params, setParams])

  // التبويبات التي زارها المستخدم (لإبقاء ما هو keepMounted مركّبًا).
  const [visited, setVisited] = useState<ReadonlySet<UsersHubTabId>>(() => new Set([active]))
  if (!visited.has(active)) setVisited(new Set(visited).add(active)) // حالة مشتقة: تُضبط أثناء العرض لا في effect

  const select = useCallback(
    (id: UsersHubTabId) => {
      if (id === active) return
      const next = new URLSearchParams(params)
      if (id === DEFAULT_USERS_HUB_TAB) next.delete('tab')
      else next.set('tab', id)
      setParams(next) // push: الرجوع والتقدم يعملان
    },
    [active, params, setParams],
  )

  return (
    <SaPageRoot className="space-y-6">
      {tabs.length > 1 ?
        <UsersHubTabBar tabs={tabs} active={active} onSelect={select} />
      : null}

      {tabs.map((tab) => {
        const isActive = tab.id === active
        if (!isActive && !(tab.keepMounted && visited.has(tab.id))) return null
        return <TabPanel key={tab.id} tab={tab} active={isActive} />
      })}
    </SaPageRoot>
  )
}
