import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, UserCheck } from 'lucide-react'
import SettingsToggle from '@/components/settings/SettingsToggle'
import {
  ASSIGNMENT_CHANNELS,
  ASSIGNMENT_CHANNEL_LABELS,
  assignmentErrorMessage,
  fetchAssignmentPreferences,
  saveAssignmentPreferences,
  type AssignmentChanges,
  type AssignmentChannel,
  type AssignmentNotificationType,
  type UserAssignmentPreference,
} from '@/api/assignmentNotificationsApi'

type Draft = Partial<Record<string, boolean>>
type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: Date } | { kind: 'error'; message: string }

const draftKey = (type: string, channel: AssignmentChannel) => `${type}:${channel}`

/**
 * «إشعارات إسناد التذاكر» — the signed-in user's own choice, per assignment type and
 * channel. Saved to the backend for this account only; what reaches the user is
 * still the backend's decision (admin switch AND this choice). A channel the
 * administrator turned off shows «غير متاحة حاليًا»: the user's choice stays saved
 * and visible, and applies again once the channel is turned back on.
 */
export default function AssignmentNotificationPreferences() {
  const [types, setTypes] = useState<UserAssignmentPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({})
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setTypes(await fetchAssignmentPreferences())
      setDraft({})
    } catch (err) {
      setLoadError(assignmentErrorMessage(err, 'تعذّر تحميل تفضيلات إشعارات الإسناد.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await fetchAssignmentPreferences()
        if (alive) setTypes(data)
      } catch (err) {
        if (alive) setLoadError(assignmentErrorMessage(err, 'تعذّر تحميل تفضيلات إشعارات الإسناد.'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const value = (t: UserAssignmentPreference, c: AssignmentChannel) => draft[draftKey(t.type, c)] ?? t.channels[c].enabled

  const changes = useMemo<AssignmentChanges>(() => {
    const out: AssignmentChanges = {}
    for (const t of types) {
      for (const c of ASSIGNMENT_CHANNELS) {
        const d = draft[draftKey(t.type, c)]
        if (d !== undefined && d !== t.channels[c].enabled) {
          out[t.type as AssignmentNotificationType] = { ...out[t.type as AssignmentNotificationType], [c]: d }
        }
      }
    }
    return out
  }, [draft, types])
  const dirty = Object.keys(changes).length > 0
  const saving = save.kind === 'saving'

  function toggle(t: UserAssignmentPreference, c: AssignmentChannel) {
    setDraft((prev) => ({ ...prev, [draftKey(t.type, c)]: !value(t, c) }))
    if (save.kind !== 'saving') setSave({ kind: 'idle' })
  }

  async function onSave() {
    if (!dirty || saving) return
    setSave({ kind: 'saving' })
    try {
      const fresh = await saveAssignmentPreferences(changes)
      setTypes(fresh)
      setDraft({})
      setSave({ kind: 'saved', at: new Date() })
    } catch (err) {
      setSave({ kind: 'error', message: assignmentErrorMessage(err, 'تعذّر حفظ التفضيلات. حاول مرة أخرى.') })
    }
  }

  return (
    <section
      aria-labelledby="assignment-notifications-heading"
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_4px_0_rgba(15,23,42,0.04)]"
      data-testid="assignment-notification-preferences"
    >
      <div className="border-b border-slate-100 bg-gradient-to-bl from-slate-50/80 to-white px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/[0.08]">
            <UserCheck className="h-5 w-5 text-navy" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="assignment-notifications-heading" className="text-[15px] font-black text-navy">إشعارات إسناد التذاكر</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              اختر كيف نُبلغك عند إسناد تذكرة إليك. إيقاف الإشعارات لا يلغي الإسناد، وتبقى التذاكر المسندة إليك ظاهرة في لوحة عملك.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 px-5 py-5" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : loadError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {types.map((t) => (
              <li key={t.type} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" data-testid={`assignment-pref-${t.type}`}>
                <div className="min-w-0 text-right">
                  <p className="text-[13px] font-bold text-navy">{t.label}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{t.description}</p>
                </div>
                <div className="flex flex-wrap items-start gap-5 sm:shrink-0">
                  {ASSIGNMENT_CHANNELS.map((c) => {
                    const state = t.channels[c]
                    const id = `assign-${t.type}-${c}`
                    return (
                      <div key={c} className="flex w-32 flex-col items-center gap-1.5 text-center">
                        <label htmlFor={id} className="text-[11px] font-bold text-slate-500">{ASSIGNMENT_CHANNEL_LABELS[c]}</label>
                        <SettingsToggle
                          id={id}
                          checked={value(t, c)}
                          disabled={saving || !state.available}
                          onChange={() => toggle(t, c)}
                          aria-label={`${t.label} — ${ASSIGNMENT_CHANNEL_LABELS[c]}`}
                        />
                        {!state.available && (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                            غير متاحة حاليًا
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>

          {types.some((t) => ASSIGNMENT_CHANNELS.some((c) => !t.channels[c].available)) && (
            <p className="border-t border-slate-100 bg-amber-50/40 px-5 py-2.5 text-[11px] leading-relaxed text-amber-800">
              «غير متاحة حاليًا» تعني أن الإدارة أوقفت هذه القناة للجميع. اختيارك محفوظ، وسيُطبَّق تلقائيًا إذا أُعيد تفعيلها.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-3">
            <div aria-live="polite" className="min-h-[1.25rem] text-[12px] font-bold">
              {save.kind === 'saving' && (
                <span className="inline-flex items-center gap-1.5 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />جارٍ الحفظ...</span>
              )}
              {save.kind === 'saved' && (
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  تم حفظ التفضيلات — {save.at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {save.kind === 'error' && (
                <span role="alert" className="inline-flex items-center gap-1.5 text-rose-700"><AlertCircle className="h-3.5 w-3.5" aria-hidden />{save.message}</span>
              )}
              {save.kind === 'idle' && dirty && <span className="text-amber-700">لديك تغييرات غير محفوظة في إشعارات الإسناد</span>}
            </div>
            <div className="flex items-center gap-2">
              {dirty && (
                <button
                  type="button"
                  onClick={() => { setDraft({}); setSave({ kind: 'idle' }) }}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>
              )}
              <button
                type="button"
                onClick={() => void onSave()}
                disabled={!dirty || saving}
                className="rounded-xl bg-customBlue px-5 py-2 text-[12px] font-black text-white shadow-md shadow-customBlue/25 transition hover:bg-customBlue/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'جارٍ الحفظ...' : save.kind === 'error' ? 'إعادة المحاولة' : 'حفظ تفضيلات الإسناد'}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
