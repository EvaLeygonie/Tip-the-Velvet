import heic2any from 'heic2any'
import { supabase } from './supabase'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

export const createSlug = (text: string) => {
  const slug = text
    .toLowerCase()
    .trim()
    // Säkra upp de vanligaste accenterna manuellt först
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâäáå]/g, 'a')
    .replace(/[öôóò]/g, 'o')
    .replace(/[üûúù]/g, 'u')
    .replace(/[íìîï]/g, 'i')
    .replace(/[ç]/g, 'c')
    // Din befintliga robusta logik körs efteråt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // Namn skrivna helt i icke-latinska tecken eller stiliserade Unicode-typsnitt
  // (t.ex. matematiska alfanumeriska symboler) blir tomma efter saneringen ovan —
  // faller tillbaka på ett unikt, giltigt värde istället för en tom sträng.
  return slug || `namnlos-${Date.now().toString(36)}`
}

export const formatInstagramLink = (value: string): string => {
  const clean = value.trim()
  if (!clean) return ''

  if (clean.startsWith('@')) {
    return `https://www.instagram.com/${clean.substring(1)}`
  }

  if (clean.includes('instagram.com')) {
    if (clean.startsWith('http://')) {
      return clean.replace('http://', 'https://')
    }
    if (!clean.startsWith('https://')) {
      return `https://${clean}`
    }
    return clean
  }

  return `https://www.instagram.com/${clean}`
}

// Reverse of formatInstagramLink — pulls the handle back out of a stored profile URL
// (any instagram.com/<handle> form: with/without www, trailing slash, query string) and
// formats it the way Instagram tags actually get typed: "@handle".
export const extractInstagramHandle = (url: string | null | undefined): string | null => {
  if (!url) return null
  const match = url.match(/instagram\.com\/([^/?#]+)/i)
  const handle = match?.[1]?.trim()
  return handle ? `@${handle}` : null
}

export const formatOtherLink = (value: string): string => {
  const clean = value.trim()
  if (!clean) return ''

  if (!/^https?:\/\//i.test(clean)) {
    return `https://${clean}`
  }
  return clean
}

// Sant om ett bild-fält fortfarande pekar på en lokal blob:-preview istället för det
// riktiga Cloudinary-ID:t — dvs. uppladdningen hann inte bli klar innan formuläret skickades.
export const isUnresolvedBlobUrl = (value: string | null | undefined): boolean => {
  return !!value && value.startsWith('blob:')
}

export const buildEventFolderName = (eventTitle: string, eventDate: string) => {
  const date = eventDate.substring(0, 10)
  return `${date} ${eventTitle}`
}

export const getStoragePathFromUrl = (url: string, bucketName = 'artist-files') => {
  if (!url) return ''
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url)
      const pathSegments = urlObj.pathname.split('/')
      const bucketIndex = pathSegments.indexOf(bucketName)
      if (bucketIndex !== -1) {
        return pathSegments.slice(bucketIndex + 1).join('/')
      }
    }
  } catch (err) {
    console.error('Kunde inte parsa URL:', err)
  }
  return url
}

// Hjälpfunktion för att hämta korrekt offentlig URL från Supabase
export const getPublicFileUrl = (pathOrUrl: string) => {
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }
  const { data } = supabase.storage.from('artist-files').getPublicUrl(pathOrUrl)
  return data.publicUrl
}

