import { useMemo } from 'react'
import { CheckCircle, Mic } from 'lucide-react'
import {
  PLACEMENT_LEVELS,
  type PlacementStudentRow,
} from '@/api/placementApi'
import {
  CEFR_MAP,
  ORAL_SCORES,
  cefrBadge,
  type OralForm,
} from '@/components/instructor/placement/constants'
import { getLevelFromScore } from '@/api/placementApi'

type Props = {
  row: PlacementStudentRow
  form: OralForm
  onChange: (patch: Partial<OralForm>) => void
  onSave: () => void
  saving: boolean
  canEdit: boolean
}

export function OralAssessmentTab({ row, form, onChange, onSave, saving, canEdit }: Props) {
  const totalOralScore = useMemo(() => {
    const parts = ORAL_SCORES.map((s) => form[s.key])
    const hasAny = parts.some((v) => v !== '')
    if (!hasAny) return row.oral_score
    const nums = parts.map((v) => (v === '' ? 0 : Number(v)))
    if (nums.some((n) => isNaN(n))) return null
    return nums.reduce((a, b) => a + b, 0)
  }, [form, row.oral_score])

  const writtenBadge = row.written_score != null
    ? cefrBadge(getLevelFromScore(row.written_score, row.total_questions ?? 70).level)
    : null

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700">
          <Mic className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-[15px] font-black text-deepBlue">التقييم الشفوي</h3>
          <p className="text-[11px] font-semibold text-deepBlue/45">
            {canEdit ? 'أدخل درجات المقابلة واعتمد المستوى النهائي' : 'عرض نتائج المقابلة الشفوية'}
          </p>
        </div>
      </div>

      {row.written_score != null && (
        <div className="rounded-2xl border border-slate-100 bg-gradient-to-l from-slate-50 to-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-deepBlue/55">الدرجة الكتابية المرجعية</p>
              <p className="mt-1 font-mono text-xl font-black tabular-nums text-deepBlue">
                {row.written_score}
                <span className="text-[12px] font-semibold text-deepBlue/40">/{row.total_questions ?? '—'}</span>
              </p>
            </div>
            {writtenBadge && (
              <span className={`rounded-xl px-3 py-1.5 text-[12px] font-black ${writtenBadge.bg} ${writtenBadge.text}`}>
                {writtenBadge.cefr} · {writtenBadge.arabic}
              </span>
            )}
          </div>
        </div>
      )}

      {row.oral_assessment_full && (
        <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
          <p className="text-[11px] font-black text-violet-800/70">ملخص التقييم المحفوظ</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {row.oral_assessment_full.rubric.map((r) => (
              <span key={r.key} className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-deepBlue ring-1 ring-violet-100">
                {r.label}: {r.score ?? '—'}/{r.max}
              </span>
            ))}
          </div>
        </div>
      )}

      {!canEdit && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <Mic className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-[13px] font-black text-deepBlue/60">المقابلة الشفوية غير متاحة للتعديل بعد</p>
          <p className="mt-1 text-[11px] font-semibold text-deepBlue/40">
            {row.oral_score != null ? `الدرجة المحفوظة: ${row.oral_score}/100` : 'بانتظار حجز أو إجراء المقابلة'}
          </p>
        </div>
      )}

      {canEdit && (
        <>
          {row.oral_score != null && (
            <div className="flex items-center justify-between rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3">
              <span className="text-[11px] font-semibold text-violet-700/70">الدرجة الشفوية المحفوظة</span>
              <span className="font-mono text-[16px] font-black tabular-nums text-deepBlue">
                {row.oral_score}<span className="text-[10px] font-semibold text-deepBlue/40">/100</span>
              </span>
            </div>
          )}

          <div className="rounded-2xl border border-[#22334A]/[0.06] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black text-deepBlue/55">
                درجات المقابلة
                <span className="mr-1 font-normal text-deepBlue/35">(0–20 لكل معيار)</span>
              </p>
              {totalOralScore != null && (
                <span className="font-mono text-[12px] font-black tabular-nums text-[#2691C2]">
                  المجموع: {totalOralScore}/100
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {ORAL_SCORES.map(({ key, label, max }) => (
                <label key={key} className="block">
                  <span className="text-[10px] font-black text-deepBlue/50">{label}</span>
                  <span className="mr-1 font-mono text-[9px] font-normal text-deepBlue/30">(0–{max})</span>
                  <input
                    type="number"
                    min={0}
                    max={max}
                    value={form[key]}
                    onChange={(e) => onChange({ [key]: e.target.value })}
                    placeholder="—"
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-deepBlue outline-none transition focus:border-[#2691C2] focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#22334A]/[0.06] bg-white p-4 shadow-sm">
            <label className="mb-2 block text-[11px] font-black text-deepBlue/55">
              المستوى النهائي <span className="text-red-500">*</span>
            </label>
            <select
              value={form.final_level}
              onChange={(e) => onChange({ final_level: e.target.value })}
              dir="rtl"
              className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white pr-4 pl-8 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
            >
              <option value="">اختر المستوى النهائي</option>
              {PLACEMENT_LEVELS.map((lvl) => {
                const b = CEFR_MAP[lvl.level]
                return (
                  <option key={lvl.level} value={lvl.level}>
                    {b ? `${b.cefr} — ${b.arabic}` : lvl.label}
                  </option>
                )
              })}
            </select>
          </div>

          <div className="rounded-2xl border border-[#22334A]/[0.06] bg-white p-4 shadow-sm">
            <label className="mb-2 block text-[11px] font-black text-deepBlue/55">
              ملاحظات المعلم <span className="font-normal text-deepBlue/35">(اختياري)</span>
            </label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="ملاحظات حول أداء الطالب في المقابلة..."
              dir="rtl"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-deepBlue outline-none focus:border-[#2691C2] focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={!form.final_level || saving || !row.booking_id}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2691C2] px-5 py-3 text-[13px] font-black text-white transition hover:brightness-105 disabled:opacity-50 sm:flex-none sm:min-w-[200px]"
            >
              <CheckCircle className="h-4 w-4" />
              {saving ? 'جاري الحفظ...' : 'اعتماد المستوى'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
