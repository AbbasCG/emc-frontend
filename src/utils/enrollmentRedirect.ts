/** Safe internal path for post-auth redirect (course detail, etc.). */
export function safeEnrollmentRedirect(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

/** Guest CTA → account signup, then return to course to enroll. */
export function buildCourseEnrollSignupHref(courseSlug: string): string {
  const redirect = encodeURIComponent(`/courses/${courseSlug}`)
  return `/register?redirect=${redirect}&intent=enroll`
}

export function enrollActionLabel(itemType: 'course' | 'workshop' | 'program'): string {
  if (itemType === 'workshop') return 'التسجيل في الورشة'
  return 'الالتحاق بالدورة'
}
