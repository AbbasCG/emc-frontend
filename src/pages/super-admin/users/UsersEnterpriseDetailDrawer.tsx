import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AdminManagedUser } from '@/api/adminUsersApi'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { EmptyPanel } from '@/pages/super-admin/crud/shared/States'
import { CrudDrawer } from '@/pages/super-admin/crud/shared/CrudDrawer'
import { initialsFromName } from '@/pages/super-admin/crud/shared/initials'
import {
  CAPABILITIES,
  ROLE_CAPABILITY_HINTS_AR,
  roleHasCapabilitySlug,
} from '@/pages/super-admin/users/roleScopeHints'
import { adminRoleLabelAr } from '@/pages/super-admin/users/assignableRoles'
import { normalizeRole } from '@/utils/dashboardAccess'
import { cn } from '@/lib/utils'
import { AR_UNSPECIFIED } from '@/utils/dispAr'

const TABS = [
  { id: 'general', label: 'البيانات العامة' },
  { id: 'permissions', label: 'مجالات الصلاحية' },
  { id: 'activity', label: 'النشاط' },
  { id: 'courses', label: 'الدورات' },
  { id: 'registrations', label: 'التسجيلات' },
  { id: 'finance', label: 'المحفظة' },
  { id: 'notifications', label: 'الإشعارات' },
  { id: 'sessions', label: 'الجلسات' },
] as const

type TabId = (typeof TABS)[number]['id']

function fieldOrUnset(s?: string | null): string {
  if (s == null || String(s).trim() === '') return AR_UNSPECIFIED
  return String(s).trim()
}

function fmtDate(raw?: string | null): string {
  if (!raw || String(raw).trim() === '') return AR_UNSPECIFIED
  const d = Date.parse(String(raw))
  if (!Number.isFinite(d)) return String(raw).slice(0, 19)
  const opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
  if (String(raw).includes('T')) opts.timeStyle = 'short'
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', opts).format(new Date(d))
}

function ApiVacantNotice({ title }: { title: string }) {
  return (
    <EmptyPanel
      title={title}
      subtitle="لا تُحمَّل هذه البيانات ضمن نقطة مستخدمي الإدارة الحالية؛ يمكن ربط واجهة خاصّة من الخادم دون ابتكار أرقام وهمية."
    />
  )
}

