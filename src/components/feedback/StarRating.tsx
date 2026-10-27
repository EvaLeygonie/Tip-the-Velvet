import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: number
  label?: string
}

// Interactive when onChange is given: the left half of a star picks n - 0.5, the right half picks
// n. Stars fill in proportion to the value, so 4.2 shows four full stars and a fifth filled a fifth
// of the way.
export const StarRating = ({ value, onChange, size = 28, label }: StarRatingProps) => {
  return (
    <div
      className="flex items-center gap-0.5"
      role={onChange ? 'radiogroup' : 'img'}
      aria-label={label}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.min(1, Math.max(0, value - (n - 1)))
        return (
          <span
            key={n}
            className="relative inline-flex p-0.5"
            style={{ width: size + 4, height: size + 4 }}
          >
            <Star size={size} className="text-accent/30" strokeWidth={1.5} />
            {fill > 0 && (
              <span
                className="absolute left-0.5 top-0.5 overflow-hidden"
                style={{ width: size * fill, height: size }}
              >
                <Star size={size} className="text-accent fill-accent" strokeWidth={1.5} />
              </span>
            )}
            {onChange &&
              [n - 0.5, n].map((step, half) => (
                <button
                  key={step}
                  type="button"
                  role="radio"
                  aria-checked={step === value}
                  aria-label={`${step}`}
                  onClick={() => onChange(step)}
                  className="absolute top-0 h-full w-1/2 active:scale-90"
                  style={{ left: half === 0 ? 0 : '50%' }}
                />
              ))}
          </span>
        )
      })}
    </div>
  )
}
