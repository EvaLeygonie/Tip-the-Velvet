import { Mp3Encoder } from '@breezystack/lamejs'
import flac from '@audio/encode-flac'

// Supabase Storage rejects uploads over the project's file size limit (50 MB), and a WAV easily
// passes that. Files above this are re-encoded in the browser first; smaller ones go up untouched.
export const COMPRESS_ABOVE_BYTES = 48 * 1024 * 1024

const CHUNK_FRAMES = 262144
const MP3_FRAME = 1152 * 20
const MP3_KBPS = 320

// Let the page repaint between chunks so a long track doesn't freeze the tab.
const yieldToBrowser = () => new Promise((r) => setTimeout(r))

// 24-bit sources stay 24-bit so the FLAC really is a bit-for-bit copy; anything else is 16-bit.
const wavBitDepth = async (file: File): Promise<16 | 24> => {
  const head = new DataView(await file.slice(0, 36).arrayBuffer())
  const isWav = head.byteLength >= 36 && head.getUint32(0) === 0x52494646 // "RIFF"
  return isWav && head.getUint16(34, true) >= 24 ? 24 : 16
}

const encodeFlac = async (audio: AudioBuffer, bitDepth: 16 | 24): Promise<Blob> => {
  const encoder = await flac({
    sampleRate: audio.sampleRate,
    channels: Math.min(audio.numberOfChannels, 2),
    bitDepth,
    compression: 8,
  })
  const channels = [audio.getChannelData(0)]
  if (audio.numberOfChannels > 1) channels.push(audio.getChannelData(1))

  const parts: Uint8Array[] = []
  try {
    for (let i = 0; i < audio.length; i += CHUNK_FRAMES) {
      parts.push(encoder.encode(channels.map((c) => c.subarray(i, i + CHUNK_FRAMES))))
      await yieldToBrowser()
    }
    parts.push(encoder.flush())
    // libFLAC only knows the final totals at the end; write them over the stream header.
    const head = encoder.head?.()
    const first = parts.find((p) => p.length >= 42)
    if (head && first) first.set(head, 0)
  } finally {
    encoder.free()
  }
  return new Blob(parts as BlobPart[], { type: 'audio/flac' })
}

const toInt16 = (channel: Float32Array): Int16Array => {
  const out = new Int16Array(channel.length)
  for (let i = 0; i < channel.length; i++) {
    const s = Math.max(-1, Math.min(1, channel[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

// Only a fallback for when even FLAC doesn't fit: MP3 at its highest bitrate.
const encodeMp3 = async (audio: AudioBuffer): Promise<Blob> => {
  const channels = Math.min(audio.numberOfChannels, 2)
  const left = toInt16(audio.getChannelData(0))
  const right = channels > 1 ? toInt16(audio.getChannelData(1)) : undefined
  const encoder = new Mp3Encoder(channels, audio.sampleRate, MP3_KBPS)

  const parts: Uint8Array[] = []
  for (let i = 0; i < left.length; i += MP3_FRAME) {
    const buf = encoder.encodeBuffer(
      left.subarray(i, i + MP3_FRAME),
      right ? right.subarray(i, i + MP3_FRAME) : undefined
    )
    if (buf.length) parts.push(buf)
    if ((i / MP3_FRAME) % 50 === 0) await yieldToBrowser()
  }
  const end = encoder.flush()
  if (end.length) parts.push(end)
  return new Blob(parts as BlobPart[], { type: 'audio/mpeg' })
}

const renamed = (file: File, blob: Blob, ext: string) =>
  new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${ext}`, { type: blob.type })

// Returns the file itself when it is small enough. Otherwise a lossless FLAC copy of it, or, if
// that is still too big, a 320 kbps MP3 (check `.type === 'audio/mpeg'` to tell the user).
// Throws if the browser can't decode the file.
export const prepareAudioForUpload = async (file: File): Promise<File> => {
  if (file.size <= COMPRESS_ABOVE_BYTES) return file

  const ctx = new AudioContext()
  let audio: AudioBuffer
  try {
    audio = await ctx.decodeAudioData(await file.arrayBuffer())
  } finally {
    void ctx.close()
  }

  const lossless = await encodeFlac(audio, await wavBitDepth(file))
  if (lossless.size <= COMPRESS_ABOVE_BYTES) return renamed(file, lossless, 'flac')
  return renamed(file, await encodeMp3(audio), 'mp3')
}
