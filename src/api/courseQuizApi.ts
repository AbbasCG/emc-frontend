import apiClient from './axios'
import { unwrapLms, asList } from './lmsApi'

export type QuizStatus = 'draft' | 'scheduled' | 'active' | 'closed' | 'archived'
export type QuizWeightingMode = 'equal' | 'custom'
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'multi_select'

export interface InstructorQuizSummary {
  id: number
  title: string
  description: string | null
  status: QuizStatus
  effective_status: QuizStatus
  opens_at: string | null
  closes_at: string | null
  max_attempts: number
  counts_toward_final_grade: boolean
  is_final_exam: boolean
  required: boolean
  weight: number | null
  class_group_id: number | null
  questions_count: number
  total_points: number
  position: number
  completed_students_count: number
  average_score: number | null
}

export interface QuizQuestionAdmin {
  id: number
  quiz_id: number
  question: string
  type: QuestionType
  options: string[] | null
  correct_answer: unknown[] | null
  points: number
  sort_order: number
}

export interface InstructorQuizDetail {
  id: number
  course_id: number
  lesson_id: number | null
  class_group_id: number | null
  title: string
  description: string | null
  status: QuizStatus
  passing_score: number | null
  opens_at: string | null
  closes_at: string | null
  max_attempts: number
  counts_toward_final_grade: boolean
  is_final_exam: boolean
  required: boolean
  weight: number | null
  shuffle_questions: boolean
  shuffle_answers: boolean
  show_result_after_submission: boolean
  show_correct_answers: boolean
  questions: QuizQuestionAdmin[]
}

export interface QuizFormInput {
  title: string
  description?: string | null
  class_group_id?: number | null
  passing_score?: number | null
  max_attempts?: number
  counts_toward_final_grade?: boolean
  is_final_exam?: boolean
  required?: boolean
  weight?: number | null
  shuffle_questions?: boolean
  shuffle_answers?: boolean
  show_result_after_submission?: boolean
  show_correct_answers?: boolean
}

export interface AssessmentSettings {
  course_id: number
  quiz_component_weight: number
  final_exam_weight: number
  quiz_weighting_mode: QuizWeightingMode
}

export interface FinalGradeQuizRow {
  quiz_id: number
  title: string
  score: number | null
  effective_score: number
  weight: number
  required: boolean
  status: QuizStatus
}

export interface FinalGradeBreakdown {
  status: 'complete' | 'incomplete'
  quiz_component_score: number | null
  quiz_component_weight: number
  quiz_contribution: number | null
  quiz_breakdown: FinalGradeQuizRow[]
  final_exam_score: number | null
  final_exam_weight: number
  final_exam_contribution: number | null
  final_course_score: number | null
}

export interface StudentQuizSummary {
  id: number
  title: string
  description: string | null
  status: QuizStatus
  opens_at: string | null
  closes_at: string | null
  questions_count: number
  max_attempts: number
  attempts_used: number
  best_score: number | null
  completed: boolean
  counts_toward_final_grade: boolean
}

export interface StudentQuizTakeQuestion {
  id: number
  question: string
  type: QuestionType
  options: string[] | null
  points: number
}

export interface StudentQuizTake {
  id: number
  title: string
  description: string | null
  max_attempts: number
  attempts_used: number
  closes_at: string | null
  questions: StudentQuizTakeQuestion[]
}

export interface QuizSubmitResult {
  attempt_id: number
  attempt_number: number
  score: number
  passed: boolean | null
  show_result: boolean
  show_correct_answers: boolean
}

// ─── Instructor ─────────────────────────────────────────────────────────────

export async function fetchInstructorQuizzes(courseId: number): Promise<InstructorQuizSummary[]> {
  const res = await apiClient.get<unknown>(`/instructor/courses/${courseId}/quizzes`)
  return asList<InstructorQuizSummary>(res.data)
}

export async function fetchInstructorQuiz(quizId: number): Promise<InstructorQuizDetail> {
  const res = await apiClient.get<unknown>(`/instructor/quizzes/${quizId}`)
  return unwrapLms<InstructorQuizDetail>(res.data)
}

export async function createInstructorQuiz(courseId: number, body: QuizFormInput): Promise<InstructorQuizSummary> {
  const res = await apiClient.post<unknown>(`/instructor/courses/${courseId}/quizzes`, body)
  return unwrapLms<InstructorQuizSummary>(res.data)
}

export async function updateInstructorQuiz(quizId: number, body: Partial<QuizFormInput>): Promise<InstructorQuizDetail> {
  const res = await apiClient.patch<unknown>(`/instructor/quizzes/${quizId}`, body)
  return unwrapLms<InstructorQuizDetail>(res.data)
}

export async function deleteInstructorQuiz(quizId: number): Promise<void> {
  await apiClient.delete(`/instructor/quizzes/${quizId}`)
}

