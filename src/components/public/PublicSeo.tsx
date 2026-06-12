import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'EMC — Educational Mastars Central'
const DEFAULT_DESC =
  'منصة EMC التعليمية: دورات، ورش، ومسارات تعلم بالعربية من هولندا — تعليم احترافي وتطوير مهارات.'

export type PublicSeoProps = {
  title: string
  description?: string
  path?: string
  image?: string | null
  type?: 'website' | 'article'
  noIndex?: boolean
}

function absoluteUrl(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
  }
  return path.startsWith('http') ? path : `https://edumc.nl${path.startsWith('/') ? path : `/${path}`}`
}

export default function PublicSeo({
  title,
  description = DEFAULT_DESC,
  path = '/',
  image,
  type = 'website',
  noIndex = false,
}: PublicSeoProps) {
  const fullTitle = title.includes('EMC') ? title : `${title} | EMC`
  const url = absoluteUrl(path)
  const ogImage = image && image.startsWith('http') ? image : image ? absoluteUrl(image) : absoluteUrl('/favicon.svg')

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex ?
        <meta name="robots" content="noindex,nofollow" />
      : null}
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="ar_AR" />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  )
}
