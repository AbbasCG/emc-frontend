import { useMemo, useState } from 'react'
import { ClipboardList, LayoutDashboard, Mic } from 'lucide-react'
import { progressFromStatus, type PlacementStudentRow } from '@/api/placementApi'
import { PlacementAnswerReviewBody } from '@/components/instructor/PlacementAnswerReviewBody'
import type { ReviewSubject } from '@/components/instructor/PlacementAnswerReviewModal'
import { PlacementAssessmentHeader } from './PlacementAssessmentHeader'
import { PlacementQuickActionsSidebar } from './PlacementQuickActionsSidebar'
import { OralAssessmentTab } from './OralAssessmentTab'
import { PlacementSummaryTab } from './PlacementSummaryTab'
import { emptyOralForm, type OralForm } from './constants'

export type AssessmentTab = 'written' | 'oral' | 'summary'

type Props = {
  row: PlacementStudentRow
  courseId: string
  form: OralForm
  onFormChange: (patch: Partial<OralForm>) => void
  onSaveOral: () => void
  saving: boolean
  activeTab?: AssessmentTab
  onTabChange?: (tab: AssessmentTab) => void
}

const TABS: { id: AssessmentTab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'written', label: 'الاختبار الكتابي', icon: ClipboardList },
  { id: 'oral',    label: 'التقييم الشفوي',   icon: Mic },
  { id: 'summary', label: 'ملخص التقييم',     icon: LayoutDashboard },
]

export function PlacementAssessmentDashboard({
  row,
  courseId,
  form,
  onFormChange,
  onSaveOral,
  saving,
  activeTab: controlledTab,
  onTabChange,
}: Props) {
  const [internalTab, setInternalTab] = useState<AssessmentTab>('summary')
  const activeTab = controlledTab ?? internalTab
  const setTab = onTabChange ?? setInternalTab

  const progress = progressFromStatus(row.status)
  const canAssess = progress.oral_booked || progress.level_approved

  const reviewSubject: ReviewSubject = useMemo(() => ({
    attemptId: row.attempt_id,
    name: row.student_name,
    email: row.email,
    avatarUrl: row.avatar_url,
    score: row.written_score,
    totalQuestions: row.total_questions ?? 70,
    level: row.written_level,
    completedAt: row.submitted_at,
    row,
  }), [row])

  return (
    <div className="space-y-4 print:space-y-2">
      <PlacementAssessmentHeader row={row} />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          {/* Tabs */}
          <div className="print:hidden flex flex-wrap gap-1 rounded-2xl border border-[#0C2A4B]/[0.06] bg-white p-1.5 shadow-sm">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-black transition sm:flex-none sm:min-w-[140px] ${
                  activeTab === id
                    ? 'bg-[#0C2A4B] text-white shadow-md'
                    : 'text-deepBlue/55 hover:bg-slate-50 hover:text-deepBlue'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <div className="rounded-[16px] border border-[#0C2A4B]/[0.06] bg-white shadow-sm">
            {activeTab === 'written' && (
              <div className="flex min-h-[480px] flex-col overflow-hidden rounded-[16px]">
                {row.attempt_id ? (
                  <PlacementAnswerReviewBody subject={reviewSubject} showOverview />
                ) : (
                  <div className="flex flex-1 items-center justify-center p-12 text-center">
                    <p className="text-[13px] font-bold text-deepBlue/45">لا يوجد اختبار كتابي مكتمل لهذا الطالب.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'oral' && (
              <div className="p-4 sm:p-5">
                <OralAssessmentTab
                  row={row}
                  form={form}
                  onChange={onFormChange}
                  onSave={onSaveOral}
                  saving={saving}
                  canEdit={canAssess && !!row.booking_id}
                />
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="p-4 sm:p-5">
                <PlacementSummaryTab row={row} oralForm={form} />
              </div>
            )}
          </div>
        </div>

        <div className="w-full shrink-0 xl:w-[240px]">
          <PlacementQuickActionsSidebar
            row={row}
            courseId={courseId}
            canAssess={canAssess && !!row.booking_id}
            onApproveLevel={() => setTab('oral')}
          />
        </div>
      </div>
    </div>
  )
}

export { emptyOralForm }
