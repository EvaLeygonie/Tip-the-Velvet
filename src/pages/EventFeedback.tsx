import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Seo } from '@/components/Seo'
import { StarRating } from '@/components/feedback/StarRating'
import {
  aspectsForEvent,
  getFeedbackEventBySlug,
  submitFeedback,
  type FeedbackEvent,
} from '@/services/feedbackService'
import { HOW_FOUND_OPTIONS, resolveAspect } from '@/lib/feedbackAspects'

// Public feedback page, reached by QR code / link after a show. Stars first: tapping a star
// saves the rating straight away, so a guest who only taps still counts. The rest is optional
// and, when sent, updates that same answer (the database keeps one row per device per event).
export const EventFeedback = () => {
  const { t, language } = useLanguage()
  const { slug } = useParams()
  const { user } = useAuth()
  // ?preview=1 lets a logged-in board member see the page as guests will, even while it is closed.
  // Nothing is saved from a preview.
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === '1' && !!user
  const [event, setEvent] = useState<FeedbackEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const [rating, setRating] = useState(0)
  const [aspects, setAspects] = useState<Record<string, number>>({})
  const [liked, setLiked] = useState('')
  const [improve, setImprove] = useState('')
  const [extraComment, setExtraComment] = useState('')
  const [howFound, setHowFound] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState('')
  const [review, setReview] = useState('')
  // "Show my review on the website" — ticked by default; only used with the review text, and the board still approves each one
  const [mayQuote, setMayQuote] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<'stars' | 'review' | 'all' | null>(null)
  // The review text that is already stored, so leaving the box without changes sends nothing, and a
  // small "Saved" note shows after an automatic save.
  const [sentReview, setSentReview] = useState('')
  const [autoSaved, setAutoSaved] = useState(false)
  const detailsRef = useRef<HTMLDivElement>(null)
  // Honeypot: real guests never see or fill this; bots that fill every field are dropped.
  const [website, setWebsite] = useState('')

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    getFeedbackEventBySlug(slug)
      .then((e) => !cancelled && setEvent(e))
      .catch((err) => {
        console.error(err)
        if (!cancelled) setFailed(true)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [slug])

  // 'autosave' = the review box lost focus: stored quietly, no thank-you message
  const send = async (stage: 'stars' | 'review' | 'all' | 'autosave', nextRating = rating) => {
    if (!event || website || nextRating < 0.5) return
    if (isPreview) {
      if (stage === 'autosave') setAutoSaved(true)
      else setSaved(stage)
      return
    }
    setSaving(true)
    setFailed(false)
    try {
      await submitFeedback(event.id, {
        rating: nextRating,
        aspects,
        review,
        liked,
        improve,
        extraComment,
        howFound,
        wouldRecommend,
        mayQuote,
        language,
      })
      setSentReview(review.trim())
      if (stage === 'autosave') setAutoSaved(true)
      else {
        setSaved(stage)
        setAutoSaved(false)
      }
    } catch (err) {
      console.error(err)
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const pickRating = (value: number) => {
    setRating(value)
    void send('stars', value)
  }

  const title = t('Vad tyckte du? | Tip the Velvet', 'What did you think? | Tip the Velvet')

  if (loading) {
    return (
      <div className="loading-container">
        <p className="loading-text">{t('Öppnar ridån...', 'Opening the curtain...')}</p>
      </div>
    )
  }

  if (!event || (!event.is_open && !isPreview)) {
    // Auto mode and not open yet can only mean the opening time is still ahead.
    const opensAt = event?.opens_at ? new Date(event.opens_at) : null
    const notYet = !!opensAt && event?.feedback_mode === 'auto'
    const clock = opensAt?.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    return (
      <div className="page-shell text-center">
        <Seo title={title} noindex />
        <h1>{t('Omdömen', 'Feedback')}</h1>
        <div className="gold-divider" />
        <p className="text-body">
          {!event
            ? t('Vi hittade inte eventet.', "We couldn't find that event.")
            : notYet
              ? t(`Omdömen öppnar kl. ${clock}.`, `Feedback opens at ${clock}.`)
              : t(
                  'Omdömen är inte öppna för det här eventet. Tack för att du var med!',
                  'Feedback is not open for this event. Thank you for coming!'
                )}
        </p>
        <Link to="/events" className="btn-gold-outline inline-block mt-6">
          {t('Till eventen', 'To the events')}
        </Link>
      </div>
    )
  }

  const aspectRows = aspectsForEvent(event)
    .map((key) => resolveAspect(key, event.custom_aspects))
    .filter((a): a is NonNullable<typeof a> => !!a)

  return (
    <div className="page-shell">
      <Seo title={title} noindex />
      <div className="bg-glow-spot" />
      <div className="max-w-xl mx-auto px-4 text-center space-y-6">
        {isPreview && (
          <p className="velvet-warning-box">
            {t(
              `Förhandsvisning: så här ser gästerna sidan. Inget sparas. Omdömen är just nu ${event.is_open ? 'öppna' : 'stängda'} för gästerna.`,
              `Preview: this is what guests see. Nothing is saved. Feedback is currently ${event.is_open ? 'open' : 'closed'} for guests.`
            )}
          </p>
        )}
        <h1>{t('Vad tyckte du?', 'What did you think?')}</h1>
        <p className="text-3xl sm:text-4xl font-decorative text-accent leading-tight">
          {event.title}
        </p>
        <div className="gold-divider" />

        <div className="callout-panel space-y-3">
          <p className="label-kicker">{t('Ditt betyg på kvällen', 'Your rating of the night')}</p>
          <div className="flex justify-center">
            <StarRating value={rating} onChange={pickRating} size={40} label="1-5" />
          </div>
          {saved && (
            <div className="space-y-2">
              <p className="text-info">
                {saved === 'all'
                  ? t('Tack så mycket! Vi läser allt.', 'Thank you so much! We read everything.')
                  : saved === 'review'
                    ? t('Tack! Din recension är skickad.', 'Thank you! Your review has been sent.')
                    : t(
                        'Tack! Ditt betyg är sparat. Skriv gärna en recension nedan.',
                        'Thank you! Your rating is saved. Feel free to write a review below.'
                      )}
              </p>
              {saved === 'review' && (
                <button
                  type="button"
                  onClick={() =>
                    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  className="gold-link text-sm"
                >
                  {t(
                    'Vill du hjälpa oss bli ännu bättre? Svara på några frågor till ↓',
                    'Want to help us get even better? Answer a few more questions ↓'
                  )}
                </button>
              )}
            </div>
          )}
          {failed && (
            <p className="velvet-warning-box">
              {t(
                'Något gick fel och ditt svar sparades inte. Försök igen.',
                "Something went wrong and your answer wasn't saved. Please try again."
              )}
            </p>
          )}

          {rating > 0 && (
            <div className="space-y-2 text-left pt-2">
              <label className="form-label-gold block">
                {t('Din recension (valfritt)', 'Your review (optional)')}
              </label>
              <textarea
                className="velvet-textarea"
                rows={3}
                maxLength={2000}
                value={review}
                onChange={(e) => {
                  setReview(e.target.value)
                  setAutoSaved(false)
                }}
                onBlur={() => {
                  if (review.trim() && review.trim() !== sentReview) void send('autosave')
                }}
                placeholder={t(
                  'Hur var kvällen för dig, med dina egna ord?',
                  'How was the night for you, in your own words?'
                )}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mayQuote}
                  onChange={(e) => setMayQuote(e.target.checked)}
                  className="shrink-0"
                />
                <span className="text-info text-[13px]">
                  {t(
                    'Visa min recension anonymt på hemsidan',
                    'Show my review anonymously on the website'
                  )}
                </span>
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-info text-[13px]" aria-live="polite">
                  {autoSaved && saved !== 'review' && t('Sparat ✓', 'Saved ✓')}
                </span>
                <button
                  type="button"
                  disabled={saving || !review.trim()}
                  onClick={() => void send('review')}
                  className="btn-gold"
                >
                  {saving ? t('Skickar...', 'Sending...') : t('Skicka recension', 'Send review')}
                </button>
              </div>
            </div>
          )}
        </div>
        {rating > 0 && (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault()
              void send('all')
            }}
          >
            {/* PRIVATE: for the board only, never shown publicly */}
            <div ref={detailsRef} className="callout-panel form-stack text-left scroll-mt-24">
              <p className="label-kicker text-center">
                {t('Hjälp oss bli bättre (valfritt)', 'Help us get better (optional)')}
              </p>

              {aspectRows.length > 0 && (
                <div className="space-y-3">
                  {aspectRows.map((aspect) => (
                    <div key={aspect.key} className="flex items-center justify-between gap-3">
                      <span className="text-body text-sm">{t(aspect.sv, aspect.eng)}</span>
                      <StarRating
                        value={aspects[aspect.key] ?? 0}
                        onChange={(v) => setAspects((prev) => ({ ...prev, [aspect.key]: v }))}
                        size={22}
                        label={t(aspect.sv, aspect.eng)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="form-field">
                <label className="form-label-gold">
                  {t('Vad gillade du?', 'What did you like?')}
                </label>
                <textarea
                  className="velvet-textarea"
                  rows={3}
                  maxLength={2000}
                  value={liked}
                  onChange={(e) => setLiked(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label-gold">
                  {t('Vad kan vi göra bättre?', 'What can we do better?')}
                </label>
                <textarea
                  className="velvet-textarea"
                  rows={3}
                  maxLength={2000}
                  value={improve}
                  onChange={(e) => setImprove(e.target.value)}
                />
              </div>

              <div className="form-row-2-tight">
                <div className="form-field">
                  <label className="form-label-gold">
                    {t('Hur hittade du festen?', 'How did you find the party?')}
                  </label>
                  <select
                    className="velvet-select"
                    value={howFound}
                    onChange={(e) => setHowFound(e.target.value)}
                  >
                    <option value="" />
                    {HOW_FOUND_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>
                        {t(o.sv, o.eng)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label-gold">
                    {t('Skulle du rekommendera oss?', 'Would you recommend us?')}
                  </label>
                  <select
                    className="velvet-select"
                    value={wouldRecommend}
                    onChange={(e) => setWouldRecommend(e.target.value)}
                  >
                    <option value="" />
                    <option value="yes">{t('Ja', 'Yes')}</option>
                    <option value="maybe">{t('Kanske', 'Maybe')}</option>
                    <option value="no">{t('Nej', 'No')}</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label-gold">{t('Extra kommentar', 'Extra comment')}</label>
                <textarea
                  className="velvet-textarea"
                  rows={3}
                  maxLength={2000}
                  value={extraComment}
                  onChange={(e) => setExtraComment(e.target.value)}
                  placeholder={t(
                    'Något annat du vill berätta som inte passar ovan?',
                    "Anything else you'd like to tell us that doesn't fit above?"
                  )}
                />
              </div>
            </div>

            {/* Spam trap: hidden with inline styles so no global input style can reveal it */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              name="website"
              style={{
                position: 'absolute',
                left: '-9999px',
                width: '1px',
                height: '1px',
                opacity: 0,
              }}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />

            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="btn-gold">
                {saving ? t('Skickar...', 'Sending...') : t('Skicka', 'Send')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
