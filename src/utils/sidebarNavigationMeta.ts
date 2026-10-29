import type { ElementType } from 'react'
import {
  Building2,
  Briefcase,
  ClipboardCheck,
  Code2,
  FileText,
  GraduationCap,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'

/**
 * NAVIGATION METADATA — presentation decisions only. Nothing here grants or denies access.
 *
 * Access is decided by the backend manifest. This module answers two different questions
 * about the sidebar that the manifest cannot:
 *
 *   1. Which links are STRUCTURAL — not access-controlled capabilities at all?
 *   2. Which allowed pages are deliberately NOT shown as sidebar entries?
 */

/**
 * Sidebar links that are not dashboard capabilities in the page-access catalog: a settings
 * landing page and three app-level destinations that live outside `/dashboard`. They have no
 * entry in the manifest by design, so they are the ONLY unmapped links the sidebar keeps.
 *
 * Anything else the manifest has no opinion on is treated as unknown and dropped (fail
 * closed): an unmapped link must be declared here on purpose, never kept by default.
 */
export const STRUCTURAL_SIDEBAR_PATHS: ReadonlySet<string> = new Set([
  '/dashboard/settings',
  '/documents',
  '/ai',
  '/calendar',
])

/**
 * Allowed pages that must NOT be injected into the sidebar, with the reason. This is the
 * explicit `hiddenFromSidebar` list: a page the user may open that is reached from other
 * chrome rather than from the menu. Every other allowed, non-root-granted page appears.
 */
export const HIDDEN_FROM_SIDEBAR: Readonly<Record<string, string>> = {
  'personal.profile': 'Reached from the account card and the top bar; not a menu destination.',
  'personal.notifications': 'Reached from the top-bar bell.',
  'personal.notification_preferences': 'Reached from the notifications page.',
  'personal.volunteer_hr_profile': 'A one-off application form opened from an invitation link, not a standing destination.',
}

/**
 * Pages whose menu entry needs an explicit BUSINESS permission on top of page access.
 *
 * Page access for this page is granted to root roles by the platform's architecture, but its
 * API requires a permission that no role inherits (not even tech_admin). Without this the
 * menu would offer a link that can only end in "unauthorized". The backend still enforces
 * the permission on every request; this only keeps the menu truthful.
 */
export const PERMISSION_GATED_PAGES: Readonly<Record<string, string>> = {
  'executive.command_center': 'executive.command_center.view',
}

/** Heading icons for pages injected under their catalog category. */
export const CATEGORY_ICON: Readonly<Record<string, ElementType>> = {
  operations: ClipboardCheck,
  finance: Wallet,
  hr: Users,
  quality: ShieldCheck,
  lms: GraduationCap,
  organizational_departments: Building2,
  administration: UserCog,
  technical_system: Code2,
  personal: Briefcase,
}

export const FALLBACK_ICON: ElementType = FileText
