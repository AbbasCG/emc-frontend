import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Megaphone, Sparkles, ExternalLink,
  Info, Zap, ArrowRight, Palette, Bug, Bell,
  Wrench, Shield, AlertTriangle, CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fetchWhatsNew,
  markProductUpdateRead,
  type ProductUpdate,
  type UpdateType,
} from '@/api/productUpdatesApi'

// ─── Type metadata (shared with page) ────────────────────────────────────────

type TypeMeta = { label: string; color: string; bg: string; icon: React.ElementType }

const UPDATE_TYPE_META: Partial<Record<UpdateType, TypeMeta>> = {
  information:     { label: 'معلومات',       color: 'text-slate-700',   bg: 'bg-slate-100 ring-1 ring-slate-300',    icon: Info          },
  new_feature:     { label: 'ميزة جديدة',   color: 'text-blue-700',    bg: 'bg-blue-50 ring-1 ring-blue-200',       icon: Zap           },
  improvement:     { label: 'تحسين',         color: 'text-emerald-700', bg: 'bg-emerald-50 ring-1 ring-emerald-200', icon: ArrowRight     },
  redesign:        { label: 'إعادة تصميم',  color: 'text-purple-700',  bg: 'bg-purple-50 ring-1 ring-purple-200',   icon: Palette        },
  bug_fix:         { label: 'إصلاح خطأ',    color: 'text-orange-700',  bg: 'bg-orange-50 ring-1 ring-orange-200',   icon: Bug            },
  announcement:    { label: 'إعلان عام',     color: 'text-gray-700',    bg: 'bg-gray-100 ring-1 ring-gray-300',      icon: Bell           },
  maintenance:     { label: 'صيانة',         color: 'text-amber-700',   bg: 'bg-amber-50 ring-1 ring-amber-200',     icon: Wrench         },
  security_update: { label: 'تحديث أمني',   color: 'text-red-700',     bg: 'bg-red-50 ring-1 ring-red-200',         icon: Shield         },
  action_required: { label: 'يتطلب إجراء',  color: 'text-rose-700',    bg: 'bg-rose-50 ring-1 ring-rose-200',       icon: AlertTriangle  },
  mandatory_update:{ label: 'تحديث إلزامي', color: 'text-indigo-700',  bg: 'bg-indigo-50 ring-1 ring-indigo-200',   icon: CheckCircle    },
}

const FALLBACK_TYPE_META: TypeMeta = { label: 'إعلان', color: 'text-gray-700', bg: 'bg-gray-100 ring-1 ring-gray-300', icon: Bell }

function getTypeMeta(item: ProductUpdate): TypeMeta {
  return (item.update_type ? UPDATE_TYPE_META[item.update_type] : null) ?? FALLBACK_TYPE_META
}

// ─── Local storage helpers ────────────────────────────────────────────────────

const POPUP_KEY = 'emc_whats_new_seen_ids'

function getSeenIds(): Set<number> {
  try {
    const raw = localStorage.getItem(POPUP_KEY)
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set()
  } catch { return new Set() }
}

function addSeenIds(ids: number[]) {
  try {
    const existing = getSeenIds()
    ids.forEach(id => existing.add(id))
    localStorage.setItem(POPUP_KEY, JSON.stringify([...existing]))
  } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  onOpen?: () => void
  onUnreadChange?: (count: number) => void
}

