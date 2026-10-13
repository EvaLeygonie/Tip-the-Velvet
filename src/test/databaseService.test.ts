import { describe, it, expect } from 'vitest'
import { buildStorageFileName } from '../services/databaseService'

const file = (name: string) => new File(['x'], name)

describe('buildStorageFileName', () => {
  it('keeps the original name after a timestamp, inside the folder', () => {
    const path = buildStorageFileName('event/artist/audio-tracks', file('Feeling Good.mp3'))
    expect(path).toMatch(/^event\/artist\/audio-tracks\/\d+_Feeling-Good\.mp3$/)
  })

  it('removes accents and characters storage does not accept', () => {
    const path = buildStorageFileName('f', file('Älskar mig (live) #2.WAV'))
    expect(path).toMatch(/^f\/\d+_Alskar-mig-live-2\.wav$/)
  })

  it('falls back to a plain name when nothing usable is left', () => {
    expect(buildStorageFileName('f', file('♥♥.mp3'))).toMatch(/^f\/\d+_file\.mp3$/)
  })

  it('handles names without an extension', () => {
    expect(buildStorageFileName('f', file('song'))).toMatch(/^f\/\d+_song$/)
  })
})
