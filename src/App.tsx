import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ScrollToTop from './components/ScrollToTop'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import RoleGate from './components/RoleGate'
import AppToaster from './components/feedback/AppToaster'
import RouteFallback from './components/RouteFallback'
import About from './pages/About'
import AdminDashboard from './pages/AdminDashboard'
import Contact from './pages/Contact'
import CourseDetails from './pages/CourseDetails'
import Courses from './pages/Courses'
import Dashboard from './pages/Dashboard'
import FakePayment from './pages/FakePayment'
import Departments from './pages/Departments'
import Home from './pages/Home'
import InstructorDetail from './pages/InstructorDetail'
import Instructors from './pages/Instructors'
import Impact from './pages/Impact'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Partnerships from './pages/Partnerships'
import Paths from './pages/Paths'
import Platform from './pages/Platform'
import Programs from './pages/Programs'
import Register from './pages/Register'
import Signup from './pages/Signup'
import SubmitWorkshop from './pages/SubmitWorkshop'
import TeacherDashboard from './pages/TeacherDashboard'
import Team from './pages/Team'
import ThankYou from './pages/ThankYou'
import Tracks from './pages/Tracks'
import Volunteer from './pages/Volunteer'
import AdminLmsAssignmentsPage from './pages/lms/admin/AdminLmsAssignmentsPage'
import AdminLmsAttendancePage from './pages/lms/admin/AdminLmsAttendancePage'
import AdminLmsEvaluationsPage from './pages/lms/admin/AdminLmsEvaluationsPage'
import AdminLmsMaterialsPage from './pages/lms/admin/AdminLmsMaterialsPage'
import AdminLmsProgressPage from './pages/lms/admin/AdminLmsProgressPage'
import AdminLmsSessionsPage from './pages/lms/admin/AdminLmsSessionsPage'
import InstructorAttendancePage from './pages/lms/instructor/InstructorAttendancePage'
import InstructorSessionsPage from './pages/lms/instructor/InstructorSessionsPage'
import InstructorSubmissionsPage from './pages/lms/instructor/InstructorSubmissionsPage'
import StudentAssignmentsPage from './pages/lms/student/StudentAssignmentsPage'
import StudentEvaluationPage from './pages/lms/student/StudentEvaluationPage'
import StudentMaterialsPage from './pages/lms/student/StudentMaterialsPage'
import StudentProgressPage from './pages/lms/student/StudentProgressPage'
import StudentSessionsPage from './pages/lms/student/StudentSessionsPage'
import OperationsDashboardPage from './pages/operations/admin/OperationsDashboardPage'
import OpsDepartmentsPage from './pages/operations/admin/OpsDepartmentsPage'
import OpsDepartmentDetailPage from './pages/operations/admin/OpsDepartmentDetailPage'
import OpsTasksListPage from './pages/operations/admin/OpsTasksListPage'
import OpsTasksKanbanPage from './pages/operations/admin/OpsTasksKanbanPage'
import OpsTasksMyPage from './pages/operations/admin/OpsTasksMyPage'
import OpsTasksOverduePage from './pages/operations/admin/OpsTasksOverduePage'
import OpsMeetingsPage from './pages/operations/admin/OpsMeetingsPage'
import OpsMeetingDetailPage from './pages/operations/admin/OpsMeetingDetailPage'
import OpsFormsPage from './pages/operations/admin/OpsFormsPage'
import OpsFormCreatePage from './pages/operations/admin/OpsFormCreatePage'
import OpsFormDetailPage from './pages/operations/admin/OpsFormDetailPage'
import OpsVolunteersPage from './pages/operations/admin/OpsVolunteersPage'
import OpsVolunteerDetailPage from './pages/operations/admin/OpsVolunteerDetailPage'
import OpsPartnersPage from './pages/operations/admin/OpsPartnersPage'
import OpsPartnershipRequestsPage from './pages/operations/admin/OpsPartnershipRequestsPage'
import OpsMarketingPage from './pages/operations/admin/OpsMarketingPage'
import OpsSupportTicketsPage from './pages/operations/admin/OpsSupportTicketsPage'
import OpsSupportTicketDetailPage from './pages/operations/admin/OpsSupportTicketDetailPage'
import SupportPage from './pages/operations/public/SupportPage'
import PublicFormPage from './pages/operations/public/PublicFormPage'
import PartnershipApplyPage from './pages/operations/public/PartnershipApplyPage'
import FinanceDashboardPage from './pages/intelligence/admin/FinanceDashboardPage'
import FinancePaymentsPage from './pages/intelligence/admin/FinancePaymentsPage'
import FinanceTransactionsPage from './pages/intelligence/admin/FinanceTransactionsPage'
import CouponsAdminPage from './pages/intelligence/admin/CouponsAdminPage'
import ScholarshipsAdminPage from './pages/intelligence/admin/ScholarshipsAdminPage'
import CertificatesAdminPage from './pages/intelligence/admin/CertificatesAdminPage'
import QualityAdminPage from './pages/intelligence/admin/QualityAdminPage'
import KpiAdminPage from './pages/intelligence/admin/KpiAdminPage'
import ReportsAdminPage from './pages/intelligence/admin/ReportsAdminPage'
import StudentCertificatesPage from './pages/intelligence/student/StudentCertificatesPage'
import CertificateVerifyPage from './pages/intelligence/public/CertificateVerifyPage'
import KnowledgeHubPage from './pages/platform/KnowledgeHubPage'
import KnowledgeArticlePublicPage from './pages/platform/KnowledgeArticlePublicPage'
import NotificationsCenterPage from './pages/platform/NotificationsCenterPage'
import DocumentsPage from './pages/platform/DocumentsPage'
import AiWorkspacePage from './pages/platform/AiWorkspacePage'
import StudentLearningHubPage from './pages/platform/StudentLearningHubPage'
import CourseModulesPage from './pages/platform/CourseModulesPage'
import LessonPlayerPage from './pages/platform/LessonPlayerPage'
import QuizTakePage from './pages/platform/QuizTakePage'
import AdminKnowledgeHubPage from './pages/platform/admin/AdminKnowledgeHubPage'
import AdminKnowledgeCategoriesPage from './pages/platform/admin/AdminKnowledgeCategoriesPage'
import AdminKnowledgeArticleCreatePage from './pages/platform/admin/AdminKnowledgeArticleCreatePage'
import AdminKnowledgeArticleEditPage from './pages/platform/admin/AdminKnowledgeArticleEditPage'
import {
  AdminLessonsPage,
  AdminModulesPage,
  AdminQuizzesPage,
} from './pages/platform/admin/AdminLmsStructurePages'
import AdminAutomationsPage from './pages/platform/admin/AdminAutomationsPage'
import AdminAutomationRunsPage from './pages/platform/admin/AdminAutomationRunsPage'
import AdminDocumentsPage from './pages/platform/admin/AdminDocumentsPage'
import AdminAuditLogsPage from './pages/platform/admin/AdminAuditLogsPage'
import PlatformScaleDashboardPage from './pages/platform/admin/PlatformScaleDashboardPage'
import NotificationPreferencesPage from './pages/settings/NotificationPreferencesPage'
import CalendarPage from './pages/calendar/CalendarPage'
import AdminIntegrationsPage from './pages/platform/admin/AdminIntegrationsPage'
import WhatsAppIntegrationPage from './pages/platform/admin/integrations/WhatsAppIntegrationPage'
import EmailIntegrationPage from './pages/platform/admin/integrations/EmailIntegrationPage'
import AdminWebhooksPage from './pages/platform/admin/AdminWebhooksPage'
import AdminWebhookDetailPage from './pages/platform/admin/AdminWebhookDetailPage'
import AdminApiTokensPage from './pages/platform/admin/developer/AdminApiTokensPage'
import AdminMobileReadinessPage from './pages/platform/admin/AdminMobileReadinessPage'
import AdminAiCommandCenterPage from './pages/platform/admin/ai/AdminAiCommandCenterPage'
import AdminAiAutomationsPage from './pages/platform/admin/ai/AdminAiAutomationsPage'
import AdminAiInsightsPage from './pages/platform/admin/ai/AdminAiInsightsPage'
import AdminAiUsagePage from './pages/platform/admin/ai/AdminAiUsagePage'
import PartnerDashboardPage from './pages/platform/partner/PartnerDashboardPage'
import PartnerProgramsPage from './pages/platform/partner/PartnerProgramsPage'
import PartnerReportsPage from './pages/platform/partner/PartnerReportsPage'
import PartnerDocumentsPage from './pages/platform/partner/PartnerDocumentsPage'
import ForbiddenPage from './pages/errors/ForbiddenPage'
import UnauthorizedPage from './pages/errors/UnauthorizedPage'
import ServerErrorPage from './pages/errors/ServerErrorPage'