export function WhatsNewPopup({ onOpen, onUnreadChange }: Props) {
  const [items,     setItems]     = useState<ProductUpdate[]>([])
  const [visible,   setVisible]   = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  // Track which mandatory updates have been acknowledged
  const [acknowledged, setAcknowledged] = useState<Set<number>>(new Set())

  useEffect(() => {
    let cancelled = false
    fetchWhatsNew().then(data => {
      if (cancelled) return
      const seen = getSeenIds()
      const unseen = data.filter(d => !seen.has(d.id) && !d.is_read)
      if (unseen.length > 0) {
        setItems(unseen)
        setVisible(true)
        onUnreadChange?.(unseen.length)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [onUnreadChange])

  const current = items[activeIdx]
  const isMandatory = current?.update_type === 'mandatory_update'
  const currentAcknowledged = current ? acknowledged.has(current.id) : false
  const canDismiss = !isMandatory || currentAcknowledged

  const dismiss = async () => {
    if (!canDismiss) return
    setDismissed(true)
    addSeenIds(items.map(i => i.id))
    await Promise.allSettled(items.map(i => markProductUpdateRead(i.id)))
    onUnreadChange?.(0)
    setTimeout(() => { setVisible(false); setDismissed(false) }, 300)
  }

  const acknowledge = () => {
    if (!current) return
    markProductUpdateRead(current.id).catch(() => {})
    setAcknowledged(prev => new Set([...prev, current.id]))
  }

  const openDrawer = () => {
    dismiss()
    onOpen?.()
  }

  if (typeof document === 'undefined' || items.length === 0) return null
  if (!current) return null

  const tm = getTypeMeta(current)
  const TypeIcon = tm.icon

  return createPortal(
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          dir="rtl"
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="fixed bottom-6 right-6 z-[300] w-full max-w-sm overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:bottom-8 sm:right-8"
        >
          {/* Gradient top bar — changes color for mandatory */}
          <div className={cn('h-1', isMandatory
            ? 'bg-gradient-to-l from-indigo-600 via-indigo-400 to-purple-500'
            : 'bg-gradient-to-l from-customBlue via-brand-400 to-purple-500'
          )} />

          <div className="p-5">
            {/* Header row */}
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-2xl',
                  isMandatory ? 'bg-indigo-100' : 'bg-customBlue/10',
                )}>
                  <Sparkles className={cn('h-4 w-4', isMandatory ? 'text-indigo-600' : 'text-customBlue')} />
                </div>
                <div>
                  <p className={cn('text-[11px] font-black uppercase tracking-wider', isMandatory ? 'text-indigo-600' : 'text-customBlue')}>
                    {isMandatory ? 'تحديث إلزامي' : 'ما الجديد؟'}
                  </p>
                  {items.length > 1 && (
                    <p className="text-[10px] text-muted-400">{activeIdx + 1} من {items.length}</p>
                  )}
                </div>
              </div>
              {/* X button hidden for mandatory until acknowledged */}
              {canDismiss && (
                <button onClick={dismiss}
                  className="grid h-8 w-8 place-items-center rounded-xl border border-ink-100 text-muted-400 transition hover:bg-slate-50 hover:text-deepBlue">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Type badge */}
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold', tm.bg, tm.color)}>
              <TypeIcon className="h-2.5 w-2.5" />
              {tm.label}
            </span>

            {/* Content */}
            <p className="mt-2 text-sm font-black text-deepBlue">{current.title}</p>
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-600">{current.body}</p>

            {/* Mandatory notice */}
            {isMandatory && !currentAcknowledged && (
              <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 text-[11px] font-bold text-indigo-700">
                يجب عليك تأكيد قراءة هذا التحديث قبل الاستمرار.
              </div>
            )}

            {/* Image preview */}
            {current.image_url && (
              <img src={current.image_url} alt={current.title}
                className="mt-3 max-h-32 w-full rounded-xl object-cover border border-ink-100"
                onError={e => (e.currentTarget.style.display = 'none')} />
            )}

            {/* Footer: dots + actions */}
            <div className="mt-4 flex items-center justify-between gap-2">
              {items.length > 1 ? (
                <div className="flex gap-1.5">
                  {items.map((_, i) => (
                    <button key={i} onClick={() => setActiveIdx(i)}
                      className={cn('h-1.5 rounded-full transition-all', i === activeIdx ? 'w-5 bg-customBlue' : 'w-1.5 bg-ink-200')} />
                  ))}
                </div>
              ) : <span />}

              <div className="flex shrink-0 gap-2">
                {/* Mandatory: show "فهمت" button */}
                {isMandatory && !currentAcknowledged && (
                  <button onClick={acknowledge}
                    className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-700">
                    فهمت ✓
                  </button>
                )}

                {/* CTA button from update data */}
                {current.cta_url && current.cta_label && (
                  <a
                    href={current.cta_url}
                    target={current.cta_external ? '_blank' : '_self'}
                    rel={current.cta_external ? 'noopener noreferrer' : undefined}
                    onClick={() => { if (!isMandatory) dismiss() }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-customBlue px-3 py-1.5 text-xs font-bold text-white transition hover:bg-deepBlue"
                  >
                    {current.cta_label}
                    {current.cta_external && <ExternalLink className="h-2.5 w-2.5" />}
                  </a>
                )}

                {/* Standard dismiss + view all (only if not blocking mandatory) */}
                {canDismiss && (
                  <>
                    {!current.cta_url && (
                      <button onClick={dismiss}
                        className="rounded-xl border border-ink-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50">
                        إغلاق
                      </button>
                    )}
                    <button onClick={openDrawer}
                      className="flex items-center gap-1.5 rounded-xl bg-customBlue px-3 py-1.5 text-xs font-bold text-white transition hover:bg-deepBlue">
                      <Megaphone className="h-3 w-3" /> عرض الكل
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
