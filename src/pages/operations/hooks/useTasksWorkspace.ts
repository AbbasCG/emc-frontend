import { useCallback, useEffect, useState } from 'react'
import { addTaskComment, fetchTask, fetchTasks, updateTask } from '@/api/tasksApi'
import { useAuth } from '@/contexts/AuthContext'
import type { OpsTask } from '@/types/operations'

export type TasksScope = 'all' | 'mine' | 'overdue' | 'kanban'

/** Pure I/O — kept outside the hook so the effect and `reload` share it without either
 *  having to call a state-mutating callback. */
function fetchScopedTasks(scope: TasksScope): Promise<OpsTask[]> {
  const params =
    scope === 'mine'
      ? ({ scope: 'mine' } as const)
      : scope === 'overdue'
        ? ({ scope: 'overdue' } as const)
        : undefined
  return fetchTasks(params)
}

export function useTasksWorkspace(scope: TasksScope) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<OpsTask[]>([])
  const [loading, setLoading] = useState(true)
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
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await fetchScopedTasks(scope)
        if (alive) setTasks(data)
      } catch {
        if (alive) setTasks([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [scope, userId])

  /** Imperative refresh from an event handler — shows the loading state again. */
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setTasks(await fetchScopedTasks(scope))
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [scope])

  const openTask = useCallback(async (t: OpsTask) => {
    setSelected(t)
    setPanelOpen(true)
    try {
      const full = await fetchTask(t.id)
      setSelected(full)
    } catch {
      /* keep row snapshot */
    }
  }, [])

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setSelected(null)
  }, [])

  const onPatch = useCallback(
    async (patch: Partial<OpsTask>) => {
      if (!selected) return
      const id = selected.id
      setSelected((prev) => (prev ? { ...prev, ...patch } : prev))
      setTasks((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)))
      try {
        await updateTask(id, {
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
        })
      } catch {
        await reload()
      }
    },
    [selected, reload],
  )

  const onToggleChecklist = useCallback(
    async (itemId: number, done: boolean) => {
      if (!selected) return
      const checklist = (selected.checklist ?? []).map((c) =>
        c.id === itemId ? { ...c, done } : c,
      )
      const next = { ...selected, checklist }
      setSelected(next)
      setTasks((list) => list.map((x) => (x.id === selected.id ? { ...x, checklist } : x)))
      try {
        await updateTask(selected.id, {
          checklist: checklist.map((c) => ({ id: c.id, done: c.done })),
        })
      } catch {
        await reload()
      }
    },
    [selected, reload],
  )

  const onComment = useCallback(
    async (text: string) => {
      if (!selected) return
      try {
        await addTaskComment(selected.id, text)
        const full = await fetchTask(selected.id)
        setSelected(full)
        setTasks((list) => list.map((x) => (x.id === selected.id ? full : x)))
      } catch {
        setSelected({
          ...selected,
          comments: [
            ...(selected.comments ?? []),
            {
              id: Date.now(),
              author_name: 'أنت',
              body: text,
              created_at: new Date().toISOString(),
            },
          ],
        })
      }
    },
    [selected],
  )

  return {
    tasks,
    loading,
    reload,
    selected,
    panelOpen,
    openTask,
    closePanel,
    onPatch,
    onToggleChecklist,
    onComment,
  }
}
