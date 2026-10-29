import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { SITE_SETTINGS_QUERY_KEY, useSiteSettings } from '@/hooks/useSiteSettings'
import { setSiteSetting, type SiteSettings } from '@/services/siteSettingsService'

// Emergency brake for Cloudinary's free plan (25 credits per rolling 30 days, mostly bandwidth):
// hides the image-heavy parts of the public site until usage has come down again.
export const SiteImagesCard = () => {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const settings = useSiteSettings()

  const handleToggle = async (setting: keyof SiteSettings, value: boolean) => {
    const previous = queryClient.getQueryData<SiteSettings>(SITE_SETTINGS_QUERY_KEY)
    queryClient.setQueryData<SiteSettings>(SITE_SETTINGS_QUERY_KEY, (old) => ({
      eventGalleriesHidden: false,
      hallOfFameImagesHidden: false,
      ...old,
      [setting]: value,
    }))
    try {
      await setSiteSetting(setting, value)
    } catch (err) {
      console.error('Site setting error:', err)
      queryClient.setQueryData(SITE_SETTINGS_QUERY_KEY, previous)
      toast.error(t('Kunde inte spara inställningen', "Couldn't save the setting"))
    }
  }

  const switches: { setting: keyof SiteSettings; sv: string; eng: string }[] = [
    {
      setting: 'eventGalleriesHidden',
      sv: 'Dölj alla eventgallerier (hänvisar till Facebook-albumet)',
      eng: 'Hide all event galleries (points to the Facebook album)',
    },
    {
      setting: 'hallOfFameImagesHidden',
      sv: 'Dölj bilderna i Hall of Fame (profilerna visas kvar)',
      eng: 'Hide the images in the Hall of Fame (profiles stay)',
    },
  ]

  return (
    <div className="admin-card-bg p-4 space-y-3">
      <div>
        <h3 className="font-decorative text-lg text-accent">
          {t('Bilder på hemsidan', 'Website images')}
        </h3>
        <p className="text-xs text-foreground/60">
          {t(
            'Cloudinary-krediterna är nästan slut. Stäng av bilder här tills förbrukningen har gått ner.',
            'The Cloudinary credits are almost used up. Turn images off here until usage has come down.'
          )}
        </p>
      </div>
      {switches.map(({ setting, sv, eng }) => (
        <label
          key={setting}
          className="flex items-start gap-2 text-sm text-foreground/80 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={settings[setting]}
            disabled={!settings.ready}
            onChange={(e) => void handleToggle(setting, e.target.checked)}
            className="h-4 w-4 mt-0.5 accent-accent"
          />
          {t(sv, eng)}
        </label>
      ))}
    </div>
  )
}
