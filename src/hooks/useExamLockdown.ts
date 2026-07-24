import { useEffect, useRef, useState } from 'react'
import toast from '@/lib/toast'
import { logExamViolation, type ExamViolationType } from '@/api/placementApi'

const BLOCKED_SHORTCUTS: Array<{ key: string; ctrl?: boolean; shift?: boolean; label: string }> = [
  { key: 'c', ctrl: true, label: 'Ctrl+C' },
  { key: 'v', ctrl: true, label: 'Ctrl+V' },
  { key: 'x', ctrl: true, label: 'Ctrl+X' },
  { key: 'a', ctrl: true, label: 'Ctrl+A' },
  { key: 's', ctrl: true, label: 'Ctrl+S' },
  { key: 'p', ctrl: true, label: 'Ctrl+P' },
  { key: 'i', ctrl: true, shift: true, label: 'Ctrl+Shift+I' },
  { key: 'j', ctrl: true, shift: true, label: 'Ctrl+Shift+J' },
  { key: 'c', ctrl: true, shift: true, label: 'Ctrl+Shift+C' },
]

const COPY_TOAST_ID = 'exam-copy-blocked'
const FOCUS_TOAST_ID = 'exam-focus-warning'

type UseExamLockdownOptions = {
  /** Only active while true — e.g. during the 'test' phase, not on intro/result screens. */
  active: boolean
  courseId: string | number | undefined
  /** Element to fullscreen-lock; defaults to document.documentElement. */
  containerRef?: React.RefObject<HTMLElement>
  /** Max allowed fullscreen exits before onMaxExitsReached fires. Default 3. */
  maxFullscreenExits?: number
  onMaxExitsReached?: () => void
}

export type ExamLockdownState = {
  violationCount: number
  isFullscreen: boolean
  fullscreenExitCount: number
  requestFullscreen: () => Promise<void>
}

/**
 * Core exam lockdown: copy/paste/cut/right-click/selection blocking, a fixed
 * set of keyboard shortcuts, tab-switch (visibilitychange) detection, and
 * fullscreen enforcement with exit counting. Every detected event is both
 * shown to the student (toast) and logged server-side via logExamViolation.
 *
 * Deliberately does NOT attempt DevTools-open detection, screen-recording
 * detection, or multi-monitor detection — these are unreliable across real
 * browsers (window-size heuristics false-positive on legitimate zoom/DPI
 * changes, debugger-timing checks vary wildly by browser) and shipping them
 * risks penalizing honest students while giving false confidence against
 * dishonest ones. A real proctoring vendor is the correct tool for that tier.
 */
export function useExamLockdown({
  active,
  courseId,
  containerRef,
  maxFullscreenExits = 3,
  onMaxExitsReached,
}: UseExamLockdownOptions): ExamLockdownState {
  const [violationCount, setViolationCount] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0)
  const hasEnteredFullscreenRef = useRef(false)
  const maxExitsReachedRef = useRef(false)

  function report(type: ExamViolationType, meta?: Record<string, unknown>) {
    setViolationCount((c) => c + 1)
    if (courseId) void logExamViolation(courseId, type, meta)
  }

  async function requestFullscreen(): Promise<void> {
    const el = containerRef?.current ?? document.documentElement
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen()
      }
    } catch {
      // Some browsers/contexts (iframe without allow="fullscreen", user gesture
      // requirement not met) reject this — exam still proceeds, just unlocked.
    }
  }

  // ── Copy / paste / cut / right-click / selection ─────────────────────────
  useEffect(() => {
    if (!active) return

    const blockAndWarn = (e: Event, type: ExamViolationType, message: string) => {
      e.preventDefault()
      toast.warning(message, message === 'النسخ معطّل أثناء الاختبار.' ? { id: COPY_TOAST_ID } : undefined)
      report(type)
    }

    const onCopy = (e: ClipboardEvent) => blockAndWarn(e, 'copy', 'النسخ معطّل أثناء الاختبار.')
    const onCut = (e: ClipboardEvent) => blockAndWarn(e, 'cut', 'النسخ معطّل أثناء الاختبار.')
    const onPaste = (e: ClipboardEvent) => blockAndWarn(e, 'paste', 'اللصق معطّل أثناء الاختبار.')
    const onContextMenu = (e: MouseEvent) => blockAndWarn(e, 'right_click', 'النقر بالزر الأيمن معطّل أثناء الاختبار.')
    const onSelectStart = (e: Event) => e.preventDefault()
    const onDragStart = (e: DragEvent) => e.preventDefault()

    const onKeyDown = (e: KeyboardEvent) => {
      const match = BLOCKED_SHORTCUTS.find(
        (s) => s.key === e.key.toLowerCase() && Boolean(s.ctrl) === (e.ctrlKey || e.metaKey) && Boolean(s.shift) === e.shiftKey,
      )
      const isF12 = e.key === 'F12'

      if (match || isF12) {
        e.preventDefault()
        report('keyboard_shortcut', { key: match?.label ?? 'F12' })
        toast.warning('هذا الاختصار معطّل أثناء الاختبار.')
      }
    }

    document.addEventListener('copy', onCopy)
    document.addEventListener('cut', onCut)
    document.addEventListener('paste', onPaste)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('selectstart', onSelectStart)
    document.addEventListener('dragstart', onDragStart)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('cut', onCut)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('selectstart', onSelectStart)
      document.removeEventListener('dragstart', onDragStart)
      document.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, courseId])

  // ── Tab switch / window blur ──────────────────────────────────────────────
  useEffect(() => {
    if (!active) return

    const onVisibilityChange = () => {
      if (document.hidden) {
        report('tab_switch')
        toast.warning('تم رصد تبديل التبويب. يتم تسجيل هذا كمخالفة.', { id: FOCUS_TOAST_ID })
      }
    }
    const onBlur = () => report('window_blur')

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onBlur)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onBlur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, courseId])

  // ── Fullscreen enforcement ────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return

    void requestFullscreen()

    const onFullscreenChange = () => {
      const nowFullscreen = Boolean(document.fullscreenElement)
      setIsFullscreen(nowFullscreen)

      if (nowFullscreen) {
        hasEnteredFullscreenRef.current = true
        return
      }

      // Only count as an "exit" if we were previously in fullscreen — ignore
      // the initial not-yet-entered state (e.g. request rejected by the browser).
      if (!hasEnteredFullscreenRef.current) return

      setFullscreenExitCount((prev) => {
        const next = prev + 1
        report('fullscreen_exit', { exit_count: next })
        toast.warning(`تم الخروج من وضع ملء الشاشة (${next}/${maxFullscreenExits}). يرجى العودة فوراً.`)

        if (next >= maxFullscreenExits && !maxExitsReachedRef.current) {
          maxExitsReachedRef.current = true
          onMaxExitsReached?.()
        }
        return next
      })
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, courseId, maxFullscreenExits])

  return { violationCount, isFullscreen, fullscreenExitCount, requestFullscreen }
}
