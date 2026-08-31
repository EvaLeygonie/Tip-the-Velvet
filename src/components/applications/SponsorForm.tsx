import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { CreateSponsorInput, SponsorType } from '@/types/types'
import {
  submitSponsorApplication,
  sendApplicationConfirmationEmail,
} from '@/services/applicationService'
import {
  processUploadedImage,
  createSlug,
  isUnresolvedBlobUrl,
  formatInstagramLink,
  formatOtherLink,
} from '@/lib/utils'
import { Send, Loader2, Image as ImageIcon } from 'lucide-react'
import { ImageCategory } from '@/types/media'
import { toast } from 'sonner'
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload'

export const SponsorCard = () => {
  const { t, language } = useLanguage()
  const { upload: uploadToCloudinary } = useCloudinaryUpload()

  interface SponsorOption {
    value: SponsorType
    sv: string
    en: string
  }

  const SPONSOR_OPTIONS: SponsorOption[] = [
    { value: 'prize', sv: 'Priser & presentpåsar', en: 'Prizes & giftbags' },
    { value: 'promo', sv: 'Promo & reklam', en: 'Promo & advertising' },
    { value: 'sales', sv: 'Säljbord på våra event', en: 'Sales table at our events' },
    { value: 'creation', sv: 'Kreativt samarbete', en: 'Creative collaboration' },
    { value: 'partner', sv: 'Samarbetspartner', en: 'Partnership' },
    { value: 'other', sv: 'Annat', en: 'Other' },
  ]

  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tempFile, setTempFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const [formData, setFormData] = useState<Partial<CreateSponsorInput>>({
    name: '',
    email: '',
    phone: '',
    sponsor_type: '' as SponsorType,
    sponsor_details: '',
    instagram_link: '',
    other_link: '',
    agreed_to_terms: false,
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    // duration är en säkerhetsnät: om toast.dismiss() av någon anledning inte tar bort
    // toasten (setts hända sporadiskt) ska den ändå aldrig fastna på skärmen permanent.
    const loadingToast = toast.loading(t('Bearbetar bild...', 'Processing image...'), {
      duration: 25000,
    })

    try {
      const readyFile = await processUploadedImage(file)

      setTempFile(readyFile)
      setPreviewUrl(URL.createObjectURL(readyFile))

      toast.dismiss(loadingToast)
    } catch (error: unknown) {
      toast.dismiss(loadingToast)
      toast.error((error as Error).message || t('Kunde inte läsa bilden', 'Failed to read image'))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreed) return toast.error(t('Acceptera termer tack.', 'Please agree to the terms.'))
    if (!formData.name)
      return toast.error(t('Företagsnamn/Namn krävs.', 'Company name/Name is required.'))
    if (!formData.email) return toast.error(t('Mail krävs.', 'Email is required.'))
    if (!formData.sponsor_type)
      return toast.error(t('Du måste välja en typ.', 'You must select a type.'))

    setSubmitting(true)
    let finalLogoId = ''

    if (tempFile) {
      setUploading(true)
      const nameSlug = createSlug(formData.name)
      const context = {
        name: (formData.name || '').trim(),
        category: ImageCategory.SPONSOR,
      }

      const uploadedId = await uploadToCloudinary(
        tempFile,
        'Sponsors',
        [ImageCategory.SPONSOR, nameSlug],
        `logo-${nameSlug}`,
        context,
        { genericErrorMessage: t('Kunde inte ladda upp logotypen', 'Cloudinary upload failed') }
      )
      setUploading(false)

      if (uploadedId === null) {
        setSubmitting(false)
        return
      }

      finalLogoId = uploadedId
      setTempFile(null)
    }

    const payload: CreateSponsorInput = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone || '',
      sponsor_type: formData.sponsor_type,
      sponsor_details: formData.sponsor_details || '',
      instagram_link: formData.instagram_link?.trim()
        ? formatInstagramLink(formData.instagram_link.trim())
        : null,
      other_link: formData.other_link?.trim() ? formatOtherLink(formData.other_link.trim()) : null,
      logo_id: finalLogoId,
      agreed_to_terms: true,
    }

    const applicantName = formData.name.trim()
    const applicantEmail = formData.email.trim()
    const applicantLanguage = language

    try {
      if (isUnresolvedBlobUrl(payload.logo_id)) {
        toast.error(
          t(
            'Bilden hann inte laddas upp ordentligt. Försök välja bilden igen.',
            'Image upload incomplete. Please re-select your image.'
          )
        )
        setSubmitting(false)
        return
      }

      await submitSponsorApplication(payload)

      setFormData({
        name: '',
        email: '',
        phone: '',
        sponsor_type: '' as SponsorType,
        sponsor_details: '',
        instagram_link: '',
        other_link: '',
        agreed_to_terms: false,
      })
      setPreviewUrl('')
      setAgreed(false)

      const emailSuccess = await sendApplicationConfirmationEmail(
        applicantName,
        applicantEmail,
        applicantLanguage,
        'sponsor'
      )

      if (emailSuccess) {
        toast.success(
          t(
            'Ansökan skickad! Kolla din inkorg efter en bekräftelse.',
            'Application submitted! Please check your inbox for a confirmation.'
          )
        )
      } else {
        toast.success(
          t(
            'Din ansökan är sparad! Kunde inte skicka bekräftelsemail.',
            'Your application is saved! Could not send confirmation email.'
          ),
          { duration: 5000 }
        )
      }
    } catch (err) {
      toast.error(t('Någonting gick fel!', 'Something went wrong!'))
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="application-card">
      <div className="form-stack">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* LOGOUPPLADDNING */}
          <div className="form-field md:col-span-4 flex flex-col h-full">
            <label className="form-label-block">{t('Logotyp', 'Logo')}</label>
            <div className="promo-upload-square relative flex-1 flex items-center justify-center border-2 border-dashed border-gold/30 rounded-lg p-4 bg-background/20 min-h-[180px] md:min-h-0 h-full">
              {previewUrl ? (
                <div className="absolute inset-0 group flex items-center justify-center p-2">
                  <img
                    src={previewUrl}
                    className="max-h-full max-w-full object-contain rounded"
                    alt="Preview"
                  />
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                    <label htmlFor="logo-up" className="btn-admin cursor-pointer text-xs py-1 px-3">
                      {t('Byt logotyp', 'Change Logo')}
                    </label>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="logo-up"
                  className="flex flex-col items-center space-y-2 cursor-pointer btn-admin text-center p-2"
                >
                  <ImageIcon className="h-5 w-5 text-gold/60" />
                  <span className="text-xs">
                    {uploading ? t('Laddar...', 'Uploading...') : t('Välj logotyp', 'Select Logo')}
                  </span>
                </label>
              )}
              <input
                type="file"
                id="logo-up"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </div>
          </div>

          {/* BASFÄLT */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-field sm:col-span-2">
              <label className="form-label-block">
                {t('Organisation / Namn *', 'Organisation / Name *')}
              </label>
              <input
                type="text"
                name="name"
                placeholder={t(
                  'Ditt eller organisationens namn',
                  'Your or your organisations name'
                )}
                value={formData.name || ''}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            <div className="form-field">
              <label className="form-label-block">Email *</label>
              <input
                type="email"
                name="email"
                placeholder={t('ditt@mail.com', 'your@email.com')}
                value={formData.email || ''}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            <div className="form-field">
              <label className="form-label-block">{t('Telefon', 'Phone')}</label>
              <input
                type="text"
                name="phone"
                placeholder={t('Telefonnummer', 'Phone number')}
                value={formData.phone || ''}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            <div className="form-field">
              <label className="form-label-block">Instagram</label>
              <input
                type="text"
                name="instagram_link"
                placeholder="@handle"
                value={formData.instagram_link || ''}
                onChange={handleChange}
                className="w-full"
              />
            </div>

            <div className="form-field">
              <label className="form-label-block">{t('Annan länk', 'Other link')}</label>
              <input
                type="text"
                name="other_link"
                placeholder="https://..."
                value={formData.other_link || ''}
                onChange={handleChange}
                className="w-full"
              />
            </div>

          </div>
        </div>

        <div className="gold-divider my-2" />

        <div className="form-field">
          <label className="form-label-block">
            {t('Typ av samarbete *', 'Type of Collaboration *')}
          </label>
          <select
            name="sponsor_type"
            value={formData.sponsor_type || ''}
            onChange={handleChange}
            className="w-full"
          >
            <option value="" disabled hidden>
              {language === 'sv' ? '-- Välj typ --' : '-- Select type --'}
            </option>
            {SPONSOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {language === 'sv' ? opt.sv : opt.en}
              </option>
            ))}
          </select>
        </div>

        {/* BESKRIVNING */}
        <div className="form-field">
          <label className="form-label-block">
            {t('Tankar kring samarbete / Beskrivning', 'Thoughts on collaboration / Description')}
          </label>
          <textarea
            name="sponsor_details"
            rows={3}
            placeholder={t(
              'Berätta gärna lite om era idéer!',
              'Please tell us a bit about your ideas!'
            )}
            value={formData.sponsor_details || ''}
            onChange={handleChange}
            className="w-full min-h-[80px]"
          />
        </div>

        {/* GDPR */}
        <div className="form-checkbox-row flex items-start space-x-2 mt-2">
          <input
            type="checkbox"
            id="sponsor-agreed"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 shrink-0"
          />
          <label
            htmlFor="sponsor-agreed"
            className="text-xs text-foreground/80 leading-relaxed cursor-pointer font-medium"
          >
            {t(
              'Genom att skicka in detta formulär godkänner du att Tip the Velvet (ekonomisk förening) sparar era uppgifter och logotyp i syfte att hantera sponsoransökningar. Vi delar aldrig er data med tredje part, och du kan när som helst kontakta oss för att få era uppgifter raderade.',
              'By submitting this form, you agree to Tip the Velvet (economic association) storing your information and logo for the purpose of managing sponsor applications. We never share your data with third parties, and you can contact us at any time to have your information deleted.'
            )}
          </label>
        </div>

        {/* SKICKA-KNAPP */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full btn-gold font-body flex items-center justify-center space-x-2 py-3 mt-2 disabled:opacity-50"
          disabled={submitting || uploading || !agreed}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>{t('Skicka ansökan', 'Submit Application')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
