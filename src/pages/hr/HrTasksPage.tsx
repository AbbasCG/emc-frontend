import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList } from 'lucide-react'
import apiClient from '@/api/axios'
import { asList } from '@/api/lmsApi'
import EmptyState from '@/components/dashboard/EmptyState'
import { HrPageShell } from '@/components/hr/HrLayout'
import type { OpsTask } from '@/types/operations'


function statusAr(s: OpsTask['status']) {
  const map: Record<string, string> = {
    idea: 'فكرة',
    study: 'دراسة',
    planning: 'تخطيط',
    pending_approval: 'بالانتظار',
    in_progress: 'جاري التنفيذ',
    done: 'مكتمل',
    deferred: 'مؤجّل',
    cancelled: 'ملغى',
    needs_review: 'بانتظار المراجعة',
  }
  return map[s] ?? s
}

function fmtDue(d: string | null | undefined) {
  if (!d) return '—'
  const x = new Date(d)
  if (Number.isNaN(x.getTime())) return d
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(x)
}

export default function HrTasksPage() {
  const [rows, setRows] = useState<OpsTask[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const res = await apiClient.get<unknown>('/operations/tasks', { params: { scope: 'all' }, skipErrorToast: true })
        const list = asList<OpsTask>(res.data)
        if (!c) setRows(list.filter((t) => t.status !== 'done' && t.status !== 'cancelled').slice(0, 48))
      } catch {
        if (!c) setRows(null)
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [])

  if (loading) return <div className="animate-pulse text-right opacity-70">يتم تحميل المهام...</div>

  return (
    <HrPageShell title="مهام الموارد البشرية" description="مسودة مهام من نظام تشغيل المنصّة — لتنسيق الموارد البشرية حول المهام عبر الوحدات.">
      {rows == null ?
        <p className="rounded-3xl bg-amber-50 px-6 py-8 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-100">
          لم يتم ربط هذا القسم بالبيانات بعد
        </p>
      : rows.length === 0 ?
        <EmptyState icon={ClipboardList} title="لا توجد مهام مفتوحة حالياً" />
      : (
        <div className="overflow-x-auto rounded-[1.65rem] border border-deepBlue/[0.06] bg-white/[0.9] shadow-emc ring-1 ring-deepBlue/[0.04]">
          <table className="min-w-[760px] w-full divide-y divide-slate-100 text-right text-sm">
            <thead className="bg-slate-50/90 text-[11px] font-black uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">المهمة</th>
                <th className="px-4 py-3">الوحدة</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 font-latin">الاستحقاق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold">
              {rows.map((t, i) => (
                <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}>
                  <td className="max-w-[320px] px-4 py-3 text-deepBlue">{t.title}</td>
                  <td className="px-4 py-3 text-slate-600">{t.department_name ?? t.department_id}</td>
                  <td className="px-4 py-3 text-brand-800">{statusAr(t.status)}</td>
                  <td className="px-4 py-3 font-latin text-slate-500">{fmtDue(t.due_at)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HrPageShell>
  )
}
