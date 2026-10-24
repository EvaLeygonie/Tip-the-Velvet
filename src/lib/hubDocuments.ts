import { supabase } from '@/lib/supabase'
import { buildMusicZipBlob, safeName } from '@/services/musicZipService'
import {
  buildMusicZipEntries,
  createStageKittenPdf,
  createTechNotesPdf,
  createVipListPdf,
  buildVipSections,
  type EventDocContext,
  type VipSection,
} from '@/lib/eventDocuments'
import { groupStaffRowsByPerson } from '@/lib/staffRowGrouping'
import type { InfoAudience, InfoDocKey } from '@/lib/eventInfo'
import { downloadBlob } from '@/lib/utils'

// What get_event_document_data returns (the rpc itself is typed as plain Json).
interface HubDocumentData {
  event_title: string
  event_start: string | null
  acts?: unknown[]
  performers?: unknown[]
  staff?: Parameters<typeof groupStaffRowsByPerson>[0]
  vip_entries?: unknown[]
}

const loadDocContext = async (
  token: string,
  doc: InfoDocKey,
  t: (sv: string, eng: string) => string
): Promise<EventDocContext> => {
  const { data: data_, error } = await supabase.rpc('get_event_document_data', {
    p_token: token,
    p_doc: doc,
  })
  if (error) throw error
  const data = (data_ ?? {}) as unknown as HubDocumentData

  return {
    t,
    eventTitle: data.event_title,
    eventStart: data.event_start,
    acts: data.acts ?? [],
    performers: data.performers ?? [],
    groupedStaff: groupStaffRowsByPerson(data.staff ?? []),
    vipEntries: data.vip_entries ?? [],
    organizers: [],
    eventInfo: null,
    omitEmails: true,
  } as unknown as EventDocContext
}

// Generates a released document on the info page, with the same PDF builders the admin side
// uses — the data comes from get_event_document_data, which only serves documents the board has
// marked ready for this link's role. Loaded on demand (jsPDF is heavy), so the page itself stays light.
export const downloadHubDocument = async (
  token: string,
  doc: InfoDocKey,
  t: (sv: string, eng: string) => string,
  audience?: InfoAudience
): Promise<void> => {
  const ctx = await loadDocContext(token, doc, t)
  // The sound & light PDF's own "download all music" link needs an upload to storage (admin
  // only) — on this page the technician gets the ZIP as a separate button instead
  // (downloadHubMusicZip), and the per-song links stay inside the PDF.
  const generated =
    doc === 'setList'
      ? createStageKittenPdf(ctx, { orderOnly: audience === 'artist' })
      : doc === 'soundLight'
        ? createTechNotesPdf(ctx, null)
        : createVipListPdf(ctx)
  generated.doc.save(generated.fileName)
}

// Every uploaded track in running order as one ZIP, built in the browser and saved straight
// to the technician's device (nothing is stored). Returns the number of files included, 0 if
// no act has music yet.
export const downloadHubMusicZip = async (
  token: string,
  t: (sv: string, eng: string) => string
): Promise<{ included: number; failed: string[] }> => {
  const ctx = await loadDocContext(token, 'soundLight', t)
  const entries = buildMusicZipEntries(ctx)
  if (entries.length === 0) return { included: 0, failed: [] }

  const { blob, included, failed } = await buildMusicZipBlob(entries)
  const fileName = `${ctx.eventTitle}${ctx.eventStart ? ` - ${ctx.eventStart.slice(0, 10)}` : ''}.zip`
  downloadBlob(blob, safeName(fileName))
  return { included, failed }
}

// The VIP list as plain sections, for the on-page list (/info/:token/vip).
export const loadHubVipList = async (
  token: string,
  t: (sv: string, eng: string) => string
): Promise<{ eventTitle: string; sections: VipSection[] }> => {
  const ctx = await loadDocContext(token, 'vipList', t)
  return { eventTitle: ctx.eventTitle, sections: buildVipSections(ctx) }
}
