import { Helmet } from 'react-helmet-async'
import { siteContact } from '@/data/publicPages'

/** M6.d — structured data. Confirmed facts only: never ratings, counts or prices
 *  that the page itself doesn't already display from real data. */

const ORIGIN = 'https://edumc.nl'

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'EMC — Educational Mastar Central',
    alternateName: 'مركز ماستر التعليمي',
    url: ORIGIN,
    logo: `${ORIGIN}/brand/og-default.png`,
    email: siteContact.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Amsterdam',
      addressCountry: 'NL',
    },
    sameAs: [
      siteContact.social.linkedin,
      siteContact.social.instagram,
      siteContact.social.youtube,
      siteContact.social.x,
    ],
  }
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  )
}

export type CourseJsonLdProps = {
  name: string
  description: string
  slug: string
  image?: string | null
}

export function CourseJsonLd({ name, description, slug, image }: CourseJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    url: `${ORIGIN}/courses/${slug}`,
    ...(image ? { image } : {}),
    provider: {
      '@type': 'EducationalOrganization',
      name: 'EMC — Educational Mastar Central',
      url: ORIGIN,
    },
  }
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  )
}
