import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Loader2,
  Image as ImageIcon,
  Download,
  CalendarPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import CloudinaryImage from '@/components/CloudinaryImage'
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload'
import { deleteFromCloudinary } from '@/services/cloudinaryService'
import { confirmSponsorForEvent, removeSponsorFromEvent } from '@/services/contactsService'
import { createSlug, processUploadedImage } from '@/lib/utils'
import { ImageCategory } from '@/types/media'
import { AddToEventPopover, type PopoverAction } from './AddToEventPopover'
import type { Sponsors, SponsorType } from '@/types/types'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

interface SponsorRowProps {
  row: Sponsors
  isNew?: boolean
  sponsorTypeOptions: { value: SponsorType; label: string }[]
  onSave: (id: string, patch: Partial<Sponsors>, isNew: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onEmail: (row: Sponsors) => void
  onCancelNew?: (id: string) => void
  // Whether this sponsor is confirmed for whichever event Contacts is currently showing
  // status for (see AdminContacts.tsx) — sponsors have no "interested" stage, just this.
  isConfirmedForEvent?: boolean
  onConfirmed?: () => void
}

export const SponsorRow = ({
  row,
  isNew = false,
  sponsorTypeOptions,
  onSave,
  onDelete,
  onEmail,
  onCancelNew,
  isConfirmedForEvent,
  onConfirmed,
}: SponsorRowProps) => {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [showEventPopover, setShowEventPopover] = useState(false)
  const [draft, setDraft] = useState({
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    sponsor_type: row.sponsor_type ?? '',
    sponsor_details: row.sponsor_details ?? '',
  })
  const [tempLogoFile, setTempLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const { uploading, upload } = useCloudinaryUpload()

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const readyFile = await processUploadedImage(file)
    setTempLogoFile(readyFile)
    setLogoPreviewUrl(URL.createObjectURL(readyFile))
  }

  const handleDownloadLogo = () => {
    if (!row.logo_id) return
    window.open(`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/fl_attachment/${row.logo_id}`, '_blank')
  }

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error(t('Namn krävs.', 'Name is required.'))
      return
    }
    setIsSaving(true)
    try {
      let logoId = row.logo_id
      if (tempLogoFile) {
        if (row.logo_id) {
          try {
            await deleteFromCloudinary(row.logo_id)
          } catch (err) {
            console.error('Kunde inte radera den gamla logotypen:', err)
          }
        }
        const nameSlug = createSlug(draft.name.trim())
        const uploadedId = await upload(
          tempLogoFile,
          'Sponsors',
          [ImageCategory.SPONSOR, nameSlug],
          `logo-${nameSlug}`,
          { name: draft.name.trim(), category: ImageCategory.SPONSOR },
          { genericErrorMessage: t('Kunde inte ladda upp logotypen', 'Failed to upload logo') }
        )
        if (uploadedId === null) {
          setIsSaving(false)
          return
        }
        logoId = uploadedId
      }

      await onSave(
        row.id,
        {
          name: draft.name.trim(),
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          sponsor_type: (draft.sponsor_type || null) as Sponsors['sponsor_type'],
          sponsor_details: draft.sponsor_details.trim() || null,
          logo_id: logoId,
        },
        isNew
      )
      setTempLogoFile(null)
      setLogoPreviewUrl(null)
      if (!isNew) setIsExpanded(false)
    } catch (err: unknown) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      t(`Är du säker på att du vill radera ${row.name}?`, `Are you sure you want to delete ${row.name}?`)
    )
    if (!confirmed) return
    try {
      await onDelete(row.id)
    } catch (err: unknown) {
      const dbError = err as { code?: string }
      if (dbError?.code === '23503') {
        toast.error(
          t(
            'Kan inte radera — sponsorn är kopplad till ett event.',
            "Can't delete — this sponsor is still linked to an event."
          )
        )
      } else {
        toast.error(t('Kunde inte radera.', 'Could not delete.'))
      }
    }
  }

  const logoInputId = `logo-upload-${row.id}`
  const rowStatusClass = isConfirmedForEvent ? 'border-emerald-500/70 bg-emerald-950/20' : ''

  // Sponsors have no "interested" stage — just confirmed or not, so only ever one action.
  const buildPopoverActions = (): PopoverAction[] =>
    isConfirmedForEvent
      ? [
          {
            label: t('Ta bort från event', 'Remove from event'),
            variant: 'negative',
            successMessage: t('Borttagen från eventet.', 'Removed from the event.'),
            onClick: (eventId) => removeSponsorFromEvent(eventId, row.id),
          },
        ]
      : [
          {
            label: t('Bekräfta', 'Confirm'),
            variant: 'positive',
            successMessage: t('Bekräftad för eventet!', 'Confirmed for the event!'),
            onClick: (eventId) =>
              confirmSponsorForEvent(eventId, row.id, row.sponsor_type, row.sponsor_details),
          },
        ]

  return (
    <div
      className={`admin-panel velvet-surface transition-all duration-300 overflow-hidden cursor-pointer ${rowStatusClass}`}
      style={{ padding: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div className="grid grid-cols-12 gap-4 items-center flex-1 min-w-0">
          <div className="col-span-12 sm:col-span-4 flex items-center gap-3 min-w-0">
            <div className="text-accent/50 shrink-0">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
            <div className="w-12 h-12 rounded-md overflow-hidden border border-accent/20 shrink-0 bg-black/40">
              {row.logo_id ? (
                <CloudinaryImage
                  publicId={row.logo_id}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-accent/30 text-xs font-mono">
                  N/A
                </div>
              )}
            </div>
            <div className="truncate">
              <div className="font-decorative text-base text-foreground tracking-wide truncate flex items-center gap-1.5">
                <span className="truncate">{row.name || t('(Namnlös)', '(Unnamed)')}</span>
                {isConfirmedForEvent && (
                  <span className="shrink-0 not-italic font-body font-semibold text-[10px] text-green-400">
                    {t('Bekräftad', 'Confirmed')}
                  </span>
                )}
              </div>
              {row.sponsor_type && (
                <div className="text-accent italic text-xs font-heading truncate">
                  {sponsorTypeOptions.find((o) => o.value === row.sponsor_type)?.label}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-6 sm:col-span-4 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('E-post', 'Email')}
            </span>
            <span className="truncate block">{row.email || '—'}</span>
          </div>

          <div className="col-span-6 sm:col-span-4 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Telefon', 'Phone')}
            </span>
            <span className="truncate block">{row.phone || '—'}</span>
          </div>
        </div>

        <div
          className="flex items-center gap-2 shrink-0 self-end sm:self-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => row.email && onEmail(row)}
            disabled={!row.email}
            className={`p-2 border rounded-md transition-colors shrink-0 ${
              row.email
                ? 'bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-black'
                : 'opacity-0 pointer-events-none'
            }`}
            title={row.email ? t('Skicka mail', 'Send email') : undefined}
          >
            <Mail className="h-4 w-4" />
          </button>
          {!isNew && (
            <>
              <button
                onClick={() => setShowEventPopover(true)}
                className="p-2 border rounded-md transition-colors shrink-0 bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-black"
                title={t('Lägg till i event', 'Add to event')}
              >
                <CalendarPlus className="h-4 w-4" />
              </button>
              {showEventPopover && (
                <AddToEventPopover
                  onClose={() => setShowEventPopover(false)}
                  actions={buildPopoverActions()}
                  onChanged={onConfirmed}
                />
              )}
            </>
          )}
        </div>
      </div>

      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-6 space-y-4 text-left cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="shrink-0 w-[108px]">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label-gold">{t('Logga', 'Logo')}</label>
                {row.logo_id && !logoPreviewUrl && (
                  <button
                    type="button"
                    onClick={handleDownloadLogo}
                    className="text-accent/70 hover:text-accent transition-colors"
                    title={t('Ladda ner logotyp', 'Download logo')}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="relative w-full h-[108px] rounded border border-accent/20 bg-background/20 flex items-center justify-center overflow-hidden group">
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} className="w-full h-full object-contain" alt="Preview" />
                ) : row.logo_id ? (
                  <CloudinaryImage publicId={row.logo_id} width={108} height={108} fit />
                ) : (
                  <ImageIcon className="h-5 w-5 text-gold/40" />
                )}
                <label
                  htmlFor={logoInputId}
                  className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] text-center px-1"
                >
                  {uploading
                    ? t('Laddar...', 'Uploading...')
                    : row.logo_id || logoPreviewUrl
                      ? t('Byt logotyp', 'Change logo')
                      : t('Ladda upp', 'Upload')}
                </label>
                <input
                  type="file"
                  id={logoInputId}
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              <div className="space-y-1">
                <label className="form-label-gold block">{t('Namn', 'Name')}</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label-gold block">{t('Typ', 'Type')}</label>
                <select
                  value={draft.sponsor_type}
                  onChange={(e) => setDraft({ ...draft, sponsor_type: e.target.value })}
                  className="w-full h-9 flex items-center text-sm bg-black/40 border border-accent/20 rounded py-2 pl-2 pr-8 focus:border-accent text-white"
                >
                  <option value="">{t('Ej angivet', 'Not specified')}</option>
                  {sponsorTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="form-label-gold block">{t('E-post', 'Email')}</label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label-gold block">{t('Telefon', 'Phone')}</label>
                <input
                  type="text"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="form-label-gold block">{t('Detaljer', 'Details')}</label>
            <textarea
              value={draft.sponsor_details}
              onChange={(e) => setDraft({ ...draft, sponsor_details: e.target.value })}
              className="w-full h-20 text-sm bg-black/40 border border-accent/20 font-sans p-2 leading-relaxed rounded resize-none focus:border-accent text-white"
            />
          </div>

          <span className="text-xs text-foreground/40 flex items-center gap-1.5">
            {row.agreed_to_terms
              ? `✓ ${t('Samtycke godkänt', 'Consent given')}`
              : `— ${t('Inget samtycke registrerat', 'No consent on record')}`}
          </span>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-accent/10">
            {!isNew ? (
              <button type="button" onClick={handleDelete} className="btn-red text-xs py-2 px-4">
                {t('Radera', 'Delete')}
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {isNew && onCancelNew && (
                <button
                  type="button"
                  onClick={() => onCancelNew(row.id)}
                  className="px-4 py-2 text-xs border border-accent/20 rounded text-foreground/70 hover:bg-white/5 transition-colors"
                >
                  {t('Avbryt', 'Cancel')}
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t('Spara', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
