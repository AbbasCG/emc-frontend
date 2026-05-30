import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ScrollToTop from './components/ScrollToTop'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import DashboardAccessGuard from './components/DashboardAccessGuard'
import AppToaster from './components/feedback/AppToaster'
import RouteFallback from './components/RouteFallback'
import { getDashboardPathByRole } from './utils/dashboardAccess'

// ── Eager: tiny, critical-path public pages ──────────────────────────────────
import Home from './pages/Home'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'

// ── Lazy: public pages (rarely above-the-fold on first load) ─────────────────
const About              = lazy(() => import('./pages/About'))
const Contact            = lazy(() => import('./pages/Contact'))
const CourseDetails      = lazy(() => import('./pages/CourseDetails'))
const Courses            = lazy(() => import('./pages/Courses'))
const FakePayment        = lazy(() => import('./pages/FakePayment'))
const Departments        = lazy(() => import('./pages/Departments'))
const InstructorDetail   = lazy(() => import('./pages/InstructorDetail'))
const Instructors        = lazy(() => import('./pages/Instructors'))
const Impact             = lazy(() => import('./pages/Impact'))
const Partnerships       = lazy(() => import('./pages/Partnerships'))
const Paths              = lazy(() => import('./pages/Paths'))
const Platform           = lazy(() => import('./pages/Platform'))
const Programs           = lazy(() => import('./pages/Programs'))
const Register           = lazy(() => import('./pages/Register'))
const Signup             = lazy(() => import('./pages/Signup'))
const SubmitWorkshop     = lazy(() => import('./pages/SubmitWorkshop'))
const Team               = lazy(() => import('./pages/Team'))
const ThankYou           = lazy(() => import('./pages/ThankYou'))
const Tracks             = lazy(() => import('./pages/Tracks'))
const Volunteer          = lazy(() => import('./pages/Volunteer'))

// ── Lazy: dashboard layout (code-split entry point) ──────────────────────────
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))

// ── Lazy: dashboard pages — student ──────────────────────────────────────────
const Dashboard                  = lazy(() => import('./pages/Dashboard'))
const StudentMyCoursesPage       = lazy(() => import('./pages/lms/student/StudentMyCoursesPage'))
const StudentCourseLearnPage     = lazy(() => import('./pages/lms/student/StudentCourseLearnPage'))
const StudentRegistrationsListPage = lazy(() => import('./pages/lms/student/StudentRegistrationsListPage'))
const StudentAvailableCoursesPage  = lazy(() => import('./pages/lms/student/StudentAvailableCoursesPage'))
const StudentSessionsPage        = lazy(() => import('./pages/lms/student/StudentSessionsPage'))
const StudentMaterialsPage       = lazy(() => import('./pages/lms/student/StudentMaterialsPage'))
const StudentAssignmentsPage     = lazy(() => import('./pages/lms/student/StudentAssignmentsPage'))
const StudentProgressPage        = lazy(() => import('./pages/lms/student/StudentProgressPage'))
const StudentEvaluationPage      = lazy(() => import('./pages/lms/student/StudentEvaluationPage'))

// ── Lazy: dashboard pages — instructor / teacher ──────────────────────────────
const TeacherDashboard           = lazy(() => import('./pages/TeacherDashboard'))
const InstructorAssignedCoursesPage  = lazy(() => import('./pages/lms/instructor/InstructorAssignedCoursesPage'))
const InstructorSessionsPage     = lazy(() => import('./pages/lms/instructor/InstructorSessionsPage'))
const InstructorAttendancePage   = lazy(() => import('./pages/lms/instructor/InstructorAttendancePage'))
const InstructorSubmissionsPage  = lazy(() => import('./pages/lms/instructor/InstructorSubmissionsPage'))

