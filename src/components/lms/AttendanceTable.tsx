import { useMemo, useState } from 'react'
import { Mail, MessageSquare, Search, X } from 'lucide-react'
import type { AttendanceRow, AttendanceStatus } from '@/types/lms'
import { cn } from '@/lib/utils'

type Props = {
  rows: AttendanceRow[]
  baseline: AttendanceRow[]
  onChange: (studentId: number, patch: { status?: AttendanceStatus | null; notes?: string | null }) => void
  disabled?: boolean
  onMarkAllPresent?: () => void
  onClearAll?: () => void
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; active: string; idle: string }[] = [
  { value: 'present', label: 'حاضر', active: 'bg-emerald-500 text-white', idle: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  { value: 'absent', label: 'غائب', active: 'bg-rose-500 text-white', idle: 'bg-rose-50 text-rose-700 hover:bg-rose-100' },
  { value: 'late', label: 'متأخر', active: 'bg-amber-500 text-white', idle: 'bg-amber-50 text-amber-800 hover:bg-amber-100' },
  { value: 'excused', label: 'معذور', active: 'bg-sky-500 text-white', idle: 'bg-sky-50 text-sky-700 hover:bg-sky-100' },
]

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
  excused: 'معذور',
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('') || '?'
}

function rowKey(r: AttendanceRow): string {
  return `${r.student_id}:${r.status ?? ''}:${r.notes ?? ''}`
}

function baselineMap(rows: AttendanceRow[]): Map<number, AttendanceRow> {
  return new Map(rows.map((r) => [r.student_id, r]))
}

