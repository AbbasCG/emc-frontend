import api from './axios';

// ── Shared shapes (derived from backend payload handling in the institute pages) ──

export interface InstitutePricingOption {
  title: string;
  levels: number;
  price: number;
}

export interface InstituteLevel {
  id: number;
  title_en: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
  course_image?: string;
  requirements?: string;
  target_audience?: string;
  language?: string;
  is_paid?: boolean;
  price?: number;
  capacity?: number;
  class_groups_count: number;
  pricing_options?: InstitutePricingOption[];
}

export interface InstituteInstructor {
  id: number;
  user?: { name?: string };
}

export interface InstituteClassCourse {
  id: number;
  title_en: string;
}

export interface InstituteClass {
  id: number;
  name: string;
  instructor_id?: number;
  instructor?: { user?: { name?: string } };
  courses?: InstituteClassCourse[];
  schedule_day?: string;
  schedule_time?: string;
  students_count?: number;
  capacity?: number;
}

export interface InstituteWaitlistEntry {
  id: number;
  name?: string;
  level?: string;
  preferredTime?: string;
  status?: string;
}

// ── Request payloads ──────────────────────────────────────────────────────────

export interface InstituteLevelPayload {
  title_en: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
  course_image?: string;
  requirements?: string;
  target_audience?: string;
  language?: string;
  is_paid?: boolean;
  price?: number;
  capacity?: number;
  pricing_options?: InstitutePricingOption[];
}

export interface InstituteClassPayload {
  name: string;
  instructor_id: string | number;
  capacity: number;
  course_ids: number[];
  schedule_day?: string;
  schedule_time?: string;
}

export interface InstituteAttendancePayload {
  students: Array<{ id: number; status: string }>;
}

export const instituteApi = {
  // Student API — these request bodies are validated server-side and no frontend
  // caller constructs them yet, so they stay `unknown` (narrow at the call site).
  getPlacementTest: () => api.get('/institute/student/placement-test'),
  startPlacementTest: () => api.post('/institute/student/placement-test/start'),
  submitPlacementTest: (data: unknown) => api.post('/institute/student/placement-test/submit', data),
  savePreferences: (data: unknown) => api.post('/institute/student/preferences', data),
  validateCoupon: (data: unknown) => api.post('/institute/student/coupon/validate', data),
  checkout: (data: unknown) => api.post('/institute/student/checkout', data),
  getStudentDashboard: () => api.get('/institute/student/dashboard'),

  // Admin API
  getLevels: () => api.get<{ levels: InstituteLevel[] }>('/institute/admin/levels'),
  getLevel: (id: string | number) => api.get<{ level: InstituteLevel }>(`/institute/admin/levels/${id}`),
  createLevel: (data: InstituteLevelPayload) => api.post('/institute/admin/levels', data),
  updateLevel: (id: string | number, data: InstituteLevelPayload) => api.put(`/institute/admin/levels/${id}`, data),
  deleteLevel: (id: string | number) => api.delete(`/institute/admin/levels/${id}`),
  getWaitlist: () => api.get<{ waitlist?: InstituteWaitlistEntry[] }>('/institute/admin/waitlist'),
  runSmartDistribution: () =>
    api.post<{ assigned_count?: number; failed_count?: number; message?: string }>('/institute/admin/classes/auto-assign'),
  getClasses: () => api.get<{ classes?: InstituteClass[] }>('/institute/admin/classes'),
  getClass: (id: string | number) => api.get<{ class: InstituteClass }>(`/institute/admin/classes/${id}`),
  createClass: (data: InstituteClassPayload) => api.post('/institute/admin/classes', data),
  updateClass: (id: string | number, data: InstituteClassPayload) => api.put(`/institute/admin/classes/${id}`, data),
  deleteClass: (id: string | number) => api.delete(`/institute/admin/classes/${id}`),
  getInstructors: () => api.get<{ instructors?: InstituteInstructor[] }>('/institute/admin/instructors'),

  // Teacher API
  getTeacherClasses: () => api.get('/institute/teacher/classes'),
  getClassDetails: (id: string | number) => api.get(`/institute/teacher/classes/${id}`),
  submitAttendance: (id: string | number, data: InstituteAttendancePayload) =>
    api.post(`/institute/teacher/classes/${id}/attendance`, data),
};
