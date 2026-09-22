import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { EventPicker } from '@/components/admin/EventPicker'
import {
  getEventPerformersForAdmin,
  getEventMarketingData,
  getEventSponsorsForAdmin,
  type AdminEventPerformerRow,
  type AdminEventSponsorRow,
  type EventMarketingData,
} from '@/services/eventService'
import {
  getMarketingPosts,
  setMarketingPostStatus,
  setMarketingPostDate,
  getCustomPosts,
  type FixedMarketingPostType,
  type FixedMarketingPost,
  type CustomMarketingPost,
} from '@/services/marketingService'
import {
  POST_SCHEDULE,
  computeSuggestedDate,
  toLocalIsoDate,
  type PostScheduleItem,
} from '@/lib/marketingSchedule'
import { EventAssetPanel } from '@/components/admin/marketing/EventAssetPanel'
import { ArtistOverviewCard } from '@/components/admin/marketing/ArtistOverviewCard'
import { StandardPostRow } from '@/components/admin/marketing/StandardPostRow'
import { buildSaveTheDateText } from '@/components/admin/marketing/SaveTheDateCard'
import { buildArtistsSoonText } from '@/components/admin/marketing/ArtistsSoonCard'
import { buildFacebookEventText } from '@/components/admin/marketing/FacebookEventCard'
import { buildCastingCallOpenText } from '@/components/admin/marketing/CastingCallOpenCard'
import { buildCastingCallClosedText } from '@/components/admin/marketing/CastingCallClosedCard'
import { buildTicketCountdownText } from '@/components/admin/marketing/TicketCountdownCard'
import { buildTicketReleaseText } from '@/components/admin/marketing/TicketReleaseCard'
import { buildArtistsAllTogetherText } from '@/components/admin/marketing/ArtistsAllTogetherCard'
import { buildVolunteersNeededText } from '@/components/admin/marketing/VolunteersNeededCard'
import { buildPinterestBoardText } from '@/components/admin/marketing/PinterestBoardCard'
import { buildSponsorsSalesTableText } from '@/components/admin/marketing/SponsorsSalesTableCard'
import { buildContestText } from '@/components/admin/marketing/ContestCard'
import { buildPhotoCornerText } from '@/components/admin/marketing/PhotoCornerCard'
import { buildVenueRulesText } from '@/components/admin/marketing/VenueRulesCard'
import { buildEveningScheduleText } from '@/components/admin/marketing/EveningScheduleCard'
import { buildOneWeekLeftText } from '@/components/admin/marketing/OneWeekLeftCard'
import { buildShareLikeInviteText } from '@/components/admin/marketing/ShareLikeInviteCard'
import { buildEveningScheduleReminderText } from '@/components/admin/marketing/EveningScheduleReminderCard'
import { buildLetsGoText } from '@/components/admin/marketing/LetsGoCard'
import { buildThankYouText } from '@/components/admin/marketing/ThankYouCard'
import { buildEvaluationText } from '@/components/admin/marketing/EvaluationCard'
import { CustomPostForm } from '@/components/admin/marketing/CustomPostForm'
import { CustomPostRow } from '@/components/admin/marketing/CustomPostRow'

// Post types whose template only needs plain EventMarketingData. artists_all_together,
// contest, sponsors_sales_table, one_week_left, and lets_go all need more (performers
// and/or sponsorRows) — handled in buildGenerateTextFor below instead of this generic
// lookup.
const TEMPLATE_BUILDERS: Partial<
  Record<FixedMarketingPostType, (event: EventMarketingData) => string>
