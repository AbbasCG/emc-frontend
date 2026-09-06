import { useState, useEffect } from 'react'
import { Save, ClipboardCheck, CheckCircle, AlertCircle } from 'lucide-react'
import { fetchAttendanceSettings, updateAttendanceSettings, type AttendanceSettingsData } from '@/api/instructorApi'

const FIELDS: { key: keyof AttendanceSettingsData; label: string; suffix: string; hint: string }[] = [
  { key: 'late_threshold_minutes', label: 'مهلة التأخير', suffix: 'دقيقة', hint: 'المدة التي يُعتبر بعدها الطالب متأخراً' },
  { key: 'auto_absent_after_minutes', label: 'الغياب التلقائي', suffix: 'دقيقة', hint: 'المدة التي يُسجَّل بعدها الطالب غائباً تلقائياً' },
  { key: 'minimum_attendance_percentage', label: 'الحد الأدنى لنسبة الحضور', suffix: '%', hint: 'الحد الأدنى المطلوب لاستيفاء متطلبات الحضور' },
  { key: 'at_risk_percentage', label: 'عتبة الخطر', suffix: '%', hint: 'أقل من هذه النسبة يُصنَّف الطالب معرضاً للخطر' },
  { key: 'repeated_absence_threshold', label: 'حد الغياب المتكرر', suffix: 'جلسات متتالية', hint: 'عدد مرات الغياب المتتالية لإرسال تنبيه' },
  { key: 'low_attendance_notification_threshold', label: 'عتبة تنبيه انخفاض الحضور', suffix: '%', hint: 'النسبة التي يُرسل عندها تنبيه انخفاض الحضور' },
  { key: 'certificate_attendance_percentage', label: 'نسبة الحضور لأهلية الشهادة', suffix: '%', hint: 'محفوظة للعرض فقط لا تُستخدم حالياً في منطق إصدار الشهادات' },
]

export default function AttendanceSettingsPage() {
  const [settings, setSettings] = useState<AttendanceSettingsData | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  // Initial load — inlined in the effect so no state is set on its synchronous path
  // (`loading` already starts as `true`).
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await fetchAttendanceSettings()
        if (!alive) return
        setSettings(data)
        setForm(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])))
      } catch {
        if (alive) showToast('error', 'فشل تحميل إعدادات الحضور')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  async function handleSave() {
    setSaving(true)
    setErrors({})
    try {
      const payload = Object.fromEntries(
        Object.keys(form).map((k) => [k, Number(form[k])])
      ) as unknown as AttendanceSettingsData
      const updated = await updateAttendanceSettings(payload)
      setSettings(updated)
      setForm(Object.fromEntries(Object.entries(updated).map(([k, v]) => [k, String(v)])))
      showToast('success', 'تم حفظ إعدادات الحضور بنجاح')
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } })?.response
      if (res?.status === 422 && res.data?.errors) {
        setErrors(Object.fromEntries(Object.entries(res.data.errors).map(([k, v]) => [k, v[0]])))
        showToast('error', 'تحقق من القيم المدخلة')
      } else {
        showToast('error', 'فشل حفظ الإعدادات')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-6" dir="rtl">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-bold text-white transition-all ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0C2A4B] flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#0C2A4B]">إعدادات الحضور</h1>
            <p className="text-xs text-slate-500 mt-0.5">تحكم في عتبات الحضور والغياب والتنبيهات المستخدمة عبر المنصة</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0C2A4B] text-white text-sm font-bold hover:bg-[#1a2737] disabled:opacity-60 transition"
        >
          <Save className="h-4 w-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      {loading || !settings ? (
        <div className="flex items-center justify-center py-24 text-slate-400">جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="text-[11px] font-bold text-slate-500 mb-1 block">{f.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-[#0C2A4B] focus:outline-none focus:ring-2 focus:ring-[#0077B6]/40 ${
                      errors[f.key] ? 'border-red-400' : 'border-slate-200'
                    }`}
                  />
                  <span className="shrink-0 text-[11px] font-bold text-slate-400">{f.suffix}</span>
                </div>
                <p className="mt-1 text-[10px] leading-tight text-slate-400">{f.hint}</p>
                {errors[f.key] && <p className="mt-1 text-[10px] font-bold text-red-500">{errors[f.key]}</p>}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