// ── Lazy: dashboard pages — admin LMS ────────────────────────────────────────
const AdminDashboard             = lazy(() => import('./pages/AdminDashboard'))
const AdminLmsSessionsPage       = lazy(() => import('./pages/lms/admin/AdminLmsSessionsPage'))
const AdminLmsAttendancePage     = lazy(() => import('./pages/lms/admin/AdminLmsAttendancePage'))
const AdminLmsAssignmentsPage    = lazy(() => import('./pages/lms/admin/AdminLmsAssignmentsPage'))
const AdminLmsMaterialsPage      = lazy(() => import('./pages/lms/admin/AdminLmsMaterialsPage'))
const AdminLmsEvaluationsPage    = lazy(() => import('./pages/lms/admin/AdminLmsEvaluationsPage'))
const AdminLmsProgressPage       = lazy(() => import('./pages/lms/admin/AdminLmsProgressPage'))
const CourseContentManagerPage   = lazy(() => import('./pages/lms/admin/CourseContentManagerPage'))

// ── Lazy: advanced LMS (lessons, quizzes, modules) ───────────────────────────
const CourseModulesPage   = lazy(() => import('./pages/platform/CourseModulesPage'))
const LessonPlayerPage    = lazy(() => import('./pages/platform/LessonPlayerPage'))
const QuizTakePage        = lazy(() => import('./pages/platform/QuizTakePage'))
const StudentLearningHubPage = lazy(() => import('./pages/platform/StudentLearningHubPage'))

// ── Lazy: dashboard pages — operations ───────────────────────────────────────
const OperationsDashboardPage       = lazy(() => import('./pages/operations/admin/OperationsDashboardPage'))
const OpsDepartmentsPage            = lazy(() => import('./pages/operations/admin/OpsDepartmentsPage'))
const OpsDepartmentDetailPage       = lazy(() => import('./pages/operations/admin/OpsDepartmentDetailPage'))
const OpsTasksListPage              = lazy(() => import('./pages/operations/admin/OpsTasksListPage'))
const OpsTasksKanbanPage            = lazy(() => import('./pages/operations/admin/OpsTasksKanbanPage'))
const OpsTasksMyPage                = lazy(() => import('./pages/operations/admin/OpsTasksMyPage'))
const OpsTasksOverduePage           = lazy(() => import('./pages/operations/admin/OpsTasksOverduePage'))
const OpsMeetingsPage               = lazy(() => import('./pages/operations/admin/OpsMeetingsPage'))
const OpsMeetingDetailPage          = lazy(() => import('./pages/operations/admin/OpsMeetingDetailPage'))
const OpsFormsPage                  = lazy(() => import('./pages/operations/admin/OpsFormsPage'))
const OpsFormCreatePage             = lazy(() => import('./pages/operations/admin/OpsFormCreatePage'))
const OpsFormDetailPage             = lazy(() => import('./pages/operations/admin/OpsFormDetailPage'))
const OpsVolunteersPage             = lazy(() => import('./pages/operations/admin/OpsVolunteersPage'))
const OpsVolunteerDetailPage        = lazy(() => import('./pages/operations/admin/OpsVolunteerDetailPage'))
const OpsPartnersPage               = lazy(() => import('./pages/operations/admin/OpsPartnersPage'))
const OpsPartnershipRequestsPage    = lazy(() => import('./pages/operations/admin/OpsPartnershipRequestsPage'))
const OpsMarketingPage              = lazy(() => import('./pages/operations/admin/OpsMarketingPage'))
const OpsSupportTicketsPage         = lazy(() => import('./pages/operations/admin/OpsSupportTicketsPage'))
const OpsSupportTicketDetailPage    = lazy(() => import('./pages/operations/admin/OpsSupportTicketDetailPage'))
const SupportPage                   = lazy(() => import('./pages/operations/public/SupportPage'))
const PublicFormPage                = lazy(() => import('./pages/operations/public/PublicFormPage'))
const PartnershipApplyPage          = lazy(() => import('./pages/operations/public/PartnershipApplyPage'))

