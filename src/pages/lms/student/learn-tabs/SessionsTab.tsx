import { useMemo, useState } from 'react'
import { Calendar } from 'lucide-react'
import { SessionCard, StudentCardGrid } from '@/components/lms'
import type { LmsSession } from '@/types/lms'
import SearchInput from './shared/SearchInput'
import FilterChips from './shared/FilterChips'
import EmptyHint from './shared/EmptyHint'
import { ListRowsSkeleton, ToolbarSkeleton } from './shared/Skeletons'

type StatusFilter = 'all' | 'upcoming' | 'today' | 'completed'
type TypeFilter = 'all' | 'online' | 'offline'

function tsFromSession(s: LmsSession): number {
  const raw = s.starts_at ?? s.date
  if (raw && String(raw).trim() !== '') {
    const t = Date.parse(String(raw))
    return Number.isNaN(t) ? 0 : t
  }
  return 0
}

function isToday(s: LmsSession): boolean {
  const ts = tsFromSession(s)
  if (!ts) return false
  const d = new Date(ts)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

type Props = {
  sessions: LmsSession[]
  loading: boolean
}

export default function SessionsTab({ sessions, loading }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const counts = useMemo(() => {
    const c = { all: sessions.length, upcoming: 0, today: 0, completed: 0 }
    for (const s of sessions) {
      if (s.status === 'completed') c.completed++
      else c.upcoming++
      if (isToday(s)) c.today++
    }
    return c
  }, [sessions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sessions.filter((s) => {
      if (q) {
        const hay = `${s.title ?? ''} ${s.course_name ?? ''} ${s.instructor_name ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (statusFilter === 'upcoming' && s.status === 'completed') return false
      if (statusFilter === 'completed' && s.status !== 'completed') return false
      if (statusFilter === 'today' && !isToday(s)) return false
      if (typeFilter !== 'all' && s.type !== typeFilter) return false
      return true
    }).sort((a, b) => {
      const aUpcoming = a.status !== 'completed'
      const bUpcoming = b.status !== 'completed'
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1
      return aUpcoming ? tsFromSession(a) - tsFromSession(b) : tsFromSession(b) - tsFromSession(a)
    })
  }, [sessions, search, statusFilter, typeFilter])

  const resetFilters = () => { setSearch(''); setStatusFilter('all'); setTypeFilter('all') }

  if (loading) {
    return (
      <div className="space-y-5">
        <ToolbarSkeleton />
        <ListRowsSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#0C2A4B]/[0.06] bg-gradient-to-bl from-white/95 to-orange-50/20 p-6 shadow-sm ring-1 ring-[#0C2A4B]/[0.04]">
        <div>
          <h2 className="text-xl font-black text-[#0C2A4B]">الجلسات المباشرة</h2>
          <p className="mt-1 text-[13px] font-semibold text-[#0C2A4B]/55">
            {sessions.length > 0
              ? `${counts.upcoming} قادمة · ${counts.completed} مكتملة`
              : 'سيُضيف الفريق الجلسات وروابط الانضمام هنا'}
          </p>
        </div>
        <Calendar className="h-6 w-6 text-[#F28C00]/70" />
      </div>

      {sessions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="ابحث عن جلسة..." />
          <FilterChips
            options={[
              { value: 'all', label: 'الكل', count: counts.all },
              { value: 'upcoming', label: 'قادمة', count: counts.upcoming },
              { value: 'today', label: 'اليوم', count: counts.today },
              { value: 'completed', label: 'مكتملة', count: counts.completed },
            ]}
            active={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterChips
            options={[
              { value: 'all', label: 'كل الأنواع' },
              { value: 'online', label: 'أونلاين' },
              { value: 'offline', label: 'حضوري' },
            ]}
            active={typeFilter}
            onChange={setTypeFilter}
          />
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="rounded-3xl border border-[#0C2A4B]/[0.06] bg-white/80 p-6">
          <EmptyHint
            icon={Calendar}
            title="لا توجد جلسات مطابقة للفلاتر"
            description="عندما تُنشأ الجلسات من لوحة المحتوى، ستظهر هنا مع الموعد والروابط."
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-[#0C2A4B]/[0.06] bg-white/80 p-6">
          <EmptyHint
            icon={Calendar}
            title="لا توجد جلسات مطابقة للفلاتر"
            description="جرّب تعديل البحث أو الفلاتر"
            onReset={resetFilters}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-[#0C2A4B]/45">{filtered.length} نتيجة</p>
          <StudentCardGrid>
            {filtered.map((s) => (
              <SessionCard key={s.id} session={s} showRecording joinMeetingLabel="انضم للجلسة" compact studentDateFormat />
            ))}
          </StudentCardGrid>
        </div>
      )}
    </div>
  )
}
