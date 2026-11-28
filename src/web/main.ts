/*
 * The web version's starting point: the app's own screens (src/renderer), with window.api answered in the browser
 * (api.ts) instead of by the Windows app.
 */
import { webApi, webImage } from './api'

const w = window as unknown as { api: unknown; yomiWebImage: typeof webImage }
w.api = webApi
w.yomiWebImage = webImage
// (the theme is applied before the screens draw, as the app's own page does)
try {
  document.documentElement.classList.add(
    localStorage.getItem('yomi-theme') === 'light' ? 'light' : 'dark'
  )
} catch {
  document.documentElement.classList.add('dark')
}
document.documentElement.classList.add('web')

void import('../renderer/src/main')
