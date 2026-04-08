import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { createSlug } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import type { Event, CreateEventInput, EventStatus } from '@/types'

const getErrorMessage = (err: unknown): string => {
  if (typeof err === 'string') return err

  if (err instanceof Error) return err.message

  return 'Ett oväntat fel uppstod'
}

export const EventEditor = () => {
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  const { t } = useLanguage()
  const { eventSlug } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    subtitle: null,
    slug: '',
    event_start: null,
    event_end: null,
    location: null,
    reveal_date: null,
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
          if (data) setFormData(data)
        } catch (err) {
          toast.error(t('Kunde inte ladda eventet', 'Failed to load event'))
          console.error(getErrorMessage(err))
        } finally {
          setLoading(false)
        }
      }
      fetchEvent()
    }
  }, [eventSlug, t])

  const [tempFile, setTempFile] = useState<File | null>(null)

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
      uploadData.append('public_id', `Promo/${finalSlug}`)

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
        console.error(getErrorMessage(err))
      } finally {
        setUploading(false)
      }
    }

    const payload: CreateEventInput = {
      title: formData.title,
      subtitle: formData.subtitle || null,
      slug: finalSlug,
      event_start: formData.event_start ? new Date(formData.event_start).toISOString() : null,
      event_end: formData.event_end ? new Date(formData.event_end).toISOString() : null,
      reveal_date: formData.reveal_date ? new Date(formData.reveal_date).toISOString() : null,
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
    }

    try {
      const { error } = eventSlug
        ? await supabase.from('events').update(payload).eq('slug', eventSlug)
        : await supabase.from('events').insert([payload]).select().single()

      if (error) throw error

      toast.success(eventSlug ? t('Uppdaterat!', 'Updated!') : t('Skapat!', 'Created!'))

      if (!eventSlug) navigate(`/admin/event-editor/${finalSlug}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const isReadyToUpload = formData.title && formData.title.trim().length > 2

  const liveSlug = formData.slug || createSlug(formData.title || '')

  return (
    <div className="editor-container section-stack">
      <header className="page-header items-start gap-12">
        <div className="flex-1 space-y-2">
          <label className="label text-[10px] uppercase tracking-widest opacity-50">
            {t('Event Titel', 'Event Title')}
          </label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Once Upon a Time..."
            className="input-ghost-title"
          />
          <input
            type="text"
            value={formData.subtitle || ''}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            placeholder="Ex: A Fairytale Ball..."
            className="input-ghost-subtitle"
          />
        </div>

        <div className="admin-control-panel">
          <div className="panel-row">
            <label className="label text-[10px] uppercase tracking-tighter">Status:</label>
            <select
              className="admin-select !w-auto !py-1"
              value={formData.status || 'draft'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as EventStatus })}
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
              placeholder="Plats..."
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
        </div>
      </header>

      <div className="gold-divider" />

      <div className="content-grid">
        <div className="space-y-4">
          <label className="label text-[10px] uppercase opacity-50 block">
            {t('Promobild:', 'Promo Image:')}
          </label>
          <div className={`promo-upload-square ${!isReadyToUpload ? 'is-locked' : 'is-active'}`}>
            {formData.image_id ? (
              <div className="text-center p-4">
                <img
                  src={
                    formData.image_id.includes('http')
                      ? formData.image_id
                      : `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/Promo/${formData.image_id}`
                  }
                  className="w-full h-full object-cover"
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
          <p className="text-[10px] italic opacity-40 max-w-[280px]">
            {t(
              'Denna bild används som huvudposter. Du kan byta ut den mot ett foto efter eventet.',
              'This image is used as the main poster. You can replace it with a photo after the event.'
            )}
          </p>
        </div>

        {/* BESKRIVNINGAR*/}
        <div className="space-y-8">
          <div className="field-row">
            <label className="label text-[10px] uppercase opacity-50 tracking-widest">
              {t('Beskrivning (SV)', 'Description (SV)')}
            </label>
            <textarea
              className="editor-textarea h-40"
              value={formData.description_sv || ''}
              onChange={(e) => setFormData({ ...formData, description_sv: e.target.value })}
            />
          </div>
          <div className="field-row">
            <label className="label text-[10px] uppercase opacity-50 tracking-widest">
              {t('Beskrivning (ENG)', 'Description (ENG)')}
            </label>
            <textarea
              className="editor-textarea h-40"
              value={formData.description_eng || ''}
              onChange={(e) => setFormData({ ...formData, description_eng: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* AVANCERAT */}
      <details className="admin-card-bg p-4 group">
        <summary className="label cursor-pointer flex items-center gap-2 select-none">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          {t('Fler detaljer', 'More details')}
        </summary>
        <div className="details-content content-grid mt-6 pt-4 border-t border-accent/5">
          <div className="field-row">
            <label className="label text-[10px] uppercase">{t('Pris', 'Price')}</label>
            <input
              type="number"
              className="editor-input"
              value={formData.tickets_price || ''}
              onChange={(e) => setFormData({ ...formData, tickets_price: Number(e.target.value) })}
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

      <button
        onClick={handleSave}
        disabled={loading || !isReadyToUpload}
        className={`btn-save-fixed ${!isReadyToUpload ? 'btn-save-disabled' : 'btn-save-active'}`}
      >
        {loading ? t('Sparar...', 'Saving...') : t('Spara Event', 'Save Event')}
      </button>
    </div>
  )
}

export default EventEditor
