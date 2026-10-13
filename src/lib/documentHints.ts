import { actHasMusic } from '@/lib/actMusic'
import type { AdminEventActRow } from '@/services/eventService'

type Translate = (sv: string, eng: string) => string

// What's still missing from the data a document is built from — shown next to a document so the
// board knows whether it is safe to download or release. Null when nothing is missing.
export const getDocumentHint = (
  t: Translate,
  key: string,
  acts: Pick<AdminEventActRow, 'performer' | 'stage_preparations' | 'act_notes' | 'audio_files'>[]
): string | null => {
  const real = acts.filter((a) => a.performer)
  if (real.length === 0) return null
  if (key === 'setList') {
    const missing = real.filter((a) => !a.stage_preparations?.trim()).length
    return missing > 0
      ? t(
          `${missing} av ${real.length} akter saknar scenanteckningar`,
          `${missing} of ${real.length} acts have no stage notes yet`
        )
      : null
  }
  if (key === 'soundLight') {
    const noMusic = real.filter((a) => !actHasMusic(a.audio_files)).length
    const noNotes = real.filter((a) => !a.act_notes?.trim()).length
    const parts = [
      noMusic > 0 ? t(`${noMusic} utan musikfil`, `${noMusic} without a music file`) : null,
      noNotes > 0
        ? t(`${noNotes} utan ljus-/ljudönskemål`, `${noNotes} without light/sound notes`)
        : null,
    ].filter(Boolean)
    return parts.length > 0 ? `${t('Av', 'Of')} ${real.length}: ${parts.join(', ')}` : null
  }
  return null
}
