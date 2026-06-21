import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from '@/lib/toast'
import {
  createAutomationRule,
  fetchAutomationRules,
  fetchAutomationRuns,
  patchAutomationRule,
} from '@/api/automationsApi'
import AutomationRuleCard from '@/components/platform/AutomationRuleCard'
import AutomationActionSelector from '@/components/enterprise/AutomationActionSelector'
import AutomationTriggerSelector from '@/components/enterprise/AutomationTriggerSelector'
import { buildActionsPreviewJson } from '@/components/enterprise/automationCatalog'
import ChannelToggleGroup from '@/components/enterprise/ChannelToggleGroup'
import SecretWarningPanel from '@/components/enterprise/SecretWarningPanel'
import type { AutomationActionKind, AutomationRule, AutomationRun, AutomationTrigger } from '@/types/platform'
import type { NotificationChannelKey } from '@/types/phase7'

export default function AdminAutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState<AutomationTrigger>('registration_created')
  const [conditions, setConditions] = useState('{}')
  const [selectedActions, setSelectedActions] = useState<AutomationActionKind[]>(['send_notification'])
  const [channels, setChannels] = useState<Record<NotificationChannelKey, boolean>>({
    in_app: true,
    email: true,
    whatsapp: false,
  })

  async function refresh() {
    const [nextRules, nextRuns] = await Promise.all([fetchAutomationRules(), fetchAutomationRuns()])
    setRules(nextRules)
    setRuns(nextRuns)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function addRule() {
    let mergedConditions: string
    try {
      const parsed = JSON.parse(conditions || '{}') as Record<string, unknown>
      mergedConditions = JSON.stringify({ ...parsed, channels }, null, 2)
    } catch {
      mergedConditions = JSON.stringify({ channels, note: 'invalid_json_wrapped' }, null, 2)
    }

    const actionsJson = buildActionsPreviewJson(selectedActions)

    const created = await createAutomationRule({
      name: name || 'قاعدة بدون اسم',
      trigger,
      active: true,
      conditions_json: mergedConditions,
      actions_json: actionsJson,
    })
    setRules((prev) => [created, ...prev])
    setName('')
    setConditions('{}')
    toast.success('تم إنشاء القاعدة')
    await refresh()
  }

  async function handleToggle(rule: AutomationRule, next: boolean) {
    const patched = await patchAutomationRule(rule.id, { active: next })
    if (patched) {
      setRules((prev) => prev.map((r) => (r.id === patched.id ? patched : r)))
      toast.success(next ? 'تم التفعيل' : 'تم الإيقاف المؤقت')
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-accent-700">Automations</p>
          <h1 className="text-3xl font-black text-deepBlue">مُنشئ الأتمتة الموسّع</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-500">
            محرّك Zapier-like داخل EMC: محفّزات تشغيل حقيقية، قنوات متعددة، شروط JSON متقدمة، ومعاينة الإجراءات قبل الإرسال إلى الخادم.
          </p>
        </div>
        <Link to="/dashboard/admin/automations/runs" className="rounded-xl bg-deepBlue px-4 py-2 text-xs font-black text-white shadow-md">
          سجل التشغيل الكامل
        </Link>
      </motion.div>

      <SecretWarningPanel title="تنبيه تشغيلي" body="تتحقق المنصّة من صلاحيات المسؤول قبل تنفيذ أي قواعد على البيانات الحية — راقب السجل للتأكد من نجاح كل تشغيل." />

      <section className="mt-8 rounded-2xl border border-dashed border-customBlue/30 bg-white p-6 shadow-inner shadow-sky-50">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-sm font-black text-deepBlue">محفّز جديد</h2>
            <label className="block">
              <span className="text-xs font-black text-slate-400">اسم القاعدة</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none ring-customBlue/25 focus:ring-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <AutomationTriggerSelector value={trigger} onChange={setTrigger} />
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-black text-deepBlue">القنوات</h2>
            <p className="text-xs font-bold text-slate-500">حدد أين تُرسل التنبيهات عند تحقق الشروط.</p>
            <ChannelToggleGroup value={channels} onChange={setChannels} />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-black text-deepBlue">الإجراءات</h2>
            <p className="mt-2 text-xs font-bold text-slate-500">اختيار متعدد — يُحوَّل إلى JSON منظم للخادم.</p>
            <div className="mt-4">
              <AutomationActionSelector value={selectedActions} onChange={setSelectedActions} />
            </div>
            <div className="mt-4 rounded-2xl bg-[#F6F8FB] p-4 ring-1 ring-slate-100">
              <p className="text-[11px] font-black text-slate-400">معاينة JSON</p>
              <pre className="mt-2 max-h-40 overflow-auto font-mono text-[11px] leading-5 text-deepBlue" dir="ltr">
                {buildActionsPreviewJson(selectedActions)}
              </pre>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-black text-deepBlue">شروط إضافية (JSON)</h2>
            <p className="mt-2 text-xs font-bold text-slate-500">مكان احتياطي للمعايير المعقدة حتى يكتمل محرّر الشرط المرئي.</p>
            <textarea
              dir="ltr"
              rows={10}
              className="mt-4 w-full rounded-2xl border border-slate-200 px-3 py-3 font-mono text-xs outline-none ring-customBlue/20 focus:ring-2"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void addRule()}
          className="mt-8 rounded-xl bg-customOrange px-6 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-95"
        >
          حفظ القاعدة
        </button>
      </section>

      <section className="mt-10 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-deepBlue">آخر عمليات التشغيل</h2>
            <p className="text-xs font-bold text-slate-500">مقتطف سريع — للتفاصيل الكاملة انتقل إلى صفحة السجل.</p>
          </div>
          <Link to="/dashboard/admin/automations/runs" className="text-xs font-black text-customBlue hover:underline">
            عرض الكل
          </Link>
        </div>
        <div className="mt-4 overflow-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-[#F6F8FB]">
              <tr className="text-right">
                <th className="px-3 py-2 text-xs font-black text-slate-500">القاعدة</th>
                <th className="px-3 py-2 text-xs font-black text-slate-500">الحالة</th>
                <th className="px-3 py-2 text-xs font-black text-slate-500">البداية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.slice(0, 6).map((run) => (
                <tr key={run.id}>
                  <td className="px-3 py-2 font-bold text-deepBlue">{run.rule_name}</td>
                  <td className="px-3 py-2 text-xs font-black text-slate-600">{run.status}</td>
                  <td className="px-3 py-2 text-xs font-bold text-slate-500">{run.started_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {rules.map((r) => (
          <AutomationRuleCard key={r.id} rule={r} onToggleActive={(rule, next) => void handleToggle(rule, next)} />
        ))}
      </div>
    </div>
  )
}
