import { jsPDF } from 'jspdf'
import { toast } from 'sonner'
import { groupStaffRowsByPerson } from '@/lib/staffRowGrouping'
import { parseActTracks, trackFileUrl } from '@/lib/actMusic'
import { staffPersonRoleSummary, vipCategoryLabel } from '@/lib/contactLabels'
import { createMusicZipLink } from '@/services/musicZipService'
import {
  FIXED_STAFF_ROLES,
  STANDING_ORGANIZERS,
  VIP_CATEGORY_ORDER,
} from '@/components/admin/event-plan/constants'
import JSZip from 'jszip'
import { buildFoodRoster } from '@/lib/foodRoster'
import { dietaryCategoryLabel, staffRoleLabel } from '@/lib/contactLabels'
import { getVipManualEntries } from '@/services/vipListService'
import {
  getEventOrganizerFood,
  getEventScheduleInfo,
  type AdminEventActRow,
  type AdminEventOrganizerFoodRow,
  type AdminEventPerformerRow,
  type EventScheduleInfo,
} from '@/services/eventService'
import type { VipManualEntry } from '@/types/types'

// The printable show documents (VIP list, stage kittens' set list, technician's sound & light
// sheet). Pure builders over plain data so both the Event Plan page's own buttons and the
// Dashboard's "download everything" button produce exactly the same files.
export interface EventDocContext {
  t: (sv: string, eng: string) => string
  eventTitle: string
  // ISO timestamp — only used to name the music ZIP.
  eventStart?: string | null
  acts: AdminEventActRow[]
  performers: AdminEventPerformerRow[]
  groupedStaff: ReturnType<typeof groupStaffRowsByPerson>
  vipEntries: VipManualEntry[]
  organizers: AdminEventOrganizerFoodRow[]
  eventInfo: EventScheduleInfo | null
}

export interface GeneratedDocument {
  doc: jsPDF
  fileName: string
}

export interface VipListItem {
  name: string
  email?: string | null
  sub?: string
}

export interface VipSection {
  title: string
  items: VipListItem[]
}

// Shared by both export formats below, so the two never drift out of sync with each
// other (or with the on-screen list above).

