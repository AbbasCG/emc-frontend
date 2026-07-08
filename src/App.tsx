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
import { CookieConsentProvider } from './contexts/CookieConsentContext'
import CookieBanner from './components/legal/CookieBanner'
import CookiePreferencesModal from './components/legal/CookiePreferencesModal'
import { ALL_LEGAL_DOCUMENTS } from './data/legal'
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
const LearningPaths      = lazy(() => import('./pages/LearningPaths'))
const LearningPathDetail = lazy(() => import('./pages/LearningPathDetail'))
const Workshops          = lazy(() => import('./pages/Workshops'))
const WorkshopDetails    = lazy(() => import('./pages/WorkshopDetails'))
const Platform           = lazy(() => import('./pages/Platform'))
const Programs           = lazy(() => import('./pages/Programs'))
const Register           = lazy(() => import('./pages/Register'))
const Signup             = lazy(() => import('./pages/Signup'))
const SubmitWorkshop     = lazy(() => import('./pages/SubmitWorkshop'))
const Team               = lazy(() => import('./pages/Team'))
const VolunteerApply     = lazy(() => import('./pages/VolunteerApply'))
const ThankYou           = lazy(() => import('./pages/ThankYou'))
const Tracks             = lazy(() => import('./pages/Tracks'))
const Volunteer          = lazy(() => import('./pages/Volunteer'))
const LegalPage          = lazy(() => import('./pages/legal/LegalPage'))

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
const StudentAttendancePage      = lazy(() => import('./pages/lms/student/StudentAttendancePage'))
const StudentProgressPage        = lazy(() => import('./pages/lms/student/StudentProgressPage'))
const StudentEvaluationPage      = lazy(() => import('./pages/lms/student/StudentEvaluationPage'))
const PlacementTestPage          = lazy(() => import('./pages/lms/student/PlacementTestPage'))
const PlacementResultPage        = lazy(() => import('./pages/lms/student/PlacementResultPage'))
const OralBookingPage            = lazy(() => import('./pages/lms/student/OralBookingPage'))
const StudentExamsPage           = lazy(() => import('./pages/lms/student/StudentExamsPage'))
const StudentLearningPathsPage   = lazy(() => import('./pages/lms/student/StudentLearningPathsPage'))
const StudentLearningPathDetailPage = lazy(() => import('./pages/lms/student/StudentLearningPathDetailPage'))

// ── Lazy: dashboard pages — instructor / teacher ──────────────────────────────
const TeacherDashboard           = lazy(() => import('./pages/TeacherDashboard'))
const InstructorAssignedCoursesPage  = lazy(() => import('./pages/lms/instructor/InstructorAssignedCoursesPage'))
const InstructorSessionsPage     = lazy(() => import('./pages/lms/instructor/InstructorSessionsPage'))
const InstructorAttendancePage   = lazy(() => import('./pages/lms/instructor/InstructorAttendancePage'))
const InstructorSubmissionsPage  = lazy(() => import('./pages/lms/instructor/InstructorSubmissionsPage'))
const InstructorPlacementStudentsPage = lazy(() => import('./pages/lms/instructor/InstructorPlacementStudentsPage'))
const InstructorOralAssessmentsPage   = lazy(() => import('./pages/lms/instructor/InstructorOralAssessmentsPage'))
const InstructorAvailabilityPage      = lazy(() => import('./pages/lms/instructor/InstructorAvailabilityPage'))
const InstructorAllStudentsPage       = lazy(() => import('./pages/lms/instructor/InstructorAllStudentsPage'))
const InstructorCourseStudentsPage    = lazy(() => import('./pages/lms/instructor/InstructorCourseStudentsPage'))
const InstructorPlacementTestsPage    = lazy(() => import('./pages/lms/instructor/InstructorPlacementTestsPage'))
const InstructorClassesPage           = lazy(() => import('./pages/lms/instructor/InstructorClassesPage'))

