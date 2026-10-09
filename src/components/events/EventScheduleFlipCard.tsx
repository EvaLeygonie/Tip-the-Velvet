import { Sparkles } from 'lucide-react'
import CloudinaryImage from '@/components/CloudinaryImage'
import { useLanguage } from '@/contexts/LanguageContext'

interface EventScheduleFlipCardProps {
  imageId: string | null
  glowVars: React.CSSProperties
  // Controlled from EventInfo.tsx — the toggle button lives in the right-hand info column
  // (so the two columns line up height-wise) but needs to flip this image, which sits in
  // the left column. Direct feedback 2026-09-24.
  isFlipped: boolean
}

interface ScheduleItem {
  // Plain numeric times read the same in both languages, so one shared field covers them.
  // "Därefter"/"Afterwards" is also a time marker (it's placing an event in the evening's
  // order, same as the clock times around it), just not a clock time — timeSv/timeEng let
  // it get the same gold styling without forcing a translation through the shared field.
  // Direct feedback 2026-09-24.
  time: string
  timeSv?: string
  timeEng?: string
  textSv: string
  textEng: string
}

// Mirrors the schedule in admin/marketing/EveningScheduleCard.tsx's buildScheduleBlock —
// same venue hours, same order. Kept as a separate, plainer list here rather than importing
// that one: the marketing version is written for a social caption (bold-unicode digits,
// accessibility/prohibited-items notices meant for people deciding whether to come), while
// this is a quick on-page reference for people who already know they're coming. If the
// schedule ever changes, update both. Direct feedback 2026-09-24.
const SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    time: '19.00',
    // Non-breaking spaces in "ta en drink" so the phrase can't get split across a line
    // break mid-way (e.g. "ta en" / "drink") — direct feedback 2026-09-24.
    textSv: 'Dörrarna öppnar! Anmäl er till dräkttävlingen, ta en drink och besök fotohörnan 📸',
    textEng:
      'Doors open! Sign up for the costume contest, grab a drink and visit the photo corner 📸',
  },
  {
    time: '19.00–20.30',
    textSv: 'Eldshow utanför! 🔥',
    textEng: 'Fire show outside! 🔥',
  },
  {
    time: '21.00',
    textSv: 'Showen startar med första akten! Därefter presenteras alla tävlande på scen.',
    textEng:
      'The show begins with the first act! After that, all contestants are presented on stage.',
  },
  {
    time: 'ca 22.00',
    textSv: 'Paus & mingel – rösta på kvällens bästa utklädnad! 🎭',
    textEng: 'Break & mingling – vote for the best costume of the night! 🎭',
  },
  {
    time: 'ca 22.30',
    textSv: 'Dags för andra akten! Efter showen prisutdelning för dräkttävlingen ✨',
    textEng: 'Time for the second act! After the show, costume contest prizes are announced ✨',
  },
  {
    time: '',
    timeSv: 'Därefter',
    timeEng: 'Afterwards',
    textSv: '– dansgolvet öppnar! 🎶',
    textEng: '– the dance floor opens! 🎶',
  },
  { time: '01.20', textSv: 'Baren stänger', textEng: 'Bar closes' },
  { time: '02.00', textSv: 'Portarna stängs', textEng: 'Venue closes' },
]

// Flips the promo image around to reveal the evening's schedule instead of adding a whole
// new section to an already long page. The toggle button itself lives in EventInfo.tsx's
// info column, not here — see isFlipped's comment above. Direct feedback 2026-09-24.
export const EventScheduleFlipCard = ({
  imageId,
  glowVars,
  isFlipped,
}: EventScheduleFlipCardProps) => {
  const { t } = useLanguage()

  return (
    // w-full + max-w here (matching promo-frame-event's own) is load-bearing, not
    // decorative: .promo-flip-scene's width:100% needs a concrete box to resolve against.
    // Without it, this wrapper (an auto-width flex item with no explicit size) and its
    // 100%-wide child form a sizing loop that collapses to a tiny fraction of the intended
    // 380/420px frame — exactly the "image got really small" regression. Direct feedback
    // 2026-09-24.
    <div className="w-full max-w-[380px] md:max-w-[420px]">
      <div className="promo-flip-scene" style={glowVars}>
        <div className={`promo-flip-inner ${isFlipped ? 'promo-flip-inner-flipped' : ''}`}>
          <div className="promo-flip-face">
            {imageId ? (
              <CloudinaryImage
                publicId={imageId}
                width={800}
                height={800}
                alt=""
                className="media-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-black/40">
                <Sparkles className="w-12 h-12 text-accent/20" />
              </div>
            )}
          </div>

          <div className="promo-flip-face promo-flip-face-back bg-gradient-to-b from-black/90 to-black/70 p-6 sm:p-8 flex flex-col items-center justify-center overflow-y-auto">
            <h3 className="font-decorative text-accent text-xl text-center shrink-0 mb-3">
              {t('Kvällens upplägg', "Tonight's schedule")}
            </h3>
            <div className="space-y-2.5 text-center">
              {SCHEDULE_ITEMS.map((item, i) => {
                const timeLabel = item.timeSv ? t(item.timeSv, item.timeEng ?? '') : item.time
                return (
                  <div key={i} className="text-xs sm:text-sm leading-snug">
                    {timeLabel && (
                      <span className="text-accent font-semibold mr-1.5">{timeLabel}</span>
                    )}
                    <span className="text-foreground/85">{t(item.textSv, item.textEng)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