export const buildVipSections = (ctx: EventDocContext): VipSection[] => {
  const { t, performers, groupedStaff, vipEntries } = ctx
  return [
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
      items: groupedStaff.map((p) => ({
        name: p.staff.name,
        email: p.staff.email,
        sub: staffPersonRoleSummary(t, p.rows),
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
}

// A real, vector PDF (not a rasterized screenshot of the HTML version) — built directly
// with jsPDF's own text/rect drawing API rather than pulling in html2canvas as a second
// dependency just to convert the HTML version, since the layout here is simple enough
// (headers + rows) to lay out by hand.
export const createVipListPdf = (ctx: EventDocContext): GeneratedDocument => {
  const { t, eventTitle } = ctx
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

  for (const sectionData of buildVipSections(ctx)) {
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

  return { doc, fileName: `${eventTitle}-vip-lista.pdf` }
}

// Acts are already in running order via getEventActsForAdmin's query — no separate
// "sections" builder needed like the VIP list's (there's only ever one list here), but
// both export formats below still read from this one spot so they can't drift apart.
// Two separate documents now (direct feedback 2026-09-21) — one for stage kittens (running
// order + prep/pickup + a blank line to hand-write on), one for the technician (light/sound
// notes only). Both walk the acts in the same Set 1 / break / Set 2 grouping the Show tab
// itself uses, with one continuous position count spanning both sets.
export const buildSetListSections = (ctx: EventDocContext) => {
  const { t, acts } = ctx
  return [
    { label: t('Set 1', 'Set 1'), rows: acts.filter((a) => a.set_number === 1), offset: 0 },
    {
      label: t('Set 2', 'Set 2'),
      rows: acts.filter((a) => a.set_number === 2),
      offset: acts.filter((a) => a.set_number === 1).length,
    },
  ]
}

// Hand-drawn jsPDF table layout, matching the structure of the org's own historical set
// list documents (each act as a bordered 2-column table: an Artist/Act header row, then a
// label/value row each for stage prep, pick-up/cleaning, and a blank Anteckningar row for
// stage kittens to hand-write on) — direct feedback 2026-09-21, replacing the previous
// plain-text layout.
export const createStageKittenPdf = (ctx: EventDocContext): GeneratedDocument => {
  const { t, eventTitle } = ctx
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 18
  const pageWidth = 210
  const contentWidth = pageWidth - margin * 2
  const pageBottom = 280
  const lineHeight = 4.3
  const cellPad = 2.2
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20)
  doc.text(t('Set List', 'Set List'), margin, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(120)
  doc.text(eventTitle, margin, y)
  y += 10

  const ensureSpace = (needed: number) => {
    if (y + needed > pageBottom) {
      doc.addPage()
      y = margin
    }
  }

  // One bordered two-column row — sized to whichever cell needs more wrapped lines, so a
  // long note doesn't overflow its box.
  const drawRow = (
    leftText: string,
    rightText: string,
    leftWidth: number,
    opts: { bold?: boolean; italicLeft?: boolean; minHeight?: number } = {}
  ) => {
    const rightWidth = contentWidth - leftWidth
    const leftLines = doc.splitTextToSize(leftText, leftWidth - cellPad * 2) as string[]
    const rightLines = rightText
      ? (doc.splitTextToSize(rightText, rightWidth - cellPad * 2) as string[])
      : []
    const linesNeeded = Math.max(leftLines.length, rightLines.length, 1)
    const rowHeight = Math.max(linesNeeded * lineHeight + cellPad * 2, opts.minHeight ?? 0)
    ensureSpace(rowHeight)

    doc.setDrawColor(180)
    doc.rect(margin, y, leftWidth, rowHeight)
    doc.rect(margin + leftWidth, y, rightWidth, rowHeight)

    doc.setFont('helvetica', opts.bold ? 'bold' : opts.italicLeft ? 'italic' : 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(20)
    doc.text(leftLines, margin + cellPad, y + cellPad + 3)

    if (rightLines.length > 0) {
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
      doc.setTextColor(40)
      doc.text(rightLines, margin + leftWidth + cellPad, y + cellPad + 3)
    }

    y += rowHeight
  }

  buildSetListSections(ctx).forEach((section, sectionIndex) => {
    if (section.rows.length === 0) return
    if (sectionIndex > 0) {
      ensureSpace(12)
      doc.setFont('helvetica', 'bolditalic')
      doc.setFontSize(11)
      doc.setTextColor(166, 124, 0)
      doc.text(t('— PAUS —', '— BREAK —'), pageWidth / 2, y, { align: 'center' })
      y += 9
    }
    ensureSpace(10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(20)
    doc.text(section.label, margin, y)
    y += 7

    const headerLeftWidth = contentWidth / 2
    const labelWidth = 46

    section.rows.forEach((row, index) => {
      ensureSpace(6)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(166, 124, 0)
      doc.text(`${section.offset + index + 1}.`, margin, y)
      y += 5

      if (row.performer) {
        drawRow(
          `${t('Artist', 'Artist')}: ${row.performer.performer_name}`,
          `${t('Akt', 'Act')}: ${row.act_name}`,
          headerLeftWidth,
          { bold: true }
        )
      } else {
        drawRow(
          t('Moment', 'Segment'),
          row.act_name || t('(Namnlöst)', '(Untitled)'),
          headerLeftWidth,
          { bold: true }
        )
      }

      drawRow(
        t('Scenförberedelser:', 'Stage preparations:'),
        row.stage_preparations ?? '',
        labelWidth,
        { italicLeft: true }
      )
      drawRow(
        t('Plockning/städning:', 'Pick up/cleaning:'),
        row.pick_up_cleaning ?? '',
        labelWidth,
        { italicLeft: true }
      )
      drawRow(t('Anteckningar:', 'Notes:'), '', labelWidth, { italicLeft: true, minHeight: 16 })

      y += 6
    })
  })

  return { doc, fileName: `${eventTitle}-set-list.pdf` }
}

// Every uploaded sound file in running order, bundled into one ZIP the sound & light PDF links
// to at the top (the per-song links further down stay too). A ZIP failure never blocks the
// PDF — it just returns null.
export const createTechMusicZip = async (
  ctx: EventDocContext,
  onBusy?: (busy: boolean) => void
): Promise<{ url: string; included: number } | null> => {
  const { t, eventTitle, eventStart } = ctx
  const zipEntries = buildSetListSections(ctx).flatMap((section) =>
    section.rows.flatMap((row, index) =>
      row.performer
        ? parseActTracks(row.audio_files).flatMap((track) => {
            const url = trackFileUrl(track)
            if (!url) return []
            const name = [
              section.offset + index + 1,
              row.performer?.performer_name,
              row.act_name,
              track.fileName ?? track.title,
            ].join(' - ')
            return [{ name, url }]
          })
        : []
    )
  )
  if (zipEntries.length === 0) return null

  // Name the file gets when downloaded, e.g. "Pandaemonium - 2026-10-24.zip".
  const zipDownloadName = `${eventTitle}${eventStart ? ` - ${eventStart.slice(0, 10)}` : ''}.zip`
  onBusy?.(true)
  const toastId = toast.loading(t('Samlar musikfilerna...', 'Gathering the music files...'))
  try {
    const zip = await createMusicZipLink(eventTitle, zipEntries, zipDownloadName)
    toast.dismiss(toastId)
    if (zip.failed.length > 0) {
      toast.warning(
        t(
          `${zip.failed.length} fil(er) kunde inte läggas i ZIP-filen: ${zip.failed.join(', ')}`,
          `${zip.failed.length} file(s) couldn't be added to the ZIP: ${zip.failed.join(', ')}`
        )
      )
    }
    return zip
  } catch (err) {
    console.error('Kunde inte skapa ZIP:', err)
    toast.error(
      t(
        'Kunde inte skapa ZIP-filen — PDF:en skapas utan "ladda ner allt"-länk.',
        'Could not create the ZIP — the PDF is made without a "download all" link.'
      ),
      { id: toastId }
    )
    return null
  } finally {
    onBusy?.(false)
  }
}

// The technician's own document — the light/sound content (act_notes, labelled "Sound,
// Lighting & General Notes" on the artist's own booking form) plus each act's music, pulled
// out of the stage kittens' set list entirely rather than mixed into it.
export const createTechNotesPdf = (
  ctx: EventDocContext,
  zipLink: { url: string; included: number } | null
): GeneratedDocument => {
  const { t, eventTitle } = ctx
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 18
  const pageWidth = 210
  const pageBottom = 276
  // Everything inside an act hangs off this indent, under the number.
  const indent = margin + 9
  const gold: [number, number, number] = [166, 124, 0]
  const ink: [number, number, number] = [30, 26, 26]
  const muted: [number, number, number] = [125, 117, 108]
  const hairline: [number, number, number] = [228, 218, 196]
  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > pageBottom) {
      doc.addPage()
      y = margin
    }
  }

  // Header: serif title, event name, and a gold rule.
  doc.setFont('times', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...ink)
  doc.text(t('Ljud & Ljus', 'Sound & Light'), margin, y + 6)
  y += 13
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...muted)
  doc.text(eventTitle, margin, y)
  y += 5
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.6)
  doc.line(margin, y, pageWidth - margin, y)
  y += 9

  if (zipLink) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30, 90, 190)
    doc.textWithLink(
      `${t('Ladda ner all musik (ZIP)', 'Download all music (ZIP)')} - ${t(
        `${zipLink.included} filer`,
        `${zipLink.included} files`
      )}`,
      margin,
      y,
      { url: zipLink.url }
    )
    y += 12
  }

  buildSetListSections(ctx).forEach((section, sectionIndex) => {
    if (section.rows.length === 0) return

    // The break: a centred label with a gold line either side, with room above and below.
    if (sectionIndex > 0) {
      // Room for the break, the Set heading and the first act, so the break never ends up
      // alone at the bottom of a page.
      ensureSpace(80)
      y += 6
      // Letter-spaced by hand (jsPDF's charSpace isn't counted by getTextWidth, which
      // would throw the line gaps off).
      const label = t('PAUS', 'BREAK').split('').join(' ')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...gold)
      const labelWidth = doc.getTextWidth(label)
      const gap = 6
      const mid = pageWidth / 2
      doc.setDrawColor(...gold)
      doc.setLineWidth(0.5)
      doc.line(margin, y - 1.4, mid - labelWidth / 2 - gap, y - 1.4)
      doc.line(mid + labelWidth / 2 + gap, y - 1.4, pageWidth - margin, y - 1.4)
      doc.text(label, mid, y, { align: 'center' })
      y += 14
    }

    // Set heading: small caps-style label over a gold rule.
    ensureSpace(32)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...ink)
    doc.text(section.label.toUpperCase(), margin, y, { charSpace: 1.5 })
    y += 3
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.4)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10

    section.rows.forEach((row, index) => {
      ensureSpace(34)

      // Number in gold, act name in bold, performer underneath.
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...gold)
      doc.text(`${section.offset + index + 1}.`, margin, y)
      doc.setTextColor(...ink)
      doc.text(row.act_name || t('(Namnlöst)', '(Untitled)'), indent, y)
      y += 5.5
      if (row.performer) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9.5)
        doc.setTextColor(...muted)
        doc.text(row.performer.performer_name, indent, y)
        y += 5
      }
      y += 2

      // Music for this row — what the technician has to play, under a bold "Musik:" label.
      // Title + artist is searchable online; an uploaded file gets a clickable link to its
      // public storage URL. Real acts with no entry at all are flagged so the gap shows on
      // the printout too; other rows (e.g. the call-back song) only show music if they have
      // some.
      const tracks = parseActTracks(row.audio_files)
      if (tracks.length > 0 || row.performer) {
        ensureSpace(8)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(...ink)
        const musicLabel = t('Musik:', 'Music:')
        doc.text(musicLabel, indent, y)
        const textX = indent + doc.getTextWidth(musicLabel) + 2
        if (tracks.length === 0) {
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(190, 40, 40)
          doc.text(t('saknas', 'missing'), textX, y)
          y += 5.5
        }
        tracks.forEach((track, trackIndex) => {
          ensureSpace(6)
          if (trackIndex > 0) y += 1
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9.5)
          doc.setTextColor(40)
          const titleLines = doc.splitTextToSize(
            `${track.title} — ${track.artist}`,
            pageWidth - margin - textX
          ) as string[]
          doc.text(titleLines, textX, y)
          y += titleLines.length * 4.4 + 0.6
          const url = trackFileUrl(track)
          if (url) {
            ensureSpace(5)
            doc.setFontSize(9)
            doc.setTextColor(30, 90, 190)
            doc.textWithLink(
              `${t('Ladda ner fil', 'Download file')}: ${track.fileName ?? track.title}`,
              textX,
              y,
              { url }
            )
            y += 5
          }
        })
        y += 2
      }

      // The notes box is on every row, "N/A" when empty — so a short row (e.g. just a song)
      // still shows up as its own block and the technician can't skim from one big
      // yellow section to the next and miss it.
      {
        const noteText = row.act_notes?.trim() || 'N/A'
        // Font first — splitTextToSize measures with whatever is currently set.
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9.5)
        const lines = doc.splitTextToSize(noteText, pageWidth - margin - indent - 6) as string[]
        const boxHeight = lines.length * 4.4 + 4.5
        ensureSpace(boxHeight + 4)
        doc.setFillColor(253, 247, 228)
        doc.setDrawColor(...hairline)
        doc.setLineWidth(0.2)
        doc.rect(indent, y - 3.5, pageWidth - margin - indent, boxHeight, 'FD')
        doc.setFillColor(...gold)
        doc.rect(indent, y - 3.5, 1.2, boxHeight, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9.5)
        doc.setTextColor(40)
        doc.text(lines, indent + 5, y + 0.5)
        y += boxHeight - 3.5 + 4
      }

      // A hairline between acts (not after the last one of a set).
      if (index < section.rows.length - 1) {
        y += 3
        doc.setDrawColor(...hairline)
        doc.setLineWidth(0.2)
        doc.line(margin, y, pageWidth - margin, y)
        y += 9
      }
    })
  })

  // Footer on every page: document name left, page count right.
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...muted)
    doc.text(`${eventTitle} · ${t('Ljud & Ljus', 'Sound & Light')}`, margin, 288)
    doc.text(`${page} / ${pageCount}`, pageWidth - margin, 288, { align: 'right' })
  }

  return { doc, fileName: `${eventTitle}-ljud-ljus.pdf` }
}

