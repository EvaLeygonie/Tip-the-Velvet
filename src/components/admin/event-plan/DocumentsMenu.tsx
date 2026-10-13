import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  EVENT_DOCUMENTS,
  downloadEventDocuments,
  loadEventDocContext,
  type EventDocContext,
  type EventDocumentId,
} from '@/lib/eventDocuments'
import { getDocumentHint } from '@/lib/documentHints'
import type { AdminEventActRow } from '@/services/eventService'

interface DocumentsMenuProps {
  eventId: string
  // The documents this page can produce.
  ids: EventDocumentId[]
  // Called each time the menu opens, so what's offered (and warned about) is current. VIP
  // entries, organizers and event times are fetched fresh by loadEventDocContext on download.
  load: () => Promise<{
    context: Omit<EventDocContext, 'vipEntries' | 'organizers' | 'eventInfo'>
    // Used for "what's still missing" warnings next to a document.
    acts?: Pick<
      AdminEventActRow,
      'performer' | 'stage_preparations' | 'act_notes' | 'audio_files'
    >[]
  }>
  // Documents that aren't part of the shared set (e.g. the printable A4 VIP list).
  extras?: { key: string; label: string; description: string; onDownload: () => void }[]
}

// One "Documents" button per page, listing everything the page can produce — instead of a
// download button scattered over each tab.
export const DocumentsMenu = ({ eventId, ids, load, extras = [] }: DocumentsMenuProps) => {
  const { t, language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (!next) return
    setData(null)
    try {
      setData(await load())
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte hämta dokumentlistan.', 'Could not load the document list.'))
      setOpen(false)
    }
  }

  const handleDownload = async (id: EventDocumentId) => {
    if (!data) return
    setBusy(id)
    try {
      const ctx = await loadEventDocContext(data.context, eventId)
      await downloadEventDocuments([id], ctx)
    } catch (err) {
      console.error('Kunde inte skapa dokumentet:', err)
      toast.error(t('Kunde inte skapa dokumentet.', 'Could not create the document.'))
    } finally {
      setBusy(null)
    }
  }

  const docs = ids.flatMap((id) => EVENT_DOCUMENTS.filter((d) => d.id === id))
  const idx = language === 'sv' ? 0 : 1

  const rowClass = 'flex items-center gap-3 px-3 py-2.5'
  const buttonClass =
    'flex items-center gap-1.5 text-xs py-1.5 px-3 border border-accent/20 rounded text-accent hover:bg-accent hover:text-black transition-colors shrink-0 disabled:opacity-40'

  return (
    <div ref={rootRef} className="relative flex items-center">
      {/* Icon-only, with the tabs' corner radius and a faint ring, so it reads as a tool beside the tabs, not a
          fifth tab. */}
      <button
        type="button"
        onClick={toggle}
        title={t('Dokument', 'Documents')}
        aria-label={t('Dokument', 'Documents')}
        aria-expanded={open}
        className={`flex items-center justify-center h-9 w-9 rounded-xl border transition-colors ${
          open
            ? 'border-accent text-accent bg-accent/10'
            : 'border-accent/25 text-accent/80 hover:text-accent hover:border-accent/60 hover:bg-accent/10'
        }`}
      >
        <FileText className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-[min(92vw,26rem)] admin-panel velvet-surface bg-background divide-y divide-accent/10 text-left">
          {!data && (
            <div className="flex justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
            </div>
          )}
          {data &&
            docs.map((doc) => {
              const hint = getDocumentHint(t, doc.id, data?.acts ?? [])
              return (
                <div key={doc.id} className={rowClass}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground">{doc.label[idx]}</div>
                    <div className="text-xs text-foreground/50">{doc.description[idx]}</div>
                    {hint && (
                      <Link
                        to="/admin/casting"
                        state={{ tab: 'show' }}
                        onClick={() => setOpen(false)}
                        title={t('Öppna showplaneringen', 'Open show planning')}
                        className="block text-xs text-amber-400 hover:underline"
                      >
                        {hint}
                      </Link>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(doc.id)}
                    disabled={busy !== null || !data}
                    className={buttonClass}
                  >
                    {busy === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    PDF
                  </button>
                </div>
              )
            })}
          {data &&
            extras.map((extra) => (
              <div key={extra.key} className={rowClass}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground">{extra.label}</div>
                  <div className="text-xs text-foreground/50">{extra.description}</div>
                </div>
                <button type="button" onClick={extra.onDownload} className={buttonClass}>
                  <Download className="h-3.5 w-3.5" />
                  A4
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