// ── Lazy: dashboard pages — intelligence / finance / quality ─────────────────
const FinanceDashboardPage    = lazy(() => import('./pages/intelligence/admin/FinanceDashboardPage'))
const FinancePaymentsPage     = lazy(() => import('./pages/intelligence/admin/FinancePaymentsPage'))
const FinanceTransactionsPage = lazy(() => import('./pages/intelligence/admin/FinanceTransactionsPage'))
const CouponsAdminPage        = lazy(() => import('./pages/intelligence/admin/CouponsAdminPage'))
const ScholarshipsAdminPage   = lazy(() => import('./pages/intelligence/admin/ScholarshipsAdminPage'))
const CertificatesAdminPage   = lazy(() => import('./pages/intelligence/admin/CertificatesAdminPage'))
const QualityAdminPage        = lazy(() => import('./pages/intelligence/admin/QualityAdminPage'))
const KpiAdminPage            = lazy(() => import('./pages/intelligence/admin/KpiAdminPage'))
const ReportsAdminPage        = lazy(() => import('./pages/intelligence/admin/ReportsAdminPage'))
const StudentCertificatesPage = lazy(() => import('./pages/intelligence/student/StudentCertificatesPage'))
const CertificateVerifyPage   = lazy(() => import('./pages/intelligence/public/CertificateVerifyPage'))

// ── Lazy: dashboard pages — platform / knowledge / AI ────────────────────────
const KnowledgeHubPage              = lazy(() => import('./pages/platform/KnowledgeHubPage'))
const KnowledgeArticlePublicPage    = lazy(() => import('./pages/platform/KnowledgeArticlePublicPage'))
const NotificationsCenterPage       = lazy(() => import('./pages/platform/NotificationsCenterPage'))
const DocumentsPage                 = lazy(() => import('./pages/platform/DocumentsPage'))
const AiWorkspacePage               = lazy(() => import('./pages/platform/AiWorkspacePage'))
const AdminKnowledgeHubPage         = lazy(() => import('./pages/platform/admin/AdminKnowledgeHubPage'))
const AdminKnowledgeCategoriesPage  = lazy(() => import('./pages/platform/admin/AdminKnowledgeCategoriesPage'))
const AdminKnowledgeArticleCreatePage = lazy(() => import('./pages/platform/admin/AdminKnowledgeArticleCreatePage'))
const AdminKnowledgeArticleEditPage   = lazy(() => import('./pages/platform/admin/AdminKnowledgeArticleEditPage'))
const AdminLessonsPage   = lazy(() => import('./pages/platform/admin/AdminLmsStructurePages').then(m => ({ default: m.AdminLessonsPage })))
const AdminModulesPage   = lazy(() => import('./pages/platform/admin/AdminLmsStructurePages').then(m => ({ default: m.AdminModulesPage })))
const AdminQuizzesPage   = lazy(() => import('./pages/platform/admin/AdminLmsStructurePages').then(m => ({ default: m.AdminQuizzesPage })))
const AdminAutomationsPage      = lazy(() => import('./pages/platform/admin/AdminAutomationsPage'))
const AdminAutomationRunsPage   = lazy(() => import('./pages/platform/admin/AdminAutomationRunsPage'))
const AdminDocumentsPage        = lazy(() => import('./pages/platform/admin/AdminDocumentsPage'))
const AdminAuditLogsPage        = lazy(() => import('./pages/platform/admin/AdminAuditLogsPage'))
const PlatformScaleDashboardPage = lazy(() => import('./pages/platform/admin/PlatformScaleDashboardPage'))
const AdminIntegrationsPage     = lazy(() => import('./pages/platform/admin/AdminIntegrationsPage'))
const WhatsAppIntegrationPage   = lazy(() => import('./pages/platform/admin/integrations/WhatsAppIntegrationPage'))
const EmailIntegrationPage      = lazy(() => import('./pages/platform/admin/integrations/EmailIntegrationPage'))
const AdminWebhooksPage         = lazy(() => import('./pages/platform/admin/AdminWebhooksPage'))
const AdminWebhookDetailPage    = lazy(() => import('./pages/platform/admin/AdminWebhookDetailPage'))
const AdminApiTokensPage        = lazy(() => import('./pages/platform/admin/developer/AdminApiTokensPage'))
const AdminMobileReadinessPage  = lazy(() => import('./pages/platform/admin/AdminMobileReadinessPage'))
const AdminAiCommandCenterPage  = lazy(() => import('./pages/platform/admin/ai/AdminAiCommandCenterPage'))
const AdminAiAutomationsPage    = lazy(() => import('./pages/platform/admin/ai/AdminAiAutomationsPage'))
const AdminAiInsightsPage       = lazy(() => import('./pages/platform/admin/ai/AdminAiInsightsPage'))
const AdminAiUsagePage          = lazy(() => import('./pages/platform/admin/ai/AdminAiUsagePage'))
const PartnerDashboardPage      = lazy(() => import('./pages/platform/partner/PartnerDashboardPage'))
const PartnerProgramsPage       = lazy(() => import('./pages/platform/partner/PartnerProgramsPage'))
const PartnerReportsPage        = lazy(() => import('./pages/platform/partner/PartnerReportsPage'))
const PartnerDocumentsPage      = lazy(() => import('./pages/platform/partner/PartnerDocumentsPage'))