const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))
const PartnerLayout = lazy(() => import('./layouts/PartnerLayout'))

// Redirects to the role-specific dashboard home; ProtectedRoute guarantees auth is resolved.
function RoleRedirect() {
  const { user } = useAuth()
  const target =
    user?.role === 'admin'   ? '/dashboard/admin' :
    user?.role === 'teacher' ? '/dashboard/teacher' :
    user?.role === 'partner' ? '/partner/dashboard' :
    '/dashboard/student'
  return <Navigate to={target} replace />
}

function RedirectAdminWebhookDetail() {
  const { id } = useParams()
  return <Navigate to={`/dashboard/admin/webhooks/${id ?? ''}`} replace />
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AppToaster />
        <AuthProvider>
          <Routes>

            {/* ── Public routes — Navbar + Footer layout ── */}
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:slug" element={<CourseDetails />} />
              <Route path="/courses/:slug/register" element={<Register />} />
              <Route path="/instructors" element={<Instructors />} />
              <Route path="/instructors/:slug" element={<InstructorDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/register" element={<Register />} />
              <Route path="/fake-payment/:paymentId" element={<FakePayment />} />
              <Route path="/submit-workshop" element={<SubmitWorkshop />} />
              <Route path="/thank-you" element={<ThankYou />} />
              {/* Phase 6 — public informational pages */}
              <Route path="/departments"  element={<Departments />} />
              <Route path="/themes"       element={<Navigate to="/tracks" replace />} />
              <Route path="/tracks"       element={<Tracks />} />
              <Route path="/paths"        element={<Paths />} />
              <Route path="/programs"     element={<Programs />} />
              <Route path="/platform"     element={<Platform />} />
              <Route path="/team"         element={<Team />} />
              <Route path="/ar/team"     element={<Team />} />
              <Route path="/impact"       element={<Impact />} />
              <Route path="/ar/impact"    element={<Impact />} />
              <Route path="/partnerships" element={<Partnerships />} />
              <Route path="/volunteer"    element={<Volunteer />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/forms/:slug" element={<PublicFormPage />} />
              <Route path="/partnerships/apply" element={<PartnershipApplyPage />} />
              <Route path="/certificates/verify/:code" element={<CertificateVerifyPage />} />
              <Route path="/knowledge" element={<KnowledgeHubPage />} />
              <Route path="/knowledge/:slug" element={<KnowledgeArticlePublicPage />} />
              <Route path="/401" element={<UnauthorizedPage />} />
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="/500" element={<ServerErrorPage />} />
              {/* 404 inside public layout so Navbar + Footer are visible */}
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* ── Protected dashboard routes — sidebar + topbar layout ── */}
            <Route element={<ProtectedRoute />}>
              {/* Pretty aliases → canonical dashboard URLs */}
              <Route path="/settings/notifications" element={<Navigate to="/dashboard/settings/notifications" replace />} />
              <Route path="/admin/integrations" element={<Navigate to="/dashboard/admin/integrations" replace />} />
              <Route path="/admin/integrations/whatsapp" element={<Navigate to="/dashboard/admin/integrations/whatsapp" replace />} />
              <Route path="/admin/integrations/email" element={<Navigate to="/dashboard/admin/integrations/email" replace />} />
              <Route path="/admin/calendar" element={<Navigate to="/dashboard/admin/calendar" replace />} />
              <Route path="/admin/webhooks" element={<Navigate to="/dashboard/admin/webhooks" replace />} />
              <Route path="/admin/webhooks/:id" element={<RedirectAdminWebhookDetail />} />
              <Route path="/admin/developer/api-tokens" element={<Navigate to="/dashboard/admin/developer/api-tokens" replace />} />
              <Route path="/admin/mobile-readiness" element={<Navigate to="/dashboard/admin/mobile-readiness" replace />} />
              <Route path="/admin/ai" element={<Navigate to="/dashboard/admin/ai" replace />} />
              <Route path="/admin/ai/automations" element={<Navigate to="/dashboard/admin/ai/automations" replace />} />
              <Route path="/admin/ai/insights" element={<Navigate to="/dashboard/admin/ai/insights" replace />} />
              <Route path="/admin/ai/usage" element={<Navigate to="/dashboard/admin/ai/usage" replace />} />
              <Route
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <PartnerLayout />
                  </Suspense>
                }
              >
                <Route element={<RoleGate allow={['partner']} />}>
                  <Route path="/partner/dashboard" element={<PartnerDashboardPage />} />
                  <Route path="/partner/programs" element={<PartnerProgramsPage />} />
                  <Route path="/partner/reports" element={<PartnerReportsPage />} />
                  <Route path="/partner/documents" element={<PartnerDocumentsPage />} />
                </Route>
              </Route>

              <Route
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <DashboardLayout />
                  </Suspense>
                }
              >
                {/* /dashboard → redirect to role-specific home */}
                <Route path="/dashboard" element={<RoleRedirect />} />
                {/* Role-specific dashboard homes */}
                <Route path="/dashboard/student" element={<Dashboard />} />
                <Route path="/dashboard/teacher" element={<TeacherDashboard />} />
                <Route path="/dashboard/admin"   element={<AdminDashboard />} />

                <Route path="/dashboard/notifications" element={<NotificationsCenterPage />} />
                <Route path="/dashboard/settings/notifications" element={<NotificationPreferencesPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/ai" element={<AiWorkspacePage />} />

                <Route element={<RoleGate allow={['student']} />}>
                  <Route path="/dashboard/student/sessions" element={<StudentSessionsPage />} />
                  <Route path="/dashboard/student/materials" element={<StudentMaterialsPage />} />
                  <Route path="/dashboard/student/assignments" element={<StudentAssignmentsPage />} />
                  <Route path="/dashboard/student/progress" element={<StudentProgressPage />} />
                  <Route path="/dashboard/student/evaluation" element={<StudentEvaluationPage />} />
                  <Route path="/dashboard/certificates" element={<StudentCertificatesPage />} />
                  <Route path="/dashboard/learning" element={<StudentLearningHubPage />} />
                  <Route path="/dashboard/courses/:courseId/modules" element={<CourseModulesPage />} />
                  <Route path="/dashboard/lessons/:lessonId" element={<LessonPlayerPage />} />
                  <Route path="/dashboard/quizzes/:quizId" element={<QuizTakePage />} />
                </Route>

                <Route element={<RoleGate allow={['teacher']} />}>
                  <Route path="/dashboard/teacher/sessions" element={<InstructorSessionsPage />} />
                  <Route path="/dashboard/teacher/attendance" element={<InstructorAttendancePage />} />
                  <Route path="/dashboard/teacher/submissions" element={<InstructorSubmissionsPage />} />
                </Route>

                <Route element={<RoleGate allow={['admin']} />}>
                  <Route path="/dashboard/admin/lms/sessions" element={<AdminLmsSessionsPage />} />
                  <Route path="/dashboard/admin/lms/attendance" element={<AdminLmsAttendancePage />} />
                  <Route path="/dashboard/admin/lms/assignments" element={<AdminLmsAssignmentsPage />} />
                  <Route path="/dashboard/admin/lms/materials" element={<AdminLmsMaterialsPage />} />
                  <Route path="/dashboard/admin/lms/evaluations" element={<AdminLmsEvaluationsPage />} />
                  <Route path="/dashboard/admin/lms/progress" element={<AdminLmsProgressPage />} />
                  <Route path="/dashboard/admin/operations" element={<OperationsDashboardPage />} />
                  <Route path="/dashboard/admin/departments" element={<OpsDepartmentsPage />} />
                  <Route path="/dashboard/admin/departments/:id" element={<OpsDepartmentDetailPage />} />
                  <Route path="/dashboard/admin/tasks" element={<OpsTasksListPage />} />
                  <Route path="/dashboard/admin/tasks/kanban" element={<OpsTasksKanbanPage />} />
                  <Route path="/dashboard/admin/tasks/my" element={<OpsTasksMyPage />} />
                  <Route path="/dashboard/admin/tasks/overdue" element={<OpsTasksOverduePage />} />
                  <Route path="/dashboard/admin/meetings" element={<OpsMeetingsPage />} />
                  <Route path="/dashboard/admin/meetings/:id" element={<OpsMeetingDetailPage />} />
                  <Route path="/dashboard/admin/forms" element={<OpsFormsPage />} />
                  <Route path="/dashboard/admin/forms/create" element={<OpsFormCreatePage />} />
                  <Route path="/dashboard/admin/forms/:id" element={<OpsFormDetailPage />} />
                  <Route path="/dashboard/admin/volunteers" element={<OpsVolunteersPage />} />
                  <Route path="/dashboard/admin/volunteers/:id" element={<OpsVolunteerDetailPage />} />
                  <Route path="/dashboard/admin/partners" element={<OpsPartnersPage />} />
                  <Route path="/dashboard/admin/partnership-requests" element={<OpsPartnershipRequestsPage />} />
                  <Route path="/dashboard/admin/marketing" element={<OpsMarketingPage />} />
                  <Route path="/dashboard/admin/support-tickets" element={<OpsSupportTicketsPage />} />
                  <Route path="/dashboard/admin/support-tickets/:id" element={<OpsSupportTicketDetailPage />} />
                  <Route path="/dashboard/admin/finance" element={<FinanceDashboardPage />} />
                  <Route path="/dashboard/admin/finance/payments" element={<FinancePaymentsPage />} />
                  <Route path="/dashboard/admin/finance/transactions" element={<FinanceTransactionsPage />} />
                  <Route path="/dashboard/admin/coupons" element={<CouponsAdminPage />} />
                  <Route path="/dashboard/admin/scholarships" element={<ScholarshipsAdminPage />} />
                  <Route path="/dashboard/admin/certificates" element={<CertificatesAdminPage />} />
                  <Route path="/dashboard/admin/quality" element={<QualityAdminPage />} />
                  <Route path="/dashboard/admin/kpi" element={<KpiAdminPage />} />
                  <Route path="/dashboard/admin/reports" element={<ReportsAdminPage />} />
                  <Route path="/dashboard/admin/knowledge" element={<AdminKnowledgeHubPage />} />
                  <Route path="/dashboard/admin/knowledge/categories" element={<AdminKnowledgeCategoriesPage />} />
                  <Route path="/dashboard/admin/knowledge/articles/create" element={<AdminKnowledgeArticleCreatePage />} />
                  <Route path="/dashboard/admin/knowledge/articles/:id/edit" element={<AdminKnowledgeArticleEditPage />} />
                  <Route path="/dashboard/admin/modules" element={<AdminModulesPage />} />
                  <Route path="/dashboard/admin/lessons" element={<AdminLessonsPage />} />
                  <Route path="/dashboard/admin/quizzes" element={<AdminQuizzesPage />} />
                  <Route path="/dashboard/admin/automations" element={<AdminAutomationsPage />} />
                  <Route path="/dashboard/admin/automations/runs" element={<AdminAutomationRunsPage />} />
                  <Route path="/dashboard/admin/documents" element={<AdminDocumentsPage />} />
                  <Route path="/dashboard/admin/audit-logs" element={<AdminAuditLogsPage />} />
                  <Route path="/dashboard/admin/platform-scale" element={<PlatformScaleDashboardPage />} />
                  <Route path="/dashboard/admin/integrations" element={<AdminIntegrationsPage />} />
                  <Route path="/dashboard/admin/integrations/whatsapp" element={<WhatsAppIntegrationPage />} />
                  <Route path="/dashboard/admin/integrations/email" element={<EmailIntegrationPage />} />
                  <Route path="/dashboard/admin/calendar" element={<CalendarPage />} />
                  <Route path="/dashboard/admin/webhooks" element={<AdminWebhooksPage />} />
                  <Route path="/dashboard/admin/webhooks/:id" element={<AdminWebhookDetailPage />} />
                  <Route path="/dashboard/admin/developer/api-tokens" element={<AdminApiTokensPage />} />
                  <Route path="/dashboard/admin/mobile-readiness" element={<AdminMobileReadinessPage />} />
                  <Route path="/dashboard/admin/ai" element={<AdminAiCommandCenterPage />} />
                  <Route path="/dashboard/admin/ai/automations" element={<AdminAiAutomationsPage />} />
                  <Route path="/dashboard/admin/ai/insights" element={<AdminAiInsightsPage />} />
                  <Route path="/dashboard/admin/ai/usage" element={<AdminAiUsagePage />} />
                </Route>

              </Route>
            </Route>

          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
