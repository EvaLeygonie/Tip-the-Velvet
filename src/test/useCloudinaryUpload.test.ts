import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { toast } from 'sonner'
import { uploadToCloudinary } from '@/services/cloudinaryService'
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload'

vi.mock('@/services/cloudinaryService', () => ({
  uploadToCloudinary: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCloudinaryUpload', () => {
  it('returns the public_id and toggles uploading on success', async () => {
    vi.mocked(uploadToCloudinary).mockResolvedValue('Performers/promo-anais')

    const { result } = renderHook(() => useCloudinaryUpload())

    expect(result.current.uploading).toBe(false)

    let uploaded: string | null = null
    await act(async () => {
      uploaded = await result.current.upload(
        new File(['x'], 'photo.png'),
        'Performers',
        ['tag'],
        'promo-anais',
        undefined,
        { genericErrorMessage: 'Upload failed' }
      )
    })

    expect(uploaded).toBe('Performers/promo-anais')
    expect(result.current.uploading).toBe(false)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('shows the generic error toast and returns null on a normal failure', async () => {
    vi.mocked(uploadToCloudinary).mockRejectedValue(new Error('Cloudinary is down'))

    const { result } = renderHook(() => useCloudinaryUpload())

    let uploaded: string | null = 'not-null'
    await act(async () => {
      uploaded = await result.current.upload(
        new File(['x'], 'photo.png'),
        'Performers',
        ['tag'],
        'promo-anais',
        undefined,
        { genericErrorMessage: 'Upload failed' }
      )
    })

    expect(uploaded).toBeNull()
    expect(toast.error).toHaveBeenCalledWith('Upload failed')
  })

  it('routes duplicate-application errors to onDuplicateError instead of the generic toast', async () => {
    vi.mocked(uploadToCloudinary).mockRejectedValue(new Error('resource already exists'))

    const { result } = renderHook(() => useCloudinaryUpload())
    const onDuplicateError = vi.fn()

    let uploaded: string | null = 'not-null'
    await act(async () => {
      uploaded = await result.current.upload(
        new File(['x'], 'photo.png'),
        'Casting Calls/2026-09-01 Show',
        ['tag'],
        'artist-act',
        undefined,
        { genericErrorMessage: 'Upload failed', onDuplicateError }
      )
    })

    expect(uploaded).toBeNull()
    expect(onDuplicateError).toHaveBeenCalledWith('resource already exists')
    expect(toast.error).not.toHaveBeenCalled()
  })
})
