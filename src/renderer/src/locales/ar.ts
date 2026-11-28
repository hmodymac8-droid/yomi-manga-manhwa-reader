/*
 * Arabic for every screen, keyed by the English text (see i18n.ts). Split by screen so each part stays readable;
 * a sentence missing here simply shows in English.
 *
 * Style: clear, simple Arabic as in popular apps (not stiff, not slang). Site names, series titles and key names
 * (Ctrl, Z, Esc) stay as they are. {name} placeholders stay exactly as written.
 */
import { AR_COMMON } from './ar/common'
import { AR_APP } from './ar/app'
import { AR_BROWSE } from './ar/browse'
import { AR_SERIES } from './ar/series'
import { AR_READER } from './ar/reader'
import { AR_SETTINGS } from './ar/settings'
import { AR_SCREENS } from './ar/screens'

export const AR: Record<string, string> = {
  ...AR_COMMON,
  ...AR_APP,
  ...AR_BROWSE,
  ...AR_SERIES,
  ...AR_READER,
  ...AR_SETTINGS,
  ...AR_SCREENS
}
