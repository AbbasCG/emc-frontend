import { useState, useEffect, useCallback } from 'react'
import { Save, Mail, Send, CheckCircle, AlertCircle } from 'lucide-react'
import {
  fetchEmailSettings,
  updateEmailSettings,
  sendTestEmail,
  type EmailSettingsResponse,
} from '@/api/emailAdminApi'

const EMAIL_LABELS: Record<string, string> = {
  welcome: 'رسالة الترحيب',
  course_enrollment: 'تسجيل في دورة',
  learning_path_enrollment: 'تسجيل في مسار تعليمي',
  course_completion: 'إتمام دورة',
  learning_path_completion: 'إتمام مسار تعليمي',
  assignment_submitted: 'تسليم واجب (للمدرب)',
  assignment_graded: 'تقييم واجب (للطالب)',
  session_reminder: 'تذكير بالجلسة',
  certificate_issued: 'إصدار شهادة',
  admin_new_registration: 'تسجيل جديد (للإدارة)',
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-[#0077B6]' : 'bg-slate-200'
      }`}
      aria-checked={enabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettingsResponse | null>(null)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  /** Re-read after a save — called from a handler, so the synchronous loading flip
   *  is allowed here. */
  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchEmailSettings()
      setSettings(data)
      setSenderName(data.sender_name ?? '')
      setSenderEmail(data.sender_email ?? '')
    } catch {
      showToast('error', 'فشل تحميل الإعدادات')
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
        if (alive) showToast('error', 'فشل تحميل الإعدادات')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const getEnabled = (key: string): boolean => {
    if (key in overrides) return overrides[key]
    return settings?.settings[key]?.enabled ?? true
  }

  const handleToggle = (key: string, val: boolean) => {
    setOverrides(prev => ({ ...prev, [key]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const settingsPayload: Record<string, { enabled: boolean }> = {}
      for (const key of Object.keys(EMAIL_LABELS)) {
        settingsPayload[key] = { enabled: getEnabled(key) }
      }
      await updateEmailSettings({
        settings: settingsPayload,
        sender_name: senderName || null,
        sender_email: senderEmail || null,
      })
      showToast('success', 'تم حفظ الإعدادات بنجاح')
      setOverrides({})
      await load()
    } catch {
      showToast('error', 'فشل حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const msg = await sendTestEmail()
      showToast('success', msg)
    } catch {
      showToast('error', 'فشل إرسال البريد التجريبي')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-6" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-bold text-white transition-all ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0C2A4B] flex items-center justify-center">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#0C2A4B]">إعدادات البريد الإلكتروني</h1>
            <p className="text-xs text-slate-500 mt-0.5">تحكم في أنواع الرسائل المُرسلة تلقائياً</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#0077B6] text-[#0077B6] text-sm font-bold hover:bg-[#EFF6FF] disabled:opacity-60 transition"
          >
            <Send className="h-4 w-4" />
            {testing ? 'جاري الإرسال...' : 'بريد تجريبي'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0C2A4B] text-white text-sm font-bold hover:bg-[#1a2737] disabled:opacity-60 transition"
          >
            <Save className="h-4 w-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">جاري التحميل...</div>
      ) : (
        <div className="space-y-6">
          {/* Notification toggles */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-black text-[#0C2A4B] mb-4">أنواع الرسائل</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(EMAIL_LABELS).map(([key, label]) => {
                const item = settings?.settings[key]
                const enabled = getEnabled(key)
                return (
                  <div key={key} className={`flex items-center justify-between gap-3 rounded-xl p-4 border transition ${
                    enabled ? 'border-[#0077B6]/20 bg-[#EFF6FF]' : 'border-slate-100 bg-slate-50'
                  }`}>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate ${enabled ? 'text-[#0C2A4B]' : 'text-slate-400'}`}>{label}</p>
                      {item?.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{item.description}</p>
                      )}
                    </div>
                    <Toggle enabled={enabled} onChange={v => handleToggle(key, v)} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Global sender */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-black text-[#0C2A4B] mb-4">معلومات المُرسِل</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-bold text-slate-500 mb-1 block">اسم المُرسِل</span>
                <input
                  type="text"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="EMC Platform"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#0C2A4B] focus:outline-none focus:ring-2 focus:ring-[#0077B6]/40"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-500 mb-1 block">بريد المُرسِل</span>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={e => setSenderEmail(e.target.value)}
                  placeholder="no-reply@emc.test"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-[#0C2A4B] focus:outline-none focus:ring-2 focus:ring-[#0077B6]/40"
                  dir="ltr"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
