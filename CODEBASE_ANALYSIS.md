# EMC Frontend Codebase Analysis

## 1. PROJECT OVERVIEW

**Build Setup:** Vite + React 19
- **Entry Point:** `src/main.tsx` — Standard React 19 setup with `createRoot`
- **Root Component:** `src/App.tsx` — BrowserRouter wrapper with all routes
- **Layout Wrapper:** `src/components/Layout.tsx` — Wraps all routes with header/footer
- **Language:** RTL (Arabic) — `dir="rtl"` set in Layout component
- **Build:** Vite + TypeScript compilation, ESLint configured
- **Dependencies:**
  - React 19.2.5 + React Router 7.14.2
  - Axios 1.15.2 for HTTP
  - Framer Motion 12.38.0 for animations
  - Lucide React 1.11.0 for icons
  - Tailwind CSS 3.4.19 for styling

---

## 2. ROUTING STRUCTURE

**Router Type:** React Router v7 with nested routes

**Route Layout:**
```
/ (Layout wrapper)
├── / → Home
├── /courses → Courses (listing)
├── /courses/:slug → CourseDetails (detail view)
├── /courses/:slug/register → Register (course-specific registration)
├── /about → About
├── /contact → Contact
├── /login → Login
├── /register → Register (generic)
├── /thank-you → ThankYou
└── /dashboard → Dashboard
```

**Key Points:**
- All routes wrapped in `<Layout />` component
- Two register paths: `/register` (generic) and `/courses/:slug/register` (course-specific)
- No auth guards/middleware visible
- No redirect logic implemented

---

## 3. COMPONENTS BREAKDOWN

### Layout Components
- **Layout.tsx** — Main wrapper with RTL support, animated entry
- **Navbar.tsx** — Fixed header, logo, nav links, mobile menu toggle (state-based)
- **Footer.tsx** — Empty stub (returns null)
- **PageHeader.tsx** — Section header with title, subtitle, breadcrumbs

### Content Components
- **CourseCard.tsx** — Reusable course card with image, title, schedule, location badge, price badge
- **StateMessage.tsx** — Error/empty state message display
- **home/HomeCourseCard.tsx** — Empty (unused)

### Form Fields
- **Register page** has inline `FormField` component (used for text inputs with icon)
- **Contact page** has inline `FormField` component (basic text inputs)

### Reusable Patterns
- Motion components for animations (from Framer Motion)
- Icon rendering (from Lucide React)
- Error boundary rendering (in forms)
- Loading skeleton animations

---

## 4. FORMS ANALYSIS (CRITICAL)

### Form 1: Registration Form (`src/pages/Register.tsx`)

**Location:** `/register` and `/courses/:slug/register`

**Form Type:** Custom form with React hooks (no external form library)

**Validation:** Custom validation on backend (422 response handling)

**State Management:**
```typescript
type RegisterForm = {
  full_name: string
  phone: string
  email: string
  city: string
  gender: string
  notes: string
  payment_provider: 'stripe' | 'paypal' | 'fake'
}
```
- Uses `useState` for form state
- Local validation errors state
- API error state

**Fields:**
1. **Course Selection** (conditional on `/register` path)
   - Type: Select dropdown
   - Conditional: Only shown if no slug param
   - Fallback: Read-only display if slug provided

2. **Full Name** — Text input, required
3. **Phone** — Text input, required
4. **Email** — Email input, required
5. **City** — Text input, required
6. **Gender** — Select dropdown, optional
7. **Notes** — Textarea (5 rows), optional
8. **Payment Provider** (only if course is paid)
   - Type: Button group (3 options: Stripe, PayPal, Fake)
   - Options: `stripe` | `paypal` | `fake`

**Submission Process:**
1. Form prevents default, validates course selection
2. Constructs payload with form data + course_id
3. **API Endpoint:** `POST /api/register`
4. **Payload Structure:**
   ```javascript
   {
     course_id: number,
     full_name: string,
     phone: string,
     email: string,
     city: string,
     gender: string,
     notes: string,
     payment_provider: string // only if paid course
   }
   ```
5. **Response Handling:**
   - If response has `checkout_url` → redirect to `window.location.href = checkoutUrl`
   - Otherwise → navigate to `/thank-you` page
