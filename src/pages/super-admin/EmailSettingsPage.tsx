import { useState, useEffect, useCallback, useMemo } from 'react'
import { Mail, Send, Save, RotateCcw, ChevronDown } from 'lucide-react'
import {
  fetchEmailSettings,
  updateEmailSettings,
  sendTestEmail,
  type EmailSettingsResponse,
} from '@/api/emailAdminApi'
import toast from '@/lib/toast'

/* ── Category order + accents ────────────────────────────────────────────── */

const CATEGORY_ORDER = [
  'applications', 'support', 'courses', 'certificates',
  'users', 'calendar', 'oral_assessment', 'payments',
] as const

const CATEGORY_META: Record<string, { label: string; accent: string }> = {
  applications:     { label: 'الطلبات',         accent: '#8B5CF6' },
  support:          { label: 'الدعم الفني',      accent: '#0077B6' },
  courses:          { label: 'الدورات',          accent: '#0EA5E9' },
  certificates:     { label: 'الشهادات',         accent: '#F28C00' },
  users:            { label: 'المستخدمون',       accent: '#0C2A4B' },
  calendar:         { label: 'التقويم',          accent: '#10B981' },
  oral_assessment:  { label: 'المقابلة الشفوية', accent: '#F43F5E' },
  payments:         { label: 'المدفوعات',        accent: '#059669' },
}

/* ── Toggle ───────────────────────────────────────────────────────────────── */

function Toggle({
  enabled, onChange, disabled, busy,
}: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled || busy}
      onClick={() => onChange(!enabled)}
      className={[
        'relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full',
        'transition-colors duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0077B6]',
        disabled || busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        enabled ? 'bg-[#0077B6]' : 'bg-slate-300',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none absolute h-5 w-5 rounded-full bg-white shadow-md',
          'transition-transform duration-200 ease-out',
          enabled ? 'translate-x-[-27px]' : 'translate-x-[-3px]',
        ].join(' ')}
        style={{ right: 0 }}
      >
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-[#0077B6]" />
          </span>
        )}
      </span>
    </button>
  )
}

/* ── Row ──────────────────────────────────────────────────────────────────── */

type Row = EmailSettingsResponse['settings'][string]

