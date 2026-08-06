import apiClient from './axios';

export interface FinanceApprovalSummary {
  pending: number;
  approved: number;
  rejected: number;
}

export interface FinanceApprovalItem {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  approvable_type: 'Course' | 'LearningPath';
  approvable_id: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  rejection_reason: string | null;
  price_snapshot: number | null;
  currency_snapshot: string | null;
  submitter: { id: number; name: string; email: string; role: string } | null;
  reviewer: { id: number; name: string; role: string } | null;
  program: {
    id: number;
    title: string;
    type: string;
    program_type: string | null;
    price: number;
    currency: string;
    status: string;
    created_by: { id: number; name: string; email: string; role: string } | null;
  } | null;
}

export interface FinanceApprovalListResponse {
  success: boolean;
  data: FinanceApprovalItem[];
  meta: { current_page: number; last_page: number; total: number; per_page: number };
  summary: FinanceApprovalSummary;
}

export const programFinanceApi = {
  list: (params?: {
    status?: 'pending' | 'approved' | 'rejected' | 'all';
    approvable_type?: 'Course' | 'LearningPath';
    per_page?: number;
    page?: number;
  }) => apiClient.get<FinanceApprovalListResponse>('/admin/finance/program-approvals', { params }),

  submitCourse: (courseId: number) =>
    apiClient.post(`/admin/courses/${courseId}/submit-for-finance`),

  submitLearningPath: (pathId: number) =>
    apiClient.post(`/admin/learning-paths/${pathId}/submit-for-finance`),

  approve: (approvalId: number, reviewNote?: string) =>
    apiClient.post(`/admin/finance/program-approvals/${approvalId}/approve`, { review_note: reviewNote }),

  reject: (approvalId: number, rejectionReason: string, reviewNote?: string) =>
    apiClient.post(`/admin/finance/program-approvals/${approvalId}/reject`, {
      rejection_reason: rejectionReason,
      review_note: reviewNote,
    }),
};
