import { useState, useEffect } from 'react'
import { UtensilsCrossed, Download, FileText, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrentEvent } from '@/contexts/CurrentEventContext'
import { EventPicker } from '@/components/admin/EventPicker'
import {
  getEventPerformersForAdmin,
  getEventStaffForAdmin,
  getEventSponsorsForAdmin,
  getEventActsForAdmin,
  getEventAfterpartyPlaylist,
  updatePerformerActOrder,
  updateEventPerformerDietary,
  updateEvent,
} from '@/services/eventService'
import type {
  AdminEventPerformerRow,
  AdminEventStaffRow,
  AdminEventSponsorRow,
  AdminEventActRow,
} from '@/services/eventService'
import { getVipManualEntries, createVipManualEntry } from '@/services/vipListService'
import { updateRow, deleteRow } from '@/services/databaseService'
import {
  getStaffVolunteers,
  getSponsors,
  confirmStaffForEvent,
  confirmSponsorForEvent,
  setSponsorMerchTable,
} from '@/services/contactsService'
import { staffRoleLabel, vipCategoryLabel, dietaryCategoryLabel } from '@/lib/contactLabels'
import { EventStaffRow } from '@/components/admin/event-plan/EventStaffRow'
import { AfterpartySection } from '@/components/admin/event-plan/AfterpartySection'
import { VolunteerShiftGroups } from '@/components/admin/event-plan/VolunteerShiftGroups'
import { SponsorSlotGrid } from '@/components/admin/event-plan/SponsorSlotGrid'
import {
  InlineAddPicker,
  type InlineAddPickerItem,
} from '@/components/admin/event-plan/InlineAddPicker'
import { VipManualEntryRow } from '@/components/admin/event-plan/VipManualEntryRow'
import { EventProgressOverview } from '@/components/admin/event-plan/EventProgressOverview'
import type { EventPlanTab } from '@/components/admin/event-plan/EventProgressOverview'
import { StaffingCoverageStrip } from '@/components/admin/event-plan/StaffingCoverageStrip'
import { ShowPlanningActRow } from '@/components/admin/event-plan/ShowPlanningActRow'
import { DietaryCategoryPicker } from '@/components/admin/event-plan/DietaryCategoryPicker'
import {
  STANDING_ORGANIZERS,
  VIP_CATEGORY_ORDER,
  ROLE_ORDER,
} from '@/components/admin/event-plan/constants'
import type {
  VipManualEntry,
  CreateVipManualEntryInput,
  DietaryCategory,
  StaffVolunteerType,
} from '@/types/types'

