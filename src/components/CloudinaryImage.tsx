import { Cloudinary } from '@cloudinary/url-gen'
import { AdvancedImage } from '@cloudinary/react'
import { fill, limitFit } from '@cloudinary/url-gen/actions/resize'
// Importera focusOn och faces från deras respektive mappar
import { focusOn } from '@cloudinary/url-gen/qualifiers/gravity'
import { faces } from '@cloudinary/url-gen/qualifiers/focusOn'

interface CloudinaryImageProps {
  publicId: string
  width?: number
  height?: number
  className?: string
  fit?: boolean
  gravityFace?: boolean
}

export default function CloudinaryImage({
  publicId,
  width = 800,
  height = 600,
  className,
  fit = false,
  gravityFace = false,
}: CloudinaryImageProps) {
  const cld = new Cloudinary({
    cloud: {
      cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    },
  })

  const myImage = cld.image(publicId)

  if (fit) {
    myImage.resize(limitFit().width(width).height(height))
  } else {
    const fillAction = fill().width(width).height(height)

    if (gravityFace) {
      // Skicka focusOn(faces()) direkt in i gravity – helt utan compass()!
      fillAction.gravity(focusOn(faces()))
    }

    myImage.resize(fillAction)
  }

  myImage.format('auto').quality('auto')

  return <AdvancedImage cldImg={myImage} className={className} />
}
