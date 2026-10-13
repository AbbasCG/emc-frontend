import { Link } from 'react-router'
import { CheckCircle2, ExternalLink, Lock, XCircle } from 'lucide-react'
import type { CommandCenterSource } from '@/api/executiveCommandCenterApi'
import { usePageAccess } from '@/contexts/PageAccessContext'
import { cn } from '@/lib/utils'
import { SOURCE_META } from './commandCenterUi'

/** Shortcuts shown only to viewers whose own page access allows the destination. */
const QUICK_LINKS: { pageKey: string; label: string; to: string }[] = [
  { pageKey: 'administration.tickets_admin', label: 'لوحة التذاكر', to: '/dashboard/tickets/admin' },
  { pageKey: 'operations.meeting_reports', label: 'تقارير الاجتماعات', to: '/dashboard/operations/meeting-reports' },
  { pageKey: 'finance.manual_payments', label: 'الدفعات اليدوية', to: '/dashboard/finance/manual-payments' },
  { pageKey: 'hr.incoming_requests', label: 'طلبات الاحتياج', to: '/dashboard/hr/incoming-requests' },
  { pageKey: 'administration.email_logs', label: 'سجلات البريد', to: '/dashboard/super-admin/email-logs' },
  { pageKey: 'technical_system.department_dashboards', label: 'لوحات الإدارات', to: '/dashboard/tech-admin/department-dashboards' },
  { pageKey: 'administration.users', label: 'المستخدمون', to: '/dashboard/super-admin/crud/users' },
]

export function CommandCenterSourceHealth({ sources }: { sources: CommandCenterSource[] }) {
  const { canAccessKey } = usePageAccess()
  const links = QUICK_LINKS.filter((l) => canAccessKey(l.pageKey))

  return (
    <aside className="space-y-4" aria-label="حالة المصادر">
      <section className="rounded-3xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm" data-testid="source-health">
        <h3 className="mb-3 text-sm font-black text-deepBlue">حالة المصادر</h3>
        <ul className="space-y-2">
          {sources.map((s) => {
            const Icon = SOURCE_META[s.key].icon
            return (
              <li key={s.key} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50/80 px-3 py-2">
                <span className="flex items-center gap-2 text-xs font-bold text-deepBlue">
                  <Icon size={14} className="text-deepBlue/45" aria-hidden="true" /> {s.label}
                </span>
                <span className={cn('flex items-center gap-1 text-[11px] font-black', s.available ? 'text-emerald-700' : 'text-red-700')}>
                  {s.available ? <CheckCircle2 size={13} aria-hidden="true" /> : <XCircle size={13} aria-hidden="true" />}
                  {s.available ? 'يعمل' : 'غير متاح'}
                </span>
              </li>
            )
          })}
        </ul>
        {sources.some((s) => !s.available) ?
          <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-relaxed text-red-800">
            تعذّر تحميل: {sources.flatMap((s) => s.unavailable).join('، ')}. بقية المصادر تعمل بشكل طبيعي.
          </div>
        : null}
      </section>

      <section className="rounded-3xl border border-deepBlue/[0.07] bg-white p-5 shadow-sm" aria-label="روابط سريعة">
        <h3 className="mb-3 text-sm font-black text-deepBlue">روابط سريعة</h3>
        {links.length === 0 ?
          <p className="flex items-center gap-2 text-xs font-bold text-deepBlue/50">
            <Lock size={13} aria-hidden="true" /> لا توجد صفحات إضافية متاحة لحسابك.
          </p>
        : <ul className="space-y-1.5">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-black text-customBlue transition hover:bg-customBlue/[0.07]">
                  {l.label} <ExternalLink size={12} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>}
      </section>
    </aside>
  )
}
