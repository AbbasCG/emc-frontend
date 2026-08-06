import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { ElementType } from 'react'
import { successToast, errorToast } from '@/lib/toast'
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  fetchQuietHours,
  updateQuietHours,
  fetchPushSubscriptionState,
  type QuietHoursSettings,
} from '@/api/notificationPreferencesApi'
import { isPushSupported, isPushConfigured, subscribeToPush, unsubscribeFromPush } from '@/lib/push'
import { isRealtimeConfigured } from '@/lib/echo'
import SecretWarningPanel from '@/components/enterprise/SecretWarningPanel'
import { LoadingSkeletonStack } from '@/components/enterprise/LoadingSkeleton'
import NotificationPreferenceRowComponent from '@/components/enterprise/NotificationPreferenceRow'
import type { NotificationPreferenceRow } from '@/types/phase7'
import {
  Shield, BookOpen, CalendarDays, ClipboardList,
  CreditCard, Award, Headphones, Megaphone,
  Bell, Mail, RefreshCw, RotateCcw, Moon, Smartphone, Wifi, WifiOff,
} from 'lucide-react'
import { formatEnglishCount } from '@/utils/formatEnglishNumber'

const COMMON_TIMEZONES = [
  'UTC', 'Asia/Riyadh', 'Asia/Dubai', 'Europe/Amsterdam', 'Europe/London', 'Africa/Cairo',
]

