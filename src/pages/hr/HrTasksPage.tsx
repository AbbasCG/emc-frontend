import { useState } from 'react'
import { Award, CheckCircle2, Clock, Sparkles, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiMessageOr } from '@/api/apiErrors'
import apiClient from '@/api/axios'
import { asList } from '@/api/lmsApi'
import { fetchPendingHrApprovalTasks, hrApproveTask, type BoardTask } from '@/api/operationsBoardApi'
import EmptyState from '@/components/dashboard/EmptyState'
import LoadErrorState from '@/components/dashboard/LoadErrorState'
import { HrPageShell } from '@/components/hr/HrLayout'
import { normalizeOpsTask } from '@/api/normalizers/opsTask'
import { TASK_STATUS_AR } from '@/data/operationsLabels'
import { useAuth } from '@/contexts/AuthContext'
import { useRetryableLoad } from '@/hooks/useRetryableLoad'
import { describeLoadError } from '@/lib/describeLoadError'
import type { OpsTask, TaskStatus } from '@/types/operations'

const HR_TASKS_FORBIDDEN_MESSAGE_AR =
  'لا تملك صلاحية عرض مهام الموارد البشرية. اطلب من مسؤول الوصول منح «عرض مهام واعتمادات الموارد البشرية».'

/** A log row: the normalized task (nested `assigned_to` / `department` read, old flat names as fallback) plus the server's own status key. */
type LogTask = OpsTask & { status_key: string }

async function fetchAllTasks(): Promise<LogTask[]> {
  const res = await apiClient.get<unknown>('/operations/tasks', { params: { scope: 'all' }, skipErrorToast: true })
  return asList<Record<string, unknown>>(res.data).map((raw) => ({
    ...normalizeOpsTask(raw),
    // The normalizer folds an unknown status into 'planning'; the log must not mislabel it.
    status_key: typeof raw.status === 'string' ? raw.status : '',
  }))
}

/** Arabic label from the project's task status map; the raw key only when the map does not know it. */
function statusLabel(key: string): string {
  return TASK_STATUS_AR[key as TaskStatus] ?? (key || '—')
}

