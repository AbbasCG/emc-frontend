import { Check, CircleAlert, CloudOff, Eye, LoaderCircle, Redo2, Undo2 } from 'lucide-react'
import type { SaveStatus } from './useDraftAutosave'

const BTN = 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-40'
const NEUTRAL = `${BTN} bg-white text-deepBlue ring-1 ring-deepBlue/10 hover:bg-slate-50`

function timeOf(at: number | null): string {
  return at ? new Date(at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : ''
}

/** What the save state is, in words. "Saved" appears only once the server has confirmed what is on screen. */
export function SaveIndicator({
  status,
  issueCount,
  lastSavedAt,
  onRetry,
  decorative = false,
}: {
  status: SaveStatus
  issueCount: number
  lastSavedAt: number | null
  onRetry: () => void
  /** A visual copy (the floating pill): not announced a second time to a screen reader. */
  decorative?: boolean
}) {
  const base = 'inline-flex items-center gap-1.5 text-xs font-black'

  return (
    <div
      {...(decorative ? { 'aria-hidden': true } : { role: 'status', 'aria-live': 'polite' as const })}
      data-testid={decorative ? 'save-indicator-floating' : 'save-indicator'}
      data-status={status}
      className="min-w-0"
    >
      {status === 'saved' && (
        <span className={`${base} text-emerald-700`}>
          <Check size={14} aria-hidden />
          {lastSavedAt ? `تم الحفظ ${timeOf(lastSavedAt)}` : 'كل التغييرات محفوظة'}
        </span>
      )}
      {status === 'saving' && (
        <span className={`${base} text-slate-600`}>
          <LoaderCircle size={14} aria-hidden className="animate-spin" />
          جارٍ الحفظ...
        </span>
      )}
      {status === 'dirty' && (
        <span className={`${base} text-amber-700`}>
          <span aria-hidden className="size-2 rounded-full bg-customOrange" />
          تغييرات غير محفوظة
        </span>
      )}
      {status === 'invalid' && (
        <span className={`${base} text-amber-800`}>
          <CircleAlert size={14} aria-hidden />
          لم تُحفظ التغييرات: أكمل {issueCount} {issueCount === 1 ? 'عنصراً' : 'عناصر'} موضحة بالأحمر
        </span>
      )}
      {status === 'error' && (
        <span className={`${base} text-red-700`}>
          <CloudOff size={14} aria-hidden />
          تعذّر الحفظ
          <button type="button" onClick={onRetry} className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-black text-red-700 ring-1 ring-red-200 hover:bg-red-100">
            إعادة المحاولة
          </button>
        </span>
      )}
      {status === 'conflict' && (
        <span className={`${base} text-red-700`}>
          <CircleAlert size={14} aria-hidden />
          تعارض مع تعديل آخر: لم يُحفظ شيء
        </span>
      )}
    </div>
  )
}

export default function BuilderToolbar({
  status,
  issueCount,
  lastSavedAt,
  canUndo,
  canRedo,
  readOnly,
  onUndo,
  onRedo,
  onSave,
  onPreview,
}: {
  status: SaveStatus
  issueCount: number
  lastSavedAt: number | null
  canUndo: boolean
  canRedo: boolean
  readOnly: boolean
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onPreview: () => void
}) {
  return (
    <div role="toolbar" aria-label="أدوات المحرر" className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-2.5 text-right shadow-sm ring-1 ring-deepBlue/[0.06] backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && (
          <button type="button" onClick={onSave} disabled={status === 'saving' || status === 'saved' || status === 'conflict'} className={`${BTN} bg-customBlue text-white shadow-md hover:opacity-90`}>
            حفظ الآن
          </button>
        )}
        <button type="button" onClick={onPreview} className={NEUTRAL} data-testid="open-builder-preview">
          <Eye size={14} aria-hidden />
          معاينة مباشرة
        </button>
        {!readOnly && (
          <span className="inline-flex gap-1" role="group" aria-label="التراجع">
            <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="تراجع" title="تراجع (Ctrl+Z)" className={NEUTRAL}>
              <Undo2 size={14} aria-hidden />
              تراجع
            </button>
            <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="إعادة" title="إعادة (Ctrl+Shift+Z)" className={NEUTRAL}>
              <Redo2 size={14} aria-hidden />
              إعادة
            </button>
          </span>
        )}
      </div>
      {readOnly ? (
        <p className="text-xs font-bold text-slate-500">وضع العرض فقط</p>
      ) : (
        <SaveIndicator status={status} issueCount={issueCount} lastSavedAt={lastSavedAt} onRetry={onSave} />
      )}
    </div>
  )
}
