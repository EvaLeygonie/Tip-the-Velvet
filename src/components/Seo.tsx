import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'

// React 19 hoists <title>, <meta> and <link> rendered anywhere in the tree into <head>,
// so no helmet library is needed.
const SITE_URL = 'https://tipthevelvet.nu'

interface SeoProps {
  title: string
  description?: string
  /** Path starting with "/". Omit together with `noindex` for private pages. */
  path?: string
  noindex?: boolean
}

export const Seo = ({ title, description, path, noindex = false }: SeoProps) => (
  <>
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    {noindex ? (
      <meta name="robots" content="noindex, nofollow" />
    ) : (
      path !== undefined && <link rel="canonical" href={`${SITE_URL}${path === '/' ? '' : path}`} />
    )}
    <meta property="og:title" content={title} />
    {description && <meta property="og:description" content={description} />}
    <meta property="og:type" content="website" />
    {!noindex && path !== undefined && (
      <meta property="og:url" content={`${SITE_URL}${path === '/' ? '' : path}`} />
    )}
  </>
)

// Board-only and token-authenticated routes must never be indexed.
const PRIVATE_PREFIXES = ['/admin', '/hall-of-fame-form', '/casting/confirm']

export const PrivateRouteRobots = () => {
  const { pathname } = useLocation()
  const isPrivate = PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  return isPrivate ? <meta name="robots" content="noindex, nofollow" /> : null
}

// The page content is bilingual client-side, so keep <html lang> in sync with the toggle.
export const HtmlLangSync = () => {
  const { language } = useLanguage()
  useEffect(() => {
    document.documentElement.lang = language === 'sv' ? 'sv' : 'en'
  }, [language])
  return null
}