6. **Error Handling:**
   - 422 status → Extract validation errors per field
   - Other errors → Show generic error message

**File Upload:** None

**Data Format:** JSON (application/json)

---

### Form 2: Contact Form (`src/pages/Contact.tsx`)

**Location:** `/contact`

**State:** Simple form with `useState(false)` for submitted state

**Fields:**
1. Full Name — Text input
2. Email — Email input
3. Phone — Tel input
4. Subject — Text input
5. Message — Textarea (6 rows)

**Submission:** 
- Currently dummy (sets `isSubmitted` to true)
- Displays success message on submit
- No actual API call implemented

**Data Format:** Not yet wired to backend

---

### Form 3: Contact Form (variant in Contact page)

**Location:** Footer CTA section

**Status:** Link (`mailto:`) rather than form

---

### Form 4: Login Form (`src/pages/Login.tsx`)

**Fields:**
1. Email — Email input, required
2. Password — Password input, required

**Submission:** 
- Dummy implementation
- Just shows success message
- No API integration

---

## 5. API INTEGRATION

### API Client Configuration
**Location:** `src/api/axios.ts`

```typescript
const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: {
    Accept: "application/json",
  },
})
```

**Base URL:** `http://127.0.0.1:8000/api` (Laravel backend)

**Default Headers:** `Accept: application/json`

### API Endpoints Used

1. **GET /courses** — Fetch all courses
   - Response: Array of Course objects or `{ data: Course[] }`
   - Used in: Courses page, Register page (for dropdown)
   - Caching: Implemented (global `cachedCourses` variable in Courses.tsx)

2. **GET /courses/{slug}** — Fetch single course details
   - Response: Course object or `{ data: Course }`
   - Used in: CourseDetails page, Register page (when slug provided)
   - Abort: AbortController implemented for cleanup

3. **POST /register** — Submit registration
   - Payload: RegisterForm + course_id
   - Response: `{ checkout_url?: string }`
   - Errors: 422 with `{ errors: ValidationErrors, message: string }`

### Error Handling Pattern

```typescript
// Axios error check
if (axios.isAxiosError(err)) {
  if (err.response?.status === 422) {
    // Validation errors
    setValidationErrors(err.response.data?.errors)
  }
}

// Abort signal check
if (axios.isCancel(err)) return

// Generic error message
setError('...')
```

### Data Normalization Helpers

**`src/utils/course.ts`** provides:

```typescript
extractItem<T>(payload: T | { data?: T }) // Extract T from nested { data } response
extractList<T>(payload: T[] | { data?: T[] }) // Extract T[] from nested response
```

**Usage:** Handles both direct array responses and wrapped `{ data: [...] }` responses

---

## 6. STATE MANAGEMENT

### State Strategy
- **No global state library** (no Redux, Zustand, Context API)
- **All state is local** using `useState` and `useReducer`

### State Patterns by Page

**Home Page:**
- Hardcoded data (stats, features, courses)
- Framer Motion animation state

**Courses Page:**
```typescript
- courses: Course[]
- isLoading: boolean
- error: string
- searchTerm: string
- activeFilter: CourseFilter
- filteredCourses: useMemo() // computed
```

**Register Page:**
```typescript
- course: Course | null
- courses: Course[]
- selectedCourseId: string
- form: RegisterForm
- isLoading: boolean
- isSubmitting: boolean
- apiError: string
- validationErrors: Record<field, string[]>
```

**CourseDetails Page:**
```typescript
- course: Course | null
- isLoading: boolean
- error: string
- notFound: boolean
```

### State Cleanup
- AbortController used for fetch cancellation
- `isMounted` flag in useEffect to prevent state updates after unmount
- Proper cleanup functions in useEffect

---

## 7. UI SYSTEM

### Styling System
**Tailwind CSS 3.4.19** with custom color extensions

### Custom Colors
```javascript
customBlue: "#2691C2"    // Primary blue
customOrange: "#ec943c"  // Accent orange
deepBlue: "#22334a"      // Dark blue (text/headers)
```

### Design Patterns

1. **Cards/Containers**
   - Rounded corners: `rounded-lg`, `rounded-xl`, `rounded-2xl`
   - Shadow: `shadow-xl shadow-slate-200/70`
   - Border: `ring-1 ring-slate-100`
   - Padding: `p-6` to `p-10` variants

