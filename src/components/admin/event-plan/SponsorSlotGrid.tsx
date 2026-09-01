import { useLanguage } from '@/contexts/LanguageContext'
import { EventSponsorRow } from './EventSponsorRow'
import { PRIZE_SLOT_COUNT } from './constants'
import type { AdminEventSponsorRow } from '@/services/eventService'

interface SponsorSlotGridProps {
  sponsorRows: AdminEventSponsorRow[]
  eventId: string
  onRemoved: (sponsorId: string) => void
  onUpdated: (sponsorId: string, details: string | null) => void
}

// There are always exactly 4 prize sponsors per event — one per the competition's 4
// winning categories — so that's shown as a real 4-slot grid rather than buried in a
// scrolling list with every other sponsor type. Adding a sponsor to an event still happens
// on Contacts (SponsorRow's own confirm flow); this is read/edit-details/remove only, same
// as the other Event Planning row components.
export const SponsorSlotGrid = ({ sponsorRows, eventId, onRemoved, onUpdated }: SponsorSlotGridProps) => {
  const { t } = useLanguage()
  const prizeRows = sponsorRows.filter((r) => r.role === 'prize')
  const otherRows = sponsorRows.filter((r) => r.role !== 'prize')
  const emptySlots = Math.max(0, PRIZE_SLOT_COUNT - prizeRows.length)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
          <h5 className="font-decorative text-base text-foreground/80">
            {t('Pris-sponsorer', 'Prize sponsors')}
          </h5>
          <span
            className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
              prizeRows.length >= PRIZE_SLOT_COUNT
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            {prizeRows.length}/{PRIZE_SLOT_COUNT}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {prizeRows.map((row) => (
            <EventSponsorRow
              key={row.sponsor_id}
              row={row}
              eventId={eventId}
              onRemoved={onRemoved}
              onUpdated={onUpdated}
            />
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="border border-dashed border-accent/15 rounded p-3 flex items-center justify-center text-xs text-foreground/30 italic min-h-[52px]"
            >
              {t('Tom plats — lägg till via Kontakter', 'Empty slot — add via Contacts')}
            </div>
          ))}
        </div>
      </div>

      {otherRows.length > 0 && (
        <div className="space-y-2">
          <h5 className="font-decorative text-base text-foreground/80 border-b border-accent/10 pb-2">
            {t('Övriga sponsorer', 'Other sponsors')}
          </h5>
          <div className="space-y-2">
            {otherRows.map((row) => (
              <EventSponsorRow
                key={row.sponsor_id}
                row={row}
                eventId={eventId}
                onRemoved={onRemoved}
                onUpdated={onUpdated}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