export default function AttendanceTable({
  rows,
  baseline,
  onChange,
  disabled,
  onMarkAllPresent,
  onClearAll,
}: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all' | 'unset'>('all')
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(() => new Set())

  const savedById = useMemo(() => baselineMap(baseline), [baseline])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter === 'unset' && row.status) return false
      if (statusFilter !== 'all' && statusFilter !== 'unset' && row.status !== statusFilter) return false
      if (!q) return true
      return (
        row.student_name.toLowerCase().includes(q) ||
        (row.email ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, search, statusFilter])

  function isDirty(row: AttendanceRow): boolean {
    const saved = savedById.get(row.student_id)
    if (!saved) return Boolean(row.status || row.notes)
    return rowKey(row) !== rowKey(saved)
  }

  function toggleNotes(id: number) {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="space-y-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3 text-[12px] font-semibold text-[#22334A] outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-[#2691C2]/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | 'all' | 'unset')}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-[#22334A] outline-none focus:border-[#2691C2]"
            >
              <option value="all">كل الحالات</option>
              <option value="unset">بدون تحديد</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {onMarkAllPresent ?
              <button
                type="button"
                disabled={disabled}
                onClick={onMarkAllPresent}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700 disabled:opacity-50"
              >
                تحديد الكل حاضر
              </button>
            : null}
            {onClearAll ?
              <button
                type="button"
                disabled={disabled}
                onClick={onClearAll}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-[#22334A] disabled:opacity-50"
              >
                مسح الكل
              </button>
            : null}
          </div>
        </div>

        <p className="text-[11px] font-semibold text-slate-500">
          {filteredRows.length} من {rows.length} طالب
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="max-h-[min(62vh,640px)] overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-right">
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(15,23,42,0.06)]">
              <tr className="text-[10px] font-black uppercase tracking-wide text-[#22334A]/50">
                <th className="px-4 py-3 font-black">الطالب</th>
                <th className="px-3 py-3 font-black">الحالة</th>
                <th className="w-12 px-2 py-3 font-black">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const dirty = isDirty(row)
                const saved = savedById.get(row.student_id)
                const notesOpen = expandedNotes.has(row.student_id)
                return (
                  <tr
                    key={row.student_id}
                    className={cn(
                      'border-t border-slate-100 align-middle transition',
                      dirty ? 'bg-amber-50/60' : 'hover:bg-slate-50/70',
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-bl from-[#22334A] to-[#2691C2] text-[11px] font-black text-white">
                          {row.avatar_url ?
                            <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
                          : initials(row.student_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-[#22334A]">{row.student_name}</p>
                          {row.email ?
                            <p className="flex items-center gap-1 truncate text-[10px] font-semibold text-slate-500">
                              <Mail className="h-3 w-3 shrink-0" />
                              {row.email}
                            </p>
                          : null}
                          {!dirty && saved?.status ?
                            <p className="mt-0.5 text-[10px] font-bold text-emerald-600">محفوظ: {STATUS_LABEL[saved.status]}</p>
                          : dirty ?
                            <p className="mt-0.5 text-[10px] font-bold text-amber-700">تغيير غير محفوظ</p>
                          : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {STATUS_OPTIONS.map((opt) => {
                          const active = row.status === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={disabled}
                              onClick={() => onChange(row.student_id, { status: opt.value })}
                              className={cn(
                                'rounded-lg px-2.5 py-1.5 text-[10px] font-black transition disabled:opacity-50',
                                active ? opt.active : opt.idle,
                              )}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleNotes(row.student_id)}
                        className={cn(
                          'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:opacity-50',
                          notesOpen || row.notes ?
                            'border-[#2691C2]/30 bg-[#2691C2]/10 text-[#2691C2]'
                          : 'border-slate-200 text-slate-400 hover:bg-slate-50',
                        )}
                        aria-label="ملاحظات"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredRows.map((row) =>
          expandedNotes.has(row.student_id) ?
            <div key={`notes-${row.student_id}`} className="border-t border-slate-100 bg-slate-50/50 px-4 py-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled={disabled}
                  value={row.notes ?? ''}
                  onChange={(e) => onChange(row.student_id, { notes: e.target.value || null })}
                  placeholder={`ملاحظة — ${row.student_name}`}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-[#22334A] outline-none focus:border-[#2691C2]"
                />
                <button
                  type="button"
                  onClick={() => toggleNotes(row.student_id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          : null,
        )}
      </div>

      {/* Mobile compact cards */}
      <div className="divide-y divide-slate-100 md:hidden">
        {filteredRows.map((row) => {
          const dirty = isDirty(row)
          const saved = savedById.get(row.student_id)
          const notesOpen = expandedNotes.has(row.student_id)
          return (
            <div
              key={row.student_id}
              className={cn('px-4 py-3', dirty ? 'bg-amber-50/60' : '')}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-bl from-[#22334A] to-[#2691C2] text-[11px] font-black text-white">
                  {row.avatar_url ?
                    <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
                  : initials(row.student_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-black text-[#22334A]">{row.student_name}</p>
                      {row.email ?
                        <p className="truncate text-[10px] font-semibold text-slate-500" dir="ltr">{row.email}</p>
                      : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotes(row.student_id)}
                      className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {STATUS_OPTIONS.map((opt) => {
                      const active = row.status === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={disabled}
                          onClick={() => onChange(row.student_id, { status: opt.value })}
                          className={cn(
                            'rounded-lg px-2 py-1 text-[10px] font-black disabled:opacity-50',
                            active ? opt.active : opt.idle,
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>

                  {!dirty && saved?.status ?
                    <p className="mt-1 text-[10px] font-bold text-emerald-600">محفوظ: {STATUS_LABEL[saved.status]}</p>
                  : dirty ?
                    <p className="mt-1 text-[10px] font-bold text-amber-700">تغيير غير محفوظ</p>
                  : null}

                  {notesOpen ?
                    <input
                      type="text"
                      disabled={disabled}
                      value={row.notes ?? ''}
                      onChange={(e) => onChange(row.student_id, { notes: e.target.value || null })}
                      placeholder="ملاحظة…"
                      className="mt-2 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold outline-none focus:border-[#2691C2]"
                    />
                  : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredRows.length === 0 ?
        <div className="px-4 py-10 text-center text-[13px] font-semibold text-slate-400">لا توجد نتائج مطابقة</div>
      : null}
    </div>
  )
}
