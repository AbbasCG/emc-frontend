import { AlertTriangle, Check, Lock, ShieldCheck } from 'lucide-react'
import type { PageAccessRiskLevel } from '@/api/pageAccessCatalogApi'
import type { PageAccessSource } from '@/api/accessControlApi'
import { cn } from '@/lib/utils'

/**
 * Explanatory badges for the Access Control UI.
 *
 * PAGE ACCESS != BUSINESS AUTHORIZATION, and these badges are PRESENTATION
 * ONLY. They never gate anything: the backend decides what is eligible and
 * rejects everything else, so a badge being wrong could never widen access.
 *
 * Every badge pairs its colour with an icon and Arabic text, so a state is
 * never conveyed by colour alone (accessibility).
 */

const RISK_META: Record<
  PageAccessRiskLevel,
  { labelAr: string; cls: string; Icon: React.ElementType; hintAr: string }
> = {
  SYSTEM_PROTECTED: {
    labelAr: 'محمية من النظام',
    cls: 'bg-rose-50 text-rose-700 ring-rose-200',
    Icon: Lock,
    hintAr: 'لا يمكن منحها عبر الأدوار أو الإدارات أو الاستثناءات — تُدار بصلاحيات النظام.',
  },
  ADMIN_ONLY: {
    labelAr: 'إدارية',
    cls: 'bg-amber-50 text-amber-800 ring-amber-200',
    Icon: AlertTriangle,
    hintAr: 'صفحة إدارية — تُمنح بحذر.',
  },
  SAFE_DELEGATABLE: {
    labelAr: 'قابلة للتفويض',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Icon: Check,
    hintAr: 'آمنة للتفويض ضمن الإدارة.',
  },
}

export function RiskBadge({ riskLevel, className }: { riskLevel: PageAccessRiskLevel; className?: string }) {
  const meta = RISK_META[riskLevel] ?? RISK_META.ADMIN_ONLY
  const { Icon } = meta
  return (
    <span
      title={meta.hintAr}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ring-1',
        meta.cls,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {meta.labelAr}
    </span>
  )
}

export function riskLabelAr(riskLevel: PageAccessRiskLevel): string {
  return (RISK_META[riskLevel] ?? RISK_META.ADMIN_ONLY).labelAr
}

/**
 * Provenance badge — WHY a user has (or does not have) a page.
 *
 * The Arabic wording comes from the backend resolver (`primary_source_label_ar`)
 * whenever it is supplied; the map below is only a styling lookup plus a
 * fallback, so provenance is never recomputed client-side.
 */
const SOURCE_STYLE: Record<PageAccessSource, { cls: string; fallbackAr: string }> = {
  root_authority:    { cls: 'bg-[#0C2A4B] text-white ring-[#0C2A4B]/30', fallbackAr: 'صلاحية النظام الكاملة' },
  system_protected:  { cls: 'bg-rose-50 text-rose-700 ring-rose-200', fallbackAr: 'محمية من النظام' },
  user_deny:         { cls: 'bg-rose-100 text-rose-800 ring-rose-300', fallbackAr: 'محجوبة بشكل خاص' },
  user_allow:        { cls: 'bg-violet-50 text-violet-700 ring-violet-200', fallbackAr: 'إضافة خاصة' },
  department_leader: { cls: 'bg-sky-50 text-sky-700 ring-sky-200', fallbackAr: 'لأنه قائد الإدارة' },
  department_member: { cls: 'bg-teal-50 text-teal-700 ring-teal-200', fallbackAr: 'من الإدارة' },
  role:              { cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200', fallbackAr: 'من الدور' },
  authenticated_baseline: { cls: 'bg-slate-100 text-slate-700 ring-slate-300', fallbackAr: 'متاح لجميع المستخدمين المسجلين' },
  none:              { cls: 'bg-slate-100 text-slate-500 ring-slate-200', fallbackAr: 'لا يوجد مصدر' },
}

export function AccessSourceBadge({
  source,
  labelAr,
  className,
}: {
  source: PageAccessSource
  /** Backend-supplied label. Preferred over the local fallback whenever present. */
  labelAr?: string
  className?: string
}) {
  const style = SOURCE_STYLE[source] ?? SOURCE_STYLE.none
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ring-1',
        style.cls,
        className,
      )}
    >
      {source === 'root_authority' || source === 'system_protected' ?
        <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
      : null}
      {labelAr || style.fallbackAr}
    </span>
  )
}

/**
 * The standing notice shown wherever a protected capability or a protected
 * identity appears, so the UI never implies these are managed by the mutable
 * page-default/override tables.
 */
export function ProtectedAuthorityNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      className="flex items-start gap-2 rounded-2xl border border-rose-200/80 bg-rose-50/60 px-3 py-2.5 text-right"
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
      <p className="text-[11px] font-bold leading-relaxed text-rose-900">
        {children ?? 'وصول محمي — يُدار بواسطة صلاحيات النظام ولا يمكن تعديله من هنا.'}
      </p>
    </div>
  )
}

/** The standing reminder that this screen controls page exposure, not business permissions. */
export function PageAccessScopeNotice({ className }: { className?: string }) {
  return (
    <p
      dir="rtl"
      className={cn(
        'rounded-2xl border border-ink-100 bg-slate-50/80 px-3 py-2.5 text-[11px] font-bold leading-relaxed text-muted-600 rtl:text-right',
        className,
      )}
    >
      يتحكم هذا القسم في <strong className="text-deepBlue">ظهور الصفحات والوصول إليها</strong> فقط. أما الإجراءات
      داخل الصفحة (الإنشاء والتعديل والاعتماد والحذف) فتبقى محكومة بالصلاحيات والسياسات في الخادم ولا تتأثر بهذه
      الإعدادات.
    </p>
  )
}
