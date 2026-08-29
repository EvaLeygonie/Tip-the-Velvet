import { useState, useEffect, Fragment } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { EventPicker } from '@/components/admin/EventPicker'
import {
  getEventPerformersForAdmin,
  getEventMarketingData,
  type AdminEventPerformerRow,
  type EventMarketingData,
} from '@/services/eventService'
import {
  getMarketingPostStatuses,
  setMarketingPostStatus,
  getCustomPosts,
  type FixedMarketingPostType,
  type CustomMarketingPost,
} from '@/services/marketingService'
import { POST_SCHEDULE, computeSuggestedDate } from '@/lib/marketingSchedule'
import { EventAssetPanel } from '@/components/admin/marketing/EventAssetPanel'
import { ArtistOverviewCard } from '@/components/admin/marketing/ArtistOverviewCard'
import { SaveTheDateCard } from '@/components/admin/marketing/SaveTheDateCard'
import { FacebookEventCard } from '@/components/admin/marketing/FacebookEventCard'
import { CastingCallOpenCard } from '@/components/admin/marketing/CastingCallOpenCard'
import { CastingCallClosedCard } from '@/components/admin/marketing/CastingCallClosedCard'
import { TicketCountdownCard } from '@/components/admin/marketing/TicketCountdownCard'
import { TicketReleaseCard } from '@/components/admin/marketing/TicketReleaseCard'
import { ArtistsAllTogetherCard } from '@/components/admin/marketing/ArtistsAllTogetherCard'
import { VolunteersNeededCard } from '@/components/admin/marketing/VolunteersNeededCard'
import { PinterestBoardCard } from '@/components/admin/marketing/PinterestBoardCard'
import { CustomPostForm } from '@/components/admin/marketing/CustomPostForm'
import { CustomPostRow } from '@/components/admin/marketing/CustomPostRow'

// artists_all_together is handled separately below (it needs the performers list, not just
// EventMarketingData like the rest of these) — not included in this generic lookup.
const TEMPLATE_CARDS: Partial<
  Record<FixedMarketingPostType, (props: { event: EventMarketingData }) => React.JSX.Element>
> = {
  save_the_date: SaveTheDateCard,
  facebook_event: FacebookEventCard,
  casting_call_open: CastingCallOpenCard,
  casting_call_closed: CastingCallClosedCard,
  ticket_countdown: TicketCountdownCard,
  ticket_release: TicketReleaseCard,
  volunteers_needed: VolunteersNeededCard,
  pinterest_board: PinterestBoardCard,
}

const ROLE_REVEAL_PRIORITY: Record<AdminEventPerformerRow['lineup_role'], number> = {
  headliner: 0,
  host: 1,
  performer: 2,
}

// reveal_date is the actual control lever — set one and that artist moves to exactly where
// it belongs chronologically, letting the board choose reveal order directly. Headliner/
// host only act as the *default* ordering for whoever doesn't have a date set yet (a
// dated artist always outranks an undated one, regardless of role).
const sortArtistsForReveal = (rows: AdminEventPerformerRow[]): AdminEventPerformerRow[] =>
  [...rows].sort((a, b) => {
    if (a.reveal_date && b.reveal_date) return a.reveal_date.localeCompare(b.reveal_date)
    if (a.reveal_date) return -1
    if (b.reveal_date) return 1
    return ROLE_REVEAL_PRIORITY[a.lineup_role] - ROLE_REVEAL_PRIORITY[b.lineup_role]
  })

const DEFAULT_POST_STATUSES = Object.fromEntries(
  POST_SCHEDULE.map((item) => [item.type, false])
) as Record<FixedMarketingPostType, boolean>