// ── Lazy: Certificate Management (LMS-style) ─────────────────────────────────
const AdminCertificatesLmsPage         = lazy(() => import('./pages/lms/admin/AdminCertificatesPage'))
const AdminCertificateIssuePage        = lazy(() => import('./pages/lms/admin/AdminCertificateIssuePage'))
const AdminCertificateTemplatesPage    = lazy(() => import('./pages/lms/admin/AdminCertificateTemplatesPage'))
const AdminCertificateBatchesPage      = lazy(() => import('./pages/lms/admin/AdminCertificateBatchesPage'))
const AdminCertificateDetailPage       = lazy(() => import('./pages/lms/admin/AdminCertificateDetailPage'))
const AdminCertificateDesignerPage     = lazy(() => import('./pages/lms/admin/AdminCertificateDesignerPage'))
const AdminCertificateAnalyticsPage    = lazy(() => import('./pages/lms/admin/AdminCertificateAnalyticsPage'))
const StudentCertificatesLmsPage    = lazy(() => import('./pages/lms/student/StudentCertificatesPage'))
const PaymentSuccessPage            = lazy(() => import('./pages/student/PaymentSuccessPage'))
const StudentOrdersPage             = lazy(() => import('./pages/student/StudentOrdersPage'))
const FinanceOrdersPage             = lazy(() => import('./pages/intelligence/admin/FinanceOrdersPage'))
const FinanceInvoicesPage           = lazy(() => import('./pages/intelligence/admin/FinanceInvoicesPage'))
const FinanceFinancialRequestsPage  = lazy(() => import('./pages/finance/FinanceFinancialRequestsPage'))
const DepartmentFinancialRequestsPage = lazy(() => import('./pages/department/DepartmentFinancialRequestsPage'))
const ExecutiveFinancialRequestsPage  = lazy(() => import('./pages/executive/ExecutiveFinancialRequestsPage'))
const SuperAdminFinancialRequestsPage = lazy(() => import('./pages/super-admin/SuperAdminFinancialRequestsPage'))

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
const AcceptedVolunteersPage        = lazy(() => import('./pages/admin/AcceptedVolunteersPage'))
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
const QualityAdminPage        = lazy(() => import('./pages/intelligence/admin/QualityAdminPage'))

// ── Lazy: Quality Management System pages ────────────────────────────────────
const QualityDashboardPage         = lazy(() => import('./pages/quality/QualityDashboardPage'))
const QualityReviewsPage           = lazy(() => import('./pages/quality/QualityReviewsPage'))
const QualityIncidentsPage         = lazy(() => import('./pages/quality/QualityIncidentsPage'))
const QualityAuditLogsPage         = lazy(() => import('./pages/quality/QualityAuditLogsPage'))
const QualityCorrectiveActionsPage = lazy(() => import('./pages/quality/QualityCorrectiveActionsPage'))
const QualityTeamPage              = lazy(() => import('./pages/quality/QualityTeamPage'))
const QualityReportsPage           = lazy(() => import('./pages/quality/QualityReportsPage'))
const QualityCompliancePage        = lazy(() => import('./pages/quality/QualityCompliancePage'))
const QualityGovernancePage        = lazy(() => import('./pages/quality/QualityGovernancePage'))
const QualityChecklistsPage        = lazy(() => import('./pages/quality/QualityChecklistsPage'))
const KpiAdminPage            = lazy(() => import('./pages/intelligence/admin/KpiAdminPage'))
const ReportsAdminPage        = lazy(() => import('./pages/intelligence/admin/ReportsAdminPage'))
const AdminRegistrationsPage  = lazy(() => import('./pages/admin/AdminRegistrationsPage'))
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

// ── Lazy: dashboard pages — tech admin ───────────────────────────────────────
const TechAdminDashboardPage = lazy(() => import('./pages/tech-admin/TechAdminDashboardPage'))

// ── Lazy: dashboard pages — manager role home pages ──────────────────────────
const ProgramsManagerDashboardPage   = lazy(() => import('./pages/manager-dashboards/ProgramsManagerDashboardPage'))
const OperationsManagerDashboardPage = lazy(() => import('./pages/manager-dashboards/OperationsManagerDashboardPage'))
const PartnershipsManagerDashboardPage = lazy(() => import('./pages/manager-dashboards/PartnershipsManagerDashboardPage'))
const CommunityManagerDashboardPage  = lazy(() => import('./pages/manager-dashboards/CommunityManagerDashboardPage'))
const SectionLeadDashboardPage       = lazy(() => import('./pages/manager-dashboards/SectionLeadDashboardPage'))

// ── Lazy: dashboard pages — HR ───────────────────────────────────────────────
const HrDashboardPage   = lazy(() => import('./pages/hr/HrDashboardPage'))
const HrTeamPage        = lazy(() => import('./pages/hr/HrTeamPage'))
const HrVolunteersPage  = lazy(() => import('./pages/hr/HrVolunteersPage'))
const HrInstructorsPage = lazy(() => import('./pages/hr/HrInstructorsPage'))
const HrDepartmentsPage = lazy(() => import('./pages/hr/HrDepartmentsPage'))
const HrOnboardingPage  = lazy(() => import('./pages/hr/HrOnboardingPage'))
const HrTasksPage       = lazy(() => import('./pages/hr/HrTasksPage'))
const HrDocumentsPage   = lazy(() => import('./pages/hr/HrDocumentsPage'))

