import { useEffect } from 'react'
import type { SourceInfo } from '../../../preload/index.d'
import { num, t } from '../i18n'

/**
 * Asks before a site is deleted: "Delete site" or "Keep it". Deleting removes the site and its saved title list from
 * Yomi; your reading progress, follows and downloaded chapters are not touched, and the site can be added again.
 */
export default function DeleteSite({
  site,
  onDelete,
  onKeep
}: {
  site: SourceInfo
  onDelete: () => void
  onKeep: () => void
}): React.JSX.Element {
  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onKeep()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onKeep])

  return (
    <div className="modalback" onClick={onKeep}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delsite-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="delsite-title">{t('Delete {site}?', { site: site.name })}</h2>
        <p>
          {site.count === 1
            ? t(
                'Yomi removes this site and its 1 saved title. Your reading progress, the series you follow and your downloaded chapters stay. You can add the site again later.'
              )
            : t(
                'Yomi removes this site and its {n} saved titles. Your reading progress, the series you follow and your downloaded chapters stay. You can add the site again later.',
                { n: num(site.count) }
              )}
        </p>
        {site.library && (
          <p className="sub">
            {t(
              'This site came from the Yomi Library. To take every Library site off your screens without deleting anything, turn off "{setting}" in Settings.',
              { setting: t('Show the Yomi Library') }
            )}
          </p>
        )}
        <div className="modalact">
          <button className="primary" autoFocus onClick={onKeep}>
            {t('Keep it')}
          </button>
          <button className="mini danger big" onClick={onDelete}>
            {t('Delete site')}
          </button>
        </div>
      </div>
    </div>
  )
}
