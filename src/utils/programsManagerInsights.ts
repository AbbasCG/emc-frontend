import type {
  MonthlyPoint,
  PipelineStage,
  ProgramsManagerDashboardPayload,
  ProgramsManagerSummary,
  UpcomingSession,
} from '@/api/programsManagerApi'

export type TrendDirection = 'up' | 'down' | 'flat' | 'unknown'

export interface TrendInsight {
  id: string
  domain: string
  direction: TrendDirection
  changePercent: number | null
  recentValue: number
  narrative: string
}

export interface ActionItem {
  id: string
  priority: 'critical' | 'high' | 'medium'
  title: string
  reason: string
  href: string
  cta: string
}

export interface BottleneckInsight {
  stage: string
  label: string
  count: number
  sharePercent: number
  narrative: string
  href: string
}

export interface ExecutiveBrief {
  headline: string
  subline: string
  priorityCount: number
  tone: 'healthy' | 'attention' | 'critical'
}

function lastTwoMonths(points: MonthlyPoint[]): { recent: number; previous: number } {
  const sorted = [...points]
  if (sorted.length === 0) return { recent: 0, previous: 0 }
  const recent = sorted[sorted.length - 1]?.count ?? 0
  const previous = sorted.length >= 2 ? (sorted[sorted.length - 2]?.count ?? 0) : 0
  return { recent, previous }
}

function trendDirection(recent: number, previous: number): TrendDirection {
  if (recent === 0 && previous === 0) return 'unknown'
  if (recent > previous) return 'up'
  if (recent < previous) return 'down'
  return 'flat'
}

function changePercent(recent: number, previous: number): number | null {
  if (previous === 0) {
    if (recent === 0) return null
    return 100
  }
  return Math.round(((recent - previous) / previous) * 100)
}

function trendNarrative(domain: string, direction: TrendDirection, pct: number | null, recent: number): string {
  if (direction === 'unknown' || recent === 0) return `لا نشاط ${domain} في الشهر الأخير — فرصة للتحفيز أو المراجعة.`
  if (direction === 'flat') return `${domain} مستقر مقارنة بالشهر السابق (${recent}).`
  if (direction === 'up') return `${domain} في نمو ${pct != null ? `${Math.abs(pct)}%` : ''} — استمر في دعم الزخم.`
  return `${domain} تراجع ${pct != null ? `${Math.abs(pct)}%` : ''} — راجع العوائق والتسويق.`
}

export function buildTrendInsight(id: string, domain: string, points: MonthlyPoint[]): TrendInsight {
  const { recent, previous } = lastTwoMonths(points)
  const direction = trendDirection(recent, previous)
  const pct = changePercent(recent, previous)
  return {
    id,
    domain,
    direction,
    changePercent: pct,
    recentValue: recent,
    narrative: trendNarrative(domain, direction, pct, recent),
  }
}

export function getGrowingTrends(analytics: ProgramsManagerDashboardPayload['analytics']): TrendInsight[] {
  const all = [
    buildTrendInsight('registrations', 'التسجيلات', analytics.registrations_monthly),
    buildTrendInsight('courses', 'إطلاق الدورات', analytics.courses_monthly),
    buildTrendInsight('sessions', 'الجلسات', analytics.sessions_monthly),
    buildTrendInsight('paths', 'المسارات', analytics.paths_monthly),
  ]
  return all.filter((t) => t.direction === 'up' && t.recentValue > 0)
}

export function getDecliningTrends(analytics: ProgramsManagerDashboardPayload['analytics']): TrendInsight[] {
  const pairs: [string, string, MonthlyPoint[]][] = [
    ['registrations', 'التسجيلات', analytics.registrations_monthly],
    ['courses', 'إطلاق الدورات', analytics.courses_monthly],
    ['sessions', 'الجلسات', analytics.sessions_monthly],
    ['paths', 'المسارات', analytics.paths_monthly],
  ]
  return pairs
    .map(([id, domain, points]) => buildTrendInsight(id, domain, points))
    .filter((t) => {
      if (t.direction !== 'down') return false
      const { previous } = lastTwoMonths(
        pairs.find(([id]) => id === t.id)?.[2] ?? [],
      )
      return previous > 0
    })
}

export function findRegistrationBottleneck(pipeline: PipelineStage[]): BottleneckInsight | null {
  const actionable = pipeline.filter((p) =>
    ['pending', 'pending_payment', 'pending_review'].includes(p.status) && p.count > 0,
  )
  const total = pipeline.reduce((s, p) => s + p.count, 0)
  if (total === 0 || actionable.length === 0) return null

  const worst = [...actionable].sort((a, b) => b.count - a.count)[0]
  const share = Math.round((worst.count / total) * 100)
  return {
    stage: worst.status,
    label: worst.label,
    count: worst.count,
    sharePercent: share,
    narrative: `${worst.count} تسجيل (${share}% من المسار) عالق في «${worst.label}» — هذا أكبر عنق زجاجة حالياً.`,
    href: '/dashboard/admin/registrations',
  }
}

