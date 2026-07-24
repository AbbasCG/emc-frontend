import { memo, useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import type { ClassAssignmentStudent, ClassGroup } from '@/api/placementApi'
import { StudentQueueCard } from '@/components/instructor/StudentQueueCard'
import { ClassesEmptyStateMini } from './ClassesEmptyState'

type Props = {
  unassigned: ClassAssignmentStudent[]
  assigned: ClassAssignmentStudent[]
  groups: ClassGroup[]
  loading: boolean
  assigningTo: number | null
  onAssign: (student: ClassAssignmentStudent, groupId: number) => void
  selectedCourse: number | null
  queueSearch: string
  onQueueSearchChange: (q: string) => void
}

function WaitingStudentsPanelInner({
  unassigned,
  assigned,
  groups,
  loading,
  assigningTo,
  onAssign,
  selectedCourse,
  queueSearch,
  onQueueSearchChange,
}: Props) {
  const [showAssigned, setShowAssigned] = useState(false)

  const filteredUnassigned = useMemo(() => {
    const q = queueSearch.trim().toLowerCase()
    if (!q) return unassigned
    return unassigned.filter(
      (s) =>
        s.student_name.toLowerCase().includes(q) ||
        s.student_email.toLowerCase().includes(q),
    )
  }, [unassigned, queueSearch])

  return (
    <aside className="flex flex-col overflow-hidden rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="border-b border-[#0C2A4B]/[0.05] bg-[#F8FAFC] px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F28C00]/15 text-[#F28C00]">
              <Users className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[13px] font-bold text-[#0C2A4B]">طلاب بانتظار التعيين</h2>
              <p className="text-[10px] font-medium text-slate-400">توزيع حسب المستوى والسعة</p>
            </div>
          </div>
          <span className="rounded-full bg-[#F28C00]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#F28C00]">
            {unassigned.length}
          </span>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={queueSearch}
            onChange={(e) => onQueueSearchChange(e.target.value)}
            placeholder="بحث في قائمة الانتظار..."
            dir="rtl"
            className="h-9 w-full rounded-xl border border-[#0C2A4B]/10 bg-white pr-8 pl-3 text-[11px] font-semibold text-[#0C2A4B] outline-none focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/15"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-[16px] bg-slate-100" />
            ))}
          </div>
        ) : filteredUnassigned.length === 0 ? (
          <ClassesEmptyStateMini
            icon={Users}
            title={!selectedCourse ? 'اختر دورة لعرض الطلاب' : 'جميع الطلاب مُعيَّنون'}
          />
        ) : (
          <div className="space-y-2">
            {filteredUnassigned.map((s, i) => (
              <StudentQueueCard
                key={s.student_id}
                student={s}
                groups={groups}
                assigning={assigningTo}
                onAssign={(groupId) => onAssign(s, groupId)}
                priority={i === 0}
              />
            ))}
          </div>
        )}
      </div>

      {assigned.length > 0 && (
        <div className="border-t border-[#0C2A4B]/[0.05] bg-[#F8FAFC]/80 px-3 py-2">
          <button
            type="button"
            onClick={() => setShowAssigned((v) => !v)}
            className="w-full rounded-lg py-2 text-[10px] font-bold text-[#0C2A4B]/50 transition hover:bg-white hover:text-[#0C2A4B]"
          >
            {showAssigned ? 'إخفاء' : 'عرض'} الطلاب المُعيَّنين ({assigned.length})
          </button>
          {showAssigned && (
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pb-2">
              {assigned.map((s) => (
                <StudentQueueCard
                  key={s.student_id}
                  student={s}
                  groups={groups}
                  assigning={assigningTo}
                  onAssign={(groupId) => onAssign(s, groupId)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

export const WaitingStudentsPanel = memo(WaitingStudentsPanelInner)