function QuietHoursAndPushPanel() {
  const [quietHours, setQuietHours] = useState<QuietHoursSettings>({ enabled: false, start_time: null, end_time: null, timezone: 'UTC' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [qh, subscribed] = await Promise.all([fetchQuietHours(), fetchPushSubscriptionState()])
      setQuietHours({ ...qh, start_time: qh.start_time?.slice(0, 5) ?? null, end_time: qh.end_time?.slice(0, 5) ?? null })
      setPushSubscribed(subscribed)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function saveQuietHours(next: QuietHoursSettings) {
    setQuietHours(next)
    setSaving(true)
    try {
      await updateQuietHours(next)
      successToast('تم تحديث ساعات الهدوء')
    } catch {
      errorToast('تعذّر حفظ ساعات الهدوء')
    } finally {
      setSaving(false)
    }
  }

  async function togglePush() {
    setPushBusy(true)
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush()
        setPushSubscribed(false)
        successToast('تم إيقاف إشعارات الدفع')
      } else {
        const ok = await subscribeToPush()
        setPushSubscribed(ok)
        if (ok) successToast('تم تفعيل إشعارات الدفع')
        else errorToast('تعذّر تفعيل إشعارات الدفع — تحقق من إذن المتصفح')
      }
    } catch {
      errorToast('حدث خطأ أثناء تحديث إشعارات الدفع')
    } finally {
      setPushBusy(false)
    }
  }

  if (loading) return <LoadingSkeletonStack rows={2} />
  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 text-center text-[13px] font-semibold text-red-500">
        تعذّر تحميل إعدادات ساعات الهدوء والدفع.
        <button type="button" onClick={() => void load()} className="mr-2 font-black text-red-600 underline">إعادة المحاولة</button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Quiet hours */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-indigo-500" />
            <h3 className="text-[14px] font-black text-[#22334A]">ساعات الهدوء</h3>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={quietHours.enabled}
            aria-label="تفعيل ساعات الهدوء"
            disabled={saving}
            onClick={() => void saveQuietHours({ ...quietHours, enabled: !quietHours.enabled })}
            className={`h-6 w-11 rounded-full transition ${quietHours.enabled ? 'bg-indigo-500' : 'bg-slate-200'}`}
          >
            <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition ${quietHours.enabled ? 'translate-x-0.5' : 'translate-x-5'}`} />
          </button>
        </div>
        <p className="mb-3 text-[12px] leading-relaxed text-slate-500">
          خلال هذه الساعات، تُحفظ الإشعارات داخل المنصة فوراً كالمعتاد، بينما تُؤجَّل قنوات SMS والدفع حتى نهاية الفترة.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-500">من</span>
            <input
              type="time"
              disabled={!quietHours.enabled || saving}
              value={quietHours.start_time ?? '22:00'}
              onChange={(e) => setQuietHours({ ...quietHours, start_time: e.target.value })}
              onBlur={() => void saveQuietHours(quietHours)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] font-bold disabled:opacity-40"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-500">إلى</span>
            <input
              type="time"
              disabled={!quietHours.enabled || saving}
              value={quietHours.end_time ?? '07:00'}
              onChange={(e) => setQuietHours({ ...quietHours, end_time: e.target.value })}
              onBlur={() => void saveQuietHours(quietHours)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] font-bold disabled:opacity-40"
            />
          </label>
        </div>
        <label className="mt-2 block">
          <span className="mb-1 block text-[11px] font-bold text-slate-500">المنطقة الزمنية</span>
          <select
            disabled={!quietHours.enabled || saving}
            value={quietHours.timezone}
            onChange={(e) => void saveQuietHours({ ...quietHours, timezone: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] font-bold disabled:opacity-40"
          >
            {COMMON_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </label>
      </div>

      {/* Push + realtime status */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-emerald-500" />
          <h3 className="text-[14px] font-black text-[#22334A]">إشعارات الدفع (Push)</h3>
        </div>
        {!isPushSupported() ? (
          <p className="text-[12px] font-semibold text-slate-400">متصفحك لا يدعم إشعارات الدفع.</p>
        ) : !isPushConfigured() ? (
          <p className="text-[12px] font-semibold text-slate-400">إشعارات الدفع غير مفعّلة على هذه المنصة حالياً.</p>
        ) : (
          <button
            type="button"
            disabled={pushBusy}
            onClick={() => void togglePush()}
            className={`w-full rounded-xl px-4 py-2.5 text-[12px] font-black shadow-sm transition disabled:opacity-50 ${
              pushSubscribed ? 'border border-slate-200 bg-white text-slate-600' : 'bg-emerald-500 text-white'
            }`}
          >
            {pushBusy ? 'جارٍ التحديث...' : pushSubscribed ? 'إيقاف إشعارات الدفع على هذا الجهاز' : 'تفعيل إشعارات الدفع على هذا الجهاز'}
          </button>
        )}

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-400">
          {isRealtimeConfigured() ? (
            <><Wifi className="h-3.5 w-3.5 text-emerald-500" /> التحديث الفوري مفعّل</>
          ) : (
            <><WifiOff className="h-3.5 w-3.5 text-slate-300" /> التحديث الفوري غير متاح — التحديث كل 90 ثانية</>
          )}
        </div>
      </div>
    </div>
  )
}

type EventDef = {
  key: string
  labelAr: string
  descriptionAr: string
  channels: { in_app: boolean; email: boolean; sms?: boolean }
  mandatory?: boolean
}

type Category = {
  key: string
  labelAr: string
  descriptionAr: string
  icon: ElementType
  events: EventDef[]
}

const CATEGORIES: Category[] = [
  {
    key: 'security',
    labelAr: 'الحساب والأمان',
    descriptionAr: 'إعدادات الإشعارات المتعلقة بأمان حسابك وتسجيل الدخول.',
    icon: Shield,
    events: [
      { key: 'login_new_device', labelAr: 'تسجيل دخول من جهاز جديد', descriptionAr: 'تنبيه عند تسجيل الدخول من جهاز أو متصفح غير معروف.', channels: { in_app: true, email: true }, mandatory: true },
      { key: 'password_changed', labelAr: 'تغيير كلمة المرور', descriptionAr: 'إشعار فوري عند تغيير كلمة المرور.', channels: { in_app: true, email: true }, mandatory: true },
      { key: 'email_changed', labelAr: 'تغيير البريد الإلكتروني', descriptionAr: 'تنبيه عند تحديث عنوان البريد الإلكتروني.', channels: { in_app: true, email: true }, mandatory: true },
      { key: 'security_alert', labelAr: 'تنبيه أمني', descriptionAr: 'تنبيهات أمنية حرجة لا يمكن تعطيلها.', channels: { in_app: true, email: true }, mandatory: true },
    ],
  },
  {
    key: 'courses',
    labelAr: 'الدورات والمسارات',
    descriptionAr: 'إشعارات التسجيل والمحتوى والتحديثات المتعلقة بالدورات.',
    icon: BookOpen,
    events: [
      { key: 'course_registered', labelAr: 'التسجيل في دورة', descriptionAr: 'عند إتمام التسجيل في دورة جديدة.', channels: { in_app: true, email: true } },
      { key: 'registration_confirmed', labelAr: 'تأكيد التسجيل', descriptionAr: 'عند تأكيد قبول التسجيل من الإدارة.', channels: { in_app: true, email: true } },
      { key: 'course_updated', labelAr: 'تحديث بيانات الدورة', descriptionAr: 'عند تعديل معلومات أو جدول الدورة.', channels: { in_app: true, email: false } },
      { key: 'instructor_assigned', labelAr: 'تغيير المدرب', descriptionAr: 'عند تعيين أو تغيير مدرب الدورة.', channels: { in_app: true, email: true } },
      { key: 'new_material_published', labelAr: 'نشر محتوى جديد', descriptionAr: 'عند إضافة مواد أو دروس جديدة.', channels: { in_app: true, email: false } },
      { key: 'course_cancelled', labelAr: 'إلغاء الدورة', descriptionAr: 'عند إلغاء دورة مسجَّل فيها.', channels: { in_app: true, email: true } },
    ],
  },
  {
    key: 'sessions',
    labelAr: 'الجلسات والتقويم',
    descriptionAr: 'تذكيرات الجلسات وتغييرات المواعيد.',
    icon: CalendarDays,
    events: [
      { key: 'new_session', labelAr: 'جلسة جديدة', descriptionAr: 'عند جدولة جلسة جديدة.', channels: { in_app: true, email: false } },
      { key: 'session_date_updated', labelAr: 'تغيير موعد الجلسة', descriptionAr: 'عند تعديل وقت أو تاريخ الجلسة.', channels: { in_app: true, email: true } },
      { key: 'session_reminder_24h', labelAr: 'تذكير قبل الجلسة بـ 24 ساعة', descriptionAr: 'تذكير مسبق قبل يوم من الجلسة.', channels: { in_app: true, email: true } },
      { key: 'session_reminder_1h', labelAr: 'تذكير قبل الجلسة بساعة', descriptionAr: 'تذكير قصير قبل بدء الجلسة.', channels: { in_app: true, email: false } },
      { key: 'session_cancelled', labelAr: 'إلغاء الجلسة', descriptionAr: 'عند إلغاء جلسة مجدولة.', channels: { in_app: true, email: true } },
    ],
  },
  {
    key: 'assignments',
    labelAr: 'الواجبات والتقييم',
    descriptionAr: 'إشعارات الواجبات والتسليم والتقييم.',
    icon: ClipboardList,
    events: [
      { key: 'assignment_new', labelAr: 'واجب جديد', descriptionAr: 'عند نشر واجب جديد.', channels: { in_app: true, email: false } },
      { key: 'assignment_deadline_approaching', labelAr: 'اقتراب الموعد النهائي', descriptionAr: 'تذكير قبل انتهاء مهلة التسليم.', channels: { in_app: true, email: true } },
      { key: 'assignment_submitted', labelAr: 'استلام التسليم', descriptionAr: 'عند استلام تسليم من طالب.', channels: { in_app: true, email: false } },
      { key: 'assignment_graded', labelAr: 'تقييم الواجب', descriptionAr: 'عند نشر درجة أو تقييم الواجب.', channels: { in_app: true, email: true } },
      { key: 'assignment_feedback', labelAr: 'ملاحظات المدرب', descriptionAr: 'عند إضافة ملاحظات على التسليم.', channels: { in_app: true, email: false } },
      { key: 'assignment_resubmit_allowed', labelAr: 'السماح بإعادة التسليم', descriptionAr: 'عند السماح بإعادة تسليم الواجب.', channels: { in_app: true, email: false } },
    ],
  },
  {
    key: 'payments',
    labelAr: 'المدفوعات والفواتير',
    descriptionAr: 'إشعارات الدفع والفواتير والاسترداد.',
    icon: CreditCard,
    events: [
      { key: 'payment_confirmed', labelAr: 'تأكيد الدفع', descriptionAr: 'عند نجاح عملية الدفع.', channels: { in_app: true, email: true } },
      { key: 'payment_failed', labelAr: 'فشل الدفع', descriptionAr: 'عند فشل محاولة الدفع.', channels: { in_app: true, email: true } },
      { key: 'manual_payment_pending', labelAr: 'دفع يدوي بانتظار المراجعة', descriptionAr: 'عند إرسال إثبات دفع للمراجعة.', channels: { in_app: true, email: true } },
      { key: 'manual_payment_confirmed', labelAr: 'تأكيد الدفع اليدوي', descriptionAr: 'عند قبول الدفع اليدوي.', channels: { in_app: true, email: true } },
      { key: 'manual_payment_rejected', labelAr: 'رفض الدفع اليدوي', descriptionAr: 'عند رفض إثبات الدفع.', channels: { in_app: true, email: true } },
      { key: 'invoice_issued', labelAr: 'إصدار فاتورة', descriptionAr: 'عند إصدار فاتورة جديدة.', channels: { in_app: true, email: true } },
      { key: 'refund_issued', labelAr: 'استرداد مالي', descriptionAr: 'عند معالجة استرداد مالي.', channels: { in_app: true, email: true } },
    ],
  },
  {
    key: 'certificates',
    labelAr: 'الشهادات',
    descriptionAr: 'إشعارات إصدار الشهادات وجاهزيتها للتنزيل.',
    icon: Award,
    events: [
      { key: 'certificate_issued', labelAr: 'شهادة جديدة', descriptionAr: 'عند إصدار شهادة جديدة.', channels: { in_app: true, email: true } },
      { key: 'certificate_ready', labelAr: 'الشهادة جاهزة للتنزيل', descriptionAr: 'عندما تصبح الشهادة متاحة للتنزيل.', channels: { in_app: true, email: true } },
      { key: 'certificate_status_updated', labelAr: 'تحديث حالة الشهادة', descriptionAr: 'عند تغيير حالة الشهادة.', channels: { in_app: true, email: false } },
    ],
  },
  {
    key: 'support',
    labelAr: 'الدعم',
    descriptionAr: 'إعدادات الإشعارات المتعلقة بالدعم الفني.',
    icon: Headphones,
    events: [
      { key: 'support_ticket_created', labelAr: 'إنشاء تذكرة دعم', descriptionAr: 'عند إنشاء تذكرة دعم جديدة.', channels: { in_app: true, email: true } },
      { key: 'support_ticket_reply', labelAr: 'رد جديد على التذكرة', descriptionAr: 'عند استلام رد على تذكرة الدعم.', channels: { in_app: true, email: true } },
      { key: 'support_ticket_status_changed', labelAr: 'تغيير حالة التذكرة', descriptionAr: 'عند تحديث حالة التذكرة.', channels: { in_app: true, email: false } },
      { key: 'support_ticket_closed', labelAr: 'إغلاق التذكرة', descriptionAr: 'عند إغلاق تذكرة الدعم.', channels: { in_app: true, email: true } },
    ],
  },
  {
    key: 'announcements',
    labelAr: 'الإعلانات',
    descriptionAr: 'إعلانات النظام والأخبار والرسائل التسويقية.',
    icon: Megaphone,
    events: [
      { key: 'system_announcement', labelAr: 'إعلانات النظام', descriptionAr: 'إعلانات مهمة من إدارة المنصة.', channels: { in_app: true, email: true } },
      { key: 'emc_news', labelAr: 'أخبار EMC', descriptionAr: 'أخبار وتحديثات المركز.', channels: { in_app: true, email: false } },
      { key: 'marketing_email', labelAr: 'رسائل تسويقية', descriptionAr: 'عروض ورسائل ترويجية اختيارية.', channels: { in_app: false, email: false } },
    ],
  },
]

type BackendRow = { channel: string; type: string; enabled: boolean }

function buildRows(backendRows: BackendRow[]): NotificationPreferenceRow[] {
  const lookup = new Map<string, boolean>()
  backendRows.forEach((r) => {
    lookup.set(`${r.type}::${r.channel}`, r.enabled)
  })

  const result: NotificationPreferenceRow[] = []
  for (const cat of CATEGORIES) {
    for (const ev of cat.events) {
      const channels: NotificationPreferenceRow['channels'] = {}
      for (const channel of Object.keys(ev.channels) as Array<'in_app' | 'email' | 'sms'>) {
        const stored = lookup.get(`${ev.key}::${channel}`)
        channels[channel] = stored !== undefined ? stored : ev.channels[channel]!
      }
      result.push({
        key: ev.key,
        labelAr: ev.labelAr,
        descriptionAr: ev.descriptionAr,
        category: cat.key,
        channels,
        mandatory: ev.mandatory,
      })
    }
  }
  return result
}

function toBackendPayload(rows: NotificationPreferenceRow[]): BackendRow[] {
  const payload: BackendRow[] = []
  for (const row of rows) {
    for (const [channel, enabled] of Object.entries(row.channels)) {
      if (enabled !== undefined) {
        payload.push({ type: row.key, channel, enabled: !!enabled })
      }
    }
  }
  return payload
}

function ChannelSummaryCard({ icon: Icon, label, count, color }: { icon: ElementType; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="font-latin text-[18px] font-black tabular-nums text-[#22334A]">{formatEnglishCount(count)}</p>
        <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      </div>
    </div>
  )
}

function CategorySection({
  category,
  rows,
  disabled,
  onChange,
}: {
  category: Category
  rows: NotificationPreferenceRow[]
  disabled: boolean
  onChange: (next: NotificationPreferenceRow) => void
}) {
  const Icon = category.icon
  if (rows.length === 0) return null

  const hasSms = rows.some((r) => r.channels.sms !== undefined)

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_4px_0_rgba(15,23,42,0.04)]"
    >
      <div className="border-b border-slate-100 bg-gradient-to-bl from-slate-50/80 to-white px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22334A]/[0.08]">
            <Icon className="h-5 w-5 text-[#22334A]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-black text-[#22334A]">{category.labelAr}</h2>
              <span className="rounded-lg bg-slate-200/60 px-2 py-0.5 font-latin text-[10px] font-bold text-slate-500">
                {formatEnglishCount(rows.length)}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{category.descriptionAr}</p>
          </div>
        </div>
      </div>

      {/* Column headers — fixed toggle columns */}
      <div
        className={`hidden border-b border-slate-100 bg-slate-50/40 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:grid ${hasSms ? 'sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem]' : 'sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem]'} sm:gap-4`}
      >
        <span className="text-right">الحدث</span>
        <span className="text-center">داخل المنصة</span>
        <span className="text-center">البريد الإلكتروني</span>
        {hasSms && <span className="text-center">SMS</span>}
      </div>

      <div>
        {rows.map((row, index) => (
          <NotificationPreferenceRowComponent
            key={row.key}
            row={row}
            disabled={disabled}
            onChange={onChange}
            index={index}
          />
        ))}
      </div>
    </motion.section>
  )
}

export default function NotificationPreferencesPage() {
  const [rows, setRows] = useState<NotificationPreferenceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const originalRef = useRef<NotificationPreferenceRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const backendRows = await fetchNotificationPreferences()
      const built = buildRows(backendRows as unknown as BackendRow[])
      setRows(built)
      originalRef.current = built
      setDirty(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function handleChange(next: NotificationPreferenceRow) {
    setRows((prev) => prev.map((r) => (r.key === next.key ? next : r)))
    setDirty(true)
  }

  async function onSave() {
    setSaving(true)
    try {
      const payload = toBackendPayload(rows)
      await updateNotificationPreferences(payload as unknown as Parameters<typeof updateNotificationPreferences>[0])
      originalRef.current = rows
      setDirty(false)
      setLastSaved(new Date())
      successToast('تم حفظ التفضيلات بنجاح')
    } catch {
      errorToast('فشل حفظ التفضيلات. حاول مرة أخرى.')
    } finally {
      setSaving(false)
    }
  }

  function onReset() {
    setRows(buildRows([]))
    setDirty(true)
  }

  function onCancel() {
    setRows(originalRef.current)
    setDirty(false)
  }

  const enabledInApp = rows.filter((r) => r.channels.in_app).length
  const enabledEmail = rows.filter((r) => r.channels.email).length
  const total = rows.length

  return (
    <div dir="rtl" className="pb-28 text-[#22334A]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#22334A] sm:text-[22px]">تفضيلات الإشعارات</h1>
            <p className="mt-1.5 max-w-xl text-[13px] font-medium leading-relaxed text-slate-500">
              اختر أنواع الإشعارات التي ترغب في استلامها وطريقة وصولها إليك
            </p>
            {lastSaved && (
              <p className="mt-2 text-[11px] font-medium text-slate-400">
                آخر حفظ {lastSaved.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || saving}
              aria-label="تحديث"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              disabled={saving || loading}
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              الافتراضي
            </button>
          </div>
        </motion.div>

        <div className="mb-6">
          <SecretWarningPanel body="بعض الإشعارات الأمنية إلزامية ولا يمكن تعطيلها. يُطبَّق كل إعداد فوراً على الإشعارات المستقبلية." />
        </div>

        <div className="mb-6">
          <QuietHoursAndPushPanel />
        </div>

        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <ChannelSummaryCard icon={Bell} label="إجمالي الأحداث" count={total} color="#22334A" />
            <ChannelSummaryCard icon={Bell} label="داخل المنصة مفعّل" count={enabledInApp} color="#2691C2" />
            <ChannelSummaryCard icon={Mail} label="البريد الإلكتروني مفعّل" count={enabledEmail} color="#10b981" />
          </motion.div>
        )}

        {loading ? (
          <LoadingSkeletonStack rows={5} />
        ) : (
          <div className="space-y-5">
            {CATEGORIES.map((cat, i) => {
              const catRows = rows.filter((r) => r.category === cat.key)
              return (
                <motion.div
                  key={cat.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <CategorySection
                    category={cat}
                    rows={catRows}
                    disabled={saving}
                    onChange={handleChange}
                  />
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      <AnimatePresence>
        {dirty && !loading && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5 pt-3"
          >
            <div className="flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_8px_32px_rgba(15,23,42,0.12)]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
                <span className="text-[13px] font-bold text-slate-700">لديك تغييرات غير محفوظة</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={saving}
                  className="rounded-xl bg-[#2691C2] px-5 py-2 text-[12px] font-black text-white shadow-md shadow-[#2691C2]/25 transition hover:bg-[#1f7da8] disabled:opacity-60"
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
