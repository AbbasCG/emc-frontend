import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ClipboardList,
  Clock3,
  Filter,
  History,
  Network,
  RefreshCw,
  Search,
  UserCircle2,
} from 'lucide-react'
import { fetchAdminAuditLogs, type AdminAuditLogQuery } from '@/api/adminAuditLogsApi'
import { getApiErrorMessage } from '@/api/apiErrors'
import type { AdminAuditLogEntry } from '@/types/adminAudit'
import { EnterpriseCrudHero } from '@/pages/super-admin/crud/shared/enterprise/EnterpriseMetrics'
import {
  SaGlassCard,
  SaPageRoot,
  SaStatChip,
} from '@/pages/super-admin/crud/shared/SuperAdminPrimitives'
import { CrudBadge } from '@/pages/super-admin/crud/shared/Badge'
import { CrudDrawer } from '@/pages/super-admin/crud/shared/CrudDrawer'
import { LoadingPanel, EmptyPanel, ErrorPanel } from '@/pages/super-admin/crud/shared/States'
import { CrudFilterBar, MiniSelect } from '@/pages/super-admin/crud/shared/FilterBar'

const ACTION_FILTER = [
  { value: 'all', labelAr: 'كل العمليات' },
  { value: 'created', labelAr: 'إنشاء' },
  { value: 'updated', labelAr: 'تعديل' },
  { value: 'deleted', labelAr: 'حذف' },
  { value: 'status_changed', labelAr: 'تغيير حالة' },
  { value: 'role_changed', labelAr: 'تغيير دور' },
  { value: 'approved', labelAr: 'قبول' },
  { value: 'rejected', labelAr: 'رفض' },
] as const

type BadgeTheme = keyof typeof BADGE_THEME

const BADGE_THEME = {
  create: 'border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-100',
  update: 'border-customBlue/30 bg-brand-50 text-deepBlue ring-brand-100',
  delete: 'border-red-200 bg-red-50 text-red-900 ring-red-100',
  status: 'border-amber-200 bg-amber-50 text-amber-950 ring-amber-100',
  role: 'border-violet-200 bg-violet-50 text-violet-950 ring-violet-100',
  approve: 'border-teal-200 bg-teal-50 text-teal-950 ring-teal-50',
  reject: 'border-rose-200 bg-rose-50 text-rose-950 ring-rose-100',
  neutral: 'border-slate-200 bg-slate-50 text-slate-800 ring-slate-100',
}

const RAIL_ACCENT: Record<BadgeTheme, string> = {
  create: 'bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.42)]',
  update: 'bg-[#2691C2] shadow-[0_0_18px_rgba(38,145,194,0.38)]',
  delete: 'bg-red-600 shadow-[0_0_18px_rgba(220,38,38,0.35)]',
  status: 'bg-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.4)]',
  role: 'bg-violet-500 shadow-[0_0_18px_rgba(139,92,246,0.4)]',
  approve: 'bg-teal-500 shadow-[0_0_18px_rgba(20,184,166,0.35)]',
  reject: 'bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.35)]',
  neutral: 'bg-slate-600 shadow-[0_0_18px_rgba(71,85,105,0.25)]',
}

function resolveActionBadge(entry: AdminAuditLogEntry): { labelAr: string; theme: BadgeTheme } {
  const raw = `${entry.action}`.toLowerCase().replace(/\s+/g, '_')

  const createHit = /\b(create|created|insert|store)\b/.test(raw) || raw.includes('إنشاء')
  const deleteHit = /\b(delete|destroy|removed)\b/.test(raw) || raw.includes('حذف')
  const updateHit =
    /\b(update|patch|edited|modify)\b/.test(raw) && !/\b(role|status)\b/.test(raw)
  const statusHit =
    /\b(status|suspend|activate|approve|confirmation|lifecycle)\b/.test(raw) ||
    raw.includes('حالة')
  const roleHit = /\b(role|permission)\b/.test(raw) || raw.includes('دور')
  const approveHit = /\b(approve|accept|accepted|confirm)\b/.test(raw) || raw.includes('قبول')
  const rejectHit = /\b(reject|deny|declin)\b/.test(raw) || raw.includes('رفض')

  const priority: Array<{ ok: boolean; label: string; theme: BadgeTheme }> = [
    { ok: approveHit && !rejectHit, label: 'قبول', theme: 'approve' },
    { ok: rejectHit, label: 'رفض', theme: 'reject' },
    { ok: roleHit, label: 'تغيير دور', theme: 'role' },
    { ok: statusHit && !approveHit && !rejectHit, label: 'تغيير حالة', theme: 'status' },
    { ok: createHit && !deleteHit, label: 'إنشاء', theme: 'create' },
    { ok: deleteHit, label: 'حذف', theme: 'delete' },
    { ok: updateHit, label: 'تعديل', theme: 'update' },
  ]

  const hit = priority.find((p) => p.ok)
  if (hit)
    return {
      labelAr: hit.label,
      theme: hit.theme,
    }

  const pretty = `${entry.action}`.replace(/[_-]+/g, ' ')
  return { labelAr: pretty || 'حدث غير مصنَّف', theme: 'neutral' }
}