// ── Lazy: dashboard pages — HR ───────────────────────────────────────────────
const HrDashboardPage   = lazy(() => import('./pages/hr/HrDashboardPage'))
const HrTeamPage        = lazy(() => import('./pages/hr/HrTeamPage'))
const HrVolunteersPage  = lazy(() => import('./pages/hr/HrVolunteersPage'))
const HrInstructorsPage = lazy(() => import('./pages/hr/HrInstructorsPage'))
const HrApplicationsPage = lazy(() => import('./pages/hr/HrApplicationsPage'))
const HrDepartmentsPage = lazy(() => import('./pages/hr/HrDepartmentsPage'))
const HrOnboardingPage  = lazy(() => import('./pages/hr/HrOnboardingPage'))
const HrTasksPage       = lazy(() => import('./pages/hr/HrTasksPage'))
const HrDocumentsPage   = lazy(() => import('./pages/hr/HrDocumentsPage'))

// ── Lazy: dashboard pages — super admin ──────────────────────────────────────
const SuperAdminOverviewPage      = lazy(() => import('./pages/super-admin/SuperAdminOverviewPage'))
const SuperAdminAuditLogsPage     = lazy(() => import('./pages/super-admin/AuditLogsPage'))
const UsersManagementPage         = lazy(() => import('./pages/super-admin/crud/UsersManagementPage'))
const RolesPermissionsPage        = lazy(() => import('./pages/super-admin/crud/RolesPermissionsPage'))
const DepartmentsManagementPage   = lazy(() => import('./pages/super-admin/crud/DepartmentsManagementPage'))
const TeamManagementPage          = lazy(() => import('./pages/super-admin/crud/TeamManagementPage'))
const StudentsManagementPage      = lazy(() => import('./pages/super-admin/crud/StudentsManagementPage'))
const InstructorsManagementPage   = lazy(() => import('./pages/super-admin/crud/InstructorsManagementPage'))
const ProgramsManagementPage      = lazy(() => import('./pages/super-admin/crud/ProgramsManagementPage'))
const TracksManagementPage        = lazy(() => import('./pages/super-admin/crud/TracksManagementPage'))
const WorkshopsManagementPage     = lazy(() => import('./pages/super-admin/crud/WorkshopsManagementPage'))
const RegistrationsManagementPage = lazy(() => import('./pages/super-admin/crud/RegistrationsManagementPage'))
const PartnersManagementPage      = lazy(() => import('./pages/super-admin/crud/PartnersManagementPage'))

// ── Lazy: settings, profile, calendar, error pages ───────────────────────────
const NotificationPreferencesPage = lazy(() => import('./pages/settings/NotificationPreferencesPage'))
const ProfilePage    = lazy(() => import('./pages/ProfilePage'))
const CalendarPage   = lazy(() => import('./pages/calendar/CalendarPage'))
const ForbiddenPage      = lazy(() => import('./pages/errors/ForbiddenPage'))
const UnauthorizedPage   = lazy(() => import('./pages/errors/UnauthorizedPage'))
const ServerErrorPage    = lazy(() => import('./pages/errors/ServerErrorPage'))

