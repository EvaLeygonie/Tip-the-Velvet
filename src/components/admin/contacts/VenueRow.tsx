import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { LanguageMarker, LanguageToggle } from './LanguageToggle'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Venue } from '@/types/types'
import { useContactRow } from '@/hooks/useContactRow'
import { ContactRowFooter } from './ContactRowFooter'

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
  const [draft, setDraft] = useState({
    name: row.name,
    location: row.location,
    map_link: row.map_link,
    contact_person: row.contact_person ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    price: row.price != null ? String(row.price) : '',
    practical_info_sv: row.practical_info_sv ?? '',
    practical_info_eng: row.practical_info_eng ?? '',
    door_code: row.door_code ?? '',
    nearest_stop: row.nearest_stop ?? '',
    has_hosted: row.has_hosted ?? false,
    language: row.language,
  })

  const { isExpanded, toggle, isSaving, rootRef, save, remove } = useContactRow({
    id: row.id,
    name: row.name,
    isNew,
    onSave,
    onDelete,
    linkedDeleteMessage: {
      sv: 'Kan inte radera — platsen är kopplad till ett event.',
      eng: "Can't delete — this venue is still linked to an event.",
    },
  })

  const handleSave = () =>
    save(() => {
      if (!draft.name.trim() || !draft.location.trim() || !draft.map_link.trim()) {
        toast.error(
          t('Namn, plats och kartlänk krävs.', 'Name, location, and map link are required.')
        )
        return null
      }
      return {
        name: draft.name.trim(),
        location: draft.location.trim(),
        map_link: draft.map_link.trim(),
        contact_person: draft.contact_person.trim() || null,
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        price: draft.price === '' ? null : Number(draft.price),
        practical_info_sv: draft.practical_info_sv.trim() || null,
        practical_info_eng: draft.practical_info_eng.trim() || null,
        door_code: draft.door_code.trim() || null,
        nearest_stop: draft.nearest_stop.trim() || null,
        has_hosted: draft.has_hosted,
        language: draft.language,
      }
    })

  return (
    <div
      ref={rootRef}
      className="admin-panel velvet-surface transition-all duration-300 overflow-hidden cursor-pointer"
      style={{ padding: 0 }}
      onClick={toggle}
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

          <div className="col-span-6 sm:col-span-2 text-sm text-foreground/60 font-body truncate">
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

          <div className="col-span-6 sm:col-span-1 text-sm">
            {row.has_hosted && (
              <span
                title={t('Vi har haft fest här', "We've held a party here")}
                className="text-green-400"
              >
                ✓
              </span>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-2 shrink-0 self-end sm:self-center"
          onClick={(e) => e.stopPropagation()}
        >
          <LanguageMarker language={row.language} />
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
                className="velvet-input"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Plats', 'Location')}</label>
              <input
                type="text"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                className="velvet-input"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">
                {t('Närmaste hållplats (visas för alla)', 'Nearest stop (shown to everyone)')}
              </label>
              <input
                type="text"
                value={draft.nearest_stop}
                placeholder={t('T.ex. Järntorget', 'e.g. Järntorget')}
                onChange={(e) => setDraft({ ...draft, nearest_stop: e.target.value })}
                className="velvet-input"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Kartlänk', 'Map link')}</label>
              <input
                type="text"
                value={draft.map_link}
                onChange={(e) => setDraft({ ...draft, map_link: e.target.value })}
                className="velvet-input"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('E-post', 'Email')}</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="velvet-input"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">{t('Telefon', 'Phone')}</label>
              <input
                type="text"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className="velvet-input"
              />
            </div>
            <div className="space-y-1">
              <label className="form-label-gold block">
                {t('Kontaktperson', 'Contact person')}
              </label>
              <input
                type="text"
                value={draft.contact_person}
                onChange={(e) => setDraft({ ...draft, contact_person: e.target.value })}
                className="velvet-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="form-label-gold block">{t('Pris (SEK)', 'Price (SEK)')}</label>
                <input
                  type="number"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                  className="velvet-input"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label-gold block">{t('Portkod', 'Entry code')}</label>
                <input
                  type="text"
                  value={draft.door_code}
                  onChange={(e) => setDraft({ ...draft, door_code: e.target.value })}
                  className="velvet-input"
                />
              </div>
            </div>
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="form-label-gold block">
                  {t('Info till artisterna (svenska)', 'Info for the artists (Swedish)')}
                </label>
                <textarea
                  rows={6}
                  value={draft.practical_info_sv}
                  placeholder={t(
                    'Scenmått, loading, sminkspeglar, mat i närheten…',
                    'Stage size, load-in, mirrors, food nearby…'
                  )}
                  onChange={(e) => setDraft({ ...draft, practical_info_sv: e.target.value })}
                  className="velvet-field"
                />
              </div>
              <div className="space-y-1">
                <label className="form-label-gold block">
                  {t('Info till artisterna (engelska)', 'Info for the artists (English)')}
                </label>
                <textarea
                  rows={6}
                  value={draft.practical_info_eng}
                  placeholder={t(
                    'Scenmått, loading, sminkspeglar, mat i närheten…',
                    'Stage size, load-in, mirrors, food nearby…'
                  )}
                  onChange={(e) => setDraft({ ...draft, practical_info_eng: e.target.value })}
                  className="velvet-field"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.has_hosted}
                onChange={(e) => setDraft({ ...draft, has_hosted: e.target.checked })}
                className="h-4 w-4 accent-accent"
              />
              {t('Vi har haft fest här', "We've held a party here")}
            </label>
            <LanguageToggle
              value={draft.language}
              onChange={(language) => setDraft({ ...draft, language })}
            />
          </div>

          <ContactRowFooter
            isNew={isNew}
            isSaving={isSaving}
            onSave={handleSave}
            onDelete={remove}
            onCancelNew={onCancelNew ? () => onCancelNew(row.id) : undefined}
          />
        </div>
      )}
    </div>
  )
}
