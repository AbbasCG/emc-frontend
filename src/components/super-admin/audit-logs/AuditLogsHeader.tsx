import { motion } from 'framer-motion'
import { Download, Loader2, RefreshCw, Search, Shield, X } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import {
  ACTION_FILTER_OPTIONS,
  DATE_PRESET_OPTIONS,
  ENTITY_FILTER_OPTIONS,
  METHOD_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  type AuditLogFilterState,
} from './constants'

type Props = {
  filters: AuditLogFilterState
  loading: boolean
  onPatch: (patch: Partial<AuditLogFilterState>) => void
  onReset: () => void
  onRefresh: () => void
  onExport: () => void
  exporting: boolean
  hasActiveFilters: boolean
}

export default function AuditLogsHeader({
  loading, onRefresh, onExport, exporting,
}: Pick<Props, 'loading' | 'onRefresh' | 'onExport' | 'exporting'>) {
  return (
    <div className="relative overflow-hidden border-b border-slate-200/80 bg-white">
      <div className="pointer-events-none absolute inset-0 bg-emc-hero opacity-50" />
      <div className="relative mx-auto max-w-[1400px] px-6 py-7">
        <div className="flex items-center justify-between gap-6">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-emc-glow"
          >
            <Shield size={24} className="text-white" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 text-center">
            <h1 className="text-2xl font-black text-ink-500 sm:text-[26px]">سجلات التدقيق</h1>
            <p className="mt-1 text-sm font-medium text-muted-500">تتبع كامل لتاريخ العمليات والإجراءات داخل النظام</p>
          </motion.div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-emc-xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              تصدير
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-emc-xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              تحديث
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AuditLogsFilters({
  filters, onPatch, onReset, hasActiveFilters,
}: Pick<Props, 'filters' | 'onPatch' | 'onReset' | 'hasActiveFilters'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-20 rounded-2xl bg-white p-4 shadow-emc-xs ring-1 ring-slate-200"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-400" />
            <input
              type="text"
              dir="rtl"
              value={filters.search}
              onChange={(e) => onPatch({ search: e.target.value })}
              placeholder="بحث شامل: مستخدم، بريد، دور، إجراء، كيان، IP، مسار..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pr-9 pl-3 text-sm font-medium text-ink-500 placeholder:text-muted-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15"
            />
          </div>
          <input
            dir="rtl"
            value={filters.user}
            onChange={(e) => onPatch({ user: e.target.value })}
            placeholder="المستخدم"
            className="h-10 w-32 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm"
          />
          <input
            dir="rtl"
            value={filters.role}
            onChange={(e) => onPatch({ role: e.target.value })}
            placeholder="الدور"
            className="h-10 w-28 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select value={filters.action} onChange={(e) => onPatch({ action: e.target.value })} className="h-10 min-w-[130px] rounded-xl border border-slate-200 bg-white px-3 text-sm">
            {ACTION_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.labelAr}</option>)}
          </select>
          <select value={filters.entity_type} onChange={(e) => onPatch({ entity_type: e.target.value })} className="h-10 min-w-[130px] rounded-xl border border-slate-200 bg-white px-3 text-sm">
            {ENTITY_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.labelAr}</option>)}
          </select>
          <select value={filters.method} onChange={(e) => onPatch({ method: e.target.value })} className="h-10 min-w-[110px] rounded-xl border border-slate-200 bg-white px-3 text-sm">
            {METHOD_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.labelAr}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => onPatch({ status: e.target.value })} className="h-10 min-w-[110px] rounded-xl border border-slate-200 bg-white px-3 text-sm">
            {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.labelAr}</option>)}
          </select>
          <select value={filters.date_preset} onChange={(e) => onPatch({ date_preset: e.target.value })} className="h-10 min-w-[130px] rounded-xl border border-slate-200 bg-white px-3 text-sm">
            {DATE_PRESET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.labelAr}</option>)}
          </select>
          {filters.date_preset === 'custom' && (
            <>
              <input type="date" value={filters.date_from} onChange={(e) => onPatch({ date_from: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-2.5 text-sm" />
              <input type="date" value={filters.date_to} onChange={(e) => onPatch({ date_to: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-2.5 text-sm" />
            </>
          )}
          <input
            dir="ltr"
            value={filters.ip_address}
            onChange={(e) => onPatch({ ip_address: e.target.value })}
            placeholder="IP"
            className="h-10 w-36 rounded-xl border border-slate-200 bg-slate-50/60 px-3 font-mono text-sm"
          />
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.button
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                type="button"
                onClick={onReset}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <X size={13} />
                إعادة تعيين
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