// ---------------------------------------------------------------------------------------
// Run of show, artist contact sheet, food list
// ---------------------------------------------------------------------------------------

type Rgb = [number, number, number]
const GOLD: Rgb = [166, 124, 0]
const INK: Rgb = [30, 26, 26]
const MUTED: Rgb = [125, 117, 108]
const MARGIN = 18
const PAGE_WIDTH = 210
const PAGE_BOTTOM = 276

// Shared page scaffolding for the simpler list-style documents: serif title, event name, gold
// rule, then a cursor the callers advance. Footers are added once at the end.
const startDocument = (title: string, eventTitle: string) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const page = {
    doc,
    y: MARGIN,
    ensureSpace(needed: number) {
      if (page.y + needed > PAGE_BOTTOM) {
        doc.addPage()
        page.y = MARGIN
      }
    },
    heading(text: string) {
      page.ensureSpace(16)
      page.y += 3
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...INK)
      doc.text(text.toUpperCase(), MARGIN, page.y, { charSpace: 1 })
      page.y += 2.5
      doc.setDrawColor(...GOLD)
      doc.setLineWidth(0.4)
      doc.line(MARGIN, page.y, PAGE_WIDTH - MARGIN, page.y)
      page.y += 7
    },
  }
  doc.setFont('times', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...INK)
  doc.text(title, MARGIN, page.y + 6)
  page.y += 13
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...MUTED)
  doc.text(eventTitle, MARGIN, page.y)
  page.y += 5
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, page.y, PAGE_WIDTH - MARGIN, page.y)
  page.y += 9
  return page
}

