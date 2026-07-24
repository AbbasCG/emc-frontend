import { useEffect, useMemo, useState } from 'react'
import {
  fetchInstructorAllPlacementTests,
  type InstructorPlacementTestRow,
  type PlacementStatus,
} from '@/api/placementApi'
import toast from '@/lib/toast'
import { BackButton } from '@/components/shared/BackButton'
import {
  PIPELINE_STAGES,
  PlacementPipelineSection,
  PlacementStudentPreviewPanel,
  PlacementTestDetailDrawer,
  PlacementTestsEmptyState,
  PlacementTestsFilterBar,
  PlacementTestsHero,
  getPipelineStage,
  type AssignmentFilter,
  type DetailDrawerTab,
  type PipelineStageId,
  type SortKey,
} from '@/components/instructor/placement-tests'

export default function InstructorPlacementTestsPage() {
  const [rows,              setRows]              = useState<InstructorPlacementTestRow[]>([])
  const [loading,           setLoading]           = useState(true)
  const [search,            setSearch]            = useState('')
  const [filterStatus,      setFilterStatus]      = useState<PlacementStatus | ''>('')
  const [filterCourse,      setFilterCourse]      = useState<number | ''>('')
  const [filterLevel,       setFilterLevel]       = useState('')
  const [filterAssignment,  setFilterAssignment]  = useState<AssignmentFilter>('')
  const [filterDate,        setFilterDate]        = useState('')
  const [sort,              setSort]              = useState<SortKey>('date_desc')
  const [previewRow,        setPreviewRow]        = useState<InstructorPlacementTestRow | null>(null)
  const [drawerRow,         setDrawerRow]         = useState<InstructorPlacementTestRow | null>(null)
  const [drawerTab,         setDrawerTab]         = useState<DetailDrawerTab>('overview')

  async function load() {
    setLoading(true)
    try { setRows(await fetchInstructorAllPlacementTests()) }
    catch (err) {
      toast.error('تعذّر تحميل نتائج اختبارات تحديد المستوى')
      if (import.meta.env.DEV) console.error('[placement-tests] load failed:', err)
    }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const courses = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of rows) {
      if (r.course_id && r.course_title) map.set(r.course_id, r.course_title)
    }
    return [...map.entries()].map(([id, title]) => ({ id, title }))
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rows.filter((r) => {
      if (q && !r.student_name.toLowerCase().includes(q) && !r.student_email.toLowerCase().includes(q) && !r.course_title.toLowerCase().includes(q)) return false
      if (filterStatus && r.status !== filterStatus) return false
      if (filterCourse && r.course_id !== filterCourse) return false
      if (filterLevel) {
        const lvl = r.final_level ?? r.written_level ?? ''
        if (!lvl.toLowerCase().includes(filterLevel.toLowerCase())) return false
      }
      if (filterAssignment === 'assigned' && !r.is_assigned) return false
      if (filterAssignment === 'unassigned' && r.is_assigned) return false
      if (filterDate && r.submitted_at && !r.submitted_at.startsWith(filterDate)) return false
      return true
    })

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.student_name.localeCompare(b.student_name, 'ar')
        case 'written':
          return (b.written_score ?? -1) - (a.written_score ?? -1)
        case 'oral':
          return (b.oral_score ?? -1) - (a.oral_score ?? -1)
        case 'date_asc':
          return (a.submitted_at ?? '').localeCompare(b.submitted_at ?? '')
        case 'date_desc':
        default:
          return (b.submitted_at ?? '').localeCompare(a.submitted_at ?? '')
      }
    })
    return list
  }, [rows, search, filterStatus, filterCourse, filterLevel, filterAssignment, filterDate, sort])

  const grouped = useMemo(() => {
    const map = new Map<PipelineStageId, InstructorPlacementTestRow[]>()
    for (const stage of PIPELINE_STAGES) map.set(stage.id, [])
    for (const row of filtered) {
      const stage = getPipelineStage(row)
      map.get(stage)!.push(row)
    }
    return map
  }, [filtered])

  const stats = useMemo(() => {
    const writtenScores = rows.map((r) => r.percentage ?? (r.written_score != null && r.total_questions ? Math.round((r.written_score / r.total_questions) * 100) : null)).filter((v): v is number => v != null)
    const oralScores = rows.map((r) => r.oral_score).filter((v): v is number => v != null)
    return {
      total: rows.length,
      waitingWritten: rows.filter((r) => getPipelineStage(r) === 'waiting_written').length,
      waitingOral: rows.filter((r) => getPipelineStage(r) === 'waiting_oral' || getPipelineStage(r) === 'written_completed').length,
      assigned: rows.filter((r) => r.is_assigned).length,
      avgWritten: writtenScores.length ? Math.round(writtenScores.reduce((a, b) => a + b, 0) / writtenScores.length) : null,
      avgOral: oralScores.length ? Math.round(oralScores.reduce((a, b) => a + b, 0) / oralScores.length) : null,
    }
  }, [rows])

  const hasActiveFilters = !!(search || filterStatus || filterCourse || filterLevel || filterAssignment || filterDate || sort !== 'date_desc')

  function clearFilters() {
    setSearch('')
    setFilterStatus('')
    setFilterCourse('')
    setFilterLevel('')
    setFilterAssignment('')
    setFilterDate('')
    setSort('date_desc')
  }

  function openDrawer(row: InstructorPlacementTestRow, tab: DetailDrawerTab = 'overview') {
    setPreviewRow(row)
    setDrawerRow(row)
    setDrawerTab(tab)
  }

  return (
    <div className="space-y-4 pb-16" dir="rtl">
      <BackButton to="/dashboard/instructor/courses" label="العودة إلى دوراتي" />
      <PlacementTestsHero stats={stats} loading={loading} onRefresh={load} refreshing={loading} />

      <PlacementTestsFilterBar
        search={search}
        onSearchChange={setSearch}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        filterCourse={filterCourse}
        onCourseChange={setFilterCourse}
        courses={courses}
        filterLevel={filterLevel}
        onLevelChange={setFilterLevel}
        filterAssignment={filterAssignment}
        onAssignmentChange={setFilterAssignment}
        filterDate={filterDate}
        onDateChange={setFilterDate}
        sort={sort}
        onSortChange={setSort}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-[16px] bg-slate-100" />)}
          </div>
          <div className="hidden h-[480px] animate-pulse rounded-[16px] bg-slate-100 xl:block" />
        </div>
      ) : filtered.length === 0 ? (
        <PlacementTestsEmptyState filtered={rows.length > 0} onRefresh={load} refreshing={loading} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-6">
            <p className="text-[11px] font-black text-deepBlue/30">
              مسار التقييم — <span className="font-mono tabular-nums">{filtered.length}</span> طالب
            </p>
            {PIPELINE_STAGES.map((stage) => (
              <PlacementPipelineSection
                key={stage.id}
                stageId={stage.id}
                rows={grouped.get(stage.id) ?? []}
                selectedId={previewRow?.student_id ?? null}
                onSelect={(r) => openDrawer(r, 'overview')}
                onViewDetails={(r) => openDrawer(r, 'overview')}
                onReviewWritten={(r) => openDrawer(r, 'written')}
                onReviewOral={(r) => openDrawer(r, 'oral')}
              />
            ))}
          </div>

          <div className="xl:hidden">
            {previewRow && (
              <PlacementStudentPreviewPanel
                row={previewRow}
                onViewDetails={() => openDrawer(previewRow, 'overview')}
              />
            )}
          </div>

          <div className="hidden xl:block">
            <PlacementStudentPreviewPanel
              row={previewRow}
              onViewDetails={() => previewRow && openDrawer(previewRow, 'overview')}
            />
          </div>
        </div>
      )}

      <PlacementTestDetailDrawer
        row={drawerRow}
        initialTab={drawerTab}
        onClose={() => setDrawerRow(null)}
      />
    </div>
  )
}