interface VipListItem {
  name: string
  email?: string | null
  sub?: string
}

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
const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const AdminEventPlan = () => {
  const { t } = useLanguage()
  const { selectedEventId, upcomingEvents } = useCurrentEvent()
  const [activeTab, setActiveTab] = useState<EventPlanTab>('staff')
  const [performers, setPerformers] = useState<AdminEventPerformerRow[]>([])
  const [acts, setActs] = useState<AdminEventActRow[]>([])
  const [staffRows, setStaffRows] = useState<AdminEventStaffRow[]>([])
  const [sponsorRows, setSponsorRows] = useState<AdminEventSponsorRow[]>([])
  const [vipEntries, setVipEntries] = useState<VipManualEntry[]>([])
  const [vipDrafts, setVipDrafts] = useState<VipManualEntry[]>([])
  const [loading, setLoading] = useState(false)
  // CurrentEventContext only carries id/title/event_start (a deliberately narrow shared
  // query — see getEventVenueId's comment in eventService.ts for the same pattern), so
  // afterparty_playlist needs its own dedicated fetch here, same as venue_id does elsewhere.
  const [afterpartyPlaylist, setAfterpartyPlaylist] = useState<string | null>(null)

  const handleSaveAfterpartyPlaylist = async (value: string) => {
    const trimmed = value.trim()
    await updateEvent(selectedEventId, { afterparty_playlist: trimmed || null })
    setAfterpartyPlaylist(trimmed || null)
  }

  useEffect(() => {
    if (!selectedEventId) return

    const load = async () => {
      setLoading(true)
      try {
        const [performersData, actsData, staff, sponsors, vip, playlist] = await Promise.all([
          getEventPerformersForAdmin(selectedEventId),
          getEventActsForAdmin(selectedEventId),
          getEventStaffForAdmin(selectedEventId),
          getEventSponsorsForAdmin(selectedEventId),
          getVipManualEntries(selectedEventId),
          getEventAfterpartyPlaylist(selectedEventId),
        ])
        setPerformers(performersData.performers)
        setActs(actsData)
        setStaffRows(staff)
        setSponsorRows(sponsors)
        setVipEntries(vip)
        setAfterpartyPlaylist(playlist)
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
  const handleStaffRowUpdated = (id: string, patch: Partial<AdminEventStaffRow>) =>
    setStaffRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  // Bemanning's per-section "+" pickers — confirms an existing contact straight into that
  // role without leaving Event Planning for Contacts. Refetches the whole staff list
  // afterward rather than constructing the joined row locally (confirmStaffForEvent only
  // returns void) — a full reload is simplest for a rare, deliberate action like this.
  const fetchStaffCandidatesForRole =
    (role: StaffVolunteerType) => async (): Promise<InlineAddPickerItem[]> => {
      const all = await getStaffVolunteers()
      const alreadyIds = new Set(staffRows.filter((r) => r.role === role).map((r) => r.staff.id))
      return all
        .filter((c) => !alreadyIds.has(c.id))
        .map((c) => ({ id: c.id, label: c.name, sublabel: c.email }))
    }
  const handleAddStaffToRole =
    (role: StaffVolunteerType) =>
    async (item: InlineAddPickerItem): Promise<void> => {
      await confirmStaffForEvent(selectedEventId, item.id, item.label, role, null, null)
      setStaffRows(await getEventStaffForAdmin(selectedEventId))
      toast.success(t('Tillagd!', 'Added!'))
    }
  const fetchDjCandidates = fetchStaffCandidatesForRole('dj')
  const handleAddDj = handleAddStaffToRole('dj')

  // Sponsors tab's equivalents — Pris-sponsorer confirms straight into role: 'prize'.
  // Sales is independent of role (see SponsorSlotGrid.tsx's own comment): picking someone
  // already confirmed under some other role just flips has_merch_table, without touching
  // their role; picking someone brand new to the event confirms them with role: 'sales'
  // (their most likely actual relationship) and sets the flag in the same action.
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
    if (alreadyConfirmed) {
      await setSponsorMerchTable(selectedEventId, item.id, true)
    } else {
      await confirmSponsorForEvent(selectedEventId, item.id, 'sales', null)
      await setSponsorMerchTable(selectedEventId, item.id, true)
    }
    setSponsorRows(await getEventSponsorsForAdmin(selectedEventId))
    toast.success(t('Tillagd!', 'Added!'))
  }

  // A merch table means salespeople on-site — nudges the board toward the VIP list rather
  // than enforcing it, matching this app's "no stored requirement system" philosophy.
  // Switches to the VIP tab and drops in a pre-noted blank draft; the admin still fills in
  // the actual name(s).
  const handleRequestVipForSalesperson = (sponsorName: string) => {
    setVipDrafts((prev) => [
      ...prev,
      {
        ...blankVipEntry(selectedEventId),
        note: t(`Säljare — ${sponsorName}`, `Salesperson — ${sponsorName}`),
      },
    ])
    setActiveTab('vip')
  }

  const handleMoveAct = async (index: number, direction: -1 | 1) => {
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= acts.length) return
    const a = acts[index]
    const b = acts[otherIndex]
    try {
      await Promise.all([
        updatePerformerActOrder(a.id, b.display_order),
        updatePerformerActOrder(b.id, a.display_order),
      ])
      setActs((prev) => {
        const next = [...prev]
        next[index] = { ...a, display_order: b.display_order }
        next[otherIndex] = { ...b, display_order: a.display_order }
        return next.sort((x, y) => x.display_order - y.display_order)
      })
    } catch (err) {
      toast.error(t('Kunde inte ändra ordning.', 'Could not reorder.'))
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

  // Shared by both export formats below, so the two never drift out of sync with each
  // other (or with the on-screen list above).
  const buildVipSections = (): { title: string; items: VipListItem[] }[] => [
    {
      title: t('Arrangörer', 'Organizers'),
      items: STANDING_ORGANIZERS.map((o) => ({ name: o.name, email: o.email })),
    },
    {
      title: t('Artister', 'Artists'),
      items: performers.map((p) => ({
        name: p.performer.performer_name,
        email: p.performer.email,
      })),
    },
    {
      title: t('Arbetare & volontärer', 'Staff & volunteers'),
      items: staffRows.map((r) => ({
        name: r.staff.name,
        email: r.staff.email,
        sub: staffRoleLabel(t, r.role),
      })),
    },
    {
      title: t('Artisternas +1', "Artists' +1"),
      items: performers
        .filter((p) => p.plus_one_name)
        .map((p) => ({
          name: p.plus_one_name as string,
          email: p.plus_one_email,
          sub: `+1 ${p.performer.performer_name}`,
        })),
    },
    ...VIP_CATEGORY_ORDER.map((category) => ({
      title: vipCategoryLabel(t, category),
      items: vipEntries
        .filter((e) => e.category === category)
        .map((e) => ({ name: e.name, email: e.email })),
    })),
  ]

  // An A4-formatted HTML document with a real (if per-device, not synced) checkbox next to
  // every name, saved straight to disk so it can be printed, reopened, or sent to someone
  // else — not just a plain-text list. No PDF library needed for *this* format — just
  // print-oriented CSS (@page size: A4); whoever opens the saved file can print it (or
  // "Print to PDF") straight from their own browser's print dialog. Separate on-screen
  // padding/max-width from the print `@page` margin — `@page` only applies once actually
  // printing, so without this the file looks fine on paper but edge-to-edge and cramped
  // when just opened and viewed in a browser (e.g. on an iPad at the door).
  const handleDownloadVipList = () => {
    const eventTitle = upcomingEvents.find((e) => e.id === selectedEventId)?.title ?? 'Event'

    const section = (title: string, items: VipListItem[]) => {
      if (items.length === 0) return ''
      return `
        <h2>${escapeHtml(title)}</h2>
        <ul>
          ${items
            .map(
              (item) => `
            <li>
              <input type="checkbox" class="checkbox" />
              <span class="name">${escapeHtml(item.name)}</span>
              ${item.email ? `<span class="email">${escapeHtml(item.email)}</span>` : ''}
              ${item.sub ? `<span class="sub">${escapeHtml(item.sub)}</span>` : ''}
            </li>`
            )
            .join('')}
        </ul>`
    }

    const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(t('VIP-lista', 'VIP list'))} — ${escapeHtml(eventTitle)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a;
    margin: 0; padding: 32px 20px 64px; background: #faf9f7;
  }
  .page { max-width: 640px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 18px; }
  h2 {
    font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1px solid #999; padding-bottom: 4px;
    margin: 20px 0 8px; break-after: avoid;
  }
  ul { list-style: none; margin: 0; padding: 0; }
  li {
    display: flex; align-items: center; gap: 10px; padding: 6px 2px;
    border-bottom: 1px dotted #ccc; break-inside: avoid; font-size: 13px;
  }
  .checkbox {
    -webkit-appearance: none; appearance: none;
    width: 15px; height: 15px; margin: 0; border: 1.4px solid #333; flex-shrink: 0;
    border-radius: 2px; cursor: pointer;
  }
  .checkbox:checked {
    background: #333;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>');
    background-repeat: no-repeat; background-position: center;
  }
  .name { font-weight: 600; }
  .email { color: #777; font-size: 11px; }
  .sub { color: #a67c00; font-size: 11px; font-style: italic; margin-left: auto; }
  @media print {
    body { padding: 0; background: none; }
    .page { max-width: none; margin: 0; }
  }
</style>
</head>
<body>
  <div class="page">
    <h1>${escapeHtml(t('VIP-lista', 'VIP list'))}</h1>
    <div class="subtitle">${escapeHtml(eventTitle)}</div>
    ${buildVipSections()
      .map((s) => section(s.title, s.items))
      .join('')}
  </div>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${eventTitle}-vip-lista.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // A real, vector PDF (not a rasterized screenshot of the HTML version) — built directly
  // with jsPDF's own text/rect drawing API rather than pulling in html2canvas as a second
  // dependency just to convert the HTML version, since the layout here is simple enough
  // (headers + rows) to lay out by hand.
  const handleDownloadVipListPdf = () => {
    const eventTitle = upcomingEvents.find((e) => e.id === selectedEventId)?.title ?? 'Event'
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const margin = 18
    const pageWidth = 210
    const pageBottom = 280
    let y = margin

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(20)
    doc.text(t('VIP-lista', 'VIP list'), margin, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(120)
    doc.text(eventTitle, margin, y)
    y += 10

    for (const sectionData of buildVipSections()) {
      if (sectionData.items.length === 0) continue

      if (y > pageBottom - 15) {
        doc.addPage()
        y = margin
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(20)
      doc.text(sectionData.title.toUpperCase(), margin, y)
      doc.setDrawColor(180)
      doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5)
      y += 7

      for (const item of sectionData.items) {
        if (y > pageBottom) {
          doc.addPage()
          y = margin
        }
        doc.setDrawColor(50)
        doc.rect(margin, y - 3.5, 4, 4)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(20)
        doc.text(item.name, margin + 7, y)

        if (item.email) {
          const nameWidth = doc.getTextWidth(item.name)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8.5)
          doc.setTextColor(130)
          doc.text(item.email, margin + 7 + nameWidth + 4, y)
        }
        if (item.sub) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(8.5)
          doc.setTextColor(166, 124, 0)
          doc.text(item.sub, pageWidth - margin, y, { align: 'right' })
        }
        y += 6.5
      }
      y += 4
    }

    doc.save(`${eventTitle}-vip-lista.pdf`)
  }

  // Same computation the progress overview's "Mat" card does — repeated here (not shared
  // via a prop) since it's one small derived line, not worth threading through a callback.
  const foodPeople: (DietaryCategory | null)[] = [
    ...performers.map((p) => p.dietary_category),
    ...staffRows.filter((r) => r.needs_food).map((r) => r.dietary_category),
  ]
  const foodNeedsCategorizing = foodPeople.some((c) => !c)
  const foodCounts: Record<DietaryCategory, number> = { all_eater: 0, vegetarian: 0, vegan: 0 }
  foodPeople.forEach((c) => {
    if (c) foodCounts[c]++
  })
  const foodCountsSummary = (['all_eater', 'vegetarian', 'vegan'] as DietaryCategory[])
    .filter((c) => foodCounts[c] > 0)
    .map((c) => `${foodCounts[c]} ${dietaryCategoryLabel(t, c).toLowerCase()}`)
    .join(', ')
  const foodSummaryLine =
    foodPeople.length === 0
      ? t('Mat: ingen att kategorisera än.', 'Food: nobody to categorize yet.')
      : foodNeedsCategorizing
        ? t(
            'Mat: vissa saknar fortfarande kategori (se Artister/Bemanning).',
            'Food: some still need a category (see Artists/Staffing).'
          )
        : t(`Mat: ${foodCountsSummary}.`, `Food: ${foodCountsSummary}.`)

  return (
    <div className="page-shell">
      <div className="bg-glow-spot" />
      <h1>{t('Eventplan', 'Event Plan')}</h1>
      <div className="gold-divider" />

      <EventPicker />

      {selectedEventId && (
        <>
          {!loading && (
            <div className="max-w-5xl mx-auto mt-6">
              <EventProgressOverview
                performers={performers}
                acts={acts}
                staffRows={staffRows}
                sponsorRows={sponsorRows}
                vipEntries={vipEntries}
                onSelectTab={setActiveTab}
              />
            </div>
          )}

          <div className="flex gap-2 justify-center mb-6 flex-wrap">
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
              onClick={() => setActiveTab('show')}
              className={
                activeTab === 'show'
                  ? 'btn-gold text-xs py-2 px-4'
                  : 'btn-gold-outline text-xs py-2 px-4'
              }
            >
              {t('Showplanering', 'Show Planning')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('artists')}
              className={
                activeTab === 'artists'
                  ? 'btn-gold text-xs py-2 px-4'
                  : 'btn-gold-outline text-xs py-2 px-4'
              }
            >
              {t('Artister', 'Artists')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vip')}
              className={
                activeTab === 'vip'
                  ? 'btn-gold text-xs py-2 px-4'
                  : 'btn-gold-outline text-xs py-2 px-4'
              }
            >
              {t('VIP & Mat', 'VIP & Food')}
            </button>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-4">
              {activeTab === 'artists' &&
                (performers.length === 0 ? (
                  <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
                    {t(
                      'Inga bekräftade artister för detta event ännu.',
                      'No confirmed artists for this event yet.'
                    )}
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-2">
                    {performers.map((row) => (
                      <div
                        key={row.performer_id}
                        className="admin-panel velvet-surface p-3 flex items-center gap-3"
                      >
                        <span className="font-decorative text-sm text-foreground flex-1 min-w-0 truncate">
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
                        {row.dietary_requirements && (
                          <span
                            title={row.dietary_requirements}
                            className="flex items-center gap-1.5 text-xs text-foreground/60 italic min-w-0"
                          >
                            <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-accent/50" />
                            <span className="truncate max-w-[120px]">
                              {row.dietary_requirements}
                            </span>
                          </span>
                        )}
                        <DietaryCategoryPicker
                          value={row.dietary_category}
                          onChange={(value) =>
                            handleUpdatePerformerDietary(row.performer_id, value)
                          }
                          className="shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                ))}

              {activeTab === 'show' &&
                (acts.length === 0 ? (
                  <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
                    {t(
                      'Inga akter registrerade för detta event ännu.',
                      'No acts registered for this event yet.'
                    )}
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-2">
                    {acts.map((row, index) => (
                      <ShowPlanningActRow
                        key={row.id}
                        row={row}
                        position={index + 1}
                        isFirst={index === 0}
                        isLast={index === acts.length - 1}
                        onMoveUp={() => handleMoveAct(index, -1)}
                        onMoveDown={() => handleMoveAct(index, 1)}
                        onUpdated={(id, patch) =>
                          setActs((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
                        }
                      />
                    ))}
                  </div>
                ))}

              {activeTab === 'staff' &&
                (staffRows.length === 0 ? (
                  <div className="callout-panel italic text-center text-foreground/40 bg-black/10 border-dashed border-accent/10 py-8">
                    {t(
                      'Ingen personal eller volontärer bekräftade för detta event ännu.',
                      'No staff or volunteers confirmed for this event yet.'
                    )}
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-4">
                    <StaffingCoverageStrip
                      staffRows={staffRows}
                      hasPlaylist={Boolean(afterpartyPlaylist?.trim())}
                    />
                    <AfterpartySection
                      key={selectedEventId}
                      djRows={staffRows.filter((r) => r.role === 'dj')}
                      eventId={selectedEventId}
                      playlist={afterpartyPlaylist}
                      onRemoved={handleStaffRowRemoved}
                      onUpdated={handleStaffRowUpdated}
                      onSavePlaylist={handleSaveAfterpartyPlaylist}
                      fetchDjCandidates={fetchDjCandidates}
                      onAddDj={handleAddDj}
                    />
                    {ROLE_ORDER.filter((role) => role !== 'dj').map((role) => {
                      const rows = staffRows.filter((r) => r.role === role)
                      // Distinct people for the badge count — a volunteer on 2 shifts
                      // produces 2 rows here but is still 1 person (same reasoning as
                      // StaffingCoverageStrip/EventProgressOverview); every other role can
                      // only ever hold 1 row per person already, so this is a no-op there.
                      const distinctCount = new Set(rows.map((r) => r.staff.id)).size

                      return (
                        <div key={role} className="space-y-2 pt-2">
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
                                emptyMessage={t(
                                  'Inga fler kontakter att lägga till.',
                                  'No more contacts to add.'
                                )}
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
                              onRemoved={handleStaffRowRemoved}
                              onUpdated={handleStaffRowUpdated}
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
                    })}
                  </div>
                ))}

              {activeTab === 'sponsors' && (
                <div className="max-w-3xl mx-auto">
                  <SponsorSlotGrid
                    sponsorRows={sponsorRows}
                    eventId={selectedEventId}
                    onRemoved={(sponsorId) =>
                      setSponsorRows((prev) => prev.filter((r) => r.sponsor_id !== sponsorId))
                    }
                    onUpdated={(sponsorId, details) =>
                      setSponsorRows((prev) =>
                        prev.map((r) => (r.sponsor_id === sponsorId ? { ...r, details } : r))
                      )
                    }
                    onMerchToggled={(sponsorId, value) =>
                      setSponsorRows((prev) =>
                        prev.map((r) =>
                          r.sponsor_id === sponsorId ? { ...r, has_merch_table: value } : r
                        )
                      )
                    }
                    fetchPrizeCandidates={fetchPrizeCandidates}
                    onAddPrizeSponsor={handleAddPrizeSponsor}
                    fetchSalesCandidates={fetchSalesCandidates}
                    onAddSalesSponsor={handleAddSalesSponsor}
                    onRequestVipForSalesperson={handleRequestVipForSalesperson}
                  />
                </div>
              )}

              {activeTab === 'vip' && (
                <div className="max-w-3xl mx-auto space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm text-foreground/70">
                      <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-accent/50" />
                      {foodSummaryLine}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadVipList}
                        className="flex items-center gap-1.5 text-xs py-2 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t('Ladda ner VIP-lista (A4)', 'Download VIP list (A4)')}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadVipListPdf}
                        className="flex items-center gap-1.5 text-xs py-2 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {t('Ladda ner som PDF', 'Download as PDF')}
                      </button>
                    </div>
                  </div>

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
                        {staffRows.length}
                      </span>
                    </summary>
                    <div className="space-y-2 pt-2">
                      {staffRows.length === 0 ? (
                        <p className="text-sm text-foreground/40 italic">
                          {t('Ingen personal bekräftad ännu.', 'No staff confirmed yet.')}
                        </p>
                      ) : (
                        staffRows.map((row) => (
                          <div
                            key={row.id}
                            className="admin-panel velvet-surface p-3 flex items-center gap-3 text-sm text-foreground"
                          >
                            <span className="flex-1 min-w-0 truncate">{row.staff.name}</span>
                            {row.staff.email && (
                              <span className="text-foreground/50 text-xs shrink-0">
                                {row.staff.email}
                              </span>
                            )}
                            <span className="text-accent italic text-xs shrink-0">
                              {staffRoleLabel(t, row.role)}
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
                              <span className="flex-1 min-w-0 truncate">{row.plus_one_name}</span>
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
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
