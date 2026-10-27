import { useEffect, useState } from 'react'
import { ChevronDown, Quote } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  getFeedbackReviews,
  type FeedbackSummary as Summary,
  type PublicReviews,
} from '@/services/feedbackService'
import { StarRating } from '@/components/feedback/StarRating'

// The rating is shown whenever enough guests have answered (the database only returns an average
// from a minimum number of ratings), even after feedback has closed. Only the "leave feedback"
// button depends on feedback being open.

// Small version for the top of an event page, right under the title: stars, average and number of
// guests, which scrolls to the full box below.
export const FeedbackBadge = ({
  summary,
  eventSlug,
}: {
  summary: Summary | null
  eventSlug: string
}) => {
  const { t } = useLanguage()
  const hasAverage = summary?.average !== undefined
  if (!summary || (!hasAverage && !summary.is_open)) return null

  return (
    <div className="flex flex-col items-center gap-2">
      {hasAverage && summary.average !== undefined && (
        <a
          href="#reviews"
          onClick={(e) => {
            e.preventDefault()
            document
              .getElementById('reviews')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
          className="flex flex-col items-center gap-0.5 text-sm text-foreground/80 hover:text-accent transition-colors"
        >
          <StarRating value={summary.average} size={16} label={`${summary.average}/5`} />
          <span className="inline-flex items-center gap-1.5 text-foreground/50">
            {t(`från ${summary.count} gäster`, `from ${summary.count} guests`)}
            <ChevronDown className="h-4 w-4 text-accent" aria-hidden="true" />
          </span>
        </a>
      )}
      {summary.is_open && (
        <Link
          to={`/events/event/${eventSlug}/feedback`}
          className="btn-gold-outline text-xs py-1.5 px-4"
        >
          {t('Lämna ditt omdöme', 'Leave your feedback')}
        </Link>
      )}
    </div>
  )
}

// Full box further down the page: the average with the approved reviews, plus the button to leave
// feedback while it is open.
const FIRST_PAGE = 3
const NEXT_PAGE = 5

export const FeedbackSummary = ({
  summary,
  eventId,
  eventSlug,
}: {
  summary: Summary | null
  eventId: string
  eventSlug: string
}) => {
  const { t } = useLanguage()
  // The approved reviews: three to begin with, then "show more" adds five at a time
  const [reviews, setReviews] = useState<PublicReviews['reviews']>([])
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    let cancelled = false
    getFeedbackReviews(eventId, FIRST_PAGE, 0)
      .then((page) => {
        if (cancelled) return
        setReviews(page.reviews)
        setTotal(page.total)
      })
      .catch((err) => console.error(err))
    return () => {
      cancelled = true
    }
  }, [eventId])

  const showMore = async () => {
    setLoadingMore(true)
    try {
      const page = await getFeedbackReviews(eventId, NEXT_PAGE, reviews.length)
      setReviews((prev) => [...prev, ...page.reviews])
      setTotal(page.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMore(false)
    }
  }

  const hasAverage = summary?.average !== undefined
  if (!summary || (!hasAverage && !summary.is_open)) return null

  return (
    <section id="reviews" className="callout-panel text-center space-y-3 my-8">
      <p className="label-kicker">{t('Vad tyckte gästerna?', 'What did the guests think?')}</p>
      {hasAverage ? (
        <>
          <div className="flex items-center justify-center gap-3">
            <StarRating value={summary.average ?? 0} size={24} label={`${summary.average}/5`} />
            <span className="text-xl font-decorative text-accent">
              {summary.average?.toFixed(1)}
            </span>
          </div>
          <p className="text-info">
            {t(
              `Från ${summary.count} gäster som svarat`,
              `From ${summary.count} guests who answered`
            )}
          </p>
          {reviews.length > 0 && (
            <div className="flex flex-col gap-4 pt-3 text-left">
              {reviews.map((item) => (
                <figure
                  key={`${item.created_at}-${item.review}`}
                  className="flex gap-3 rounded-xl border border-accent/15 bg-gradient-to-b from-black/50 to-black/30 p-5 shadow-lg shadow-black/50 transition-all duration-300 hover:border-accent/30 hover:-translate-y-0.5"
                >
                  <Quote
                    className="mt-0.5 h-5 w-5 shrink-0 text-accent fill-accent/20"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <blockquote className="text-body text-foreground/85 leading-relaxed">
                    {item.review}
                  </blockquote>
                </figure>
              ))}
              {reviews.length < total && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => void showMore()}
                    disabled={loadingMore}
                    className="btn-gold-outline text-xs py-2 px-5"
                  >
                    {loadingMore
                      ? t('Laddar...', 'Loading...')
                      : t(
                          `Visa fler recensioner (${total - reviews.length} till)`,
                          `Show more reviews (${total - reviews.length} more)`
                        )}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-info">
          {t(
            'Bli en av de första att betygsätta kvällen!',
            'Be one of the first to rate the night!'
          )}
        </p>
      )}
      {summary.is_open && (
        <Link to={`/events/event/${eventSlug}/feedback`} className="btn-gold-outline inline-block">
          {t('Lämna ditt omdöme', 'Leave your feedback')}
        </Link>
      )}
    </section>
  )
}