export const AdminMarketing = () => {
  const { t, language } = useLanguage()
  const { selectedEventId } = useCurrentEvent()
  const [performers, setPerformers] = useState<AdminEventPerformerRow[]>([])
  const [ticketUrl, setTicketUrl] = useState<string | null>(null)
  const [hashtags, setHashtags] = useState<string | null>(null)
  const [eventData, setEventData] = useState<EventMarketingData | null>(null)
  const [postStatuses, setPostStatuses] =
    useState<Record<FixedMarketingPostType, boolean>>(DEFAULT_POST_STATUSES)
  const [customPosts, setCustomPosts] = useState<CustomMarketingPost[]>([])
  const [showCustomPostForm, setShowCustomPostForm] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedEventId) return

    const load = async () => {
      setLoading(true)
      try {
        const [performersData, marketingData, statuses, customs] = await Promise.all([
          getEventPerformersForAdmin(selectedEventId),
          getEventMarketingData(selectedEventId),
          getMarketingPostStatuses(selectedEventId),
          getCustomPosts(selectedEventId),
        ])
        setPerformers(performersData.performers)
        setTicketUrl(performersData.ticketUrl)
        setHashtags(performersData.hashtags)
        setEventData(marketingData)
        setPostStatuses(statuses)
        setCustomPosts(customs)
      } catch (err) {
        console.error('Kunde inte hämta marknadsföringsdata:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedEventId])

  const handleChanged = (performerId: string, patch: Partial<AdminEventPerformerRow>) => {
    setPerformers((prev) =>
      prev.map((row) => (row.performer_id === performerId ? { ...row, ...patch } : row))
    )
  }

  const handleTogglePost = async (postType: FixedMarketingPostType, isPosted: boolean) => {
    setPostStatuses((prev) => ({ ...prev, [postType]: isPosted }))
    try {
      await setMarketingPostStatus(selectedEventId, postType, isPosted)
    } catch (err) {
      console.error('Kunde inte spara status:', err)
      setPostStatuses((prev) => ({ ...prev, [postType]: !isPosted }))
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    }
  }

  const handleHashtagsSaved = (newHashtags: string) => {
    setHashtags(newHashtags)
    setEventData((prev) => (prev ? { ...prev, hashtags: newHashtags } : prev))
  }

  const renderArtistsSection = () => (
    <div key="artists-section" className="space-y-2 pt-2">
      <h3 className="font-decorative text-lg text-foreground/90">{t('Artister', 'Artists')}</h3>
      {performers.length === 0 ? (
        <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
          {t(
            'Inga bekräftade artister för detta event ännu.',
            'No confirmed artists for this event yet.'
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sortArtistsForReveal(performers).map((row) => (
            <ArtistOverviewCard
              key={row.performer_id}
              row={row}
              event={{
                id: selectedEventId,
                title: eventData?.title ?? '',
                ticketUrl,
                hashtags,
              }}
              onChanged={handleChanged}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{t('Marknadsföring', 'Marketing')}</h1>
      <div className="gold-divider" />

      <EventPicker />

      {selectedEventId && !loading && (
        <div className="max-w-5xl mx-auto mt-8 space-y-8">
          {eventData && (
            <EventAssetPanel
              event={eventData}
              performers={performers}
              onHashtagsSaved={handleHashtagsSaved}
            />
          )}

          <div className="space-y-2">
            <h3 className="font-decorative text-lg text-foreground/90">
              {t('Standardinlägg', 'Standard posts')}
            </h3>
            <div className="space-y-2">
              {POST_SCHEDULE.map((item) => {
                const suggestedDate = eventData?.eventStart
                  ? computeSuggestedDate(eventData.eventStart, item.offset)
                  : null
                const TemplateCard = TEMPLATE_CARDS[item.type]

                return (
                  <Fragment key={item.type}>
                    <div className="admin-panel velvet-surface p-3 flex items-center gap-3">
                      {item.type === 'artists_all_together' && eventData ? (
                        <ArtistsAllTogetherCard event={eventData} performers={performers} />
                      ) : (
                        TemplateCard &&
                        eventData && <TemplateCard event={eventData} />
                      )}
                      <span className="font-decorative text-sm text-foreground flex-1">
                        {language === 'sv' ? item.labelSv : item.labelEng}
                      </span>
                      <span className="text-xs text-foreground/50 font-mono">
                        {suggestedDate
                          ? suggestedDate.toLocaleDateString('sv-SE')
                          : t('Inget datum', 'No date')}
                      </span>
                      <input
                        type="checkbox"
                        checked={postStatuses[item.type]}
                        onChange={(e) => handleTogglePost(item.type, e.target.checked)}
                        className="h-4 w-4 accent-accent shrink-0"
                      />
                    </div>
                    {item.type === 'artists_soon' && renderArtistsSection()}
                  </Fragment>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-decorative text-lg text-foreground/90">
                {t('Egna inlägg', 'Custom posts')}
              </h3>
              {!showCustomPostForm && (
                <button
                  type="button"
                  onClick={() => setShowCustomPostForm(true)}
                  className="flex items-center gap-1.5 text-[11px] py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('Lägg till', 'Add')}
                </button>
              )}
            </div>

            {showCustomPostForm && eventData && (
              <CustomPostForm
                event={eventData}
                onCreated={(post) => {
                  setCustomPosts((prev) => [...prev, post])
                  setShowCustomPostForm(false)
                }}
                onCancel={() => setShowCustomPostForm(false)}
              />
            )}

            {customPosts.length === 0 && !showCustomPostForm ? (
              <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-6">
                {t('Inga egna inlägg tillagda ännu.', 'No custom posts added yet.')}
              </div>
            ) : (
              <div className="space-y-2">
                {customPosts.map((post) => (
                  <CustomPostRow
                    key={post.id}
                    post={post}
                    onChanged={(updated) =>
                      setCustomPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                    }
                    onDeleted={(id) =>
                      setCustomPosts((prev) => prev.filter((p) => p.id !== id))
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-decorative text-lg text-foreground/90">
              {t('Säsongsidéer', 'Seasonal ideas')}
            </h3>
            <div className="admin-panel velvet-surface p-4 text-sm text-foreground/60 space-y-1">
              <p>🎄 {t('Jul-inlägg', 'Christmas post')}</p>
              <p>💝 {t('Alla hjärtans dag-inlägg', "Valentine's Day post")}</p>
            </div>
          </div>
        </div>
      )}

      {selectedEventId && loading && (
        <div className="loading-container">
          <div className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</div>
        </div>
      )}
    </div>
  )
}
