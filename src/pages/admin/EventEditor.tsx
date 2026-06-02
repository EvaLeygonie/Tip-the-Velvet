import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Eye, Users } from 'lucide-react'
import { toast } from 'sonner'
import useEyeDropper from 'use-eye-dropper'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Event, CreateEventInput } from '@/types/types'
import { createSlug, getImageSrc, utcToLocal, localToUtc } from '@/lib/utils'
import { deleteRow } from '@/services/databaseService'
import { uploadToCloudinary, deleteFromCloudinary } from '@/services/cloudinaryService'

export const EventEditor = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { slug } = useParams()
  const { open, isSupported } = useEyeDropper()

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tempFile, setTempFile] = useState<File | null>(null)
  const [oldImageId, setOldImageId] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    slug: '',
    status: 'draft',
    has_casting_call: false,
    glow_color: '#D4AF37',
  })

  const glowColor = formData.glow_color || '#D4AF37'
  const glowVars: React.CSSProperties & { [key: `--${string}`]: string } = {
    '--glow-color': glowColor,
  }
  const colorBoxVars: React.CSSProperties = {
    backgroundColor: glowColor,
    boxShadow: formData.glow_color ? `0 0 15px ${glowColor}` : 'none',
  }

  useEffect(() => {
    if (slug) {
      const fetchEvent = async () => {
        setLoading(true)
        try {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('slug', slug)
            .single()

          if (error) throw error
          if (data) {
            setFormData({
              ...data,
              event_start: data.event_start ? utcToLocal(data.event_start) : null,
              event_end: data.event_end ? utcToLocal(data.event_end) : null,
            })
            setOldImageId(data.image_id)
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
  }, [slug, t])

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
    if (!file) return
    const previewUrl = URL.createObjectURL(file)

    setTempFile(file)
    setFormData((prev) => ({ ...prev, image_id: previewUrl }))
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async () => {
    if (!formData.title) return toast.error(t('Titel krävs', 'Title is required'))

    setLoading(true)
    const finalSlug = formData.slug || createSlug(formData.title)
    let finalImageId = formData.image_id

    if (tempFile) {
      setUploading(true)

      try {
        if (oldImageId) {
          try {
            await deleteFromCloudinary(oldImageId)
          } catch (err) {
            console.error('Kunde inte radera den gammal bild:', err)
          }
        }

        finalImageId = await uploadToCloudinary(tempFile, 'Promo', [finalSlug], finalSlug)
        setOldImageId(finalImageId)
        setTempFile(null)
      } catch (err) {
        setLoading(false)
        setUploading(false)
        toast.error(t('Kunde inte ladda upp bilden', 'Cloudinary upload failed'))
        console.error(err)
        return
      } finally {
        setUploading(false)
      }
    }

    const payload: CreateEventInput = {
      ...formData,
      title: formData.title || '',
      slug: finalSlug,
      image_id: finalImageId,
      event_start: formData.event_start ? localToUtc(formData.event_start) : null,
      event_end: formData.event_end ? localToUtc(formData.event_end) : null,
    }

    try {
      const { error } = slug
        ? await supabase.from('events').update(payload).eq('slug', slug)
        : await supabase.from('events').insert([payload]).select().single()

      if (error) throw error

      toast.success(slug ? t('Uppdaterat!', 'Updated!') : t('Skapat!', 'Created!'))

      if (!slug) navigate(`/admin/event-editor/${finalSlug}`)
    } catch (err) {
      toast.error(t('Kunde inte spara eventet', 'Failed to save event'))
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      t(
        'Är du säker på att du vill radera detta event?',
        'Are you sure you want to delete this event?'
      )
    )
    if (!confirmed) return
    setLoading(true)

    try {
      if (oldImageId) {
        try {
          await deleteFromCloudinary(oldImageId)
        } catch (cloudinaryErr) {
          console.error('Cloudinary delete failed:', cloudinaryErr)
        }
      }

      await deleteRow('events', formData.id || '')

      toast.success(t('Event raderat!', 'Event deleted!'))
      navigate('/events')
    } catch (err) {
      toast.error(t('Kunde inte radera eventet', 'Failed to delete event'))
      console.error(err)
    }
  }

  const isReadyToUpload = formData.title && formData.title.trim().length > 2

  const liveSlug = formData.slug || createSlug(formData.title || '')

  return (
    <div className="page-standard">
      <div className="editor-container">
        <div className="section-header-triad">
          <div className="header-side-content md:justify-start">
            <Link to={slug ? `/events/event/${slug}` : '/events'}>
              <ArrowLeft className="text-accent hover:scale-105" />
            </Link>
          </div>
          <h1>{slug ? t('Redigera Event', 'Edit Event') : t('Skapa Event', 'Create Event')}</h1>
          <div className="hidden md:block"></div>
        </div>

        <header className="flex flex-col lg:flex-row justify-between items-stretch gap-8 text-left">
          <div className="flex-1 flex flex-col justify-between gap-6">
            {/* TITLE & SUBTITLE */}
            <div className="space-y-2">
              <label className="form-label-gold">{t('Event Titel', 'Event Title')}</label>
              <input
                type="text"
                name="title"
                value={formData.title || ''}
                onChange={handleChange}
                placeholder="Ex: Once Upon a Time..."
                className="input-ghost-title"
              />
              <label className="form-label-gold">{t('Event Undertitel', 'Event Subtitle')}</label>
              <input
                type="text"
                name="subtitle"
                value={formData.subtitle || ''}
                onChange={handleChange}
                placeholder="Ex: A Fairytale Ball..."
                className="input-ghost-subtitle"
              />
            </div>

            {/* REVEAL & CASTING CALL */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch sm:items-center bg-black/50 border border-accent/10 rounded-xl px-4 sm:px-6 py-4 sm:py-5 mt-6 sm:mt-auto">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Eye className="w-5 h-5 text-accent shrink-0" />
                <label className="form-label-gold">{t('Publiceras:', 'Reveal Date:')}</label>
                <input
                  type="date"
                  name="reveal_date"
                  value={formData.reveal_date || ''}
                  onChange={handleChange}
                  className="editor-input bg-black/20 border border-white/5 rounded px-2 py-1 text-sm text-foreground/90 flex-1 focus:border-accent/40 outline-none"
                />
              </div>

              <div className="hidden sm:block w-px h-8 bg-accent/20 self-center" />

              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-accent shrink-0" />
                  <label className="form-label-gold">{t('Casting Call:', 'Casting Call:')}</label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, has_casting_call: !formData.has_casting_call })
                    }
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                      formData.has_casting_call ? 'bg-accent' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        formData.has_casting_call ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                  {formData.has_casting_call && (
                    <>
                      <label className="form-label-gold">Deadline: </label>
                      <input
                        type="date"
                        name="casting_call_deadline"
                        placeholder="Deadline..."
                        value={formData.casting_call_deadline || ''}
                        onChange={handleChange}
                        className="editor-input !border-none !py-0 text-xs flex-1"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PRACTICAL INFO */}
          <div className="admin-control-panel w-full lg:w-80 shrink-0">
            <div className="panel-row">
              <label className="form-label-gold">Status:</label>
              <select
                name="status"
                value={formData.status || 'draft'}
                onChange={handleChange}
                className="admin-select !w-auto !py-1"
              >
                <option value="draft">{t('Utkast', 'Draft')}</option>
                <option value="published">{t('Publicerat', 'Published')}</option>
                <option value="archived">{t('Arkiverat', 'Archived')}</option>
                <option value="cancelled">{t('Avbokat', 'Cancelled')}</option>
              </select>
            </div>

            <div className="panel-row">
              <label className="form-label-gold">URL:</label>
              <div className="flex items-center gap-1 bg-black/40 px-3 py-1 rounded border border-accent/10 flex-1">
                <span className="text-[10px] opacity-40 font-mono">/</span>
                <input
                  name="slug"
                  value={liveSlug}
                  onChange={(e) => setFormData({ ...formData, slug: createSlug(e.target.value) })}
                  placeholder="url-slug"
                  className="input-slug-inline text-right flex-1"
                />
              </div>
            </div>

            {/* TIME & PLACE */}
            <div className="panel-row">
              <label className="form-label-gold">{t('Startar:', 'Starts:')}</label>
              <input
                type="datetime-local"
                name="event_start"
                value={formData.event_start || ''}
                onChange={handleChange}
                className="editor-input !border-none !py-0 !text-right text-xs"
              />
            </div>
            <div className="panel-row">
              <label className="form-label-gold">{t('Slutar:', 'Ends:')}</label>
              <input
                type="datetime-local"
                name="event_end"
                value={formData.event_end || ''}
                onChange={handleChange}
                className="editor-input !border-none !py-0 !text-right text-xs"
              />
            </div>
            <div className="panel-row">
              <label className="form-label-gold">{t('Plats:', 'Location:')}</label>
              <input
                name="location"
                value={formData.location || ''}
                onChange={handleChange}
                placeholder={t('Plats...', 'Location...')}
                className="editor-input !border-none !py-0 !text-right text-xs"
              />
            </div>
          </div>
        </header>

        <div className="gold-divider" />

        {/* PROMO IMAGE */}
        <div className="content-grid">
          <div className="space-y-4">
            <label className="form-label-gold">{t('Promobild:', 'Promo Image:')}</label>
            <div className="promo-upload-square">
              {formData.image_id ? (
                <div className="absolute inset-0 group">
                  <img
                    src={getImageSrc(formData.image_id)}
                    className="promo-image border-2 glow-border"
                    style={glowVars}
                    alt="Preview"
                  />

                  <div className="promo-image-change">
                    <label htmlFor="image-up" className="btn-admin cursor-pointer">
                      {t('Byt bild', 'Change Image')}
                    </label>
                  </div>
                </div>
              ) : (
                <label htmlFor="image-up" className="btn-admin">
                  {uploading ? t('Laddar...', 'Uploading...') : t('Välj Bild', 'Select Image')}
                </label>
              )}
              <input type="file" id="image-up" className="hidden" onChange={handleImageUpload} />
            </div>
            <div className="admin-card-bg p-4 space-y-3">
              <label className="form-label-gold block">
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
                  name="glow_color"
                  value={formData.glow_color || ''}
                  onChange={handleChange}
                  placeholder="#D4AF37"
                  className="editor-input !py-2 font-mono text-xs flex-1"
                />
                <div
                  className="w-10 h-10 rounded-md border border-white/20 shadow-lg"
                  style={colorBoxVars}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 h-full">
            <div className="flex flex-col flex-1 min-h-0">
              <label className="form-label-gold mb-4">
                {t('Beskrivning (SV)', 'Description (SV)')}
              </label>
              <textarea
                name="description_sv"
                value={formData.description_sv || ''}
                onChange={handleChange}
                className="editor-textarea flex-1 min-h-[150px] resize-none"
              />
            </div>
            <div className="flex flex-col flex-1 min-h-0">
              <label className="form-label-gold mb-4">
                {t('Beskrivning (ENG)', 'Description (ENG)')}
              </label>
              <textarea
                name="description_eng"
                value={formData.description_eng || ''}
                onChange={handleChange}
                className="editor-textarea flex-1 min-h-[150px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* MORE DETAILS */}
        <details className="admin-card-bg p-6 group transition-all">
          <summary className="label cursor-pointer flex items-center gap-3 select-none">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            {t('Fler detaljer', 'More details')}
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-6 border-t border-white/5">
            <div className="field-row">
              <label className="form-label-gold">{t('Pris', 'Price')}</label>
              <input
                type="number"
                name="tickets_price"
                className="editor-input"
                value={formData.tickets_price || ''}
                onChange={(e) =>
                  setFormData({ ...formData, tickets_price: Number(e.target.value) })
                }
              />
            </div>

            <div className="field-row">
              <label className="form-label-gold">{t('Biljettlänk', 'Ticket Link')}</label>
              <input
                name="ticket_url"
                className="editor-input"
                value={formData.ticket_url || ''}
                onChange={handleChange}
              />
            </div>

            <div className="field-row">
              <label className="form-label-gold">{t('Pinterest länk', 'Pinterest Link')}</label>
              <input
                name="pinterest_link"
                className="editor-input"
                value={formData.pinterest_link || ''}
                onChange={handleChange}
              />
            </div>
            <div className="field-row">
              <label className="form-label-gold">Facebook Event</label>
              <input
                name="facebook_event"
                className="editor-input"
                value={formData.facebook_event || ''}
                onChange={handleChange}
              />
            </div>

            <div className="field-row">
              <label className="form-label-gold">{t('Fotograf', 'Photographer')}</label>
              <input
                name="photographer"
                className="editor-input"
                value={formData.photographer || ''}
                onChange={handleChange}
              />
            </div>
            <div className="field-row">
              <label className="form-label-gold">{t('Facebook album', 'Facebook Album')}</label>
              <input
                name="fb_album_url"
                className="editor-input"
                value={formData.fb_album_url || ''}
                onChange={handleChange}
              />
            </div>

            <div className="field-row">
              <label className="form-label-gold">{t('Sålda biljetter', 'Tickets Sold')}</label>
              <input
                type="number"
                className="editor-input"
                value={formData.tickets_sold || ''}
                onChange={(e) => setFormData({ ...formData, tickets_sold: Number(e.target.value) })}
              />
            </div>
            <div className="field-row">
              <label className="form-label-gold">
                {t('Tillgängliga biljetter', 'Available Tickets')}
              </label>
              <input
                type="number"
                className="editor-input"
                value={formData.available_tickets || ''}
                onChange={(e) =>
                  setFormData({ ...formData, available_tickets: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </details>

        <div className="editor-actions">
          {formData.id && (
            <button onClick={handleDelete} className="btn-red">
              {t('Radera Event', 'Delete Event')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading || !isReadyToUpload}
            className={!isReadyToUpload ? 'btn-gold opacity-30 cursor-not-allowed' : 'btn-gold'}
          >
            {loading ? t('Sparar...', 'Saving...') : t('Spara Event', 'Save Event')}
          </button>
        </div>
      </div>
    </div>
  )
}
