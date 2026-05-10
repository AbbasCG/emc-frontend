# EMC Frontend Progress

## Project Status

Arabic-first RTL educational SaaS / LMS platform built with React 19 + TypeScript + Vite + Tailwind CSS.
Phases 1–6 are complete. The app has a full public website with 9 informational pages, auth, a professional
desktop-first SaaS dashboard with role-based routing (student / teacher / admin), and a fixed RTL sidebar.
Phase 7 (course & scheduling UI inside the dashboard) is next.

---

## Completed Phases

### Phase 6 — Public Website Pages (2026-05-10)

Built all 9 informational public pages linked from the Navbar. All pages use `PageHeader`, `fadeUp` animations, and the established design system (`customBlue`, `customOrange`, `deepBlue`).

**Created pages:**
- **`Departments.tsx`** `/departments` — 6 department cards (3-col grid): اللغات, التدريب المهني, الاستشارات الأكاديمية, المهارات الرقمية, التطوير الشخصي, الاندماج. Each with colored icon, description, course count badge. CTA → `/courses`.
- **`Tracks.tsx`** `/tracks` — 5 track cards (full-width single column): numbered header, description, skills tags, inline link. CTA → `/courses`.
- **`Paths.tsx`** `/paths` — 3 learning path articles with right-side image on desktop: مسار الطالب, مسار المهني, مسار الاندماج. Each with icon badge, 4-step numbered grid, start button. CTA → `/contact`.
- **`Programs.tsx`** `/programs` — Stats row + 4 program cards (2-col): الدورات القصيرة, البرامج المتكاملة, برامج اللغات, الشهادات المهنية. Each with icon, duration badge, feature checklist, popularity badge. CTA → `/contact`.
- **`Platform.tsx`** `/platform` — Hero image+intro, 6 feature cards (3-col), "كيف تبدأ؟" 4-step guide. CTA → `/register`.
- **`Team.tsx`** `/team` — 6 team member cards (3-col): Unsplash photo with gradient overlay, specialty badge, name, role, bio, LinkedIn + Mail icon buttons. CTA → `/contact` (join team).
- **`Impact.tsx`** `/impact` — 4 stat cards with icons, 3 impact area cards with animated `whileInView` progress bars, 3 testimonial blockquotes with 5-star ratings. CTA → `/courses`.
- **`Partnerships.tsx`** `/partnerships` — 4 partner cards (2-col) + "لماذا الشراكة؟" 2-col section with benefits checklist and Unsplash image. CTA → `/contact`.
- **`Volunteer.tsx`** `/volunteer` — 3 impact number stats, 4 volunteer role cards with requirements checklist, "لماذا تتطوع معنا؟" 6-benefit 2-col grid. CTA → `/contact`.

**`src/App.tsx` updated:** Added 9 imports and 9 `<Route>` entries inside `<Route element={<Layout />}>`.

---

### Phase 5 — Role-Based Dashboard Structure (2026-05-10)

Added role-specific routing and separate dashboard pages for each user role.

**What was done:**
- `DashboardLayout` sidebar is now role-aware: `getRoleSidebar(role?)` returns tailored nav groups for student, teacher, and admin; no role defaults to student
- `isActive()` updated to exact-match role-specific home routes (`/dashboard/student`, `/dashboard/teacher`, `/dashboard/admin`) — prevents `/dashboard/students` (list page) from being incorrectly highlighted when `/dashboard/student` (home) is the link
- `/dashboard` now renders `RoleRedirect` — immediately sends `student → /dashboard/student`, `teacher → /dashboard/teacher`, `admin → /dashboard/admin` using `Navigate`
- `Dashboard.tsx` (student page) is now mounted at `/dashboard/student`
- Created `TeacherDashboard.tsx` — stats (total students, upcoming sessions, active courses, completion rate), teaching course cards (with student count + upcoming sessions), upcoming sessions grid, quick actions
- Created `AdminDashboard.tsx` — stats (total users, active courses, enrollments, programs), recent registrations `DataTable` (student name, course, date, status badge), quick actions
- `DataTable` generic constraint relaxed from `T extends Record<string, unknown>` to `T extends object` with internal cast — makes it usable with concrete typed interfaces
- Added 6 new types: `TeacherStats`, `TeachingCourse`, `TeacherDashboardData`, `AdminStats`, `RecentRegistration`, `AdminDashboardData`
- All three new dashboard pages use the same API-first + MOCK fallback pattern; dev-only amber banner when mock is active

