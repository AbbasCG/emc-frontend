import type { Country } from '@/lib/countries'

/** Canonical E.164-ish value the backend expects — never duplicate the dial code inside the local part. */
export function buildE164Phone(country: Country | null, localPhone: string): string {
  if (!country) return localPhone.trim()
  return `${country.dialCode}${localPhone.trim()}`
}
