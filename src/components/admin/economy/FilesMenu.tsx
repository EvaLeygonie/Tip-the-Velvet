import { useEffect, useRef, useState } from 'react'
import { Download, ExternalLink, FileText, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { RowFile } from '@/lib/payables'
import type { PayableFile } from '@/types/types'

interface FilesMenuProps {
  files: RowFile[]
  onOpenFile: (file: RowFile) => Promise<void>
  onDownloadFile: (file: RowFile) => Promise<void>
  onDownloadAll: () => Promise<void>
  onDeleteFile: (file: PayableFile) => Promise<void>
}

const ICON_BUTTON = 'p-1 rounded text-foreground/60 hover:text-accent hover:bg-accent/10'

// The small file icon next to the upload button: grey with nothing uploaded, gold once there are
// files. Pressing it lists them, each with open, download and (for the board's own) remove, and
// with several files the top of the list opens or downloads all of them at once.
export const FilesMenu = ({
  files,
  onOpenFile,
  onDownloadFile,
  onDownloadAll,
  onDeleteFile,
}: FilesMenuProps) => {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const shown = open && files.length > 0

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const hasFiles = files.length > 0

  return (
    <div ref={root} className="relative flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={!hasFiles}
        aria-expanded={shown}
        aria-haspopup="true"
        title={
          hasFiles
            ? t(`${files.length} uppladdade filer`, `${files.length} uploaded files`)
            : t('Inga filer uppladdade', 'No files uploaded')
        }
        aria-label={
          hasFiles
            ? t(`Visa ${files.length} uppladdade filer`, `Show ${files.length} uploaded files`)
            : t('Inga filer uppladdade', 'No files uploaded')
        }
        className={`w-10 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${
          hasFiles
            ? 'border-accent/60 text-accent bg-accent/10 hover:bg-accent/20'
            : 'border-foreground/15 text-foreground/25 cursor-default'
        }`}
      >
        <FileText className="h-4 w-4" />
      </button>

      {shown && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 w-72 max-w-[85vw] rounded-lg border border-accent/30 bg-background shadow-xl p-2"
        >
          {files.length > 1 && (
            <div className="flex items-center justify-between gap-2 px-1 pb-2 mb-1 border-b border-accent/15">
              <span className="text-xs text-foreground/60">
                {t(`${files.length} filer`, `${files.length} files`)}
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => files.forEach((f) => void onOpenFile(f))}
                  title={t('Öppna alla i nya flikar', 'Open all in new tabs')}
                  aria-label={t('Öppna alla i nya flikar', 'Open all in new tabs')}
                  className={ICON_BUTTON}
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void onDownloadAll()}
                  title={t('Ladda ner alla (zip)', 'Download all (zip)')}
                  aria-label={t('Ladda ner alla som zip', 'Download all as a zip')}
                  className={ICON_BUTTON}
                >
                  <Download className="h-4 w-4" />
                </button>
              </span>
            </div>
          )}
          <ul className="max-h-48 overflow-y-auto space-y-0.5">
            {files.map((file) => (
              <li key={file.id} className="flex items-center gap-1 px-1 py-0.5 text-sm">
                <button
                  type="button"
                  onClick={() => void onOpenFile(file)}
                  title={
                    file.origin === 'artist'
                      ? t(
                          `${file.name} (uppladdad av artisten)`,
                          `${file.name} (uploaded by the artist)`
                        )
                      : file.name
                  }
                  className={`flex-1 min-w-0 truncate text-left hover:text-accent ${
                    file.origin === 'artist' ? 'text-sky-300' : 'text-foreground'
                  }`}
                >
                  {file.name}
                </button>
                <button
                  type="button"
                  onClick={() => void onOpenFile(file)}
                  title={t('Öppna i ny flik', 'Open in a new tab')}
                  aria-label={t(`Öppna ${file.name}`, `Open ${file.name}`)}
                  className={ICON_BUTTON}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void onDownloadFile(file)}
                  title={t('Ladda ner', 'Download')}
                  aria-label={t(`Ladda ner ${file.name}`, `Download ${file.name}`)}
                  className={ICON_BUTTON}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                {file.file && (
                  <button
                    type="button"
                    onClick={() => void onDeleteFile(file.file as PayableFile)}
                    title={t('Ta bort', 'Remove')}
                    aria-label={t(`Ta bort ${file.name}`, `Remove ${file.name}`)}
                    className={`${ICON_BUTTON} hover:!text-red-300`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