const addFooters = (doc: jsPDF, label: string) => {
  const pageCount = doc.getNumberOfPages()
  for (let pageNo = 1; pageNo <= pageCount; pageNo++) {
    doc.setPage(pageNo)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(label, MARGIN, 288)
    doc.text(`${pageNo} / ${pageCount}`, PAGE_WIDTH - MARGIN, 288, { align: 'right' })
  }
}

const formatClock = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : ''

// One "Label: value" line, label bold — skipped entirely when there's no value.
const labelledLine = (
  page: ReturnType<typeof startDocument>,
  label: string,
  value: string | null | undefined,
  x: number
) => {
  if (!value?.trim()) return
  const { doc } = page
  page.ensureSpace(5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...INK)
  doc.text(`${label}:`, x, page.y)
  const valueX = x + doc.getTextWidth(`${label}:`) + 2
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40)
  const lines = doc.splitTextToSize(value.trim(), PAGE_WIDTH - MARGIN - valueX) as string[]
  doc.text(lines, valueX, page.y)
  page.y += lines.length * 4.4 + 0.8
}

// One-page overview for everyone backstage: when, where, who arrives when, the running order
// and who to call for light/sound/photo. The detailed per-act sheets stay in the set list and
// the sound & light document.
export const createRunOfShowPdf = (ctx: EventDocContext): GeneratedDocument => {
  const { t, eventTitle, eventInfo, performers, groupedStaff } = ctx
  const page = startDocument(t('Körschema', 'Run of show'), eventTitle)
  const { doc } = page

  const start = eventInfo?.event_start
  const end = eventInfo?.event_end
  if (start || eventInfo?.location) {
    page.heading(t('Eventet', 'The event'))
    if (start) {
      const date = new Date(start).toLocaleDateString(t('sv-SE', 'en-GB'), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      labelledLine(page, t('Datum', 'Date'), date, MARGIN)
      labelledLine(
        page,
        t('Tid', 'Time'),
        end ? `${formatClock(start)} – ${formatClock(end)}` : formatClock(start),
        MARGIN
      )
    }
    labelledLine(page, t('Plats', 'Location'), eventInfo?.location, MARGIN)
  }

  const arrivals = performers
    .filter((p) => p.arrival_time?.trim())
    .sort((a, b) => (a.arrival_time as string).localeCompare(b.arrival_time as string))
  if (arrivals.length > 0) {
    page.heading(t('Ankomst', 'Arrivals'))
    for (const p of arrivals) {
      page.ensureSpace(6)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...GOLD)
      doc.text(p.arrival_time as string, MARGIN, page.y)
      doc.setTextColor(...INK)
      doc.text(p.performer.performer_name, MARGIN + 24, page.y)
      page.y += 6
    }
  }

  page.heading(t('Program', 'Program'))
  const sections = buildSetListSections(ctx)
  sections.forEach((section, sectionIndex) => {
    if (section.rows.length === 0) return
    if (sectionIndex > 0) {
      page.ensureSpace(14)
      doc.setFont('helvetica', 'bolditalic')
      doc.setFontSize(11)
      doc.setTextColor(...GOLD)
      doc.text(t('— PAUS —', '— BREAK —'), PAGE_WIDTH / 2, page.y + 2, { align: 'center' })
      page.y += 10
    }
    page.ensureSpace(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    doc.text(section.label, MARGIN, page.y)
    page.y += 6
    section.rows.forEach((row, index) => {
      page.ensureSpace(7)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...GOLD)
      doc.text(`${section.offset + index + 1}.`, MARGIN, page.y)
      doc.setTextColor(...INK)
      doc.text(row.act_name || t('(Namnlöst)', '(Untitled)'), MARGIN + 9, page.y)
      if (row.performer) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9)
        doc.setTextColor(...MUTED)
        doc.text(row.performer.performer_name, PAGE_WIDTH - MARGIN, page.y, { align: 'right' })
      }
      page.y += 6.5
    })
  })

  const contacts = [
    ...FIXED_STAFF_ROLES.flatMap((role) =>
      groupedStaff
        .filter((p) => p.rows.some((r) => r.role === role))
        .map((p) => ({ role: staffRoleLabel(t, role), name: p.staff.name, phone: p.staff.phone }))
    ),
  ]
  if (contacts.length > 0) {
    page.heading(t('Nyckelroller', 'Key roles'))
    for (const c of contacts) {
      page.ensureSpace(6)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...INK)
      doc.text(c.role, MARGIN, page.y)
      doc.setFont('helvetica', 'normal')
      doc.text(c.name, MARGIN + 36, page.y)
      if (c.phone) doc.text(c.phone, PAGE_WIDTH - MARGIN, page.y, { align: 'right' })
      page.y += 6
    }
  }

  addFooters(doc, `${eventTitle} · ${t('Körschema', 'Run of show')}`)
  return { doc, fileName: `${eventTitle}-korschema.pdf` }
}