---

### Phase 4 — Student Dashboard (2026-05-10)

Connected the student dashboard to the real API and expanded the dashboard UI with two new sections.

**What was done:**
- Added `GET /api/dashboard` API call with `isMounted` cleanup pattern (matches Courses.tsx conventions)
- API response is normalised to handle both `{...}` and `{ data: {...} }` wrappers
- If the endpoint is not yet available, dashboard falls back to MOCK data automatically; a yellow dev-only banner appears in development so the difference is obvious
- Replaced all three `MOCK_STATS` / `MOCK_SESSIONS` / `MOCK_PROGRESS` constants with a single `MOCK: StudentDashboard` typed object
- Added animated `DashboardSkeleton` (pulse) shown during the initial API load
- New **"دوراتي المسجلة"** section — 4-column grid of `EnrolledCourseCard` (course image, title, instructor, animated progress bar, status badge, link)
- Replaced the old "تقدمك في الدورات" `ProgressCard` column with a new **"الإشعارات"** panel — white card list of `NotificationItem` (type icon, title, message, time-ago, unread dot)
- "الجلسات القادمة" now maps `UpcomingSession` type from the API instead of hand-crafted mock objects
- Added 5 new types to `src/types/index.ts`: `DashboardStats`, `Enrollment`, `UpcomingSession`, `Notification`, `StudentDashboard`

---

### Phase 2 — Authentication Frontend (2026-05-10)

Built the complete frontend authentication layer.

**What was done:**
- Created `AuthContext` with `user`, `token`, `isAuthenticated`, `isLoading`, `login()`, `logout()`
- Session is restored from `localStorage` on app boot — no flash between logged-in/out states
- Added Axios request interceptor — injects `Authorization: Bearer <token>` on every API call
- Added Axios response interceptor — clears session and redirects to `/login` on 401 (excludes the login endpoint itself to prevent loops)
- Created `ProtectedRoute` — unauthenticated users are redirected to `/login` with the original path preserved in `location.state.from`
- Rewired `Login.tsx` — controlled inputs, loading spinner on submit, API error display, redirect to intended page after login
- Updated `Navbar` — shows user avatar + name + dropdown (لوحة التحكم / الملف الشخصي / تسجيل الخروج) when authenticated; shows login/dashboard buttons when not
- Updated `App.tsx` — wrapped in `AuthProvider`, `/dashboard` is now inside `<ProtectedRoute>`
- Added `User` and `UserRole` types to `src/types/index.ts`

---

### Phase 1 — Critical Foundation (2026-05-10)

Built all missing foundational pieces required before the app can be used in production.

**What was done:**
- Implemented full RTL Arabic Navbar with dropdown navigation groups and mobile menu
- Added environment variable support (`VITE_API_BASE_URL`) to replace hardcoded API URL
- Added `vite-env.d.ts` for proper TypeScript `import.meta.env` support
- Fixed `.gitignore` to exclude `.env` and `.env.production` from version control
- Created Arabic 404 Not Found page matching the design system
- Created class-based `ErrorBoundary` component with Arabic fallback UI
- Wired `ErrorBoundary` and 404 route into `App.tsx`
- Fixed `ThankYou` page — now redirects to `/courses` if visited without registration state

---

## Changed Files