// ── Helpers ───────────────────────────────────────────────────────────────────

function RoleRedirect() {
  const { user } = useAuth()
  return <Navigate to={getDashboardPathByRole(user?.role)} replace />
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
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />

              <Route path="/courses" element={<Suspense fallback={<RouteFallback />}><Courses /></Suspense>} />
              <Route path="/courses/:slug" element={<Suspense fallback={<RouteFallback />}><CourseDetails /></Suspense>} />
              <Route path="/courses/:slug/register" element={<Suspense fallback={<RouteFallback />}><Register /></Suspense>} />
              <Route path="/instructors" element={<Suspense fallback={<RouteFallback />}><Instructors /></Suspense>} />
              <Route path="/instructors/:slug" element={<Suspense fallback={<RouteFallback />}><InstructorDetail /></Suspense>} />
              <Route path="/about" element={<Suspense fallback={<RouteFallback />}><About /></Suspense>} />
              <Route path="/contact" element={<Suspense fallback={<RouteFallback />}><Contact /></Suspense>} />
              <Route path="/signup" element={<Suspense fallback={<RouteFallback />}><Signup /></Suspense>} />
              <Route path="/register" element={<Suspense fallback={<RouteFallback />}><Register /></Suspense>} />
              {import.meta.env.DEV && <Route path="/fake-payment/:paymentId" element={<Suspense fallback={<RouteFallback />}><FakePayment /></Suspense>} />}
              <Route path="/submit-workshop" element={<Suspense fallback={<RouteFallback />}><SubmitWorkshop /></Suspense>} />
              <Route path="/thank-you" element={<Suspense fallback={<RouteFallback />}><ThankYou /></Suspense>} />
              <Route path="/departments"  element={<Suspense fallback={<RouteFallback />}><Departments /></Suspense>} />
              <Route path="/themes"       element={<Navigate to="/tracks" replace />} />
              <Route path="/tracks"       element={<Suspense fallback={<RouteFallback />}><Tracks /></Suspense>} />
              <Route path="/paths"        element={<Suspense fallback={<RouteFallback />}><Paths /></Suspense>} />
              <Route path="/programs"     element={<Suspense fallback={<RouteFallback />}><Programs /></Suspense>} />
              <Route path="/platform"     element={<Suspense fallback={<RouteFallback />}><Platform /></Suspense>} />
              <Route path="/team"         element={<Suspense fallback={<RouteFallback />}><Team /></Suspense>} />
              <Route path="/ar/team"      element={<Suspense fallback={<RouteFallback />}><Team /></Suspense>} />
              <Route path="/impact"       element={<Suspense fallback={<RouteFallback />}><Impact /></Suspense>} />
              <Route path="/ar/impact"    element={<Suspense fallback={<RouteFallback />}><Impact /></Suspense>} />
              <Route path="/partnerships" element={<Suspense fallback={<RouteFallback />}><Partnerships /></Suspense>} />
              <Route path="/volunteer"    element={<Suspense fallback={<RouteFallback />}><Volunteer /></Suspense>} />
              <Route path="/support" element={<Suspense fallback={<RouteFallback />}><SupportPage /></Suspense>} />
              <Route path="/forms/:slug" element={<Suspense fallback={<RouteFallback />}><PublicFormPage /></Suspense>} />
              <Route path="/partnerships/apply" element={<Suspense fallback={<RouteFallback />}><PartnershipApplyPage /></Suspense>} />
              <Route path="/certificates/verify/:code" element={<Suspense fallback={<RouteFallback />}><CertificateVerifyPage /></Suspense>} />
              <Route path="/knowledge" element={<Suspense fallback={<RouteFallback />}><KnowledgeHubPage /></Suspense>} />
              <Route path="/knowledge/:slug" element={<Suspense fallback={<RouteFallback />}><KnowledgeArticlePublicPage /></Suspense>} />
              <Route path="/401" element={<Suspense fallback={<RouteFallback />}><UnauthorizedPage /></Suspense>} />
              <Route path="/403" element={<Suspense fallback={<RouteFallback />}><ForbiddenPage /></Suspense>} />
              <Route path="/404" element={<NotFound />} />
              <Route path="/500" element={<Suspense fallback={<RouteFallback />}><ServerErrorPage /></Suspense>} />
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
              <Route path="/partner/dashboard" element={<Navigate to="/dashboard/partner" replace />} />
              <Route path="/partner/programs" element={<Navigate to="/dashboard/partner/programs" replace />} />
              <Route path="/partner/reports" element={<Navigate to="/dashboard/partner/reports" replace />} />
              <Route path="/partner/documents" element={<Navigate to="/dashboard/partner/documents" replace />} />
              <Route
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <DashboardLayout />
                  </Suspense>
                }
              >
                <Route element={<DashboardAccessGuard />}>
                  <Route path="/dashboard/teacher/*" element={<span className="sr-only" />} />

                  <Route path="/dashboard" element={<RoleRedirect />} />
                  <Route path="/dashboard/super-admin" element={<SuperAdminOverviewPage />} />
                  <Route path="/dashboard/super-admin/audit-logs" element={<SuperAdminAuditLogsPage />} />
                  <Route
                    path="/dashboard/super-admin/crud/partnerships"
                    element={<Navigate to="/dashboard/super-admin/crud/partners" replace />}
                  />
                  <Route path="/dashboard/super-admin/crud/users/new" element={<Navigate to="/dashboard/super-admin/crud/users" replace />} />
                  <Route path="/dashboard/super-admin/crud/users/:id/edit" element={<Navigate to="/dashboard/super-admin/crud/users" replace />} />
                  <Route path="/dashboard/super-admin/crud/users/:id" element={<Navigate to="/dashboard/super-admin/crud/users" replace />} />

                  <Route path="/dashboard/super-admin/crud/users" element={<UsersManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/roles" element={<RolesPermissionsPage />} />
                  <Route path="/dashboard/super-admin/crud/departments" element={<DepartmentsManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/team" element={<TeamManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/students" element={<StudentsManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/instructors" element={<InstructorsManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/programs" element={<ProgramsManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/tracks" element={<TracksManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/workshops" element={<WorkshopsManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/registrations" element={<RegistrationsManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/partners" element={<PartnersManagementPage />} />
                  <Route
                    path="/dashboard/super-admin/crud/programs/:courseId/content"
                    element={<CourseContentManagerPage />}
                  />
                  <Route path="/dashboard/super-admin/crud/*" element={<Navigate to="/dashboard/super-admin" replace />} />

                  <Route path="/dashboard/admin/programs" element={<ProgramsManagementPage />} />

                  <Route path="/dashboard/student" element={<Dashboard />} />
                  <Route path="/dashboard/student/courses" element={<StudentMyCoursesPage />} />
                  <Route path="/dashboard/student/learn/:courseId" element={<StudentCourseLearnPage />} />
                  <Route path="/dashboard/student/registrations" element={<StudentRegistrationsListPage />} />
                  <Route path="/dashboard/student/available-courses" element={<StudentAvailableCoursesPage />} />
                  <Route path="/dashboard/instructor" element={<TeacherDashboard />} />
                  <Route path="/dashboard/instructor/courses" element={<InstructorAssignedCoursesPage />} />
                  <Route path="/dashboard/instructor/courses/:courseId/content" element={<CourseContentManagerPage />} />
                  <Route path="/dashboard/instructor/workshops" element={<InstructorAssignedCoursesPage />} />
                  <Route path="/dashboard/admin" element={<AdminDashboard />} />
                  <Route path="/dashboard/executive" element={<OperationsDashboardPage />} />

                  <Route path="/dashboard/partner" element={<PartnerDashboardPage />} />
                  <Route path="/dashboard/partner/programs" element={<PartnerProgramsPage />} />
                  <Route path="/dashboard/partner/reports" element={<PartnerReportsPage />} />
                  <Route path="/dashboard/partner/documents" element={<PartnerDocumentsPage />} />

                  <Route path="/dashboard/executive/operations" element={<OperationsDashboardPage />} />
                  <Route path="/dashboard/executive/kpi" element={<KpiAdminPage />} />
                  <Route path="/dashboard/executive/reports" element={<ReportsAdminPage />} />
                  <Route path="/dashboard/executive/programs" element={<ProgramsManagementPage />} />
                  <Route path="/dashboard/finance" element={<FinanceDashboardPage />} />
                  <Route path="/dashboard/finance/payments" element={<FinancePaymentsPage />} />
                  <Route path="/dashboard/finance/transactions" element={<FinanceTransactionsPage />} />
                  <Route path="/dashboard/quality" element={<QualityAdminPage />} />
                  <Route path="/dashboard/hr" element={<HrDashboardPage />} />
                  <Route path="/dashboard/hr/team" element={<HrTeamPage />} />
                  <Route path="/dashboard/hr/volunteers" element={<HrVolunteersPage />} />
                  <Route path="/dashboard/hr/instructors" element={<HrInstructorsPage />} />
                  <Route path="/dashboard/hr/applications" element={<HrApplicationsPage />} />
                  <Route path="/dashboard/hr/departments" element={<HrDepartmentsPage />} />
                  <Route path="/dashboard/hr/onboarding" element={<HrOnboardingPage />} />
                  <Route path="/dashboard/hr/tasks" element={<HrTasksPage />} />
                  <Route path="/dashboard/hr/documents" element={<HrDocumentsPage />} />
                  <Route path="/dashboard/marketing" element={<OpsMarketingPage />} />
                  <Route path="/dashboard/support" element={<OpsSupportTicketsPage />} />
                  <Route path="/dashboard/support/:id" element={<OpsSupportTicketDetailPage />} />
                  <Route path="/dashboard/volunteer" element={<OpsVolunteersPage />} />
                  <Route path="/dashboard/volunteer/:id" element={<OpsVolunteerDetailPage />} />
                  <Route path="/dashboard/department" element={<OpsDepartmentsPage />} />
                  <Route path="/dashboard/department/programs" element={<ProgramsManagementPage />} />
                  <Route path="/dashboard/department/:id" element={<OpsDepartmentDetailPage />} />

                  <Route path="/dashboard/notifications" element={<NotificationsCenterPage />} />
                  <Route path="/dashboard/profile" element={<ProfilePage />} />
                  <Route path="/dashboard/settings" element={<Navigate to="/dashboard/settings/notifications" replace />} />
                  <Route path="/dashboard/settings/notifications" element={<NotificationPreferencesPage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/ai" element={<AiWorkspacePage />} />

                  <Route path="/dashboard/student/sessions" element={<StudentSessionsPage />} />
                  <Route path="/dashboard/student/materials" element={<StudentMaterialsPage />} />
                  <Route path="/dashboard/student/assignments" element={<StudentAssignmentsPage />} />
                  <Route path="/dashboard/student/progress" element={<StudentProgressPage />} />
                  <Route path="/dashboard/student/evaluation" element={<StudentEvaluationPage />} />
                  <Route path="/dashboard/certificates" element={<StudentCertificatesPage />} />
                  <Route path="/dashboard/learning" element={<StudentLearningHubPage />} />
                  <Route path="/dashboard/courses/:courseId/modules" element={<CourseModulesPage />} />
                  <Route path="/dashboard/courses/:courseId/content" element={<CourseContentManagerPage />} />
                  <Route path="/dashboard/admin/lms/courses/:courseId/content" element={<CourseContentManagerPage />} />
                  <Route path="/dashboard/lessons/:lessonId" element={<LessonPlayerPage />} />
                  <Route path="/dashboard/quizzes/:quizId" element={<QuizTakePage />} />

                  <Route path="/dashboard/instructor/sessions" element={<InstructorSessionsPage />} />
                  <Route path="/dashboard/instructor/attendance" element={<InstructorAttendancePage />} />
                  <Route path="/dashboard/instructor/submissions" element={<InstructorSubmissionsPage />} />

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
