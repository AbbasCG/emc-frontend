import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DraftConflictError, bodyOf, parseFormSaveError } from '@/api/formsApi'
import type { DraftSaveOptions } from '@/api/formsApi'
import type { OpsFormDefinition } from '@/types/operations'
import { docFromForm, toDraftPayload } from './builderDoc'
import type { BuilderDoc } from './builderDoc'

/**
 * Saving the draft, by hand or automatically.
 *
 * - "Saved" is only ever shown after the server answered success for exactly what is on screen. What is on screen is compared
 *   with what was last stored by a signature of the content (not by object identity), so undoing back to the saved state is
 *   "saved" again and a save never makes the document look edited.
 * - A change is stored after a quiet moment (`delay`), not on every keystroke. A document with a block that the server would
 *   refuse (an empty question, a choice question with no choices) is not sent: the status says so and what to fix.
 * - A failed save keeps the document as it is, says why, and tries again by itself for network and server trouble (never for a
 *   refusal such as 403 or 422, which another identical request cannot fix). The editor can retry at any time.
 * - Two editors: every save carries the draft revision the editor started from. If the draft moved on, the server answers 409 and
 *   nothing is written; the hook stops saving and exposes the current draft so the editor chooses between loading it and saving
 *   its own version over it. It never overwrites on its own.
 */

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'invalid' | 'conflict'

export type SaveFailure = {
  message: string
  /** Server errors per block (by block key) and for the title. */
  blockErrors: Record<string, string>
  fieldErrors: Record<string, string>
  /** Network trouble or a server fault: another attempt may well succeed. */
  retryable: boolean
  attempts: number
  /** The content that failed, so editing again counts as a fresh attempt. */
  signature: string
}

const RETRY_DELAYS_MS = [4000, 12000, 30000]

/** What identifies the content of a document. Stored ids are left out: saving gives blocks ids but changes no content. */
export function signatureOf(doc: BuilderDoc): string {
  const payload = toDraftPayload(doc)
  // A rule names blocks by id, and a block gets its id by being saved: name them by position here, so saving never makes the
  // document look edited.
  const position = new Map(payload.questions.map((q, i) => [q.id, i]))

  return JSON.stringify({
    ...payload,
    questions: payload.questions.map(({ id: _id, logic, ...rest }) => ({
      ...rest,
      ...(logic ? { logic: { ...logic, conditions: logic.conditions.map((c) => ({ ...c, question: position.get(c.question) ?? -1 })) } } : { logic: null }),
    })),
  })
}

type Options = {
  doc: BuilderDoc
  /** Number of blocks the server would refuse right now. */
  issueCount: number
  initialRevision: number | undefined
  /** Stores the draft. Must throw `DraftConflictError` for a 409 and any other error as it is. */
  save: (payload: Pick<OpsFormDefinition, 'title' | 'description' | 'form_type' | 'questions' | 'flow'>, options: DraftSaveOptions) => Promise<OpsFormDefinition>
  /** The server stored the draft: the keys sent, in order, line up with `form.questions`. */
  onSaved: (form: OpsFormDefinition, sentKeys: string[]) => void
  /** The editor chose to take the other person's draft. */
  onLoadLatest: (form: OpsFormDefinition) => void
  enabled?: boolean
  delay?: number
}

