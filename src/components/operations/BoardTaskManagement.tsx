import { useMemo, useState } from 'react'
import { Lock, LockOpen, Pencil, Star, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { claimTask, lockTask, unlockTask } from '@/api/operationsBoardApi'
import type { WorkBoardCard } from '@/api/operationsWorkBoardApi'
import { taskApiMessage } from '@/api/taskErrors'
import TaskEvaluationModal from '@/components/operations/TaskEvaluationModal'
import { cardToBoardTask } from '@/lib/workBoard'
import type { OpsTask } from '@/types/operations'

/**
 * The management actions of a TASK, offered inside the task's own drawer, never on a board card: a card is a public, read-only view.
 * Each button is a call to the endpoint that already guards it (the server answers 403 to anyone who may not); the card only
 * supplies what the dialogs show.
 *
 *  - lock, evaluate, claim: only for the roles the old board offered them to (`canManage`);
 *  - «تعديل المهمة» and the reassign action: only when the SERVER says so for this task (`capabilities.can_edit` /
 *    `can_reassign`: the viewer holds the permission, the task is in their scope and it is not locked), whatever the role.
 *    Their dialogs belong to the page (the board's cards offer the same two actions), so this only asks the page to open them.
 */
export default function BoardTaskManagement({
  card,
  detail,
  canManage,
  onChanged,
  onEdit,
  onReassign,
}: {
  card: WorkBoardCard
  /** The task as the drawer loaded it: the evaluation dialog also needs what a public card never carries. */
  detail?: OpsTask | null
  /** The old role check: lock / unlock, evaluate, claim. */
  canManage: boolean
  onChanged: () => void
  onEdit: (card: WorkBoardCard) => void
  onReassign: (card: WorkBoardCard) => void
}) {
  const [busy, setBusy] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  // One object per card/detail, so the reassign dialog does not re-read the department's members on every board refresh.
  const task = useMemo(() => cardToBoardTask(card, detail), [card, detail])
  const unassigned = card.assignee === null
  const declined = card.acceptance === 'rejected'

  const run = async (call: () => Promise<void>, ok: string, fail: string) => {
    if (busy) return
    setBusy(true)
    try {
      await call()
      toast.success(ok)
      onChanged()
    } catch (e) {
      toast.error(taskApiMessage(e, fail))
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const btn = 'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition disabled:opacity-60'

  return (
    <section className="text-right" data-testid="board-task-management" aria-label="إجراءات الإدارة">
      <h4 className="text-xs font-black text-slate-400">إجراءات الإدارة</h4>
      <div className="mt-2 flex flex-wrap gap-2">
        {canManage ?
        <button
          type="button"
          disabled={busy}
          onClick={() => void (card.is_locked ? run(() => unlockTask(card.id), 'فُتحت المهمة', 'تعذر تغيير حالة القفل') : run(() => lockTask(card.id), 'قُفلت المهمة', 'تعذر تغيير حالة القفل'))}
          className={`${btn} border-slate-200 text-deepBlue hover:border-customBlue`}
        >
          {card.is_locked ? <LockOpen size={13} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}
          {card.is_locked ? 'فتح المهمة' : 'قفل المهمة (تسليم نهائي)'}
        </button>
        : null}

        {canManage && card.status === 'needs_evaluation' ?
          <button type="button" disabled={busy} onClick={() => setEvaluating(true)} className={`${btn} border-amber-500 bg-amber-500 text-white hover:bg-amber-600`}>
            <Star size={13} className="fill-white" aria-hidden="true" />
            تقييم واعتماد المهمة
          </button>
        : null}

        {canManage && unassigned ?
          <button type="button" disabled={busy} onClick={() => void run(() => claimTask(card.id), 'تم استلام المهمة وتعيينها لك بنجاح', 'تعذر استلام المهمة')} className={`${btn} border-customBlue/30 bg-customBlue/10 text-customBlue`}>
            استلام المهمة لنفسي
          </button>
        : null}

        {card.capabilities.can_edit ?
          <button type="button" disabled={busy} onClick={() => onEdit(card)} className={`${btn} border-slate-200 text-deepBlue hover:border-customBlue`}>
            <Pencil size={13} aria-hidden="true" />
            تعديل المهمة
          </button>
        : null}

        {card.capabilities.can_reassign ?
          <button type="button" disabled={busy} onClick={() => onReassign(card)} className={`${btn} border-slate-200 text-slate-700 hover:bg-slate-50`}>
            <UserPlus size={13} aria-hidden="true" />
            {unassigned ? 'إسناد لعضو' : declined ? 'إعادة توجيه لعضو آخر' : 'إعادة إسناد'}
          </button>
        : null}
      </div>

      <TaskEvaluationModal task={task} open={evaluating} onClose={() => setEvaluating(false)} onEvaluated={onChanged} />
    </section>
  )
}
