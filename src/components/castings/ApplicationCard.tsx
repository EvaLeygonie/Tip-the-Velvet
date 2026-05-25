import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSlug, formatDate, getImageSrc } from '@/lib/utils'
import type { Event, CreateCastingApplicationInput } from '@/types/types'
import { submitCastingApplication } from '@/services/castingService'
import { uploadToCloudinary } from '@/services/cloudinaryService'
import { Calendar, MapPin, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export const ApplicationCard = ({ event }: { event: Event }) => {
  const { language: siteLanguage, t } = useLanguage()
  const [submitting, setSubmitting] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [preferredLang, setPreferredLang] = useState<'sv' | 'eng'>(
    siteLanguage === 'eng' ? 'eng' : 'sv'
  )
  const [uploading, setUploading] = useState(false)
  const [tempFile, setTempFile] = useState<File | null>(null)

  const [formData, setFormData] = useState<CreateCastingApplicationInput>({
    event_id: event.id,
    performer_name: '',
    email: '',
    act_title: '',
    act_description_sv: '',
    act_description_eng: '',
    video_url: '',
    slug: '',
    promo_image_id: null,
    promo_text_sv: '',
    promo_text_eng: '',
    language: preferredLang,
    city: '',
    country: '',
    facebook_link: '',
    instagram_link: '',
    other_link: '',
    agreed_to_terms: false,
  })

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

    if (!agreed) return toast.error(t('Acceptera termer tack', 'Please agree to the terms'))
    if (!formData.promo_image_id)
      return toast(t('Ladda upp en promobild.', 'Please upload a promo picture.'))
    if (!formData.performer_name)
      return toast.error(t('Artistnamn krävs', 'Artist name is required'))

    setSubmitting(true)
    const artistSlug = createSlug(formData.performer_name)
    const actSlug = createSlug(formData.act_title)
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
      email: formData.email.trim(),
      promo_image_id: finalImageId,
      language: preferredLang,
      agreed_to_terms: true,
    }

    try {
      submitCastingApplication(payload)
      toast.success(t('Ansökan skickad!', 'Application submitted!'))

      setFormData({
        event_id: event.id,
        performer_name: '',
        email: '',
        act_title: '',
        act_description_sv: '',
        act_description_eng: '',
        video_url: '',
        slug: '',
        promo_image_id: null,
        promo_text_sv: '',
        promo_text_eng: '',
        language: preferredLang,
        city: '',
        country: '',
        facebook_link: '',
        instagram_link: '',
        other_link: '',
        agreed_to_terms: false,
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
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="label text-[10px] uppercase tracking-widest block">Artist Name *</label>
          <input
            type="text"
            name="performer_name"
            placeholder={t('Ditt artist namn', 'Your artist / stage name')}
            value={formData.performer_name}
            onChange={handleChange}
          />
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

        <div className="space-y-2">
          <label className="label text-[10px] uppercase tracking-widest block">Act Title *</label>
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
            Act Description (SV) *
          </label>
          <textarea
            name="act_description_sv"
            placeholder={t('Berätta om ditt nummer', 'Tell us about your act')}
            rows={4}
            value={formData.act_description_sv || ''}
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

        <div className="space-y-4">
          <label className="label text-[10px] uppercase block">
            {t('Promobild:', 'Promo Image:')}
          </label>
          <div className="border-2 border-dashed border-accent/20 rounded-xl p-4 text-center">
            {formData.promo_image_id ? (
              <div className="space-y-3">
                <img
                  src={getImageSrc(formData.promo_image_id)}
                  className="w-full max-h-[300px] object-cover rounded-lg mx-auto"
                  alt="Preview"
                />
                <label
                  htmlFor="image-up"
                  className="btn-lang cursor-pointer inline-block bg-accent/10 px-4 py-2 rounded-lg"
                >
                  {t('Byt bild', 'Change Image')}
                </label>
              </div>
            ) : (
              <label
                htmlFor="image-up"
                className="cursor-pointer inline-block bg-accent/20 px-6 py-3 rounded-lg"
              >
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

        <div className="space-y-3">
          <label className="label text-[10px] uppercase tracking-widest block">
            {t('Kommunikationsspråk', 'Language')}
          </label>
          <div className="flex gap-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="preferred_lang"
                checked={preferredLang === 'sv'}
                onChange={() => setPreferredLang('sv')}
                className="accent-accent"
              />
              <span>Svenska</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="preferred_lang"
                checked={preferredLang === 'eng'}
                onChange={() => setPreferredLang('eng')}
                className="accent-accent"
              />
              <span>English</span>
            </label>
          </div>
        </div>

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
