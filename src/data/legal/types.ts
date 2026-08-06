export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'callout'; title?: string; text: string; variant?: 'info' | 'warning' | 'trust' }
  | { type: 'placeholder'; label: string }

export type LegalSection = {
  id: string
  title: string
  blocks: LegalBlock[]
}

export type LegalDocument = {
  slug: string
  route: string
  title: string
  subtitle: string
  eyebrow: string
  lastUpdated: string
  badge?: string
  sections: LegalSection[]
  contactEmail?: string
}

export const LEGAL_CONTACT = {
  general: 'info@edumc.nl',
  support: 'support@edumc.nl',
} as const

export const LEGAL_PLACEHOLDERS = {
  legalEntity: '[PLACEHOLDER: الاسم القانوني الكامل للكيان]',
  kvk: '[PLACEHOLDER: رقم KvK]',
  address: '[PLACEHOLDER: العنوان المسجّل في هولندا]',
  dpo: '[PLACEHOLDER: مسؤول حماية البيانات — إن وُجد]',
  ap: 'Autoriteit Persoonsgegevens (AP) — autoriteitpersoonsgegevens.nl',
} as const
