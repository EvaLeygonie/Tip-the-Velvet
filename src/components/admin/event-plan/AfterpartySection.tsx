import { useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { EventStaffRow } from './EventStaffRow'
import { InlineAddPicker, type InlineAddPickerItem } from './InlineAddPicker'
import type { AdminEventStaffRow } from '@/services/eventService'

interface AfterpartySectionProps {
  djRows: AdminEventStaffRow[]
  eventId: string
  playlist: string | null
  onRemoved: (id: string) => void
  onUpdated: (id: string, patch: Partial<AdminEventStaffRow>) => void
  onSavePlaylist: (value: string) => Promise<void>
  fetchDjCandidates: () => Promise<InlineAddPickerItem[]>
  onAddDj: (item: InlineAddPickerItem) => Promise<void>
}

// Music is covered by either a DJ (a normal 'dj' staff row, still counted in the coverage
// strip above) or a stored playlist — not necessarily both. Pulled out of the regular
// role-grouped list (which only renders a section when it has confirmed rows) into its own
// always-visible section, since the playlist field needs to be reachable even with 0 DJs
// assigned. Direct request, 2026-09-02.
export const AfterpartySection = ({
  djRows,
  eventId,
  playlist,
  onRemoved,
  onUpdated,
  onSavePlaylist,
  fetchDjCandidates,
  onAddDj,
}: AfterpartySectionProps) => {
  const { t } = useLanguage()
  const [draftPlaylist, setDraftPlaylist] = useState(playlist ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSavePlaylist(draftPlaylist)
      toast.success(t('Spellista sparad!', 'Playlist saved!'))
    } catch (err) {
      toast.error(t('Kunde inte spara spellistan.', 'Could not save the playlist.'))
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between border-b border-accent/10 pb-2">
        <h5 className="font-decorative text-base text-foreground/80">
          {t('Efterfest', 'Afterparty')}
        </h5>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
            {djRows.length}
          </span>
          <InlineAddPicker
            fetchItems={fetchDjCandidates}
            onSelect={onAddDj}
            placeholder={t('Sök kontakt...', 'Search contacts...')}
            emptyMessage={t('Inga fler kontakter att lägga till.', 'No more contacts to add.')}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="block uppercase tracking-wider text-[10px] text-accent/50 font-semibold">
          {t('Spellista (länk eller "DJ")', 'Playlist (link or "DJ")')}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draftPlaylist}
            onChange={(e) => setDraftPlaylist(e.target.value)}
            placeholder={t('Länk till spellista...', 'Link to playlist...')}
            className="flex-1 h-10 text-sm bg-black/40 border border-accent/20 rounded px-2 text-foreground focus:border-accent"
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-gold !w-10 h-10 aspect-square p-0 flex items-center justify-center shrink-0"
            title={t('Spara spellista', 'Save playlist')}
          >
            <Save className="h-4 w-4" />
          </button>
        </div>
      </div>

      {djRows.length > 0 ? (
        <div className="space-y-2">
          {djRows.map((row) => (
            <EventStaffRow
              key={row.id}
              row={row}
              eventId={eventId}
              onRemoved={onRemoved}
              onUpdated={onUpdated}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-foreground/40 italic pt-1">
          {t(
            'Ingen DJ tillagd — lägg till via Kontakter om en behövs.',
            'No DJ added — add one via Contacts if one is needed.'
          )}
        </p>
      )}
    </div>
  )
}
