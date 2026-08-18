import { describe, it, expect, vi } from 'vitest'

vi.mock('heic2any', () => ({ default: vi.fn() }))

import { createSlug, isUnresolvedBlobUrl } from '../lib/utils'

describe('createSlug', () => {
  it('lowercases and hyphenates a normal name', () => {
    expect(createSlug('Once Upon a Artist')).toBe('once-upon-a-artist')
  })

  it('strips accented Latin characters to their base letter', () => {
    expect(createSlug('Anaïs Öberg Ångström')).toBe('anais-oberg-angstrom')
  })

  it('collapses repeated separators and trims leading/trailing hyphens', () => {
    expect(createSlug('  --Foo   Bar--  ')).toBe('foo-bar')
  })

  it('falls back to a unique slug instead of an empty string for stylized/non-Latin input', () => {
    // Mathematical Alphanumeric Symbols (𝓞𝓷𝓬𝓮) — not accented Latin, so NFD
    // normalization doesn't touch them; the sanitizer strips them entirely.
    const slug = createSlug('𝓞𝓷𝓬𝓮 𝓤𝓹𝓸𝓷 𝓪 𝓐𝓻𝓽𝓲𝓼𝓽')
    expect(slug).not.toBe('')
    expect(slug.startsWith('namnlos-')).toBe(true)
  })

  it('falls back to a unique slug for empty input', () => {
    const slug = createSlug('')
    expect(slug).not.toBe('')
    expect(slug.startsWith('namnlos-')).toBe(true)
  })
})

describe('isUnresolvedBlobUrl', () => {
  it('returns true for a blob: URL', () => {
    expect(isUnresolvedBlobUrl('blob:http://localhost:5173/abc-123')).toBe(true)
  })

  it('returns false for a real Cloudinary public_id', () => {
    expect(isUnresolvedBlobUrl('Performers/promo-anais')).toBe(false)
  })

  it('returns false for null, undefined, and empty string', () => {
    expect(isUnresolvedBlobUrl(null)).toBe(false)
    expect(isUnresolvedBlobUrl(undefined)).toBe(false)
    expect(isUnresolvedBlobUrl('')).toBe(false)
  })
})