export const getImageSrc = (imageId: string) => {
  if (!imageId) return ''
  if (imageId.startsWith('blob:') || imageId.startsWith('http')) return imageId

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${imageId}`
}

const BOLD_SERIF_UPPER_START = 0x1d400 // Mathematical Bold 𝐀
const BOLD_SERIF_LOWER_START = 0x1d41a // Mathematical Bold 𝐚

// For social-post headers ("Headliner Reveal!" -> "𝐇𝐞𝐚𝐝𝐥𝐢𝐧𝐞𝐫 𝐑𝐞𝐯𝐞𝐚𝐥!") — only A-Z/a-z have a
// bold variant in this Unicode block, everything else (spaces, punctuation, digits) passes
// through unchanged. NFD-normalizing first matters for Swedish å/ä/ö — verified against a
// real post ("Volontärer sökes!" -> "𝐕𝐨𝐥𝐨𝐧𝐭𝐚̈𝐫𝐞𝐫 𝐬𝐨̈𝐤𝐞𝐬!"): NFD decomposes ä/ö into a
// plain base letter (which gets bolded normally) plus a combining diaeresis (which, like
// any other non-letter character, just passes through unchanged) — so the accent still
// renders correctly over the bold letter without needing a separate accented-letter table.
export const toBoldSerif = (text: string): string =>
  Array.from(text.normalize('NFD'))
    .map((ch) => {
      if (ch >= 'A' && ch <= 'Z') {
        return String.fromCodePoint(BOLD_SERIF_UPPER_START + (ch.codePointAt(0)! - 65))
      }
      if (ch >= 'a' && ch <= 'z') {
        return String.fromCodePoint(BOLD_SERIF_LOWER_START + (ch.codePointAt(0)! - 97))
      }
      return ch
    })
    .join('')

const DOUBLE_STRUCK_UPPER_START = 0x1d538 // Mathematical Double-Struck 𝔸
const DOUBLE_STRUCK_LOWER_START = 0x1d552 // Mathematical Double-Struck 𝕒
// C, H, N, P, Q, R, Z have no assigned codepoint in that block (Unicode left them reserved
// since the "blackboard bold" glyphs already existed for number sets — ℂℍℕℙℚℝℤ) — pulled
// from the pre-existing Letterlike Symbols block instead.
const DOUBLE_STRUCK_UPPER_EXCEPTIONS: Record<string, string> = {
  C: 'ℂ',
  H: 'ℍ',
  N: 'ℕ',
  P: 'ℙ',
  Q: 'ℚ',
  R: 'ℝ',
  Z: 'ℤ',
}

export const toDoubleStruck = (text: string): string =>
  Array.from(text.normalize('NFD'))
    .map((ch) => {
      if (ch >= 'A' && ch <= 'Z') {
        return (
          DOUBLE_STRUCK_UPPER_EXCEPTIONS[ch] ??
          String.fromCodePoint(DOUBLE_STRUCK_UPPER_START + (ch.codePointAt(0)! - 65))
        )
      }
      if (ch >= 'a' && ch <= 'z') {
        return String.fromCodePoint(DOUBLE_STRUCK_LOWER_START + (ch.codePointAt(0)! - 97))
      }
      return ch
    })
    .join('')

// Verified character-by-character against the org's actual posted text ("Deadly Sins of
// Pandaemonium" -> "ᴅᴇᴀᴅʟʏ sɪɴs ᴏғ ᴘᴀɴᴅᴀᴇᴍᴏɴɪᴜᴍ", "Ticket Release" -> "ᴛɪᴄᴋᴇᴛ ʀᴇʟᴇᴀsᴇ", etc.) —
// only letters confirmed that way are mapped; F notably uses a Cyrillic lookalike (ғ) not a
// true small-cap glyph. Everything unconfirmed (S included — verified to fall back this way
// in the org's own posts) just lowercases rather than risk an invented glyph.
const SMALL_CAPS_MAP: Record<string, string> = {
  A: 'ᴀ',
  B: 'ʙ',
  C: 'ᴄ',
  D: 'ᴅ',
  E: 'ᴇ',
  F: 'ғ',
  I: 'ɪ',
  J: 'ᴊ',
  K: 'ᴋ',
  L: 'ʟ',
  M: 'ᴍ',
  N: 'ɴ',
  O: 'ᴏ',
  P: 'ᴘ',
  R: 'ʀ',
  T: 'ᴛ',
  U: 'ᴜ',
  Y: 'ʏ',
}

export const toSmallCaps = (text: string): string =>
  Array.from(text.normalize('NFD'))
    .map((ch) => SMALL_CAPS_MAP[ch.toUpperCase()] ?? ch.toLowerCase())
    .join('')

// Offsets (codepoint minus raw char code, not "minus 65/97" like toBoldSerif/toDoubleStruck)
// — verified against real text: D/S/P (0x1D507/0x1D516/0x1D513) and a/e/d/l/y/... all solve
// to these same two constants.
const FRAKTUR_UPPER_START = 0x1d4c3
const FRAKTUR_LOWER_START = 0x1d4bd
// C, H, I, R, Z reuse pre-existing Letterlike Symbols glyphs (ℭℌℑℜℨ), same reserved-gap
// pattern as toDoubleStruck's exceptions — confirmed against Unicode's Mathematical
// Alphanumeric Symbols reference, not just the (smaller) directly-verified letter set.
const FRAKTUR_UPPER_EXCEPTIONS: Record<string, string> = {
  C: 'ℭ',
  H: 'ℌ',
  I: 'ℑ',
  R: 'ℜ',
  Z: 'ℨ',
}

export const toFraktur = (text: string): string =>
  Array.from(text.normalize('NFD'))
    .map((ch) => {
      if (ch >= 'A' && ch <= 'Z') {
        return (
          FRAKTUR_UPPER_EXCEPTIONS[ch] ?? String.fromCodePoint(FRAKTUR_UPPER_START + ch.codePointAt(0)!)
        )
      }
      if (ch >= 'a' && ch <= 'z') {
        return String.fromCodePoint(FRAKTUR_LOWER_START + ch.codePointAt(0)!)
      }
      return ch
    })
    .join('')

// "Dark Carnival" -> "#DarkCarnival" — strips everything but letters/digits, no word-casing
// logic beyond what's already in the source text.
export const toHashtag = (text: string): string => `#${text.replace(/[^\p{L}\p{N}]/gu, '')}`

// Always-the-same org/city tags, kept last in every hashtag block. This is also the
// events.hashtags column's DB-level DEFAULT, so a brand new event row starts with these
// already in place — EventEditor.tsx mirrors the same string for its own new-event form
// state so what's shown on first load matches what actually gets saved.
export const DEFAULT_EVENT_HASHTAGS =
  '#TipTheVelvet #TipTheVelvetBurlesque #TipTheVelvetBurlesqueClub #Burlesque #BurlesqueSwe #BurlesqueSweden #SwedishBurlesque #Gothenburg #GothenburgEvent #GothenburgBurlesque'

// One tag each for title/subtitle/venue, skipping any that are empty — a starting point the
// board hand-adjusts afterward (e.g. adding a seasonal #Halloween tag), not a final answer.
export const generateEventHashtags = (
  title: string | null | undefined,
  subtitle: string | null | undefined,
  venueName: string | null | undefined
): string =>
  [title, subtitle, venueName]
    .filter((v): v is string => !!v && v.trim() !== '')
    .map(toHashtag)
    .join(' ')

export const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(img.src)

      const maxWidth = 2000
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Kunde inte göra bilden mindre'))
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.85
      )
    }
    img.onerror = reject
  })
}

