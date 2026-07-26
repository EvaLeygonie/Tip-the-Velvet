import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { CastingApplication } from '@/types/types'
import { User, Music, Clock, Utensils, Receipt, Upload, Save, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface BookedArtistFormProps {
  application: CastingApplication
}

export const BookedArtistForm: React.FC<BookedArtistFormProps> = ({ application }) => {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Relaterade ID:n
  const [performerId, setPerformerId] = useState<string>('')
  const [actId, setActId] = useState<string>('')

  // Form State
  const [bioSv, setBioSv] = useState('')
  const [bioEng, setBioEng] = useState('')
  const [promoImageId, setPromoImageId] = useState('')

  const [trackTitle, setTrackTitle] = useState('')
  const [trackArtist, setTrackArtist] = useState('')
  const [audioFileUrl, setAudioFileUrl] = useState('')

  const [arrivalTime, setArrivalTime] = useState('')
  const [dietaryRequirements, setDietaryRequirements] = useState('')
  const [travelReceiptUrl, setTravelReceiptUrl] = useState('')

  // Hämta befintlig data från tabellerna
  useEffect(() => {
    const loadBookingData = async () => {
      try {
        setLoading(true)

        // 1. Hämta artist
        const { data: perf } = await supabase
          .from('performers')
          .select('id, bio_sv, bio_eng, promo_image_id')
          .eq('email', application.email)
          .eq('performer_name', application.performer_name)
          .maybeSingle()

        if (perf) {
          setPerformerId(perf.id)
          setBioSv(perf.bio_sv || '')
          setBioEng(perf.bio_eng || '')
          setPromoImageId(perf.promo_image_id || '')

          // 2. Hämta akt
          const { data: act } = await supabase
            .from('performer_acts')
            .select('id, track_title, track_artist, audio_file')
            .eq('performer_id', perf.id)
            .eq('event_id', application.event_id)
            .maybeSingle()

          if (act) {
            setActId(act.id)
            setTrackTitle(act.track_title || '')
            setTrackArtist(act.track_artist || '')
            setAudioFileUrl(act.audio_file || '')
          }

          // 3. Hämta event_performer
          const { data: ep } = await supabase
            .from('event_performers')
            .select('arrival_time, dietary_requirements, travel_receipt_url')
            .eq('event_id', application.event_id)
            .eq('performer_id', perf.id)
            .maybeSingle()

          if (ep) {
            setArrivalTime(ep.arrival_time ? ep.arrival_time.substring(0, 16) : '')
            setDietaryRequirements(ep.dietary_requirements || '')
            setTravelReceiptUrl(ep.travel_receipt_url || '')
          }
        }
      } catch (err) {
        console.error(err)
        toast.error('Kunde inte läsa in bokningsuppgifter.')
      } finally {
        setLoading(false)
      }
    }

    loadBookingData()
  }, [application])

  // Ladda upp musikfil
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !actId) return

    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${actId}/${Date.now()}.${fileExt}`

      const { error: uploadErr } = await supabase.storage
        .from('act-music')
        .upload(filePath, file, { upsert: true })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('act-music').getPublicUrl(filePath)
      setAudioFileUrl(urlData.publicUrl)
      toast.success('Ljudfil uppladdad!')
    } catch (err) {
      console.error(err)
      toast.error('Gick inte att ladda upp ljudfilen.')
    }
  }

  // Ladda upp resekvitto
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !performerId) return

    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${application.event_id}/${performerId}_${Date.now()}.${fileExt}`

      const { error: uploadErr } = await supabase.storage
        .from('travel-receipts')
        .upload(filePath, file, { upsert: true })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('travel-receipts').getPublicUrl(filePath)
      setTravelReceiptUrl(urlData.publicUrl)
      toast.success('Resekvitto uppladdat!')
    } catch (err) {
      console.error(err)
      toast.error('Gick inte att ladda upp kvittot.')
    }
  }

  // Spara alla ändringar samtidigt
  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!performerId) return

    setIsSaving(true)
    try {
      // 1. Uppdatera performers
      const { error: perfError } = await supabase
        .from('performers')
        .update({
          bio_sv: bioSv,
          bio_eng: bioEng,
          promo_image_id: promoImageId,
        })
        .eq('id', performerId)

      if (perfError) throw perfError

      // 2. Uppdatera event_performers
      const { error: epError } = await supabase
        .from('event_performers')
        .update({
          arrival_time: arrivalTime ? new Date(arrivalTime).toISOString() : null,
          dietary_requirements: dietaryRequirements,
          travel_receipt_url: travelReceiptUrl,
        })
        .eq('event_id', application.event_id)
        .eq('performer_id', performerId)

      if (epError) throw epError

      // 3. Om act finns, uppdatera performer_acts
      if (actId) {
        const { error: actError } = await supabase
          .from('performer_acts')
          .update({
            track_title: trackTitle,
            track_artist: trackArtist,
            audio_file: audioFileUrl,
          })
          .eq('id', actId)

        if (actError) throw actError
      }

      toast.success('Dina uppgifter har sparats!')
    } catch (err) {
      console.error(err)
      toast.error('Kunde inte spara alla ändringar.')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-sm text-foreground/70">Laddar formulär...</div>
  }

  return (
    <form onSubmit={handleSaveAll} className="space-y-6">
      {/* 1. Artistprofil */}
      <div className="login-card space-y-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <User className="text-accent w-5 h-5" />
          <h3 className="text-base font-medium">1. Artistprofil & Promotext</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="form-label-gold block text-xs mb-1">Promotext (Svenska)</label>
            <textarea
              rows={3}
              value={bioSv}
              onChange={(e) => setBioSv(e.target.value)}
              className="login-input text-sm"
              placeholder="Beskriv din artistprofil på svenska..."
            />
          </div>

          <div>
            <label className="form-label-gold block text-xs mb-1">Promotext (Engelska)</label>
            <textarea
              rows={3}
              value={bioEng}
              onChange={(e) => setBioEng(e.target.value)}
              className="login-input text-sm"
              placeholder="Describe your artist profile in English..."
            />
          </div>

          <div>
            <label className="form-label-gold block text-xs mb-1">Promobild (Bild-ID / URL)</label>
            <input
              type="text"
              value={promoImageId}
              onChange={(e) => setPromoImageId(e.target.value)}
              className="login-input text-sm"
            />
          </div>
        </div>
      </div>

      {/* 2. Musik & Akt */}
      <div className="login-card space-y-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <Music className="text-accent w-5 h-5" />
          <h3 className="text-base font-medium">2. Musik & Showlåt</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="form-label-gold block text-xs mb-1">Låttitel</label>
            <input
              type="text"
              value={trackTitle}
              onChange={(e) => setTrackTitle(e.target.value)}
              className="login-input text-sm"
              placeholder="t.ex. Feeling Good"
            />
          </div>

          <div>
            <label className="form-label-gold block text-xs mb-1">Originalartist</label>
            <input
              type="text"
              value={trackArtist}
              onChange={(e) => setTrackArtist(e.target.value)}
              className="login-input text-sm"
              placeholder="t.ex. Nina Simone"
            />
          </div>
        </div>

        <div>
          <label className="form-label-gold block text-xs mb-1">Ljudfil (MP3/WAV)</label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className="btn-gold-outline text-xs cursor-pointer flex items-center gap-2 py-2 px-3"
            >
              <Upload size={14} />
              Välj ljudfil
            </label>
            {audioFileUrl && (
              <span className="text-xs text-accent flex items-center gap-1">
                <CheckCircle2 size={12} /> Fil uppladdad
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Logistik, Mat & Kvitton */}
      <div className="login-card space-y-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <Clock className="text-accent w-5 h-5" />
          <h3 className="text-base font-medium">3. Logistik & Mat</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="form-label-gold block text-xs mb-1">Beräknad Ankomsttid</label>
            <input
              type="datetime-local"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="login-input text-sm"
            />
          </div>

          <div>
            <label className="form-label-gold block text-xs mb-1 flex items-center gap-1">
              <Utensils size={14} />
              Matpreferenser & Allergier
            </label>
            <input
              type="text"
              value={dietaryRequirements}
              onChange={(e) => setDietaryRequirements(e.target.value)}
              className="login-input text-sm"
              placeholder="t.ex. Vegetarian, Nötallergi..."
            />
          </div>

          <div>
            <label className="form-label-gold block text-xs mb-1 flex items-center gap-1">
              <Receipt size={14} />
              Resekvitto (PDF/Bild)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleReceiptUpload}
                className="hidden"
                id="receipt-upload"
              />
              <label
                htmlFor="receipt-upload"
                className="btn-gold-outline text-xs cursor-pointer flex items-center gap-2 py-2 px-3"
              >
                <Upload size={14} />
                Ladda upp kvitto
              </label>
              {travelReceiptUrl && (
                <span className="text-xs text-accent flex items-center gap-1">
                  <CheckCircle2 size={12} /> Kvitto bifogat
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Huvudknapp för att spara allt */}
      <button
        type="submit"
        disabled={isSaving}
        className="btn-gold w-full justify-center py-3 text-base font-semibold"
      >
        <Save size={18} />
        {isSaving ? 'Sparar allt...' : 'Spara ändringar'}
      </button>
    </form>
  )
}
