// import { useState } from 'react'
// import { useLanguage } from '@/contexts/LanguageContext'
// import type { CreateSponsorInput, sponsorType } from '@/types/types'
// import { submitSponsorApplication } from '@/services/applicationService'
// import { uploadToCloudinary } from '@/services/cloudinaryService'
// import { Calendar, MapPin, Send, Loader2, BellDot } from 'lucide-react'
// import { toast } from 'sonner'

// export const SponsorCard = () => {
//   const { t } = useLanguage()

//   const [agreed, setAgreed] = useState(false)
//   const [submitting, setSubmitting] = useState(false)

//   const [uploading, setUploading] = useState(false)
//   const [tempFile, setTempFile] = useState<File | null>(null)

//   const [formData, setFormData] = useState<Partial<CreateStaffVolunteerInput>>({
//     agreed_to_terms: false,
//   })

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
//   }

//   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (!file) return

//     const maxSize = 5 * 1024 * 1024
//     if (file.size > maxSize) {
//       toast.error(
//         t('Bilden är för stor. Maxstorlek är 5MB.', 'Image is too large. Maximum size is 5MB.')
//       )
//       return
//     }

//     const previewUrl = URL.createObjectURL(file)

//     setTempFile(file)
//     setFormData((prev) => ({ ...prev, promo_image_id: previewUrl }))
//   }

//  const sendConfirmEmail = async (
//     name: string,
//     email: string,
//   ) => {
//     try {
//       const response = await fetch('/api/application-confirmation', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ name, email }),
//       })
//       return response.ok
//     } catch (error) {
//       console.error('Nätverksfel vid sändning av mail:', error)
//       return false
//     }
//   }

// const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()

//     if (!agreed) return toast.error(t('Acceptera termer tack.', 'Please agree to the terms.'))
//     if (!formData.promo_image_id)
//       return toast(t('Ladda upp en promobild.', 'Please upload a promo picture.'))
//     if (!formData.performer_name)
//       return toast.error(t('Artistnamn krävs.', 'Artist name is required.'))

//     setSubmitting(true)
//     const artistSlug = createSlug(formData.performer_name)
//     const actSlug = createSlug(formData.act_title || '')
//     let finalImageId = formData.promo_image_id

//     if (tempFile) {
//       setUploading(true)
//       try {
//         finalImageId = await uploadToCloudinary(
//           tempFile,
//           'Casting Calls',
//           ['casting-call', artistSlug, actSlug],
//           `${artistSlug}-${actSlug}`
//         )
//         setTempFile(null)
//       } catch (err) {
//         toast.error(t('Kunde inte ladda upp bilden', 'Cloudinary upload failed'))
//         console.error(err)
//         setSubmitting(false)
//         return
//       } finally {
//         setUploading(false)
//       }
//     }
//     const payload: CreateCastingApplicationInput = {
//       ...formData,
//       event_id: event.id,
//       performer_name: formData.performer_name.trim(),
//       act_title: formData.act_title?.trim() || '',
//       slug: actSlug,
//       email: formData.email?.trim() || '',
//       promo_image_id: finalImageId,
//       language: preferredLang,
//       agreed_to_terms: true,
//     }

//     const applicantName = formData.performer_name.trim()
//     const applicantEmail = formData.email?.trim() || ''
//     const applicantLanguage = language

//     try {
//       await submitSponsorApplication(payload)

//       setFormData({
//         agreed_to_terms: false
//       })
//       setAgreed(false)

//       const emailSuccess = await sendConfirmEmail(
//         applicantName,
//         applicantEmail,
//         applicantPhone
//       )

//       if (emailSuccess) {
//         toast.success(
//           t(
//             'Ansökan skickad! Kolla din inkorg efter en bekräftelse.',
//             'Application submitted! Please check your inbox for a confirmation.'
//           )
//         )
//       } else {
//         toast.success(
//           t(
//             'Kunde inte skicka bekräftelsemail, men din ansökan är sparad.',
//             'Could not send confirmation email, but your application is saved.'
//           ),
//           { duration: 5000 }
//         )
//       }
//     } catch (err) {
//       toast.error(t('Någonting gick fel!', 'Something went wrong!'))
//       console.error(err)
//     } finally {
//       setSubmitting(false)
//     }
//   }

