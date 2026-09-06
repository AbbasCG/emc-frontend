# EMC Frontend — Manual QA Checklist

**How to use:** Work through each section before every release.
- ✅ = pass  ❌ = fail (log in Known Issues)  ⏭ = skip (feature not deployed)
- Test in: Chrome (primary), Firefox, Safari/iOS, Android Chrome

---

## 1. Authentication

### 1.1 Login / Logout
- [ ] Open `/login` — form renders correctly in RTL Arabic
- [ ] Submit empty form — required-field errors appear in Arabic
- [ ] Enter wrong credentials — shows Arabic error toast, no redirect
- [ ] Login as **student** → lands on `/dashboard/student`
- [ ] Login as **admin** → lands on `/dashboard/admin`
- [ ] Login as **instructor** → lands on `/dashboard/instructor`
- [ ] Login as **super_admin** → lands on `/dashboard/super-admin`
- [ ] Click logout → redirected to `/login`, all auth tokens cleared
- [ ] After logout, navigate to `/dashboard` → redirected to `/login`

### 1.2 Expired Session
- [ ] Delete `emc_token` from localStorage while logged in
- [ ] Trigger any API call (navigate to a dashboard page)
- [ ] Verify: redirected to `/login?reason=session&next=<previous path>`
- [ ] Login again → lands on previous path (not dashboard home)

### 1.3 Suspended Account
- [ ] Log in as a suspended user
- [ ] Verify: redirected to `/login?reason=suspended`
- [ ] Verify: error message visible, no dashboard access

### 1.4 Password Reset
- [ ] Open `/forgot-password` — form renders, accepts email
- [ ] Submit valid email → success message in Arabic
- [ ] Open reset link → `/reset-password?token=…` renders new-password form
- [ ] Submit mismatched passwords → inline error
- [ ] Submit valid new password → success, redirected to `/login`

### 1.5 Role Redirect
| User Role | Expected Landing | Pass? |
|---|---|---|
| `student` | `/dashboard/student` | |
| `instructor` | `/dashboard/instructor` |  |
| `admin` | `/dashboard/admin` | |
| `super_admin` | `/dashboard/super-admin` | |
| `finance_manager` | `/dashboard/finance` | |
| `hr_manager` | `/dashboard/hr` | |
| `partner` | `/dashboard/partner` | |
| `quality_manager` | `/dashboard/quality` | |
| `marketing_manager` | `/dashboard/marketing` | |
| `support_agent` | `/dashboard/support` | |
| Unknown role | `/dashboard/profile` | |

---

## 2. Student Flows

### 2.1 Course Registration
- [ ] Open `/courses` — public course catalog loads
- [ ] Click a course → `/courses/:slug` detail page renders correctly
- [ ] Click "سجّل الآن" → redirected to `/login` if not logged in
- [ ] As logged-in student, click "سجّل الآن" → `/courses/:slug/register`
- [ ] Registration form pre-fills student data
- [ ] Submit registration → success toast + redirect to `/thank-you` or dashboard
- [ ] Attempt to register for already-registered course → duplicate warning shown

### 2.2 Student Dashboard
- [ ] Open `/dashboard/student` — KPI cards visible (progress %, sessions, assignments)
- [ ] "دوراتي الحالية" section shows registered courses (or empty state if none)
- [ ] "الجلسات القادمة" section shows upcoming sessions
- [ ] "الواجبات المعلّقة" section shows pending assignments
- [ ] No seed/mock data visible when API returns empty arrays

### 2.3 My Courses
- [ ] `/dashboard/student/courses` or My Courses tab loads
- [ ] Each course card shows: title, instructor, progress bar
- [ ] Click course → navigates to course modules or detail

### 2.4 LMS Learning Page
- [ ] `/dashboard/courses/:courseId/modules` loads module list
- [ ] Click a lesson → `/dashboard/lessons/:lessonId` renders LessonPlayer
- [ ] LessonPlayer shows video/content HTML (sanitized via DOMPurify) ✓
- [ ] Navigation between lessons (prev/next) works
- [ ] `/dashboard/quizzes/:quizId` renders quiz form
- [ ] Submitting quiz shows result/score

### 2.5 Sessions
- [ ] `/dashboard/student/sessions` shows all sessions
- [ ] Past sessions show "مكتملة" badge
- [ ] Upcoming sessions show meeting link if available

