import { describe, it, expect } from 'vitest'
import {
  canAccessDashboardPath,
  getDashboardPathByRole,
} from '@/utils/dashboardAccess'
import { getSidebarByRole as getSidebar } from '@/layouts/dashboardSidebar'

/**
 * Verifies the frontend half of the AI Department (organizational) vs
 * AI Platform (technical) separation: ai_manager's home/sidebar now point
 * to the department workspace, not the technical AI Command Center, and
 * the technical routes remain reachable only for admin/super_admin/tech_admin.
 */

describe('ai_manager home + route guard', () => {
  it('routes ai_manager home to the AI Department workspace, not the technical AI Command Center', () => {
    expect(getDashboardPathByRole('ai_manager')).toBe('/dashboard/ai-department')
  })

  it('ai_manager can access the AI Department workspace', () => {
    expect(canAccessDashboardPath('ai_manager', '/dashboard/ai-department')).toBe(true)
  })

  it('ai_manager can no longer access the technical AI Command Center by default', () => {
    expect(canAccessDashboardPath('ai_manager', '/dashboard/admin/ai')).toBe(false)
    expect(canAccessDashboardPath('ai_manager', '/dashboard/admin/ai/usage')).toBe(false)
    expect(canAccessDashboardPath('ai_manager', '/dashboard/admin/ai/automations')).toBe(false)
  })

  it('ai_manager no longer has access to expert-applications (unrelated talent-recruitment workflow, not AI department or platform work)', () => {
    expect(canAccessDashboardPath('ai_manager', '/dashboard/admin/ai/expert-applications')).toBe(false)
  })

  it('admin retains expert-applications access', () => {
    expect(canAccessDashboardPath('admin', '/dashboard/admin/ai/expert-applications')).toBe(true)
  })

  it('admin/super_admin/tech_admin retain access to the technical AI Command Center', () => {
    expect(canAccessDashboardPath('admin', '/dashboard/admin/ai')).toBe(true)
    expect(canAccessDashboardPath('super_admin', '/dashboard/admin/ai')).toBe(true)
    expect(canAccessDashboardPath('tech_admin', '/dashboard/admin/ai')).toBe(true)
  })

  it('ai_manager can access the shared operations surface (Weekly/Meeting Reports, board)', () => {
    expect(canAccessDashboardPath('ai_manager', '/dashboard/operations/weekly-reports')).toBe(true)
    expect(canAccessDashboardPath('ai_manager', '/dashboard/operations/meeting-reports')).toBe(true)
  })

  it('an unrelated role (student) can access neither the department workspace nor the platform', () => {
    expect(canAccessDashboardPath('student', '/dashboard/ai-department')).toBe(false)
    expect(canAccessDashboardPath('student', '/dashboard/admin/ai')).toBe(false)
  })
})

describe('sidebar for ai_manager', () => {
  it('shows the AI Department workspace entry, not the technical AI Command Center label', () => {
    const groups = getSidebar('ai_manager')
    const allItems = groups.flatMap((g) => g.items)
    const labels = allItems.map((i) => i.label)
    const hrefs = allItems.map((i) => i.href)

    expect(hrefs).toContain('/dashboard/ai-department')
    expect(labels).not.toContain('مركز الذكاء الاصطناعي')
  })

  it('does not show technical AI platform pages (usage/automations/insights) by default', () => {
    const groups = getSidebar('ai_manager')
    const hrefs = groups.flatMap((g) => g.items).map((i) => i.href)

    expect(hrefs).not.toContain('/dashboard/admin/ai/usage')
    expect(hrefs).not.toContain('/dashboard/admin/ai/automations')
    expect(hrefs).not.toContain('/dashboard/admin/ai/insights')
    // Unrelated talent-recruitment workflow — no longer part of ai_manager's sidebar either.
    expect(hrefs).not.toContain('/dashboard/admin/ai/expert-applications')
  })

  it('shows generic department actions (members, weekly reports, meeting reports)', () => {
    const groups = getSidebar('ai_manager')
    const hrefs = groups.flatMap((g) => g.items).map((i) => i.href)

    expect(hrefs).toContain('/dashboard/members')
    expect(hrefs).toContain('/dashboard/operations/weekly-reports')
    expect(hrefs).toContain('/dashboard/operations/meeting-reports')
  })
})
