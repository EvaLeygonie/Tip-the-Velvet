import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  INFO_AUDIENCES,
  audiencesFromStored,
  audiencesToStored,
  infoAudienceLabel,
  type EventInfoItem,
  type EventInfoItemInput,
  sameAsTemplate,
  type InfoAudience,
  type InfoTemplateItem,
} from '@/lib/eventInfo'

interface InfoItemEditorProps {
  kind: 'schedule' | 'text'
  // Existing item when editing, undefined when adding.
  item?: EventInfoItem
  nextSortOrder: number
  onSave: (input: EventInfoItemInput) => Promise<void>
  onCancel: () => void
  // Text sections only: the template row this item came from (null = none yet), and the hooks
  // for pushing the current text back as the new template for future events (and undoing that).
  template?: InfoTemplateItem | null
  canUndoTemplate?: boolean
  onSetTemplate?: (input: EventInfoItemInput) => Promise<void>
  onUndoTemplate?: () => Promise<void>
}

const inputClass = 'velvet-field'

// One form for schedule rows (time + title) and text sections (title + body). Who sees the item
// is a set of role chips; none ticked hides the item from every role. (Documents aren't edited here — they are
// generated live and just released per role from the Documents panel.)
export const InfoItemEditor = ({
  kind,
  item,
  nextSortOrder,
  onSave,
  onCancel,
  template,
  canUndoTemplate,
  onSetTemplate,
  onUndoTemplate,
}: InfoItemEditorProps) => {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  // The form opens next to the row being edited (or at the end of the list), so bring it into view.
  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])
  const [audiences, setAudiences] = useState<InfoAudience[]>(
    item ? audiencesFromStored(item.audiences) : [...INFO_AUDIENCES]
  )
  const [timeText, setTimeText] = useState(item?.time_text ?? '')
  const [titleSv, setTitleSv] = useState(item?.title_sv ?? '')
  const [titleEng, setTitleEng] = useState(item?.title_eng ?? '')
  const [bodySv, setBodySv] = useState(item?.body_sv ?? '')
  const [bodyEng, setBodyEng] = useState(item?.body_eng ?? '')

  const toggleAudience = (audience: InfoAudience) =>
    setAudiences((prev) =>
      prev.includes(audience) ? prev.filter((a) => a !== audience) : [...prev, audience]
    )

  const buildInput = (): EventInfoItemInput => ({
    kind,
    audiences: audiencesToStored(audiences),
    sort_order: item?.sort_order ?? nextSortOrder,
    time_text: kind === 'schedule' ? timeText.trim() : null,
    title_sv: titleSv.trim() || null,
    title_eng: titleEng.trim() || null,
    body_sv: bodySv.trim() || null,
    body_eng: bodyEng.trim() || null,
    doc_key: null,
    template_key: item?.template_key ?? null,
  })

  const validate = (): boolean => {
    if (!titleSv.trim() && !titleEng.trim()) {
      toast.error(t('Ange en rubrik.', 'Please enter a title.'))
      return false
    }
    if (kind === 'schedule' && !timeText.trim()) {
      toast.error(t('Ange en tid.', 'Please enter a time.'))
      return false
    }
    return true
  }

  const run = async (action: () => Promise<void>) => {
    setSaving(true)
    try {
      await action()
    } catch (err) {
      console.error(err)
      toast.error(t('Kunde inte spara.', 'Could not save.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => {
    if (validate()) run(() => onSave(buildInput()))
  }

  const showTemplateButton =
    kind === 'text' &&
    item &&
    onSetTemplate &&
    (!template || !sameAsTemplate(buildInput(), template))

  return (
    <div ref={rootRef} className="admin-panel velvet-surface p-4 space-y-3 text-left">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        {kind === 'schedule' ? (
          <div className="space-y-1">
            <label className="form-label-gold block">
              {t('Tid (t.ex. 21:00 eller ca 22:30)', 'Time (e.g. 21:00 or ca 22:30)')}
            </label>
            <input
              type="text"
              value={timeText}
              onChange={(e) => setTimeText(e.target.value)}
              className={`${inputClass} h-9 sm:w-48`}
            />
          </div>
        ) : null}
        <div
          className={
            kind === 'schedule'
              ? 'space-y-1'
              : 'flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:w-full'
          }
        >
          <span className={`form-label-gold ${kind === 'schedule' ? 'block' : ''}`}>
            {t('Visas för', 'Shown to')}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {INFO_AUDIENCES.map((audience) => (
              <button
                key={audience}
                type="button"
                onClick={() => toggleAudience(audience)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  audiences.includes(audience)
                    ? 'bg-accent text-black border-accent'
                    : 'border-accent/30 text-foreground/70 hover:border-accent'
                }`}
              >
                {infoAudienceLabel(t, audience)}
              </button>
            ))}
            {audiences.length === 0 && (
              <span className="text-xs text-amber-400">
                {t('Dold för alla', 'Hidden from all')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="form-label-gold block">
            {t('Rubrik (svenska)', 'Title (Swedish)')}
          </label>
          <input
            type="text"
            value={titleSv}
            onChange={(e) => setTitleSv(e.target.value)}
            className={`${inputClass} h-9`}
          />
        </div>
        <div className="space-y-1">
          <label className="form-label-gold block">
            {t('Rubrik (engelska)', 'Title (English)')}
          </label>
          <input
            type="text"
            value={titleEng}
            onChange={(e) => setTitleEng(e.target.value)}
            className={`${inputClass} h-9`}
          />
        </div>
        <div className="space-y-1">
          <label className="form-label-gold block">
            {kind === 'schedule'
              ? t('Notering (svenska, valfri)', 'Note (Swedish, optional)')
              : t('Text (svenska)', 'Text (Swedish)')}
          </label>
          <textarea
            rows={kind === 'schedule' ? 2 : 8}
            value={bodySv}
            onChange={(e) => setBodySv(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="form-label-gold block">
            {kind === 'schedule'
              ? t('Notering (engelska, valfri)', 'Note (English, optional)')
              : t('Text (engelska)', 'Text (English)')}
          </label>
          <textarea
            rows={kind === 'schedule' ? 2 : 8}
            value={bodyEng}
            onChange={(e) => setBodyEng(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-accent/10">
        {showTemplateButton && (
          <button
            type="button"
            disabled={saving}
            onClick={() => validate() && run(() => onSetTemplate!(buildInput()))}
            className="btn-gold-outline text-xs py-2 px-4"
          >
            {t('Använd som ny mall', 'Set as new template')}
          </button>
        )}
        {canUndoTemplate && onUndoTemplate && (
          <button
            type="button"
            disabled={saving}
            onClick={() => run(onUndoTemplate)}
            className="text-xs text-foreground/60 hover:text-accent underline"
          >
            {t('Ångra', 'Undo')}
          </button>
        )}
        <span className="flex-1" />
        <button type="button" onClick={onCancel} className="btn-gold-outline text-xs py-2 px-4">
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