### Phase 6 — Created Files
| File | Route | Purpose |
|------|-------|---------|
| `src/pages/Departments.tsx` | `/departments` | 6 department cards, each with icon, description, course count |
| `src/pages/Tracks.tsx` | `/tracks` | 5 full-width track cards with skills tags |
| `src/pages/Paths.tsx` | `/paths` | 3 learning path articles with 4-step guides |
| `src/pages/Programs.tsx` | `/programs` | 4 program cards with duration badges and feature checklists |
| `src/pages/Platform.tsx` | `/platform` | Platform overview — features grid + how-to-start steps |
| `src/pages/Team.tsx` | `/team` | 6 team member cards with photo, role, bio, social icons |
| `src/pages/Impact.tsx` | `/impact` | Stats, animated progress bars, 3 success story testimonials |
| `src/pages/Partnerships.tsx` | `/partnerships` | 4 partner cards + benefits section with image |
| `src/pages/Volunteer.tsx` | `/volunteer` | Volunteer roles, requirements, benefits |

### Phase 6 — Modified Files
| File | Change |
|------|--------|
| `src/App.tsx` | Added 9 imports and 9 `<Route>` entries for Phase 6 pages inside `<Route element={<Layout />}>` |

### Phase 5
| File | Change |
|------|--------|
| `src/types/index.ts` | Added `TeacherStats`, `TeachingCourse`, `TeacherDashboardData`, `AdminStats`, `RecentRegistration`, `AdminDashboardData` |
| `src/layouts/DashboardLayout.tsx` | Role-aware sidebar via `getRoleSidebar(role?)`; `isActive` fixed for exact-match home routes |
| `src/App.tsx` | Added `RoleRedirect`; `/dashboard` → redirect; added 3 role-specific routes |
| `src/components/dashboard/DataTable.tsx` | Relaxed generic from `T extends Record<string,unknown>` to `T extends object` |

### Phase 5 — Created Files
| File | Purpose |
|------|---------|
| `src/pages/TeacherDashboard.tsx` | Teacher home — stats, teaching course cards, upcoming sessions to lead, quick actions |
| `src/pages/AdminDashboard.tsx` | Admin home — platform stats, recent registrations DataTable, quick actions |

### Phase 4
| File | Change |
|------|--------|
| `src/types/index.ts` | Added `DashboardStats`, `Enrollment`, `UpcomingSession`, `Notification`, `StudentDashboard` types |
| `src/pages/Dashboard.tsx` | Full rewrite — real API call, loading skeleton, mock fallback, enrolled courses + notifications sections |
| `src/components/dashboard/index.ts` | Added `EnrolledCourseCard` and `NotificationItem` exports |

### Phase 4 — Created Files
| File | Purpose |
|------|---------|
| `src/components/dashboard/EnrolledCourseCard.tsx` | Enrolled course card — image, title, instructor, animated progress bar, status badge |
| `src/components/dashboard/NotificationItem.tsx` | Notification list item — type icon, title, message, time-ago, unread dot |

### Phase 3
| File | Change |
|------|--------|
| `src/App.tsx` | Moved `/dashboard` OUTSIDE public `<Layout>`; wired `<DashboardLayout>` inside `<ProtectedRoute>` |
| `src/pages/Dashboard.tsx` | Replaced 15-line skeleton with full widget-based student overview page |

### Phase 3 — Created Files
| File | Purpose |
|------|---------|
| `src/layouts/DashboardLayout.tsx` | Fixed RTL sidebar (deepBlue, 256px) + fixed topbar + Outlet + mobile toggle |
| `src/components/dashboard/StatCard.tsx` | Metric card with icon, value, color, trend indicator |
| `src/components/dashboard/DashboardSection.tsx` | Section wrapper with title, subtitle, optional action link |
| `src/components/dashboard/EmptyState.tsx` | Empty/no-data placeholder with icon and CTA |
| `src/components/dashboard/DataTable.tsx` | Generic typed table with loading skeleton and empty state |
| `src/components/dashboard/QuickActionCard.tsx` | Action card with icon, label, description, chevron |
| `src/components/dashboard/ProgressCard.tsx` | Animated progress bar card with percentage |
| `src/components/dashboard/UpcomingSessionCard.tsx` | Session card — date, type, Zoom/Meet/Teams join button |
| `src/components/dashboard/index.ts` | Barrel export for all dashboard widgets |

