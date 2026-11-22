import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, UserCheck } from 'lucide-react'
import SettingsToggle from '@/components/settings/SettingsToggle'
import {
  ASSIGNMENT_CHANNELS,
  ASSIGNMENT_CHANNEL_LABELS,
  assignmentErrorMessage,
  fetchAdminAssignmentSettings,
  saveAdminAssignmentSettings,
  type AdminAssignmentSetting,
  type AssignmentChanges,
  type AssignmentChannel,
  type AssignmentNotificationType,
} from '@/api/assignmentNotificationsApi'

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string }

/**
 * Admin: «إشعارات إسناد التذاكر» — one switch per assignment type and channel.
 * Email is the same switch as that key in the email list (so it is not repeated there);
 * in-app is its own switch. Turning a channel off here never changes anyone's saved
 * preference — users see the channel as «غير متاحة حاليًا» until it is back on.
 */
export default function AssignmentNotificationAdminPanel({ onSaved }: { onSaved?: () => void }) {
  const [types, setTypes] = useState<AdminAssignmentSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, boolean>>({})
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await fetchAdminAssignmentSettings()
        if (alive) setTypes(data)
      } catch (err) {
        if (alive) setLoadError(assignmentErrorMessage(err, 'تعذّر تحميل إعدادات إشعارات الإسناد.'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const key = (t: string, c: AssignmentChannel) => `${t}:${c}`
  const value = (t: AdminAssignmentSetting, c: AssignmentChannel) => draft[key(t.type, c)] ?? t.channels[c].enabled

  const changes = useMemo<AssignmentChanges>(() => {
    const out: AssignmentChanges = {}
    for (const t of types) {
      for (const c of ASSIGNMENT_CHANNELS) {
        const d = draft[key(t.type, c)]
        if (d !== undefined && d !== t.channels[c].enabled) {
          const type = t.type as AssignmentNotificationType
          out[type] = { ...out[type], [c]: d }
        }
      }
    }
    return out
  }, [draft, types])
  const dirty = Object.keys(changes).length > 0
  const saving = save.kind === 'saving'

  async function onSave() {
    if (!dirty || saving) return
    setSave({ kind: 'saving' })
    try {
      setTypes(await saveAdminAssignmentSettings(changes))
      setDraft({})
      setSave({ kind: 'saved' })
      onSaved?.()
    } catch (err) {
      setSave({ kind: 'error', message: assignmentErrorMessage(err, 'تعذّر حفظ إعدادات الإسناد. حاول مرة أخرى.') })
    }
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white shadow-sm" data-testid="assignment-notification-admin" aria-labelledby="assignment-admin-heading">
      <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/[0.08]">
          <UserCheck className="h-4 w-4 text-navy" aria-hidden />
        </div>
        <div>
          <h2 id="assignment-admin-heading" className="text-sm font-black text-navy">إشعارات إسناد التذاكر</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            تحكّم في كل قناة لكل نوع على حدة. إيقاف قناة يمنع إرسالها للجميع، ويحتفظ بتفضيلات المستخدمين لتُطبَّق عند إعادة تفعيلها.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-5"><div className="h-20 animate-pulse rounded-xl bg-slate-100" /></div>
      ) : loadError ? (
        <p role="alert" className="flex items-center gap-2 px-6 py-5 text-sm font-bold text-rose-700"><AlertCircle className="h-4 w-4" aria-hidden />{loadError}</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {types.map((t) => (
              <li key={t.type} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between" data-testid={`assignment-admin-${t.type}`}>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy">{t.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>
                </div>
                <div className="flex flex-wrap gap-6">
                  {ASSIGNMENT_CHANNELS.map((c) => (
                    <div key={c} className="flex w-28 flex-col items-center gap-1.5">
                      <label htmlFor={`admin-assign-${t.type}-${c}`} className="text-[11px] font-bold text-slate-500">{ASSIGNMENT_CHANNEL_LABELS[c]}</label>
                      <SettingsToggle
                        id={`admin-assign-${t.type}-${c}`}
                        checked={value(t, c)}
                        disabled={saving}
                        onChange={() => { setDraft((p) => ({ ...p, [key(t.type, c)]: !value(t, c) })); setSave({ kind: 'idle' }) }}
                        aria-label={`${t.label} — ${ASSIGNMENT_CHANNEL_LABELS[c]}`}
                      />
                      <span className={`text-[10px] font-bold ${value(t, c) ? 'text-emerald-700' : 'text-slate-400'}`}>{value(t, c) ? 'مفعّلة' : 'متوقفة'}</span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-3">
            <div aria-live="polite" className="text-xs font-bold">
              {save.kind === 'saving' && <span className="inline-flex items-center gap-1.5 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />جارٍ الحفظ...</span>}
              {save.kind === 'saved' && <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />تم حفظ إعدادات الإسناد</span>}
              {save.kind === 'error' && <span role="alert" className="inline-flex items-center gap-1.5 text-rose-700"><AlertCircle className="h-3.5 w-3.5" aria-hidden />{save.message}</span>}
            </div>
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={!dirty || saving}
              className="rounded-lg bg-customBlue px-5 py-2 text-xs font-black text-white transition hover:bg-customBlue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الإسناد'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
