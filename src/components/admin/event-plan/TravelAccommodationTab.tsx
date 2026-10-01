import { useState } from 'react'
import { Link } from 'react-router-dom'
import JSZip from 'jszip'
import { Car, Hotel, Receipt, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import type { AdminEventPerformerRow } from '@/services/eventService'
import type { ReceiptItem } from '@/components/applications/BookedArtistForm'

interface TravelAccommodationTabProps {
  eventTitle: string
  performers: AdminEventPerformerRow[]
  onTravelNotesChanged: (performerId: string, notes: string) => void
  onAccommodationChanged: (performerId: string, accommodation: string) => void
  onAccommodationDetailsChanged: (performerId: string, details: string) => void
}

const getReceipts = (row: AdminEventPerformerRow): ReceiptItem[] =>
  Array.isArray(row.travel_receipts) ? (row.travel_receipts as unknown as ReceiptItem[]) : []

// The same page ArtistBookingPortal/BookedArtistForm shows the artist themselves — opening
// it from here gives the board every logistics detail (acts, dietary, plus-one, etc.) in one
// click instead of this tab re-displaying all of it. null when there's no matching
// application (e.g. a performer added by hand).
const bookingLink = (row: AdminEventPerformerRow): string | null =>
  row.castingApplicationId && row.castingApplicationToken
    ? `/casting/confirm/${row.castingApplicationId}?token=${row.castingApplicationToken}`
    : null

const PerformerNameLink = ({ row }: { row: AdminEventPerformerRow }) => {
  const link = bookingLink(row)
  return link ? (
    <Link
      to={link}
      target="_blank"
      rel="noopener noreferrer"
      className="block flex-1 min-w-[100px] truncate text-accent hover:underline"
    >
      {row.performer.performer_name}
    </Link>
  ) : (
    <span className="block flex-1 min-w-[100px] truncate">{row.performer.performer_name}</span>
  )
}

// Two independent lists (who needs travel covered, who needs accommodation) rather than one
// combined roster — an artist can need either, both, or neither, and the fields that matter
// for each are different enough (a price + receipts vs. a placement note) that a shared row
// shape would mostly be empty cells. Both "needs X" flags and the pre-confirmation
// preliminary travel estimate come from the original casting application (needsTravelCosts/
// preliminaryTravelCost/needsAccommodation/artistAccommodationNotes on
// AdminEventPerformerRow); the board-editable fields (travel_covered, notes, accommodation,
// travel_receipts) already live directly on event_performers. Direct feedback 2026-09-22.
export const TravelAccommodationTab = ({
  eventTitle,
  performers,
  onTravelNotesChanged,
  onAccommodationChanged,
  onAccommodationDetailsChanged,
}: TravelAccommodationTabProps) => {
  const { t } = useLanguage()
  const [isZippingReceipts, setIsZippingReceipts] = useState(false)

  const travelRows = performers.filter((p) => p.needsTravelCosts)
  const accommodationRows = performers.filter((p) => p.needsAccommodation)

  // One zip across every artist's uploaded receipts, same reasoning as EventAssetPanel's
  // "download all performer images"/"download all sponsor logos" — a plain link/window.open
  // per file gets blocked or silently dropped past the first one. Filenames are prefixed
  // with the artist's name to avoid collisions and stay identifiable once unzipped.
  const handleDownloadAllReceipts = async () => {
    const files = travelRows.flatMap((row) =>
      getReceipts(row).map((receipt) => ({ performerName: row.performer.performer_name, receipt }))
    )
    if (files.length === 0) {
      toast.error(t('Inga kvitton att ladda ner.', 'No receipts to download.'))
      return
    }
    setIsZippingReceipts(true)
    try {
      const zip = new JSZip()
      await Promise.all(
        files.map(async ({ performerName, receipt }) => {
          const response = await fetch(receipt.url)
          const blob = await response.blob()
          zip.file(`${performerName} - ${receipt.name}`, blob)
        })
      )
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const blobUrl = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${eventTitle || 'event'}-reskvitton.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte ladda ner kvittona.', 'Could not download the receipts.'))
    } finally {
      setIsZippingReceipts(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
          <h3 className="font-decorative text-base text-foreground/80 flex items-center gap-2">
            <Car className="h-4 w-4 text-accent/60 shrink-0" />
            {t('Resa', 'Travel')}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
              {travelRows.length}
            </span>
            <button
              type="button"
              onClick={handleDownloadAllReceipts}
              disabled={isZippingReceipts}
              title={t('Ladda ner alla kvitton', 'Download all receipts')}
              className="p-1.5 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {isZippingReceipts ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        {travelRows.length === 0 ? (
          <p className="text-xs text-foreground/40 italic">
            {t(
              'Ingen artist behöver reseersättning för det här eventet.',
              'No artist needs travel costs covered for this event.'
            )}
          </p>
        ) : (
          <div className="space-y-2">
            {travelRows.map((row) => {
              // null means the artist hasn't saved their booking form's travel field yet
              // (it always writes a real number, 0 included, from the first save onward) —
              // fall back to the board's pre-confirmation estimate until then.
              const isFinal = row.travel_covered !== null
              const price = isFinal ? row.travel_covered : row.preliminaryTravelCost
              const receipts = getReceipts(row)
              return (
                <div key={row.performer_id} className="admin-panel velvet-surface p-3 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                    <PerformerNameLink row={row} />
                    {/* Fixed min-width + centered so the price badge's own width doesn't
                        swing the notes input next to it around depending on how many digits
                        the fee happens to have (e.g. "0 kr" vs "1500 kr") — direct feedback
                        2026-09-22. */}
                    <span
                      title={
                        isFinal
                          ? undefined
                          : t(
                              'Preliminärt pris — artisten har inte sparat sin bokningsblankett än',
                              "Preliminary price — the artist hasn't saved their booking form yet"
                            )
                      }
                      className={`shrink-0 min-w-[60px] text-center text-xs font-mono px-2 py-0.5 rounded-full border ${
                        isFinal
                          ? 'text-foreground/80 border-accent/20 bg-black/20'
                          : 'text-amber-400 border-amber-500/30 bg-amber-500/10 italic'
                      }`}
                    >
                      {price !== null ? `${price} kr` : '—'}
                    </span>
                    <input
                      type="text"
                      defaultValue={row.notes ?? ''}
                      onBlur={(e) => onTravelNotesChanged(row.performer_id, e.target.value)}
                      placeholder={t('Anteckningar om resan...', 'Notes about the travel...')}
                      className="min-w-[140px] flex-1 h-7 text-xs bg-black/40 border border-accent/20 rounded px-2 focus:border-accent text-white"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      {row.travels_by_car ? (
                        // Traveling by car means a lump sum paid out with the fee instead of
                        // a receipt — shouldn't ever read as "missing a receipt". Kept as a
                        // bare icon (no pill/border/text) so it takes exactly the same width
                        // as the plain Receipt icon below and doesn't push the notes input
                        // around depending on which state a given row is in — a padded "Bil"
                        // badge was doing exactly that. Direct feedback 2026-09-22, the
                        // Florence/Morau carpooling case.
                        <span
                          title={t(
                            'Reser med bil — inget kvitto behövs',
                            'Traveling by car — no receipt needed'
                          )}
                        >
                          <Car className="h-4 w-4 text-amber-400" />
                        </span>
                      ) : receipts.length > 0 ? (
                        receipts.map((receipt) => (
                          <a
                            key={receipt.id}
                            href={receipt.url}
                            download={receipt.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={t(`Ladda ner: ${receipt.name}`, `Download: ${receipt.name}`)}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            <Receipt className="h-4 w-4" />
                          </a>
                        ))
                      ) : (
                        <span title={t('Inget kvitto uppladdat än', 'No receipt uploaded yet')}>
                          <Receipt className="h-4 w-4 text-foreground/20" />
                        </span>
                      )}
                    </div>
                  </div>
                  {row.artist_note && (
                    <p className="text-xs text-foreground/50 italic">
                      {t('Artisten skrev: ', 'Artist noted: ')}
                      {row.artist_note}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
          <h3 className="font-decorative text-base text-foreground/80 flex items-center gap-2">
            <Hotel className="h-4 w-4 text-accent/60 shrink-0" />
            {t('Boende', 'Accommodation')}
          </h3>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
            {accommodationRows.length}
          </span>
        </div>
        {accommodationRows.length === 0 ? (
          <p className="text-xs text-foreground/40 italic">
            {t(
              'Ingen artist behöver boende för det här eventet.',
              'No artist needs accommodation for this event.'
            )}
          </p>
        ) : (
          <div className="space-y-2">
            {accommodationRows.map((row) => (
              <div key={row.performer_id} className="admin-panel velvet-surface p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <PerformerNameLink row={row} />
                  {row.plus_one_name && row.plus_one_needs_accommodation && (
                    <span className="text-xs text-amber-400 shrink-0">+1: {row.plus_one_name}</span>
                  )}
                </div>
                {row.artistAccommodationNotes && (
                  <p className="text-xs text-foreground/50 italic">
                    {t('Artisten skrev: ', 'Artist noted: ')}
                    {row.artistAccommodationNotes}
                  </p>
                )}
                {row.artist_note && (
                  <p className="text-xs text-foreground/50 italic">
                    {t('Artisten skrev: ', 'Artist noted: ')}
                    {row.artist_note}
                  </p>
                )}
                <input
                  type="text"
                  defaultValue={row.accommodation ?? ''}
                  onBlur={(e) => onAccommodationChanged(row.performer_id, e.target.value)}
                  placeholder={t('Var placerar vi dem?', 'Where will we put them?')}
                  className="w-full h-7 text-xs bg-black/40 border border-accent/20 rounded px-2 focus:border-accent text-white"
                />
                {/* Separate from "where" — logistics like dates matter too, e.g. Luminous
                    Starling and her +1 needing the room Friday–Sunday instead of just the
                    one night. Direct feedback 2026-09-22. */}
                <input
                  type="text"
                  defaultValue={row.accommodation_details ?? ''}
                  onBlur={(e) => onAccommodationDetailsChanged(row.performer_id, e.target.value)}
                  placeholder={t(
                    'Anteckningar om boendet, t.ex. datum (Fredag-söndag)...',
                    'Notes about the stay, e.g. dates (Friday-Sunday)...'
                  )}
                  className="w-full h-7 text-xs bg-black/40 border border-accent/20 rounded px-2 focus:border-accent text-white"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
