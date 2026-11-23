import { useCallback, useState } from 'react'
import {
  hasEstimateErrors,
  mapEstimateServerErrors,
  toEstimatePayload,
  validateEstimate,
  type EstimateDraft,
  type EstimateErrors,
  type EstimatePayload,
} from '@/lib/taskEstimate'

/**
 * State + validation for a form that carries the shared points / duration fields. `check()` validates exactly
 * like the server (points required when work is being assigned) and shows the errors under the fields;
 * `fromServer(err)` maps a 422's `task_points / task_scope / estimated_hours` back onto the same fields.
 */
export function useEstimateDraft(initial: EstimateDraft | (() => EstimateDraft)) {
  const [draft, setDraft] = useState<EstimateDraft>(initial)
  const [errors, setErrors] = useState<EstimateErrors>({})

  const change = useCallback((next: EstimateDraft) => {
    setDraft(next)
    // An edit answers the message that was shown for it.
    setErrors({})
  }, [])

  /** Validate; true when the estimate is acceptable. */
  const check = useCallback(
    (required = true): boolean => {
      const found = validateEstimate(draft, { required })
      setErrors(found)

      return !hasEstimateErrors(found)
    },
    [draft],
  )

  /** Show the server's field errors; true when any of them concerned the estimate. */
  const fromServer = useCallback((err: unknown): boolean => {
    const found = mapEstimateServerErrors(err)
    if (!hasEstimateErrors(found)) return false
    setErrors(found)

    return true
  }, [])

  const payload = useCallback((opts?: { clearHours?: boolean }): EstimatePayload => toEstimatePayload(draft, opts), [draft])

  return { draft, setDraft: change, errors, check, fromServer, payload }
}
