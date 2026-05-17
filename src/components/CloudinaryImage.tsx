import { Cloudinary } from '@cloudinary/url-gen'
import { AdvancedImage } from '@cloudinary/react'
import { fill, limitFit } from '@cloudinary/url-gen/actions/resize'

interface CloudinaryImageProps {
  publicId: string
  width?: number
  height?: number
  className?: string
  fit?: boolean
}

export default function CloudinaryImage({
  publicId,
  width = 800,
  height = 600,
  className,
  fit = false,
}: CloudinaryImageProps) {
  const cld = new Cloudinary({
    cloud: {
      cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    },
  })

  const myImage = cld.image(publicId)

  myImage
    .resize(
      fit
        ? limitFit().width(width).height(height) // preserves ratio
        : fill().width(width).height(height) // crops to fit
    )
    .format('auto')
    .quality('auto')

  return <AdvancedImage cldImg={myImage} className={className} />
}
