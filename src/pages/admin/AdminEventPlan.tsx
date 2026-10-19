import { useRememberedTab } from '@/hooks/useRememberedTab'
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { UtensilsCrossed, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { EventPicker } from '@/components/admin/EventPicker'
import {
  getEventPerformersForAdmin,
  getEventStaffForAdmin,
  getEventSponsorsForAdmin,
  getEventActsForAdmin,
  getEventPlaylists,
  getEventOrganizerFood,
  updateEventPerformerDietary,
  updateEventPerformerDietaryNotes,
  updateEventPerformerNeedsFood,
  updateEvent,
} from '@/services/eventService'
import type {
  AdminEventPerformerRow,
  AdminEventStaffRow,
  AdminEventSponsorRow,
  AdminEventActRow,
  AdminEventOrganizerFoodRow,
  EventPlaylists,
} from '@/services/eventService'
import { getVipManualEntries, createVipManualEntry } from '@/services/vipListService'
import { updateRow, deleteRow } from '@/services/databaseService'
import {
  getStaffVolunteers,
  getSponsors,
  confirmStaffForEvent,
  confirmSponsorForEvent,
  setSponsorMerchTable,
  setSponsorExhibitionTable,
  updateStaffFoodInfoForPerson,
  updateOrganizerFoodInfo,
} from '@/services/contactsService'
import { staffRoleLabel, staffPersonRoleSummary, dietaryCategoryLabel } from '@/lib/contactLabels'
import { groupStaffRowsByPerson } from '@/lib/staffRowGrouping'
import { buildVipSections, type EventDocContext } from '@/lib/eventDocuments'
import { EventStaffRow } from '@/components/admin/event-plan/EventStaffRow'
import { EntertainerProfileModal } from '@/components/admin/event-plan/EntertainerProfileModal'
import { EventMusicSection } from '@/components/admin/event-plan/EventMusicSection'
import { VolunteerShiftGroups } from '@/components/admin/event-plan/VolunteerShiftGroups'
import { SponsorSlotGrid } from '@/components/admin/event-plan/SponsorSlotGrid'
import {
  InlineAddPicker,
  type InlineAddPickerItem,
} from '@/components/admin/event-plan/InlineAddPicker'
import { VipManualEntryRow } from '@/components/admin/event-plan/VipManualEntryRow'
import { StaffingCoverageStrip } from '@/components/admin/event-plan/StaffingCoverageStrip'
import { DocumentsMenu } from '@/components/admin/event-plan/DocumentsMenu'
import { InfoHubTab } from '@/components/admin/event-plan/InfoHubTab'
import { FoodTab } from '@/components/admin/event-plan/FoodTab'
import {
  STANDING_ORGANIZERS,
  ROLE_ORDER,
  type EventPlanTab,
} from '@/components/admin/event-plan/constants'
import type {
  VipManualEntry,
  CreateVipManualEntryInput,
  DietaryCategory,
  StaffVolunteerType,
} from '@/types/types'

const blankVipEntry = (eventId: string): VipManualEntry => ({
  id: crypto.randomUUID(),
  event_id: eventId,
  name: '',
  email: null,
  category: 'other',
  note: null,
  created_at: new Date().toISOString(),
})

// The print view builds a real HTML document from admin-entered strings (names/notes) —
// escaped so a stray "&"/"<" in someone's name can't break the markup.
export const AdminEventPlan = () => {
  const { t } = useLanguage()
  const { selectedEventId, upcomingEvents } = useCurrentEvent()
  // Lets the Dashboard's highlight cards deep-link straight to a specific tab (e.g. "show"
  // for the stage-notes card) via navigate(path, { state: { tab } }) instead of always
  // landing on the default Bemanning tab.
  const location = useLocation()
  const [activeTab, setActiveTab] = useRememberedTab<EventPlanTab>(
    'event-plan',
    ['staff', 'sponsors', 'food', 'info'],
    'staff',
    (location.state as { tab?: EventPlanTab } | null)?.tab
  )
  const [performers, setPerformers] = useState<AdminEventPerformerRow[]>([])
  const [acts, setActs] = useState<AdminEventActRow[]>([])
  const [staffRows, setStaffRows] = useState<AdminEventStaffRow[]>([])
  const [organizerFood, setOrganizerFood] = useState<AdminEventOrganizerFoodRow[]>([])
  const [sponsorRows, setSponsorRows] = useState<AdminEventSponsorRow[]>([])
  const [vipEntries, setVipEntries] = useState<VipManualEntry[]>([])
  const [vipDrafts, setVipDrafts] = useState<VipManualEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [entertainerTarget, setEntertainerTarget] = useState<{
    staffId: string
    name: string
  } | null>(null)
  // CurrentEventContext only carries id/title/event_start (a deliberately narrow shared
  // query — see getEventVenueId's comment in eventService.ts for the same pattern), so the
  // three playlist fields need their own dedicated fetch here, same as venue_id does elsewhere.
  const [playlists, setPlaylists] = useState<EventPlaylists>({
    before_playlist: null,
    afterparty_playlist: null,
  })

  const handleSavePlaylist =
    (field: keyof EventPlaylists) =>
    async (value: string): Promise<void> => {
      const trimmed = value.trim()
      await updateEvent(selectedEventId, { [field]: trimmed || null })
      setPlaylists((prev) => ({ ...prev, [field]: trimmed || null }))
    }

  useEffect(() => {
    if (!selectedEventId) return

    const load = async () => {
      setLoading(true)
      try {
        const [performersData, actsData, staff, sponsors, vip, playlistData, organizers] =
          await Promise.all([
            getEventPerformersForAdmin(selectedEventId),
            getEventActsForAdmin(selectedEventId),
            getEventStaffForAdmin(selectedEventId),
            getEventSponsorsForAdmin(selectedEventId),
            getVipManualEntries(selectedEventId),
            getEventPlaylists(selectedEventId),
            getEventOrganizerFood(selectedEventId),
          ])
        setPerformers(performersData.performers)
        setActs(actsData)
        setStaffRows(staff)
        setSponsorRows(sponsors)
        setVipEntries(vip)
        setPlaylists(playlistData)
        setOrganizerFood(organizers)
      } catch (err) {
        console.error('Kunde inte hämta eventplan:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedEventId])

  // Shared by the Afterparty section and the regular role-grouped list below it — both
  // just patch/remove one row of the same staffRows array.
  const handleStaffRowRemoved = (id: string) =>
    setStaffRows((prev) => prev.filter((r) => r.id !== id))
  // A food/dietary patch is written server-side to every row this person holds for the event
  // (see updateStaffFoodInfoForPerson) — mirror that here so local state doesn't show it as
  // saved on only the one role that happened to be expanded when it was edited.
  const handleStaffRowUpdated = (id: string, patch: Partial<AdminEventStaffRow>) =>
    setStaffRows((prev) => {
      const isFoodPatch =
        'needs_food' in patch || 'dietary_category' in patch || 'dietary_notes' in patch
      const target = prev.find((r) => r.id === id)
      if (!isFoodPatch || !target) return prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      return prev.map((r) => (r.staff.id === target.staff.id ? { ...r, ...patch } : r))
    })

  // Bemanning's per-section "+" pickers — confirms an existing contact straight into that
  // role without leaving Event Planning for Contacts. Refetches the whole staff list
  // afterward rather than constructing the joined row locally (confirmStaffForEvent only
  // returns void) — a full reload is simplest for a rare, deliberate action like this.
  // Candidates are grouped by their own default role, with the role being added to sorted
  // first — adding a photographer shows existing photographers up top, with everyone else
  // still reachable underneath instead of hidden. Direct feedback, 2026-09-20.
  const fetchStaffCandidatesForRole =
    (role: StaffVolunteerType) => async (): Promise<InlineAddPickerItem[]> => {
      const all = await getStaffVolunteers()
      const alreadyIds = new Set(staffRows.filter((r) => r.role === role).map((r) => r.staff.id))
      const roleOrderIndex = (r: StaffVolunteerType) => {
        if (r === role) return -1
        const idx = ROLE_ORDER.indexOf(r)
        return idx === -1 ? ROLE_ORDER.length : idx
      }
      return all
        .filter((c) => !alreadyIds.has(c.id))
        .sort((a, b) => roleOrderIndex(a.role) - roleOrderIndex(b.role))
        .map((c) => ({
          id: c.id,
          label: c.name,
          sublabel: c.email,
          groupKey: c.role,
          groupLabel: staffRoleLabel(t, c.role),
        }))
    }
  const handleAddStaffToRole =
    (role: StaffVolunteerType) =>
    async (item: InlineAddPickerItem): Promise<void> => {
      await confirmStaffForEvent(selectedEventId, item.id, item.label, role, null, null)
      setStaffRows(await getEventStaffForAdmin(selectedEventId))
      toast.success(t('Tillagd!', 'Added!'))
      // An entertainer also gets a public profile — open it straight away (skippable).
      if (role === 'entertainment') setEntertainerTarget({ staffId: item.id, name: item.label })
    }

  // One role section (header + count + add-picker + rows), shared by both columns of the
  // Bemanning tab's split layout below — kept as a plain function rather than a component so
  // it can close over staffRows/selectedEventId directly, same as the rest of this page.
  const renderStaffRoleSection = (role: StaffVolunteerType) => {
    const rows = staffRows.filter((r) => r.role === role)
    // Distinct people for the badge count — a volunteer on 2 shifts produces 2 rows here but
    // is still 1 person (same reasoning as StaffingCoverageStrip/EventProgressOverview);
    // every other role can only ever hold 1 row per person already, so this is a no-op there.
    const distinctCount = new Set(rows.map((r) => r.staff.id)).size

    return (
      <div key={role} className="space-y-2">
        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
          <h5 className="font-decorative text-base text-foreground/80">
            {staffRoleLabel(t, role)}
          </h5>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
              {distinctCount}
            </span>
            <InlineAddPicker
              fetchItems={fetchStaffCandidatesForRole(role)}
              onSelect={handleAddStaffToRole(role)}
              placeholder={t('Sök kontakt...', 'Search contacts...')}
              emptyMessage={t('Inga fler kontakter att lägga till.', 'No more contacts to add.')}
            />
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-foreground/40 italic pt-1">
            {t('Ingen tillagd ännu.', 'Nobody added yet.')}
          </p>
        ) : role === 'volunteer' ? (
          <VolunteerShiftGroups
            rows={rows}
            eventId={selectedEventId}
            eventTitle={eventTitle}
            onRemoved={handleStaffRowRemoved}
            onUpdated={handleStaffRowUpdated}
            onShiftsChanged={async () => setStaffRows(await getEventStaffForAdmin(selectedEventId))}
          />
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <EventStaffRow
                key={row.id}
                row={row}
                eventId={selectedEventId}
                onRemoved={handleStaffRowRemoved}
                onUpdated={handleStaffRowUpdated}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Sponsors tab's equivalents — Pris-sponsorer confirms straight into role: 'prize'.
  // Sales is independent of role (see SponsorSlotGrid.tsx's own comment): picking someone
  // already confirmed under some other role just flips has_merch_table, without touching
  // their role; picking someone brand new to the event confirms them with role: null and
  // sets the flag in the same action (see handleAddSalesSponsor below for why not 'sales').
  const fetchPrizeCandidates = async (): Promise<InlineAddPickerItem[]> => {
    const all = await getSponsors()
    const alreadyIds = new Set(
      sponsorRows.filter((r) => r.role === 'prize').map((r) => r.sponsor_id)
    )
    return all
      .filter((s) => !alreadyIds.has(s.id))
      .map((s) => ({ id: s.id, label: s.name, sublabel: s.email }))
  }
  const handleAddPrizeSponsor = async (item: InlineAddPickerItem): Promise<void> => {
    await confirmSponsorForEvent(selectedEventId, item.id, 'prize', null)
    setSponsorRows(await getEventSponsorsForAdmin(selectedEventId))
    toast.success(t('Tillagd!', 'Added!'))
  }
  const fetchSalesCandidates = async (): Promise<InlineAddPickerItem[]> => {
    const all = await getSponsors()
    const alreadyIds = new Set(
      sponsorRows.filter((r) => r.has_merch_table).map((r) => r.sponsor_id)
    )
    return all
      .filter((s) => !alreadyIds.has(s.id))
      .map((s) => ({ id: s.id, label: s.name, sublabel: s.email }))
  }
  const handleAddSalesSponsor = async (item: InlineAddPickerItem): Promise<void> => {
    const alreadyConfirmed = sponsorRows.some((r) => r.sponsor_id === item.id)
    if (!alreadyConfirmed) {
      // Sales-table status is independent of role (see SponsorSlotGrid.tsx's own comment)
      // — role is left untouched (null) rather than tagged 'sales', so unchecking the
      // table later just leaves them in "Övriga sponsorer" (a real column of its own) instead
      // of stuck under a 'sales' role with no column to show in. Direct feedback 2026-09-22.
      await confirmSponsorForEvent(selectedEventId, item.id, null, null)
    }
    await setSponsorMerchTable(selectedEventId, item.id, true)
    setSponsorRows(await getEventSponsorsForAdmin(selectedEventId))
    toast.success(t('Tillagd!', 'Added!'))
  }
  // Exhibition is the same "independent flag, not a role" shape as sales — a sponsor
  // showing/hanging their own work at the event (e.g. art on the walls) rather than selling
  // from a table. Direct feedback 2026-09-22.
  const fetchExhibitionCandidates = async (): Promise<InlineAddPickerItem[]> => {
    const all = await getSponsors()
    const alreadyIds = new Set(sponsorRows.filter((r) => r.has_exhibition).map((r) => r.sponsor_id))
    return all
      .filter((s) => !alreadyIds.has(s.id))
      .map((s) => ({ id: s.id, label: s.name, sublabel: s.email }))
  }
  const handleAddExhibitionSponsor = async (item: InlineAddPickerItem): Promise<void> => {
    const alreadyConfirmed = sponsorRows.some((r) => r.sponsor_id === item.id)
    if (!alreadyConfirmed) {
      await confirmSponsorForEvent(selectedEventId, item.id, null, null)
    }
    await setSponsorExhibitionTable(selectedEventId, item.id, true)
    setSponsorRows(await getEventSponsorsForAdmin(selectedEventId))
    toast.success(t('Tillagd!', 'Added!'))
  }
  const fetchOtherCandidates = async (): Promise<InlineAddPickerItem[]> => {
    const all = await getSponsors()
    const alreadyIds = new Set(sponsorRows.map((r) => r.sponsor_id))
    return all
      .filter((s) => !alreadyIds.has(s.id))
      .map((s) => ({ id: s.id, label: s.name, sublabel: s.email }))
  }
  const handleAddOtherSponsor = async (item: InlineAddPickerItem): Promise<void> => {
    await confirmSponsorForEvent(selectedEventId, item.id, 'other', null)
    setSponsorRows(await getEventSponsorsForAdmin(selectedEventId))
    toast.success(t('Tillagd!', 'Added!'))
  }

  // A merch table or exhibition both mean the sponsor's own person on-site — nudges the
  // board toward the VIP list rather than enforcing it, matching this app's "no stored
  // requirement system" philosophy. Switches to the VIP tab and drops in a pre-noted blank
  // draft; the admin still fills in the actual name(s).
  const handleRequestVipForVendor = (sponsorName: string, roleLabel: string) => {
    setVipDrafts((prev) => [
      ...prev,
      {
        ...blankVipEntry(selectedEventId),
        note: `${roleLabel} — ${sponsorName}`,
      },
    ])
    setActiveTab('food')
  }
  const handleRequestVipForSalesperson = (sponsorName: string) =>
    handleRequestVipForVendor(sponsorName, t('Säljare', 'Salesperson'))
  const handleRequestVipForExhibitor = (sponsorName: string) =>
    handleRequestVipForVendor(sponsorName, t('Utställare', 'Exhibitor'))

  const handleUpdatePerformerDietaryNotes = async (performerId: string, notes: string | null) => {
    if (!selectedEventId) return
    try {
      await updateEventPerformerDietaryNotes(selectedEventId, performerId, notes)
      setPerformers((prev) =>
        prev.map((p) =>
          p.performer_id === performerId ? { ...p, dietary_requirements: notes } : p
        )
      )
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    }
  }

  const handleUpdatePerformerNeedsFood = async (performerId: string, needsFood: boolean) => {
    if (!selectedEventId) return
    try {
      await updateEventPerformerNeedsFood(selectedEventId, performerId, needsFood)
      setPerformers((prev) =>
        prev.map((p) => (p.performer_id === performerId ? { ...p, needs_food: needsFood } : p))
      )
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    }
  }

  const handleUpdatePerformerDietary = async (performerId: string, category: DietaryCategory) => {
    if (!selectedEventId) return
    try {
      await updateEventPerformerDietary(selectedEventId, performerId, category)
      setPerformers((prev) =>
        prev.map((p) => (p.performer_id === performerId ? { ...p, dietary_category: category } : p))
      )
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    }
  }

  // The Food tab's single write path for staff/volunteer food info — looks up any one row
  // this person holds (updateStaffFoodInfoForPerson writes to all of them server-side; see
  // its own comment) purely to get an id handleStaffRowUpdated can key its local-state patch
  // off of.
  const handleStaffFoodUpdated = async (
    staffId: string,
    patch: {
      needs_food?: boolean
      dietary_category?: DietaryCategory | null
      dietary_notes?: string | null
    }
  ) => {
    const anyRow = staffRows.find((r) => r.staff.id === staffId)
    if (!anyRow) return
    try {
      await updateStaffFoodInfoForPerson(selectedEventId, staffId, patch)
      handleStaffRowUpdated(anyRow.id, patch)
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    }
  }

  // Standing organizers' write path — event_staff_food instead of event_staff_volunteers
  // (see getEventOrganizerFood's comment), so it patches its own separate bit of state.
  const handleOrganizerFoodUpdated = async (
    staffId: string,
    patch: {
      needs_food?: boolean
      dietary_category?: DietaryCategory | null
      dietary_notes?: string | null
    }
  ) => {
    try {
      await updateOrganizerFoodInfo(selectedEventId, staffId, patch)
      setOrganizerFood((prev) => prev.map((o) => (o.staff_id === staffId ? { ...o, ...patch } : o)))
    } catch (err) {
      toast.error(t('Kunde inte spara.', 'Could not save.'))
      console.error(err)
    }
  }

  const handleSaveVipEntry = async (id: string, patch: Partial<VipManualEntry>, isNew: boolean) => {
    if (isNew) {
      const created = await createVipManualEntry({
        ...patch,
        event_id: selectedEventId,
      } as CreateVipManualEntryInput)
      setVipDrafts((prev) => prev.filter((d) => d.id !== id))
      setVipEntries((prev) => [...prev, created])
      toast.success(t('Tillagd!', 'Added!'))
    } else {
      const updated = await updateRow('vip_manual_entries', id, patch)
      setVipEntries((prev) => prev.map((r) => (r.id === id ? updated : r)))
      toast.success(t('Sparat!', 'Saved!'))
    }
  }

  const handleDeleteVipEntry = async (id: string) => {
    await deleteRow('vip_manual_entries', id)
    setVipEntries((prev) => prev.filter((r) => r.id !== id))
    toast.success(t('Raderad.', 'Deleted.'))
  }

  // One entry per distinct person, not one per event_staff_volunteers row — see
  // groupStaffRowsByPerson's comment. Everything below (VIP list, on-screen VIP tab, food
  // summary, progress overview) reads from this instead of raw staffRows.
  const groupedStaff = groupStaffRowsByPerson(staffRows)

  const eventTitle = upcomingEvents.find((e) => e.id === selectedEventId)?.title ?? 'Event'
  const eventStart = upcomingEvents.find((e) => e.id === selectedEventId)?.event_start
  const docContext: EventDocContext = {
    t,
    eventTitle,
    eventStart,
    acts,
    performers,
    groupedStaff,
    vipEntries,
    organizers: organizerFood,
    eventInfo: null,
  }
  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{t('Eventplan', 'Event Plan')}</h1>
      <div className="gold-divider" />

      <EventPicker />

      {selectedEventId && (
        <>
          <div className="max-w-5xl mx-auto mt-6 mb-6">
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={
                  activeTab === 'staff'
                    ? 'btn-gold text-xs py-2 px-4'
                    : 'btn-gold-outline text-xs py-2 px-4'
                }
              >
                {t('Bemanning', 'Staffing')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sponsors')}
                className={
                  activeTab === 'sponsors'
                    ? 'btn-gold text-xs py-2 px-4'
                    : 'btn-gold-outline text-xs py-2 px-4'
                }
              >
                {t('Sponsorer', 'Sponsors')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('food')}
                className={
                  activeTab === 'food'
                    ? 'btn-gold text-xs py-2 px-4'
                    : 'btn-gold-outline text-xs py-2 px-4'
                }
              >
                {t('Mat & VIP', 'Food & VIP')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={
                  activeTab === 'info'
                    ? 'btn-gold text-xs py-2 px-4'
                    : 'btn-gold-outline text-xs py-2 px-4'
                }
              >
                {t('Info & länkar', 'Info & links')}
              </button>
              <DocumentsMenu
                eventId={selectedEventId}
                ids={['vipList', 'foodList', 'doorShifts']}
                load={async () => ({ context: docContext })}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-4">
              {activeTab === 'food' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8 items-start">
                  <div className="space-y-4">
                    <h4 className="font-decorative text-lg text-accent text-center">
                      {t('Mat', 'Food')}
                    </h4>

                    <FoodTab
                      eventTitle={eventTitle}
                      performers={performers}
                      groupedStaff={groupedStaff}
                      organizers={organizerFood}
                      onUpdatePerformerDietary={handleUpdatePerformerDietary}
                      onUpdatePerformerDietaryNotes={handleUpdatePerformerDietaryNotes}
                      onUpdatePerformerNeedsFood={handleUpdatePerformerNeedsFood}
                      onStaffFoodUpdated={handleStaffFoodUpdated}
                      onOrganizerFoodUpdated={handleOrganizerFoodUpdated}
                    />
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-decorative text-lg text-accent text-center">
                      {t('VIP-lista', 'VIP list')}
                    </h4>
                    <div className="space-y-4">
                      <p className="text-center text-sm text-foreground/70">
                        {t('Totalt på listan', 'Total on the list')}:{' '}
                        <span className="font-mono text-accent">
                          {buildVipSections(docContext).reduce((sum, s) => sum + s.items.length, 0)}
                        </span>
                      </p>

                      <details className="group">
                        <summary className="cursor-pointer font-decorative text-base text-foreground/80 border-b border-accent/10 pb-2 flex items-center justify-between">
                          {t('Arrangörer', 'Organizers')}
                          <span className="text-xs font-mono text-foreground/40">
                            {STANDING_ORGANIZERS.length}
                          </span>
                        </summary>
                        <div className="space-y-2 pt-2">
                          {STANDING_ORGANIZERS.map((organizer) => (
                            <div
                              key={organizer.email}
                              className="admin-panel velvet-surface p-3 flex items-center gap-3 text-sm text-foreground"
                            >
                              <span className="flex-1 min-w-0 truncate">{organizer.name}</span>
                              <span className="text-foreground/50 text-xs shrink-0">
                                {organizer.email}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>

                      <details className="group">
                        <summary className="cursor-pointer font-decorative text-base text-foreground/80 border-b border-accent/10 pb-2 flex items-center justify-between">
                          {t('Artister', 'Artists')}
                          <span className="text-xs font-mono text-foreground/40">
                            {performers.length}
                          </span>
                        </summary>
                        <div className="space-y-2 pt-2">
                          {performers.length === 0 ? (
                            <p className="text-sm text-foreground/40 italic">
                              {t('Inga bekräftade artister ännu.', 'No confirmed artists yet.')}
                            </p>
                          ) : (
                            performers.map((row) => (
                              <div
                                key={row.performer_id}
                                className="admin-panel velvet-surface p-3 flex items-center gap-3 text-sm text-foreground"
                              >
                                <span className="flex-1 min-w-0 truncate">
                                  {row.performer.performer_name}
                                </span>
                                {row.plus_one_name && (
                                  <span
                                    title={`+1: ${row.plus_one_name}`}
                                    className="shrink-0 text-[10px] font-body font-semibold text-sky-400 border border-sky-400/30 rounded-full px-1.5 py-0.5"
                                  >
                                    +1
                                  </span>
                                )}
                                <span
                                  title={
                                    row.dietary_category
                                      ? dietaryCategoryLabel(t, row.dietary_category)
                                      : t('Mat ej kategoriserad', 'Food not categorized')
                                  }
                                  className="shrink-0"
                                >
                                  <UtensilsCrossed
                                    className={`h-3.5 w-3.5 ${row.dietary_category ? 'text-accent/50' : 'text-amber-400/70'}`}
                                  />
                                </span>
                                {row.performer.email && (
                                  <span className="text-foreground/50 text-xs shrink-0">
                                    {row.performer.email}
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </details>

                      <details className="group">
                        <summary className="cursor-pointer font-decorative text-base text-foreground/80 border-b border-accent/10 pb-2 flex items-center justify-between">
                          {t('Arbetare & volontärer', 'Staff & volunteers')}
                          <span className="text-xs font-mono text-foreground/40">
                            {groupedStaff.length}
                          </span>
                        </summary>
                        <div className="space-y-2 pt-2">
                          {groupedStaff.length === 0 ? (
                            <p className="text-sm text-foreground/40 italic">
                              {t('Ingen personal bekräftad ännu.', 'No staff confirmed yet.')}
                            </p>
                          ) : (
                            groupedStaff.map((person) => (
                              <div
                                key={person.staff.id}
                                className="admin-panel velvet-surface p-3 flex items-center gap-3 text-sm text-foreground"
                              >
                                <span className="flex-1 min-w-0 truncate">{person.staff.name}</span>
                                {person.needs_food && (
                                  <span
                                    title={
                                      person.dietary_category
                                        ? dietaryCategoryLabel(t, person.dietary_category)
                                        : t('Mat ej kategoriserad', 'Food not categorized')
                                    }
                                    className="shrink-0"
                                  >
                                    <UtensilsCrossed
                                      className={`h-3.5 w-3.5 ${person.dietary_category ? 'text-accent/50' : 'text-amber-400/70'}`}
                                    />
                                  </span>
                                )}
                                {person.staff.email && (
                                  <span className="text-foreground/50 text-xs shrink-0">
                                    {person.staff.email}
                                  </span>
                                )}
                                <span className="text-accent italic text-xs shrink-0">
                                  {staffPersonRoleSummary(t, person.rows)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </details>

                      <details className="group">
                        <summary className="cursor-pointer font-decorative text-base text-foreground/80 border-b border-accent/10 pb-2 flex items-center justify-between">
                          {t('Artisternas +1', "Artists' +1")}
                          <span className="text-xs font-mono text-foreground/40">
                            {performers.filter((p) => p.plus_one_name).length}
                          </span>
                        </summary>
                        <div className="space-y-2 pt-2">
                          {performers.filter((p) => p.plus_one_name).length === 0 ? (
                            <p className="text-sm text-foreground/40 italic">
                              {t('Inga anmälda +1 ännu.', 'No +1s registered yet.')}
                            </p>
                          ) : (
                            performers
                              .filter((p) => p.plus_one_name)
                              .map((row) => (
                                <div
                                  key={row.performer_id}
                                  className="admin-panel velvet-surface p-3 flex items-center gap-3 text-sm text-foreground"
                                >
                                  <span className="flex-1 min-w-0 truncate">
                                    {row.plus_one_name}
                                  </span>
                                  {row.plus_one_email && (
                                    <span className="text-foreground/50 text-xs shrink-0">
                                      {row.plus_one_email}
                                    </span>
                                  )}
                                  <span className="text-accent italic text-xs shrink-0">
                                    +1 {row.performer.performer_name}
                                  </span>
                                </div>
                              ))
                          )}
                        </div>
                      </details>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
                          <h5 className="font-decorative text-base text-foreground/80">
                            {t('Övriga tillägg', 'Manual additions')}
                          </h5>
                          {!vipDrafts.length && (
                            <button
                              type="button"
                              onClick={() =>
                                setVipDrafts((prev) => [...prev, blankVipEntry(selectedEventId)])
                              }
                              className="flex items-center gap-1.5 text-[11px] py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {t('Lägg till', 'Add')}
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {vipDrafts.map((d) => (
                            <VipManualEntryRow
                              key={d.id}
                              row={d}
                              isNew
                              onSave={handleSaveVipEntry}
                              onDelete={handleDeleteVipEntry}
                              onCancelNew={(id) =>
                                setVipDrafts((prev) => prev.filter((d2) => d2.id !== id))
                              }
                            />
                          ))}
                          {vipEntries.length === 0 && vipDrafts.length === 0 ? (
                            <p className="text-sm text-foreground/40 italic">
                              {t('Inga manuella tillägg ännu.', 'No manual additions yet.')}
                            </p>
                          ) : (
                            vipEntries.map((row) => (
                              <VipManualEntryRow
                                key={row.id}
                                row={row}
                                onSave={handleSaveVipEntry}
                                onDelete={handleDeleteVipEntry}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'staff' &&
                (staffRows.length === 0 ? (
                  <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
                    {t(
                      'Ingen personal eller volontärer bekräftade för detta event ännu.',
                      'No staff or volunteers confirmed for this event yet.'
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <StaffingCoverageStrip
                      staffRows={staffRows}
                      hasPrePartyPlaylist={Boolean(playlists.before_playlist?.trim())}
                      hasAfterpartyPlaylist={Boolean(playlists.afterparty_playlist?.trim())}
                    />
                    <EventMusicSection
                      key={selectedEventId}
                      prePartyPlaylist={playlists.before_playlist}
                      afterpartyPlaylist={playlists.afterparty_playlist}
                      onSavePrePartyPlaylist={handleSavePlaylist('before_playlist')}
                      onSaveAfterpartyPlaylist={handleSavePlaylist('afterparty_playlist')}
                    />
                    {/* Volunteers (with their shifts) get their own column, split out from
                        every other role that just needs filling — the two lists have very
                        different shapes (shift subgroups vs. a flat headcount) and were
                        wasting the page's new width stacked in one long column. Direct
                        feedback 2026-09-21. */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6 items-start mt-6 pt-6 border-t border-accent/10">
                      <div className="space-y-4">{renderStaffRoleSection('volunteer')}</div>
                      <div className="space-y-4">
                        {/* The DJ sits just before "Övrigt" instead of in the music section. */}
                        {[
                          ...ROLE_ORDER.filter(
                            (role) => role !== 'dj' && role !== 'volunteer' && role !== 'other'
                          ),
                          'dj' as const,
                          'other' as const,
                        ].map(renderStaffRoleSection)}
                      </div>
                    </div>
                  </div>
                ))}

              {activeTab === 'sponsors' && (
                <SponsorSlotGrid
                  sponsorRows={sponsorRows}
                  eventId={selectedEventId}
                  onRemoved={(sponsorId) =>
                    setSponsorRows((prev) => prev.filter((r) => r.sponsor_id !== sponsorId))
                  }
                  onUpdated={(sponsorId, patch) =>
                    setSponsorRows((prev) =>
                      prev.map((r) => (r.sponsor_id === sponsorId ? { ...r, ...patch } : r))
                    )
                  }
                  onMerchToggled={(sponsorId, value) =>
                    setSponsorRows((prev) =>
                      prev.map((r) =>
                        r.sponsor_id === sponsorId ? { ...r, has_merch_table: value } : r
                      )
                    )
                  }
                  onExhibitionToggled={(sponsorId, value) =>
                    setSponsorRows((prev) =>
                      prev.map((r) =>
                        r.sponsor_id === sponsorId ? { ...r, has_exhibition: value } : r
                      )
                    )
                  }
                  fetchPrizeCandidates={fetchPrizeCandidates}
                  onAddPrizeSponsor={handleAddPrizeSponsor}
                  fetchSalesCandidates={fetchSalesCandidates}
                  onAddSalesSponsor={handleAddSalesSponsor}
                  fetchExhibitionCandidates={fetchExhibitionCandidates}
                  onAddExhibitionSponsor={handleAddExhibitionSponsor}
                  fetchOtherCandidates={fetchOtherCandidates}
                  onAddOtherSponsor={handleAddOtherSponsor}
                  vipEntries={vipEntries}
                  onRequestVipForSalesperson={handleRequestVipForSalesperson}
                  onRequestVipForExhibitor={handleRequestVipForExhibitor}
                />
              )}

              {activeTab === 'info' && (
                <InfoHubTab
                  eventId={selectedEventId}
                  eventTitle={eventTitle}
                  performers={performers}
                  staffRows={staffRows}
                  acts={acts}
                />
              )}
            </div>
          )}
        </>
      )}
      {entertainerTarget && selectedEventId && (
        <EntertainerProfileModal
          eventId={selectedEventId}
          staffId={entertainerTarget.staffId}
          staffName={entertainerTarget.name}
          onClose={() => setEntertainerTarget(null)}
          onSaved={async () => setStaffRows(await getEventStaffForAdmin(selectedEventId))}
        />
      )}
    </div>
  )
}
