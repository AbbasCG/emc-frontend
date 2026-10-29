import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Eye, FileText, Loader2, X, type LucideIcon } from 'lucide-react'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { lockBodyScroll } from '@/components/ui/modalGuard'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { BORDER, initials } from './detailModalTokens'

/**
 * The shared presentation of every EMC "detail window" (HR volunteer profile, volunteer application, AI expert
 * application, ambassador application, consultant application, partnership request).
 *
 * Presentation only. Each page keeps its own data loading, permissions and actions and hands them in as
 * `header`, `body` and `footer` content. The sizes, radius, backdrop, header, summary cards, columns, document
 * card and footer here are the HR volunteer profile's, so every window looks and behaves the same.
 */

/* ── Shell ─────────────────────────────────────────────────────────── */

export function DetailModalShell({
  onClose,
  dirty = false,
  busy = false,
  labelledBy,
  testId,
  header,
  footer,
  children,
  dirtyMessage = 'لديك تغييرات لم تُحفظ. إن أغلقت النافذة الآن ستضيع.',
}: {
  onClose: () => void
  /** Unsaved input: closing asks first. */
  dirty?: boolean
  /** Something is being sent: nothing may close the window. */
  busy?: boolean
  labelledBy: string
  testId?: string
  /** The header, or a function of the shell's own close request (which waits while busy and asks when dirty). */
  header: ReactNode | ((requestClose: () => void) => ReactNode)
  footer?: ReactNode
  children: ReactNode
  dirtyMessage?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState(false)

  const requestClose = () => {
    if (busy) return
    if (dirty) setConfirming(true)
    else onClose()
  }

  useFocusTrap(panelRef, { active: true })
  useEffect(() => lockBodyScroll(), [])

  // Escape is heard on the document so it works wherever focus is. While a nested dialog (the discard prompt, a
  // confirmation, a calendar) is open, Escape belongs to that dialog.
  const closeRef = useRef(requestClose)
  useEffect(() => {
    closeRef.current = requestClose
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('dialog[open], [data-nested-overlay]')) return
      e.preventDefault()
      closeRef.current()
    }
    document.addEventListener('keydown', onKey)

    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-detail-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      data-testid={testId ? `${testId}-overlay` : undefined}
      onMouseDown={(e) => {
        // Only a press that STARTS on the backdrop closes it, so a text selection that drifts out never does.
        if (e.target === e.currentTarget) requestClose()
      }}
    >
      <div
        ref={panelRef}
        dir="rtl"
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:my-0 sm:h-auto sm:max-h-[92vh] sm:w-[min(92vw,1450px)] sm:rounded-[20px]"
        data-testid={testId}
        aria-busy={busy || undefined}
      >
        {typeof header === 'function' ? header(requestClose) : header}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-detail-canvas">
          <div className="space-y-4 p-4 sm:p-5">{children}</div>
        </div>
        {footer ? <footer className={`shrink-0 border-t ${BORDER} bg-white px-4 py-3 sm:px-7`}>{footer}</footer> : null}
      </div>

      <ConfirmDialog
        open={confirming}
        title="تجاهل التغييرات؟"
        description={dirtyMessage}
        confirmLabel="تجاهل وإغلاق"
        cancelLabel="متابعة التحرير"
        variant="danger"
        onConfirm={() => {
          setConfirming(false)
          onClose()
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>,
    document.body,
  )
}

/* ── Header ────────────────────────────────────────────────────────── */

export function DetailHeader({
  name,
  titleId,
  badge,
  email,
  subtitle,
  avatarUrl,
  onClose,
  closeDisabled,
}: {
  name: string
  titleId: string
  badge?: ReactNode
  /** The primary contact line (email), shown left-to-right. */
  email?: string | null
  /** Extra line(s) under it: date, role, opportunity… */
  subtitle?: ReactNode
  avatarUrl?: string | null
  onClose: () => void
  closeDisabled?: boolean
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-detail-rule bg-white px-4 py-[14px] sm:px-7 sm:py-[18px]">
      <div className="flex min-w-0 items-center gap-3">
        {avatarUrl ?
          <img src={avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-detail-rule" />
        : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-customBlue/10 text-base font-black text-customBlue ring-2 ring-detail-rule" aria-hidden>
            {initials(name)}
          </div>}
        <div className="min-w-0 leading-snug">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={titleId} className="truncate text-[17px] font-black text-deepBlue sm:text-[18px]">{name}</h2>
            {badge}
          </div>
          {email ? <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-500">{email}</p> : null}
          {subtitle ? <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={closeDisabled}
        className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40 disabled:opacity-40"
        aria-label="إغلاق"
      >
        <X size={20} />
      </button>
    </header>
  )
}

/** A loading or failed state in the header's place, so the window never opens empty. */
export function DetailHeaderPlaceholder({ titleId, label, onClose }: { titleId: string; label: string; onClose: () => void }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-detail-rule bg-white px-4 py-[14px] sm:px-7 sm:py-[18px]">
      <h2 id={titleId} className="text-[17px] font-black text-deepBlue sm:text-[18px]">{label}</h2>
      <button type="button" onClick={onClose} className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-deepBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40" aria-label="إغلاق">
        <X size={20} />
      </button>
    </header>
  )
}

/* ── Summary cards ─────────────────────────────────────────────────── */

export interface SummaryItem {
  icon: LucideIcon
  label: string
  value: string | null | undefined
}

export function SummaryCards({ items, trailing }: { items: SummaryItem[]; trailing?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="mx-auto grid w-full max-w-[860px] grid-cols-2 gap-3 sm:grid-cols-4 lg:mx-0 lg:max-w-[860px]">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} data-testid="summary-metric-card" className={`flex h-[68px] items-center gap-2.5 rounded-[12px] border ${BORDER} bg-white px-4 py-3`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-customBlue/10 text-customBlue"><Icon size={15} aria-hidden /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold leading-tight text-slate-400">{label}</p>
              <p className="truncate text-[12px] font-black leading-tight text-deepBlue" dir="auto">{value?.toString().trim() || 'غير متوفر'}</p>
            </div>
          </div>
        ))}
      </div>
      {trailing ? <div className="flex shrink-0 items-center justify-center lg:justify-end">{trailing}</div> : null}
    </div>
  )
}

/* ── Columns ───────────────────────────────────────────────────────── */

/** Same proportions as the HR profile: a narrow side column and a wide main one on desktop, stacked below it. */
export function DetailColumns({ side, main }: { side: ReactNode; main: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.45fr)]" dir="ltr">
      <div className="min-w-0 space-y-4" dir="rtl">{side}</div>
      <div className="min-w-0 space-y-4" dir="rtl">{main}</div>
    </div>
  )
}