### Phase 2
| File | Change |
|------|--------|
| `src/types/index.ts` | Added `User` and `UserRole` types |
| `src/api/axios.ts` | Added request interceptor (token header) + response interceptor (401 → redirect) |
| `src/pages/Login.tsx` | Full logic rewrite — controlled inputs, `useAuth().login()`, loading + error states |
| `src/components/Navbar.tsx` | Auth-aware UI — user avatar dropdown when logged in, login buttons when not |
| `src/App.tsx` | Added `AuthProvider` wrapper; `/dashboard` protected by `ProtectedRoute` |

### Phase 2 — Created Files
| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Auth context — user/token state, login/logout, localStorage persistence |
| `src/components/ProtectedRoute.tsx` | Route guard — redirects to `/login` with `from` state when unauthenticated |

### Phase 1
| File | Change |
|------|--------|
| `.gitignore` | Added `.env` and `.env.production` exclusions |
| `src/api/axios.ts` | Replaced hardcoded URL with `import.meta.env.VITE_API_BASE_URL` |
| `src/components/Navbar.tsx` | Full implementation (was empty) |
| `src/App.tsx` | Added `ErrorBoundary` wrapper + `*` 404 catch-all route |
| `src/pages/ThankYou.tsx` | Added `useNavigate` redirect guard for direct URL visits |

### Phase 1 — Created Files
| File | Purpose |
|------|---------|
| `.env` | Local dev API URL — excluded from git |
| `.env.example` | Template for team members |
| `src/vite-env.d.ts` | TypeScript types for `import.meta.env` |
| `src/pages/NotFound.tsx` | Arabic RTL 404 page |
| `src/components/ErrorBoundary.tsx` | Class-based React error boundary |
| `README_FRONTEND_PROGRESS.md` | This file |

---

## Added Features

### Phase 3
- **DashboardLayout** — `src/layouts/DashboardLayout.tsx`
  - Fixed 256px RTL sidebar with `deepBlue` background, always visible on desktop
  - Sidebar has: logo, scrollable nav groups (9 sections, 15 items), user card + logout at bottom
  - Fixed topbar: mobile hamburger, page title (auto-resolved from pathname), search toggle, notifications bell (badge), user avatar
  - Mobile: sidebar slides in from the right with a backdrop overlay, closes on route change
  - Main content: `mr-64` offset on desktop, `pt-16` for topbar height, `bg-[#F6F8FB]`
  - Routing: sits inside `<ProtectedRoute>` — unauthenticated users never reach it
- **7 Reusable Dashboard Widgets** — all in `src/components/dashboard/`
  - `StatCard` — metric display with icon, optional trend (up/down %)
  - `DashboardSection` — titled section wrapper with optional "view all" link
  - `EmptyState` — dashed-border placeholder with icon, title, description, CTA
  - `DataTable` — generic TypeScript table with animated loading skeleton (5 rows), empty message, hover rows
  - `QuickActionCard` — link card with icon, label, description, animated hover lift
  - `ProgressCard` — animated progress bar (Framer Motion) with percentage and counts
  - `UpcomingSessionCard` — session card with online/offline badge, Zoom/Meet/Teams join button
- **Dashboard page** — real widget-based student overview with greeting, 4 stat cards, upcoming sessions, course progress, 4 quick actions (all using MOCK data, clearly marked)
- **Routing restructure** — `<DashboardLayout>` is a sibling of `<Layout>` (not a child), cleanly separating public and dashboard URL trees

### Phase 2
- **AuthContext** — React context with `user`, `token`, `isAuthenticated`, `isLoading`. Session survives page refresh via `localStorage`. Login calls `POST /login`, logout calls `POST /logout` (fire-and-forget) and clears storage.
- **Axios interceptors** — Token auto-injected on every request. 401 responses clear the session and hard-redirect to `/login` (skipped for the login endpoint itself).
- **ProtectedRoute** — Wraps protected route groups. Shows a full-screen spinner while session is being restored. Unauthenticated users are sent to `/login` with the original `from` path in `location.state`.
- **Functional Login page** — Controlled inputs, inline error message on API failure, spinner on submit button during loading, redirects to the intended page after success.
- **Auth-aware Navbar** — When logged in: user avatar (initial letter) + name + dropdown menu (لوحة التحكم / الملف الشخصي / تسجيل الخروج). When logged out: standard login + dashboard buttons. During session restore: auth area hidden to prevent flash.
- **Protected `/dashboard` route** — Unauthenticated visitors are redirected to `/login`.

