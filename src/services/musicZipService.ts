import JSZip from 'jszip'
import { uploadStorageFile } from '@/services/databaseService'
import { supabase } from '@/lib/supabase'

export interface MusicZipEntry {
  // Name inside the ZIP, e.g. "3 - Morau Amour - Devil - song.mp3".
  name: string
  url: string
}

export interface MusicZipResult {
  url: string
  included: number
  // Files that couldn't be fetched and so are missing from the ZIP.
  failed: string[]
}

const safeName = (name: string): string => name.replace(/[\\/:*?"<>|]/g, '-')

// Bundles the artists' uploaded sound files into one ZIP and stores it in the same public
// bucket, so the sound & light PDF can link to a single "download all" URL. It's a snapshot
// of what's uploaded right now — regenerate the PDF to refresh it. Each run uploads a new
// ZIP (a stable name would need an overwrite policy on the bucket).
export const createMusicZipLink = async (
  eventTitle: string,
  entries: MusicZipEntry[],
  // What the browser saves the file as — the stored object keeps its unique generated name.
  downloadName: string
): Promise<MusicZipResult> => {
  const zip = new JSZip()
  const failed: string[] = []
  const used = new Set<string>()

  await Promise.all(
    entries.map(async (entry) => {
      try {
        const res = await fetch(entry.url)
        if (!res.ok) throw new Error(String(res.status))
        let name = safeName(entry.name)
        // Two entries can resolve to the same name — keep both rather than overwrite.
        for (let n = 2; used.has(name); n++) name = `${n} - ${safeName(entry.name)}`
        used.add(name)
        zip.file(name, await res.blob())
      } catch {
        failed.push(entry.name)
      }
    })
  )

  const included = entries.length - failed.length
  if (included === 0) throw new Error('Inga filer kunde hämtas.')

  const blob = await zip.generateAsync({ type: 'blob' })
  const file = new File([blob], 'all-music.zip', { type: 'application/zip' })
  const path = await uploadStorageFile('artist-files', `${eventTitle}/technician`, file)
  // `download` makes the public URL serve the file under a readable name.
  const { data } = supabase.storage
    .from('artist-files')
    .getPublicUrl(path, { download: safeName(downloadName) })
  return { url: data.publicUrl, included, failed }
}
