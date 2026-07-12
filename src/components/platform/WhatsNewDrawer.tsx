import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Megaphone, Check, RefreshCw, ExternalLink,
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

// ─── Type metadata ────────────────────────────────────────────────────────────

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

const FALLBACK_META: TypeMeta = { label: 'إعلان', color: 'text-gray-700', bg: 'bg-gray-100 ring-1 ring-gray-300', icon: Bell }

function getTypeMeta(item: ProductUpdate): TypeMeta {
  return (item.update_type ? UPDATE_TYPE_META[item.update_type] : null) ?? FALLBACK_META
}

// ─── Date helper ──────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'الآن'
  if (m < 60) return `منذ ${m} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} ساعة`
  const d = Math.floor(h / 24)
  return `منذ ${d} يوم`
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  open: boolean
  onClose: () => void
  onUnreadChange?: (count: number) => void
}

export function WhatsNewDrawer({ open, onClose, onUnreadChange }: Props) {
  const [items,    setItems]    = useState<ProductUpdate[]>([])
  const [loading,  setLoading]  = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchWhatsNew()
      setItems(data)
      const unread = data.filter(d => !d.is_read).length
      onUnreadChange?.(unread)
    } finally {
      setLoading(false)
    }
  }, [onUnreadChange])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  // Mark visible unread non-mandatory items as read after 1.5 s
  useEffect(() => {
    if (!open || items.length === 0) return
    const unreadIds = items.filter(i => !i.is_read && i.update_type !== 'mandatory_update').map(i => i.id)
    if (unreadIds.length === 0) return
    const timer = setTimeout(async () => {
      await Promise.allSettled(unreadIds.map(id => markProductUpdateRead(id)))
      setItems(prev => prev.map(i => unreadIds.includes(i.id) ? { ...i, is_read: true } : i))
      const remaining = items.filter(i => !i.is_read && !unreadIds.includes(i.id)).length
      onUnreadChange?.(remaining)
    }, 1500)
    return () => clearTimeout(timer)
  }, [open, items, onUnreadChange])

  const toggleExpand = (id: number) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            dir="rtl"
            role="dialog"
            aria-modal
            aria-label="ما الجديد؟"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed inset-y-0 right-0 z-[151] flex w-full max-w-sm flex-col bg-white shadow-[-16px_0_64px_rgba(15,23,42,0.14)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-100 bg-gradient-to-l from-white via-brand-50/40 to-white px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-customBlue/10">
                  <Megaphone className="h-4 w-4 text-customBlue" />
                </div>
                <div>
                  <h2 className="text-base font-black text-deepBlue">ما الجديد؟</h2>
                  <p className="text-[11px] font-semibold text-muted-400">آخر تحديثات المنصة</p>
                </div>
              </div>
              <button onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-xl border border-ink-100 text-deepBlue/60 transition hover:border-customBlue/30 hover:bg-brand-50 hover:text-customBlue">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-customBlue" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-400">
                  <Megaphone className="h-10 w-10 opacity-20" />
                  <p className="text-sm font-bold">لا توجد تحديثات جديدة</p>
                </div>
              ) : (
                <div className="divide-y divide-ink-100/60">
                  {items.map(item => {
                    const tm  = getTypeMeta(item)
                    const TypeIcon = tm.icon
                    const isEx = expanded.has(item.id)
                    const isMandatory = item.update_type === 'mandatory_update'

                    return (
                      <div key={item.id} className={cn(
                        'px-5 py-4 transition',
                        !item.is_read && 'bg-brand-50/50',
                        isMandatory && 'bg-indigo-50/40',
                      )}>
                        <div className="flex items-start gap-3">
                          {/* Read indicator */}
                          <div className="mt-1 shrink-0">
                            {!item.is_read
                              ? <span className="block h-2 w-2 rounded-full bg-customBlue" />
                              : <Check className="h-3.5 w-3.5 text-emerald-500" />
                            }
                          </div>

                          <div className="min-w-0 flex-1 text-right">
                            {/* Badge row */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold', tm.bg, tm.color)}>
                                <TypeIcon className="h-2.5 w-2.5" />
                                {tm.label}
                              </span>
                              {item.published_at && (
                                <span className="text-[11px] text-muted-400">{timeAgo(item.published_at)}</span>
                              )}
                            </div>

                            {/* Title */}
                            <p className="mt-1 text-sm font-bold text-deepBlue">{item.title}</p>

                            {/* Body */}
                            <p className={cn('mt-1 text-xs leading-relaxed text-muted-600 transition-all', !isEx && 'line-clamp-2')}>
                              {item.body}
                            </p>
                            {item.body.length > 120 && (
                              <button onClick={() => toggleExpand(item.id)}
                                className="mt-1 text-xs font-bold text-customBlue hover:underline">
                                {isEx ? 'أقل' : 'المزيد'}
                              </button>
                            )}

                            {/* Image */}
                            {item.image_url && isEx && (
                              <img src={item.image_url} alt={item.title}
                                className="mt-2 max-h-36 w-full rounded-xl border border-ink-100 object-cover"
                                onError={e => (e.currentTarget.style.display = 'none')} />
                            )}

                            {/* Before/after images */}
                            {(item.image_before_url || item.image_after_url) && isEx && (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {item.image_before_url && (
                                  <div>
                                    <p className="mb-1 text-[10px] text-slate-400">قبل</p>
                                    <img src={item.image_before_url} alt="before"
                                      className="rounded-lg border border-ink-100 object-cover"
                                      onError={e => (e.currentTarget.style.display = 'none')} />
                                  </div>
                                )}
                                {item.image_after_url && (
                                  <div>
                                    <p className="mb-1 text-[10px] text-emerald-600">بعد</p>
                                    <img src={item.image_after_url} alt="after"
                                      className="rounded-lg border border-ink-100 object-cover"
                                      onError={e => (e.currentTarget.style.display = 'none')} />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Maintenance window */}
                            {item.maintenance_start && item.maintenance_end && isEx && (
                              <p className="mt-1.5 text-[11px] font-bold text-amber-600">
                                وقت الصيانة: {new Date(item.maintenance_start).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} – {new Date(item.maintenance_end).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}

                            {/* Due date */}
                            {item.due_date && (
                              <p className="mt-1.5 text-[11px] font-bold text-rose-600">
                                الموعد النهائي: {new Date(item.due_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            )}

                            {/* CTA button */}
                            {item.cta_url && item.cta_label && (
                              <a
                                href={item.cta_url}
                                target={item.cta_external ? '_blank' : '_self'}
                                rel={item.cta_external ? 'noopener noreferrer' : undefined}
                                className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-customBlue/90 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-customBlue"
                              >
                                {item.cta_label}
                                {item.cta_external && <ExternalLink className="h-2.5 w-2.5" />}
                              </a>
                            )}

                            {/* Mandatory acknowledgement note */}
                            {isMandatory && !item.is_read && (
                              <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-[11px] font-bold text-indigo-700">
                                يتطلب هذا التحديث تأكيد القراءة.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
