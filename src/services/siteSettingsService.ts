import { supabase } from '@/lib/supabase'

// Site-wide on/off switches the board flips from the Dashboard (table site_settings, one row per
// switch, readable by everyone, writable by logged-in admins). Used to hide image-heavy parts of
// the public site when Cloudinary's free plan is close to its monthly credit limit.
export interface SiteSettings {
  eventGalleriesHidden: boolean
  hallOfFameImagesHidden: boolean
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  eventGalleriesHidden: false,
  hallOfFameImagesHidden: false,
}

const DB_KEYS: Record<keyof SiteSettings, string> = {
  eventGalleriesHidden: 'event_galleries_hidden',
  hallOfFameImagesHidden: 'hall_of_fame_images_hidden',
}

export const getSiteSettings = async (): Promise<SiteSettings> => {
  const { data, error } = await supabase.from('site_settings').select('key, value')
  if (error) throw error

  const valueOf = (setting: keyof SiteSettings) =>
    data.find((row) => row.key === DB_KEYS[setting])?.value ?? false

  return {
    eventGalleriesHidden: valueOf('eventGalleriesHidden'),
    hallOfFameImagesHidden: valueOf('hallOfFameImagesHidden'),
  }
}

export const setSiteSetting = async (setting: keyof SiteSettings, value: boolean) => {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: DB_KEYS[setting], value, updated_at: new Date().toISOString() })
  if (error) throw error
}
