import api from './axios';

export const instituteApi = {
  // Student API
  getPlacementTest: () => api.get('/institute/student/placement-test'),
  startPlacementTest: () => api.post('/institute/student/placement-test/start'),
  submitPlacementTest: (data: any) => api.post('/institute/student/placement-test/submit', data),
  savePreferences: (data: any) => api.post('/institute/student/preferences', data),
  validateCoupon: (data: any) => api.post('/institute/student/coupon/validate', data),
  checkout: (data: any) => api.post('/institute/student/checkout', data),
  getStudentDashboard: () => api.get('/institute/student/dashboard'),

  // Admin API
  getLevels: () => api.get('/institute/admin/levels'),
  getLevel: (id: string | number) => api.get(`/institute/admin/levels/${id}`),
  createLevel: (data: any) => api.post('/institute/admin/levels', data),
  updateLevel: (id: string | number, data: any) => api.put(`/institute/admin/levels/${id}`, data),
  deleteLevel: (id: string | number) => api.delete(`/institute/admin/levels/${id}`),
  getWaitlist: () => api.get('/institute/admin/waitlist'),
  runSmartDistribution: () => api.post('/institute/admin/classes/auto-assign'),
  getClasses: () => api.get('/institute/admin/classes'),
  getClass: (id: string | number) => api.get(`/institute/admin/classes/${id}`),
  createClass: (data: any) => api.post('/institute/admin/classes', data),
  updateClass: (id: string | number, data: any) => api.put(`/institute/admin/classes/${id}`, data),
  deleteClass: (id: string | number) => api.delete(`/institute/admin/classes/${id}`),
  getInstructors: () => api.get('/institute/admin/instructors'),

  // Teacher API
  getTeacherClasses: () => api.get('/institute/teacher/classes'),
  getClassDetails: (id: string | number) => api.get(`/institute/teacher/classes/${id}`),
  submitAttendance: (id: string | number, data: any) => api.post(`/institute/teacher/classes/${id}/attendance`, data),
};