/* ── Documents ─────────────────────────────────────────────────────── */

/**
 * One uploaded document. `href` is the server-signed, time-limited link (never a public file URL); it opens in a
 * new tab only because a document preview is a file, not a detail view.
 */
export function DocumentCard({ name, meta, href, actionLabel = 'معاينة السيرة الذاتية' }: { name: string; meta?: string; href: string | null | undefined; actionLabel?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-3 rounded-[14px] border ${BORDER} bg-detail-soft p-3 sm:flex-row sm:items-center`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-customBlue ring-1 ring-detail-line"><FileText size={18} aria-hidden /></div>
        <div className="min-w-0 flex-1">
          <p dir="auto" className="truncate text-[13px] font-black text-deepBlue" title={name}>{name}</p>
          {meta ? <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{meta}</p> : null}
        </div>
      </div>
      {href ?
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-customBlue px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-customBlue/40">
          <Eye size={14} aria-hidden /> {actionLabel}
        </a>
      : null}
    </div>
  )
}

/* ── Footer ────────────────────────────────────────────────────────── */

export function DetailFooter({ start, end }: { start?: ReactNode; end?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">{start}</div>
      <div className="flex flex-wrap gap-2">{end}</div>
    </div>
  )
}

const FOOTER_BTN: Record<'primary' | 'neutral' | 'success' | 'danger', string> = {
  primary: 'bg-customOrange text-white shadow-sm hover:brightness-105 focus-visible:ring-customOrange/40',
  neutral: `border ${BORDER} bg-white text-deepBlue hover:bg-slate-50 focus-visible:ring-customBlue/30`,
  success: 'bg-emerald-600 text-white focus-visible:ring-emerald-400',
  danger: 'bg-red-600 text-white focus-visible:ring-red-400',
}

/** A button of the footer's one style set (sizes, radius, typography), in four tones. */
export function FooterButton({
  tone = 'neutral',
  icon: Icon,
  loading,
  children,
  ...rest
}: { tone?: keyof typeof FOOTER_BTN; icon?: LucideIcon; loading?: boolean; children: ReactNode } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  return (
    <button type="button" {...rest} className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-black transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${FOOTER_BTN[tone]}`}>
      {loading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : Icon ? <Icon size={14} aria-hidden /> : null}
      {children}
    </button>
  )
}

/* ── Loading / failure state ───────────────────────────────────────── */

const STATE_COPY = {
  loading: { title: 'جارٍ تحميل الطلب…', body: null },
  forbidden: { title: 'لا تملك صلاحية عرض هذا الطلب', body: 'هذا الطلب خارج نطاق صلاحياتك. تواصل مع المسؤول إن كنت تحتاجه.' },
  not_found: { title: 'الطلب غير موجود', body: 'ربما حُذف أو أن الرابط غير صحيح.' },
  error: { title: 'تعذّر تحميل الطلب', body: 'حدث خطأ أثناء جلب البيانات. حاول مرة أخرى.' },
} as const

/**
 * The window shown while a record that is not in the loaded list is being fetched, and when that fetch fails:
 * same frame, a clear message, and a way out (and a retry only where a retry can help).
 */
export function DetailStateModal({ state: loadState, onClose, onRetry, titleId = 'detail-state-title' }: { state: 'idle' | 'loading' | 'ready' | keyof typeof STATE_COPY; onClose: () => void; onRetry?: () => void; titleId?: string }) {
  // Anything that is not a failure is, from this window's point of view, still loading.
  const state: keyof typeof STATE_COPY = loadState === 'forbidden' || loadState === 'not_found' || loadState === 'error' ? loadState : 'loading'
  const copy = STATE_COPY[state]

  return (
    <DetailModalShell
      onClose={onClose}
      labelledBy={titleId}
      testId="detail-state-modal"
      header={(close) => <DetailHeaderPlaceholder titleId={titleId} label={copy.title} onClose={close} />}
      footer={
        state === 'loading' ? undefined : (
          <DetailFooter
            end={
              <>
                {state === 'error' && onRetry ? <FooterButton tone="primary" onClick={onRetry}>إعادة المحاولة</FooterButton> : null}
                <FooterButton onClick={onClose}>إغلاق</FooterButton>
              </>
            }
          />
        )
      }
    >
      {state === 'loading' ?
        <div className="space-y-3 py-6" aria-busy="true" data-testid="detail-state-loading">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/60" />)}
        </div>
      : <p role="alert" className="py-8 text-center text-[13px] font-bold text-slate-600" data-testid={`detail-state-${state}`}>{copy.body}</p>}
    </DetailModalShell>
  )
}
