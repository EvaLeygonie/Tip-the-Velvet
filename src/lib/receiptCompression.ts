import { processUploadedImage } from '@/lib/utils'

// Receipts only need to stay readable, so they are kept much smaller than gallery photos.
const MAX_EDGE = 1800
const QUALITY = 0.8
const SKIP_BELOW_BYTES = 400 * 1024

const isImage = (file: File) => file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name)

const shrink = (file: File): Promise<File> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Could not compress the image'))
          const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
          resolve(new File([blob], name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        QUALITY
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read the image'))
    }
    img.src = url
  })

// Phone photos of receipts are 2-3 MB; this brings them to a few hundred KB. PDFs are left as
// they are (they are already small), and so is any image that is small already or would not shrink.
export const compressReceipt = async (file: File): Promise<File> => {
  if (!isImage(file)) return file
  try {
    const readable = await processUploadedImage(file)
    if (readable.size <= SKIP_BELOW_BYTES && readable === file) return file
    const smaller = await shrink(readable)
    return smaller.size < file.size ? smaller : file
  } catch (error) {
    console.warn('Receipt compression failed, keeping the original:', error)
    return file
  }
}
