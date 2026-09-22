import type { ReactNode } from 'react'
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
  onUpdated: (sponsorId: string, patch: Partial<AdminEventSponsorRow>) => void
  onMerchToggled: (sponsorId: string, value: boolean) => void
  onExhibitionToggled: (sponsorId: string, value: boolean) => void
  fetchPrizeCandidates: () => Promise<InlineAddPickerItem[]>
  onAddPrizeSponsor: (item: InlineAddPickerItem) => Promise<void>
  fetchSalesCandidates: () => Promise<InlineAddPickerItem[]>
  onAddSalesSponsor: (item: InlineAddPickerItem) => Promise<void>
  fetchExhibitionCandidates: () => Promise<InlineAddPickerItem[]>
  onAddExhibitionSponsor: (item: InlineAddPickerItem) => Promise<void>
  fetchOtherCandidates: () => Promise<InlineAddPickerItem[]>
  onAddOtherSponsor: (item: InlineAddPickerItem) => Promise<void>
  onRequestVipForSalesperson: (sponsorName: string) => void
  onRequestVipForExhibitor: (sponsorName: string) => void
}

// There are typically 4 prize sponsors per event — one per the competition's 4 winning
// categories — shown as a real slot grid rather than buried in a scrolling list with every
// other sponsor type. 4 is just the expected count, not a cap: the "+" picker (or an empty
// slot itself, both open the same picker) adds more the same way, per direct feedback
// (2026-09-02).
//
// "Sales" and "Exhibition" are both independent flags, not a sponsor_type — orthogonal to
// role, so a prize sponsor can also run a table or hang art without counting as a second
// sponsor slot. Same "one can be in several spots" pattern as the Afterparty section's
// DJ-or-playlist logic. Exhibition added 2026-09-22 (a sponsor showing/hanging their own
// work, e.g. art on the walls — not the same as selling from a table) — sits next to Sales,
// above Övriga, same "+"/VIP-list pattern as Sales. "Övriga sponsorer" is every other
// confirmed sponsor (not prize, not sales, not exhibition) — a real, always-visible column
// with its own "+" (previously only rendered when non-empty, which made it look like a
// mysterious leftover bucket a sponsor could vanish into after unchecking their sales
// table — direct feedback 2026-09-22).
export const SponsorSlotGrid = ({
  sponsorRows,
  eventId,
  onRemoved,
  onUpdated,
  onMerchToggled,
  onExhibitionToggled,
  fetchPrizeCandidates,
  onAddPrizeSponsor,
  fetchSalesCandidates,
  onAddSalesSponsor,
  fetchExhibitionCandidates,
  onAddExhibitionSponsor,
  fetchOtherCandidates,
  onAddOtherSponsor,
  onRequestVipForSalesperson,
  onRequestVipForExhibitor,
}: SponsorSlotGridProps) => {
  const { t } = useLanguage()
  const prizeRows = sponsorRows.filter((r) => r.role === 'prize')
  const salesRows = sponsorRows.filter((r) => r.has_merch_table)
  const exhibitionRows = sponsorRows.filter((r) => r.has_exhibition)
  const otherRows = sponsorRows.filter(
    (r) => r.role !== 'prize' && !r.has_merch_table && !r.has_exhibition
  )
  const emptySlots = Math.max(0, PRIZE_SLOT_COUNT - prizeRows.length)

  // Shared by the header "+" and every empty placeholder below it — same picker, several
  // triggers, direct feedback 2026-09-22 that an empty slot should be clickable on its own
  // rather than only reachable via the header.
  const renderPrizePicker = (trigger?: (onOpen: () => void) => ReactNode) => (
    <InlineAddPicker
      fetchItems={fetchPrizeCandidates}
      onSelect={onAddPrizeSponsor}
      placeholder={t('Sök sponsor...', 'Search sponsors...')}
      emptyMessage={t('Inga fler sponsorer att lägga till.', 'No more sponsors to add.')}
      renderTrigger={trigger}
    />
  )

  // Shared shape for Säljbord and Utställning — a count badge, a "+" picker, and each row
  // getting its own "add to VIP list" nudge underneath. Pulled into one function once there
  // were two of these instead of duplicating the whole block.
  const renderVendorSection = (
    title: string,
    rows: AdminEventSponsorRow[],
    fetchCandidates: () => Promise<InlineAddPickerItem[]>,
    onAddSponsor: (item: InlineAddPickerItem) => Promise<void>,
    emptyMessage: string,
    onRequestVip: (sponsorName: string) => void,
    vipButtonLabel: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b border-accent/10 pb-2">
        <h5 className="font-decorative text-base text-foreground/80">{title}</h5>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
            {rows.length}
          </span>
          <InlineAddPicker
            fetchItems={fetchCandidates}
            onSelect={onAddSponsor}
            placeholder={t('Sök sponsor...', 'Search sponsors...')}
            emptyMessage={t('Inga fler sponsorer att lägga till.', 'No more sponsors to add.')}
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-foreground/40 italic">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.sponsor_id} className="space-y-1.5">
              <EventSponsorRow
                row={row}
                eventId={eventId}
                onRemoved={onRemoved}
                onUpdated={onUpdated}
                onMerchToggled={onMerchToggled}
                onExhibitionToggled={onExhibitionToggled}
              />
              <button
                type="button"
                onClick={() => onRequestVip(row.sponsor.name)}
                className="flex items-center gap-1.5 text-[11px] text-accent/70 hover:text-accent transition-colors pl-1"
              >
                <UserPlus className="h-3 w-3" />
                {vipButtonLabel}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

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
            {renderPrizePicker()}
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
              onExhibitionToggled={onExhibitionToggled}
            />
          ))}
          {Array.from({ length: emptySlots }).map((_, i) =>
            renderPrizePicker((onOpen) => (
              <button
                key={`empty-${i}`}
                type="button"
                onClick={onOpen}
                className="w-full border border-dashed border-accent/15 rounded p-3 flex items-center justify-center text-xs text-foreground/30 italic min-h-[52px] hover:border-accent/40 hover:text-accent/60 transition-colors"
              >
                {t('Tom plats — lägg till sponsor', 'Empty slot — add sponsor')}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {renderVendorSection(
          t('Säljbord', 'Merch table'),
          salesRows,
          fetchSalesCandidates,
          onAddSalesSponsor,
          t(
            'Ingen sponsor har ett säljbord bokat för det här eventet.',
            'No sponsor has a merch table booked for this event.'
          ),
          onRequestVipForSalesperson,
          t('Lägg till säljare i VIP-listan', 'Add salesperson to VIP list')
        )}
        {renderVendorSection(
          t('Utställning', 'Exhibition'),
          exhibitionRows,
          fetchExhibitionCandidates,
          onAddExhibitionSponsor,
          t(
            'Ingen sponsor ställer ut för det här eventet.',
            'No sponsor is exhibiting at this event.'
          ),
          onRequestVipForExhibitor,
          t('Lägg till utställare i VIP-listan', 'Add exhibitor to VIP list')
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
          <h5 className="font-decorative text-base text-foreground/80">
            {t('Övriga sponsorer', 'Other sponsors')}
          </h5>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
              {otherRows.length}
            </span>
            <InlineAddPicker
              fetchItems={fetchOtherCandidates}
              onSelect={onAddOtherSponsor}
              placeholder={t('Sök sponsor...', 'Search sponsors...')}
              emptyMessage={t('Inga fler sponsorer att lägga till.', 'No more sponsors to add.')}
            />
          </div>
        </div>
        {otherRows.length === 0 ? (
          <p className="text-xs text-foreground/40 italic">
            {t('Inga övriga sponsorer för det här eventet.', 'No other sponsors for this event.')}
          </p>
        ) : (
          <div className="space-y-2">
            {otherRows.map((row) => (
              <EventSponsorRow
                key={row.sponsor_id}
                row={row}
                eventId={eventId}
                onRemoved={onRemoved}
                onUpdated={onUpdated}
                onMerchToggled={onMerchToggled}
                onExhibitionToggled={onExhibitionToggled}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