> = {
  save_the_date: buildSaveTheDateText,
  artists_soon: buildArtistsSoonText,
  facebook_event: buildFacebookEventText,
  casting_call_open: buildCastingCallOpenText,
  casting_call_closed: buildCastingCallClosedText,
  ticket_countdown: buildTicketCountdownText,
  ticket_release: buildTicketReleaseText,
  volunteers_needed: buildVolunteersNeededText,
  pinterest_board: buildPinterestBoardText,
  photo_corner: buildPhotoCornerText,
  venue_rules: buildVenueRulesText,
  evening_schedule: buildEveningScheduleText,
  share_like_invite: buildShareLikeInviteText,
  evening_schedule_reminder: buildEveningScheduleReminderText,
  thank_you: buildThankYouText,
  evaluation: buildEvaluationText,
}

const ROLE_REVEAL_PRIORITY: Record<AdminEventPerformerRow['lineup_role'], number> = {
  host: 0,
  headliner: 1,
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

const EMPTY_FIXED_POST: FixedMarketingPost = { isPosted: false, content: null, postDate: null }

const DEFAULT_POST_RECORDS = Object.fromEntries(
  POST_SCHEDULE.map((item) => [item.type, EMPTY_FIXED_POST])
) as Record<FixedMarketingPostType, FixedMarketingPost>

export const AdminMarketing = () => {
  const { t, language } = useLanguage()
  const { selectedEventId } = useCurrentEvent()
  const [performers, setPerformers] = useState<AdminEventPerformerRow[]>([])
  const [sponsorRows, setSponsorRows] = useState<AdminEventSponsorRow[]>([])
  const [ticketUrl, setTicketUrl] = useState<string | null>(null)
  const [hashtags, setHashtags] = useState<string | null>(null)
  const [eventData, setEventData] = useState<EventMarketingData | null>(null)
  const [postRecords, setPostRecords] =
    useState<Record<FixedMarketingPostType, FixedMarketingPost>>(DEFAULT_POST_RECORDS)
  const [customPosts, setCustomPosts] = useState<CustomMarketingPost[]>([])
  const [showCustomPostForm, setShowCustomPostForm] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedEventId) return

    const load = async () => {
      setLoading(true)
      try {
        const [performersData, sponsors, marketingData, records, customs] = await Promise.all([
          getEventPerformersForAdmin(selectedEventId),
          getEventSponsorsForAdmin(selectedEventId),
          getEventMarketingData(selectedEventId),
          getMarketingPosts(selectedEventId),
          getCustomPosts(selectedEventId),
        ])
        setPerformers(performersData.performers)
        setSponsorRows(sponsors)
        setTicketUrl(performersData.ticketUrl)
        setHashtags(performersData.hashtags)
        setEventData(marketingData)
        setPostRecords(records)
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
    setPostRecords((prev) => ({ ...prev, [postType]: { ...prev[postType], isPosted } }))
    try {
      await setMarketingPostStatus(selectedEventId, postType, isPosted)
    } catch (err) {
      console.error('Kunde inte spara status:', err)
      setPostRecords((prev) => ({
        ...prev,
        [postType]: { ...prev[postType], isPosted: !isPosted },
      }))
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    }
  }

  const handlePostContentSaved = (postType: FixedMarketingPostType, content: string) => {
    setPostRecords((prev) => ({ ...prev, [postType]: { ...prev[postType], content } }))
  }

  const handlePostDateChanged = async (
    postType: FixedMarketingPostType,
    postDate: string | null
  ) => {
    const previous = postRecords[postType].postDate
    setPostRecords((prev) => ({ ...prev, [postType]: { ...prev[postType], postDate } }))
    try {
      await setMarketingPostDate(selectedEventId, postType, postDate)
    } catch (err) {
      console.error('Kunde inte spara datum:', err)
      setPostRecords((prev) => ({ ...prev, [postType]: { ...prev[postType], postDate: previous } }))
      toast.error(t('Kunde inte spara datum.', 'Could not save date.'))
    }
  }

  const handleHashtagsSaved = (newHashtags: string) => {
    setHashtags(newHashtags)
    setEventData((prev) => (prev ? { ...prev, hashtags: newHashtags } : prev))
  }

  // Post types needing more than plain EventMarketingData (performers and/or sponsorRows) —
  // a switch instead of nested ternaries once there were enough of these to make the
  // ternary chain hard to follow. Direct feedback 2026-09-22.
  const buildGenerateTextFor = (
    item: PostScheduleItem,
    event: EventMarketingData
  ): (() => string) | null => {
    switch (item.type) {
      case 'artists_all_together':
        return () => buildArtistsAllTogetherText(event, sortArtistsForReveal(performers))
      case 'sponsors_sales_table':
        return () => buildSponsorsSalesTableText(event, sponsorRows)
      case 'contest':
        return () => buildContestText(event, sponsorRows)
      case 'one_week_left':
        return () => buildOneWeekLeftText(event, sortArtistsForReveal(performers))
      case 'lets_go':
        return () => buildLetsGoText(event, sortArtistsForReveal(performers), sponsorRows)
      default: {
        const builder = TEMPLATE_BUILDERS[item.type]
        return builder ? () => builder(event) : null
      }
    }
  }

  // One schedule item's row — pulled out of the old single `.map()` so both columns of the
  // split layout below can render individual rows by type (artists_soon/
  // artists_all_together move into the Artists column) without duplicating this lookup
  // logic. Direct feedback 2026-09-22.
  const renderPostRow = (item: PostScheduleItem) => {
    const suggestedDate = eventData?.eventStart
      ? computeSuggestedDate(eventData.eventStart, item.offset)
      : null
    const generateText = eventData ? buildGenerateTextFor(item, eventData) : null
    const record = postRecords[item.type]

    return (
      <StandardPostRow
        key={`${selectedEventId}-${item.type}`}
        eventId={selectedEventId}
        postType={item.type}
        label={language === 'sv' ? item.labelSv : item.labelEng}
        suggestedDateIso={suggestedDate ? toLocalIsoDate(suggestedDate) : null}
        savedPostDate={record.postDate}
        isPosted={record.isPosted}
        savedContent={record.content}
        generateText={generateText}
        onToggle={(checked) => handleTogglePost(item.type, checked)}
        onSaved={(content) => handlePostContentSaved(item.type, content)}
        onDateChanged={(postDate) => handlePostDateChanged(item.type, postDate)}
      />
    )
  }

  const renderArtistsSection = () => (
    <div key="artists-section" className="space-y-2 pt-2">
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
                eventStart: eventData?.eventStart ?? null,
                location: eventData?.location ?? null,
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
              sponsorRows={sponsorRows}
              onHashtagsSaved={handleHashtagsSaved}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Everything artist-related (the two reveal posts either side of the artist
                overview cards) plus the follow-up custom/seasonal posts get their own column,
                separate from the chronological standard-post checklist — direct feedback
                2026-09-22. */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-decorative text-lg text-foreground/90">
                  {t('Standardinlägg', 'Standard posts')}
                </h3>
                <span className="text-[11px] text-foreground/50">
                  {t('Postat på sociala medier', 'Posted on social media')}
                </span>
              </div>
              <div className="space-y-2">
                {POST_SCHEDULE.filter(
                  (item) => item.type !== 'artists_soon' && item.type !== 'artists_all_together'
                ).map(renderPostRow)}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-decorative text-lg text-foreground/90">
                    {t('Artister', 'Artists')}
                  </h3>
                  <span className="text-[11px] text-foreground/50">
                    {t('Postat på sociala medier', 'Posted on social media')}
                  </span>
                </div>
                <div className="space-y-2">
                  {renderPostRow(POST_SCHEDULE.find((i) => i.type === 'artists_soon')!)}
                  {renderArtistsSection()}
                  {renderPostRow(POST_SCHEDULE.find((i) => i.type === 'artists_all_together')!)}
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
                          setCustomPosts((prev) =>
                            prev.map((p) => (p.id === updated.id ? updated : p))
                          )
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