export function UsersEnterpriseDetailDrawer({
  open,
  user,
  onClose,
  onEdit,
}: {
  open: boolean
  user: AdminManagedUser | null
  onClose: () => void
  onEdit: (id: number) => void
}) {
  const [tab, setTab] = useState<TabId>('general')

  const role = user?.role
  const slug = useMemo(() => (role ? normalizeRole(role) : '') || '', [role])

  const permissionChips = useMemo(() => {
    if (!slug) return []
    return CAPABILITIES.filter((c) => roleHasCapabilitySlug(slug, c.id)).map((c) => ({
      id: c.id,
      label: c.labelAr,
      hint: ROLE_CAPABILITY_HINTS_AR[c.id],
    }))
  }, [slug])

  const timeline = useMemo(() => {
    if (!user) return []
    const events: { t: string; label: string; detail: string }[] = []
    if (user.created_at) events.push({ t: user.created_at, label: 'إنشاء السجل', detail: 'مسجّل في دليل المنصّة' })
    if (user.updated_at && user.updated_at !== user.created_at)
      events.push({ t: user.updated_at, label: 'تحديث بيانات', detail: 'تغيّر موثَّق وفق نقطة الإدارة' })
    return events.sort((a, b) => Date.parse(b.t) - Date.parse(a.t))
  }, [user])

  const emailVerifiedTs = !!(user?.email_verified_at && String(user.email_verified_at).trim().length > 0)

  return (
    <CrudDrawer
      open={open && user !== null}
      onClose={onClose}
      widthClassName="max-w-full sm:max-w-4xl lg:max-w-5xl"
      title={user?.name ?? 'مستخدم'}
      subtitle={user ? `${user.email} · EMC-ID #${user.id}` : undefined}
      footerSlot={
        user ?
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onEdit(user.id)}
              className="flex-1 rounded-2xl bg-gradient-to-l from-[#0077B6] to-[#0C2A4B] px-4 py-2.5 text-[12px] font-black text-white shadow-md"
            >
              فتح تحرير سريع
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[12px] font-black text-deepBlue"
            >
              إغلاق
            </button>
          </div>
        : null
      }
    >
      {!user ?
        null
      : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,240px)_1fr]">
          <aside className="space-y-3 rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-inner ring-1 ring-ink-100/70">
            <div className="flex flex-col items-center gap-3 text-center">
              {user.avatar_url ?
                <span className="relative grid h-[4.75rem] w-[4.75rem] place-items-center overflow-hidden rounded-[22px] ring-4 ring-white/80 shadow-[0_12px_32px_-8px_rgba(0,119,182,0.55)]">
                  <img src={user.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                </span>
              : <span className="grid h-[4.75rem] w-[4.75rem] place-items-center rounded-[22px] bg-gradient-to-br from-[#0077B6] to-[#0C2A4B] text-lg font-black text-white shadow-[0_12px_32px_-8px_rgba(0,119,182,0.55)] ring-4 ring-white/80">
                  {initialsFromName(user.name)}
                </span>
              }
              <div>
                <p className="text-[13px] font-black text-deepBlue">{fieldOrUnset(user.name)}</p>
                <p className="mt-1 text-[11px] font-bold text-muted-600">معرّف داخلي #{user.id}</p>
              </div>
            </div>
            <div className="space-y-2 border-t border-ink-100/80 pt-3 text-[12px] font-bold rtl:text-right">
              <Row label="الدور" val={<CrudBadge variant="brand">{adminRoleLabelAr(user.role)}</CrudBadge>} />
              <Row label="القسم / الإدارة" val={fieldOrUnset(user.department)} muted />
              <Row label="الحالة الحسابية" val={statusLabel(user)} />
              <Row
                label="تأكيد البريد"
                val={emailVerifiedTs ? <>موثّق ({fmtDate(user.email_verified_at)})</> : 'غير موثّق'}
                muted={!emailVerifiedTs}
              />
            </div>
          </aside>

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap gap-1 rounded-2xl border border-ink-100 bg-slate-50/70 p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-[11px] font-black transition rtl:text-right',
                    tab === t.id ?
                      'bg-white text-deepBlue shadow-sm ring-1 ring-ink-100'
                    : 'text-muted-600 hover:text-deepBlue',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'general' ?
              <div className="rounded-[22px] border border-white/85 bg-white/90 p-4 shadow-sm ring-1 ring-ink-100/65">
                <dl className="grid gap-3 text-[12px] font-bold sm:grid-cols-2 rtl:text-right">
                  <Kv k="معرّف داخلي" v={String(user.id)} />
                  <Kv k="الاسم الكامل" v={fieldOrUnset(user.name)} />
                  <Kv k="البريد" v={fieldOrUnset(user.email)} />
                  <Kv k="الجوال" v={fieldOrUnset(user.phone)} />
                  <Kv k="المدينة" v={fieldOrUnset(user.city)} />
                  <Kv k="الدولة" v={fieldOrUnset(user.country)} />
                  <Kv k="مصدر المعرفة بالمنصّة" v={fieldOrUnset(user.how_did_you_hear_about_us)} />
                  <Kv k="الحالة الحسابية" v={statusLabel(user)} />
                  <Kv
                    k="تأكيد البريد"
                    v={
 emailVerifiedTs ? `موثّق ${fmtDate(user.email_verified_at)}`: 'غير موثّق'
                    }
                  />
                  <Kv k="مسجّل في" v={fmtDate(user.created_at)} />
                  <Kv k="آخر تحديث للسجلّ" v={fmtDate(user.updated_at)} />
                  <Kv k="آخر دخول" v={user.last_login_at ? fmtDate(user.last_login_at) : AR_UNSPECIFIED} />
                  {user.related_student_note ?
                    <Kv k="ارتباط طالب" v={fieldOrUnset(user.related_student_note)} />
                  : null}
                  {user.related_instructor_note ?
                    <Kv k="ارتباط مدرب" v={fieldOrUnset(user.related_instructor_note)} />
                  : null}
                </dl>
              </div>
            : tab === 'permissions' ?
              <div className="rounded-[22px] border border-white/85 bg-white/90 p-4 shadow-sm ring-1 ring-ink-100/65">
                <p className="text-[11px] font-black text-muted-600 rtl:text-right">
                  ملخص مبني على قالب الأدوار الظاهري السياسة النهائية تبقى في Laravel Policies.
                </p>
                {!permissionChips.length ?
                  <p className="mt-3 text-[12px] font-semibold text-muted-700 rtl:text-right">لا تعريف لهذا الدور ضمن شبكة الصلاحيات.</p>
                : (
                  <ul className="mt-4 grid gap-2">
                    {permissionChips.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-2xl border border-brand-400/25 bg-brand-400/10 px-3 py-2.5 rtl:text-right"
                      >
                        <span className="text-[13px] font-black text-deepBlue">{p.label}</span>
                        <p className="mt-1 text-[11px] font-semibold text-muted-600">{p.hint}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            : tab === 'activity' ?
              <div className="rounded-[22px] border border-white/85 bg-white/90 p-4 shadow-sm ring-1 ring-ink-100/65">
                {!timeline.length ?
                  <p className="text-[13px] font-semibold text-muted-700 rtl:text-right">لا تماثيل زمنية إضافية من التواريخ المتاحة.</p>
                : (
                  <ul className="relative space-y-4 border-r-2 border-customBlue/20 pe-6 rtl:border-r-0 rtl:border-l rtl:pe-0 rtl:ps-6">
                    {timeline.map((e) => (
                      <li key={`${e.t}-${e.label}`} className="relative text-right rtl:text-right">
                        <span className="absolute -start-[25px] top-2 h-2.5 w-2.5 rounded-full bg-[#0077B6] ring-4 ring-white rtl:-start-auto rtl:end-[-25px]" />
                        <p className="text-[13px] font-black text-deepBlue">{e.label}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-muted-600">{e.detail}</p>
                        <time className="mt-1 block text-[11px] font-bold text-accent-900">{fmtDate(e.t)}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            : tab === 'courses' ?
              <ApiVacantNotice title="لا يوجد تكامل LMS في هذه الواجهة الآن." />
            : tab === 'registrations' ?
              <ApiVacantNotice title="سجل التسجيلات لم يُربَط بعد." />
            : tab === 'finance' ?
              <ApiVacantNotice title="نشاط المحفظة غير مستورد." />
            : tab === 'notifications' ?
              <ApiVacantNotice title="تفضيلات الإشعارات غير مُحمّلة لكل مستخدم." />
            :
              <ApiVacantNotice title="الجلسات والأجهزة غير مستوردة لهذا المستخدم." />}
          </div>
        </div>
      )}
    </CrudDrawer>
  )
}

function Row({ label, val, muted }: { label: string; val: ReactNode; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-ink-100/55 pb-2 last:border-none">
      <span className="text-muted-600">{label}</span>
      <span className={cn('rtl:text-right', muted ? 'text-muted-500' : 'text-deepBlue')}>{val}</span>
    </div>
  )
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-ink-100/65 bg-white/95 px-3 py-2.5 rtl:text-right">
      <dt className="text-[10px] font-black uppercase tracking-wide text-muted-500">{k}</dt>
      <dd className="mt-1 break-all text-[12px] font-bold text-deepBlue">{v}</dd>
    </div>
  )
}

function statusLabel(u: AdminManagedUser): string {
  if (u.is_active === false) return 'موقوف'
  if (u.is_active === true) return 'نشط'
  return AR_UNSPECIFIED
}