// ── Lazy: workshop request workflow ──────────────────────────────────────────
const WorkshopRequestsPage        = lazy(() => import('./pages/WorkshopRequestsPage'))
const WorkshopRequestDetailPage   = lazy(() => import('./pages/WorkshopRequestDetailPage'))

// ── Lazy: dashboard pages — super admin ──────────────────────────────────────
const SuperAdminOverviewPage      = lazy(() => import('./pages/super-admin/SuperAdminOverviewPage'))
const VolunteerRequestsPage       = lazy(() => import('./pages/super-admin/VolunteerRequestsPage'))
const SuperAdminAuditLogsPage     = lazy(() => import('./pages/super-admin/AuditLogsPage'))
const UsersManagementPage         = lazy(() => import('./pages/super-admin/crud/UsersManagementPage'))
const RolesPermissionsPage        = lazy(() => import('./pages/super-admin/crud/RolesPermissionsPage'))
const DepartmentsManagementPage   = lazy(() => import('./pages/super-admin/crud/DepartmentsManagementPage'))
const TeamManagementPage          = lazy(() => import('./pages/super-admin/crud/TeamManagementPage'))
const StudentsManagementPage      = lazy(() => import('./pages/super-admin/crud/StudentsManagementPage'))
const InstructorsManagementPage   = lazy(() => import('./pages/super-admin/crud/InstructorsManagementPage'))
const ProgramsManagementPage      = lazy(() => import('./pages/super-admin/crud/ProgramsManagementPage'))
const WorkshopsManagementPage     = lazy(() => import('./pages/super-admin/crud/WorkshopsManagementPage'))
const RegistrationsManagementPage = lazy(() => import('./pages/super-admin/crud/RegistrationsManagementPage'))
const PartnersManagementPage         = lazy(() => import('./pages/super-admin/crud/PartnersManagementPage'))
const LearningPathsManagementPage      = lazy(() => import('./pages/super-admin/crud/LearningPathsManagementPage'))
const EmailSettingsPage                = lazy(() => import('./pages/super-admin/EmailSettingsPage'))
const EmailLogsPage                    = lazy(() => import('./pages/super-admin/EmailLogsPage'))
const InstructorLearningPathsPage      = lazy(() => import('./pages/lms/instructor/InstructorLearningPathsPage'))
const InstructorLearningPathDetailPage = lazy(() => import('./pages/lms/instructor/InstructorLearningPathDetailPage'))

// ── Lazy: internal members page ──────────────────────────────────────────────
const MembersPage = lazy(() => import('./pages/dashboard/MembersPage'))

// ── Lazy: admin coming-soon placeholder ──────────────────────────────────────
const AdminComingSoonPage = lazy(() => import('./pages/admin/AdminComingSoonPage'))

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

function RedirectPathsToLearningPaths() {
  const { slug } = useParams()
  return <Navigate to={slug ? `/learning-paths/${slug}` : '/learning-paths'} replace />
}