export async function duplicateInstructorQuiz(quizId: number): Promise<InstructorQuizDetail> {
  const res = await apiClient.post<unknown>(`/instructor/quizzes/${quizId}/duplicate`)
  return unwrapLms<InstructorQuizDetail>(res.data)
}

export async function publishInstructorQuiz(quizId: number): Promise<InstructorQuizSummary> {
  const res = await apiClient.post<unknown>(`/instructor/quizzes/${quizId}/publish`)
  return unwrapLms<InstructorQuizSummary>(res.data)
}

export async function scheduleInstructorQuiz(quizId: number, opensAt: string, closesAt?: string | null): Promise<InstructorQuizSummary> {
  const res = await apiClient.post<unknown>(`/instructor/quizzes/${quizId}/schedule`, {
    opens_at: opensAt,
    closes_at: closesAt ?? null,
  })
  return unwrapLms<InstructorQuizSummary>(res.data)
}

export async function closeInstructorQuiz(quizId: number): Promise<InstructorQuizSummary> {
  const res = await apiClient.post<unknown>(`/instructor/quizzes/${quizId}/close`)
  return unwrapLms<InstructorQuizSummary>(res.data)
}

export async function reopenInstructorQuiz(quizId: number): Promise<InstructorQuizSummary> {
  const res = await apiClient.post<unknown>(`/instructor/quizzes/${quizId}/reopen`)
  return unwrapLms<InstructorQuizSummary>(res.data)
}

export async function archiveInstructorQuiz(quizId: number): Promise<InstructorQuizSummary> {
  const res = await apiClient.post<unknown>(`/instructor/quizzes/${quizId}/archive`)
  return unwrapLms<InstructorQuizSummary>(res.data)
}

export async function createQuizQuestion(quizId: number, body: {
  question: string
  type: QuestionType
  options?: string[] | null
  correct_answer?: unknown
  points: number
  sort_order?: number
}): Promise<QuizQuestionAdmin> {
  const res = await apiClient.post<unknown>(`/instructor/quizzes/${quizId}/questions`, body)
  return unwrapLms<QuizQuestionAdmin>(res.data)
}

export async function updateQuizQuestion(quizId: number, questionId: number, body: Partial<{
  question: string
  type: QuestionType
  options: string[] | null
  correct_answer: unknown
  points: number
  sort_order: number
}>): Promise<QuizQuestionAdmin> {
  const res = await apiClient.patch<unknown>(`/instructor/quizzes/${quizId}/questions/${questionId}`, body)
  return unwrapLms<QuizQuestionAdmin>(res.data)
}

export async function deleteQuizQuestion(quizId: number, questionId: number): Promise<void> {
  await apiClient.delete(`/instructor/quizzes/${quizId}/questions/${questionId}`)
}

export async function fetchAssessmentSettings(courseId: number): Promise<AssessmentSettings> {
  const res = await apiClient.get<unknown>(`/instructor/courses/${courseId}/assessment-settings`)
  return unwrapLms<AssessmentSettings>(res.data)
}

export async function saveAssessmentSettings(courseId: number, body: {
  quiz_component_weight: number
  final_exam_weight: number
  quiz_weighting_mode: QuizWeightingMode
}): Promise<AssessmentSettings> {
  const res = await apiClient.put<unknown>(`/instructor/courses/${courseId}/assessment-settings`, body)
  return unwrapLms<AssessmentSettings>(res.data)
}

export async function fetchInstructorStudentQuizBreakdown(courseId: number, userId: number): Promise<FinalGradeBreakdown> {
  const res = await apiClient.get<unknown>(`/instructor/courses/${courseId}/students/${userId}/quiz-breakdown`)
  return unwrapLms<FinalGradeBreakdown>(res.data)
}

// ─── Student ────────────────────────────────────────────────────────────────

export async function fetchStudentQuizzes(courseId: number): Promise<StudentQuizSummary[]> {
  const res = await apiClient.get<unknown>(`/student/courses/${courseId}/quizzes`)
  return asList<StudentQuizSummary>(res.data)
}

export async function fetchStudentQuizTake(quizId: number): Promise<StudentQuizTake> {
  const res = await apiClient.get<unknown>(`/student/quizzes/${quizId}`)
  return unwrapLms<StudentQuizTake>(res.data)
}

export async function submitStudentQuiz(quizId: number, answers: Record<string, unknown>): Promise<QuizSubmitResult> {
  const res = await apiClient.post<unknown>(`/student/quizzes/${quizId}/submit`, { answers })
  return unwrapLms<QuizSubmitResult>(res.data)
}

export async function fetchStudentFinalGrade(courseId: number): Promise<FinalGradeBreakdown> {
  const res = await apiClient.get<unknown>(`/student/courses/${courseId}/final-grade`)
  return unwrapLms<FinalGradeBreakdown>(res.data)
}
