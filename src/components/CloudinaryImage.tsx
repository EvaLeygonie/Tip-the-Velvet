import { useMemo } from 'react'
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
  // AdvancedImage sets `src` asynchronously (componentDidMount/componentDidUpdate calls
  // into the SDK's HtmlImageLayer, which resolves a promise before setAttribute('src', …)
  // ever runs) — every distinct cldImg object retriggers that chain. Without memoizing,
  // a brand-new Cloudinary/CloudinaryImage graph was being built on *every* render of
  // this component regardless of whether publicId/width/height/fit actually changed,
  // so any parent that re-renders often (ResizeObserver/IntersectionObserver/frequent
  // form state, e.g. BookedArtistForm) kept firing overlapping async src-set chains —
  // a real bug found live: the promo image never showed there at all, while it worked
  // fine on far less re-render-heavy pages using this same component.
  const myImage = useMemo(() => {
    const cld = new Cloudinary({
      cloud: {
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
      },
    })

    const image = cld.image(publicId)

    if (fit) {
      image.resize(limitFit().width(width).height(height))
    } else {
      const fillAction = fill().width(width).height(height)

      if (gravityFace) {
        // Skicka focusOn(faces()) direkt in i gravity – helt utan compass()!
        fillAction.gravity(focusOn(faces()))
      }

      image.resize(fillAction)
    }

    image.format('auto').quality('auto')

    return image
  }, [publicId, width, height, fit, gravityFace])

  return <AdvancedImage cldImg={myImage} className={className} />
}
