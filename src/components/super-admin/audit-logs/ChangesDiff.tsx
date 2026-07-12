import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ClipboardList } from 'lucide-react'
import type { AdminAuditLogEntry } from '@/types/adminAudit'
import { fieldLabel, renderValue, TIMESTAMP_SKIP } from './formatters'

export function ChangesDiffTable({ entry }: { entry: AdminAuditLogEntry }) {
  const { action, changed_fields, old_values, new_values } = entry
  const upper = action.toUpperCase()
  const isCreate = upper === 'CREATE' || upper === 'CREATED'
  const isDelete = upper === 'DELETE' || upper === 'DELETED'

  if (isCreate) {
    const vals = new_values as Record<string, unknown> | null
    if (!vals || Object.keys(vals).length === 0) {
      return (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-[12px] font-semibold text-emerald-800">
          تم إنشاء السجل
        </div>
      )
    }
    const entries = Object.entries(vals).filter(([k]) => !TIMESTAMP_SKIP.has(k))
    return (
      <div className="space-y-1">
        <p className="mb-2 text-[11px] font-black text-emerald-700">تم إنشاء السجل بالقيم التالية</p>
        <table className="w-full text-right text-[11px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="w-1/3 py-1.5 pe-3 font-black text-slate-500">الحقل</th>
              <th className="py-1.5 font-black text-emerald-700">القيمة الجديدة</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k} className="border-b border-slate-50">
                <td className="py-1.5 pe-3 font-bold text-slate-600">{fieldLabel(k)}</td>
                <td className="py-1.5">
                  <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[11px] text-emerald-900">{renderValue(v)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (isDelete) {
    const vals = old_values as Record<string, unknown> | null
    if (!vals || Object.keys(vals).length === 0) {
      return (
        <div className="rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 text-[12px] font-semibold text-red-800">
          تم حذف السجل
        </div>
      )
    }
    const entries = Object.entries(vals).filter(([k]) => !TIMESTAMP_SKIP.has(k))
    return (
      <div className="space-y-1">
        <p className="mb-2 text-[11px] font-black text-red-700">تم حذف السجل — بيانات ما قبل الحذف</p>
        <table className="w-full text-right text-[11px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="w-1/3 py-1.5 pe-3 font-black text-slate-500">الحقل</th>
              <th className="py-1.5 font-black text-red-700">القيمة المحذوفة</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k} className="border-b border-slate-50">
                <td className="py-1.5 pe-3 font-bold text-slate-600">{fieldLabel(k)}</td>
                <td className="py-1.5">
                  <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 font-mono text-[11px] text-red-900">{renderValue(v)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const oldObj = old_values as Record<string, unknown> | null
  const newObj = new_values as Record<string, unknown> | null
  let fields: string[] = []
  if (changed_fields && changed_fields.length > 0) {
    fields = changed_fields.filter((k) => !TIMESTAMP_SKIP.has(k))
  } else if (oldObj || newObj) {
    const allKeys = new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})])
    fields = [...allKeys].filter((k) => !TIMESTAMP_SKIP.has(k))
  }

  if (fields.length === 0) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-600">
        لا توجد تفاصيل تغييرات محفوظة
      </div>
    )
  }

  return (
    <table className="w-full text-right text-[11px]">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="w-1/4 py-1.5 pe-3 font-black text-slate-500">الحقل</th>
          <th className="w-[37.5%] py-1.5 pe-3 font-black text-red-700">قبل</th>
          <th className="w-[37.5%] py-1.5 font-black text-emerald-700">بعد</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((key) => {
          const oldVal = (oldObj as Record<string, unknown> | null)?.[key]
          const newVal = (newObj as Record<string, unknown> | null)?.[key]
          const changed = renderValue(oldVal) !== renderValue(newVal)
          return (
            <tr key={key} className={`border-b border-slate-50 last:border-0 ${changed ? 'bg-amber-50/40' : ''}`}>
              <td className="py-2 pe-3 font-bold text-slate-700">{fieldLabel(key)}</td>
              <td className="py-2 pe-3">
                <span className="inline-block max-w-full break-all rounded-md bg-red-50 px-2 py-0.5 font-mono text-[11px] text-red-800 ring-1 ring-red-200">
                  {renderValue(oldVal)}
                </span>
              </td>
              <td className="py-2">
                <span className="inline-block max-w-full break-all rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-800 ring-1 ring-emerald-200">
                  {renderValue(newVal)}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function ChangesAccordion({ entry }: { entry: AdminAuditLogEntry }) {
  const [open, setOpen] = useState(false)
  const hasData =
    (entry.changed_fields && entry.changed_fields.length > 0) ||
    entry.old_values != null ||
    entry.new_values != null

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-right transition hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 text-[12px] font-black text-ink-500">
          <ClipboardList className="h-4 w-4 text-brand-500" aria-hidden />
          تفاصيل التغييرات
          {hasData && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-black text-brand-600">
              {entry.changed_fields?.length ?? '—'}
            </span>
          )}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-slate-400">
          <ChevronDown className="h-4 w-4" aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="p-4">
              <ChangesDiffTable entry={entry} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
