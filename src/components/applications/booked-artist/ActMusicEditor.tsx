import { Upload, Loader2, Music, ExternalLink, Trash2, Plus, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { AudioTrackItem, PendingTrackFile } from './types'

interface ActMusicEditorProps {
  tracks: AudioTrackItem[]
  // The song being typed in, before it is added to the act.
  newTrackTitle: string
  newTrackArtist: string
  newTrackFile: PendingTrackFile | null
  onTitleChange: (value: string) => void
  onArtistChange: (value: string) => void
  uploadingAudio: boolean
  attachingTrackId: string | null
  // 0–1 while an audio file is uploading.
  uploadProgress: number
  onPendingUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemovePendingFile: () => void
  onAddTrack: () => void
  onAttachFile: (trackId: string, e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveTrack: (trackId: string) => void
}

export const ActMusicEditor = ({
  tracks,
  newTrackTitle,
  newTrackArtist,
  newTrackFile,
  onTitleChange,
  onArtistChange,
  uploadingAudio,
  attachingTrackId,
  uploadProgress,
  onPendingUpload,
  onRemovePendingFile,
  onAddTrack,
  onAttachFile,
  onRemoveTrack,
}: ActMusicEditorProps) => {
  const { t } = useLanguage()
  return (
    <div className="space-y-4 border-t border-border/40 pt-4">
      <label className="form-label-block text-xs font-bold text-accent">
        {t('Låtar för akten', 'Act songs & audio files')}
      </label>

      <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-3">
        <span className="text-xs font-semibold text-foreground/80 block">
          {t('Lägg till låt', 'Add new song')}
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder={t('Låttitel (t.ex. Feeling Good)', 'Track Title')}
            value={newTrackTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="login-input text-xs"
          />
          <input
            type="text"
            placeholder={t('Låtartist / Kompositör (t.ex. Nina Simone)', 'Track Artist')}
            value={newTrackArtist}
            onChange={(e) => onArtistChange(e.target.value)}
            className="login-input text-xs"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <label
              htmlFor="temp-audio-up"
              className="btn-gold-outline text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {uploadingAudio ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {newTrackFile
                ? t('Byt ljudfil', 'Replace audio file')
                : t('Ladda upp ljudfil', 'Upload audio file')}
            </label>
            <input
              type="file"
              id="temp-audio-up"
              className="hidden"
              accept="audio/*"
              onChange={onPendingUpload}
            />
            {uploadingAudio ? (
              <span className="text-xs text-accent truncate min-w-0">
                {t('Laddar upp', 'Uploading')} {Math.round(uploadProgress * 100)}%
              </span>
            ) : newTrackFile ? (
              <>
                <span className="text-xs text-accent truncate min-w-0">✓ {newTrackFile.name}</span>
                <button
                  type="button"
                  onClick={onRemovePendingFile}
                  title={t('Ta bort filen', 'Remove the file')}
                  className="shrink-0 p-1 rounded-md text-foreground/60 hover:text-destructive transition-colors"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <span className="text-xs text-amber-400 italic truncate min-w-0">
                {t('Ingen uppladdad fil (krävs)', 'No uploaded file (required)')}
              </span>
            )}
          </div>

          {(() => {
            const canAddTrack = Boolean(
              newTrackTitle.trim() && newTrackArtist.trim() && newTrackFile
            )
            return (
              <button
                type="button"
                onClick={onAddTrack}
                disabled={!canAddTrack}
                className={`text-xs py-1.5 px-4 flex items-center gap-1.5 shrink-0 rounded-lg ${
                  canAddTrack ? 'btn-gold btn-gold-glow-active' : 'btn-gold-inactive'
                }`}
              >
                <Plus size={14} />
                {t('Lägg till låt i akten', 'Add song to act')}
              </button>
            )
          })()}
        </div>
      </div>

      {/* Lista över sparade låtar */}
      {tracks.length > 0 ? (
        <div className="space-y-2 pt-2">
          <span className="text-xs font-medium text-foreground/70 block">
            {t('Tillagda låtar:', 'Added tracks:')}
          </span>
          {tracks.map((track, idx) => {
            const hasFile = Boolean(track.fileUrl || track.filePath)
            return (
              <div
                key={track.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-border/60 bg-background/40"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Music className="w-4 h-4 text-accent shrink-0" />
                  <div className="min-w-0 flex-1 flex flex-col items-start">
                    <p className="text-xs font-semibold text-foreground truncate w-full text-left">
                      {idx + 1}. {track.title || t('Namnlös låt', 'Untitled track')}
                      {track.artist ? ` - ${track.artist}` : ''}
                    </p>
                    {hasFile ? (
                      <p className="text-[10px] text-accent truncate w-full text-left">
                        ✓ {track.fileName || t('Fil uppladdad', 'File uploaded')}
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-400 w-full text-left">
                        {t('Ingen ljudfil uppladdad än', 'No audio file uploaded yet')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <>
                    <label
                      htmlFor={`track-file-${track.id}`}
                      className="btn-gold-outline text-[11px] py-1 px-2.5 cursor-pointer flex items-center gap-1.5"
                    >
                      {attachingTrackId === track.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload size={12} />
                      )}
                      {attachingTrackId === track.id
                        ? `${Math.round(uploadProgress * 100)}%`
                        : hasFile
                          ? t('Byt fil', 'Change file')
                          : t('Ladda upp fil', 'Upload file')}
                    </label>
                    <input
                      type="file"
                      id={`track-file-${track.id}`}
                      className="hidden"
                      accept="audio/*"
                      onChange={(e) => onAttachFile(track.id, e)}
                    />
                  </>
                  {track.fileUrl && (
                    <a
                      href={track.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md border border-border hover:border-accent text-foreground/80 hover:text-accent transition-colors"
                      title={t('Lyssna/Öppna', 'Listen/Open')}
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveTrack(track.id)}
                    className="p-1.5 rounded-md border border-destructive/30 hover:bg-destructive/20 text-destructive transition-colors"
                    title={t('Ta bort', 'Remove')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-foreground/50 italic pt-1">
          {t('Inga låtar tillagda ännu.', 'No songs added yet.')}
        </p>
      )}
    </div>
  )
}