// Who to call and what each artist needs, for whoever is at the door or backstage.
export const createArtistContactsPdf = (ctx: EventDocContext): GeneratedDocument => {
  const { t, eventTitle, performers } = ctx
  const page = startDocument(t('Artistlista', 'Artist contacts'), eventTitle)
  const { doc } = page

  performers.forEach((p, index) => {
    page.ensureSpace(34)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...INK)
    doc.text(p.performer.performer_name, MARGIN, page.y)
    page.y += 5.5
    labelledLine(page, t('Telefon', 'Phone'), p.performer.phone, MARGIN + 4)
    labelledLine(page, t('E-post', 'Email'), p.performer.email, MARGIN + 4)
    labelledLine(page, t('Ankomst', 'Arrival'), p.arrival_time, MARGIN + 4)
    labelledLine(
      page,
      '+1',
      p.plus_one_name ? [p.plus_one_name, p.plus_one_email].filter(Boolean).join(' · ') : null,
      MARGIN + 4
    )
    labelledLine(
      page,
      t('Resa', 'Travel'),
      p.travels_by_car ? t('Reser med bil', 'Travelling by car') : null,
      MARGIN + 4
    )
    labelledLine(page, t('Boende', 'Accommodation'), p.accommodation, MARGIN + 4)
    labelledLine(page, t('Kost', 'Diet'), p.dietary_requirements, MARGIN + 4)
    labelledLine(page, t('Anteckning', 'Note'), p.artist_note, MARGIN + 4)
    if (index < performers.length - 1) {
      page.y += 1.5
      doc.setDrawColor(228, 218, 196)
      doc.setLineWidth(0.2)
      doc.line(MARGIN, page.y, PAGE_WIDTH - MARGIN, page.y)
      page.y += 6
    }
  })

  addFooters(doc, `${eventTitle} · ${t('Artistlista', 'Artist contacts')}`)
  return { doc, fileName: `${eventTitle}-artistlista.pdf` }
}

