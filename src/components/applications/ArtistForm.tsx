import { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  createSlug,
  getImageSrc,
  compressImage,
  formatInstagramLink,
  formatOtherLink,
} from '@/lib/utils'
import type { CreatePerformerInput, Performer } from '@/types/types'
import {
  submitArtistInfo,
  fetchPerformerBySlug,
  updatePerformer,
} from '@/services/performerService'
import { uploadToCloudinary } from '@/services/cloudinaryService'
import { ImageCategory } from '@/types/media'
import { Send, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

export const ArtistForm = ({ editSlug }: { editSlug?: string }) => {
  const { language, t, setLanguage } = useLanguage()

  const preferredLang = language === 'eng' ? 'eng' : 'sv'
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingArtist, setLoadingArtist] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [tempFile, setTempFile] = useState<File | null>(null)

  const [formData, setFormData] = useState<Partial<CreatePerformerInput>>({
    language: preferredLang,
    agreed_to_terms: false,
    performer_name: '',
    email: '',
    city: '',
    country: '',
    phone: '',
    bio_sv: '',
    bio_eng: '',
    instagram_link: '',
    other_link: '',
    promo_image_id: null,
    photographer: '',
  })

  useEffect(() => {
    if (!editSlug) return

    const loadArtistData = async () => {
      setLoadingArtist(true)
      try {
        const data = await fetchPerformerBySlug(editSlug, true)
        if (data) {
          const adminData = data as Performer

          setFormData(adminData)
          setAgreed(adminData.agreed_to_terms || false)
        }
      } catch (err) {
        console.error('Kunde inte hämta artistdata för editering:', err)
        toast.error(t('Kunde inte ladda artistprofilen', 'Could not load performer profile'))
      } finally {
        setLoadingArtist(false)
      }
    }

    loadArtistData()
  }, [editSlug, t])

  const handleLanguageChange = (lang: 'sv' | 'eng') => {
    setLanguage(lang)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)

    setTempFile(file)
    setFormData((prev) => ({ ...prev, promo_image_id: previewUrl }))
  }

  const sendCastingEmail = async (name: string, email: string, language: string, type: string) => {
    try {
      const response = await fetch('/api/application-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, language, type }),
      })
      return response.ok
    } catch (error) {
      console.error('Nätverksfel vid sändning av mail:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.promo_image_id && !tempFile) {
      return toast.error(t('Ladda upp en promobild.', 'Please upload a promo picture.'))
    }
    if (!agreed) return toast.error(t('Acceptera termer tack.', 'Please agree to the terms.'))

    setSubmitting(true)
    const artistSlug = editSlug || createSlug(formData.performer_name || '')
    let finalImageId = formData.promo_image_id

    if (tempFile) {
      setUploading(true)
      try {
        const context = {
          photographer: (formData.photographer || '').trim(),
          artist: formData.performer_name?.trim() || '',
          category: ImageCategory.ARTIST_PROMO,
        }

        const fileToUpload = await compressImage(tempFile)

        finalImageId = await uploadToCloudinary(
          fileToUpload,
          'Performers',
          [ImageCategory.ARTIST_PROMO, artistSlug],
          `Promo-${artistSlug}`,
          context
        )
        setTempFile(null)
      } catch (err) {
        toast.error(t('Kunde inte ladda upp bilden', 'Cloudinary upload failed'))
        console.error(err)
        setSubmitting(false)
        return
      } finally {
        setUploading(false)
      }
    }

    const formattedInstagram = formatInstagramLink(formData.instagram_link || '')
    const formattedOther = formatOtherLink(formData.other_link || '')

    const payload: CreatePerformerInput = {
      ...formData,
      slug: artistSlug,
      performer_name: formData.performer_name?.trim() || '',
      email: formData.email?.trim() || '',
      instagram_link: formattedInstagram,
      other_link: formattedOther,
      promo_image_id: finalImageId,
      language: preferredLang,
      agreed_to_terms: true,
    }
    try {
      if (payload.promo_image_id && payload.promo_image_id.startsWith('blob:')) {
        toast.error(
          t(
            'Bilden hann inte laddas upp ordentligt. Försök välja bilden igen.',
            'Image upload incomplete. Please re-select your image.'
          )
        )
        setSubmitting(false)
        return
      }

      if (editSlug) {
        const performerId = (formData as Performer).id

        if (!performerId) {
          throw new Error('Artist-ID saknas vid uppdatering.')
        }

        await updatePerformer(performerId, payload)

        toast.success(t('Artistprofilen har uppdaterats!', 'Artist profile updated successfully!'))
      } else {
        // Ny registrering
        await submitArtistInfo(payload)

        setFormData({
          language: preferredLang,
          agreed_to_terms: false,
          performer_name: '',
          email: '',
          promo_image_id: null,
          instagram_link: '',
          other_link: '',
        })
        setAgreed(false)

        const emailSent = await sendCastingEmail(
          payload.performer_name,
          payload.email || '',
          preferredLang,
          'artist'
        )

        if (emailSent) {
          toast.success(
            t('Info inskickad! Bekräftelse skickad via mail.', 'Info submitted! Confirmation sent.')
          )
        } else {
          toast.success(
            t(
              'Din info är sparad! Kunde inte skicka bekräftelsemail.',
              'Your info is saved! Could not send confirmation email.'
            ),
            { duration: 5000 }
          )
        }
      }
    } catch (err) {
      toast.error(t('Någonting gick fel!', 'Something went wrong!'))
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingArtist) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    )
  }

  if (loadingArtist) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    )
  }

  return (
    <div className="application-card">
      <form onSubmit={handleSubmit} className="form-stack">
        {/* LANGUAGE & NAME */}
        <div className="form-row-2">
          <fieldset className="form-field">
            <label className="form-label-block">
              {t('Kommunikationsspråk', 'Preferred Language')}
            </label>
            <div className="gap-6 h-[46px] flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="preferred_lang"
                  checked={preferredLang === 'sv'}
                  onChange={() => handleLanguageChange('sv')}
                  className="accent-accent"
                />
                <span>Svenska</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="preferred_lang"
                  checked={preferredLang === 'eng'}
                  onChange={() => handleLanguageChange('eng')}
                  className="accent-accent"
                />
                <span>English</span>
              </label>
            </div>
          </fieldset>

          <div className="form-field">
            <label className="form-label-block">{t('Artistnamn *', 'Artist Name *')}</label>
            <input
              type="text"
              name="performer_name"
              placeholder={t('Ditt artist namn', 'Your artist / stage name')}
              value={formData.performer_name}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* COUNTRY & CITY */}
        <div className="form-row-2-tight">
          <div className="form-field">
            <label className="form-label-block">
              {t('Din hemmastad *', 'Your city of residence *')}
            </label>
            <input
              type="text"
              name="city"
              placeholder={t('t.ex. Göteborg', 'e.g. Gothenburg')}
              value={formData.city || ''}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label-block">{t('Land *', 'Country *')}</label>
            <input
              type="text"
              name="country"
              placeholder={t('t.ex. Sverige', 'e.g. Sweden')}
              value={formData.country || ''}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* CONTACT INFO */}
        <div className="form-row-2-tight">
          <div className="form-field">
            <label className="form-label-block">Email *</label>
            <input
              type="email"
              name="email"
              placeholder={t('ditt@mail.com', 'your@email.com')}
              value={formData.email || ''}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label-block">
              {t('Telefonnummer (friviligt)', 'Phone number (optional)')}
            </label>
            <input
              type="text"
              name="phone"
              placeholder={t('ditt telefonnummer', 'your phone number')}
              value={formData.phone || ''}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="gold-divider" />

        {/* PROMO IMAGE & BIO */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* BILDUPPLADDNING */}
          <div className="form-field md:col-span-4 flex flex-col h-full">
            <label className="form-label-block">{t('Promobild *', 'Promo Image *')}</label>
            <div className="promo-upload-square relative flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gold/30 rounded-lg p-4 bg-background/20 min-h-[250px] md:min-h-0 h-full">
              {formData.promo_image_id ? (
                <div className="absolute inset-0 group flex items-center justify-center p-2">
                  <img
                    src={getImageSrc(formData.promo_image_id)}
                    className="max-h-full max-w-full object-contain rounded"
                    alt="Preview"
                  />
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                    <label htmlFor="image-up" className="btn-admin cursor-pointer">
                      {t('Byt bild', 'Change Image')}
                    </label>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="image-up"
                  className="flex flex-col items-center space-y-2 cursor-pointer btn-admin text-center p-2"
                >
                  <span className="text-xs font-medium">
                    {uploading ? t('Laddar...', 'Uploading...') : t('Välj Bild', 'Select Image')}
                  </span>
                </label>
              )}
              <input
                type="file"
                id="image-up"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
            <div className="form-field">
              <label className="form-label-block mt-2">{t('Fotograf *', 'Photographer *')}</label>
              <input
                type="text"
                name="photographer"
                placeholder={t('Vem tog bilden?', 'Who took this picture?')}
                value={formData.photographer || ''}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* PROMO TEXT */}
          <div className="md:col-span-8 flex flex-col gap-4">
            {/* SVENSKA */}
            <div className="form-field flex-1 flex flex-col">
              <label className="form-label-gold mb-2 block">Promo text (SV) *</label>
              <textarea
                name="bio_sv"
                placeholder={t(
                  'Din promo text på svenska.',
                  "Your promo text in Swedish. If you cannot provide a swedish text, write that and we'll translate for you before publishing."
                )}
                value={formData.bio_sv || ''}
                onChange={handleChange}
                className="editor-textarea flex-1 w-full resize-none p-3 min-h-[120px]"
                required
              />
            </div>

            {/* ENGELSKA */}
            <div className="form-field flex-1 flex flex-col">
              <label className="form-label-gold mb-2 block">Promo text (ENG) *</label>
              <textarea
                name="bio_eng"
                value={formData.bio_eng || ''}
                placeholder={t(
                  'Din promo text på engelska. Om du inte kan skriva din text på engelska, skriv det så översätter vi innan vi publicerar.',
                  'Your promo text in English.'
                )}
                onChange={handleChange}
                className="editor-textarea flex-1 w-full resize-none p-3 min-h-[120px]"
              />
            </div>
          </div>
        </div>

        <div className="gold-divider" />

        <div className="form-row-2-tight">
          <div className="form-field">
            <label className="form-label-block">
              {t('Instagram länk (friviligt)', 'Instagram link (optional)')}
            </label>
            <input
              type="text"
              name="instagram_link"
              placeholder={t('Din instagram profil', 'Your instagram profile')}
              value={formData.instagram_link || ''}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label className="form-label-block">
              {t('Annan länk (friviligt)', 'Other link (optional)')}
            </label>
            <input
              type="text"
              name="other_link"
              placeholder={t(
                'I.e webbsida, annan social media',
                'e.g. website, other social media'
              )}
              value={formData.other_link || ''}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* GDPR */}
        <div className="form-checkbox-row">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5"
          />
          <label className="text-sm text-foreground/90 leading-relaxed cursor-pointer font-medium">
            {t(
              'Genom att skicka in detta formulär godkänner du att Tip the Velvet (ekonomisk förening) sparar dina uppgifter och mediebilder i syfte av atisbokningar samt att visa upp dig i vårt Hall of Fame! Vi delar aldrig din känsliga data med tredje part, och du kan när som helst kontakta oss för att få dina uppgifter raderade.',
              'By submitting this form, you agree to Tip the Velvet (economic association) storing your information and media files for the purpose of artist bookings and displaying your public information in our wall of fame! We never share your sensitive data with third parties, and you can contact us at any time to have your information deleted.'
            )}
          </label>
        </div>

        <button
          type="submit"
          className="w-full btn-gold py-3 disabled:opacity-50"
          disabled={submitting || !agreed}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : editSlug ? (
            <>
              <Save className="h-4 w-4" />
              {t('Spara ändringar', 'Save Changes')}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t('Skicka ansökan', 'Submit Application')}
            </>
          )}
        </button>
      </form>
    </div>
  )
}
