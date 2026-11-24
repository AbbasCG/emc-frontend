import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { taskApiMessage } from '@/api/taskErrors'
import { MANAGEMENT_ENDPOINTS, MEMBER_ENDPOINTS, type TaskEndpoints } from '@/api/taskEndpoints'
import type { OpsTask } from '@/types/operations'

/**
 * The task drawer of the global board. A card only says WHICH task and whether the viewer may open it; the task itself is read
 * through the existing authorised endpoints: the own-only set for the viewer's own assignment, the management set (role-gated
 * by the server, which answers 403 to anyone else) for another person's task. Nothing from the card is trusted for the content.
 *
 * `onChanged` is called after anything the drawer saved, so the board re-reads the server's columns.
 */
export function useBoardTaskDrawer(onChanged: () => void) {
  const [selected, setSelected] = useState<OpsTask | null>(null)
  const [endpoints, setEndpoints] = useState<TaskEndpoints>(MEMBER_ENDPOINTS)
  const [open, setOpen] = useState(false)
  const openSeq = useRef(0)
  const selectedRef = useRef<OpsTask | null>(null)
  const endpointsRef = useRef<TaskEndpoints>(MEMBER_ENDPOINTS)
  useEffect(() => {
    selectedRef.current = selected
    endpointsRef.current = endpoints
  })

  /**
   * Re-read the OPEN task after something outside the drawer changed it (claim, evaluate, reassign, lock): the drawer must not
   * keep showing the old assignee or status. Same sequence as `openTask`, so a stale answer can never overwrite a newer task.
   */
  const reloadSelected = useCallback(async () => {
    const current = selectedRef.current
    if (!current) return
    const mine = ++openSeq.current
    try {
      const full = await endpointsRef.current.fetchOne(current.id)
      if (mine !== openSeq.current) return
      setSelected(full)
    } catch {
      // The drawer keeps what it shows; the board re-read already says whether the task is still there.
    }
  }, [])

  const openTask = useCallback(async (id: number, own: boolean) => {
    const ep = own ? MEMBER_ENDPOINTS : MANAGEMENT_ENDPOINTS
    const mine = ++openSeq.current
    try {
      const full = await ep.fetchOne(id)
      // Another card was opened (or the drawer closed) while this one loaded: its answer must not take the drawer over.
      if (mine !== openSeq.current) return
      setEndpoints(ep)
      setSelected(full)
      setOpen(true)
    } catch (e) {
      if (mine !== openSeq.current) return
      // The reason is said (a 403 for a task the viewer may not open is a 403), never a blank drawer.
      toast.error(taskApiMessage(e, 'تعذّر تحميل تفاصيل المهمة.'))
    }
  }, [])

  const close = useCallback(() => {
    openSeq.current++
    setOpen(false)
    setSelected(null)
  }, [])

  const onPatch = useCallback(
    async (patch: Partial<OpsTask>) => {
      if (!selected) return
      const before = selected
      setSelected({ ...selected, ...patch })
      try {
        await endpoints.patch(selected.id, patch)
        onChanged()
      } catch (e) {
        toast.error(taskApiMessage(e, 'تعذّر حفظ التغيير.'))
        setSelected((prev) => (prev && prev.id === before.id ? before : prev))
        onChanged()
      }
    },
    [selected, endpoints, onChanged],
  )

  const onToggleChecklist = useCallback(
    async (itemId: number, done: boolean) => {
      if (!selected) return
      const before = selected
      const checklist = (selected.checklist ?? []).map((c) => (c.id === itemId ? { ...c, done } : c))
      setSelected({ ...selected, checklist })
      try {
        await endpoints.setChecklistItem(selected.id, itemId, done, checklist.map((c) => ({ id: c.id, done: c.done })))
      } catch (e) {
        toast.error(taskApiMessage(e, 'تعذّر تحديث بند القائمة.'))
        setSelected((prev) => (prev && prev.id === before.id ? before : prev))
      }
    },
    [selected, endpoints],
  )

  const onComment = useCallback(
    async (text: string) => {
      if (!selected) return
      try {
        await endpoints.comment(selected.id, text)
        setSelected(await endpoints.fetchOne(selected.id))
      } catch (e) {
        toast.error(taskApiMessage(e, 'تعذّر إضافة التعليق.'))
      }
    },
    [selected, endpoints],
  )

  return { selected, open, openTask, reloadSelected, close, onPatch, onToggleChecklist, onComment, memberView: !endpoints.canEditDetails }
}
