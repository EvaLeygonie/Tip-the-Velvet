import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { EVENT_DOCUMENTS, type EventDocumentId } from '@/lib/eventDocuments'

interface DownloadDocumentsModalProps {
  eventTitle: string
  isDownloading: boolean
  onClose: () => void
  onDownload: (ids: EventDocumentId[]) => void
}

// Pick which show documents to download this time — one ticked becomes a plain PDF, several
// become one ZIP. Everything starts ticked since the usual case is "give me the lot."
export const DownloadDocumentsModal = ({
  eventTitle,
  isDownloading,
  onClose,
  onDownload,
}: DownloadDocumentsModalProps) => {
  const { t } = useLanguage()
  const [selected, setSelected] = useState<Set<EventDocumentId>>(
    new Set(EVENT_DOCUMENTS.map((d) => d.id))
  )

  const toggle = (id: EventDocumentId) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Keeps the registry's order rather than click order.
  const chosen = EVENT_DOCUMENTS.filter((d) => selected.has(d.id)).map((d) => d.id)

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left"
      onClick={isDownloading ? undefined : onClose}
    >
      <div
        className="velvet-surface border border-accent/30 max-w-md w-full p-6 space-y-4 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#141111' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h4 className="font-decorative text-lg text-accent text-center">
            {t('Ladda ner dokument', 'Download documents')}
          </h4>
          <p className="text-xs text-muted-foreground text-center">{eventTitle}</p>
        </div>

        <ul className="space-y-1.5">
          {EVENT_DOCUMENTS.map((doc) => (
            <li key={doc.id}>
              <label className="flex items-start gap-3 p-2 rounded border border-accent/10 hover:border-accent/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(doc.id)}
                  onChange={() => toggle(doc.id)}
                  disabled={isDownloading}
                  className="accent-accent h-4 w-4 mt-0.5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-sm text-foreground">
                    {t(doc.label[0], doc.label[1])}
                  </span>
                  <span className="block text-xs text-foreground/50">
                    {t(doc.description[0], doc.description[1])}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="text-sm py-2 px-4 border border-accent/20 rounded text-foreground/70 hover:bg-accent/10 transition-colors disabled:opacity-50"
          >
            {t('Avbryt', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={() => onDownload(chosen)}
            disabled={isDownloading || chosen.length === 0}
            className="flex items-center gap-1.5 text-sm py-2 px-4 border border-accent/40 rounded text-accent hover:bg-accent hover:text-black transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t(`Ladda ner (${chosen.length})`, `Download (${chosen.length})`)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
