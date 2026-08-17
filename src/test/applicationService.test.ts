import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import { getCastingApplicationByToken } from '../services/applicationService'

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