2. **Buttons**
   - Height: `h-14` (56px)
   - Rounded: `rounded-lg`
   - Hover animations: `whileHover={{ scale: 1.03 }}` (Framer Motion)
   - Disabled state: `disabled:opacity-70`

3. **Form Inputs**
   - Height: `h-14` or `h-13`
   - Rounded: `rounded-xl`
   - RTL padding: `pr-12 pl-4` (icons on right)
   - Focus: `focus:ring-4 focus:ring-sky-100`
   - Background: `bg-slate-50` → `focus:bg-white`

4. **Spacing Grid**
   - Gap: `gap-5` common
   - Responsive: `sm:grid-cols-2` `lg:grid-cols-4`
   - Padding: `px-4 py-20` with `sm:px-6 lg:px-8` breakpoints

5. **Typography**
   - Font Family: Tajawal (from Google Fonts, Arabic)
   - Weights: 300, 400, 700
   - Sizes: Tailwind defaults

### Animation System
**Framer Motion** used throughout

- **Page transitions:** `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`
- **Element animations:** `whileHover={{ scale: 1.03, y: -8 }}`
- **Staggered animations:** `variants` + `delay`
- **Scroll animations:** `whileInView` with `viewport={{ once: true }}`

### RTL Support
- Global `dir="rtl"` in Layout component
- All text alignment: `text-right`
- Icon positioning: Right side of inputs (`right-4`)
- Margin/padding: Uses Tailwind's RTL-aware properties

### Icons
**Lucide React** for all icons (import by name)

---

## 8. WORKSHOP / FORM FLOW

**Current Status:** No workshop-specific form exists in codebase.

**What Exists:**
- Generic registration form that accepts any course
- No separate "workshop" form or flow
- No workshop-specific data types in TypeScript

**Related Types:** `src/types/index.ts`

```typescript
type Course {
  id: number
  title: string
  slug: string
  description?: string
  // ... 20+ fields for course metadata
}

type CourseFilter = 'all' | 'free' | 'paid' | 'online' | 'offline'
```

**Conclusion:** The term "workshop" appears in static text/copy (Home page), but there's no special workshop form — all submissions use the single registration form.

---

## 9. GAPS / MISSING LINKS

### Incomplete Implementations
1. **Login form** — No API integration, dummy success message
2. **Contact form** — No API integration, dummy success message
3. **Dashboard page** — Just PageHeader, no actual dashboard content
4. **Footer component** — Returns null (empty)
5. **HomeCourseCard** — Empty file (unused)

### Missing Features
1. **Authentication** — No auth state, tokens, or guards
2. **Error boundaries** — No React error boundaries
3. **Loading states** — Basic skeletons, no suspense/streaming
4. **Image optimization** — Direct img tags, no Next.js Image or similar
5. **Environment variables** — Hard-coded API URL
6. **File uploads** — Not implemented in any form
7. **Search debouncing** — Search runs on every keystroke
8. **Form validation** — Only server-side validation
9. **Toast notifications** — No toast/notification system
10. **Localization** — Hard-coded Arabic strings (no i18n library)

### Potential Concerns
1. **Type safety** — Course type has many optional fields, unclear which are required
2. **Error handling** — No error boundaries, console errors could crash app
3. **Performance** — No code splitting or lazy loading of routes
4. **Accessibility** — No ARIA labels, no semantic HTML validation
5. **SEO** — No meta tags, hard-coded title
6. **Testing** — No test files or test setup
7. **Payment flow** — Redirects to external checkout_url but no error handling if URL missing

---

## SUMMARY

This is an **education platform frontend** built with React 19 + Vite. It's a course discovery and registration system with:

- ✅ **Fully functional:** Courses listing, filtering, detail views, registration form
- ✅ **Clean architecture:** Component separation, utility helpers, consistent styling
- ✅ **Internationalization ready:** Full RTL/Arabic support
- ✅ **API integration:** Axios with proper error handling
- ⚠️ **Partially complete:** Login, contact, dashboard are UI-only
- ⚠️ **No state library:** All state is local (React hooks only)
- ⚠️ **No form library:** Custom form handling with manual validation
