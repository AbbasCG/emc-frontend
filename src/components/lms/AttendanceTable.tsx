import { Mail } from 'lucide-react'
import type { AttendanceRow, AttendanceStatus } from '@/types/lms'

type Props = {
  rows: AttendanceRow[]
  onChange: (studentId: number, patch: { status?: AttendanceStatus; notes?: string | null }) => void
  disabled?: boolean
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; active: string; idle: string }[] = [
  { value: 'present', label: 'حاضر',  active: 'bg-emerald-500 text-white ring-emerald-400', idle: 'bg-emerald-50 text-emerald-700 ring-emerald-100 hover:bg-emerald-100' },
  { value: 'absent',  label: 'غائب',  active: 'bg-rose-500 text-white ring-rose-400',     idle: 'bg-rose-50 text-rose-700 ring-rose-100 hover:bg-rose-100' },
  { value: 'late',    label: 'متأخر', active: 'bg-amber-500 text-white ring-amber-400',   idle: 'bg-amber-50 text-amber-800 ring-amber-100 hover:bg-amber-100' },
  { value: 'excused', label: 'معذور', active: 'bg-sky-500 text-white ring-sky-400',       idle: 'bg-sky-50 text-sky-700 ring-sky-100 hover:bg-sky-100' },
]

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('') || '?'
}

export default function AttendanceTable({ rows, onChange, disabled }: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-deepBlue/[0.04]">
      <div className="border-b border-slate-100 bg-gradient-to-l from-[#22334A]/[0.03] to-transparent px-5 py-4">
        <p className="text-[13px] font-black text-deepBlue">قائمة الطلاب</p>
        <p className="mt-0.5 text-[11px] font-semibold text-deepBlue/45">حدّد حالة الحضور لكل طالب ثم احفظ</p>
      </div>

      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.student_id} className="px-5 py-4 transition hover:bg-slate-50/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-bl from-[#22334A] to-[#2691C2] text-[13px] font-black text-white shadow-sm">
                  {row.avatar_url ?
                    <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
                  : initials(row.student_name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-black text-deepBlue">{row.student_name}</p>
                  {row.email ?
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-500" dir="ltr">
                      <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                      {row.email}
                    </p>
                  : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 lg:max-w-[360px] lg:justify-end">
                {STATUS_OPTIONS.map((opt) => {
                  const active = row.status === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange(row.student_id, { status: opt.value })}
                      className={`rounded-xl px-3 py-1.5 text-[11px] font-black ring-1 transition disabled:opacity-50 ${
                        active ? opt.active : opt.idle
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-deepBlue/40">ملاحظات</span>
              <input
                type="text"
                disabled={disabled}
                value={row.notes ?? ''}
                onChange={(e) => onChange(row.student_id, { notes: e.target.value || null })}
                placeholder="ملاحظة اختيارية..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-[12px] font-semibold text-deepBlue outline-none transition focus:border-[#2691C2] focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
