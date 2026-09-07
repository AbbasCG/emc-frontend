import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Globe,
  LayoutDashboard,
  Lock,
  PlusCircle,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react'
import type { AdminManagedUser } from '@/api/adminUsersApi'
import { fetchRolePermissions } from '@/api/rolesPermissionsApi'
import {
  ALL_SITE_PAGES,
  SITE_PAGES_CATALOG,
  roleHasDefaultAccess,
  type SitePage,
} from '@/data/sitePagesCatalog'
import {
  buildOverrideSets,
  clearUserPageOverrides,
  getUserPageOverrides,
  saveUserPageOverrides,
  type PageOverrideEntry,
} from '@/store/userPageOverridesStore'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean
  user: AdminManagedUser
  roleSlug: string
  roleLabelAr: string
  onClose: () => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function Badge({ children, cls }: { children: React.ReactNode; cls: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${cls}`}>
      {children}
    </span>
  )
}

// ─── Page toggle row ───────────────────────────────────────────────────────────

type PageRowProps = {
  pageId: string
  titleAr: string
  path: string
  roleDefault: boolean
  effectiveMode: 'allow' | 'deny' | 'default'
  onToggle: (pageId: string) => void
}

function PageRow({ pageId, titleAr, path, roleDefault, effectiveMode, onToggle }: PageRowProps) {
  const isGranted =
    effectiveMode === 'allow' ||
    (effectiveMode === 'default' && roleDefault)
  const isOverridden = effectiveMode !== 'default'

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-2.5 transition hover:border-slate-200 hover:shadow-sm">
      {/* Switch Toggle */}
      <button
        type="button"
        onClick={() => onToggle(pageId)}
        aria-label={isGranted ? 'تعطيل الوصول' : 'تفعيل الوصول'}
        className={`relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          isGranted ? 'bg-emerald-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute h-4 w-4 rounded-full bg-white shadow transition-transform ${
            isGranted ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>

      {/* Title & Path */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-black text-[#0C2A4B]">{titleAr}</p>
        <code className="block truncate text-[10px] font-mono text-slate-400" dir="ltr">{path}</code>
      </div>

      {/* Status Badges */}
      <div className="flex shrink-0 gap-1.5">
        {roleDefault && (
          <Badge cls="bg-[#0077B6]/10 text-[#0077B6] ring-[#0077B6]/20">
            <Shield className="h-2.5 w-2.5" />
            افتراضي
          </Badge>
        )}
        {isOverridden && effectiveMode === 'allow' && (
          <Badge cls="bg-emerald-50 text-emerald-700 ring-emerald-200">
            <PlusCircle className="h-2.5 w-2.5" />
            مضاف
          </Badge>
        )}
        {isOverridden && effectiveMode === 'deny' && (
          <Badge cls="bg-rose-50 text-rose-700 ring-rose-200">
            <XCircle className="h-2.5 w-2.5" />
            محجوب
          </Badge>
        )}
      </div>
    </div>
  )
}

// ─── Group accordion ───────────────────────────────────────────────────────────

type GroupAccordionProps = {
  groupId: string
  titleAr: string
  pages: SitePage[]
  roleSlug: string
  allowSet: Set<string>
  denySet: Set<string>
  searchQuery: string
  onToggle: (pageId: string) => void
  onGrantGroup: (pages: SitePage[]) => void
  onDenyGroup: (pages: SitePage[]) => void
  onResetGroup: (pages: SitePage[]) => void
}

function GroupAccordion({
  groupId,
  titleAr,
  pages,
  roleSlug,
  allowSet,
  denySet,
  searchQuery,
  onToggle,
  onGrantGroup,
  onDenyGroup,
  onResetGroup,
}: GroupAccordionProps) {
  // Filter pages by search query
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages
    const q = searchQuery.toLowerCase().trim()
    return pages.filter(
      (p) =>
        p.titleAr.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    )
  }, [pages, searchQuery])

  const [open, setOpen] = useState(true)

  // Force open if search is active
  const isAccordionOpen = searchQuery.trim() !== '' ? true : open

  if (filteredPages.length === 0) return null

  const groupGrantedCount = filteredPages.filter((p) => {
    const roleDefault = roleHasDefaultAccess(roleSlug, p)
    const eff = allowSet.has(p.id) ? 'allow' : denySet.has(p.id) ? 'deny' : 'default'
    return eff === 'allow' || (eff === 'default' && roleDefault)
  }).length

  const GroupIcon = groupId === 'public' ? Globe : LayoutDashboard

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-3 text-right"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#0077B6]/10 text-[#0077B6]">
            <GroupIcon className="h-4 w-4" />
          </span>
          <div className="flex-1 text-right">
            <span className="text-[13px] font-black text-[#0C2A4B]">{titleAr}</span>
            <span className="ms-2 text-[11px] font-semibold text-slate-400">
              ({groupGrantedCount}/{filteredPages.length} مفعّلة)
            </span>
          </div>
          {isAccordionOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {/* Quick Batch Buttons for Group */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onGrantGroup(filteredPages)}
            title="تفعيل كل شاشات المجموعة"
            className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 hover:bg-emerald-100 transition"
          >
            تفعيل الكل
          </button>
          <button
            type="button"
            onClick={() => onDenyGroup(filteredPages)}
            title="تعطيل كل شاشات المجموعة"
            className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700 hover:bg-rose-100 transition"
          >
            تعطيل الكل
          </button>
          <button
            type="button"
            onClick={() => onResetGroup(filteredPages)}
            title="استعادة الوضع الافتراضي للمجموعة"
            className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            افتراضي
          </button>
        </div>
      </div>

      {/* Pages List */}
      {isAccordionOpen && (
        <div className="space-y-1.5 p-3">
          {filteredPages.map((page) => {
            const roleDefault = roleHasDefaultAccess(roleSlug, page)
            const effectiveMode = allowSet.has(page.id)
              ? 'allow'
              : denySet.has(page.id)
              ? 'deny'
              : 'default'
            return (
              <PageRow
                key={page.id}
                pageId={page.id}
                titleAr={page.titleAr}
                path={page.path}
                roleDefault={roleDefault}
                effectiveMode={effectiveMode}
                onToggle={onToggle}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function UserPageAccessModal({ open, user, roleSlug, roleLabelAr, onClose }: Props) {
  const [overrides, setOverrides] = useState<PageOverrideEntry[]>([])
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [permsLoading, setPermsLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load existing overrides + role permissions
  useEffect(() => {
    if (!open) return
    const stored = getUserPageOverrides(user.id)
    setOverrides(stored?.overrides ?? [])
    setSaved(false)
    setSearchQuery('')

    setPermsLoading(true)
    fetchRolePermissions(roleSlug)
      .then(setRolePermissions)
      .catch(() => setRolePermissions([]))
      .finally(() => setPermsLoading(false))
  }, [open, user.id, roleSlug])

  const { allowSet, denySet } = useMemo(() => buildOverrideSets(overrides), [overrides])

  // Toggle a single page
  function handleToggle(pageId: string) {
    setSaved(false)
    setOverrides((prev) => {
      const existing = prev.find((o) => o.pageId === pageId)
      const page = ALL_SITE_PAGES.find((p) => p.id === pageId)
      if (!page) return prev

      const roleDefault = roleHasDefaultAccess(roleSlug, page)

      if (!existing) {
        // No override yet: flip default
        return [...prev, { pageId, mode: roleDefault ? 'deny' : 'allow' }]
      }

      // If existing is opposite of default, cycle to revert
      if (
        (existing.mode === 'allow' && !roleDefault) ||
        (existing.mode === 'deny' && roleDefault)
      ) {
        return prev.filter((o) => o.pageId !== pageId)
      }

      // Otherwise cycle
      return prev.map((o) =>
        o.pageId === pageId
          ? { pageId, mode: o.mode === 'allow' ? 'deny' : 'allow' }
          : o,
      )
    })
  }

  // Batch action: Grant group
  function handleGrantGroup(pages: SitePage[]) {
    setSaved(false)
    setOverrides((prev) => {
      const updated = [...prev]
      for (const page of pages) {
        const roleDefault = roleHasDefaultAccess(roleSlug, page)
        const idx = updated.findIndex((o) => o.pageId === page.id)
        if (roleDefault) {
          // Default is granted, remove any deny override
          if (idx !== -1) updated.splice(idx, 1)
        } else {
          // Default is denied, add allow override
          if (idx !== -1) updated[idx] = { pageId: page.id, mode: 'allow' }
          else updated.push({ pageId: page.id, mode: 'allow' })
        }
      }
      return updated
    })
  }

  // Batch action: Deny group
  function handleDenyGroup(pages: SitePage[]) {
    setSaved(false)
    setOverrides((prev) => {
      const updated = [...prev]
      for (const page of pages) {
        const roleDefault = roleHasDefaultAccess(roleSlug, page)
        const idx = updated.findIndex((o) => o.pageId === page.id)
        if (!roleDefault) {
          // Default is denied, remove any allow override
          if (idx !== -1) updated.splice(idx, 1)
        } else {
          // Default is allowed, add deny override
          if (idx !== -1) updated[idx] = { pageId: page.id, mode: 'deny' }
          else updated.push({ pageId: page.id, mode: 'deny' })
        }
      }
      return updated
    })
  }

  // Batch action: Reset group
  function handleResetGroup(pages: SitePage[]) {
    setSaved(false)
    const pageIds = new Set(pages.map((p) => p.id))
    setOverrides((prev) => prev.filter((o) => !pageIds.has(o.pageId)))
  }

  // Global batch actions
  function handleGrantAll() {
    handleGrantGroup(ALL_SITE_PAGES)
  }

  function handleDenyAll() {
    handleDenyGroup(ALL_SITE_PAGES)
  }

  function handleClearAll() {
    clearUserPageOverrides(user.id)
    setOverrides([])
    setSaved(false)
  }

  function handleSave() {
    saveUserPageOverrides(user.id, roleSlug, overrides)
    setSaved(true)
  }

  if (!open || typeof document === 'undefined') return null

  const overridesCount = overrides.length
  const initials = initialsFromName(user.name)

  return createPortal(
    // Backdrop
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:p-4 pt-6 sm:pt-10 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl border border-white/80 bg-[#f8fafc] shadow-2xl overflow-hidden mb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 bg-gradient-to-bl from-[#0C2A4B] to-[#1a3a5c] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-[15px] font-black text-white shadow-inner">
              {initials}
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                إدارة وسماحيات شاشات السايدبار
              </p>
              <p className="mt-0.5 text-lg font-black text-white">{user.name}</p>
              <p className="text-[11px] font-semibold text-white/60" dir="ltr">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Sub-header: role info & stats ──────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-[12px] font-black text-[#0C2A4B]">الدور الحالي:</span>
              <Badge cls="bg-[#0C2A4B]/10 text-[#0C2A4B] ring-[#0C2A4B]/20">{roleLabelAr}</Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-slate-400" />
              <span className="text-[12px] font-black text-[#0C2A4B]">الصلاحيات:</span>
              <span className="text-[12px] font-semibold text-slate-500">
                {permsLoading ? '...' : `${rolePermissions.length} صلاحية`}
              </span>
            </div>
          </div>
          {overridesCount > 0 && (
            <Badge cls="bg-amber-50 text-amber-700 ring-amber-200">
              {overridesCount} تخصيص مخصص
            </Badge>
          )}
        </div>

        {/* ── Global Toolbar: Search & Global Batch Buttons ────────────── */}
        <div className="space-y-3 bg-slate-100/70 p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن اسم الشاشة أو المسار..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-10 pl-9 text-[12px] font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={handleGrantAll}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                منح الجميع
              </button>
              <button
                type="button"
                onClick={handleDenyAll}
                className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
              >
                <XCircle className="h-3.5 w-3.5" />
                حجب الجميع
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                الافتراضي
              </button>
            </div>
          </div>
        </div>

        {/* ── Role Permissions Quick Badges Summary ────────────────────── */}
        {!permsLoading && rolePermissions.length > 0 && (
          <div className="mx-6 mt-3 rounded-2xl border border-[#0077B6]/20 bg-[#0077B6]/[0.04] px-4 py-2.5">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-[#0077B6]">
              الصلاحيات التقنية الممنوحة للدور ({roleLabelAr})
            </p>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {rolePermissions.map((perm) => (
                <span
                  key={perm}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200"
                >
                  <Check className="h-2.5 w-2.5 text-emerald-500" />
                  {perm}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Pages Access Catalog List ─────────────────────────────────── */}
        <div className="space-y-3 p-6">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-black text-[#0C2A4B]">
              جميع شاشات وأزرار السايدبار ({ALL_SITE_PAGES.length} شاشة)
            </p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span className="h-2 w-2 rounded-full bg-[#0077B6]" />
                افتراضي
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                مضاف
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                محجوب
              </span>
            </div>
          </div>

          <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
            {SITE_PAGES_CATALOG.map((group) => (
              <GroupAccordion
                key={group.id}
                groupId={group.id}
                titleAr={group.titleAr}
                pages={group.pages}
                roleSlug={roleSlug}
                allowSet={allowSet}
                denySet={denySet}
                searchQuery={searchQuery}
                onToggle={handleToggle}
                onGrantGroup={handleGrantGroup}
                onDenyGroup={handleDenyGroup}
                onResetGroup={handleResetGroup}
              />
            ))}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-black text-rose-700 transition hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" />
            حذف كافة التخصيصات
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-black text-slate-600 transition hover:border-slate-300"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-[12px] font-black text-white shadow transition ${
                saved
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-[#0077B6] hover:opacity-90'
              }`}
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  تم الحفظ بنجاح
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  حفظ الصلاحيات المخصصة
                </>
              )}
            </button>
          </div>
        </div>

        {/* Context badge icon */}
        <div className="pointer-events-none absolute -top-3 end-6 hidden sm:block">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0077B6] shadow-lg text-white">
            <Lock className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
