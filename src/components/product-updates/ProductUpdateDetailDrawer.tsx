import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  X, Megaphone, Edit2, Trash2, Send, ExternalLink, CheckCircle, Eye, ArrowLeft, Rocket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductUpdate } from '@/api/productUpdatesApi'
import {
  formatProductUpdateCount,
  formatProductUpdateDate,
  formatProductUpdateDateTime,
  formatProductUpdateTimeRange,
} from '@/utils/productUpdateFormatters'
import {
  getTypeMeta,
  ROLE_LABELS,
  PRIORITY_META,
  SEVERITY_META,
} from './productUpdateMeta'
import { StatusBadge, TypeBadge } from './ProductUpdateBadges'

type Props = {
  item: ProductUpdate | null
  onClose: () => void
  onBrowseAll: () => void
  onEdit: (item: ProductUpdate) => void
  onPublish: (item: ProductUpdate) => void
  onDelete: (item: ProductUpdate) => void
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ProductUpdateDetailDrawer({
  item,
  onClose,
  onBrowseAll,
  onEdit,
  onPublish,
  onDelete,
}: Props) {
  const reduce = useReducedMotion()
  const panelRef = useRef<HTMLElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!item) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [item, onClose])

  if (typeof document === 'undefined') return null

  const tm = item ? getTypeMeta(item) : null
  const TypeIcon = tm?.icon ?? Megaphone

  return createPortal(
    <AnimatePresence>
      {item && tm && (
        <>
          <motion.button
            type="button"
            aria-label="إغلاق تفاصيل التحديث"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="fixed inset-0 z-[200] bg-[#0F172A]/45 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-update-drawer-title"
            dir="rtl"
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed inset-y-0 right-0 z-[201] flex w-full max-w-[min(100vw,480px)] flex-col border-l border-ink-100/80 bg-white shadow-[-16px_0_48px_rgba(15,23,42,0.14)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <header className="sticky top-0 z-10 border-b border-ink-100 bg-white/95 px-5 py-4 backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-customBlue/15 to-brand-500/10 ring-1 ring-customBlue/15">
                    <TypeIcon className="h-5 w-5 text-customBlue" aria-hidden />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-customBlue">
                      ما الجديد؟
                    </p>
                    <h2 id="product-update-drawer-title" className="mt-0.5 text-base font-black text-deepBlue sm:text-lg">
                      تفاصيل تحديثات المنصة
                    </h2>
                  </div>
                </div>
                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-ink-100 text-deepBlue/70 transition hover:border-customBlue/35 hover:bg-brand-50 hover:text-customBlue focus-visible:outline focus-visible:outline-2 focus-visible:outline-customBlue/40"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </header>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge item={item} />
                <StatusBadge status={item.status} />
                {item.published_at && (
                  <span
                    className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 tabular-nums whitespace-nowrap"
                    dir="ltr"
                    style={{ unicodeBidi: 'isolate' }}
                  >
                    {formatProductUpdateDateTime(item.published_at)}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="mt-5 text-xl font-black leading-snug text-deepBlue">{item.title}</h3>

              {/* Extra meta chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                {item.reads_count > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    <Eye className="h-3 w-3" aria-hidden />
                    <span dir="ltr" className="tabular-nums" style={{ unicodeBidi: 'isolate' }}>
                      {formatProductUpdateCount(item.reads_count)}
                    </span>
                    <span>قراءة</span>
                  </span>
                )}
                {item.requires_acknowledgement && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    <CheckCircle className="h-3 w-3" aria-hidden />
                    يتطلب تأكيد
                  </span>
                )}
                {item.priority && (
                  <span className={cn('inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold', PRIORITY_META[item.priority].color)}>
                    أولوية: {PRIORITY_META[item.priority].label}
                  </span>
                )}
              </div>

              {/* Dates block */}
              {(item.published_at || item.due_date || (item.maintenance_start && item.maintenance_end)) && (
                <dl className="mt-4 space-y-2 rounded-2xl border border-ink-100 bg-slate-50/70 p-4 text-[12px]">
                  {item.published_at && (
                    <div className="flex justify-between gap-3">
                      <dt className="font-bold text-muted-500">تاريخ النشر</dt>
                      <dd className="font-semibold text-deepBlue tabular-nums" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                        {formatProductUpdateDateTime(item.published_at)}
                      </dd>
                    </div>
                  )}
                  {item.due_date && (
                    <div className="flex justify-between gap-3">
                      <dt className="font-bold text-rose-600">الموعد النهائي</dt>
                      <dd className="font-bold text-rose-600 tabular-nums" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                        {formatProductUpdateDate(item.due_date)}
                      </dd>
                    </div>
                  )}
                  {item.maintenance_start && item.maintenance_end && (
                    <div className="flex justify-between gap-3">
                      <dt className="font-bold text-amber-700">نافذة الصيانة</dt>
                      <dd className="font-bold text-amber-700 tabular-nums" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                        {formatProductUpdateTimeRange(item.maintenance_start, item.maintenance_end)}
                      </dd>
                    </div>
                  )}
                </dl>
              )}

              {/* Audience */}
              {item.target_roles && item.target_roles.length > 0 && (
                <section className="mt-5" aria-label="الجمهور المستهدف">
                  <p className="mb-2 text-xs font-black text-deepBlue">الجمهور المستهدف</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.target_roles.map((r) => (
                      <span
                        key={r}
                        className="rounded-lg bg-deepBlue/5 px-2.5 py-1 text-xs font-bold text-deepBlue ring-1 ring-deepBlue/10"
                      >
                        {ROLE_LABELS[r] ?? r}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Main content */}
              <article className="mt-5 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                <p className="whitespace-pre-wrap text-[15px] leading-[1.85] text-deepBlue/90">{item.body}</p>
              </article>

              {/* Images */}
              {item.image_url && (
                <figure className="mt-5">
                  <figcaption className="mb-2 text-xs font-black text-deepBlue">لقطة الشاشة</figcaption>
                  <img
                    src={item.image_url}
                    alt=""
                    className="w-full rounded-xl border border-ink-100 object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </figure>
              )}
              {(item.image_before_url || item.image_after_url) && (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {item.image_before_url && (
                    <figure>
                      <figcaption className="mb-1 text-xs font-bold text-slate-500">قبل</figcaption>
                      <img src={item.image_before_url} alt="" className="rounded-xl border border-ink-100 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </figure>
                  )}
                  {item.image_after_url && (
                    <figure>
                      <figcaption className="mb-1 text-xs font-bold text-emerald-600">بعد</figcaption>
                      <img src={item.image_after_url} alt="" className="rounded-xl border border-ink-100 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </figure>
                  )}
                </div>
              )}

              {/* Bug fix */}
              {(item.problem_description || item.fix_description) && (
                <div className="mt-5 space-y-3">
                  {item.problem_description && (
                    <div className="rounded-xl border border-red-100 bg-red-50/70 p-4">
                      <p className="mb-1.5 text-xs font-black text-red-700">المشكلة</p>
                      <p className="text-sm leading-relaxed text-red-800/90">{item.problem_description}</p>
                    </div>
                  )}
                  {item.fix_description && (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                      <p className="mb-1.5 text-xs font-black text-emerald-700">الإصلاح</p>
                      <p className="text-sm leading-relaxed text-emerald-800/90">{item.fix_description}</p>
                    </div>
                  )}
                  {item.affected_users && (
                    <p className="text-xs text-muted-500">
                      المتأثرون: <span className="font-bold text-deepBlue">{item.affected_users}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Maintenance services */}
              {item.affected_services && item.affected_services.length > 0 && (
                <section className="mt-5">
                  <p className="mb-2 text-xs font-black text-deepBlue">الخدمات المتأثرة</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.affected_services.map((s) => (
                      <span key={s} className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{s}</span>
                    ))}
                  </div>
                  {item.maintenance_severity && (
                    <p className={cn('mt-2 text-xs font-bold', SEVERITY_META[item.maintenance_severity].color)}>
                      خطورة: {SEVERITY_META[item.maintenance_severity].label}
                    </p>
                  )}
                </section>
              )}

              {/* Update-specific CTA */}
              {item.cta_url && (
                <div className="mt-6">
                  {item.cta_external ? (
                    <a
                      href={item.cta_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customBlue px-4 py-3 text-sm font-black text-white shadow-md shadow-customBlue/20 transition hover:bg-deepBlue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-customBlue"
                    >
                      {item.cta_label ?? 'عرض التحديث'}
                      <ExternalLink className="h-4 w-4" aria-hidden />
                    </a>
                  ) : (
                    <a
                      href={item.cta_url}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-customBlue px-4 py-3 text-sm font-black text-white shadow-md shadow-customBlue/20 transition hover:bg-deepBlue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-customBlue"
                    >
                      {item.cta_label ?? 'عرض التحديث'}
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                    </a>
                  )}
                </div>
              )}

              {item.update_type === 'mandatory_update' && (
                <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs font-bold leading-relaxed text-indigo-700">
                  هذا التحديث إلزامي — يجب على المستخدم الضغط على «فهمت» قبل الاستمرار.
                </div>
              )}

              {item.created_by && (
                <p className="mt-5 text-xs text-muted-400">
                  أنشأه: <span className="font-bold text-muted-500">{item.created_by.name}</span>
                </p>
              )}

              {/* Next action — browse all updates */}
              <section
                className="mt-8 border-t border-ink-100/90 pt-8 pb-8"
                aria-label="الإجراء التالي — عرض جميع التحديثات"
              >
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.2, ease: [0.22, 0.61, 0.36, 1] }}
                  className="overflow-hidden rounded-xl border border-ink-100/90 bg-gradient-to-br from-slate-50/95 via-white to-brand-50/40 p-5 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-deepBlue/[0.04] sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-customBlue/15 to-brand-500/10 text-customBlue ring-1 ring-customBlue/15"
                      aria-hidden
                    >
                      <Rocket className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-customBlue/80">
                        الخطوة التالية
                      </p>
                      <h4 className="mt-1.5 text-[15px] font-black leading-snug text-deepBlue">
                        استكشف جميع تحديثات المنصة
                      </h4>
                      <p className="mt-3 text-[13px] leading-[1.75] text-muted-500">
                        يمكنك استعراض جميع الميزات الجديدة والتحسينات والإصلاحات السابقة الخاصة بالمنصة.
                      </p>
                      <motion.button
                        type="button"
                        onClick={onBrowseAll}
                        whileHover={reduce ? undefined : { y: -1 }}
                        whileTap={reduce ? undefined : { scale: 0.99 }}
                        className={cn(
                          'mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-black text-white',
                          'bg-deepBlue shadow-[0_8px_20px_-8px_rgba(12,42,75,0.55)]',
                          'transition-[background-color,box-shadow] duration-200',
                          'hover:bg-[#1a2d42] hover:shadow-[0_12px_28px_-10px_rgba(12,42,75,0.6)]',
                          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deepBlue',
                        )}
                      >
                        عرض جميع تحديثات المنصة
                        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </section>
            </div>

            {/* Sticky admin footer */}
            <footer className="sticky bottom-0 border-t border-ink-100 bg-slate-50/95 px-5 py-3 backdrop-blur-md">
              <div className="flex flex-wrap gap-2" dir="rtl">
                {item.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => onPublish(item)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden />
                    نشر
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-deepBlue transition hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-customBlue/40"
                >
                  <Edit2 className="h-3.5 w-3.5" aria-hidden />
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400/50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  حذف
                </button>
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
