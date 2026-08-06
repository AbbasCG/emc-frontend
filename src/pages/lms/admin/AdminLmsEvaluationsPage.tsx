import { useCallback, useEffect, useMemo, useState } from 'react'
import { Star, FileSearch, BarChart3 } from 'lucide-react'
import { adminListEvaluations } from '@/api/adminLmsApi'
import AdminLmsShell from '@/components/lms/AdminLmsShell'
import { LmsEmptyState } from '@/components/lms'
import { LmsFilterBar, LmsDataPanel, countActiveFilters, lmsSelectClass } from '@/components/lms/management'
import { fmtDate, normCourseTitle, fmtNum } from '@/components/lms/lmsFormatters'
import EmcDatePicker from '@/components/ui/EmcDatePicker'

type EvaluationRow = {
  id: number
  user_id?: number | null
  course_id?: number | null
  label?: string | null
  title?: string | null
  subtitle?: string | null
  course_title?: string | null
  course_name?: string | null
  student_name?: string | null
  rating?: number | null
  content_quality?: number | null
  instructor_quality?: number | null
  organization_quality?: number | null
  score?: number | null
  comment?: string | null
  status?: string | null
  submitted_at?: string | null
  updated_at?: string | null
}

function normEval(r: EvaluationRow): EvaluationRow {
  return {
    ...r,
    title:        r.title ?? r.label,
    course_title: normCourseTitle(r.course_title ?? r.course_name),
    student_name: r.student_name ?? r.subtitle,
  }
}

function StarRow({ n }: { n: number }) {
  const stars = Math.round(Math.min(5, Math.max(0, n)))
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < stars ? 'fill-customOrange text-customOrange' : 'text-slate-200'}
          strokeWidth={1.5}
        />
      ))}
      <span className="mr-1 text-[11px] font-black text-deepBlue/50 font-latin">{stars}/5</span>
    </div>
  )
}

function avgField(rows: EvaluationRow[], field: keyof EvaluationRow): number {
  const vals = rows.map((r) => Number(r[field] ?? 0)).filter(Boolean)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

export default function AdminLmsEvaluationsPage() {
  const [rows, setRows] = useState<EvaluationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminListEvaluations()
      .then((list) => setRows((list as EvaluationRow[]).map(normEval)))
      .catch(() => setError('تعذّر تحميل التقييمات. تحقق من الاتصال وأعد المحاولة.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const courseOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = [{ value: '', label: 'كل الدورات' }]
    for (const r of rows) {
      const key = String(r.course_id ?? '')
      const label = r.course_title ?? ''
      if (key && label && label !== 'دورة غير مرتبطة' && !seen.has(key)) {
        seen.add(key)
        opts.push({ value: key, label })
      }
    }
    return opts
  }, [rows])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (r.course_title ?? '').toLowerCase().includes(q)
      || (r.student_name ?? '').toLowerCase().includes(q)
      || (r.comment ?? '').toLowerCase().includes(q)
    const matchCourse = !filterCourse || String(r.course_id ?? '') === filterCourse
    const submitted = (r.submitted_at ?? r.updated_at ?? '').slice(0, 10)
    const matchDateFrom = !dateFrom || submitted >= dateFrom
    const matchDateTo = !dateTo || submitted <= dateTo
    return matchSearch && matchCourse && matchDateFrom && matchDateTo
  })

  const total     = rows.length
  const rated     = rows.filter((r) => r.rating != null || r.score != null).length
  const avgRating = avgField(rows, 'rating') || avgField(rows, 'score')
  const avgLabel  = avgRating > 0 ? avgRating.toFixed(1) : '—'

  const activeCount = countActiveFilters([search, filterCourse, dateFrom, dateTo])

  function clearFilters() {
    setSearch('')
    setFilterCourse('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <AdminLmsShell
      title="إدارة التقييمات"
      description="استطلاعات وتقييمات المتعلمين بعد إكمال الدورات"
      breadcrumb="التقييمات"
      kpis={[
        { label: 'إجمالي التقييمات', value: fmtNum(total),   icon: Star,       variant: 'brand'   },
        { label: 'مع تقييم رقمي',    value: fmtNum(rated),   icon: Star,       variant: 'accent'  },
        { label: 'متوسط التقييم',    value: avgLabel,         icon: BarChart3,  variant: 'success' },
        { label: 'الدورات المُقيَّمة', value: fmtNum(courseOptions.length - 1), icon: FileSearch, variant: 'muted' },
      ]}
      loading={loading}
      error={error}
      onRetry={load}
      onRefresh={load}
    >
      <LmsFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالدورة أو اسم المتعلم أو التعليق…"
        activeFilterCount={activeCount}
        resultCount={filtered.length}
        totalCount={total}
        onReset={clearFilters}
        secondary={
          <>
            {courseOptions.length > 1 ?
              <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={lmsSelectClass()}>
                {courseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            : null}
            <EmcDatePicker label="من تاريخ" value={dateFrom} onChange={(v) => setDateFrom(v)} />
            <EmcDatePicker label="إلى تاريخ" value={dateTo} onChange={(v) => setDateTo(v)} />
          </>
        }
      />

      {!loading && (
        filtered.length === 0 ?
          <LmsEmptyState
            icon={Star}
            title="لا توجد تقييمات"
            description={
              activeCount > 0
                ? 'جرّب تغيير معايير البحث أو مسح الفلاتر.'
                : 'ستظهر تقييمات المتعلمين هنا بمجرد إكمال الدورات وتقديم الاستطلاعات.'
            }
          />
        : (
          <LmsDataPanel footer={`عرض ${fmtNum(filtered.length)} من ${fmtNum(total)} تقييم`}>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-deepBlue/[0.05] bg-deepBlue/[0.02]">
                    <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-deepBlue/40">الدورة</th>
                    <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-deepBlue/40">المتعلم</th>
                    <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-deepBlue/40">التقييم العام</th>
                    <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-deepBlue/40">جودة المحتوى</th>
                    <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-deepBlue/40">جودة المدرب</th>
                    <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-deepBlue/40">التنظيم</th>
                    <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wide text-deepBlue/40">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deepBlue/[0.04]">
                  {filtered.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-deepBlue/[0.015]">
                      <td className="px-5 py-4">
                        <p className="font-bold text-deepBlue line-clamp-1">{r.course_title ?? '—'}</p>
                        {r.comment && (
                          <p className="mt-0.5 text-[11px] font-medium text-deepBlue/40 line-clamp-1">{r.comment}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-deepBlue/70">{r.student_name ?? '—'}</td>
                      <td className="px-5 py-4">
                        {r.rating != null
                          ? <StarRow n={r.rating} />
                          : r.score != null
                            ? <span className="font-black text-deepBlue/70 font-latin">{r.score}</span>
                            : <span className="text-deepBlue/30 text-xs">—</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        {r.content_quality != null
                          ? <StarRow n={r.content_quality} />
                          : <span className="text-deepBlue/25 text-xs">—</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        {r.instructor_quality != null
                          ? <StarRow n={r.instructor_quality} />
                          : <span className="text-deepBlue/25 text-xs">—</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        {r.organization_quality != null
                          ? <StarRow n={r.organization_quality} />
                          : <span className="text-deepBlue/25 text-xs">—</span>
                        }
                      </td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-deepBlue/60">
                        {fmtDate(r.submitted_at ?? r.updated_at)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          </LmsDataPanel>
        )
      )}
    </AdminLmsShell>
  )
}
