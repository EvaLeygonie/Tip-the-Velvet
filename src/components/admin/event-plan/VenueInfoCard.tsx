import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { updateVenueInfo, type EventAccessFields } from '@/services/eventInfoService'

type Venue = NonNullable<EventAccessFields['venue']>

interface VenueInfoCardProps {
  venue: Venue
  onSaved: (venue: Venue) => void
}

const inputClass = 'velvet-field'

// The venue's details as they show on every info page: practical info (sv/eng) plus the entrance
// code. They live on the venue itself (also editable under Contacts → Venues), so editing here
// updates every event at that venue. The code is withheld on the pages until 38h before start.
export const VenueInfoCard = ({ venue, onSaved }: VenueInfoCardProps) => {
  const { t, language } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [doorCode, setDoorCode] = useState(venue.door_code ?? '')
  const [infoSv, setInfoSv] = useState(venue.practical_info_sv ?? '')
  const [infoEng, setInfoEng] = useState(venue.practical_info_eng ?? '')

  const handleSave = async () => {
    setSaving(true)
    try {
      const patch = {
        door_code: doorCode.trim() || null,
        practical_info_sv: infoSv.trim() || null,
        practical_info_eng: infoEng.trim() || null,
      }
      await updateVenueInfo(venue.id, patch)
      onSaved({ ...venue, ...patch })
      setEditing(false)
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    } finally {
      setSaving(false)
    }
  }

  const info = language === 'sv' ? venue.practical_info_sv : venue.practical_info_eng

  if (!editing) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
        className="admin-panel velvet-surface p-4 cursor-pointer hover:bg-accent/5"
      >
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <span className="min-w-0 truncate">
              {t('Platsinfo', 'Venue details')} ·{' '}
              <Link
                to="/admin/contacts"
                state={{ tab: 'venues', search: venue.name }}
                onClick={(e) => e.stopPropagation()}
                title={t('Öppna platsen i Kontakter', 'Open the venue in Contacts')}
                className="hover:text-accent hover:underline"
              >
                {venue.name}
              </Link>
            </span>
            <span className="ml-auto flex items-center gap-2 shrink-0">
              {!venue.door_code && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-accent/20 text-foreground/60">
                  {t('Ingen portkod än', 'No entrance code yet')}
                </span>
              )}
              {!info && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-400">
                  {t('Ingen praktisk info', 'No practical info')}
                </span>
              )}
            </span>
          </div>
          {venue.door_code && (
            <div className="text-foreground/80">
              {t('Portkod', 'Entrance code')}: {venue.door_code}
            </div>
          )}
          {info && (
            <div className="text-foreground/60 line-clamp-2 whitespace-pre-line">{info}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-panel velvet-surface p-4 space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setEditing(false)}
        onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
        className="text-foreground text-sm cursor-pointer"
      >
        {t('Platsinfo', 'Venue details')} · {venue.name}
      </div>
      <div className="space-y-1">
        <label className="form-label-gold block">
          {t(
            'Portkod (visas dagen före, när den finns)',
            'Entrance code (shown the day before, once set)'
          )}
        </label>
        <input
          type="text"
          value={doorCode}
          onChange={(e) => setDoorCode(e.target.value)}
          className={`${inputClass} h-9 sm:w-48`}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="form-label-gold block">
            {t('Praktisk info (svenska)', 'Practical info (Swedish)')}
          </label>
          <textarea
            rows={8}
            value={infoSv}
            onChange={(e) => setInfoSv(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="form-label-gold block">
            {t('Praktisk info (engelska)', 'Practical info (English)')}
          </label>
          <textarea
            rows={8}
            value={infoEng}
            onChange={(e) => setInfoEng(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-accent/10">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="btn-gold-outline text-xs py-2 px-4"
        >
          {t('Avbryt', 'Cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-gold-outline !bg-[rgba(212,175,55,0.9)] !text-black text-xs py-2 px-4"
        >
          {saving ? t('Sparar…', 'Saving…') : t('Spara', 'Save')}
        </button>
      </div>
    </div>
  )
}
