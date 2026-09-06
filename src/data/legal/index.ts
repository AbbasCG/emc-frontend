export type { LegalBlock, LegalDocument, LegalSection } from './types'
export { LEGAL_CONTACT, LEGAL_PLACEHOLDERS } from './types'

export { privacyPolicyDoc } from './privacy'
export { cookiePolicyDoc } from './cookies'
export { termsDoc } from './terms'
export { refundPolicyDoc } from './refund'
export { disclaimerDoc } from './disclaimer'
export { complaintsDoc } from './complaints'
export { accessibilityDoc } from './accessibility'

import type { LegalDocument } from './types'
import { privacyPolicyDoc } from './privacy'
import { cookiePolicyDoc } from './cookies'
import { termsDoc } from './terms'
import { refundPolicyDoc } from './refund'
import { disclaimerDoc } from './disclaimer'
import { complaintsDoc } from './complaints'
import { accessibilityDoc } from './accessibility'

export const ALL_LEGAL_DOCUMENTS: LegalDocument[] = [
  privacyPolicyDoc,
  cookiePolicyDoc,
  termsDoc,
  refundPolicyDoc,
  disclaimerDoc,
  complaintsDoc,
  accessibilityDoc,
]

export const LEGAL_FOOTER_LINKS = ALL_LEGAL_DOCUMENTS.map((d) => ({
  label: d.title,
  href: d.route,
}))