function formatJsonHuman(v: unknown): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v) as unknown
      return JSON.stringify(parsed, null, 2)
    } catch {
      return v
    }
  }
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

function fmtWhen(iso: string) {
  if (!iso || iso === '—') return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(d)
}

export default function SuperAdminAuditLogsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([])
  const [action, setAction] = useState<string>('all')
  const [actor, setActor] = useState('')
  const [actorRole, setActorRole] = useState('')
  const [entityType, setEntityType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [q, setQ] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drawerEntry, setDrawerEntry] = useState<AdminAuditLogEntry | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const query: AdminAuditLogQuery = {
      action:
        action === 'all'
          ? undefined
          : ['created', 'updated', 'deleted', 'approved', 'rejected'].includes(action)
            ? action
          : `${action}`,
      actor: actor.trim() || undefined,
      actor_role: actorRole.trim() || undefined,
      entity_type: entityType.trim() || undefined,
      from: fromDate.trim() || undefined,
      to: toDate.trim() || undefined,
    }

    try {
      const rows = await fetchAdminAuditLogs(query)
      setEntries(rows)
    } catch (e) {
      setEntries([])
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [action, actor, actorRole, entityType, fromDate, toDate])

  useEffect(() => {
    void load()
    // Mount-only bootstrap — لتجنُّب إطلاق شبكة بعد كل ضغطة مفتاح في البحث المحلي فقط.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fuzzyFiltered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return entries
    return entries.filter((e) => {
      const blob =
        `${e.actor_name} ${e.actor_role} ${e.action} ${e.entity_type} ${e.entity_label}`.toLowerCase()
      return blob.includes(t)
    })
  }, [entries, q])

  const badgePatternCount = useMemo(
    () => new Set(fuzzyFiltered.map((e) => resolveActionBadge(e).labelAr)).size,
    [fuzzyFiltered],
  )

  return (
    <SaPageRoot className="space-y-8 pb-16">
      <EnterpriseCrudHero
        eyebrow="Operational audit · GET /admin/audit-logs"
        title="سجل التغييرات"
        subtitle="تتبع من قام بإنشاء أو تعديل أو حذف البيانات داخل منصة EMC، مع حقول شبكة، وتفاصيل IP، وحِزم قبل/بعد عند توفرها."
        variant="navy"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-[18px] border border-white/25 bg-white/95 px-4 py-2.5 text-[12px] font-black text-deepBlue shadow backdrop-blur-md"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            تحديث
          </button>
        }
      />

      <SaGlassCard className="relative overflow-hidden border border-white/70 p-6 text-right" glow="blue">
        <div className="absolute -start-20 top-10 h-32 w-32 rounded-full bg-customBlue/10 blur-[80px]" aria-hidden />
        <div className="relative grid gap-4 sm:grid-cols-4">
          <SaStatChip label="أحداث مُحمّلة" value={entries.length} tone="blue" />
          <SaStatChip label="بعد التصفية اليدوية للبحث العام" value={fuzzyFiltered.length} tone="orange" />
          <SaStatChip label="أنماط أحداث مرئية الآن" value={badgePatternCount} tone="success" />
          <SaStatChip label="مزامنة" value={loading ? '…' : 'جاهزة'} tone="ink" />
        </div>
      </SaGlassCard>

      <motion.div layout className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-right rtl:text-right">
          <Filter className="h-4 w-4 text-customBlue" aria-hidden />
          <span className="text-[11px] font-black uppercase tracking-wide text-muted-600 font-latin">Filters</span>
        </div>

        <CrudFilterBar
          searchValue={q}
          onSearchChange={(v) => setQ(v)}
          searchPlaceholder="بحث شامل في الفاعل، الدور، الحدث أو الكيان…"
        />

        <div className="grid gap-4 rounded-[22px] border border-ink-100 bg-white p-5 shadow-inner sm:grid-cols-2 xl:grid-cols-6">
          <MiniSelect label="نوع العملية" value={action} onChange={(v) => setAction(v)} options={[...ACTION_FILTER]} />

          <label className="flex flex-col gap-2 text-right">
            <span className="text-[10px] font-black uppercase tracking-wide text-muted-500 font-latin">
              اسم المستخدم
            </span>
            <span className="relative">
              <UserCircle2 className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-400" aria-hidden />
              <input
                dir="rtl"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="مثال — أحد أعضاء العمليات"
                className="w-full rounded-2xl border border-ink-100 bg-slate-50/70 py-2.5 ps-10 pe-3 text-[12px] font-bold text-deepBlue outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-400/20"
              />
            </span>
          </label>

          <label className="flex flex-col gap-2 text-right">
            <span className="text-[10px] font-black uppercase tracking-wide text-muted-500 font-latin">
              دور الفاعل
            </span>
            <input
              dir="rtl"
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value)}
              placeholder="مثال — admin أو finance_manager"
              className="w-full rounded-2xl border border-ink-100 bg-slate-50/70 py-2.5 px-3 text-[12px] font-bold text-deepBlue outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-400/20"
            />
          </label>

          <label className="flex flex-col gap-2 text-right xl:col-span-2">
            <span className="text-[10px] font-black uppercase tracking-wide text-muted-500 font-latin">
              نوع الكيان
            </span>
            <input
              dir="rtl"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="مثال — User أو Course"
              className="w-full rounded-2xl border border-ink-100 bg-slate-50/70 py-2.5 px-3 text-[12px] font-bold text-deepBlue outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-400/20"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2 xl:col-span-1">
            <label className="flex flex-col gap-2 text-right">
              <span className="text-[10px] font-black uppercase tracking-wide text-muted-500 font-latin">من تاريخ</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-2xl border border-ink-100 bg-white py-2.5 px-2 text-[12px] font-bold text-deepBlue"
              />
            </label>
            <label className="flex flex-col gap-2 text-right">
              <span className="text-[10px] font-black uppercase tracking-wide text-muted-500 font-latin">إلى تاريخ</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-2xl border border-ink-100 bg-white py-2.5 px-2 text-[12px] font-bold text-deepBlue"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#2691C2] px-5 py-2.5 text-[12px] font-black text-white shadow-md transition hover:bg-[#1e7eab]"
          >
            <Search className="h-4 w-4" aria-hidden />
            تطبيق الفلاتر
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setActor('')
              setActorRole('')
              setEntityType('')
              setAction('all')
              setFromDate('')
              setToDate('')
              setQ('')
            }}
            className="rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-[12px] font-black text-muted-700 shadow-sm"
          >
            إعادة تهيئة
          </button>
        </div>
      </motion.div>

      {error ?
        <ErrorPanel title="تعذر تحميل سجل التغييرات" hint={error} />
      : loading && !entries.length ?
        <LoadingPanel />
      : !loading && fuzzyFiltered.length === 0 ?
        <EmptyPanel
          title="لا توجد تغييرات مسجلة حاليًا"
          subtitle="لم نجد أي سجلات تطابق التصفية حاليًا؛ خفِّف المرشّحات أو تأكّد أنّ الخلفية تعيد بيانات GET /admin/audit-logs."
        />
      :
        <>
          {/* Timeline rail */}
          <div dir="rtl" className="relative isolate space-y-4">
            <div aria-hidden className="pointer-events-none absolute end-[15px] top-10 bottom-0 w-px bg-gradient-to-b from-customBlue/55 via-accent-400/55 to-transparent" />

            <AnimatePresence mode="popLayout">
              {fuzzyFiltered.map((e, idx) => {
                const badge = resolveActionBadge(e)
                const expanded = expandedId === `${e.id}`
                const pill = BADGE_THEME[badge.theme] ?? BADGE_THEME.neutral
                const rail = RAIL_ACCENT[badge.theme] ?? RAIL_ACCENT.neutral

                return (
                  <Fragment key={`${String(e.id)}-${String(idx)}`}>
                    <motion.article
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                      className="relative mr-11 rounded-[24px] border border-white bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.45)]"
                    >
                      <span
                        aria-hidden
                        className={`absolute top-10 -end-[5px] z-[1] h-11 w-1 rounded-full ring-4 ring-white/95 ${rail}`}
                      />
                      <div className="flex w-full flex-col gap-4 p-6 text-right sm:flex-row sm:items-stretch">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 flex-col gap-2 text-end transition hover:bg-brand-50/[0.35]"
                          onClick={() => setExpandedId(expanded ? null : `${e.id}`)}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <History className="h-5 w-5 text-customBlue" aria-hidden />
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide shadow-sm ring-1 ${pill}`}
                            >
                              {badge.labelAr}
                            </span>
                            <span className="text-[13px] font-black text-deepBlue">{fmtWhen(e.created_at)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[13px] font-black text-deepBlue">{e.actor_name}</p>
                            <CrudBadge variant="brand">{e.actor_role || 'دور غير مُصدَر'}</CrudBadge>
                            <ClipboardList className="h-4 w-4 text-muted-400 sm:ms-auto" aria-hidden />
                            <CrudBadge variant="accent">{e.entity_type}</CrudBadge>
                          </div>
                          <p className="truncate text-[12px] font-semibold leading-relaxed text-muted-700 rtl:text-right">
                            {e.entity_label}
                          </p>
                          <div className="flex flex-wrap gap-4 text-[11px] font-bold text-muted-500">
                            <span className="inline-flex items-center gap-2">
                              <Network className="h-4 w-4 opacity-65" aria-hidden />
                              IP:{' '}
                              <span dir="ltr" className="font-mono font-black text-muted-900">
                                {e.ip_address ?? '—'}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-2 truncate">
                              <Clock3 className="h-4 w-4 shrink-0 opacity-65" aria-hidden />
                              <span dir="ltr" className="truncate">
                                {e.user_agent_summary}
                              </span>
                            </span>
                          </div>
                        </button>
                        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-40">
                          <button
                            type="button"
                            className="rounded-2xl border border-ink-100 bg-deepBlue/[0.02] px-4 py-2 text-[11px] font-black text-deepBlue transition hover:border-customBlue hover:bg-brand-50"
                            onClick={() => setDrawerEntry(e)}
                          >
                            تفاصيل كاملة
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : `${e.id}`)}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-ink-100 py-2 text-[11px] font-black text-muted-600 transition hover:border-customBlue/40 hover:bg-white"
                          >
                            <motion.span animate={{ rotate: expanded ? 180 : 0 }} aria-hidden transition={{ duration: 0.22 }}>
                              ↓
                            </motion.span>
                            {expanded ? 'طي القراءة السريعة' : 'توسعة القيم'}
                          </button>
                        </div>
                      </div>
                      <AnimatePresence initial={false}>
                        {expanded ?
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-ink-50 bg-gradient-to-bl from-deepBlue/[0.02] to-white"
                          >
                            <div className="grid gap-4 p-6 text-right lg:grid-cols-2">
                              <SaGlassCard className="p-4 shadow-none" glow="none">
                                <p className="text-[11px] font-black text-deepBlue">المحتوى السابق</p>
                                <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-deepBlue/[0.04] p-3 text-start text-[11px] font-mono leading-relaxed text-muted-800">
                                  {formatJsonHuman(e.old_values)}
                                </pre>
                              </SaGlassCard>
                              <SaGlassCard className="p-4 shadow-none" glow="none">
                                <p className="text-[11px] font-black text-deepBlue">المحتوى اللاحق</p>
                                <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-emerald-50/60 p-3 text-start text-[11px] font-mono leading-relaxed text-emerald-950">
                                  {formatJsonHuman(e.new_values)}
                                </pre>
                              </SaGlassCard>
                            </div>
                          </motion.div>
                        : null}
                      </AnimatePresence>
                    </motion.article>
                  </Fragment>
                )
              })}
            </AnimatePresence>
          </div>
        </>
      }

      <SaGlassCard className="border-dashed border-accent-400/40 bg-accent-400/[0.04] p-5 text-[12px] font-semibold text-muted-800" glow="orange">
        <p className="text-right rtl:text-right">
          يتم إخفاء أحداث <strong className="text-deepBlue">محاكاة الدخول (impersonation)</strong> آلياً من هذا السجل
          التشغيلي وفق سياسات الأمان — إن ظهر أي حدث، أبلِغ الخلفية بضبط مُصدِر الطبقة.
        </p>
      </SaGlassCard>

      <CrudDrawer
        open={drawerEntry != null}
        onClose={() => setDrawerEntry(null)}
        title="تأشير تنفيذي مفصل"
        subtitle={`${drawerEntry ? fmtWhen(drawerEntry.created_at) : ''}`}
        widthClassName="max-w-lg sm:max-w-2xl"
      >
        {drawerEntry ?
          <div dir="rtl" className="space-y-6 text-[12px] font-semibold text-muted-900">
            <div className="grid gap-3 sm:grid-cols-2">
              <SaGlassCard className="p-4 shadow-none ring-1 ring-deepBlue/[0.05]" glow="blue">
                <p className="text-[11px] font-black uppercase text-muted-600 font-latin">Actor</p>
                <p className="mt-1 text-lg font-black text-deepBlue">{drawerEntry.actor_name}</p>
                <p className="text-[13px] text-muted-700">{drawerEntry.actor_role || '— دور غير ظاهر'}</p>
              </SaGlassCard>
              <SaGlassCard className="p-4 shadow-none ring-1 ring-accent-400/12" glow="orange">
                <p className="text-[11px] font-black uppercase text-muted-600 font-latin">Action</p>
                <p className="mt-2 text-xl font-black text-accent-950">{`${drawerEntry.action}`}</p>
              </SaGlassCard>
            </div>
            <SaGlassCard className="space-y-2 p-5 shadow-inner" glow="blue">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[11px] font-black ${BADGE_THEME[resolveActionBadge(drawerEntry).theme] ?? BADGE_THEME.neutral}`}>
                  {resolveActionBadge(drawerEntry).labelAr}
                </span>
              </div>
              <p className="text-[13px] font-black text-deepBlue">
                نوع الكيان: <span>{drawerEntry.entity_type}</span>
              </p>
              <p className="text-[12px] text-muted-800">{drawerEntry.entity_label}</p>
            </SaGlassCard>
            <div className="grid gap-3 sm:grid-cols-2">
              <SaGlassCard className="space-y-1 p-4 shadow-inner" glow="orange">
                <p className="text-[11px] font-black text-deepBlue">IPv4/v6 ظاهرة</p>
                <code dir="ltr" className="block text-[13px] font-bold text-muted-950">
                  {drawerEntry.ip_address ?? '—'}
                </code>
              </SaGlassCard>
              <SaGlassCard className="space-y-1 p-4 shadow-inner" glow="orange">
                <p className="text-[11px] font-black text-deepBlue">تلخيص وكيل المستخدم</p>
                <p dir="ltr" className="text-[11px] font-semibold leading-relaxed">
                  {drawerEntry.user_agent_summary}
                </p>
              </SaGlassCard>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-[11px] font-black text-deepBlue">البيانات السابقة</p>
                <pre className="mt-2 max-h-64 overflow-auto rounded-2xl bg-slate-50 p-4 text-start text-[11px] font-mono text-slate-800">
                  {formatJsonHuman(drawerEntry.old_values)}
                </pre>
              </div>
              <div>
                <p className="text-[11px] font-black text-deepBlue">البيانات اللاحقة</p>
                <pre className="mt-2 max-h-64 overflow-auto rounded-2xl bg-emerald-50/80 p-4 text-start text-[11px] font-mono text-emerald-950">
                  {formatJsonHuman(drawerEntry.new_values)}
                </pre>
              </div>
            </div>
          </div>
        : null}
      </CrudDrawer>
    </SaPageRoot>
  )
}
