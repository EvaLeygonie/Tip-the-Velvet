import JSZip from 'jszip'

export interface MusicZipEntry {
  // Name inside the ZIP, e.g. "3 - Morau Amour - Devil - song.mp3".
  name: string
  url: string
}

export const safeName = (name: string): string => name.replace(/[\\/:*?"<>|]/g, '-')

// Fetches every entry and zips them (in the browser). Entries that can't be fetched are listed
// in `failed` instead of aborting the whole ZIP; throws only if nothing could be fetched.
export const buildMusicZipBlob = async (
  entries: MusicZipEntry[]
): Promise<{ blob: Blob; included: number; failed: string[] }> => {
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
  return { blob: await zip.generateAsync({ type: 'blob' }), included, failed }
}