//  return (
//     <div className="application-card">
//       <div className="form-stack">
//         {/* PHONE & EMAIL */}
//         <div className="form-row-2">
//           <div className="form-field">
//             <label className="form-label-block">{t('Namn *', 'Name *')}</label>
//             <input
//               type="text"
//               name="performer_name"
//               placeholder={t('Ditt fulla namn', 'Your full name')}
//               value={formData.name}
//               onChange={handleChange}
//             />
//           </div>

//           <div className="form-field">
//             <label className="form-label-block">Email *</label>
//             <input
//               type="email"
//               name="email"
//               placeholder={t('ditt@mail.com', 'your@email.com')}
//               value={formData.email || ''}
//               onChange={handleChange}
//             />
//           </div>
//         </div>
//           <div className="form-field">
//             <label className="form-label-block">{t('Telefon', 'Phone')}</label>
//             <input
//               type="phone"
//               name="phone"
//               placeholder={t('Ditt telefonnummer', 'Your phone number')}
//               value={formData.phone || ''}
//               onChange={handleChange}
//             />
//           </div>
//         </div>

//         <div className="gold-divider" />

//         {/* PROMO IMAGE & TEXT */}
//         <div className="form-row-2 items-stretch">
//           <div className="flex flex-col space-y-3">
//             <label className="form-label-block">{t('Promobild *', 'Promo Image *')}</label>
//             <div className="promo-upload-square">
//               {formData.promo_image_id ? (
//                 <div className="absolute inset-0 group">
//                   <img
//                     src={getImageSrc(formData.promo_image_id)}
//                     className="promo-image"
//                     alt="Preview"
//                   />
//                   <div className="promo-image-change">
//                     <label htmlFor="image-up" className="btn-admin">
//                       {t('Byt bild', 'Change Image')}
//                     </label>
//                   </div>
//                 </div>
//               ) : (
//                 <label htmlFor="image-up" className="btn-admin">
//                   {uploading ? t('Laddar...', 'Uploading...') : t('Välj Bild', 'Select Image')}
//                 </label>
//               )}
//               <input
//                 type="file"
//                 id="image-up"
//                 className="hidden"
//                 accept="image/*"
//                 onChange={handleImageUpload}
//               />
//             </div>
//           </div>
{
  /* <div className="gold-divider" />

      <div className="form-field">
        <label className="form-label-block">{t('Roll *', 'Roll *')}</label>
        <input
          type="text"
          name="role"
          placeholder={t('Din roll', 'Your roll')}
          value={formData.role || ''}
          onChange={handleChange}
        />
      </div>

      <div className="form-field">
        <label className="form-label-block">{t('Roll beskrivning', 'Role description')}</label>
        <textarea
          name="role_details"
          placeholder={t('Berätta gärna mer!', 'Please tell us more!')}
          value={formData.role_details || ''}
          onChange={handleChange}
        />
      </div>
      */
}

{
  /* GDPR */
}
//       <div className="form-checkbox-row">
//         <input
//           type="checkbox"
//           checked={agreed}
//           onChange={(e) => setAgreed(e.target.checked)}
//           className="mt-0.5"
//         />
//         <label className="text-sm text-foreground/90 leading-relaxed cursor-pointer font-medium">
//           {t(
//             'Genom att skicka in detta formulär godkänner du att Tip the Velvet (ekonomisk förening) sparar din ansökan och mediefiler i syfte att hantera artistbokningar. Vi delar aldrig din data med tredje part, och du kan när som helst kontakta oss för att få dina uppgifter raderade.',
//             'By submitting this form, you agree to Tip the Velvet (economic association) storing your application and media files for the purpose of managing artist bookings. We never share your data with third parties, and you can contact us at any time to have your information deleted.'
//           )}
//         </label>
//       </div>

//       <button
//         type="button"
//         onClick={handleSubmit}
//         className="w-full btn-gold py-3 disabled:opacity-50"
//         disabled={submitting || !agreed}
//       >
//         {submitting ? (
//           <Loader2 className="h-4 w-4 animate-spin" />
//         ) : (
//           <>
//             <Send className="h-4 w-4" />
//             {t('Skicka ansökan', 'Submit Application')}
//           </>
//         )}
//       </button>
//     </div>
//   )
// }