function SettingRow({
  item, enabled, dirty, disabled, onToggle,
}: { item: Row; enabled: boolean; dirty: boolean; disabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div
      className={[
        'flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors',
        dirty ? 'border-amber-300 bg-amber-50/60' : enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/70',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-[13px] font-bold ${enabled ? 'text-[#0C2A4B]' : 'text-slate-400'}`}>{item.label}</p>
          {dirty && (
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-700">
              لم يُحفظ
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{item.description}</p>
        {item.updated_at && (
          <p className="mt-1 text-[10px] font-semibold text-slate-300">
            آخر تعديل: {new Date(item.updated_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
      </div>
      <Toggle enabled={enabled} onChange={onToggle} disabled={disabled} />
    </div>
  )
}

/* ── Category card ────────────────────────────────────────────────────────── */

function CategoryCard({
  categoryKey, items, getEnabled, isDirty, disabled, onToggle,
}: {
  categoryKey: string
  items: Row[]
  getEnabled: (key: string) => boolean
  isDirty: (key: string) => boolean
  disabled: boolean
  onToggle: (key: string, v: boolean) => void
}) {
  const [open, setOpen] = useState(true)
  const meta = CATEGORY_META[categoryKey] ?? { label: categoryKey, accent: '#64748B' }
  const dirtyCount = items.filter((i) => isDirty(i.key)).length
  const enabledCount = items.filter((i) => getEnabled(i.key)).length

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right transition hover:bg-slate-50/60"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.accent }} />
          <span className="text-[14px] font-black text-[#0C2A4B]">{meta.label}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
            {enabledCount}/{items.length} مُفعَّل
          </span>
          {dirtyCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
              {dirtyCount} تغيير غير محفوظ
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-slate-100 p-4">
          {items.map((item) => (
            <SettingRow
              key={item.key}
              item={item}
              enabled={getEnabled(item.key)}
              dirty={isDirty(item.key)}
              disabled={disabled}
              onToggle={(v) => onToggle(item.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function EmailSettingsPage() {
  const [settings, setSettings]     = useState<EmailSettingsResponse | null>(null)
  const [overrides, setOverrides]   = useState<Record<string, boolean>>({})
  const [senderName, setSenderName]   = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [testing, setTesting]       = useState(false)
  const [loadError, setLoadError]   = useState(false)

  /** Re-read after a save — called from a handler, so the synchronous loading flip
   *  is allowed here. */
  const load = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(false)
      const data = await fetchEmailSettings()
      setSettings(data)
      setSenderName(data.sender_name ?? '')
      setSenderEmail(data.sender_email ?? '')
      setOverrides({})
    } catch {
      setLoadError(true)
      toast.error('فشل تحميل إعدادات البريد الإلكتروني')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load — inlined so no state is set on the effect's synchronous path
  // (`loading` already starts as `true`).
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await fetchEmailSettings()
        if (!alive) return
        setSettings(data)
        setSenderName(data.sender_name ?? '')
        setSenderEmail(data.sender_email ?? '')
      } catch {
        if (alive) {
          setLoadError(true)
          toast.error('فشل تحميل إعدادات البريد الإلكتروني')
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const getEnabled = useCallback((key: string): boolean => {
    if (key in overrides) return overrides[key]
    return settings?.settings[key]?.enabled ?? true
  }, [overrides, settings])

  const isDirty = useCallback((key: string): boolean => {
    if (!(key in overrides)) return false
    return overrides[key] !== (settings?.settings[key]?.enabled ?? true)
  }, [overrides, settings])

  const handleToggle = (key: string, val: boolean) => {
    setOverrides((prev) => {
      const next = { ...prev, [key]: val }
      // Drop the override entirely once it matches the server value again — keeps the dirty set exact.
      if (val === (settings?.settings[key]?.enabled ?? true)) delete next[key]
      return next
    })
  }

  const senderDirty = settings != null && (
    senderName !== (settings.sender_name ?? '') || senderEmail !== (settings.sender_email ?? '')
  )

  const dirtyKeys = useMemo(
    () => Object.keys(overrides).filter((k) => isDirty(k)),
    [overrides, isDirty],
  )
  const dirtyCount = dirtyKeys.length + (senderDirty ? 1 : 0)

  const grouped = useMemo(() => {
    if (!settings) return [] as Array<{ category: string; items: Row[] }>
    const byCategory = new Map<string, Row[]>()
    for (const item of Object.values(settings.settings)) {
      const arr = byCategory.get(item.category) ?? []
      arr.push(item)
      byCategory.set(item.category, arr)
    }
    const known = CATEGORY_ORDER.filter((c) => byCategory.has(c))
    const rest = [...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c as never))
    return [...known, ...rest].map((category) => ({ category, items: byCategory.get(category)! }))
  }, [settings])

  const handleSave = async () => {
    if (saving || dirtyCount === 0) return
    setSaving(true)
    try {
      // Only changed values are sent — never the full settings map.
      const settingsPayload: Record<string, { enabled: boolean }> = {}
      for (const key of dirtyKeys) {
        settingsPayload[key] = { enabled: overrides[key] }
      }

      const payload: Parameters<typeof updateEmailSettings>[0] = {}
      if (Object.keys(settingsPayload).length > 0) payload.settings = settingsPayload
      if (senderName !== (settings?.sender_name ?? '')) payload.sender_name = senderName || null
      if (senderEmail !== (settings?.sender_email ?? '')) payload.sender_email = senderEmail || null

      await updateEmailSettings(payload)
      toast.success('تم حفظ الإعدادات بنجاح')
      await load()
    } catch {
      toast.error('فشل حفظ الإعدادات — حاول مرة أخرى')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setOverrides({})
    setSenderName(settings?.sender_name ?? '')
    setSenderEmail(settings?.sender_email ?? '')
  }

  const handleTest = async () => {
    if (testing) return
    setTesting(true)
    try {
      const msg = await sendTestEmail()
      toast.success(msg)
    } catch {
      toast.error('فشل إرسال البريد التجريبي')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-6 pb-28" dir="rtl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0C2A4B]">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#0C2A4B]">مركز أتمتة البريد الإلكتروني</h1>
            <p className="mt-0.5 text-xs text-slate-500">تحكم في كل رسالة تلقائية تُرسل من المنصة، مجمّعة حسب القسم</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleTest()}
          disabled={testing}
          className="flex items-center gap-1.5 rounded-lg border border-[#0077B6] px-4 py-2 text-sm font-bold text-[#0077B6] transition hover:bg-[#EFF6FF] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {testing ? 'جاري الإرسال...' : 'إرسال بريد تجريبي'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/60" />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 py-16 text-center">
          <p className="font-black text-[#0C2A4B]">تعذّر تحميل الإعدادات</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0C2A4B] px-5 py-2.5 text-[12px] font-black text-white transition hover:brightness-110"
          >
            <RotateCcw className="h-3.5 w-3.5" /> إعادة المحاولة
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ category, items }) => (
            <CategoryCard
              key={category}
              categoryKey={category}
              items={items}
              getEnabled={getEnabled}
              isDirty={isDirty}
              disabled={saving}
              onToggle={handleToggle}
            />
          ))}

          {/* Global sender */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-black text-[#0C2A4B]">معلومات المُرسِل</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-slate-500">اسم المُرسِل</span>
                <input
                  type="text"
                  value={senderName}
                  disabled={saving}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="EMC Platform"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#0C2A4B] outline-none transition focus:ring-2 focus:ring-[#0077B6]/40 disabled:opacity-60"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-slate-500">بريد المُرسِل</span>
                <input
                  type="email"
                  value={senderEmail}
                  disabled={saving}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="no-reply@emc.test"
                  dir="ltr"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#0C2A4B] outline-none transition focus:ring-2 focus:ring-[#0077B6]/40 disabled:opacity-60"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Sticky save bar — only appears once something is dirty */}
      {dirtyCount > 0 && !loading && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
          <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-2xl shadow-slate-900/10">
            <p className="text-[12px] font-bold text-[#0C2A4B]">
              {dirtyCount} {dirtyCount === 1 ? 'تغيير غير محفوظ' : 'تغييرات غير محفوظة'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-black text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
              >
                تجاهل
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-[#0C2A4B] px-5 py-2 text-[12px] font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    حفظ التغييرات
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
