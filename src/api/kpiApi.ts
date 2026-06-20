import apiClient from './axios'
import { unwrapData } from './unwrap'
import type { KpiMetric, KpiTabData, KpiTabSlug } from '@/types/intelligence'

const AR_LABELS: Record<string, string> = {
  totalStudents:       'إجمالي المتعلمين',
  totalInstructors:    'المدربون',
  totalVolunteers:     'المتطوعون',
  totalWorkshops:      'الورش',
  totalCourses:        'الدورات',
  totalTracks:         'المسارات',
  totalRegistrations:  'التسجيلات',
  attendanceRate:      'معدل الحضور %',
  completionRate:      'معدل الإتمام %',
  studentSatisfaction: 'رضا المتعلمين',
  activePartnerships:  'الشراكات النشطة',
  openTasks:           'المهام المفتوحة',
  overdueTasks:        'المهام المتأخرة',
  openTickets:         'الدعم الفني المفتوح',
  // education
  activeCourses:       'الدورات النشطة',
  activeTracks:        'المسارات النشطة',
  upcomingSessions:    'الجلسات القادمة',
  completedSessions:   'الجلسات المكتملة',
  totalAssignments:    'إجمالي الواجبات',
  // finance
  totalRevenue:        'إجمالي الإيرادات',
  confirmedRevenue:    'الإيرادات المؤكدة',
  pendingRevenue:      'معلقة السداد',
  failedPayments:      'المدفوعات الفاشلة',
  // hr
  totalUsers:          'إجمالي المستخدمين',
}

function normalizeFlatToMetrics(raw: Record<string, unknown>): KpiMetric[] {
  return Object.entries(raw)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => ({
      id:    k,
      label: AR_LABELS[k] ?? k,
      value: typeof v === 'number' ? v : String(v),
      accent: k.toLowerCase().includes('revenue') || k.toLowerCase().includes('payment') ? 'orange' as const : 'blue' as const,
    }))
}

export async function fetchKpiDashboard(tab: KpiTabSlug): Promise<KpiTabData> {
  const res = await apiClient.get<unknown>('/kpi', { params: { tab } })
  const raw = unwrapData<unknown>(res.data)

  // Backend returns properly structured KpiTabData
  if (raw && typeof raw === 'object' && 'metrics' in raw && Array.isArray((raw as { metrics: unknown }).metrics)) {
    return raw as KpiTabData
  }

  // Backend returns flat object — normalize to KpiMetric[]
  if (raw && typeof raw === 'object') {
    return {
      tab,
      metrics:    normalizeFlatToMetrics(raw as Record<string, unknown>),
      highlights: undefined,
    }
  }

  return { tab, metrics: [], highlights: undefined }
}