### Phase 1
- **Navbar** — Fixed 80px RTL navbar with:
  - Logo
  - Direct link: الدورات
  - Dropdown group: التعليم (الأقسام، المحاور، المسارات، البرامج)
  - Dropdown group: عن المنصة (من نحن، المنصة، الفريق، الأثر، الشراكات)
  - Dropdown group: المجتمع (التطوع، تواصل معنا)
  - Desktop auth buttons: تسجيل الدخول / لوحة التحكم
  - Mobile hamburger menu with accordion sub-groups
  - Scroll shadow effect
  - Active route highlighting via `NavLink`
  - Keyboard accessibility (Escape closes dropdowns)
  - Click-outside-to-close for dropdowns
  - Auto-close on route change
- **404 Page** — Professional Arabic not-found page with icon, description, two CTA buttons
- **ErrorBoundary** — Catches runtime crashes, shows Arabic fallback with Reload + Home actions; shows error detail in dev mode only
- **Environment Config** — API base URL now driven by `VITE_API_BASE_URL` with localhost fallback
- **ThankYou Guard** — Direct visits to `/thank-you` redirect cleanly to `/courses`

---

## Remaining Features
- `DashboardLayout` with fixed RTL sidebar + topbar
- Sidebar navigation groups (academic, students, scheduling, etc.)
- Reusable dashboard widgets: `StatCard`, `ProgressCard`, `UpcomingSessionCard`, `EmptyState`, `DataTable`

### ~~Phase 4 — Student Dashboard~~ ✅ Complete
### ~~Phase 5 — Role-Based Dashboard Structure~~ ✅ Complete
### ~~Phase 6 — Public Website Pages~~ ✅ Complete

### Phase 7 — Course & Scheduling UI
- `/dashboard/schedule`
- `/dashboard/courses`
- `/dashboard/sessions`
- Calendar / session cards
- Zoom/Meet link display

### Phase 8 — Profile & Notifications
- `/dashboard/profile`
- Profile edit form
- Global toast notification system

---

## Next Steps

1. **Phase 7** — Course & scheduling UI (`/dashboard/courses`, `/dashboard/schedule`, `/dashboard/sessions`) — calendar/session cards, Zoom/Meet link display
2. **Phase 8** — Profile page (`/dashboard/profile`) and global toast/notification system

---

## Notes

- **Login API endpoint:** `POST /login` — expected response: `{ token: string, user: User }`. If the Laravel backend wraps the response in `{ data: { token, user } }`, adjust the destructure in `src/contexts/AuthContext.tsx` line ~58.
- **Logout API endpoint:** `POST /logout` — called fire-and-forget on logout. Safe to leave if backend doesn't have this endpoint.
- **Mock data:** Phase 4 student dashboard will use mock data if API endpoints are not ready. All mock data will be clearly marked with `// MOCK` comments.
- **Design system:** Colors `customBlue #2691C2`, `customOrange #ec943c`, `deepBlue #22334a`. Font: Tajawal. All new pages must use these.
- **RTL:** All new components must include `dir="rtl"` or inherit it from the Layout wrapper.
- **All Navbar routes are now live:** الأقسام `/departments`, المحاور `/tracks`, المسارات `/paths`, البرامج `/programs`, المنصة `/platform`, الفريق `/team`, الأثر `/impact`, الشراكات `/partnerships`, التطوع `/volunteer` — all built in Phase 6.
- **`.env` is git-ignored** — each developer must create their own `.env` from `.env.example`.
- **Profile link** in the Navbar user dropdown points to `/dashboard/profile` — this route will be built in Phase 8.
