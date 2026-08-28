import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Venue } from '@/types/types'

interface VenueRowProps {
  row: Venue
  isNew?: boolean
  onSave: (id: string, patch: Partial<Venue>, isNew: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onEmail: (row: Venue) => void
  onCancelNew?: (id: string) => void
  // True when this venue is the one booked (events.venue_id) for whichever event Contacts
  // is currently showing status for — see AdminContacts.tsx.
  isBookedForEvent?: boolean
}

export const VenueRow = ({
  row,
  isNew = false,
  onSave,
  onDelete,
  onEmail,
  onCancelNew,
  isBookedForEvent,
}: VenueRowProps) => {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState({
    name: row.name,
    location: row.location,
    map_link: row.map_link,
    contact_person: row.contact_person ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    price: row.price != null ? String(row.price) : '',
  })

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.location.trim() || !draft.map_link.trim()) {
      toast.error(t('Namn, plats och kartlänk krävs.', 'Name, location, and map link are required.'))
      return
    }
    setIsSaving(true)
    try {
      await onSave(
        row.id,
        {
          name: draft.name.trim(),
          location: draft.location.trim(),
          map_link: draft.map_link.trim(),
          contact_person: draft.contact_person.trim() || null,
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          price: draft.price === '' ? null : Number(draft.price),
        },
        isNew
      )
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
            'Kan inte radera — platsen är kopplad till ett event.',
            "Can't delete — this venue is still linked to an event."
          )
        )
      } else {
        toast.error(t('Kunde inte radera.', 'Could not delete.'))
      }
    }
  }

  return (
    <div
      className="admin-panel velvet-surface transition-all duration-300 overflow-hidden cursor-pointer"
      style={{ padding: 0 }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div className="grid grid-cols-12 gap-4 items-center flex-1 min-w-0">
          <div className="col-span-12 sm:col-span-4 flex items-center gap-3 min-w-0">
            <div className="text-accent/50 shrink-0">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
            <div className="truncate">
              <div className="font-decorative text-base text-foreground tracking-wide truncate flex items-center gap-1.5">
                <span className="truncate">{row.name || t('(Namnlös)', '(Unnamed)')}</span>
                {isBookedForEvent && (
                  <span className="shrink-0 not-italic font-body font-semibold text-[10px] text-green-400">
                    {t('Bokad', 'Booked')}
                  </span>
                )}
              </div>
              <div className="text-accent italic text-xs font-heading truncate">{row.location}</div>
            </div>
          </div>

          <div className="col-span-6 sm:col-span-3 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Kontaktperson', 'Contact person')}
            </span>
            <span className="truncate block">{row.contact_person || '—'}</span>
          </div>

          <div className="col-span-6 sm:col-span-3 text-sm text-foreground/60 font-body truncate">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('E-post', 'Email')}
            </span>
            <span className="truncate block">{row.email || '—'}</span>
          </div>

          <div className="col-span-6 sm:col-span-2 text-sm text-foreground/60 font-body">
            <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold mb-0.5">
              {t('Pris', 'Price')}
            </span>
            <span className="block">{row.price != null ? `${row.price} SEK` : '—'}</span>
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
        </div>
      </div>

      {isExpanded && (
        <div
          className="border-t border-accent/10 bg-black/20 p-6 space-y-4 text-left cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className="form-label-gold block">{t('Plats', 'Location')}</label>
              <input
                type="text"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
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
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Kontaktperson', 'Contact person')}</label>
              <input
                type="text"
                value={draft.contact_person}
                onChange={(e) => setDraft({ ...draft, contact_person: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Pris (SEK)', 'Price (SEK)')}</label>
              <input
                type="number"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="form-label-gold block">{t('Kartlänk', 'Map link')}</label>
              <input
                type="text"
                value={draft.map_link}
                onChange={(e) => setDraft({ ...draft, map_link: e.target.value })}
                className="w-full h-9 text-sm bg-black/40 border border-accent/20 rounded p-2 focus:border-accent text-white"
              />
            </div>
          </div>

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
