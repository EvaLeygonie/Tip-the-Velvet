import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import {
  getStaffVolunteers,
  getSponsors,
  getVenues,
  getClubs,
  createStaffVolunteer,
  createSponsor,
  createVenue,
  createClub,
  getStaffEventStatuses,
  getConfirmedSponsorIds,
} from '@/services/contactsService'
import { getEventVenueId } from '@/services/eventService'
import { updateRow, deleteRow } from '@/services/databaseService'
import type {
  StaffVolunteers,
  Sponsors,
  Venue,
  Club,
  StaffVolunteerType,
  SponsorType,
  CreateStaffVolunteerInput,
  CreateSponsorInput,
  CreateClubInput,
  EventStaffInvitationStatus,
} from '@/types/types'
import { ContactsToolbar } from '@/components/admin/contacts/ContactsToolbar'
import { ContactMailModal } from '@/components/admin/contacts/ContactMailModal'
import { StaffVolunteerRow } from '@/components/admin/contacts/StaffVolunteerRow'
import { SponsorRow } from '@/components/admin/contacts/SponsorRow'
import { VenueRow } from '@/components/admin/contacts/VenueRow'
import { ClubRow } from '@/components/admin/contacts/ClubRow'

const ROLE_ORDER: StaffVolunteerType[] = [
  'photographer',
  'technician',
  'dj',
  'stage_kitten',
  'entertainment',
  'volunteer',
  'doorman',
  'other',
]

const SPONSOR_TYPE_ORDER: SponsorType[] = [
  'prize',
  'creation',
  'sales',
  'promo',
  'partner',
  'other',
]

const blankStaff = (): StaffVolunteers => ({
  id: crypto.randomUUID(),
  name: '',
  email: null,
  phone: null,
  role: 'volunteer',
  role_details: null,
  link: null,
  fee: null,
  agreed_to_terms: null,
  worked_with: null,
  created_at: new Date().toISOString(),
})

const blankSponsor = (): Sponsors => ({
  id: crypto.randomUUID(),
  name: '',
  email: null,
  phone: null,
  sponsor_type: null,
  sponsor_details: null,
  logo_id: null,
  agreed_to_terms: null,
  club_id: null,
  instagram_link: null,
  other_link: null,
  created_at: new Date().toISOString(),
})

const blankVenue = (): Venue => ({
  id: crypto.randomUUID(),
  name: '',
  location: '',
  map_link: '',
  contact_person: null,
  email: null,
  phone: null,
  price: null,
  created_at: new Date().toISOString(),
})

const blankClub = (): Club => ({
  id: crypto.randomUUID(),
  name: '',
  organizers: null,
  instagram_link: null,
  website: null,
  location: null,
  region: null,
  notes: null,
  created_at: new Date().toISOString(),
})

