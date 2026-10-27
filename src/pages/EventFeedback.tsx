import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Seo } from '@/components/Seo'
import { StarRating } from '@/components/feedback/StarRating'
import { EmojiPicker } from '@/components/feedback/EmojiPicker'
import {
  aspectsForEvent,
  getFeedbackEventBySlug,
  submitFeedback,
  type FeedbackEvent,
} from '@/services/feedbackService'
import { HOW_FOUND_OPTIONS, resolveAspect } from '@/lib/feedbackAspects'

// The private answers as they look before anything is filled in (same order as privateKey below)
const EMPTY_PRIVATE = JSON.stringify([{}, '', '', '', '', '', '', ''])

// Radio questions laid out as one grid, so the four answers of every question line up in the same
// columns whatever the question's length. "Not specified" is the last, empty-valued answer and is
// selected by default, so no question ever stands in the way of sending. On a phone each question
// is its own label plus a wrapping row of answers.
const RadioQuestions = ({
  questions,
}: {
  questions: {
    label: string
    name: string
    value: string
    options: readonly (readonly [string, string])[]
    onChange: (value: string) => void
  }[]
}) => (
  <div className="grid items-center gap-x-5 gap-y-4 sm:grid-cols-[auto_repeat(4,auto)] sm:justify-between">
    {questions.map((question) => (
      <div key={question.name} className="contents">
        <label className="form-label-gold text-center sm:pr-3 sm:text-left">{question.label}</label>
        <div
          role="radiogroup"
          aria-label={question.label}
          className="flex flex-wrap justify-center gap-x-5 gap-y-2 sm:contents"
        >
          {question.options.map(([optionValue, optionLabel]) => (
            <label
              key={optionValue}
              // "Not specified" is the default anyway, so it is only shown from tablet width up
              className={`cursor-pointer items-center gap-2 whitespace-nowrap text-sm ${
                optionValue === '' ? 'hidden sm:flex' : 'flex'
              }`}
            >
              <input
                type="radio"
                name={question.name}
                value={optionValue}
                checked={question.value === optionValue}
                onChange={() => question.onChange(optionValue)}
                className="h-4 w-4 accent-accent"
              />
              {optionLabel}
            </label>
          ))}
        </div>
      </div>
    ))}
  </div>
)

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
  // Which part failed to save last (null = nothing), so the message shows next to that button
  const [failedStage, setFailedStage] = useState<'stars' | 'review' | 'all' | 'autosave' | null>(
    null
  )

  const [rating, setRating] = useState(0)
  const [aspects, setAspects] = useState<Record<string, number>>({})
  const [liked, setLiked] = useState('')
  const [improve, setImprove] = useState('')
  const [extraComment, setExtraComment] = useState('')
  const [beenBefore, setBeenBefore] = useState('')
  const [howFound, setHowFound] = useState('')
  // A free comment on how they found us (which poster, which group ...), useful for marketing
  const [howFoundNote, setHowFoundNote] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState('')
  const [review, setReview] = useState('')
  // "Show my review on the website" — ticked by default; only used with the review text, and the board still approves each one
  const [mayQuote, setMayQuote] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<'stars' | 'review' | 'all' | null>(null)
  // What is already stored, so each section can show it is sent (and offer "update" once the guest
  // edits it again). The review text covers a button press and the automatic save when leaving the
  // box; the private answers only count as sent when their own button was pressed.
  const [sentReview, setSentReview] = useState('')
  const [sentPrivate, setSentPrivate] = useState<string | null>(null)
  const privateKey = JSON.stringify([
    aspects,
    liked,
    improve,
    extraComment,
    beenBefore,
    howFound,
    howFoundNote,
    wouldRecommend,
  ])
  // The private answers last stored (by the Send button or automatically): they save themselves a
  // moment after the guest stops typing, so nothing is lost if they never press Send
  const [storedPrivate, setStoredPrivate] = useState(EMPTY_PRIVATE)
  const reviewSent = sentReview !== '' && review.trim() === sentReview
  const privateSent = sentPrivate !== null && sentPrivate === privateKey
  const detailsRef = useRef<HTMLDivElement>(null)
  const reviewRef = useRef<HTMLTextAreaElement>(null)

  // Puts an emoji from the picker into the review where the cursor is (or at the end)
  const insertEmoji = (emoji: string) => {
    const el = reviewRef.current
    const start = el?.selectionStart ?? review.length
    const end = el?.selectionEnd ?? review.length
    setReview((review.slice(0, start) + emoji + review.slice(end)).slice(0, 2000))
    window.setTimeout(() => {
      el?.focus()
      el?.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }
  // Honeypot: real guests never see or fill this; bots that fill every field are dropped.
  const [website, setWebsite] = useState('')

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    getFeedbackEventBySlug(slug)
      .then((e) => !cancelled && setEvent(e))
      .catch((err) => console.error(err))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [slug])

  // 'autosave' = the review box lost focus: stored quietly. Every send carries the whole answer, so
  // the sections never overwrite each other.
  const send = async (stage: 'stars' | 'review' | 'all' | 'autosave', nextRating = rating) => {
    if (!event || website || nextRating < 0.5) return
    const markSent = () => {
      setSentReview(review.trim())
      setStoredPrivate(privateKey)
      if (stage === 'all') setSentPrivate(privateKey)
      setSaved(stage === 'autosave' ? 'review' : stage)
    }
    if (isPreview) {
      markSent()
      return
    }
    setSaving(true)
    setFailedStage(null)
    try {
      await submitFeedback(event.id, {
        rating: nextRating,
        aspects,
        review,
        liked,
        improve,
        extraComment,
        beenBefore,
        howFound,
        howFoundNote,
        wouldRecommend,
        mayQuote,
        language,
      })
      markSent()
    } catch (err) {
      console.error(err)
      setFailedStage(stage)
    } finally {
      setSaving(false)
    }
  }

  // Saves the private section by itself 1.5 s after the last change (the review, the tick-box and the
  // rating are re-sent along with it, as every send carries the whole answer)
  useEffect(() => {
    if (rating === 0 || privateKey === storedPrivate) return
    const timer = window.setTimeout(() => void send('autosave'), 1500)
    return () => window.clearTimeout(timer)
    // send is rebuilt on every render; the values it reads are the ones listed here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privateKey, storedPrivate, rating, review, mayQuote])

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
      <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
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
          {saved === 'stars' && (
            <p className="text-info">
              {t(
                'Tack! Ditt betyg är sparat. Skriv gärna en recension nedan.',
                'Thank you! Your rating is saved. Feel free to write a review below.'
              )}
            </p>
          )}
          {failedStage === 'stars' && (
            <p className="velvet-warning-box">
              {t(
                'Något gick fel och ditt betyg sparades inte. Försök igen.',
                "Something went wrong and your rating wasn't saved. Please try again."
              )}
            </p>
          )}

          {rating > 0 && (
            <div className="space-y-2 text-left pt-2">
              <label className="form-label-gold block">
                {t('Din recension (valfritt)', 'Your review (optional)')}
              </label>
              <div className="relative">
                <textarea
                  ref={reviewRef}
                  className="velvet-textarea pr-10"
                  rows={3}
                  maxLength={2000}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  onBlur={() => {
                    if (review.trim() && review.trim() !== sentReview) void send('autosave')
                  }}
                  placeholder={t('Hur var kvällen för dig?', 'How was the night for you?')}
                />
                <EmojiPicker onPick={insertEmoji} />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:justify-between">
                <label className="flex cursor-pointer items-center justify-center gap-2 text-center sm:text-left">
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
                <button
                  type="button"
                  disabled={saving || !review.trim() || reviewSent}
                  onClick={() => void send('review')}
                  className={`shrink-0 ${reviewSent ? 'btn-gold-outline' : 'btn-gold'}`}
                >
                  {saving
                    ? t('Skickar...', 'Sending...')
                    : reviewSent
                      ? t('Skickad ✓', 'Sent ✓')
                      : sentReview
                        ? t('Uppdatera recension', 'Update review')
                        : t('Skicka recension', 'Send review')}
                </button>
              </div>
              <p className="text-center text-[13px] text-emerald-400" aria-live="polite">
                {reviewSent && t('✓ Recensionen är skickad. Tack!', '✓ Review sent. Thank you!')}
              </p>
              {(failedStage === 'review' || failedStage === 'autosave') && (
                <p className="velvet-warning-box">
                  {t(
                    'Något gick fel och din recension sparades inte. Försök igen.',
                    "Something went wrong and your review wasn't saved. Please try again."
                  )}
                </p>
              )}
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
                <div className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
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

              <RadioQuestions
                questions={[
                  {
                    label: t(
                      'Har du varit på Tip the Velvet förut?',
                      'Have you been to Tip the Velvet before?'
                    ),
                    name: 'been-before',
                    value: beenBefore,
                    onChange: setBeenBefore,
                    options: [
                      ['yes', t('Ja', 'Yes')],
                      ['no', t('Nej', 'No')],
                      ['maybe', t('Kanske', 'Maybe')],
                      ['', t('Ej angivet', 'Not specified')],
                    ],
                  },
                  {
                    label: t('Skulle du rekommendera oss?', 'Would you recommend us?'),
                    name: 'would-recommend',
                    value: wouldRecommend,
                    onChange: setWouldRecommend,
                    options: [
                      ['yes', t('Ja', 'Yes')],
                      ['no', t('Nej', 'No')],
                      ['maybe', t('Kanske', 'Maybe')],
                      ['', t('Ej angivet', 'Not specified')],
                    ],
                  },
                ]}
              />

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
                    {t('Annat / kommentar', 'Other / comment')}
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={howFoundNote}
                    onChange={(e) => setHowFoundNote(e.target.value)}
                    placeholder={t(
                      'T.ex. vilken affisch eller grupp',
                      'E.g. which poster or group'
                    )}
                    className="velvet-input"
                  />
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

            <div className="space-y-3" aria-live="polite">
              {failedStage === 'all' && (
                <p className="velvet-warning-box">
                  {t(
                    'Något gick fel och dina svar sparades inte. Försök igen.',
                    "Something went wrong and your answers weren't saved. Please try again."
                  )}
                </p>
              )}
              {privateSent ? (
                // Sent: thank them, and offer the way back. They are not sent away automatically,
                // since they may not have written their review yet.
                <div className="callout-panel space-y-3">
                  <p className="text-emerald-400">
                    {t('✓ Tack! Vi läser allt.', '✓ Thank you! We read everything.')}
                  </p>
                  {!reviewSent && (
                    <button
                      type="button"
                      onClick={() =>
                        reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                      className="gold-link text-sm"
                    >
                      {t(
                        'Du har inte skrivit någon recension än. Du kan göra det här ovanför ↑',
                        "You haven't written a review yet. You can do that above ↑"
                      )}
                    </button>
                  )}
                  <div>
                    <Link to={`/events/event/${event.slug}`} className="btn-gold inline-flex">
                      {t('Tillbaka till eventet', 'Back to the event')}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end">
                  {storedPrivate === privateKey && privateKey !== EMPTY_PRIVATE && (
                    <span className="text-[13px] text-emerald-400">
                      {t('✓ Sparat automatiskt', '✓ Saved automatically')}
                    </span>
                  )}
                  <button type="submit" disabled={saving} className="btn-gold">
                    {saving
                      ? t('Skickar...', 'Sending...')
                      : sentPrivate !== null
                        ? t('Uppdatera', 'Update')
                        : t('Skicka', 'Send')}
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