export function useDraftAutosave({ doc, issueCount, initialRevision, save, onSaved, onLoadLatest, enabled = true, delay = 1500 }: Options) {
  const signature = useMemo(() => signatureOf(doc), [doc])
  const [savedSignature, setSavedSignature] = useState(signature)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<SaveFailure | null>(null)
  const [conflict, setConflict] = useState<OpsFormDefinition | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const latest = useRef({ doc, signature, savedSignature, issueCount, conflict, enabled })
  const revision = useRef<number | undefined>(initialRevision)
  const inFlight = useRef(false)
  const attempts = useRef(0)

  // The callbacks are read through a ref so `run` keeps one identity: the unmount flush below must not fire on re-render.
  const callbacks = useRef({ save, onSaved, onLoadLatest })

  useEffect(() => {
    latest.current = { doc, signature, savedSignature, issueCount, conflict, enabled }
    callbacks.current = { save, onSaved, onLoadLatest }
  })

  const run = useCallback(
    async (force = false): Promise<boolean> => {
      if (inFlight.current) return false
      const snapshot = latest.current.doc
      const sent = signatureOf(snapshot)
      const keys = snapshot.blocks.map((b) => b.key)
      inFlight.current = true
      setSaving(true)
      try {
        const form = await callbacks.current.save(toDraftPayload(snapshot), { baseRevision: revision.current, force })
        revision.current = form.draft_revision ?? revision.current
        attempts.current = 0
        setSavedSignature(sent)
        setFailure(null)
        setConflict(null)
        setLastSavedAt(Date.now())
        callbacks.current.onSaved(form, keys)

        return true
      } catch (error) {
        if (error instanceof DraftConflictError) {
          setConflict(error.current)

          return false
        }
        const { status } = bodyOf(error)
        const parsed = parseFormSaveError(error)
        const blockErrors: Record<string, string> = {}
        for (const [position, message] of Object.entries(parsed.questionErrors)) {
          const key = keys[Number(position)]
          if (key) blockErrors[key] = message
        }
        attempts.current += 1
        setFailure({
          message: parsed.message,
          blockErrors,
          fieldErrors: parsed.fieldErrors,
          retryable: status === null || status >= 500,
          attempts: attempts.current,
          signature: sent,
        })

        return false
      } finally {
        inFlight.current = false
        setSaving(false)
      }
    },
    [],
  )

  // Store a change after a quiet moment.
  const failedHere = failure !== null && failure.signature === signature
  useEffect(() => {
    if (!enabled || conflict || saving || signature === savedSignature || issueCount > 0 || failedHere) return
    const timer = setTimeout(() => void run(), delay)

    return () => clearTimeout(timer)
  }, [enabled, conflict, saving, signature, savedSignature, issueCount, failedHere, delay, run])

  // Try again by itself after network or server trouble, a few times, with growing pauses.
  useEffect(() => {
    if (!failure || !failure.retryable || conflict || saving || failure.attempts > RETRY_DELAYS_MS.length || !failedHere) return
    const timer = setTimeout(() => void run(), RETRY_DELAYS_MS[failure.attempts - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1])

    return () => clearTimeout(timer)
  }, [failure, failedHere, conflict, saving, run])

  const dirty = signature !== savedSignature
  const status: SaveStatus = conflict ? 'conflict' : saving ? 'saving' : failedHere ? 'error' : !dirty ? 'saved' : issueCount > 0 ? 'invalid' : 'dirty'

  // Leaving the page, or hiding the tab, with something unsaved: store it now, and warn before a hard leave.
  useEffect(() => {
    const flush = () => {
      const s = latest.current
      if (s.enabled && !s.conflict && s.signature !== s.savedSignature && s.issueCount === 0) void run()
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    const onOnline = () => flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('online', onOnline)

    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('online', onOnline)
      flush()
    }
  }, [run])

  useEffect(() => {
    if (status === 'saved') return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)

    return () => window.removeEventListener('beforeunload', warn)
  }, [status])

  const saveNow = useCallback(() => {
    // A document the server would refuse is not sent, by hand or by itself; the status says what to fix.
    if (latest.current.issueCount > 0) return Promise.resolve(false)
    attempts.current = 0
    setFailure(null)

    return run()
  }, [run])

  /** Takes the other person's draft and drops this editor's unsaved changes (the caller confirms first). */
  const loadLatest = useCallback(() => {
    const current = latest.current.conflict
    if (!current) return
    revision.current = current.draft_revision
    setSavedSignature(signatureOf(docFromForm(current)))
    setConflict(null)
    setFailure(null)
    callbacks.current.onLoadLatest(current)
  }, [])

  /** Saves this editor's version over the other person's, on purpose. */
  const overwrite = useCallback(() => {
    const current = latest.current.conflict
    if (current) revision.current = current.draft_revision
    setConflict(null)

    return run(true)
  }, [run])

  return { status, failure, conflict, lastSavedAt, saveNow, loadLatest, overwrite, saving }
}