export const AdminContacts = () => {
  const { t } = useLanguage()
  const { upcomingEvents, selectedEventId } = useCurrentEvent()
  const [activeTab, setActiveTab] = useState<'staff' | 'sponsors' | 'venues' | 'clubs'>('staff')
  const [loading, setLoading] = useState(true)

  // Local, not written back to CurrentEventContext — switching which event's status is
  // shown here shouldn't silently change what's selected on Casting/Event Planning too.
  // Defaults to the shared selection once it's loaded (CurrentEventContext fetches
  // independently of this page's own data, so it may not be ready on first render).
  const [statusEventId, setStatusEventId] = useState('')
  const [staffEventStatuses, setStaffEventStatuses] = useState<
    Record<string, EventStaffInvitationStatus>
  >({})
  const [confirmedSponsorIds, setConfirmedSponsorIds] = useState<Set<string>>(new Set())
  const [statusEventVenueId, setStatusEventVenueId] = useState<string | null>(null)

  useEffect(() => {
    const syncDefault = () => {
      if (selectedEventId && !statusEventId) setStatusEventId(selectedEventId)
    }
    syncDefault()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId])

  useEffect(() => {
    if (!statusEventId) return
    const loadStatusEventData = async () => {
      try {
        const [staffStatuses, sponsorIds, venueId] = await Promise.all([
          getStaffEventStatuses(statusEventId),
          getConfirmedSponsorIds(statusEventId),
          getEventVenueId(statusEventId),
        ])
        setStaffEventStatuses(staffStatuses)
        setConfirmedSponsorIds(sponsorIds)
        setStatusEventVenueId(venueId)
      } catch (err) {
        console.error('Kunde inte hämta eventstatus:', err)
      }
    }
    loadStatusEventData()
  }, [statusEventId])

  const [staffRows, setStaffRows] = useState<StaffVolunteers[]>([])
  const [sponsorRows, setSponsorRows] = useState<Sponsors[]>([])
  const [venueRows, setVenueRows] = useState<Venue[]>([])
  const [clubRows, setClubRows] = useState<Club[]>([])

  const [staffDrafts, setStaffDrafts] = useState<StaffVolunteers[]>([])
  const [sponsorDrafts, setSponsorDrafts] = useState<Sponsors[]>([])
  const [venueDrafts, setVenueDrafts] = useState<Venue[]>([])
  const [clubDrafts, setClubDrafts] = useState<Club[]>([])

  const [staffSearch, setStaffSearch] = useState('')
  const [staffRoleFilter, setStaffRoleFilter] = useState('')
  const [sponsorSearch, setSponsorSearch] = useState('')
  const [sponsorTypeFilter, setSponsorTypeFilter] = useState('')
  const [venueSearch, setVenueSearch] = useState('')
  const [clubSearch, setClubSearch] = useState('')
  const [clubRegionFilter, setClubRegionFilter] = useState('')

  const [mailTarget, setMailTarget] = useState<{
    name: string
    email: string
    defaultSubject: string
    defaultBody: string
  } | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [staff, sponsors, venues, clubs] = await Promise.all([
          getStaffVolunteers(),
          getSponsors(),
          getVenues(),
          getClubs(),
        ])
        setStaffRows(staff)
        setSponsorRows(sponsors)
        setVenueRows(venues)
        setClubRows(clubs)
      } catch (err) {
        console.error('Kunde inte hämta kontakter:', err)
        toast.error(t('Kunde inte läsa in kontakter.', 'Could not load contacts.'))
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const roleLabel = (role: StaffVolunteerType): string => {
    switch (role) {
      case 'photographer':
        return t('Fotograf', 'Photographer')
      case 'technician':
        return t('Tekniker', 'Technician')
      case 'dj':
        return t('DJ', 'DJ')
      case 'stage_kitten':
        return t('Stage kitten', 'Stage kitten')
      case 'entertainment':
        return t('Underhållning', 'Entertainment')
      case 'volunteer':
        return t('Volontär', 'Volunteer')
      case 'doorman':
        // Kept as 'doorman' at the DB level deliberately — see admin-portal-roadmap.md's
        // staffing redesign — the value is left free in case a paid security-guard role is
        // needed again later, but the current role is unpaid/optional door duty.
        return t('Entrévärd', 'Entrance host')
      case 'other':
        return t('Övrigt', 'Other')
    }
  }

  const sponsorTypeLabel = (type: SponsorType): string => {
    switch (type) {
      case 'prize':
        return t('Pris', 'Prize')
      case 'creation':
        return t('Skapande', 'Creation')
      case 'sales':
        return t('Försäljning', 'Sales')
      case 'promo':
        return t('Marknadsföring', 'Promo')
      case 'partner':
        return t('Partner', 'Partner')
      case 'other':
        return t('Övrigt', 'Other')
    }
  }

  const refreshStaffEventStatuses = async () => {
    if (!statusEventId) return
    try {
      const statuses = await getStaffEventStatuses(statusEventId)
      setStaffEventStatuses(statuses)
    } catch (err) {
      console.error('Kunde inte hämta eventstatus:', err)
    }
  }

  const refreshConfirmedSponsorIds = async () => {
    if (!statusEventId) return
    try {
      const ids = await getConfirmedSponsorIds(statusEventId)
      setConfirmedSponsorIds(ids)
    } catch (err) {
      console.error('Kunde inte hämta sponsorstatus:', err)
    }
  }

  const statusEvent = upcomingEvents.find((e) => e.id === statusEventId)
  const interestedCount = Object.values(staffEventStatuses).filter((s) => s === 'interested').length
  const confirmedCount = Object.values(staffEventStatuses).filter((s) => s === 'confirmed').length
  const confirmedSponsorCount = confirmedSponsorIds.size

  // Confirmed first, interested second, everything else after — within whatever grouping
  // the caller already has (role section for staff, the whole flat list for sponsors).
  const byEventStatusFirst = <T extends { id: string }>(
    rows: T[],
    statuses: Record<string, EventStaffInvitationStatus>
  ): T[] => {
    const rank = (id: string) => {
      const status = statuses[id]
      if (status === 'confirmed') return 0
      if (status === 'interested') return 1
      return 2
    }
    return [...rows].sort((a, b) => rank(a.id) - rank(b.id))
  }

  const byConfirmedFirst = <T extends { id: string }>(rows: T[], confirmedIds: Set<string>): T[] =>
    [...rows].sort((a, b) => Number(confirmedIds.has(b.id)) - Number(confirmedIds.has(a.id)))

  const roleOptions = ROLE_ORDER.map((role) => ({ value: role, label: roleLabel(role) }))
  const sponsorTypeOptions = SPONSOR_TYPE_ORDER.map((type) => ({
    value: type,
    label: sponsorTypeLabel(type),
  }))
  const clubOptions = [...clubRows]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((club) => ({ value: club.id, label: club.name }))

  const filteredStaff = staffRows.filter((r) => {
    if (staffRoleFilter && r.role !== staffRoleFilter) return false
    if (!staffSearch) return true
    const q = staffSearch.toLowerCase()
    return [r.name, r.email, r.role_details].some((f) => f?.toLowerCase().includes(q))
  })

  const filteredSponsors = sponsorRows.filter((r) => {
    if (sponsorTypeFilter && r.sponsor_type !== sponsorTypeFilter) return false
    if (!sponsorSearch) return true
    const q = sponsorSearch.toLowerCase()
    return [r.name, r.email, r.sponsor_details].some((f) => f?.toLowerCase().includes(q))
  })

  const filteredVenues = venueRows.filter((r) => {
    if (!venueSearch) return true
    const q = venueSearch.toLowerCase()
    return [r.name, r.location, r.contact_person, r.email].some((f) => f?.toLowerCase().includes(q))
  })

  const clubRegionOptions = [...new Set(clubRows.map((r) => r.region).filter((r): r is string => !!r))]
    .sort()
    .map((region) => ({ value: region, label: region }))

  const filteredClubs = clubRows.filter((r) => {
    if (clubRegionFilter && r.region !== clubRegionFilter) return false
    if (!clubSearch) return true
    const q = clubSearch.toLowerCase()
    return [r.name, r.organizers, r.location, r.notes].some((f) => f?.toLowerCase().includes(q))
  })

  // Which clubs already have a linked sponsor row (sponsors.club_id) — see ClubRow's
  // "Sponsrar oss" badge.
  const linkedClubIds = new Set(
    sponsorRows.map((r) => r.club_id).filter((id): id is string => !!id)
  )

  //=== STAFF & VOLUNTEERS handlers ===///

  const handleSaveStaff = async (id: string, patch: Partial<StaffVolunteers>, isNew: boolean) => {
    if (isNew) {
      const created = await createStaffVolunteer(
        patch as Omit<CreateStaffVolunteerInput, 'agreed_to_terms'>
      )
      setStaffDrafts((prev) => prev.filter((d) => d.id !== id))
      setStaffRows((prev) => [...prev, created])
      toast.success(t('Kontakt tillagd!', 'Contact added!'))
    } else {
      const updated = await updateRow('staff_volunteers', id, patch)
      setStaffRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
      toast.success(t('Sparat!', 'Saved!'))
    }
  }

  const handleDeleteStaff = async (id: string) => {
    await deleteRow('staff_volunteers', id)
    setStaffRows((prev) => prev.filter((r) => r.id !== id))
    toast.success(t('Raderad.', 'Deleted.'))
  }

  //=== SPONSORS handlers ===///

  const handleSaveSponsor = async (id: string, patch: Partial<Sponsors>, isNew: boolean) => {
    if (isNew) {
      const created = await createSponsor(patch as Omit<CreateSponsorInput, 'agreed_to_terms'>)
      setSponsorDrafts((prev) => prev.filter((d) => d.id !== id))
      setSponsorRows((prev) => [...prev, created])
      toast.success(t('Sponsor tillagd!', 'Sponsor added!'))
    } else {
      const updated = await updateRow('sponsors', id, patch)
      setSponsorRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
      toast.success(t('Sparat!', 'Saved!'))
    }
  }

  const handleDeleteSponsor = async (id: string) => {
    await deleteRow('sponsors', id)
    setSponsorRows((prev) => prev.filter((r) => r.id !== id))
    toast.success(t('Raderad.', 'Deleted.'))
  }

  //=== VENUES handlers ===///

  const handleSaveVenue = async (id: string, patch: Partial<Venue>, isNew: boolean) => {
    if (isNew) {
      const created = await createVenue(patch as Venue)
      setVenueDrafts((prev) => prev.filter((d) => d.id !== id))
      setVenueRows((prev) => [...prev, created])
      toast.success(t('Plats tillagd!', 'Venue added!'))
    } else {
      const updated = await updateRow('venues', id, patch)
      setVenueRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
      toast.success(t('Sparat!', 'Saved!'))
    }
  }

  const handleDeleteVenue = async (id: string) => {
    await deleteRow('venues', id)
    setVenueRows((prev) => prev.filter((r) => r.id !== id))
    toast.success(t('Raderad.', 'Deleted.'))
  }

  //=== CLUBS handlers ===///

  const handleSaveClub = async (id: string, patch: Partial<Club>, isNew: boolean) => {
    if (isNew) {
      const created = await createClub(patch as CreateClubInput)
      setClubDrafts((prev) => prev.filter((d) => d.id !== id))
      setClubRows((prev) => [...prev, created])
      toast.success(t('Klubb tillagd!', 'Club added!'))
    } else {
      const updated = await updateRow('clubs', id, patch)
      setClubRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
      toast.success(t('Sparat!', 'Saved!'))
    }
  }

  const handleDeleteClub = async (id: string) => {
    await deleteRow('clubs', id)
    setClubRows((prev) => prev.filter((r) => r.id !== id))
    toast.success(t('Raderad.', 'Deleted.'))
  }

  //=== MAIL modal ===///

  const openMailModalFor = (row: { name: string; email: string | null }) => {
    if (!row.email) return
    setMailTarget({
      name: row.name,
      email: row.email,
      defaultSubject: '',
      defaultBody: `Hej ${row.name}!\n\n\n\nVarma hälsningar,\nTip the Velvet`,
    })
  }

  const renderRoleSection = (role: StaffVolunteerType, rows: StaffVolunteers[]) => {
    if (rows.length === 0) return null
    const sectionInterested = rows.filter((r) => staffEventStatuses[r.id] === 'interested').length
    const sectionConfirmed = rows.filter((r) => staffEventStatuses[r.id] === 'confirmed').length
    return (
      <div key={role} className="space-y-3 pt-4">
        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
          <h5 className="font-decorative text-base text-foreground/80">{roleLabel(role)}</h5>
          <div className="flex items-center gap-3">
            {(sectionInterested > 0 || sectionConfirmed > 0) && (
              <span className="text-[11px] font-mono flex items-center gap-1.5">
                {sectionInterested > 0 && (
                  <span className="text-sky-400">
                    {sectionInterested} {t('intresserade', 'interested')}
                  </span>
                )}
                {sectionInterested > 0 && sectionConfirmed > 0 && (
                  <span className="text-foreground/30">·</span>
                )}
                {sectionConfirmed > 0 && (
                  <span className="text-green-400">
                    {sectionConfirmed} {t('bekräftade', 'confirmed')}
                  </span>
                )}
              </span>
            )}
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
              {rows.length}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {byEventStatusFirst(rows, staffEventStatuses).map((row) => (
            <StaffVolunteerRow
              key={row.id}
              row={row}
              roleOptions={roleOptions}
              onSave={handleSaveStaff}
              onDelete={handleDeleteStaff}
              onEmail={openMailModalFor}
              eventStatus={staffEventStatuses[row.id]}
              onEventStatusChanged={refreshStaffEventStatuses}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{t('Kontakter', 'Contacts')}</h1>
      <div className="gold-divider" />

      <div className="flex gap-2 justify-center my-6 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={
            activeTab === 'staff'
              ? 'btn-gold text-xs py-2 px-4'
              : 'btn-gold-outline text-xs py-2 px-4'
          }
        >
          {t('Personal & Volontärer', 'Staff & Volunteers')}
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
          onClick={() => setActiveTab('venues')}
          className={
            activeTab === 'venues'
              ? 'btn-gold text-xs py-2 px-4'
              : 'btn-gold-outline text-xs py-2 px-4'
          }
        >
          {t('Platser', 'Venues')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('clubs')}
          className={
            activeTab === 'clubs'
              ? 'btn-gold text-xs py-2 px-4'
              : 'btn-gold-outline text-xs py-2 px-4'
          }
        >
          {t('Klubbar', 'Clubs')}
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">
          {activeTab === 'staff' && (
            <>
              <ContactsToolbar
                searchValue={staffSearch}
                onSearchChange={setStaffSearch}
                searchPlaceholder={t(
                  'Sök namn, e-post, detaljer...',
                  'Search name, email, details...'
                )}
                filterValue={staffRoleFilter}
                onFilterChange={setStaffRoleFilter}
                filterOptions={roleOptions}
                filterAllLabel={t('Alla roller', 'All roles')}
                onAdd={() => setStaffDrafts((prev) => [blankStaff(), ...prev])}
                addLabel={t('Lägg till', 'Add')}
              />
              {upcomingEvents.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3 mt-3 mb-3 text-sm">
                  <span className="text-foreground/60">{t('Status för:', 'Status for:')}</span>
                  {upcomingEvents.length > 1 ? (
                    <select
                      value={statusEventId}
                      onChange={(e) => setStatusEventId(e.target.value)}
                      className="admin-select !text-xs"
                    >
                      {upcomingEvents.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-accent font-semibold">{statusEvent?.title}</span>
                  )}
                  <span className="text-foreground/40">•</span>
                  <span className="text-sky-400">
                    {interestedCount} {t('intresserade', 'interested')}
                  </span>
                  <span className="text-foreground/40">·</span>
                  <span className="text-green-400">
                    {confirmedCount} {t('bekräftade', 'confirmed')}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {staffDrafts.map((d) => (
                  <StaffVolunteerRow
                    key={d.id}
                    row={d}
                    isNew
                    roleOptions={roleOptions}
                    onSave={handleSaveStaff}
                    onDelete={handleDeleteStaff}
                    onEmail={openMailModalFor}
                    onCancelNew={(id) =>
                      setStaffDrafts((prev) => prev.filter((d2) => d2.id !== id))
                    }
                  />
                ))}
              </div>
              {filteredStaff.length === 0 && staffDrafts.length === 0 ? (
                <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
                  {t('Inga kontakter hittades.', 'No contacts found.')}
                </div>
              ) : (
                ROLE_ORDER.map((role) =>
                  renderRoleSection(
                    role,
                    filteredStaff.filter((r) => r.role === role)
                  )
                )
              )}
            </>
          )}

          {activeTab === 'sponsors' && (
            <>
              <ContactsToolbar
                searchValue={sponsorSearch}
                onSearchChange={setSponsorSearch}
                searchPlaceholder={t(
                  'Sök namn, e-post, detaljer...',
                  'Search name, email, details...'
                )}
                filterValue={sponsorTypeFilter}
                onFilterChange={setSponsorTypeFilter}
                filterOptions={sponsorTypeOptions}
                filterAllLabel={t('Alla typer', 'All types')}
                onAdd={() => setSponsorDrafts((prev) => [blankSponsor(), ...prev])}
                addLabel={t('Lägg till', 'Add')}
              />
              {upcomingEvents.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3 mt-3 mb-3 text-sm">
                  <span className="text-foreground/60">{t('Status för:', 'Status for:')}</span>
                  {upcomingEvents.length > 1 ? (
                    <select
                      value={statusEventId}
                      onChange={(e) => setStatusEventId(e.target.value)}
                      className="admin-select !text-xs"
                    >
                      {upcomingEvents.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-accent font-semibold">{statusEvent?.title}</span>
                  )}
                  <span className="text-foreground/40">•</span>
                  <span className="text-green-400">
                    {confirmedSponsorCount} {t('bekräftade', 'confirmed')}
                  </span>
                </div>
              )}
              <div className="space-y-3">
                {sponsorDrafts.map((d) => (
                  <SponsorRow
                    key={d.id}
                    row={d}
                    isNew
                    sponsorTypeOptions={sponsorTypeOptions}
                    clubOptions={clubOptions}
                    onSave={handleSaveSponsor}
                    onDelete={handleDeleteSponsor}
                    onEmail={openMailModalFor}
                    onCancelNew={(id) =>
                      setSponsorDrafts((prev) => prev.filter((d2) => d2.id !== id))
                    }
                  />
                ))}
                {filteredSponsors.length === 0 && sponsorDrafts.length === 0 ? (
                  <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
                    {t('Inga sponsorer hittades.', 'No sponsors found.')}
                  </div>
                ) : (
                  byConfirmedFirst(filteredSponsors, confirmedSponsorIds).map((row) => (
                    <SponsorRow
                      key={row.id}
                      row={row}
                      sponsorTypeOptions={sponsorTypeOptions}
                      clubOptions={clubOptions}
                      onSave={handleSaveSponsor}
                      onDelete={handleDeleteSponsor}
                      onEmail={openMailModalFor}
                      isConfirmedForEvent={confirmedSponsorIds.has(row.id)}
                      onConfirmed={refreshConfirmedSponsorIds}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'venues' && (
            <>
              <ContactsToolbar
                searchValue={venueSearch}
                onSearchChange={setVenueSearch}
                searchPlaceholder={t(
                  'Sök namn, plats, kontakt...',
                  'Search name, location, contact...'
                )}
                onAdd={() => setVenueDrafts((prev) => [blankVenue(), ...prev])}
                addLabel={t('Lägg till', 'Add')}
              />
              <div className="space-y-3">
                {venueDrafts.map((d) => (
                  <VenueRow
                    key={d.id}
                    row={d}
                    isNew
                    onSave={handleSaveVenue}
                    onDelete={handleDeleteVenue}
                    onEmail={openMailModalFor}
                    onCancelNew={(id) =>
                      setVenueDrafts((prev) => prev.filter((d2) => d2.id !== id))
                    }
                  />
                ))}
                {filteredVenues.length === 0 && venueDrafts.length === 0 ? (
                  <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
                    {t('Inga platser hittades.', 'No venues found.')}
                  </div>
                ) : (
                  filteredVenues.map((row) => (
                    <VenueRow
                      key={row.id}
                      row={row}
                      onSave={handleSaveVenue}
                      onDelete={handleDeleteVenue}
                      onEmail={openMailModalFor}
                      isBookedForEvent={row.id === statusEventVenueId}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'clubs' && (
            <>
              <ContactsToolbar
                searchValue={clubSearch}
                onSearchChange={setClubSearch}
                searchPlaceholder={t(
                  'Sök namn, arrangörer, plats...',
                  'Search name, organizers, location...'
                )}
                filterValue={clubRegionFilter}
                onFilterChange={setClubRegionFilter}
                filterOptions={clubRegionOptions}
                filterAllLabel={t('Alla regioner', 'All regions')}
                onAdd={() => setClubDrafts((prev) => [blankClub(), ...prev])}
                addLabel={t('Lägg till', 'Add')}
              />
              <div className="space-y-3">
                {clubDrafts.map((d) => (
                  <ClubRow
                    key={d.id}
                    row={d}
                    isNew
                    onSave={handleSaveClub}
                    onDelete={handleDeleteClub}
                    onCancelNew={(id) =>
                      setClubDrafts((prev) => prev.filter((d2) => d2.id !== id))
                    }
                  />
                ))}
                {filteredClubs.length === 0 && clubDrafts.length === 0 ? (
                  <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
                    {t('Inga klubbar hittades.', 'No clubs found.')}
                  </div>
                ) : (
                  filteredClubs.map((row) => (
                    <ClubRow
                      key={row.id}
                      row={row}
                      onSave={handleSaveClub}
                      onDelete={handleDeleteClub}
                      isLinkedSponsor={linkedClubIds.has(row.id)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      <ContactMailModal
        isOpen={!!mailTarget}
        onClose={() => setMailTarget(null)}
        recipientName={mailTarget?.name ?? ''}
        recipientEmail={mailTarget?.email ?? ''}
        defaultSubject={mailTarget?.defaultSubject ?? ''}
        defaultBody={mailTarget?.defaultBody ?? ''}
      />
    </div>
  )
}
