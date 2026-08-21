import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  createSlug,
  formatDate,
  getImageSrc,
  processUploadedImage,
  isUnresolvedBlobUrl,
} from '@/lib/utils'
import type {
  CastingApplicationActInput,
  Event,
  CreateCastingApplicationInput,
} from '@/types/types'
import {
  submitCastingApplication,
  sendApplicationConfirmationEmail,
} from '@/services/applicationService'
import { buildEventFolderName, formatInstagramLink, formatOtherLink } from '@/lib/utils'
import {
  Calendar,
  MapPin,
  Send,
  Loader2,
  BellDot,
  DollarSign,
  BusFront,
  Home,
  Plus,
  Trash2,
} from 'lucide-react'
import { ImageCategory } from '@/types/media'
import { toast } from 'sonner'
import { CastingInfoAccordion } from './CastingInfoAccordion'
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload'

interface PostgrestError {
  code?: string
  message?: string
  details?: string
}

const EMPTY_ACT: CastingApplicationActInput = { act_title: '', act_description: '', video_url: '' }
const MAX_ACTS = 5

export const ApplicationCard = ({ event }: { event: Event }) => {
  const { language, t, setLanguage } = useLanguage()
  const { upload: uploadToCloudinary } = useCloudinaryUpload()

  const preferredLang = language === 'eng' ? 'eng' : 'sv'
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [tempFile, setTempFile] = useState<File | null>(null)

  const [formData, setFormData] = useState<Partial<CreateCastingApplicationInput['application']>>({
    event_id: event.id,
    language: preferredLang,
    agreed_to_terms: false,
    email: '',
    promo_image_id: null,
    photographer: '',
    requested_fee: 1000,
    needs_travel_costs: false,
    needs_accommodation: false,
    accommodation_notes: '',
  })

  // One application can now hold several acts — each artist submits once per event, not
  // once per act (multi-act-casting-plan.md). Always at least one act block.
  const [acts, setActs] = useState<CastingApplicationActInput[]>([{ ...EMPTY_ACT }])

  const handleLanguageChange = (lang: 'sv' | 'eng') => {
    setLanguage(lang)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseInt(value, 10)) : value,
    }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.checked }))
  }

  const handleActChange = (
    index: number,
    field: keyof CastingApplicationActInput,
    value: string
  ) => {
    setActs((prev) => prev.map((act, i) => (i === index ? { ...act, [field]: value } : act)))
  }

  const addAct = () => {
    if (acts.length >= MAX_ACTS) return
    setActs((prev) => [...prev, { ...EMPTY_ACT }])
  }

  const removeAct = (index: number) => {
    setActs((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
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

      const previewUrl = URL.createObjectURL(readyFile)
      setTempFile(readyFile)
      setFormData((prev) => ({ ...prev, promo_image_id: previewUrl }))

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

    if (!formData.promo_image_id)
      return toast.error(t('Ladda upp en promobild.', 'Please upload a promo picture.'))
    if (!agreed) return toast.error(t('Acceptera termer tack.', 'Please agree to the terms.'))

    setSubmitting(true)
    const artistSlug = createSlug(formData.performer_name || '')
    const eventSlug = event.slug
    // Image + tags are keyed off the first act — the promo image is shared across the
    // whole application now, not one per act, so there's no single "the" act to use.
    const firstActSlug = createSlug(acts[0]?.act_title || '')
    const imageSlug = `${artistSlug}-${firstActSlug}`
    // No longer suffixed with an act slug — one application per artist per event now
    // (unique_artist_per_event), not one per act, so the slug doesn't need to
    // differentiate acts anymore.
    const applicationSlug = `${eventSlug}-${artistSlug}`
    const eventFolder = buildEventFolderName(event.title, event.event_start || '')
    let finalImageId = formData.promo_image_id

    if (tempFile) {
      setUploading(true)
      const context = {
        photographer: (formData.photographer || '').trim(),
        artist: formData.performer_name?.trim() || '',
        act: acts[0]?.act_title?.trim() || '',
        event: event.title,
        category: ImageCategory.CASTING,
      }

      const uploadedId = await uploadToCloudinary(
        tempFile,
        `Casting Calls/${eventFolder}`,
        [ImageCategory.CASTING, eventSlug, artistSlug, firstActSlug],
        imageSlug,
        context,
        {
          genericErrorMessage: t('Kunde inte ladda upp bilden', 'Image upload failed'),
          onDuplicateError: () => {
            toast.info(
              t(
                'Du har redan skickat in en ansökan till det här evenemanget! Din ansökan är sparad.',
                'You have already submitted an application to this event! Your application is safe.'
              ),
              { duration: 6000 }
            )
          },
        }
      )
      setUploading(false)

      if (uploadedId === null) {
        setSubmitting(false)
        return
      }

      finalImageId = uploadedId
      setTempFile(null)
    }

    const formattedInstagram = formatInstagramLink(formData.instagram_link || '')
    const formattedOther = formatOtherLink(formData.other_link || '')

    const payload: CreateCastingApplicationInput = {
      application: {
        event_id: event.id,
        performer_name: formData.performer_name?.trim() || '',
        email: formData.email?.trim() || '',
        city: formData.city,
        country: formData.country,
        promo_image_id: finalImageId,
        promo_text: formData.promo_text,
        photographer: formData.photographer,
        language: preferredLang,
        instagram_link: formattedInstagram,
        other_link: formattedOther,
        agreed_to_terms: true,
        requested_fee: formData.requested_fee || 1000,
        needs_travel_costs: formData.needs_travel_costs || false,
        needs_accommodation: formData.needs_accommodation || false,
        accommodation_notes: formData.accommodation_notes,
        slug: applicationSlug,
      },
      acts: acts.map((act) => ({
        act_title: act.act_title.trim(),
        act_description: act.act_description.trim(),
        video_url: act.video_url || null,
      })),
    }

    const applicantName = formData.performer_name?.trim() || ''
    const applicantEmail = formData.email?.trim() || ''
    const applicantLanguage = preferredLang
    const deadline = event.casting_call_deadline
      ? formatDate(preferredLang, event.casting_call_deadline)
      : ''

    try {
      if (isUnresolvedBlobUrl(payload.application.promo_image_id)) {
        toast.error(
          t(
            'Bilden hann inte laddas upp ordentligt. Försök välja bilden igen.',
            'Image upload incomplete. Please re-select your image.'
          )
        )
        setSubmitting(false)
        return
      }
      await submitCastingApplication(payload)

      setFormData({
        event_id: event.id,
        language: preferredLang,
        agreed_to_terms: false,
        performer_name: '',
        email: '',
        promo_image_id: null,
        requested_fee: 1000,
        needs_travel_costs: false,
        needs_accommodation: false,
        accommodation_notes: '',
      })
      setActs([{ ...EMPTY_ACT }])
      setAgreed(false)

      const emailSuccess = await sendApplicationConfirmationEmail(
        applicantName,
        applicantEmail,
        applicantLanguage,
        'casting',
        deadline
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
    } catch (err: unknown) {
      const dbError = err as PostgrestError

      if (dbError?.code === '23505' || dbError?.message?.includes('unique_artist_per_event')) {
        toast.info(
          t(
            'Du har redan skickat in en ansökan till det här evenemanget! Din ansökan är sparad.',
            'You have already submitted an application to this event! Your application is safe.'
          ),
          { duration: 6000 }
        )
      } else {
        toast.error(t('Någonting gick fel!', 'Something went wrong!'))
        console.error(err)
      }
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

      <CastingInfoAccordion event={event} />

      <div className="gold-divider" />

      <form onSubmit={handleSubmit} className="form-stack">
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
            required
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
              className="w-full flex-1 min-h-[200px] h-full resize-none box-border"
              required
            />
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
        </div>

        <div className="gold-divider" />

        <div className="space-y-4">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <label className="form-label-block !mb-0">
              {t('Din akt / dina akter *', 'Your act(s) *')}
            </label>
            <span className="text-xs text-foreground/60">
              {t(
                'Har du fler än ett nummer att erbjuda? Lägg till fler akter nedan.',
                'Got more than one act to offer? Add more below.'
              )}
            </span>
          </div>

          {acts.map((act, index) => (
            <div
              key={index}
              className="form-field border border-accent/20 rounded-lg p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gold">
                  {t(`Akt ${index + 1}`, `Act ${index + 1}`)}
                </span>
                {acts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAct(index)}
                    className="p-1.5 rounded-md border border-destructive/30 hover:bg-destructive/20 text-destructive transition-colors"
                    title={t('Ta bort akt', 'Remove act')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="form-field">
                <label className="form-label-block">{t('Akt titel *', 'Act Title *')}</label>
                <input
                  type="text"
                  placeholder={t('Titel på din akt', 'Name of your act')}
                  value={act.act_title}
                  onChange={(e) => handleActChange(index, 'act_title', e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label-block">
                  {t('Akt beskrivning (SV) *', 'Act Description (ENG) *')}
                </label>
                <textarea
                  placeholder={t(
                    'Berätta om ditt nummer (på svenska)',
                    'Tell us about your act (in english)'
                  )}
                  rows={4}
                  value={act.act_description}
                  onChange={(e) => handleActChange(index, 'act_description', e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label-block">
                  {t('Video Link (frivilligt)', 'Video Link (optional)')}
                </label>
                <input
                  type="url"
                  placeholder={t('En video länk till din akt', 'A video link to your act')}
                  value={act.video_url || ''}
                  onChange={(e) => handleActChange(index, 'video_url', e.target.value)}
                />
              </div>
            </div>
          ))}

          {acts.length < MAX_ACTS && (
            <button
              type="button"
              onClick={addAct}
              className="btn-gold-outline text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Plus size={14} />
              {t('Lägg till ytterligare akt', 'Add another act')}
            </button>
          )}
        </div>

        <div className="form-row-2-tight">
          <div className="form-field">
            <label className="form-label-block">
              {t('Instagram länk (frivilligt)', 'Instagram Link (optional)')}
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
              {t('Annan länk (frivilligt)', 'Other link (optional)')}
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

        <div className="gold-divider" />

        <div className="flex flex-wrap items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold tracking-wide uppercase text-gold">
            {t('Ekonomi & Logistik:', 'Compensation & Logistics:')}
          </span>
          <span className="text-sm text-foreground/90 italic font-medium">
            {t(
              'Vår standardersättning är 1000kr per akt.',
              'Our standard compensation is 1000kr per act.'
            )}
          </span>
        </div>

        <div className="form-row-2 items-center mt-4">
          <div className="flex flex-col">
            <label className="form-label-block flex items-center gap-1 mb-1.5">
              <DollarSign className="h-3.5 w-3.5 text-gold" />
              {t('Önskat gage per akt (SEK) *', 'Requested fee per act (SEK) *')}
            </label>
            <input
              type="number"
              name="requested_fee"
              min="0"
              value={formData.requested_fee || ''}
              onChange={handleChange}
              className="w-full m-0"
              required
            />
          </div>

          <div className="flex flex-col space-y-2.5 justify-center">
            <div className="form-checkbox-row items-center cursor-pointer">
              <input
                type="checkbox"
                id="needs_travel_costs"
                name="needs_travel_costs"
                checked={formData.needs_travel_costs || false}
                onChange={handleCheckboxChange}
                className="accent-accent"
              />
              <label
                htmlFor="needs_travel_costs"
                className="text-sm font-medium flex items-center gap-1.5 cursor-pointer text-foreground/90 select-none"
              >
                <BusFront className="h-4 w-4 text-gold" />
                {t('Jag är i behov av reseersättning', 'I am in need of travel coverage')}
              </label>
            </div>

            <div className="form-checkbox-row items-center cursor-pointer">
              <input
                type="checkbox"
                id="needs_accommodation"
                name="needs_accommodation"
                checked={formData.needs_accommodation || false}
                onChange={handleCheckboxChange}
                className="accent-accent"
              />
              <label
                htmlFor="needs_accommodation"
                className="text-sm font-medium flex items-center gap-1.5 cursor-pointer text-foreground/90 select-none"
              >
                <Home className="h-4 w-4 text-gold" />
                {t('Jag är i behov av boende i staden', 'I am in need of accommodation')}
              </label>
            </div>
          </div>
        </div>

        {/* Villkorligt anteckningsfält */}
        {(formData.needs_travel_costs || formData.needs_accommodation) && (
          <div className="animate-in fade-in duration-200 form-field mt-3">
            <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl text-center pb-2">
              {t(
                'Resa ersätts, efter överenskommelse. För boende erbjuder vi community-hosting hos lokala medlemmar (ej hotell). När en ansökan har godkänts samarbetar vi för att hitta bästa möjliga lösning.',
                "Travel costs are covered, after an agreement is reached. We offer community hosting with local members (not hotels). Once an application is accepted, we'll work together to find the best possible solution."
              )}
            </p>

            <label className="form-label-block text-xs mb-1 uppercase tracking-wider text-gold">
              {t(
                'Allergier, reseinfo eller logistiknoteringar',
                'Allergies, travel info or logistic notes'
              )}
            </label>
            <textarea
              name="accommodation_notes"
              placeholder={t(
                'Berätta om du t.ex. har pälsdjursallergi, särskilda behov eller andra tankar kring din resa och/eller boende logistik. Har du till exempel bil och kan potentiellt ta med fler artister?',
                'Please let us know if you have pet allergies, specific needs or other thoughts regarding your travel and/or accommodation logistics. Do you for instance have a car and can potentially bring more performers?'
              )}
              rows={3}
              value={formData.accommodation_notes || ''}
              onChange={handleChange}
              className="w-full resize-none"
            />
          </div>
        )}

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
          type="submit"
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
      </form>
    </div>
  )
}