export function buildActionQueue(data: ProgramsManagerDashboardPayload): ActionItem[] {
  const { summary, program_alerts, pending_registrations, upcoming_sessions, assignment_stats } = data
  const items: ActionItem[] = []

  if (summary.pending_registrations > 0) {
    items.push({
      id: 'pending-regs',
      priority: 'critical',
      title: `مراجعة ${summary.pending_registrations} تسجيل معلّق`,
      reason: 'قرارات التسجيل تؤثر مباشرة على الإيرادات ورضا المتعلّمين.',
      href: '/dashboard/admin/registrations',
      cta: 'فتح التسجيلات',
    })
  }

  if (summary.pending_reviews > 0) {
    items.push({
      id: 'pending-reviews',
      priority: 'high',
      title: `تصحيح ${summary.pending_reviews} تسليم بانتظار المراجعة`,
      reason: 'تأخير المراجعة يبطئ إكمال التعلم ويُضعف تجربة الطالب.',
      href: '/dashboard/admin/lms/assignments',
      cta: 'مراجعة التسليمات',
    })
  }

  const sessionsNoLink = upcoming_sessions.filter((s) => !s.meeting_url && s.status !== 'cancelled' && s.status !== 'completed')
  if (sessionsNoLink.length > 0) {
    items.push({
      id: 'sessions-no-link',
      priority: 'high',
      title: `إضافة روابط لـ ${sessionsNoLink.length} جلسة قادمة`,
      reason: 'جلسات بدون رابط اجتماع تُعرّض التسليم التشغيلي للخطر.',
      href: '/dashboard/admin/lms/sessions',
      cta: 'إصلاح الجلسات',
    })
  }

  if (assignment_stats.needs_resubmission > 0) {
    items.push({
      id: 'resubmission',
      priority: 'medium',
      title: `متابعة ${assignment_stats.needs_resubmission} طلب إعادة تسليم`,
      reason: 'الطلاب ينتظرون توجيهات واضحة لإكمال متطلباتهم.',
      href: '/dashboard/admin/lms/assignments',
      cta: 'عرض الواجبات',
    })
  }

  if (summary.draft_courses > 0 && summary.published_courses === 0) {
    items.push({
      id: 'draft-only',
      priority: 'high',
      title: 'نشر أول دورة — كل المحتوى ما زال مسودة',
      reason: 'لا يمكن جذب تسجيلات أو تشغيل جلسات بدون دورات منشورة.',
      href: '/dashboard/admin/programs',
      cta: 'إكمال النشر',
    })
  } else if (summary.draft_courses >= 3) {
    items.push({
      id: 'draft-backlog',
      priority: 'medium',
      title: `تخليص ${summary.draft_courses} دورة في المسودات`,
      reason: 'تراكم المسودات يبطئ pipeline المحتوى ويؤخر الإطلاق.',
      href: '/dashboard/admin/programs',
      cta: 'إدارة الدورات',
    })
  }

  for (const alert of program_alerts) {
    if (alert.severity === 'action' || alert.severity === 'warning') {
      items.push({
        id: `alert-${alert.type}`,
        priority: alert.severity === 'action' ? 'critical' : 'high',
        title: alert.message,
        reason: alert.count > 0 ? `${alert.count} عنصر يتطلب تدخلاً.` : 'يتطلب متابعة فورية.',
        href: alert.type.includes('session') ? '/dashboard/admin/lms/sessions' : '/dashboard/admin/programs',
        cta: 'معالجة',
      })
    }
  }

  if (pending_registrations.length > 0 && !items.some((i) => i.id === 'pending-regs')) {
    const first = pending_registrations[0]
    items.push({
      id: 'pending-reg-sample',
      priority: 'critical',
      title: `آخر طلب: ${first.student ?? first.email ?? 'متقدّم'}`,
      reason: first.course ? `دورة: ${first.course}` : 'تسجيل بانتظار القرار.',
      href: '/dashboard/admin/registrations',
      cta: 'مراجعة',
    })
  }

  const order = { critical: 0, high: 1, medium: 2 }
  return items.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 6)
}