### 2.6 Materials
- [ ] `/dashboard/student/materials` lists course materials
- [ ] Click a PDF/file → triggers authenticated download (not direct link)
- [ ] Click a link-type material → opens in new tab
- [ ] Spinner shown during download

### 2.7 Assignments
- [ ] `/dashboard/student/assignments` lists pending and graded assignments
- [ ] Status badges render correctly: pending / submitted / graded

### 2.8 Progress & Certificates
- [ ] `/dashboard/student/progress` shows progress charts per course
- [ ] `/dashboard/certificates` shows earned certificates or empty state

---

## 3. Instructor Flows

### 3.1 Instructor Dashboard
- [ ] `/dashboard/instructor` loads with assigned courses and stats
- [ ] Shows upcoming sessions count, pending submissions count

### 3.2 Assigned Courses
- [ ] `/dashboard/instructor/courses` lists assigned courses
- [ ] Each course has links to: sessions, attendance, materials, assignments

### 3.3 Content Manager
- [ ] `/dashboard/courses/:courseId/content` renders full CMS
- [ ] Can create a module (title, description)
- [ ] Can create a lesson inside a module (title, content HTML, video URL)
- [ ] Can create an assignment (title, due date, max score)
- [ ] Can create a quiz with questions
- [ ] Saving shows success toast

### 3.4 Attendance
- [ ] `/dashboard/instructor/attendance` shows session list
- [ ] Select a session → student roster loads
- [ ] Mark students present/absent → save succeeds

### 3.5 Submissions
- [ ] `/dashboard/instructor/submissions` lists pending submissions
- [ ] Click a submission → review form opens
- [ ] Submit score + feedback → status updates

---

## 4. Admin Flows

### 4.1 Admin Dashboard
- [ ] `/dashboard/admin` loads — KPI summary cards visible
- [ ] No forbidden errors for admin role

### 4.2 Courses CRUD
- [ ] Admin courses list loads at `/dashboard/admin/courses`
- [ ] "إضافة دورة" button → create form opens
- [ ] Fill required fields → save → course appears in list
- [ ] Edit existing course → changes saved
- [ ] Course status (published/draft/archived) toggles correctly

### 4.3 Registrations
- [ ] `/dashboard/super-admin/crud/registrations` loads registration list
- [ ] Status filter works (pending / confirmed / cancelled)
- [ ] Can update registration status
- [ ] Arabic status labels shown (not raw enum values)

### 4.4 Users Management
- [ ] `/dashboard/super-admin/crud/users` loads user list
- [ ] Search/filter by name or role works
- [ ] Edit user role → change saved

### 4.5 LMS Admin
- [ ] `/dashboard/admin/lms/sessions` — session list and create form
- [ ] `/dashboard/admin/lms/materials` — material upload works
- [ ] `/dashboard/admin/lms/assignments` — assignment list
- [ ] `/dashboard/admin/lms/attendance` — attendance management
- [ ] `/dashboard/admin/lms/evaluations` — evaluation management
- [ ] `/dashboard/admin/lms/progress` — student progress overview

---

## 5. Notifications

### 5.1 Bell + Drawer
- [ ] Notification bell visible in dashboard topbar
- [ ] Unread count badge appears when there are unread notifications
- [ ] Clicking bell opens notification drawer
- [ ] Notifications grouped by: اليوم / أمس / سابق
- [ ] Unread notifications have visual distinction (dot or bold)

### 5.2 Mark as Read
- [ ] Click a notification → drawer closes, navigates to correct route
- [ ] Unread count decreases by 1 after click
- [ ] "تحديد الكل كمقروء" marks all as read, count goes to 0
- [ ] Notification does NOT navigate to `/api/…` or external URLs

### 5.3 Notification Centre
- [ ] `/dashboard/notifications` shows all notifications
- [ ] Clicking a notification item marks it read + navigates

### 5.4 Polling
- [ ] Wait 90 seconds — unread count refreshes automatically (no page reload)

---

## 6. Profile & Settings

### 6.1 Profile Update
- [ ] `/dashboard/profile` loads current user info
- [ ] Edit name/phone → save → changes reflected immediately
- [ ] Change password form → wrong current password shows error
- [ ] Change password → success toast

### 6.2 File Uploads
- [ ] Profile photo upload: select image → preview shown → save
- [ ] Photo appears in topbar avatar after save

### 6.3 Notification Preferences
- [ ] `/dashboard/settings/notifications` loads preference toggles
- [ ] Toggle a preference → saved without page reload

---

## 7. Access Control

