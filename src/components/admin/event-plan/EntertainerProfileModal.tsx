import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import CloudinaryImage from '@/components/CloudinaryImage'
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload'
import { createSlug, formatInstagramLink, formatOtherLink, processUploadedImage } from '@/lib/utils'
import { ImageCategory } from '@/types/media'
import {
  getEntertainerAssignment,
  getPreviousEntertainerProfile,
  getStaffLink,
  updateEntertainerProfile,
  type EntertainerProfilePatch,
} from '@/services/entertainerService'
import type { EventStaffVolunteer } from '@/types/types'

interface EntertainerProfileModalProps {
  eventId: string
  staffId: string
  // The person's real name from the contact roster — only a starting point for the public
  // stage name below.
  staffName: string
  onClose: () => void
  onSaved?: (patch: EntertainerProfilePatch) => void
}

const inputClass =
  'w-full h-9 text-sm bg-black/40 border border-accent/20 rounded px-2 focus:border-accent text-white'
const textareaClass =
  'w-full min-h-[84px] text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-y focus:border-accent text-white'

// The public profile for one pre-show entertainer at one event — stage name, title, a short
// description (both languages), a photo and up to two links. Opened right after someone is
// assigned the Entertainment role, and again from "Public profile" on their Event Plan row.
// Everything here is skippable ("fill in later"): the person can be confirmed before there's
// a photo. A returning entertainer's most recent profile prefills the form.
export const EntertainerProfileModal = ({
  eventId,
  staffId,
  staffName,
  onClose,
  onSaved,
}: EntertainerProfileModalProps) => {
  const { t } = useLanguage()
  const { uploading, upload } = useCloudinaryUpload()
  const [assignment, setAssignment] = useState<EventStaffVolunteer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [prefilledFromPrevious, setPrefilledFromPrevious] = useState(false)
  const [tempFile, setTempFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    display_name: staffName,
    title_sv: '',
    title_eng: '',
    bio_sv: '',
    bio_eng: '',
    image_id: '',
    instagram_link: '',
    other_link: '',
    photo_credit: '',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const row = await getEntertainerAssignment(eventId, staffId)
        setAssignment(row)
        const hasOwnProfile = Boolean(row?.display_name || row?.bio_sv || row?.image_id)
        const source: EntertainerProfilePatch | null = hasOwnProfile
          ? (row as EventStaffVolunteer)
          : await getPreviousEntertainerProfile(staffId, eventId)
        // Fall back to the contact roster's link when no Instagram is set on the profile yet.
        const staffLink = source?.instagram_link ? null : await getStaffLink(staffId)
        const rosterInstagram = staffLink && /instagram\.com|^@/i.test(staffLink) ? staffLink : ''
        if (source) {
          setPrefilledFromPrevious(!hasOwnProfile)
          setDraft({
            display_name: source.display_name || staffName,
            title_sv: source.title_sv ?? '',
            title_eng: source.title_eng ?? '',
            bio_sv: source.bio_sv ?? '',
            bio_eng: source.bio_eng ?? '',
            image_id: source.image_id ?? '',
            instagram_link: source.instagram_link || rosterInstagram,
            other_link: source.other_link ?? '',
            photo_credit: source.photo_credit ?? '',
          })
        } else if (rosterInstagram) {
          setDraft((prev) => ({ ...prev, instagram_link: rosterInstagram }))
        }
      } catch (err) {
        console.error('Kunde inte hämta profilen:', err)
        toast.error(t('Kunde inte hämta profilen.', 'Could not load the profile.'))
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, staffId])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const readyFile = await processUploadedImage(file)
    setTempFile(readyFile)
    setPreviewUrl(URL.createObjectURL(readyFile))
  }

  const handleSave = async () => {
    if (!assignment) return
    if (!draft.display_name.trim()) {
      toast.error(t('Visningsnamn krävs.', 'A display name is required.'))
      return
    }
    setIsSaving(true)
    try {
      let imageId = draft.image_id || null
      if (tempFile) {
        const slug = createSlug(draft.display_name.trim())
        const uploaded = await upload(
          tempFile,
          'Pre-show',
          [ImageCategory.PRE_SHOW, slug],
          `preshow-${slug}-${crypto.randomUUID().slice(0, 6)}`,
          {
            name: draft.display_name.trim(),
            category: ImageCategory.PRE_SHOW,
            // Same key the gallery uploads use, so the credit travels with the file.
            ...(draft.photo_credit.trim() && { photographer: draft.photo_credit.trim() }),
          },
          { genericErrorMessage: t('Kunde inte ladda upp bilden', 'Failed to upload the image') }
        )
        if (uploaded === null) {
          setIsSaving(false)
          return
        }
        imageId = uploaded
      }

      const patch: EntertainerProfilePatch = {
        display_name: draft.display_name.trim(),
        title_sv: draft.title_sv.trim() || null,
        title_eng: draft.title_eng.trim() || null,
        bio_sv: draft.bio_sv.trim() || null,
        bio_eng: draft.bio_eng.trim() || null,
        image_id: imageId,
        instagram_link: draft.instagram_link.trim()
          ? formatInstagramLink(draft.instagram_link.trim())
          : null,
        other_link: draft.other_link.trim() ? formatOtherLink(draft.other_link.trim()) : null,
        photo_credit: draft.photo_credit.trim() || null,
      }
      await updateEntertainerProfile(assignment.id, patch)
      toast.success(t('Profil sparad!', 'Profile saved!'))
      onSaved?.(patch)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    } finally {
      setIsSaving(false)
    }
  }

  const imageSrcId = draft.image_id

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left"
      // Stops the click reaching a parent row's own onClick through the React tree.
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="velvet-surface border border-accent/30 max-w-2xl w-full p-6 space-y-4 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#141111' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h4 className="font-decorative text-lg text-accent text-center">
            {t(
              'Offentlig profil — förshowunderhållning',
              'Public profile — pre-show entertainment'
            )}
          </h4>
          <p className="text-xs text-muted-foreground text-center">{staffName}</p>
          <p className="text-[11px] text-foreground/50 text-center mt-1">
            {t(
              'Visas under "Välkomnade av" på eventsidan när personen avslöjats. Allt går att fylla i senare.',
              'Shown under "Welcomed by" on the event page once revealed. You can fill everything in later.'
            )}
          </p>
          {prefilledFromPrevious && (
            <p className="text-[11px] text-accent/70 text-center mt-1">
              {t('Förifyllt från förra eventet.', 'Prefilled from their last event.')}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : !assignment ? (
          <p className="text-sm text-foreground/60 text-center py-6">
            {t(
              'Personen är inte tilldelad Underhållning för det här eventet.',
              'This person is not assigned Entertainment for this event.'
            )}
          </p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-stretch">
              <div className="shrink-0 w-[90px] flex flex-col">
                <label className="form-label-gold block mb-1">{t('Bild', 'Photo')}</label>
                <div className="relative w-full h-[120px] sm:h-auto sm:flex-1 rounded-lg border border-accent/20 bg-background/20 flex items-center justify-center overflow-hidden group">
                  {previewUrl ? (
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                  ) : imageSrcId ? (
                    <CloudinaryImage
                      publicId={imageSrcId}
                      width={180}
                      height={240}
                      gravityFace
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-gold/40" />
                  )}
                  <label
                    htmlFor="entertainer-image-input"
                    className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] text-center px-1"
                  >
                    {uploading
                      ? t('Laddar...', 'Uploading...')
                      : imageSrcId || previewUrl
                        ? t('Byt bild', 'Change photo')
                        : t('Ladda upp', 'Upload')}
                  </label>
                  <input
                    type="file"
                    id="entertainer-image-input"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={uploading}
                  />
                </div>
              </div>

              <div className="flex-1 w-full space-y-1">
                <label className="form-label-gold block">
                  {t('Visningsnamn (artistnamn)', 'Display name (stage name)')}
                </label>
                <input
                  type="text"
                  value={draft.display_name}
                  onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                  className={inputClass}
                />
                <label className="form-label-gold block pt-2">
                  {t('Fotograf', 'Photographer')}
                </label>
                <input
                  type="text"
                  value={draft.photo_credit}
                  onChange={(e) => setDraft({ ...draft, photo_credit: e.target.value })}
                  placeholder={t(
                    'Visas när man hovrar över bilden',
                    'Shown when hovering the photo'
                  )}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="form-label-gold block">
                  {t('Titel (svenska)', 'Title (Swedish)')}
                </label>
                <input
                  type="text"
                  value={draft.title_sv}
                  onChange={(e) => setDraft({ ...draft, title_sv: e.target.value })}
                  placeholder="T.ex. Eldkonstnär"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="form-label-gold block">
                  {t('Titel (engelska)', 'Title (English)')}
                </label>
                <input
                  type="text"
                  value={draft.title_eng}
                  onChange={(e) => setDraft({ ...draft, title_eng: e.target.value })}
                  placeholder="E.g. Fire artist"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="form-label-gold block">
                  {t('Beskrivning (svenska)', 'Description (Swedish)')}
                </label>
                <textarea
                  value={draft.bio_sv}
                  onChange={(e) => setDraft({ ...draft, bio_sv: e.target.value })}
                  className={textareaClass}
                />
              </div>
              <div className="space-y-1">
                <label className="form-label-gold block">
                  {t('Beskrivning (engelska)', 'Description (English)')}
                </label>
                <textarea
                  value={draft.bio_eng}
                  onChange={(e) => setDraft({ ...draft, bio_eng: e.target.value })}
                  className={textareaClass}
                />
              </div>
              <div className="space-y-1">
                <label className="form-label-gold block">Instagram</label>
                <input
                  type="text"
                  value={draft.instagram_link}
                  onChange={(e) => setDraft({ ...draft, instagram_link: e.target.value })}
                  placeholder="@handle"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="form-label-gold block">{t('Annan länk', 'Other link')}</label>
                <input
                  type="text"
                  value={draft.other_link}
                  onChange={(e) => setDraft({ ...draft, other_link: e.target.value })}
                  placeholder={t('Webbplats m.m.', 'Website etc.')}
                  className={inputClass}
                />
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-accent/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
          >
            {assignment ? t('Fyll i senare', 'Fill in later') : t('Stäng', 'Close')}
          </button>
          {assignment && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || uploading}
              className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
            >
              {(isSaving || uploading) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('Spara', 'Save')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
