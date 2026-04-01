import { Cloudinary } from "@cloudinary/url-gen";
import { AdvancedImage } from "@cloudinary/react";
import { fill } from "@cloudinary/url-gen/actions/resize";

interface CloudinaryImageProps {
  publicId: string;
  width?: number;
  height?: number;
}

export default function CloudinaryImage({ publicId, width = 800, height = 600 }: CloudinaryImageProps) {
  const cld = new Cloudinary({
    cloud: {
      cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    }
  });

  const myImage = cld.image(publicId);

  myImage
    .resize(fill().width(width).height(height))
    .format('auto')
    .quality('auto');

  return <AdvancedImage cldImg={myImage} className="rounded-xl shadow-lg" />;
}