// Everyone eating, grouped by diet, with the allergy notes — for whoever orders and hands out
// food. Mirrors the Food tab's roster.
export const createFoodListPdf = (ctx: EventDocContext): GeneratedDocument => {
  const { t, eventTitle, performers, groupedStaff, organizers } = ctx
  const roster = buildFoodRoster(t, performers, groupedStaff, organizers)
  const page = startDocument(t('Matlista', 'Food list'), eventTitle)
  const { doc } = page

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text(
    t(`${roster.length} personer behöver mat`, `${roster.length} people need food`),
    MARGIN,
    page.y
  )
  page.y += 4

  const groups = [
    ...(['all_eater', 'vegetarian', 'vegan'] as const).map((cat) => ({
      title: dietaryCategoryLabel(t, cat),
      people: roster.filter((p) => p.category === cat),
    })),
    { title: t('Ej kategoriserad', 'Uncategorized'), people: roster.filter((p) => !p.category) },
  ]

  for (const group of groups) {
    if (group.people.length === 0) continue
    page.heading(`${group.title} (${group.people.length})`)
    for (const person of group.people) {
      page.ensureSpace(6.5)
      doc.setDrawColor(50)
      doc.setLineWidth(0.2)
      doc.rect(MARGIN, page.y - 3.5, 4, 4)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...INK)
      doc.text(person.name, MARGIN + 7, page.y)
      const nameWidth = doc.getTextWidth(person.name)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...MUTED)
      doc.text(person.subtitle, MARGIN + 7 + nameWidth + 3, page.y)
      page.y += 5.5
      if (person.notes?.trim()) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(190, 40, 40)
        const lines = doc.splitTextToSize(
          person.notes.trim(),
          PAGE_WIDTH - MARGIN * 2 - 7
        ) as string[]
        page.ensureSpace(lines.length * 4.4)
        doc.text(lines, MARGIN + 7, page.y)
        page.y += lines.length * 4.4 + 1
      }
      page.y += 1
    }
  }

  addFooters(doc, `${eventTitle} · ${t('Matlista', 'Food list')}`)
  return { doc, fileName: `${eventTitle}-matlista.pdf` }
}

