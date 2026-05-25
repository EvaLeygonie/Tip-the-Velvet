import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSlug, formatDate, getImageSrc } from '@/lib/utils'
import type { Event, CreateCastingApplicationInput } from '@/types/types'
import { submitCastingApplication } from '@/services/castingService'
import { uploadToCloudinary } from '@/services/cloudinaryService'
import { Calendar, MapPin, Send, Loader2 } from 'lucide-react'
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
    const previewUrl = URL.createObjectURL(file)

    setTempFile(file)
    setFormData((prev) => ({ ...prev, promo_image_id: previewUrl }))
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
    let finalImageId = formData.promo_image_id

    if (tempFile) {
      setUploading(true)
      try {
        finalImageId = await uploadToCloudinary(tempFile, 'Casting Calls', [
          'casting-call',
          artistSlug,
          actSlug,
        ])
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

    try {
      submitCastingApplication(payload)
      toast.success(t('Ansökan skickad!', 'Application submitted!'))

      setFormData({
        event_id: event.id,
        language: preferredLang,
        agreed_to_terms: false,
        act_title: '',
        email: '',
        promo_image_id: null,
      })
      setAgreed(false)
    } catch (err) {
      toast.error(t('Någonting gick fel!', 'Something went wrong!'))
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-card/80 backdrop-blur-sm shadow-[0_10px_50px_hsl(0_60%_5%/0.6)] border border-accent/20 p-6 rounded-xl text-left">
      {/* EVENT INFO */}
      <div className="mb-6 text-center flex flex-col items-center">
        <div className="text-3xl font-decorative text-accent drop-shadow-[0_0_15px_currentColor]">
          {event.title}
        </div>
        {event.subtitle && (
          <div className="text-foreground/60 text-base font-playfair mt-1">{event.subtitle}</div>
        )}
        <div className="flex flex-wrap justify-center gap-4 pt-3 text-sm text-foreground/70">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-accent" />
            {formatDate(preferredLang, event.event_start)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-accent" />
            {event.location}
          </span>
        </div>
      </div>

      <div className="gold-divider" />

      <div className="space-y-5">
        {/* LANGUAGE & EMAIL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="space-y-3">
            <label className="label text-[10px] uppercase tracking-widest block">
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
          </div>
          <div className="space-y-2">
            <label className="label text-[10px] uppercase tracking-widest block">Email *</label>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label text-[10px] uppercase tracking-widest block">
              {t('Din hemmastad', 'Your city of residence *')}
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

          <div className="space-y-2">
            <label className="label text-[10px] uppercase tracking-widest block">
              {t('Land', 'Country *')}
            </label>
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
        <div className="space-y-2">
          <label className="label text-[10px] uppercase tracking-widest block">
            {t('Artistnamn', 'Artist Name *')}
          </label>
          <input
            type="text"
            name="performer_name"
            placeholder={t('Ditt artist namn', 'Your artist / stage name')}
            value={formData.performer_name}
            onChange={handleChange}
          />
        </div>

        {/* PROMO IMAGE & TEXT */}
        <div className="content-grid">
          <div className="space-y-4">
            <label className="label text-[10px] uppercase block">
              {t('Promobild:', 'Promo Image:')}
            </label>
            <div className="promo-upload-square is-active">
              {formData.promo_image_id ? (
                <div className="space-y-3">
                  <img
                    src={getImageSrc(formData.promo_image_id)}
                    className="promo-image"
                    alt="Preview"
                  />
                  <label htmlFor="image-up" className="btn-lang cursor-pointer hover:bg-accent/10">
                    {t('Byt bild', 'Change Image')}
                  </label>
                </div>
              ) : (
                <label htmlFor="image-up" className="btn-lang py-3 px-6 cursor-pointer">
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
          <div className="space-y-2">
            <label className="label text-[10px] uppercase tracking-widest block">
              {t('Promo text (SV)', 'Promo text (ENG) *')}
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
              className="flex"
            />
          </div>
        </div>

        <div className="gold-divider" />

        <div className="space-y-2">
          <label className="label text-[10px] uppercase tracking-widest block">
            {t('Akt titel', 'Act Title *')}
          </label>
          <input
            type="text"
            name="act_title"
            placeholder={t('Titel på din akt', 'Name of your act')}
            value={formData.act_title || ''}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label className="label text-[10px] uppercase tracking-widest block">
            {t('Act beksrivning (SV)', 'Act Description (ENG) *')}
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

        <div className="space-y-2">
          <label className="label text-[10px] uppercase tracking-widest block">
            Video Link (optional)
          </label>
          <input
            type="url"
            name="video_url"
            placeholder={t('En video länk till din akt', 'A video link to your act')}
            value={formData.video_url || ''}
            onChange={handleChange}
          />
        </div>

        {/* GDPR */}
        <div className="flex items-start space-x-3 pt-2">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
          />
          <label className="text-sm text-foreground/80 leading-relaxed cursor-pointer">
            {t(
              'Jag godkänner att informationen jag skickar in sparas i en databas. Jag kan närsomhelt kontakta Tip the Velvet för att min information ska raderas.',
              'I agree to this information being saved in a database. I can contact Tip the Velvet at any time to have my information deleted.'
            )}
          </label>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full btn-gold flex items-center justify-center gap-2 py-3 disabled:opacity-50"
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
