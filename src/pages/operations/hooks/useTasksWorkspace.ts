import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { fetchMyTasks, fetchTasks } from '@/api/tasksApi'
import { taskApiMessage } from '@/api/taskErrors'
import { MANAGEMENT_ENDPOINTS, type TaskEndpoints } from '@/api/taskEndpoints'
import { useAuth } from '@/contexts/AuthContext'
import type { OpsTask } from '@/types/operations'

interface Override {
  patch: Partial<OpsTask>
  /** The read number current when the change was made: only a LATER successful read replaces it. */
  atSeq: number
}

export type TasksScope = 'all' | 'mine' | 'overdue' | 'kanban'

/** Pure I/O — kept outside the hook so the effect and `reload` share it without either
 *  having to call a state-mutating callback. `truncated`: the server cut «mine» short. */
async function fetchScopedTasks(scope: TasksScope): Promise<{ tasks: OpsTask[]; truncated: boolean }> {
  if (scope === 'mine') {
    const mine = await fetchMyTasks()

    return { tasks: mine.tasks, truncated: mine.truncated }
  }
  const tasks = await fetchTasks(scope === 'overdue' ? { scope: 'overdue' } : undefined)

  return { tasks, truncated: false }
}

/**
 * `endpoints`: what the task drawer calls. The management pages keep the management endpoints (the default);
 * «مهامي» passes the own-only member set, which a plain member is allowed to use.
 */
export function useTasksWorkspace(scope: TasksScope, endpoints: TaskEndpoints = MANAGEMENT_ENDPOINTS) {
  const { user } = useAuth()
  const [rows, setRows] = useState<OpsTask[]>([])
  const [overrides, setOverrides] = useState<Record<number, Override>>({})
  const seq = useRef(0)
  const [loading, setLoading] = useState(true)
  /** The last load failed: the page shows it with a retry, never as an empty list. */
  const [error, setError] = useState(false)
  /** More tasks exist than the server sent («مهامي» is capped). */
  const [truncated, setTruncated] = useState(false)
  const [selected, setSelected] = useState<OpsTask | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  // Re-arm the loading state during render when the query changes (react.dev
  // "adjusting state when a prop changes"), so the new scope never paints the previous
  // scope's rows as if they were settled.
  const userId = user?.id
  const [seenQuery, setSeenQuery] = useState({ scope, userId })
  if (seenQuery.scope !== scope || seenQuery.userId !== userId) {
    setSeenQuery({ scope, userId })
    setLoading(true)
    setError(false)
  }

  /**
   * One read of the list. Reads are ORDERED: a read that started before a newer one (a poll still in flight when the
   * member accepts a task) is ignored when it finally answers, so it can never put an older state back on screen.
   * `resetOnError`: the first load / an explicit reload empties the list on failure; a quiet refresh keeps the rows.
   */
  const read = useCallback(
    async (resetOnError: boolean): Promise<boolean> => {
      const id = ++seq.current
      try {
        const data = await fetchScopedTasks(scope)
        if (id !== seq.current) return true
        setRows(data.tasks)
        setTruncated(data.truncated)
        setError(false)
        // The server has spoken after these local changes were made: it is the truth now.
        setOverrides((cur) => {
          const next: Record<number, Override> = {}
          for (const [k, v] of Object.entries(cur)) if (v.atSeq >= id) next[Number(k)] = v

          return next
        })

        return true
      } catch {
        if (id === seq.current) {
          if (resetOnError) setRows([])
          setError(true)
        }

        return false
      } finally {
        if (id === seq.current) setLoading(false)
      }
    },
    [scope],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the scope / user changed: local changes of the previous query no longer apply
    setOverrides({})
    void read(true)
  }, [read, userId])

  /** Imperative refresh from an event handler — shows the loading state again. */
  const reload = useCallback(async () => {
    setLoading(true)
    await read(true)
  }, [read])

  /**
   * Re-read the list without the loading state (the board stays on screen). On failure the rows stay and `error`
   * is raised so the page can offer a retry; resolves to whether the read succeeded.
   */
  const refresh = useCallback(() => read(false), [read])

  /** Apply a change we already know the server made (an accepted task), before the re-read confirms it. */
  const patchLocal = useCallback((id: number, patch: Partial<OpsTask>) => {
    setOverrides((cur) => ({ ...cur, [id]: { patch: { ...cur[id]?.patch, ...patch }, atSeq: seq.current } }))
  }, [])

  const tasks = useMemo(
    () => rows.map((t) => (overrides[t.id] ? { ...t, ...overrides[t.id].patch } : t)),
    [rows, overrides],
  )

  const openTask = useCallback(
    async (t: OpsTask) => {
      setSelected(t)
      setPanelOpen(true)
      try {
        const full = await endpoints.fetchOne(t.id)
        setSelected(full)
      } catch (e) {
        // The row snapshot stays on screen, and the reason is said (in Arabic), not swallowed.
        toast.error(taskApiMessage(e, 'تعذّر تحميل تفاصيل المهمة.'))
      }
    },
    [endpoints],
  )

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setSelected(null)
  }, [])

  const onPatch = useCallback(
    async (patch: Partial<OpsTask>) => {
      if (!selected) return
      const id = selected.id
      const before = selected
      setSelected((prev) => (prev ? { ...prev, ...patch } : prev))
      setRows((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)))
      try {
        await endpoints.patch(id, patch)
      } catch (e) {
        toast.error(taskApiMessage(e, 'تعذّر حفظ التغيير.'))
        setSelected((prev) => (prev && prev.id === id ? before : prev))
        await read(false)
      }
    },
    [selected, endpoints, read],
  )

  const onToggleChecklist = useCallback(
    async (itemId: number, done: boolean) => {
      if (!selected) return
      const before = selected
      const checklist = (selected.checklist ?? []).map((c) => (c.id === itemId ? { ...c, done } : c))
      setSelected({ ...selected, checklist })
      setRows((list) => list.map((x) => (x.id === selected.id ? { ...x, checklist } : x)))
      try {
        await endpoints.setChecklistItem(selected.id, itemId, done, checklist.map((c) => ({ id: c.id, done: c.done })))
      } catch (e) {
        toast.error(taskApiMessage(e, 'تعذّر تحديث بند القائمة.'))
        setSelected((prev) => (prev && prev.id === before.id ? before : prev))
        await read(false)
      }
    },
    [selected, endpoints, read],
  )

  const onComment = useCallback(
    async (text: string) => {
      if (!selected) return
      try {
        await endpoints.comment(selected.id, text)
        const full = await endpoints.fetchOne(selected.id)
        setSelected(full)
        setRows((list) => list.map((x) => (x.id === selected.id ? full : x)))
      } catch (e) {
        // Never pretend the comment was saved: say what went wrong and leave the thread as the server has it.
        toast.error(taskApiMessage(e, 'تعذّر إضافة التعليق.'))
      }
    },
    [selected, endpoints],
  )

  /** May the drawer's user edit priority / title / description (a management view), or only the stage (a member)? */
  const canEditDetails = endpoints.canEditDetails

  return {
    tasks,
    loading,
    error,
    truncated,
    reload,
    refresh,
    patchLocal,
    selected,
    panelOpen,
    openTask,
    closePanel,
    onPatch,
    onToggleChecklist,
    onComment,
    canEditDetails,
  }
}