// ---------------------------------------------------------------------------------------
// Registry + download
// ---------------------------------------------------------------------------------------

export type EventDocumentId =
  | 'setList'
  | 'soundLight'
  | 'vipList'
  | 'runOfShow'
  | 'artistContacts'
  | 'foodList'

export const EVENT_DOCUMENTS: {
  id: EventDocumentId
  label: [string, string]
  description: [string, string]
}[] = [
  {
    id: 'runOfShow',
    label: ['Körschema', 'Run of show'],
    description: [
      'Datum, ankomster, program och nyckelroller på en sida',
      'Date, arrivals, program and key roles on one page',
    ],
  },
  {
    id: 'setList',
    label: ['Set list', 'Set list'],
    description: [
      'För scenkatterna: ordning, förberedelser och plockning',
      'For the stage kittens: order, prep and pick-up',
    ],
  },
  {
    id: 'soundLight',
    label: ['Ljud & ljus', 'Sound & light'],
    description: [
      'För teknikern: ljus- och ljudnoter samt musik',
      'For the technician: light/sound notes and music',
    ],
  },
  {
    id: 'vipList',
    label: ['VIP-lista', 'VIP list'],
    description: ['Att bocka av i dörren', 'To tick off at the door'],
  },
  {
    id: 'artistContacts',
    label: ['Artistlista', 'Artist contacts'],
    description: [
      'Kontaktuppgifter, ankomst, +1 och boende',
      'Contact details, arrival, +1 and accommodation',
    ],
  },
  {
    id: 'foodList',
    label: ['Matlista', 'Food list'],
    description: ['Vem som äter vad, med allergier', 'Who eats what, with allergies'],
  },
]

