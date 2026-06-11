import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSlug, formatDate, getImageSrc } from '@/lib/utils'
import type { Event, CreateCastingApplicationInput } from '@/types/types'
import { submitCastingApplication } from '@/services/applicationService'
import { uploadToCloudinary } from '@/services/cloudinaryService'
import { buildEventFolderName } from '@/lib/utils'
import { Calendar, MapPin, Send, Loader2, BellDot } from 'lucide-react'
import { toast } from 'sonner'

export const ApplicationCard = ({ event }: { event: Event }) => {
  const { language, t, setLanguage } = useLanguage()

  const preferredLang = language === 'eng' ? 'eng' : 'sv'
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [tempFile, setTempFile] = useState<File | null>(null)

  const [formData, setFormData] = useState<Partial<CreateCastingApplicationInput>>({
    event_id: event.id,
    language: preferredLang,
    agreed_to_terms: false,
    act_title: '',
    email: '',
    promo_image_id: null,
  })

  const handleLanguageChange = (lang: 'sv' | 'eng') => {
    setLanguage(lang)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error(
        t('Bilden är för stor. Maxstorlek är 5MB.', 'Image is too large. Maximum size is 5MB.')
      )
      return
    }

    const previewUrl = URL.createObjectURL(file)

    setTempFile(file)
    setFormData((prev) => ({ ...prev, promo_image_id: previewUrl }))
  }

  const sendCastingEmail = async (
    name: string,
    email: string,
    language: string,
    deadline: string,
    type: string
  ) => {
    try {
      const response = await fetch('/api/application-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, language, deadline, type }),
      })
      return response.ok
    } catch (error) {
      console.error('Nätverksfel vid sändning av mail:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreed) return toast.error(t('Acceptera termer tack.', 'Please agree to the terms.'))
    if (!formData.promo_image_id)
      return toast(t('Ladda upp en promobild.', 'Please upload a promo picture.'))
    if (!formData.performer_name)
      return toast.error(t('Artistnamn krävs.', 'Artist name is required.'))

    setSubmitting(true)
    const artistSlug = createSlug(formData.performer_name)
    const actSlug = createSlug(formData.act_title || '')
    const eventFolder = buildEventFolderName(false, event.title, event.event_start || '')
    let finalImageId = formData.promo_image_id

    if (tempFile) {
      setUploading(true)
      try {
        finalImageId = await uploadToCloudinary(
          tempFile,
          `Casting Calls/${eventFolder}`,
          ['casting-call', artistSlug, actSlug],
          `${artistSlug}-${actSlug}`
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
    const payload: CreateCastingApplicationInput = {
      ...formData,
      event_id: event.id,
      performer_name: formData.performer_name.trim(),
      act_title: formData.act_title?.trim() || '',
      slug: actSlug,
      email: formData.email?.trim() || '',
      promo_image_id: finalImageId,
      language: preferredLang,
      agreed_to_terms: true,
    }

    const applicantName = formData.performer_name.trim()
    const applicantEmail = formData.email?.trim() || ''
    const applicantLanguage = preferredLang
    const deadline = event.casting_call_deadline
      ? formatDate(preferredLang, event.casting_call_deadline)
      : ''

    try {
      await submitCastingApplication(payload)

      setFormData({
        event_id: event.id,
        language: preferredLang,
        agreed_to_terms: false,
        performer_name: '',
        act_title: '',
        email: '',
        promo_image_id: null,
      })
      setAgreed(false)

      const emailSuccess = await sendCastingEmail(
        applicantName,
        applicantEmail,
        applicantLanguage,
        deadline,
        'casting'
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
            'Kunde inte skicka bekräftelsemail, men din ansökan är sparad.',
            'Could not send confirmation email, but your application is saved.'
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
      {/* EVENT INFO */}
      <div className="application-header">
        <div className="application-title">{event.title}</div>
        {event.subtitle && <div className="application-subtitle">{event.subtitle}</div>}
        <div className="application-meta">
          <span className="meta-row">
            <Calendar className="icon-accent-sm" />
            {formatDate(preferredLang, event.event_start)}
          </span>
          <span className="meta-row">
            <MapPin className="icon-accent-sm" />
            {event.location}
          </span>
          <span className="meta-row">
            <BellDot className="h-4 w-4 text-red-500 shrink-0" />
            <span className="font-medium">Deadline: </span>
            {formatDate(preferredLang, event.casting_call_deadline)}
          </span>
        </div>
      </div>

      <div className="gold-divider" />

      <div className="form-stack">
        {/* LANGUAGE & EMAIL */}
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
            <label className="form-label-block">Email *</label>
            <input
              type="email"
              name="email"
              placeholder={t('ditt@mail.com', 'your@email.com')}
              value={formData.email}
              onChange={handleChange}
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

        <div className="gold-divider" />

        {/* ARTIST INFO */}
        <div className="form-field">
          <label className="form-label-block">{t('Artistnamn *', 'Artist Name *')}</label>
          <input
            type="text"
            name="performer_name"
            placeholder={t('Ditt artist namn', 'Your artist / stage name')}
            value={formData.performer_name}
            onChange={handleChange}
          />
        </div>

        {/* PROMO IMAGE & TEXT */}
        <div className="form-row-2 items-stretch">
          <div className="flex flex-col space-y-3">
            <label className="form-label-block">{t('Promobild *', 'Promo Image *')}</label>
            <div className="promo-upload-square">
              {formData.promo_image_id ? (
                <div className="absolute inset-0 group">
                  <img
                    src={getImageSrc(formData.promo_image_id)}
                    className="promo-image"
                    alt="Preview"
                  />
                  <div className="promo-image-change">
                    <label htmlFor="image-up" className="btn-admin">
                      {t('Byt bild', 'Change Image')}
                    </label>
                  </div>
                </div>
              ) : (
                <label htmlFor="image-up" className="btn-admin">
                  {uploading ? t('Laddar...', 'Uploading...') : t('Välj Bild', 'Select Image')}
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
          </div>

          <div className="form-field flex flex-col h-full">
            <label className="form-label-block">
              {t('Promo text (SV) *', 'Promo text (ENG) *')}
            </label>
            <textarea
              name="promo_text"
              placeholder={t(
                'Presentera dig själv som artist! Din promo text kommer delas till sociala medier om du blir vald för att uppträda hos oss.',
                'Introduce yourself as a performer! Your promo text will be shared on social media if you become part of the lineup.'
              )}
              rows={4}
              value={formData.promo_text || ''}
              onChange={handleChange}
              className="w-full flex-1 min-h-[300px] h-full resize-none box-border"
            />
          </div>
        </div>

        <div className="gold-divider" />

        <div className="form-field">
          <label className="form-label-block">{t('Akt titel *', 'Act Title *')}</label>
          <input
            type="text"
            name="act_title"
            placeholder={t('Titel på din akt', 'Name of your act')}
            value={formData.act_title || ''}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label className="form-label-block">
            {t('Act beksrivning (SV) *', 'Act Description (ENG) *')}
          </label>
          <textarea
            name="act_description"
            placeholder={t(
              'Berätta om ditt nummer (på svenska)',
              'Tell us about your act (in english)'
            )}
            rows={4}
            value={formData.act_description || ''}
            onChange={handleChange}
          />
        </div>

        <div className="form-field">
          <label className="form-label-block">
            {t('Video Link (friviligt)', 'Video Link (optional)')}
          </label>
          <input
            type="url"
            name="video_url"
            placeholder={t('En video länk till din akt', 'A video link to your act')}
            value={formData.video_url || ''}
            onChange={handleChange}
          />
        </div>

        <div className="form-row-2-tight">
          <div className="form-field">
            <label className="form-label-block">
              {t('Instagram (friviligt)', 'Instagram (optional)')}
            </label>
            <input
              type="text"
              name="instagram_link"
              placeholder={t('Din instagram profil', 'Your instagram profile')}
              value={formData.instagram_link || ''}
              onChange={handleChange}
              required
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
              required
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
              'Genom att skicka in detta formulär godkänner du att Tip the Velvet (ekonomisk förening) sparar din ansökan och mediefiler i syfte att hantera artistbokningar. Vi delar aldrig din data med tredje part, och du kan när som helst kontakta oss för att få dina uppgifter raderade.',
              'By submitting this form, you agree to Tip the Velvet (economic association) storing your application and media files for the purpose of managing artist bookings. We never share your data with third parties, and you can contact us at any time to have your information deleted.'
            )}
          </label>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full btn-gold py-3 disabled:opacity-50"
          disabled={submitting || !agreed}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t('Skicka ansökan', 'Submit Application')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