function App() {
  return (
    <ErrorBoundary>
      <CookieConsentProvider>
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
              {ALL_LEGAL_DOCUMENTS.map((doc) => (
                <Route
                  key={doc.route}
                  path={doc.route}
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <LegalPage />
                    </Suspense>
                  }
                />
              ))}
              <Route path="*" element={<NotFound />} />

              <Route path="/courses" element={<Suspense fallback={<RouteFallback />}><Courses /></Suspense>} />
              <Route path="/courses/:slug" element={<Suspense fallback={<RouteFallback />}><CourseDetails /></Suspense>} />
              <Route path="/workshops" element={<Suspense fallback={<RouteFallback />}><Workshops /></Suspense>} />
              <Route path="/workshops/:slug" element={<Suspense fallback={<RouteFallback />}><WorkshopDetails /></Suspense>} />
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
              <Route path="/paths"           element={<Navigate to="/learning-paths" replace />} />
              <Route path="/paths/:slug"     element={<RedirectPathsToLearningPaths />} />
              <Route path="/learning-paths" element={<Suspense fallback={<RouteFallback />}><LearningPaths /></Suspense>} />
              <Route path="/learning-paths/:slug" element={<Suspense fallback={<RouteFallback />}><LearningPathDetail /></Suspense>} />
              <Route path="/programs"     element={<Suspense fallback={<RouteFallback />}><Programs /></Suspense>} />
              <Route path="/platform"     element={<Suspense fallback={<RouteFallback />}><Platform /></Suspense>} />
              <Route path="/team"         element={<Suspense fallback={<RouteFallback />}><Team /></Suspense>} />
              <Route path="/ar/team"      element={<Suspense fallback={<RouteFallback />}><Team /></Suspense>} />
              <Route path="/impact"       element={<Suspense fallback={<RouteFallback />}><Impact /></Suspense>} />
              <Route path="/ar/impact"    element={<Suspense fallback={<RouteFallback />}><Impact /></Suspense>} />
              <Route path="/partnerships" element={<Suspense fallback={<RouteFallback />}><Partnerships /></Suspense>} />
              <Route path="/volunteer"       element={<Suspense fallback={<RouteFallback />}><Volunteer /></Suspense>} />
              <Route path="/volunteer/apply" element={<Suspense fallback={<RouteFallback />}><VolunteerApply /></Suspense>} />
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
                  <Route path="/dashboard/super-admin/volunteer-requests" element={<Suspense fallback={<RouteFallback />}><VolunteerRequestsPage /></Suspense>} />
                  <Route path="/dashboard/super-admin/volunteer-requests/:id" element={<Suspense fallback={<RouteFallback />}><VolunteerRequestsPage /></Suspense>} />
                  <Route path="/dashboard/hr/volunteer-requests" element={<Suspense fallback={<RouteFallback />}><VolunteerRequestsPage /></Suspense>} />
                  <Route path="/dashboard/hr/volunteer-requests/:id" element={<Suspense fallback={<RouteFallback />}><VolunteerRequestsPage /></Suspense>} />
                  <Route path="/dashboard/super-admin/audit-logs" element={<SuperAdminAuditLogsPage />} />
                  <Route path="/dashboard/super-admin/financial-requests" element={<Suspense fallback={<RouteFallback />}><SuperAdminFinancialRequestsPage /></Suspense>} />
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
                  <Route path="/dashboard/super-admin/crud/tracks" element={<Navigate to="/dashboard/super-admin/crud/learning-paths" replace />} />
                  <Route path="/dashboard/super-admin/crud/workshops" element={<WorkshopsManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/registrations" element={<RegistrationsManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/partners" element={<PartnersManagementPage />} />
                  <Route path="/dashboard/super-admin/crud/learning-paths" element={<Suspense fallback={<RouteFallback />}><LearningPathsManagementPage /></Suspense>} />
                  <Route
                    path="/dashboard/super-admin/crud/programs/:courseId/content"
                    element={<CourseContentManagerPage />}
                  />
                  <Route path="/dashboard/super-admin/crud/*" element={<Navigate to="/dashboard/super-admin" replace />} />
                  <Route path="/dashboard/super-admin/email-settings" element={<Suspense fallback={<RouteFallback />}><EmailSettingsPage /></Suspense>} />
                  <Route path="/dashboard/super-admin/email-logs" element={<Suspense fallback={<RouteFallback />}><EmailLogsPage /></Suspense>} />

                  <Route path="/dashboard/admin/programs" element={<ProgramsManagementPage />} />

                  <Route path="/dashboard/student" element={<Dashboard />} />
                  <Route path="/dashboard/student/learning-paths" element={<Suspense fallback={<RouteFallback />}><StudentLearningPathsPage /></Suspense>} />
                  <Route path="/dashboard/student/learning-paths/:id" element={<Suspense fallback={<RouteFallback />}><StudentLearningPathDetailPage /></Suspense>} />
                  <Route path="/dashboard/student/courses" element={<StudentMyCoursesPage />} />
                  <Route path="/dashboard/student/learn/:courseId" element={<StudentCourseLearnPage />} />
                  <Route path="/dashboard/student/registrations" element={<StudentRegistrationsListPage />} />
                  <Route path="/dashboard/student/available-courses" element={<StudentAvailableCoursesPage />} />
                  <Route path="/dashboard/student/exams" element={<StudentExamsPage />} />
                  <Route path="/dashboard/student/courses/:courseId/placement-test" element={<PlacementTestPage />} />
                  <Route path="/dashboard/student/courses/:courseId/placement-result" element={<PlacementResultPage />} />
                  <Route path="/dashboard/student/courses/:courseId/oral-booking" element={<OralBookingPage />} />
                  {/* Student-prefixed top-level routes → redirect to existing pages */}
                  <Route path="/dashboard/student/certificates" element={<Navigate to="/dashboard/certificates" replace />} />
                  <Route path="/dashboard/student/notifications" element={<Navigate to="/dashboard/notifications" replace />} />
                  <Route path="/dashboard/student/calendar" element={<Navigate to="/calendar" replace />} />
                  <Route path="/dashboard/student/files" element={<Navigate to="/documents" replace />} />
                  <Route path="/dashboard/student/assistant" element={<Navigate to="/ai" replace />} />
                  <Route path="/dashboard/student/profile" element={<Navigate to="/dashboard/profile" replace />} />
                  <Route path="/dashboard/student/course-rating" element={<Navigate to="/dashboard/student/evaluation" replace />} />
                  <Route path="/dashboard/student/orders" element={<Suspense fallback={<RouteFallback />}><StudentOrdersPage /></Suspense>} />
                  <Route path="/dashboard/student/payment-success" element={<Suspense fallback={<RouteFallback />}><PaymentSuccessPage /></Suspense>} />
                  <Route path="/dashboard/instructor" element={<TeacherDashboard />} />
                  <Route path="/dashboard/instructor/learning-paths" element={<Suspense fallback={<RouteFallback />}><InstructorLearningPathsPage /></Suspense>} />
                  <Route path="/dashboard/instructor/learning-paths/:id" element={<Suspense fallback={<RouteFallback />}><InstructorLearningPathDetailPage /></Suspense>} />
                  <Route path="/dashboard/instructor/courses" element={<InstructorAssignedCoursesPage />} />
                  <Route path="/dashboard/instructor/courses/:courseId/content" element={<CourseContentManagerPage />} />
                  <Route path="/dashboard/instructor/courses/:courseId/placement-students" element={<InstructorPlacementStudentsPage />} />
                  <Route path="/dashboard/instructor/oral-assessments" element={<InstructorOralAssessmentsPage />} />
                  <Route path="/dashboard/instructor/availability" element={<InstructorAvailabilityPage />} />
                  <Route path="/dashboard/instructor/students" element={<InstructorAllStudentsPage />} />
                  <Route path="/dashboard/instructor/courses/:courseId/students" element={<InstructorCourseStudentsPage />} />
                  <Route path="/dashboard/instructor/placement-tests" element={<InstructorPlacementTestsPage />} />
                  <Route path="/dashboard/instructor/classes" element={<InstructorClassesPage />} />
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
                  <Route path="/dashboard/executive/financial-requests" element={<Suspense fallback={<RouteFallback />}><ExecutiveFinancialRequestsPage /></Suspense>} />
                  <Route path="/dashboard/finance" element={<FinanceDashboardPage />} />
                  <Route path="/dashboard/finance/payments" element={<FinancePaymentsPage />} />
                  <Route path="/dashboard/finance/transactions" element={<FinanceTransactionsPage />} />
                  <Route path="/dashboard/finance/orders" element={<Suspense fallback={<RouteFallback />}><FinanceOrdersPage /></Suspense>} />
                  <Route path="/dashboard/finance/invoices" element={<Suspense fallback={<RouteFallback />}><FinanceInvoicesPage /></Suspense>} />
                  <Route path="/dashboard/finance/financial-requests" element={<Suspense fallback={<RouteFallback />}><FinanceFinancialRequestsPage /></Suspense>} />
                  <Route path="/dashboard/quality" element={<QualityDashboardPage />} />
                  <Route path="/dashboard/quality/reviews" element={<QualityReviewsPage />} />
                  <Route path="/dashboard/quality/workshops" element={<Navigate to="/dashboard/admin/workshop-requests" replace />} />
                  <Route path="/dashboard/quality/workshops/:id" element={<Navigate to="/dashboard/admin/workshop-requests" replace />} />
                  <Route path="/dashboard/quality/incidents" element={<QualityIncidentsPage />} />
                  <Route path="/dashboard/quality/corrective-actions" element={<QualityCorrectiveActionsPage />} />
                  <Route path="/dashboard/quality/checklists" element={<QualityChecklistsPage />} />
                  <Route path="/dashboard/quality/compliance" element={<QualityCompliancePage />} />
                  <Route path="/dashboard/quality/governance" element={<QualityGovernancePage />} />
                  <Route path="/dashboard/quality/audit-logs" element={<QualityAuditLogsPage />} />
                  <Route path="/dashboard/quality/reports" element={<QualityReportsPage />} />
                  <Route path="/dashboard/quality/team" element={<QualityTeamPage />} />
                  <Route path="/dashboard/hr" element={<HrDashboardPage />} />
                  <Route path="/dashboard/hr/team" element={<HrTeamPage />} />
                  <Route path="/dashboard/hr/volunteers" element={<HrVolunteersPage />} />
                  <Route path="/dashboard/hr/instructors" element={<HrInstructorsPage />} />
                  <Route path="/dashboard/hr/departments" element={<HrDepartmentsPage />} />
                  <Route path="/dashboard/hr/onboarding" element={<HrOnboardingPage />} />
                  <Route path="/dashboard/hr/tasks" element={<HrTasksPage />} />
                  <Route path="/dashboard/hr/documents" element={<HrDocumentsPage />} />
                  <Route path="/dashboard/marketing" element={<OpsMarketingPage />} />
                  <Route path="/dashboard/support" element={<OpsSupportTicketsPage />} />
                  <Route path="/dashboard/support/:id" element={<OpsSupportTicketDetailPage />} />
                  <Route path="/dashboard/volunteer" element={<Suspense fallback={<RouteFallback />}><AcceptedVolunteersPage /></Suspense>} />
                  <Route path="/dashboard/ops/volunteers" element={<OpsVolunteersPage />} />
                  <Route path="/dashboard/volunteer/:id" element={<OpsVolunteerDetailPage />} />
                  <Route path="/dashboard/department" element={<OpsDepartmentsPage />} />
                  <Route path="/dashboard/department/programs" element={<ProgramsManagementPage />} />
                  <Route path="/dashboard/department/financial-requests" element={<Suspense fallback={<RouteFallback />}><DepartmentFinancialRequestsPage /></Suspense>} />
                  <Route path="/dashboard/department/:id" element={<OpsDepartmentDetailPage />} />

                  {/* ── Tech Admin dedicated dashboard ── */}
                  <Route path="/dashboard/tech-admin" element={<Suspense fallback={<RouteFallback />}><TechAdminDashboardPage /></Suspense>} />
                  <Route path="/dashboard/tech-admin/learning-paths" element={<Suspense fallback={<RouteFallback />}><LearningPathsManagementPage /></Suspense>} />

                  {/* ── Dedicated manager home pages ── */}
                  <Route path="/dashboard/programs-manager" element={<ProgramsManagerDashboardPage />} />
                  <Route path="/dashboard/programs-manager/learning-paths" element={<Suspense fallback={<RouteFallback />}><LearningPathsManagementPage /></Suspense>} />
                  <Route path="/dashboard/operations-manager" element={<OperationsManagerDashboardPage />} />
                  <Route path="/dashboard/partnerships-manager" element={<PartnershipsManagerDashboardPage />} />
                  <Route path="/dashboard/community-manager" element={<CommunityManagerDashboardPage />} />
                  <Route path="/dashboard/section-lead" element={<SectionLeadDashboardPage />} />

                  <Route path="/dashboard/members" element={<Suspense fallback={<RouteFallback />}><MembersPage /></Suspense>} />

                  <Route path="/dashboard/notifications" element={<NotificationsCenterPage />} />
                  <Route path="/dashboard/profile" element={<ProfilePage />} />
                  <Route path="/dashboard/settings" element={<Navigate to="/dashboard/settings/notifications" replace />} />
                  <Route path="/dashboard/settings/notifications" element={<NotificationPreferencesPage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/ai" element={<AiWorkspacePage />} />

                  <Route path="/dashboard/student/sessions" element={<StudentSessionsPage />} />
                  <Route path="/dashboard/student/attendance" element={<StudentAttendancePage />} />
                  <Route path="/dashboard/student/materials" element={<StudentMaterialsPage />} />
                  <Route path="/dashboard/student/assignments/:submissionId?" element={<StudentAssignmentsPage />} />
                  <Route path="/dashboard/student/progress" element={<StudentProgressPage />} />
                  <Route path="/dashboard/student/evaluation" element={<StudentEvaluationPage />} />
                  <Route path="/dashboard/certificates" element={<Suspense fallback={<RouteFallback />}><StudentCertificatesLmsPage /></Suspense>} />
                  <Route path="/dashboard/student/my-certificates" element={<Suspense fallback={<RouteFallback />}><StudentCertificatesLmsPage /></Suspense>} />
                  <Route path="/dashboard/learning" element={<StudentLearningHubPage />} />
                  <Route path="/dashboard/courses/:courseId/modules" element={<CourseModulesPage />} />
                  <Route path="/dashboard/courses/:courseId/content" element={<CourseContentManagerPage />} />
                  <Route path="/dashboard/admin/lms/courses/:courseId/content" element={<CourseContentManagerPage />} />
                  <Route path="/dashboard/lessons/:lessonId" element={<LessonPlayerPage />} />
                  <Route path="/dashboard/quizzes/:quizId" element={<QuizTakePage />} />

                  <Route path="/dashboard/instructor/sessions" element={<InstructorSessionsPage />} />
                  <Route path="/dashboard/instructor/attendance" element={<InstructorAttendancePage />} />
                  <Route path="/dashboard/instructor/submissions/:submissionId?" element={<InstructorSubmissionsPage />} />

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
                  <Route path="/dashboard/admin/finance/orders" element={<Suspense fallback={<RouteFallback />}><FinanceOrdersPage /></Suspense>} />
                  <Route path="/dashboard/admin/finance/invoices" element={<Suspense fallback={<RouteFallback />}><FinanceInvoicesPage /></Suspense>} />
                  <Route path="/dashboard/admin/finance/financial-requests" element={<Suspense fallback={<RouteFallback />}><FinanceFinancialRequestsPage /></Suspense>} />
                  <Route path="/dashboard/admin/coupons" element={<CouponsAdminPage />} />
                  <Route path="/dashboard/admin/scholarships" element={<ScholarshipsAdminPage />} />
                  <Route path="/dashboard/admin/certificates" element={<Suspense fallback={<RouteFallback />}><AdminCertificatesLmsPage /></Suspense>} />
                  <Route path="/dashboard/admin/certificates/issue" element={<Suspense fallback={<RouteFallback />}><AdminCertificateIssuePage /></Suspense>} />
                  <Route path="/dashboard/admin/certificates/templates" element={<Suspense fallback={<RouteFallback />}><AdminCertificateTemplatesPage /></Suspense>} />
                  <Route path="/dashboard/admin/certificates/templates/:id/designer" element={<Suspense fallback={<RouteFallback />}><AdminCertificateDesignerPage /></Suspense>} />
                  <Route path="/dashboard/admin/certificates/batches" element={<Suspense fallback={<RouteFallback />}><AdminCertificateBatchesPage /></Suspense>} />
                  <Route path="/dashboard/admin/certificates/batches/:batchId" element={<Suspense fallback={<RouteFallback />}><AdminCertificateBatchesPage /></Suspense>} />
                  <Route path="/dashboard/admin/certificates/overview" element={<Suspense fallback={<RouteFallback />}><AdminCertificatesLmsPage /></Suspense>} />
                  <Route path="/dashboard/admin/certificates/analytics" element={<Suspense fallback={<RouteFallback />}><AdminCertificateAnalyticsPage /></Suspense>} />
                  <Route path="/dashboard/admin/certificates/:id" element={<Suspense fallback={<RouteFallback />}><AdminCertificateDetailPage /></Suspense>} />
                  <Route path="/dashboard/programs-manager/certificates" element={<Suspense fallback={<RouteFallback />}><AdminCertificatesLmsPage /></Suspense>} />
                  <Route path="/dashboard/programs-manager/certificates/issue" element={<Suspense fallback={<RouteFallback />}><AdminCertificateIssuePage /></Suspense>} />
                  <Route path="/dashboard/admin/quality" element={<QualityAdminPage />} />
                  <Route path="/dashboard/admin/kpi" element={<KpiAdminPage />} />
                  <Route path="/dashboard/admin/reports" element={<ReportsAdminPage />} />
                  <Route path="/dashboard/admin/registrations" element={<Suspense fallback={<RouteFallback />}><AdminRegistrationsPage /></Suspense>} />
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
                  <Route path="/dashboard/admin/workshop-requests" element={<Suspense fallback={<RouteFallback />}><WorkshopRequestsPage /></Suspense>} />
                  <Route path="/dashboard/admin/workshop-requests/:id" element={<Suspense fallback={<RouteFallback />}><WorkshopRequestDetailPage /></Suspense>} />

                  {/* ── Admin alias routes (requirement list) — redirect to canonical paths ── */}
                  <Route path="/dashboard/admin/sessions" element={<Navigate to="/dashboard/admin/lms/sessions" replace />} />
                  <Route path="/dashboard/admin/attendance" element={<Navigate to="/dashboard/admin/lms/attendance" replace />} />
                  <Route path="/dashboard/admin/assignments" element={<Navigate to="/dashboard/admin/lms/assignments" replace />} />
                  <Route path="/dashboard/admin/materials" element={<Navigate to="/dashboard/admin/lms/materials" replace />} />
                  <Route path="/dashboard/admin/evaluations" element={<Navigate to="/dashboard/admin/lms/evaluations" replace />} />
                  <Route path="/dashboard/admin/progress" element={<Navigate to="/dashboard/admin/lms/progress" replace />} />
                  <Route path="/dashboard/admin/volunteer-requests" element={<Navigate to="/dashboard/admin/volunteers" replace />} />
                  <Route path="/dashboard/admin/grants" element={<Navigate to="/dashboard/admin/scholarships" replace />} />
                  <Route path="/dashboard/admin/quality-review" element={<Navigate to="/dashboard/admin/quality" replace />} />
                  <Route path="/dashboard/admin/performance-indicators" element={<Navigate to="/dashboard/admin/kpi" replace />} />
                  <Route path="/dashboard/admin/analytics-reports" element={<Navigate to="/dashboard/admin/reports" replace />} />
                  <Route path="/dashboard/admin/knowledge-base" element={<Navigate to="/dashboard/admin/knowledge" replace />} />
                  <Route path="/dashboard/admin/knowledge-categories" element={<Navigate to="/dashboard/admin/knowledge/categories" replace />} />
                  <Route path="/dashboard/admin/educational-units" element={<Navigate to="/dashboard/admin/modules" replace />} />
                  <Route path="/dashboard/admin/tests" element={<Navigate to="/dashboard/admin/quizzes" replace />} />
                  <Route path="/dashboard/admin/development" element={<Navigate to="/dashboard/admin/automations" replace />} />
                  <Route path="/dashboard/admin/admin-documents" element={<Navigate to="/dashboard/admin/documents" replace />} />
                  <Route path="/dashboard/admin/audit-log" element={<Navigate to="/dashboard/admin/audit-logs" replace />} />
                  <Route path="/dashboard/admin/platform-growth" element={<Navigate to="/dashboard/admin/platform-scale" replace />} />
                  <Route path="/dashboard/admin/developer-tokens" element={<Navigate to="/dashboard/admin/developer/api-tokens" replace />} />
                  <Route path="/dashboard/admin/admin-calendar" element={<Navigate to="/dashboard/admin/calendar" replace />} />
                  <Route path="/dashboard/admin/training-program-requests" element={<Navigate to="/dashboard/admin/workshop-requests" replace />} />
                  <Route path="/dashboard/admin/general-reports" element={<Navigate to="/dashboard/admin/reports" replace />} />
                  <Route path="/dashboard/admin/settings" element={<Navigate to="/dashboard/settings/notifications" replace />} />
                  <Route path="/dashboard/admin/notifications" element={<Navigate to="/dashboard/notifications" replace />} />
                  <Route path="/dashboard/admin/notification-preferences" element={<Navigate to="/dashboard/settings/notifications" replace />} />
                  <Route path="/dashboard/admin/files" element={<Navigate to="/documents" replace />} />
                  <Route path="/dashboard/admin/ai-assistant" element={<Navigate to="/ai" replace />} />
                  <Route path="/dashboard/admin/profile" element={<Navigate to="/dashboard/profile" replace />} />
                  <Route path="/dashboard/admin/members" element={<Navigate to="/dashboard/members" replace />} />

                  {/* ── Admin placeholder — pages visible in sidebar but not yet implemented ── */}
                  <Route path="/dashboard/admin/users" element={<Suspense fallback={<RouteFallback />}><AdminComingSoonPage /></Suspense>} />

                  {/* ── Admin-wide sidebar shortcut paths (no /admin/ prefix) ── */}
                  <Route path="/dashboard/courses" element={<Navigate to="/dashboard/admin/programs" replace />} />
                  <Route path="/dashboard/programs" element={<Navigate to="/dashboard/admin/programs" replace />} />
                  <Route path="/dashboard/reports" element={<Navigate to="/dashboard/admin/reports" replace />} />
                  <Route path="/dashboard/students" element={<Suspense fallback={<RouteFallback />}><StudentsManagementPage pageTitle="الطلاب — المشرف" /></Suspense>} />
                  <Route path="/dashboard/registrations" element={<Suspense fallback={<RouteFallback />}><AdminComingSoonPage /></Suspense>} />
                  <Route path="/dashboard/schedule" element={<Suspense fallback={<RouteFallback />}><AdminComingSoonPage /></Suspense>} />
                  <Route path="/dashboard/users" element={<Suspense fallback={<RouteFallback />}><AdminComingSoonPage /></Suspense>} />
                </Route>

              </Route>
            </Route>

          </Routes>
        </AuthProvider>
        <CookieBanner />
        <CookiePreferencesModal />
      </BrowserRouter>
      </CookieConsentProvider>
    </ErrorBoundary>
  )
}

export default App
