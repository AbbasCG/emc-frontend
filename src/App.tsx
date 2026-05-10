import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import DashboardLayout from './layouts/DashboardLayout'
import About from './pages/About'
import AdminDashboard from './pages/AdminDashboard'
import Contact from './pages/Contact'
import CourseDetails from './pages/CourseDetails'
import Courses from './pages/Courses'
import Dashboard from './pages/Dashboard'
import Departments from './pages/Departments'
import Home from './pages/Home'
import Impact from './pages/Impact'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Partnerships from './pages/Partnerships'
import Paths from './pages/Paths'
import Platform from './pages/Platform'
import Programs from './pages/Programs'
import Register from './pages/Register'
import SubmitWorkshop from './pages/SubmitWorkshop'
import TeacherDashboard from './pages/TeacherDashboard'
import Team from './pages/Team'
import ThankYou from './pages/ThankYou'
import Tracks from './pages/Tracks'
import Volunteer from './pages/Volunteer'

// Redirects to the role-specific dashboard home; ProtectedRoute guarantees auth is resolved.
function RoleRedirect() {
  const { user } = useAuth()
  const target =
    user?.role === 'admin'   ? '/dashboard/admin' :
    user?.role === 'teacher' ? '/dashboard/teacher' :
    '/dashboard/student'
  return <Navigate to={target} replace />
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>

            {/* ── Public routes — Navbar + Footer layout ── */}
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:slug" element={<CourseDetails />} />
              <Route path="/courses/:slug/register" element={<Register />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/submit-workshop" element={<SubmitWorkshop />} />
              <Route path="/thank-you" element={<ThankYou />} />
              {/* Phase 6 — public informational pages */}
              <Route path="/departments"  element={<Departments />} />
              <Route path="/tracks"       element={<Tracks />} />
              <Route path="/paths"        element={<Paths />} />
              <Route path="/programs"     element={<Programs />} />
              <Route path="/platform"     element={<Platform />} />
              <Route path="/team"         element={<Team />} />
              <Route path="/impact"       element={<Impact />} />
              <Route path="/partnerships" element={<Partnerships />} />
              <Route path="/volunteer"    element={<Volunteer />} />
              {/* 404 inside public layout so Navbar + Footer are visible */}
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* ── Protected dashboard routes — sidebar + topbar layout ── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                {/* /dashboard → redirect to role-specific home */}
                <Route path="/dashboard" element={<RoleRedirect />} />
                {/* Role-specific dashboard homes */}
                <Route path="/dashboard/student" element={<Dashboard />} />
                <Route path="/dashboard/teacher" element={<TeacherDashboard />} />
                <Route path="/dashboard/admin"   element={<AdminDashboard />} />
                {/* Phase 7 routes added here:
                    <Route path="/dashboard/courses"  element={<DashboardCourses />} />
                    <Route path="/dashboard/schedule" element={<DashboardSchedule />} />
                */}
              </Route>
            </Route>

          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
