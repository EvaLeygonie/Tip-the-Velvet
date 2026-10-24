import { jsPDF } from 'jspdf'
import { groupStaffRowsByPerson } from '@/lib/staffRowGrouping'
import { parseActTracks, trackFileUrl } from '@/lib/actMusic'
import { staffPersonRoleSummary, vipCategoryLabel } from '@/lib/contactLabels'
import {
  ensureInfoLinks,
  getDoorSlots,
  getShowStartMinutes,
  infoLinkUrl,
} from '@/services/eventInfoService'
import { getStaffVolunteers } from '@/services/contactsService'
import {
  doorRecommendation,
  findPhoneForName,
  slotPartyPhase,
  formatClock as formatSwedishClock,
  type DoorSlot,
} from '@/lib/eventInfo'
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
import { downloadBlob } from '@/lib/utils'

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
  // The info hub's guest list is public to a role's link holders — names only, no emails.
  omitEmails?: boolean
  // Needed for the sound & light PDF's link to the technician's info page.
  eventId?: string
  // The guest list door shifts, for the printable door sheet.
  doorSlots?: DoorSlot[]
  // Phone number per name written on a door shift, for the printed door sheet.
  doorPhones?: Record<string, string>
  // When the show starts (minutes after midnight, Swedish time) — the door sheet marks the two
  // half-hours that fall during the show.
  showStartMinutes?: number | null
  // People housed who aren't booked artists — an extra page at the end of the artist list.
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
  const { t, performers, groupedStaff, vipEntries, omitEmails } = ctx
  const sections: VipSection[] = [
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
  if (!omitEmails) return sections
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item, email: null })),
  }))
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
// `orderOnly` is the artists' version: just the running order, without the stage notes (other
// artists' props and cleaning needs aren't theirs to see).
export const createStageKittenPdf = (
  ctx: EventDocContext,
  { orderOnly = false }: { orderOnly?: boolean } = {}
): GeneratedDocument => {
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
  doc.text(orderOnly ? t('Showordning', 'Show order') : t('Set List', 'Set List'), margin, y)
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

  interface RowSpec {
    left: string
    right: string
    leftWidth: number
    opts: { bold?: boolean; italicLeft?: boolean; minHeight?: number }
  }

  // One bordered two-column row — sized to whichever cell needs more wrapped lines, so a
  // long note doesn't overflow its box. Measured first so a whole act can be kept together.
  const measureRow = (spec: RowSpec) => {
    const rightWidth = contentWidth - spec.leftWidth
    const leftLines = doc.splitTextToSize(spec.left, spec.leftWidth - cellPad * 2) as string[]
    const rightLines = spec.right
      ? (doc.splitTextToSize(spec.right, rightWidth - cellPad * 2) as string[])
      : []
    const linesNeeded = Math.max(leftLines.length, rightLines.length, 1)
    const height = Math.max(linesNeeded * lineHeight + cellPad * 2, spec.opts.minHeight ?? 0)
    return { spec, leftLines, rightLines, height }
  }

  const drawRow = (m: ReturnType<typeof measureRow>, keepOnPage: boolean) => {
    const { spec, leftLines, rightLines, height } = m
    // An act taller than a whole page can't be kept together; fall back to breaking per row.
    if (!keepOnPage) ensureSpace(height)

    doc.setDrawColor(180)
    doc.rect(margin, y, spec.leftWidth, height)
    doc.rect(margin + spec.leftWidth, y, contentWidth - spec.leftWidth, height)

    doc.setFont('helvetica', spec.opts.bold ? 'bold' : spec.opts.italicLeft ? 'italic' : 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(20)
    doc.text(leftLines, margin + cellPad, y + cellPad + 3)

    if (rightLines.length > 0) {
      doc.setFont('helvetica', spec.opts.bold ? 'bold' : 'normal')
      doc.setTextColor(40)
      doc.text(rightLines, margin + spec.leftWidth + cellPad, y + cellPad + 3)
    }

    y += height
  }

  const headerLeftWidth = contentWidth / 2
  const labelWidth = 46

  // One act = its number plus the whole table. Built and measured up front so the table is never
  // split across two pages — it moves to the next page as a block instead.
  const buildAct = (row: (typeof ctx.acts)[number], position: number) => {
    const specs: RowSpec[] = [
      row.performer
        ? {
            left: `${t('Artist', 'Artist')}: ${row.performer.performer_name}`,
            right: `${t('Akt', 'Act')}: ${row.act_name}`,
            leftWidth: headerLeftWidth,
            opts: { bold: true },
          }
        : {
            left: t('Moment', 'Segment'),
            right: row.act_name || t('(Namnlöst)', '(Untitled)'),
            leftWidth: headerLeftWidth,
            opts: { bold: true },
          },
    ]
    if (!orderOnly) {
      specs.push(
        {
          left: t('Scenförberedelser:', 'Stage preparations:'),
          right: row.stage_preparations ?? '',
          leftWidth: labelWidth,
          opts: { italicLeft: true },
        },
        {
          left: t('Plockning/städning:', 'Pick up/cleaning:'),
          right: row.pick_up_cleaning ?? '',
          leftWidth: labelWidth,
          opts: { italicLeft: true },
        },
        {
          left: t('Anteckningar:', 'Notes:'),
          right: '',
          leftWidth: labelWidth,
          opts: { italicLeft: true, minHeight: 16 },
        }
      )
    }
    const measured = specs.map(measureRow)
    const numberHeight = 5
    const height = numberHeight + measured.reduce((sum, m) => sum + m.height, 0)
    const fits = height <= pageBottom - margin
    return {
      height,
      draw: () => {
        if (fits) ensureSpace(height)
        else ensureSpace(numberHeight + (measured[0]?.height ?? 0))
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(166, 124, 0)
        doc.text(`${position}.`, margin, y)
        y += numberHeight
        measured.forEach((m) => drawRow(m, fits))
        y += orderOnly ? 3 : 6
      },
    }
  }

  buildSetListSections(ctx).forEach((section, sectionIndex) => {
    if (section.rows.length === 0) return
    const acts = section.rows.map((row, index) => buildAct(row, section.offset + index + 1))
    // The set heading (and the break before it) stays with its first act.
    const headingHeight = (sectionIndex > 0 ? 9 : 0) + 7
    ensureSpace(headingHeight + Math.min(acts[0].height, pageBottom - margin - headingHeight))
    if (sectionIndex > 0) {
      doc.setFont('helvetica', 'bolditalic')
      doc.setFontSize(11)
      doc.setTextColor(166, 124, 0)
      doc.text(t('— PAUS —', '— BREAK —'), pageWidth / 2, y, { align: 'center' })
      y += 9
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(20)
    doc.text(section.label, margin, y)
    y += 7

    acts.forEach((act) => act.draw())
  })

  return { doc, fileName: `${eventTitle}-${orderOnly ? 'show-order' : 'set-list'}.pdf` }
}

// Every uploaded sound file in running order, named "position - artist - act - file".
export const buildMusicZipEntries = (ctx: EventDocContext): { name: string; url: string }[] =>
  buildSetListSections(ctx).flatMap((section) =>
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

// The sound & light PDF's "download all music" link goes to the technician's info page, where
// the ZIP is built from the files uploaded *at that moment* — so it never goes stale when an
// artist uploads after the PDF was made (a ZIP stored at PDF time would). Null when there is
// nothing to download or no event to link to.
export const getTechMusicLink = async (
  ctx: EventDocContext
): Promise<{ url: string; included: number } | null> => {
  const included = buildMusicZipEntries(ctx).length
  if (included === 0 || !ctx.eventId) return null
  try {
    const links = await ensureInfoLinks(ctx.eventId)
    return { url: infoLinkUrl(links.technician), included }
  } catch (err) {
    console.error('Kunde inte hämta infolänken:', err)
    return null
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
        `${zipLink.included} filer, alltid senaste versionen`,
        `${zipLink.included} files, always the latest`
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
    doc.text(section.label.toUpperCase(), margin, y)
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
          // "Download" sits on the same row as the song, right-aligned; the title wraps
          // before it so the two never overlap.
          const url = trackFileUrl(track)
          const linkLabel = t('Ladda ner', 'Download')
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          const linkWidth = url ? doc.getTextWidth(linkLabel) + 4 : 0
          doc.setFontSize(9.5)
          doc.setTextColor(40)
          const titleLines = doc.splitTextToSize(
            `${track.title} — ${track.artist}`,
            pageWidth - margin - textX - linkWidth
          ) as string[]
          doc.text(titleLines, textX, y)
          if (url) {
            doc.setFontSize(9)
            doc.setTextColor(30, 90, 190)
            doc.textWithLink(linkLabel, pageWidth - margin - (linkWidth - 4), y, { url })
          }
          y += titleLines.length * 4.4 + 0.6
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
      doc.text(text.toUpperCase(), MARGIN, page.y)
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
    // The guard is a key contact on the night too, though not a role the board must fill.
    ...[...FIXED_STAFF_ROLES, 'doorman' as const].flatMap((role) =>
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

// The guest list door shifts as a sheet to print: one row per time window, a line per spot with
// the name filled in where someone has booked and left blank otherwise. For the board, not the
// volunteer page.
export const createDoorShiftsPdf = (ctx: EventDocContext): GeneratedDocument => {
  const { t, eventTitle, doorSlots = [], doorPhones = {}, showStartMinutes = null } = ctx
  const page = startDocument(t('Dörrpass', 'Door shifts'), eventTitle)
  const { doc } = page

  const windows: { start: string; end: string; names: (string | null)[] }[] = []
  for (const slot of doorSlots) {
    const last = windows[windows.length - 1]
    if (last && last.start === slot.slot_start) last.names.push(slot.volunteer_name)
    else windows.push({ start: slot.slot_start, end: slot.slot_end, names: [slot.volunteer_name] })
  }

  if (windows.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(11)
    doc.setTextColor(...MUTED)
    doc.text(t('Inga dörrpass skapade än.', 'No door shifts created yet.'), MARGIN, page.y)
  } else {
    // The recommendation, then one row per time window with the names in columns (always at
    // least two, so a second person can be written in — sitting two is always fine).
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    const note = doc.splitTextToSize(
      doorRecommendation(windows[0].start, t('sv', 'eng') === 'sv' ? 'sv' : 'eng'),
      PAGE_WIDTH - MARGIN * 2
    ) as string[]
    doc.text(note, MARGIN, page.y)
    page.y += note.length * 4.5
    if (showStartMinutes !== null) {
      doc.text(
        t(
          'Kvällens moment (mingel, show, paus, dansgolv) är ungefärliga tider.',
          'The evening stages (mingle, show, break, dancefloor) are approximate times.'
        ),
        MARGIN,
        page.y
      )
      page.y += 4.5
    }
    page.y += 4
  }

  const columns = Math.max(2, ...windows.map((w) => w.names.length))
  const timeWidth = 34
  const nameWidth = (PAGE_WIDTH - MARGIN * 2 - timeWidth) / columns
  // Tall enough for a name with its phone number underneath.
  const rowHeight = 14
  for (const w of windows) {
    page.ensureSpace(rowHeight)
    doc.setDrawColor(...MUTED)
    doc.setLineWidth(0.2)
    doc.rect(MARGIN, page.y, PAGE_WIDTH - MARGIN * 2, rowHeight)
    for (let c = 0; c < columns; c++) {
      doc.line(
        MARGIN + timeWidth + nameWidth * c,
        page.y,
        MARGIN + timeWidth + nameWidth * c,
        page.y + rowHeight
      )
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...INK)
    // A small note under the time about what the party is doing then (approximate), counted
    // from the show start: mingle, show, break, show, dancefloor. The show halves are gold.
    const phase = showStartMinutes === null ? null : slotPartyPhase(w.start, showStartMinutes)
    doc.text(
      `${formatSwedishClock(w.start)}–${formatSwedishClock(w.end)}`,
      MARGIN + 3,
      phase ? page.y + 6 : page.y + rowHeight / 2 + 1.5
    )
    if (phase) {
      const label = {
        mingle: t('(mingel)', '(mingle)'),
        show: t('(show)', '(show)'),
        break: t('(paus)', '(break)'),
        dancefloor: t('(dansgolv)', '(dancefloor)'),
      }[phase]
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(...(phase === 'show' ? GOLD : MUTED))
      doc.text(label, MARGIN + 3, page.y + 10.5)
    }

    for (let c = 0; c < columns; c++) {
      const name = w.names[c]
      const left = MARGIN + timeWidth + nameWidth * c
      if (name) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(12)
        doc.setTextColor(...INK)
        const phone = doorPhones[name]
        doc.text(name, left + 3, page.y + (phone ? 5.5 : rowHeight / 2 + 1.5), {
          maxWidth: nameWidth - 6,
        })
        if (phone) {
          doc.setFontSize(9.5)
          doc.setTextColor(...MUTED)
          doc.text(phone, left + 3, page.y + 10.5, { maxWidth: nameWidth - 6 })
        }
      } else {
        doc.setDrawColor(...MUTED)
        doc.line(left + 3, page.y + rowHeight - 3, left + nameWidth - 3, page.y + rowHeight - 3)
      }
    }
    page.y += rowHeight
  }

  addFooters(doc, `${eventTitle} · ${t('Dörrpass', 'Door shifts')}`)
  return { doc, fileName: `${eventTitle}-dorrpass.pdf` }
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
  | 'doorShifts'

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
  {
    id: 'doorShifts',
    label: ['Dörrpass', 'Door shifts'],
    description: [
      'Gästlistans pass med namn, att skriva ut till dörren',
      'The guest list shifts with names, to print for the door',
    ],
  },
]

// The fields a caller may not have on hand (VIP entries, organizer food, event times) are
// fetched fresh here so the Dashboard and the Event Plan page read the same thing.
export const loadEventDocContext = async (
  base: Omit<EventDocContext, 'vipEntries' | 'organizers' | 'eventInfo'>,
  eventId: string
): Promise<EventDocContext> => {
  const [vipEntries, organizers, eventInfo, doorSlots, staff, showStartMinutes] = await Promise.all(
    [
      getVipManualEntries(eventId),
      getEventOrganizerFood(eventId),
      getEventScheduleInfo(eventId),
      getDoorSlots(eventId),
      getStaffVolunteers(),
      getShowStartMinutes(eventId),
    ]
  )
  // Numbers for the names on the door sheet, so a shift that runs over can reach the next person.
  const doorPhones: Record<string, string> = {}
  for (const slot of doorSlots) {
    if (!slot.volunteer_name || doorPhones[slot.volunteer_name]) continue
    const phone = findPhoneForName(slot.volunteer_name, staff)
    if (phone) doorPhones[slot.volunteer_name] = phone
  }
  return {
    ...base,
    vipEntries,
    organizers,
    eventInfo,
    doorSlots,
    doorPhones,
    showStartMinutes,
    eventId,
  }
}

export const generateEventDocument = async (
  id: EventDocumentId,
  ctx: EventDocContext
): Promise<GeneratedDocument> => {
  switch (id) {
    case 'setList':
      return createStageKittenPdf(ctx)
    case 'soundLight':
      return createTechNotesPdf(ctx, await getTechMusicLink(ctx))
    case 'vipList':
      return createVipListPdf(ctx)
    case 'runOfShow':
      return createRunOfShowPdf(ctx)
    case 'artistContacts':
      return createArtistContactsPdf(ctx)
    case 'foodList':
      return createFoodListPdf(ctx)
    case 'doorShifts':
      return createDoorShiftsPdf(ctx)
  }
}

// One document downloads as a plain PDF; several are bundled into one ZIP.
export const downloadEventDocuments = async (
  ids: EventDocumentId[],
  ctx: EventDocContext
): Promise<void> => {
  const documents: GeneratedDocument[] = []
  for (const id of ids) documents.push(await generateEventDocument(id, ctx))
  if (documents.length === 1) {
    documents[0].doc.save(documents[0].fileName)
    return
  }
  const zip = new JSZip()
  for (const { doc, fileName } of documents) zip.file(fileName, doc.output('arraybuffer'))
  downloadBlob(await zip.generateAsync({ type: 'blob' }), `${ctx.eventTitle}-dokument.zip`)
}
