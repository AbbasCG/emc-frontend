/**
 * M6 — canonical list of INDEXABLE public routes and the page file that renders
 * each. Single source of truth for:
 *   - scripts/generate-sitemap.mjs   (public/sitemap.xml + public/robots.txt)
 *   - src/test/publicSeoCoverage.test.ts (every page must render <PublicSeo/>)
 *
 * Excluded on purpose: redirects (/themes→/tracks, /paths→/learning-paths,
 * /ar/*), noIndex utility pages (thank-you, forgot/reset password, error pages,
 * application-success) and dynamic detail routes (:slug — not statically
 * enumerable; their pages still carry PublicSeo, tested separately).
 */
export const PUBLIC_ROUTES = [
  { path: '/', file: 'src/pages/Home.tsx', priority: 1.0 },
  { path: '/courses', file: 'src/pages/Courses/index.tsx', priority: 0.9 },
  { path: '/workshops', file: 'src/pages/Workshops/index.tsx', priority: 0.8 },
  { path: '/learning-paths', file: 'src/pages/LearningPaths/index.tsx', priority: 0.8 },
  { path: '/programs', file: 'src/pages/Programs/index.tsx', priority: 0.7 },
  { path: '/tracks', file: 'src/pages/Tracks.tsx', priority: 0.7 },
  { path: '/instructors', file: 'src/pages/Instructors.tsx', priority: 0.7 },
  { path: '/about', file: 'src/pages/About.tsx', priority: 0.8 },
  { path: '/platform', file: 'src/pages/Platform.tsx', priority: 0.6 },
  { path: '/impact', file: 'src/pages/Impact.tsx', priority: 0.6 },
  { path: '/team', file: 'src/pages/Team.tsx', priority: 0.5 },
  { path: '/departments', file: 'src/pages/Departments.tsx', priority: 0.5 },
  { path: '/partnerships', file: 'src/pages/Partnerships.tsx', priority: 0.6 },
  { path: '/partnerships/apply', file: 'src/pages/operations/public/PartnershipApplyPage.tsx', priority: 0.5 },
  { path: '/volunteer', file: 'src/pages/Volunteer.tsx', priority: 0.6 },
  { path: '/volunteer/apply', file: 'src/pages/VolunteerApply.tsx', priority: 0.5 },
  { path: '/ambassador', file: 'src/pages/AmbassadorProgram.tsx', priority: 0.6 },
  { path: '/ambassador/apply', file: 'src/pages/AmbassadorApply.tsx', priority: 0.5 },
  { path: '/support', file: 'src/pages/operations/public/SupportPage.tsx', priority: 0.5 },
  { path: '/knowledge', file: 'src/pages/platform/KnowledgeHubPage.tsx', priority: 0.6 },
  { path: '/contact', file: 'src/pages/Contact.tsx', priority: 0.6 },
  { path: '/submit-workshop', file: 'src/pages/SubmitWorkshop.tsx', priority: 0.6 },
  { path: '/login', file: 'src/pages/Login.tsx', priority: 0.3 },
  { path: '/signup', file: 'src/pages/Signup.tsx', priority: 0.4 },
]

/** noIndex pages — must still carry <PublicSeo noIndex/> for meta hygiene. */
export const NOINDEX_PAGES = [
  'src/pages/ThankYou.tsx',
  'src/pages/ForgotPassword.tsx',
  'src/pages/ResetPassword.tsx',
  'src/pages/NotFound.tsx',
  'src/pages/errors/UnauthorizedPage.tsx',
  'src/pages/errors/ForbiddenPage.tsx',
  'src/pages/errors/ServerErrorPage.tsx',
  'src/pages/AmbassadorApplicationSuccess.tsx',
]

export const SITE_ORIGIN = 'https://edumc.nl'