export function buildExecutiveBrief(data: ProgramsManagerDashboardPayload, actions: ActionItem[]): ExecutiveBrief {
  const critical = actions.filter((a) => a.priority === 'critical').length
  const high = actions.filter((a) => a.priority === 'high').length
  const priorityCount = actions.length

  if (critical > 0) {
    return {
      headline: `${critical} قرار${critical > 1 ? 'ات' : ''} حرجة تنتظرك اليوم`,
      subline: 'ركّز على التسجيلات والتنبيهات التشغيلية قبل توسيع المحتوى.',
      priorityCount,
      tone: 'critical',
    }
  }

  if (high > 0 || data.summary.pending_reviews > 0) {
    return {
      headline: 'العمليات تعمل — لكن هناك عناصر تحتاج متابعة',
      subline: `${priorityCount} إجراء${priorityCount !== 1 ? 'ات' : ''} مقترحة لتحسين التسليم والتعلم.`,
      priorityCount,
      tone: 'attention',
    }
  }

  const growing = getGrowingTrends(data.analytics)
  if (growing.length > 0) {
    return {
      headline: `زخم إيجابي في ${growing[0].domain}`,
      subline: 'استغل النمو الحالي لتوسيع المسارات أو جدولة جلسات إضافية.',
      priorityCount,
      tone: 'healthy',
    }
  }

  return {
    headline: 'لوحة قرار تشغيلية — لا مهام حرجة الآن',
    subline: 'راجع الاتجاهات الشهرية وخطّط للإطلاقات القادمة.',
    priorityCount,
    tone: 'healthy',
  }
}

export function getSessionsNeedingAction(sessions: UpcomingSession[]): UpcomingSession[] {
  const now = Date.now()
  const twoDays = 48 * 60 * 60 * 1000
  return sessions.filter((s) => {
    if (s.status === 'cancelled' || s.status === 'completed') return false
    const needsLink = !s.meeting_url
    let soon = false
    try {
      const d = new Date(s.session_date).getTime()
      soon = d - now <= twoDays && d >= now - 86400000
    } catch {
      /* ignore */
    }
    return needsLink || soon
  })
}

export function getLearningHealthInsight(summary: ProgramsManagerSummary): {
  status: 'strong' | 'moderate' | 'weak' | 'empty'
  attendanceNarrative: string
  completionNarrative: string
  combinedInsight: string
} {
  const att = summary.attendance_average
  const comp = summary.completion_average

  if (att === 0 && comp === 0) {
    return {
      status: 'empty',
      attendanceNarrative: 'لا سجلات حضور كافية بعد.',
      completionNarrative: 'لا بيانات تقدم للطلاب بعد.',
      combinedInsight: 'فعّل الجلسات والمحتوى لبدء قياس جودة التعلم.',
    }
  }

  const attWeak = att > 0 && att < 60
  const compWeak = comp > 0 && comp < 40
  const attStrong = att >= 75
  const compStrong = comp >= 60

  let status: 'strong' | 'moderate' | 'weak' = 'moderate'
  if (attStrong && compStrong) status = 'strong'
  else if (attWeak || compWeak) status = 'weak'

  const attendanceNarrative = att > 0
    ? attWeak ? `الحضور ${att}% — أقل من المستوى المتوقع، راجع التذكيرات والجدولة.`
    : attStrong ? `الحضور ${att}% — أداء قوي في التفاعل المباشر.`
    : `الحضور ${att}% — مستقر، فرصة لرفعه عبر متابعة الغائبين.`
    : 'لم يُسجّل حضور بعد.'

  const completionNarrative = comp > 0
    ? compWeak ? `إكمال المحتوى ${comp}% — الطلاب يتعثرون قبل النهاية.`
    : compStrong ? `إكمال المحتوى ${comp}% — مسار تعلم فعّال.`
    : `إكمال المحتوى ${comp}% — في المسار الصحيح مع مجال للتحسين.`
    : 'لم يُقاس تقدم المحتوى بعد.'

  let combinedInsight = 'جودة التعلم متوازنة — راقب الاتجاهات الشهرية.'
  if (status === 'weak') combinedInsight = 'جودة التعلم تحتاج تدخلاً: راجع صعوبة المحتوى ودعم المدربين.'
  else if (status === 'strong') combinedInsight = 'جودة التعلم ممتازة — حافظ على معايير المراجعة والجلسات.'

  return { status, attendanceNarrative, completionNarrative, combinedInsight }
}

export function hasAnalyticsData(analytics: ProgramsManagerDashboardPayload['analytics']): boolean {
  return [
    analytics.registrations_monthly,
    analytics.courses_monthly,
    analytics.sessions_monthly,
    analytics.paths_monthly,
  ].some((series) => series.some((p) => p.count > 0))
}

export function priorityLabel(p: ActionItem['priority']): string {
  if (p === 'critical') return 'حرج'
  if (p === 'high') return 'مرتفع'
  return 'متوسط'
}
