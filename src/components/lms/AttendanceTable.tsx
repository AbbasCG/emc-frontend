import type { AttendanceRow, AttendanceStatus } from '@/types/lms'

type Props = {
  rows: AttendanceRow[]
  onChange: (studentId: number, status: AttendanceStatus) => void
  disabled?: boolean
}

const options: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'حاضر' },
  { value: 'absent', label: 'غائب' },
  { value: 'late', label: 'متأخر' },
  { value: 'excused', label: 'معذور' },
]

export default function AttendanceTable({ rows, onChange, disabled }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-deepBlue/[0.06]">
      <table className="w-full min-w-[520px] border-collapse text-right text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-deepBlue/[0.03]">
            <th className="px-4 py-3 font-black text-deepBlue">الطالب</th>
            <th className="px-4 py-3 font-black text-deepBlue">البريد</th>
            <th className="px-4 py-3 font-black text-deepBlue">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.student_id} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-3 font-bold text-deepBlue">{row.student_name}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{row.email ?? '—'}</td>
              <td className="px-4 py-3">
                <select
                  disabled={disabled}
                  value={row.status ?? ''}
                  onChange={(e) => onChange(row.student_id, e.target.value as AttendanceStatus)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-deepBlue outline-none focus:border-customBlue"
                >
                  <option value="">— اختر —</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