### 7.1 Route Guards
- [ ] Unauthenticated: navigating to `/dashboard/student` → redirected to `/login`
- [ ] Student: navigating to `/dashboard/admin` → 403 or redirect to student home
- [ ] Instructor: navigating to `/dashboard/finance` → 403 or redirect
- [ ] Super admin: can access all namespaces

### 7.2 Forbidden Page
- [ ] Forbidden (403) page renders in Arabic with "العودة للرئيسية" button
- [ ] Button navigates to user's own dashboard home

---

## 8. Error States

### 8.1 API Failures
- [ ] Offline / backend down: API error → Arabic toast shown (not HTTP status codes or endpoint paths)
- [ ] 404 course → course detail shows "الدورة غير موجودة" message
- [ ] Empty course catalog → EmptyState component shown in Arabic

### 8.2 ErrorBoundary
- [ ] Force a React error (DEV only: throw in a component) → full-page error boundary shows "حدث خطأ غير متوقع"
- [ ] "إعادة تحميل الصفحة" button reloads
- [ ] "الرئيسية" button navigates to `/`

### 8.3 Section Error Boundary
- [ ] Individual dashboard widgets that fail show inline "تعذّر تحميل هذا القسم" with retry button
- [ ] Retry button re-renders the section without full page reload

---

## 9. UI/UX Quality

### 9.1 RTL Arabic Layout
- [ ] All text is right-aligned in Arabic
- [ ] `dir="rtl"` set on root `<html>` or `<div>`
- [ ] Icons and arrows point in the correct RTL direction
- [ ] Form labels appear to the right of inputs
- [ ] Dropdown menus open in RTL direction

### 9.2 Responsive Breakpoints
- [ ] **Mobile (375px):** Sidebar collapses to hamburger menu, navbar stacks correctly
- [ ] **Tablet (768px):** Sidebar partially visible or collapsible
- [ ] **Desktop (1280px+):** Full sidebar, multi-column layouts

### 9.3 Loading States
- [ ] Initial page load shows skeleton/spinner (not blank screen)
- [ ] Lazy-loaded routes show `RouteFallback` spinner during code split load
- [ ] Button loading states: disabled + spinner during async actions

### 9.4 Empty States
- [ ] Empty course list → Arabic empty state illustration/message
- [ ] No notifications → empty state in drawer
- [ ] No assignments → empty state

---

## 10. Payment Flow

### 10.1 Paid Course Registration
- [ ] Paid course shows price on detail page
- [ ] Registration for paid course → payment step shown
- [ ] Stripe payment form renders (test mode)
- [ ] Successful test payment → registration confirmed
- [ ] Failed payment → error message in Arabic

---

## 11. Public Pages

- [ ] `/` — Home page loads, hero, features, courses sections visible
- [ ] `/courses` — Course catalog with search/filter
- [ ] `/instructors` — Instructors list
- [ ] `/about`, `/contact`, `/platform` — Load without errors
- [ ] `/tracks`, `/programs`, `/paths` — Content loads
- [ ] `/departments` — Departments org chart renders
- [ ] `/impact` — Impact dashboard renders with real-looking content

---

## 12. Known Failure Mode Verification

These scenarios should show clean Arabic error states — never raw API data, endpoint names, or HTTP status codes:

| Scenario | Expected UI |
|---|---|
| API returns 500 | Toast: "حدث خطأ في الخادم" |
| API returns 404 | Toast: "المحتوى غير موجود" |
| API returns 403 | Toast: "غير مسموح بهذا الإجراء" |
| Network offline | Toast: "تعذّر الاتصال بالخادم" |
| Token expired | Redirect to `/login?reason=session` |
| Account suspended | Redirect to `/login?reason=suspended` |

---

## 13. Pre-Release Final Checks

- [ ] `npm run test` — all 52 tests pass
- [ ] `npm run build` — exits 0, no TypeScript errors
- [ ] No `console.log` / `console.error` outside `import.meta.env.DEV` guards
- [ ] No seed/mock data imported from `@/data/` in any API file
- [ ] No `DEMO_COURSE_ID` or hardcoded test IDs in production paths
- [ ] No placeholder text like "TODO", "FIXME", "lorem ipsum" visible to users
- [ ] FakePayment route only present in DEV mode (`import.meta.env.DEV`)
- [ ] All `dangerouslySetInnerHTML` uses sanitized via `DOMPurify.sanitize()`
- [ ] Lighthouse score ≥ 80 (Performance, Accessibility, Best Practices)