// The fields a caller may not have on hand (VIP entries, organizer food, event times) are
// fetched fresh here so the Dashboard and the Event Plan page read the same thing.
export const loadEventDocContext = async (
  base: Omit<EventDocContext, 'vipEntries' | 'organizers' | 'eventInfo'>,
  eventId: string
): Promise<EventDocContext> => {
  const [vipEntries, organizers, eventInfo] = await Promise.all([
    getVipManualEntries(eventId),
    getEventOrganizerFood(eventId),
    getEventScheduleInfo(eventId),
  ])
  return { ...base, vipEntries, organizers, eventInfo }
}

export const generateEventDocument = async (
  id: EventDocumentId,
  ctx: EventDocContext,
  onBusy?: (busy: boolean) => void
): Promise<GeneratedDocument> => {
  switch (id) {
    case 'setList':
      return createStageKittenPdf(ctx)
    case 'soundLight':
      return createTechNotesPdf(ctx, await createTechMusicZip(ctx, onBusy))
    case 'vipList':
      return createVipListPdf(ctx)
    case 'runOfShow':
      return createRunOfShowPdf(ctx)
    case 'artistContacts':
      return createArtistContactsPdf(ctx)
    case 'foodList':
      return createFoodListPdf(ctx)
  }
}

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// One document downloads as a plain PDF; several are bundled into one ZIP.
export const downloadEventDocuments = async (
  ids: EventDocumentId[],
  ctx: EventDocContext,
  onBusy?: (busy: boolean) => void
): Promise<void> => {
  const documents: GeneratedDocument[] = []
  for (const id of ids) documents.push(await generateEventDocument(id, ctx, onBusy))
  if (documents.length === 1) {
    documents[0].doc.save(documents[0].fileName)
    return
  }
  const zip = new JSZip()
  for (const { doc, fileName } of documents) zip.file(fileName, doc.output('arraybuffer'))
  saveBlob(await zip.generateAsync({ type: 'blob' }), `${ctx.eventTitle}-dokument.zip`)
}
