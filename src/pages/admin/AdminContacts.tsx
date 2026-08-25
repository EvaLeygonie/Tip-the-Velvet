import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  getStaffVolunteers,
  getSponsors,
  getVenues,
  createStaffVolunteer,
  createSponsor,
  createVenue,
} from '@/services/contactsService'
import { updateRow, deleteRow } from '@/services/databaseService'
import type {
  StaffVolunteers,
  Sponsors,
  Venue,
  StaffVolunteerType,
  SponsorType,
  CreateStaffVolunteerInput,
  CreateSponsorInput,
} from '@/types/types'
import { ContactsToolbar } from '@/components/admin/contacts/ContactsToolbar'
import { ContactMailModal } from '@/components/admin/contacts/ContactMailModal'
import { StaffVolunteerRow } from '@/components/admin/contacts/StaffVolunteerRow'
import { SponsorRow } from '@/components/admin/contacts/SponsorRow'
import { VenueRow } from '@/components/admin/contacts/VenueRow'

const ROLE_ORDER: StaffVolunteerType[] = [
  'photographer',
  'technician',
  'doorman',
  'artistic',
  'volunteer',
  'musician',
  'entertainment',
  'other',
]

const SPONSOR_TYPE_ORDER: SponsorType[] = ['prize', 'creation', 'sales', 'promo', 'partner', 'other']

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

export const AdminContacts = () => {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'staff' | 'sponsors' | 'venues'>('staff')
  const [loading, setLoading] = useState(true)

  const [staffRows, setStaffRows] = useState<StaffVolunteers[]>([])
  const [sponsorRows, setSponsorRows] = useState<Sponsors[]>([])
  const [venueRows, setVenueRows] = useState<Venue[]>([])

  const [staffDrafts, setStaffDrafts] = useState<StaffVolunteers[]>([])
  const [sponsorDrafts, setSponsorDrafts] = useState<Sponsors[]>([])
  const [venueDrafts, setVenueDrafts] = useState<Venue[]>([])

  const [staffSearch, setStaffSearch] = useState('')
  const [staffRoleFilter, setStaffRoleFilter] = useState('')
  const [sponsorSearch, setSponsorSearch] = useState('')
  const [sponsorTypeFilter, setSponsorTypeFilter] = useState('')
  const [venueSearch, setVenueSearch] = useState('')

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
        const [staff, sponsors, venues] = await Promise.all([
          getStaffVolunteers(),
          getSponsors(),
          getVenues(),
        ])
        setStaffRows(staff)
        setSponsorRows(sponsors)
        setVenueRows(venues)
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
      case 'doorman':
        return t('Vakt', 'Doorman')
      case 'artistic':
        return t('Konstnärlig', 'Artistic')
      case 'volunteer':
        return t('Volontär', 'Volunteer')
      case 'musician':
        return t('Musiker', 'Musician')
      case 'entertainment':
        return t('Underhållning', 'Entertainment')
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

  const roleOptions = ROLE_ORDER.map((role) => ({ value: role, label: roleLabel(role) }))
  const sponsorTypeOptions = SPONSOR_TYPE_ORDER.map((type) => ({
    value: type,
    label: sponsorTypeLabel(type),
  }))

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
    return (
      <div key={role} className="space-y-3 pt-4">
        <div className="flex items-center justify-between border-b border-accent/10 pb-2">
          <h5 className="font-decorative text-base text-foreground/80">{roleLabel(role)}</h5>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border bg-accent/10 border-accent/30 text-accent">
            {rows.length}
          </span>
        </div>
        <div className="space-y-3">
          {rows.map((row) => (
            <StaffVolunteerRow
              key={row.id}
              row={row}
              roleOptions={roleOptions}
              onSave={handleSaveStaff}
              onDelete={handleDeleteStaff}
              onEmail={openMailModalFor}
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
          className={activeTab === 'staff' ? 'btn-gold text-xs py-2 px-4' : 'btn-gold-outline text-xs py-2 px-4'}
        >
          {t('Personal & Volontärer', 'Staff & Volunteers')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sponsors')}
          className={
            activeTab === 'sponsors' ? 'btn-gold text-xs py-2 px-4' : 'btn-gold-outline text-xs py-2 px-4'
          }
        >
          {t('Sponsorer', 'Sponsors')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('venues')}
          className={
            activeTab === 'venues' ? 'btn-gold text-xs py-2 px-4' : 'btn-gold-outline text-xs py-2 px-4'
          }
        >
          {t('Platser', 'Venues')}
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
                    onCancelNew={(id) => setStaffDrafts((prev) => prev.filter((d2) => d2.id !== id))}
                  />
                ))}
              </div>
              {filteredStaff.length === 0 && staffDrafts.length === 0 ? (
                <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
                  {t('Inga kontakter hittades.', 'No contacts found.')}
                </div>
              ) : (
                ROLE_ORDER.map((role) => renderRoleSection(role, filteredStaff.filter((r) => r.role === role)))
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
              <div className="space-y-3">
                {sponsorDrafts.map((d) => (
                  <SponsorRow
                    key={d.id}
                    row={d}
                    isNew
                    sponsorTypeOptions={sponsorTypeOptions}
                    onSave={handleSaveSponsor}
                    onDelete={handleDeleteSponsor}
                    onEmail={openMailModalFor}
                    onCancelNew={(id) => setSponsorDrafts((prev) => prev.filter((d2) => d2.id !== id))}
                  />
                ))}
                {filteredSponsors.length === 0 && sponsorDrafts.length === 0 ? (
                  <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
                    {t('Inga sponsorer hittades.', 'No sponsors found.')}
                  </div>
                ) : (
                  filteredSponsors.map((row) => (
                    <SponsorRow
                      key={row.id}
                      row={row}
                      sponsorTypeOptions={sponsorTypeOptions}
                      onSave={handleSaveSponsor}
                      onDelete={handleDeleteSponsor}
                      onEmail={openMailModalFor}
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
                    onCancelNew={(id) => setVenueDrafts((prev) => prev.filter((d2) => d2.id !== id))}
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