export default function HrTasksPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')
  const { user } = useAuth()
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [allOpened, setAllOpened] = useState(false)

  const pending = useRetryableLoad(fetchPendingHrApprovalTasks, 'hr-pending')
  const all = useRetryableLoad(fetchAllTasks, 'hr-all', allOpened)
  const pendingTasks: BoardTask[] = pending.data ?? []
  const allTasks: LogTask[] = all.data ?? []
  const pendingError = pending.error ? describeLoadError(pending.cause, { forbiddenMessage: HR_TASKS_FORBIDDEN_MESSAGE_AR }) : null
  const allError = all.error ? describeLoadError(all.cause, { forbiddenMessage: HR_TASKS_FORBIDDEN_MESSAGE_AR }) : null

  const handleHrApprove = async (task: BoardTask) => {
    try {
      setApprovingId(task.id)
      await hrApproveTask(task.id)
      toast.success(
        `تم اعتماد المهمة بنجاح! أودعت ${task.points ?? 0} نقطة و ${task.estimated_hours ?? 0} ساعة في رصيد المتطوع.`
      )
      pending.retry()
    } catch (err: unknown) {
      toast.error(getApiMessageOr(err, 'تعذر اعتماد المهمة'))
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <HrPageShell
      title="مهام واعتمادات الموارد البشرية"
      description="مراجعة واعتماد المهام (المتوسطة، الكبيرة، والاستراتيجية) المرفوعة من مدراء الإدارات لإيداع النقاط والساعات التطوعية التراكمية."
    >
      {/* التبويبات */}
      <div className="flex items-center gap-2 mb-6" dir="rtl">
        <button
          type="button"
          onClick={() => {
            if (activeTab !== 'pending') pending.retry()
            setActiveTab('pending')
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
            activeTab === 'pending'
              ? 'bg-deepBlue text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 ring-1 ring-slate-200'
          }`}
        >
          <Award size={14} className="text-amber-400" />
          بانتظار اعتماد الموارد البشرية
          {pendingTasks.length > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
              {pendingTasks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('all')
            setAllOpened(true)
          }}
          className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${
            activeTab === 'all'
              ? 'bg-deepBlue text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 ring-1 ring-slate-200'
          }`}
        >
          سجل المهام العام
        </button>
      </div>

      {activeTab === 'pending' && (
        <div>
          {pending.loading ? (
            <p className="text-center text-xs text-slate-500 py-10">جاري تحميل المهام بانتظار الاعتماد...</p>
          ) : pendingError ? (
            <LoadErrorState error={pendingError} onRetry={pending.retry} />
          ) : pendingTasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="لا توجد مهام بانتظار الاعتماد حاليًا"
              description="جميع المهام المقيمة إما بسيطة تم اعتمادها آلياً، أو تم اعتمادها من الموارد البشرية مسبقاً."
            />
          ) : (
            <div className="space-y-4" dir="rtl">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[11px] font-black text-purple-700">
                          حجم المهمة: {task.task_scope === 'medium' ? 'متوسطة' : task.task_scope === 'large' ? 'كبيرة' : 'استراتيجية'}
                        </span>
                        <span className="text-xs text-slate-400">#{task.id}</span>
                      </div>
                      <h3 className="mt-1.5 text-base font-black text-deepBlue">{task.title}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 rounded-xl bg-customBlue/10 px-3 py-1.5 text-xs font-black text-customBlue">
                        <Sparkles size={13} />
                        {task.points ?? 0} نقطة
                      </div>
                      <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                        <Clock size={13} />
                        {task.estimated_hours ?? 0} ساعة
                      </div>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {task.description}
                    </p>
                  )}

                  {/* تقييم المدير السابق */}
                  {task.evaluation && (
                    <div className="rounded-2xl bg-amber-50/70 border border-amber-200/50 p-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-900 flex items-center gap-1.5">
                          <Star size={13} className="fill-amber-500 text-amber-500" />
                          تقييم مدير الإدارة: {task.evaluation.final_score} / 5
                        </span>
                        <span className="text-[11px] text-amber-800">
                          التسليم بالموعد: {task.evaluation.delivered_on_time}/5 · الجودة: {task.evaluation.quality_of_outputs}/5
                        </span>
                      </div>
                      {task.evaluation.feedback && (
                        <p className="text-[11px] text-amber-950 font-medium italic">
                          "{task.evaluation.feedback}"
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-xs font-bold text-slate-500 flex items-center gap-3">
                      <span>المتطوع المستحق: <strong className="text-deepBlue">{task.assigned_to?.name ?? '—'}</strong></span>
                      <span>الإدارة: <strong className="text-deepBlue">{task.department?.name ?? '—'}</strong></span>
                    </div>

                    {user?.id != null && task.assigned_to?.id === user.id ?
                      <p className="text-xs font-bold text-slate-500">هذه المهمة مسندة إليك، لذلك لا يمكنك اعتمادها.</p>
                    : <button
                      type="button"
                      disabled={approvingId === task.id}
                      onClick={() => void handleHrApprove(task)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      <Award size={14} className="text-amber-300" />
                      <span>{approvingId === task.id ? 'جاري الاعتماد...' : 'اعتماد المهمة وإيداع النقاط والساعات'}</span>
                    </button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" dir="rtl">
          {all.loading ? (
            <p className="text-center text-xs text-slate-400 py-6">جاري التحميل...</p>
          ) : allError ? (
            <LoadErrorState error={allError} onRetry={all.retry} />
          ) : allTasks.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="لا توجد مهام في السجل حاليًا" />
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-black">
                <tr>
                  <th className="p-3">المهمة</th>
                  <th className="p-3">المكلف</th>
                  <th className="p-3">الإدارة</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">النقاط</th>
                  <th className="p-3">الساعات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-deepBlue">
                {allTasks.slice(0, 30).map((t) => (
                  <tr key={t.id}>
                    <td className="p-3 font-black">{t.title}</td>
                    <td className="p-3">{t.assignee_name ?? '—'}</td>
                    <td className="p-3 text-slate-500">{t.department_name ?? (t.department_id || '—')}</td>
                    <td className="p-3">{statusLabel(t.status_key)}</td>
                    <td className="p-3 text-customBlue">{t.points ? `${t.points} ن` : '—'}</td>
                    <td className="p-3 text-emerald-700">{t.estimated_hours ? `${t.estimated_hours} س` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </HrPageShell>
  )
}
