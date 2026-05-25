import { useCallback, useEffect, useState } from 'react'
import { addTaskComment, fetchTask, fetchTasks, updateTask } from '@/api/tasksApi'
import { useAuth } from '@/contexts/AuthContext'
import type { OpsTask } from '@/types/operations'

export type TasksScope = 'all' | 'mine' | 'overdue' | 'kanban'

export function useTasksWorkspace(scope: TasksScope) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<OpsTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<OpsTask | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params =
        scope === 'mine'
          ? ({ scope: 'mine' } as const)
          : scope === 'overdue'
            ? ({ scope: 'overdue' } as const)
            : undefined
      const data = await fetchTasks(params)
      setTasks(data)
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [scope, user?.id])

  useEffect(() => {
    load()
  }, [load])

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
        await load()
      }
    },
    [selected, load],
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
        await load()
      }
    },
    [selected, load],
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
    reload: load,
    selected,
    panelOpen,
    openTask,
    closePanel,
    onPatch,
    onToggleChecklist,
    onComment,
  }
}
