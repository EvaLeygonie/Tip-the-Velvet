import { UserPlus } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { EventSponsorRow } from './EventSponsorRow'
import { InlineAddPicker, type InlineAddPickerItem } from './InlineAddPicker'
import { PRIZE_SLOT_COUNT } from './constants'
import type { AdminEventSponsorRow } from '@/services/eventService'

interface SponsorSlotGridProps {
  sponsorRows: AdminEventSponsorRow[]
  eventId: string
  onRemoved: (sponsorId: string) => void
  onUpdated: (sponsorId: string, details: string | null) => void
  onMerchToggled: (sponsorId: string, value: boolean) => void
  fetchPrizeCandidates: () => Promise<InlineAddPickerItem[]>
  onAddPrizeSponsor: (item: InlineAddPickerItem) => Promise<void>
  fetchSalesCandidates: () => Promise<InlineAddPickerItem[]>
  onAddSalesSponsor: (item: InlineAddPickerItem) => Promise<void>
  onRequestVipForSalesperson: (sponsorName: string) => void
}

// There are typically 4 prize sponsors per event — one per the competition's 4 winning
// categories — shown as a real slot grid rather than buried in a scrolling list with every
// other sponsor type. 4 is just the expected count, not a cap: the "+" picker below adds
// more the same way, per direct feedback (2026-09-02).
//
// "Sales" is a separate concept entirely: not a sponsor_type, but whether this specific
// sponsor is running a merch table *at this event* (event_sponsors.has_merch_table) —
// orthogonal to their role, so a prize sponsor can also show up here without counting as a
// second sponsor slot. Same "one can be in several spots" pattern as the Afterparty
// section's DJ-or-playlist logic.
export const SponsorSlotGrid = ({
  sponsorRows,
  eventId,
  onRemoved,
  onUpdated,
  onMerchToggled,
  fetchPrizeCandidates,
  onAddPrizeSponsor,
  fetchSalesCandidates,
  onAddSalesSponsor,
  onRequestVipForSalesperson,
}: SponsorSlotGridProps) => {
  const { t } = useLanguage()
  const prizeRows = sponsorRows.filter((r) => r.role === 'prize')
  const salesRows = sponsorRows.filter((r) => r.has_merch_table)
  const otherRows = sponsorRows.filter((r) => r.role !== 'prize' && !r.has_merch_table)
  const emptySlots = Math.max(0, PRIZE_SLOT_COUNT - prizeRows.length)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
          <h5 className="font-decorative text-base text-foreground/80">
            {t('Pris-sponsorer', 'Prize sponsors')}
          </h5>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                prizeRows.length >= PRIZE_SLOT_COUNT
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {prizeRows.length}/{PRIZE_SLOT_COUNT}
            </span>
            <InlineAddPicker
              fetchItems={fetchPrizeCandidates}
              onSelect={onAddPrizeSponsor}
              placeholder={t('Sök sponsor...', 'Search sponsors...')}
              emptyMessage={t('Inga fler sponsorer att lägga till.', 'No more sponsors to add.')}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {prizeRows.map((row) => (
            <EventSponsorRow
              key={row.sponsor_id}
              row={row}
              eventId={eventId}
              onRemoved={onRemoved}
              onUpdated={onUpdated}
              onMerchToggled={onMerchToggled}
            />
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="border border-dashed border-accent/15 rounded p-3 flex items-center justify-center text-xs text-foreground/30 italic min-h-[52px]"
            >
              {t('Tom plats', 'Empty slot')}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
          <h5 className="font-decorative text-base text-foreground/80">
            {t('Säljbord', 'Merch table')}
          </h5>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
              {salesRows.length}
            </span>
            <InlineAddPicker
              fetchItems={fetchSalesCandidates}
              onSelect={onAddSalesSponsor}
              placeholder={t('Sök sponsor...', 'Search sponsors...')}
              emptyMessage={t('Inga fler sponsorer att lägga till.', 'No more sponsors to add.')}
            />
          </div>
        </div>
        {salesRows.length === 0 ? (
          <p className="text-xs text-foreground/40 italic">
            {t(
              'Ingen sponsor har ett säljbord bokat för det här eventet.',
              'No sponsor has a merch table booked for this event.'
            )}
          </p>
        ) : (
          <div className="space-y-2">
            {salesRows.map((row) => (
              <div key={row.sponsor_id} className="space-y-1.5">
                <EventSponsorRow
                  row={row}
                  eventId={eventId}
                  onRemoved={onRemoved}
                  onUpdated={onUpdated}
                  onMerchToggled={onMerchToggled}
                />
                <button
                  type="button"
                  onClick={() => onRequestVipForSalesperson(row.sponsor.name)}
                  className="flex items-center gap-1.5 text-[11px] text-accent/70 hover:text-accent transition-colors pl-1"
                >
                  <UserPlus className="h-3 w-3" />
                  {t('Lägg till säljare i VIP-listan', 'Add salesperson to VIP list')}
                </button>
              </div>
            ))}
          </div>
        )}
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
                onMerchToggled={onMerchToggled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
