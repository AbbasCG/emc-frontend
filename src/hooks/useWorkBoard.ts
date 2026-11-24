import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchWorkBoard, type WorkBoardKindFilter, type WorkBoardMeta, type WorkBoardParams, type WorkBoardScope } from '@/api/operationsWorkBoardApi'
import { httpStatus, isCancelled } from '@/services/ticketOpsService'
import type { MyWorkColumnKey } from '@/lib/myWorkColumns'
import { WORK_BOARD_MAX_REFRESH, WORK_BOARD_PAGE_SIZE, appendColumnPage, columnsFromRead, dedupeBoard, emptyColumns, refreshSize, type BoardColumns } from '@/lib/workBoard'

export interface WorkBoardQuery {
  scope: WorkBoardScope
  kind: WorkBoardKindFilter
  departmentId: number | null
  search: string
}

/**
 * The ONE data source of the global board: the eight columns, the server's counts, «load more» per column, and a quiet
 * refresh. It never decides a card's column and never recomputes a total: `meta.counts` and each column's `count` are the
 * server's, kept from the latest answer (also a «load more» answer, which carries the board totals too).
 *
 *  - a query change aborts the request in flight, CLEARS the old query's cards and error at once (a board for «mine» never
 *    shows everyone's cards while the new read is on its way) and starts over; a late answer can never overwrite a newer one;
 *  - `refresh()` re-reads without the loading state, asking for whole pages that cover what is already on screen, and each
 *    column remembers how many pages that is, so the next «load more» returns NEW rows;
 *  - a failed quiet read keeps the cards that are on screen and raises `error`; `reload()` is the explicit start-over.
 */
export function useWorkBoard(query: WorkBoardQuery) {
  const [columns, setColumns] = useState<BoardColumns>(emptyColumns)
  const [meta, setMeta] = useState<WorkBoardMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ status: number | null } | null>(null)
  const [loadingMore, setLoadingMore] = useState<MyWorkColumnKey | null>(null)
  const seq = useRef(0)
  const columnsRef = useRef(columns)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    columnsRef.current = columns
  })

  const params = useMemo<WorkBoardParams>(
    () => ({
      scope: query.scope,
      kind: query.kind,
      ...(query.departmentId ? { department_id: query.departmentId } : {}),
      ...(query.search.trim() ? { search: query.search.trim().slice(0, 100) } : {}),
    }),
    [query.scope, query.kind, query.departmentId, query.search],
  )

  /** `reset`: a new query (or an explicit reload) shows the loading state and replaces every card. */
  const read = useCallback(
    async (reset: boolean) => {
      const id = ++seq.current
      abort.current?.abort()
      const controller = new AbortController()
      abort.current = controller
      if (reset) {
        // The previous query's cards, totals and error are not this query's: gone before the new answer arrives.
        setColumns(emptyColumns())
        setMeta(null)
        setError(null)
        setLoading(true)
      }
      try {
        const per = reset ? WORK_BOARD_PAGE_SIZE : refreshSize(columnsRef.current, WORK_BOARD_PAGE_SIZE, WORK_BOARD_MAX_REFRESH)
        const res = await fetchWorkBoard({ ...params, per_column: per }, { signal: controller.signal })
        if (id !== seq.current) return
        setColumns(columnsFromRead(res.columns, per))
        setMeta(res.meta)
        setError(null)
      } catch (e) {
        if (id !== seq.current || isCancelled(e)) return
        setError({ status: httpStatus(e) })
      } finally {
        if (id === seq.current) setLoading(false)
      }
    },
    [params],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new query starts a new read; the loader owns the loading state
    void read(true)

    return () => abort.current?.abort()
  }, [read])

  const refresh = useCallback(() => read(false), [read])
  const reload = useCallback(() => read(true), [read])

  /** The next page of ONE column (`column` + `page`), appended after the cards already there. */
  const loadMore = useCallback(
    async (column: MyWorkColumnKey) => {
      const current = columnsRef.current[column]
      if (!current.hasMore || loadingMore !== null) return
      const id = seq.current
      const page = current.page + 1
      setLoadingMore(column)
      try {
        const res = await fetchWorkBoard({ ...params, per_column: WORK_BOARD_PAGE_SIZE, column, page })
        // The query changed (or a refresh replaced the board) while this page was on its way: it no longer belongs here.
        if (id !== seq.current) return
        const col = res.columns.find((c) => c.key === column)
        if (col) setColumns((cols) => appendColumnPage(cols, col, page))
        setMeta((m) => (m ? { ...m, counts: res.meta.counts, generated_at: res.meta.generated_at } : res.meta))
        setError(null)
      } catch (e) {
        // A failure of a page that no longer belongs to this query says nothing about the current one.
        if (id === seq.current && !isCancelled(e)) setError({ status: httpStatus(e) })
      } finally {
        setLoadingMore((c) => (c === column ? null : c))
      }
    },
    [params, loadingMore],
  )

  const board = useMemo(() => dedupeBoard(columns), [columns])

  return { columns: board, meta, loading, error, loadingMore, refresh, reload, loadMore, params }
}
