import type { Event, CreateCastingApplicationInput, CastingApplication } from '@/types/types'
import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { createSlug } from '@/lib/utils'
import { submitCastingApplication } from '@/services/castingService'
import { formatDate, getImageSrc } from '@/lib/utils'
import { Calendar, MapPin, Send, Loader2 } from 'lucide-react'

export const ApplicationCard = ({ event }: { event: Event }) => {
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

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
    promo_image_id: '',
    promo_text_sv: '',
    promo_text_eng: '',
    language: preferredLang,
    city: '',
    country: '',
    facebook_link: '',
    instagram_link: '',
    other_link: '',
    agreed_to_terms: false
  })

  const [promoImageId, setPromoImageId] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !CLOUD_NAME || !UPLOAD_PRESET) return
    const previewUrl = URL.createObjectURL(file)

    setTempFile(file)
    setFormData((prev) => ({ ...prev, promo_image_id: previewUrl }))
  }

  const handleSubmit = async () => {
    const artistSlug = createSlug(formData.performer_name)
    const actSlug = createSlug(formData.act_title)

    if (!agreed) {
      toast(t('Acceptera termer tack', "Please agree to the terms"));
      return;
    }

     if (!promoImageId) {
      toast( t("Ladda upp en promobild", "Please upload a promo picture"));
      return;
    }

    setPromoImageId(formData.promo_image_id || '')

    if (tempFile) {
      setUploading(true)
      const uploadData = new FormData()
      uploadData.append('file', tempFile)
      uploadData.append('upload_preset', UPLOAD_PRESET)
      uploadData.append('folder', 'Casting Calls')
      uploadData.append('public_id', artistSlug)

      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: uploadData,
        })

        if (!res.ok) throw new Error('Upload failed')

        const data = await res.json()
        setPromoImageId(data.public_id)
        setTempFile(null)
      } catch (err) {
        setUploading(false)
        toast.error(t('Kunde inte ladda upp bilden', 'Cloudinary upload failed'))
        console.log(err)
      } finally {
        setUploading(false)
      }
    }

    const payload: CreateCastingApplicationInput = {
      ...formData,
      event_id: event.id,
      performer_name: formData.performer_name.trim(),
      act_title: formData.act_title.trim(),
      act_description_sv: formData.act_description_sv || null,
      act_description_eng: formData.act_description_eng || null,
      video_url: formData.video_url || null,
      slug: actSlug,
      email: formData.email.trim(),
      promo_image_id: promoImageId,
      promo_text_sv: formData.promo_text_sv || null,
      promo_text_eng: formData.promo_text_eng || null,
      language: preferredLang,
      city: formData.city,
      country: formData.country,
      facebook_link: formData.facebook_link || null,
      instagram_link: formData.instagram_link || null,
      other_link: formData.other_link || null,
      agreed_to_terms: true,
    }

    try {
      submitCastingApplication(payload)

      toast(
        t(
          'Ansökan skickad! Vi återkommer nör vi har granskat den!',
          "Application submitted! We'll review your application and get back to you."
        )
      )
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
        promo_image_id: '',
        promo_text_sv: '',
        promo_text_eng: '',
        language: preferredLang,
        city: '',
        country: '',
        facebook_link: '',
        instagram_link: '',
        other_link: '',
        agreed_to_terms: false
      })
      setPromoImageId(null)
      setAgreed(false)
    } catch (err) {
      toast(t('Någonting gick fel!', 'Something went wrong!'))
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
  <div className="bg-card/80 backdrop-blur-sm shadow-[0_10px_50px_hsl(0_60%_5%/0.6)] border-accent/20">
      <div>
        <div className="text-3xl font-decorative text-accent drop-shadow-[0_0_15px_currentColor]">
          {event.title}
        </div>
        {event.subtitle && (
          <div className="text-foreground/60 text-base font-playfair">
            {event.subtitle}
          </div>
        )}
        <div className="flex flex-wrap gap-4 pt-2 text-sm text-foreground/70">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-accent" />
            {formatDate(new Date(event.event_start), "MMMM d, yyyy")}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-accent" />
            {event.location}
          </span>
        </div>
      </div>
      <div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor={`performer_name-${event.id}`}>Artist Name *</label>
            <input
              id={`performer_name-${event.id}`}
              name="performer_name"
              placeholder="Your artist / stage name"
              required
              value={formData.performer_name}
              onChange={handleSubmit}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={`email-${event.id}`}>Email *</label>
            <input
              id={`email-${event.id}`}
              name="email"
              type="email"
              placeholder="your@email.com"
              required
              value={formData.email}
              onChange={handleChange}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={`act_title-${event.id}`}>Act Title *</label>
            <input
              id={`act_title-${event.id}`}
              name="act_title"
              placeholder="Name of your act"
              required
              value={formData.act_title}
              onChange={handleChange}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={`act_description-${event.id}`}>Act Description *</label>
            <Textarea
              id={`act_description-${event.id}`}
              name="act_description"
              placeholder="Tell us about your act – style, music, theme, duration..."
              required
              rows={4}
              value={formData.act_description}
              onChange={handleChange}
              className="bg-background resize-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={`video_url-${event.id}`}>Video Link (optional)</label>
            <input
              id={`video_url-${event.id}`}
              name="video_url"
              type="url"
              placeholder="https://youtube.com/..."
              value={formData.video_url}
              onChange={handleChange}
              className="bg-background"
            />
          </div>

         <div className="content-grid">
                   <div className="space-y-4">
                     <label className="label text-[10px] uppercase block">
                       {t('Promobild:', 'Promo Image:')}
                     </label>
                     <div className={`promo-upload-square ${!isReadyToUpload ? 'is-locked' : 'is-active'}`}>
                       {formData.promo_image_id && CLOUD_NAME ? (
                         <div className="text-center p-4">
                           <img
                             src={getImageSrc(formData.promo_image_id)}
                             className="w-full h-full object-cover relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-[1.01] max-h-[60vh] md:max-h-[70vh]"
                             alt="Preview"
                           />
                           <label htmlFor="image-up" className="btn-lang cursor-pointer hover:bg-accent/10">
                             {t('Byt bild', 'Change Image')}
                           </label>
                         </div>
                       ) : (
                         <label htmlFor="image-up" className="btn-lang py-3 px-6 cursor-pointer">
                           {uploading ? 'Laddar...' : 'Välj Bild'}
                         </label>
                       )}
                       <input type="file" id="image-up" className="hidden" onChange={handleImageUpload} />
                     </div>

          <div className="space-y-2">
            <label htmlFor={`promo_text_sv-${event.id}`}>{t("Promo-text (svenska)", "Promo Text (Swedish)")} ({t("valfritt", "optional")})</label>
            <Textarea
              id={`promo_text_sv-${event.id}`}
              name="promo_text_sv"
              placeholder={t("Kort bio / promotext vi kan publicera om du blir uttagen...", "Short bio / promo text we can publish if you're selected...")}
              rows={3}
              value={formData.promo_text_sv}
              onChange={handleChange}
              className="bg-background resize-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={`promo_text_eng-${event.id}`}>{t("Promo-text (engelska)", "Promo Text (English)")} ({t("valfritt", "optional")})</label>
            <Textarea
              id={`promo_text_eng-${event.id}`}
              name="promo_text_eng"
              placeholder="Short bio / promo text we can publish if you're selected..."
              rows={3}
              value={formData.promo_text_eng}
              onChange={handleChange}
              className="bg-background resize-none"
            />
          </div>


          <div className="space-y-3">
            <label>{t("Föredraget kommunikationsspråk", "Preferred communication language")}</label>
            <RadioGroup
              value={preferredLang}
              onValueChange={(v) => setPreferredLang(v as "sv" | "eng")}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sv" id={`lang-sv-${event.id}`} />
                <label htmlFor={`lang-sv-${event.id}`} className="cursor-pointer font-normal">
                  Svenska
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="eng" id={`lang-eng-${event.id}`} />
                <label htmlFor={`lang-eng-${event.id}`} className="cursor-pointer font-normal">
                  English
                </label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-start space-x-3 pt-2">
            <Checkbox
              id={`terms-${event.id}`}
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
            />
            <label htmlFor={`terms-${event.id}`} className="text-sm text-foreground/80 leading-relaxed cursor-pointer">
              {t(
                "Jag godkänner att informationen jag skickar in sparas i databasen. Om du vill att vi raderar din information kan du när som helst skicka ett mejl till ",
                "I agree that the information I submit will be saved in the database. If you want your data removed, you can send us an email at any time at "
              )}
              <a href="mailto:velvet.gbg@gmail.com" className="text-accent hover:underline">
                velvet.gbg@gmail.com
              </a>
              .
            </label>
          </div>

          <button
            type="submit"
            className="w-full"
            disabled={submitting || !agreed}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Application
              </>
            )}
          </button>
        </form>
      </div>
    </div>
    </div>
    </>
  )
}
