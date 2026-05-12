import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import useEyeDropper from 'use-eye-dropper'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Event, CreateEventInput, EventStatus } from '@/types'
import { createSlug, getImageSrc, utcToLocal, localToUtc } from '@/lib/utils'

export const EventEditor = () => {
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  const { t } = useLanguage()
  const navigate = useNavigate()
  const { eventSlug } = useParams()
  const { open, isSupported } = useEyeDropper()

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tempFile, setTempFile] = useState<File | null>(null)

  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    subtitle: null,
    slug: '',
    event_start: null,
    event_end: null,
    reveal_date: null,
    location: null,
    status: 'draft',
    description_sv: null,
    description_eng: null,
    image_id: null,
    has_casting_call: false,
    dresscode_link: null,
    ticket_url: null,
    tickets_price: null,
    tickets_sold: null,
    photographer: null,
    fb_album_url: null,
    photobooth_url: null,
    glow_color: '#D4AF37',
  })

  useEffect(() => {
    if (eventSlug) {
      const fetchEvent = async () => {
        setLoading(true)
        try {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('slug', eventSlug)
            .single()

          if (error) throw error
          if (data) {
            setFormData({
              ...data,
              event_start: data.event_start ? utcToLocal(data.event_start) : null,
              event_end: data.event_end ? utcToLocal(data.event_end) : null,
              reveal_date: data.reveal_date ? utcToLocal(data.reveal_date) : null,
            })
          }
        } catch (err) {
          toast.error(t('Kunde inte ladda eventet', 'Failed to load event'))
          console.log(err)
        } finally {
          setLoading(false)
        }
      }
      fetchEvent()
    }
  }, [eventSlug, t])

  const handlePickColor = useCallback(() => {
    const openPicker = async () => {
      try {
        const color = await open()
        setFormData((prev) => ({ ...prev, glow_color: color.sRGBHex }))
      } catch (e) {
        console.log(e)
      }
    }
    openPicker()
  }, [open])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !CLOUD_NAME || !UPLOAD_PRESET) return
    const previewUrl = URL.createObjectURL(file)

    setTempFile(file)
    setFormData((prev) => ({ ...prev, image_id: previewUrl }))
  }

  const handleSave = async () => {
    if (!formData.title) return toast.error(t('Titel krävs', 'Title is required'))

    setLoading(true)
    const finalSlug = formData.slug || createSlug(formData.title)
    let finalImageId = formData.image_id

    if (tempFile) {
      setUploading(true)
      const uploadData = new FormData()
      uploadData.append('file', tempFile)
      uploadData.append('upload_preset', UPLOAD_PRESET)
      uploadData.append('folder', 'Promo')
      uploadData.append('public_id', finalSlug)

      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: uploadData,
        })

        if (!res.ok) throw new Error('Upload failed')

        const data = await res.json()
        finalImageId = data.public_id
        setTempFile(null)
      } catch (err) {
        setLoading(false)
        setUploading(false)
        toast.error(t('Kunde inte ladda upp bilden', 'Cloudinary upload failed'))
        console.log(err)
      } finally {
        setUploading(false)
      }
    }

    const payload: CreateEventInput = {
      title: formData.title,
      subtitle: formData.subtitle || null,
      slug: finalSlug,
      event_start: formData.event_start ? localToUtc(formData.event_start) : null,
      event_end: formData.event_end ? localToUtc(formData.event_end) : null,
      reveal_date: formData.reveal_date ? localToUtc(formData.reveal_date) : null,
      location: formData.location || null,
      status: formData.status || 'draft',
      description_sv: formData.description_sv || null,
      description_eng: formData.description_eng || null,
      image_id: finalImageId || null,
      has_casting_call: formData.has_casting_call || false,
      dresscode_link: formData.dresscode_link || null,
      ticket_url: formData.ticket_url || null,
      tickets_price: formData.tickets_price || null,
      tickets_sold: formData.tickets_sold || null,
      photographer: formData.photographer || null,
      fb_album_url: formData.fb_album_url || null,
      photobooth_url: formData.photobooth_url || null,
      glow_color: formData.glow_color,
    }

    try {
      const { error } = eventSlug
        ? await supabase.from('events').update(payload).eq('slug', eventSlug)
        : await supabase.from('events').insert([payload]).select().single()

      if (error) throw error

      toast.success(eventSlug ? t('Uppdaterat!', 'Updated!') : t('Skapat!', 'Created!'))

      if (!eventSlug) navigate(`/admin/event-editor/${finalSlug}`)
    } catch (err) {
      toast.error(t('Kunde inte spara eventet', 'Failed to save event'))
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  const isReadyToUpload = formData.title && formData.title.trim().length > 2

  const liveSlug = formData.slug || createSlug(formData.title || '')

  return (
    <div className="page-standard">
      <div className="editor-container">
        <div className="section-header-triad">
          <div className="header-side-content md:justify-start">
            <Link to="/events">
              <ArrowLeft className="text-accent hover:scale-105 " />
            </Link>
          </div>
          <h1>
            {eventSlug
              ? t('Redigera Event', 'Edit Event')
              : t('Skapa Nytt Event', 'Create New Event')}
          </h1>
          <div className="hidden md:block"></div>
        </div>

        {/* TITEL */}
        <header className="flex flex-col lg:flex-row justify-between items-start gap-12 text-left">
          <div className="flex-1 space-y-2">
            <label className="label text-[10px] uppercase tracking-widest">
              {t('Event Titel', 'Event Title')}
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Once Upon a Time..."
              className="input-ghost-title"
            />
            <label className="label text-[10px] uppercase tracking-widest">
              {t('Event Undertitel', 'Event Subtitle')}
            </label>
            <input
              type="text"
              value={formData.subtitle || ''}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="Ex: A Fairytale Ball..."
              className="input-ghost-subtitle"
            />
          </div>

          {/* PRACTICAL DETAILS */}
          <div className="admin-control-panel w-full lg:w-80 shrink-0">
            <div className="panel-row">
              <label className="label text-[10px] uppercase">Status:</label>
              <select
                className="admin-select !w-auto !py-1"
                value={formData.status || 'draft'}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as EventStatus })
                }
              >
                <option value="draft">{t('Utkast', 'Draft')}</option>
                <option value="published">{t('Publicerat', 'Published')}</option>
                <option value="archived">{t('Arkiverat', 'Archived')}</option>
                <option value="cancelled">{t('Avbokat', 'Cancelled')}</option>
              </select>
            </div>

            <div className="panel-row">
              <label className="label text-[10px] uppercase">URL:</label>
              <div className="flex items-center gap-1 bg-black/40 px-3 py-1 rounded border border-accent/10 flex-1">
                <span className="text-[10px] opacity-40 font-mono">/</span>
                <input
                  className="input-slug-inline text-right flex-1"
                  value={liveSlug}
                  onChange={(e) => setFormData({ ...formData, slug: createSlug(e.target.value) })}
                  placeholder="url-slug"
                />
              </div>
            </div>

            <div className="panel-row">
              <label className="label text-[10px] uppercase">{t('Startar:', 'Starts:')}</label>
              <input
                type="datetime-local"
                className="editor-input !border-none !py-0 !text-right text-xs"
                value={formData.event_start || ''}
                onChange={(e) => setFormData({ ...formData, event_start: e.target.value })}
              />
            </div>
            <div className="panel-row">
              <label className="label text-[10px] uppercase">{t('Slutar:', 'Ends:')}</label>
              <input
                type="datetime-local"
                className="editor-input !border-none !py-0 !text-right text-xs"
                value={formData.event_end || ''}
                onChange={(e) => setFormData({ ...formData, event_end: e.target.value })}
              />
            </div>

            <div className="panel-row">
              <label className="label text-[10px] uppercase">{t('Plats:', 'Location:')}</label>
              <input
                className="editor-input !border-none !py-0 !text-right text-xs"
                placeholder={t('Plats...', 'Location...')}
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>
        </header>

        <div className="gold-divider" />

        {/* PROMO IMAGE */}
        <div className="content-grid">
          <div className="space-y-4">
            <label className="label text-[10px] uppercase block">
              {t('Promobild:', 'Promo Image:')}
            </label>
            <div className={`promo-upload-square ${!isReadyToUpload ? 'is-locked' : 'is-active'}`}>
              {formData.image_id && CLOUD_NAME ? (
                <div className="text-center p-4">
                  <img
                    src={getImageSrc(formData.image_id, CLOUD_NAME)}
                    className="w-full h-full object-cover relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-[1.01] max-h-[60vh] md:max-h-[70vh]"
                    style={{
                      boxShadow: `0 0 10px 1px ${formData.glow_color}, 0 0 25px 5px rgba(0, 0, 0, 0.5)`,
                      borderColor: formData.glow_color,
                      outlineColor: `${formData.glow_color}50`,
                    }}
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
            <div className="admin-card-bg p-4 space-y-3">
              <label className="label text-[10px] uppercase tracking-widest block">
                {t('Glow Färg (Hex)', 'Glow Color (Hex)')}
              </label>

              <div className="flex items-center gap-3">
                {isSupported() ? (
                  <button
                    type="button"
                    onClick={handlePickColor}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-all group"
                    title={t('Hämta färg från bild', 'Pick color from image')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent group-hover:scale-110 transition-transform"
                    >
                      <path d="m2 22 1-1h3l9-9" />
                      <path d="M3 21v-3l9-9" />
                      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l-3-3Z" />
                    </svg>
                  </button>
                ) : (
                  <span className="text-[11px]">
                    {t(
                      'EyeDropper API stöds inte av denna webbläsare',
                      'EyeDropper API not supported in this browser'
                    )}
                  </span>
                )}
                <input
                  type="text"
                  placeholder="#D4AF37"
                  className="editor-input !py-2 font-mono text-xs flex-1"
                  value={formData.glow_color || ''}
                  onChange={(e) => setFormData({ ...formData, glow_color: e.target.value })}
                />
                <div
                  className="w-10 h-10 rounded-md border border-white/20 shadow-lg"
                  style={{
                    backgroundColor: formData.glow_color,
                    boxShadow: formData.glow_color ? `0 0 15px ${formData.glow_color}` : 'none',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 h-full">
            <div className="flex flex-col flex-1 min-h-0">
              <label className="label text-[10px] uppercase tracking-widest mb-4">
                {t('Beskrivning (SV)', 'Description (SV)')}
              </label>
              <textarea
                className="editor-textarea flex-1 min-h-[150px] resize-none"
                value={formData.description_sv || ''}
                onChange={(e) => setFormData({ ...formData, description_sv: e.target.value })}
              />
            </div>
            <div className="flex flex-col flex-1 min-h-0">
              <label className="label text-[10px] uppercase tracking-widest mb-4">
                {t('Beskrivning (ENG)', 'Description (ENG)')}
              </label>
              <textarea
                className="editor-textarea flex-1 min-h-[150px] resize-none"
                value={formData.description_eng || ''}
                onChange={(e) => setFormData({ ...formData, description_eng: e.target.value })}
              />
            </div>
          </div>
        </div>

        <details className="admin-card-bg p-6 group transition-all">
          <summary className="label cursor-pointer flex items-center gap-3 select-none">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            {t('Fler detaljer', 'More details')}
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-6 border-t border-white/5">
            <div className="field-row">
              <label className="label text-[10px] uppercase">{t('Pris', 'Price')}</label>
              <input
                type="number"
                className="editor-input"
                value={formData.tickets_price || ''}
                onChange={(e) =>
                  setFormData({ ...formData, tickets_price: Number(e.target.value) })
                }
              />
            </div>

            <div className="field-row">
              <label className="label text-[10px] uppercase">{t('Fotograf', 'Photographer')}</label>
              <input
                className="editor-input"
                value={formData.photographer || ''}
                onChange={(e) => setFormData({ ...formData, photographer: e.target.value })}
              />
            </div>
          </div>
        </details>

        <div className="flex justify-end mt-12 pb-12">
          <button
            onClick={handleSave}
            disabled={loading || !isReadyToUpload}
            className={`px-10 py-4 rounded-full font-bold transition-all uppercase tracking-widest text-sm shadow-xl
              ${!isReadyToUpload ? 'btn-save-disabled' : 'btn-save-active'}`}
          >
            {loading ? t('Sparar...', 'Saving...') : t('Spara Event', 'Save Event')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EventEditor
