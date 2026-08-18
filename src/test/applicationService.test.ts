import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import {
  getCastingApplicationByToken,
  sendApplicationConfirmationEmail,
} from '../services/applicationService'

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCastingApplicationByToken', () => {
  it('throws when no token is provided', async () => {
    await expect(getCastingApplicationByToken('some-id', null)).rejects.toThrow(
      'Access token saknas i URL:en.'
    )
  })

  it('returns application data when id and token match', async () => {
    const mockApplication = { id: 'app-1', access_token: 'secret-token', review_status: 'pending' }

    const rpc = vi.fn().mockResolvedValue({ data: mockApplication, error: null })
    vi.mocked(supabase.rpc).mockImplementation(rpc as unknown as typeof supabase.rpc)

    const result = await getCastingApplicationByToken('app-1', 'secret-token')

    expect(result).toEqual(mockApplication)
    expect(rpc).toHaveBeenCalledWith('get_casting_application_by_token', {
      p_id: 'app-1',
      p_token: 'secret-token',
    })
  })

  it('throws when supabase returns an error (e.g. token mismatch)', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('Row not found') })
    vi.mocked(supabase.rpc).mockImplementation(rpc as unknown as typeof supabase.rpc)

    await expect(getCastingApplicationByToken('app-1', 'wrong-token')).rejects.toThrow(
      'Row not found'
    )
  })
})

describe('sendApplicationConfirmationEmail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('posts to /api/application-confirmation and returns true on success', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)

    const result = await sendApplicationConfirmationEmail(
      'Anaïs',
      'anais@example.com',
      'sv',
      'casting',
      '2026-09-01'
    )

    expect(result).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/api/application-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anaïs',
        email: 'anais@example.com',
        language: 'sv',
        type: 'casting',
        deadline: '2026-09-01',
      }),
    })
  })

  it('returns false when the endpoint responds with a non-ok status', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)

    const result = await sendApplicationConfirmationEmail(
      'Anaïs',
      'anais@example.com',
      'sv',
      'sponsor'
    )

    expect(result).toBe(false)
  })

  it('returns false instead of throwing on a network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network down'))

    const result = await sendApplicationConfirmationEmail(
      'Anaïs',
      'anais@example.com',
      'sv',
      'staff'
    )

    expect(result).toBe(false)
  })
})
