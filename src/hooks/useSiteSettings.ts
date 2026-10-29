import { useQuery } from '@tanstack/react-query'
import {
  DEFAULT_SITE_SETTINGS,
  getSiteSettings,
  type SiteSettings,
} from '@/services/siteSettingsService'

export const SITE_SETTINGS_QUERY_KEY = ['site-settings']

// The site's on/off switches. `ready` is false until the first answer: image-heavy sections wait
// for it before rendering, so a switched-off gallery never loads its images for a moment first.
// If the settings can't be read, everything stays on (the defaults).
export const useSiteSettings = (): SiteSettings & { ready: boolean } => {
  const { data, isPending } = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEY,
    queryFn: getSiteSettings,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  return { ...(data ?? DEFAULT_SITE_SETTINGS), ready: !isPending }
}