// Slår in ett löfte i en tidsgräns så det alltid landar (löser eller avvisar) inom `ms`,
// oavsett vad som händer inuti — t.ex. om nätverket ligger helt nere och en fetch annars
// skulle kunna hänga betydligt längre än webbläsarens/OS:ets eget timeout-beteende.
export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), ms)
  })

  return Promise.race([promise, timeout])
}

export const processUploadedImage = async (file: File): Promise<File> => {
  const process = async (): Promise<File> => {
    let processedFile = file

    const isHeic =
      file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name)

    if (isHeic) {
      try {
        const result = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9,
        })
        const blob = Array.isArray(result) ? result[0] : result
        const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
        processedFile = new File([blob], newFileName, { type: 'image/jpeg' })
      } catch (error) {
        console.error('HEIC-konvertering misslyckades:', error)
        throw new Error('Kunde inte läsa bildformatet (HEIC)')
      }
    }

    const FIVE_MB = 5 * 1024 * 1024
    if (processedFile.size > FIVE_MB) {
      try {
        processedFile = await compressImage(processedFile)
      } catch (error) {
        console.warn('Komprimering misslyckades, behåller originalfilen:', error)
      }
    }

    return processedFile
  }

  return withTimeout(
    process(),
    20000,
    'Bildbearbetningen tog för lång tid. Försök med en annan bild.'
  )
}

export const formatDate = (language: string, dateString: string | null) => {
  if (!dateString) return 'TBA'
  const date = new Date(dateString)
  return date.toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// "24e Oktober 2026" / "October 24th 2026" — matches the exact ordinal-day style used in
// the org's actual social posts (formatDate above doesn't add an ordinal). Swedish ordinal
// rule: numbers ending in 1 or 2 take "a", except the teens (11/12), which take "e" like
// everything else.
export const formatSocialDateLine = (dateString: string, lang: 'sv' | 'eng'): string => {
  const date = new Date(dateString)
  const day = date.getDate()
  const year = date.getFullYear()

  if (lang === 'sv') {
    const lastTwo = day % 100
    const lastOne = day % 10
    const suffix = (lastOne === 1 || lastOne === 2) && !(lastTwo === 11 || lastTwo === 12) ? 'a' : 'e'
    const month = date.toLocaleDateString('sv-SE', { month: 'long' })
    return `${day}${suffix} ${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`
  }

  const lastTwo = day % 100
  const lastOne = day % 10
  const suffix =
    lastTwo >= 11 && lastTwo <= 13
      ? 'th'
      : lastOne === 1
        ? 'st'
        : lastOne === 2
          ? 'nd'
          : lastOne === 3
            ? 'rd'
            : 'th'
  const month = date.toLocaleDateString('en-US', { month: 'long' })
  return `${month} ${day}${suffix} ${year}`
}

export const formatDateTime = (language: string, dateStr: string | null) => {
  if (!dateStr) return 'TBA'
  const date = new Date(dateStr)
  return date.toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const utcToLocal = (utcString: string): string => {
  if (!utcString) return ''
  const date = new Date(utcString)
  const offset = date.getTimezoneOffset() * 60000
  const localIso = new Date(date.getTime() - offset).toISOString()
  return localIso.substring(0, 16)
}

export const localToUtc = (localString: string): string => {
  if (!localString) return ''
  return new Date(localString).toISOString()
}

// "X" / "X and Y" / "X, Y and Z" — natural-language join for however many act names a
// mail or on-screen summary needs to mention, rather than a raw comma dump. Each name is
// quoted individually so the result reads cleanly inline (e.g. in a sentence).
export const formatActList = (titles: string[], svLang: boolean): string => {
  const quoted = titles.map((title) => `"${title}"`)
  if (quoted.length <= 1) return quoted[0] ?? ''
  if (quoted.length === 2) return quoted.join(svLang ? ' och ' : ' and ')
  return `${quoted.slice(0, -1).join(', ')} ${svLang ? 'och' : 'and'} ${quoted[quoted.length - 1]}`
}
