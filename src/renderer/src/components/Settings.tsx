import { useEffect, useState } from 'react'
import { currentLang, num, setLang, t } from '../i18n'
import type {
  AniListImportResult,
  AniListStatus,
  AppSettings,
  AppUpdateState,
  SourceInfo
} from '../../../preload/index.d'

/** The Settings screen. For now: the Yomi Library (ready-made sites from your Yomi account), shown or hidden. */
export default function Settings(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [sources, setSources] = useState<SourceInfo[]>([])

  useEffect(() => {
    void window.api.getSettings().then(setSettings)
    void window.api.listSources().then(setSources)
  }, [])

  const library = sources.filter((s) => s.library)
  const titles = library.reduce((n, s) => n + s.count, 0)

  const toggle = async (): Promise<void> => {
    if (!settings) return
    setSettings(await window.api.setSettings({ showLibrary: !settings.showLibrary }))
    setSources(await window.api.listSources())
  }

  return (
    <div className="series">
      <div className="pagehead">
        <div>
          <div className="kicker">設定</div>
          <h1>{t('Settings')}</h1>
          <p>{t('How Yomi looks and what it shows you.')}</p>
        </div>
      </div>

      {/* Always in both languages, so anyone can find it */}
      <section className="setting">
        <div className="settext">
          <h2>Language · اللغة</h2>
          <p>
            Yomi in English or Arabic. Arabic shows every screen right to left.
            <br />
            <span dir="rtl">يومي بالعربية أو الإنجليزية. العربية تعرض كل الشاشات من اليمين لليسار.</span>
          </p>
        </div>
        <div className="langpick" role="radiogroup" aria-label="Language">
          {(['en', 'ar'] as const).map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={currentLang() === l}
              className={currentLang() === l ? 'on' : ''}
              onClick={() => currentLang() !== l && setLang(l)}
            >
              {l === 'en' ? 'English' : 'العربية'}
            </button>
          ))}
        </div>
      </section>

      <section className="setting">
        <div className="settext">
          <h2>{t('Yomi Library')}</h2>
          <p>
            {t(
              'Ready-made sites that come with your Yomi account: their titles and genres are already loaded, so you can search and read straight away. Sites you add yourself are always shown.'
            )}
          </p>
          <p className="sub">
            {library.length > 0
              ? t(
                  library.length === 1
                    ? '{n} Library site · {titles} titles on this computer.'
                    : '{n} Library sites · {titles} titles on this computer.',
                  { n: num(library.length), titles: num(titles) }
                )
              : t('No Library sites on this computer yet. They arrive when you sign in to your Yomi account.')}{' '}
            {t('Hiding them keeps everything saved; turn this back on to see them again.')}
          </p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings?.showLibrary ?? true}
            disabled={!settings}
            onChange={() => void toggle()}
          />
          <span className="track" aria-hidden="true" />
          <span>{t('Show the Yomi Library')}</span>
        </label>
      </section>

      <AutoDownloadSetting />

      <section className="setting">
        <div className="settext">
          <h2>{t('Recommendations')}</h2>
          <p>
            {t(
              "“Similar on your sites” on a series page and “Because you read” on Discover come from AniList's community recommendations. To get them, Yomi sends AniList the title of the series you open or read recently (no account, nothing else). Answers are kept for a week."
            )}
          </p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings?.recommendations !== false}
            disabled={!settings}
            onChange={(e) =>
              void window.api.setSettings({ recommendations: e.target.checked }).then(setSettings)
            }
          />
          <span className="track" aria-hidden="true" />
          <span>{t('Show recommendations')}</span>
        </label>
      </section>
      <section className="setting">
        <div className="settext">
          <h2>{t('Daily site check')}</h2>
          <p>
            {t(
              "Once a day Yomi tries every site the way you use it: its titles, a chapter list, a chapter's pages and one picture. It waits while you read. When a site breaks you get a notice and Sites says why; simple problems are fixed by themselves."
            )}
          </p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings?.siteWatch !== false}
            disabled={!settings}
            onChange={(e) =>
              void window.api.setSettings({ siteWatch: e.target.checked }).then(setSettings)
            }
          />
          <span className="track" aria-hidden="true" />
          <span>{t('Check my sites every day')}</span>
        </label>
      </section>
      <section className="setting">
        <div className="settext">
          <h2>MyAnimeList</h2>
          <p>
            {t(
              "Shows a series' MyAnimeList score and rank on its page, and MyAnimeList's top lists on Discover (only the titles on your sites). To get them, Yomi sends MyAnimeList the title of the series you open (no account, nothing else). Answers are kept for a week."
            )}
          </p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings?.myanimelist !== false}
            disabled={!settings}
            onChange={(e) =>
              void window.api.setSettings({ myanimelist: e.target.checked }).then(setSettings)
            }
          />
          <span className="track" aria-hidden="true" />
          <span>{t('Show MyAnimeList')}</span>
        </label>
      </section>
      <section className="setting">
        <div className="settext">
          <h2>Discord</h2>
          <p>
            {t(
              'Shows “Playing Yomi” on your Discord profile while the app is open, with the series and chapter you are reading. It only talks to the Discord app on this computer.'
            )}
          </p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings?.discord !== false}
            disabled={!settings}
            onChange={(e) =>
              void window.api.setSettings({ discord: e.target.checked }).then(setSettings)
            }
          />
          <span className="track" aria-hidden="true" />
          <span>{t('Show on Discord')}</span>
        </label>
        {settings?.discord !== false && (
          <label className="switch">
            <input
              type="checkbox"
              checked={settings?.discordDetails !== false}
              disabled={!settings}
              onChange={(e) =>
                void window.api.setSettings({ discordDetails: e.target.checked }).then(setSettings)
              }
            />
            <span className="track" aria-hidden="true" />
            <span>{t("Show what I'm reading")}</span>
          </label>
        )}
      </section>
      <TrackingSetting />
      <MihonImportSetting />
      <AppUpdateSetting />
    </div>
  )
}

/** Bring a Mihon / Tachiyomi library over: follows, shelves and read chapters. */
function MihonImportSetting(): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [prog, setProg] = useState<{ done: number; total: number; title: string } | null>(null)
  const [result, setResult] = useState<Awaited<ReturnType<typeof window.api.mihonImport>>>(null)
  const [error, setError] = useState('')
  const [showMissing, setShowMissing] = useState(false)
  useEffect(() => window.api.onMihonProgress(setProg), [])
  const run = async (): Promise<void> => {
    setError('')
    setResult(null)
    setBusy(true)
    try {
      setResult(await window.api.mihonImport())
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
          : String(e)
      )
    } finally {
      setBusy(false)
      setProg(null)
    }
  }
  const pct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0
  return (
    <section className="setting">
      <div className="settext">
        <h2>{t('Import from Mihon or Tachiyomi')}</h2>
        <p>
          {t(
            'Choose a backup file (.tachibk) made in Mihon, Tachiyomi or a fork of them. Every series in its library is found on your sites, followed on the matching shelf, and the chapters you read there are marked read here. Nothing in Yomi is removed or moved back.'
          )}
        </p>
        {busy && prog && (
          <>
            <p className="sub">
              {pct}% · {prog.title ? t('Looking at “{title}”', { title: prog.title }) : t('Finishing…')}
            </p>
            <div className="progbar" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
        {error && (
          <p className="sub" role="alert">
            {t("Couldn't import: {error}", { error })}
          </p>
        )}
        {result && (
          <p className="sub" role="status">
            {t('{n} series in the backup', { n: num(result.total) })} ·{' '}
            {t('{n} now followed', { n: num(result.followed) })}
            {result.alreadyFollowed
              ? ` · ${t('{n} already followed', { n: num(result.alreadyFollowed) })}`
              : ''}{' '}
            ·{' '}
            {t('read chapters added for {n} ({chapters} chapters)', {
              n: num(result.withProgress),
              chapters: num(result.chaptersMarked)
            })}
            {result.notFound.length > 0 && (
              <>
                {' '}
                ·{' '}
                <button className="linkbtn" onClick={() => setShowMissing((v) => !v)}>
                  {t('{n} not on your sites', { n: num(result.notFound.length) })}
                </button>
              </>
            )}
          </p>
        )}
        {result && showMissing && (
          <ul className="missinglist">
            {result.notFound.map((t) => (
              <li key={t} dir="auto">
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="primary" disabled={busy} onClick={() => void run()}>
        {busy ? t('Importing…') : t('Choose backup…')}
      </button>
    </section>
  )
}

/** Yomi's own updates: the version you have, a "Check for updates" button and what the check found. */
function AppUpdateSetting(): React.JSX.Element {
  const [s, setS] = useState<AppUpdateState | null>(null)
  useEffect(() => {
    void window.api.appUpdateState().then(setS)
    return window.api.onAppUpdateState(setS)
  }, [])

  const when = s?.checkedAt
    ? new Date(s.checkedAt).toLocaleString(currentLang() === 'ar' ? 'ar-EG-u-nu-latn' : [], {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : null
  let line = t('Yomi looks for updates when it starts and every few hours.')
  if (s?.state === 'checking') line = t('Looking for a newer version…')
  else if (s?.state === 'none')
    line = when
      ? t('You have the newest version. Last checked {when}.', { when })
      : t('You have the newest version.')
  else if (s?.state === 'downloading')
    line = t('Downloading Yomi {version}… {percent}%', { version: s.version, percent: s.percent })
  else if (s?.state === 'ready')
    line = t('Yomi {version} is downloaded and ready to install.', { version: s.version })
  else if (s?.state === 'error') line = t("Couldn't check for updates: {error}", { error: s.error })
  else if (s?.state === 'dev') line = t('Updates are only checked in the installed app.')

  const busy = s?.state === 'checking' || s?.state === 'downloading'
  return (
    <section className="setting">
      <div className="settext">
        <h2>{t('Updates')}</h2>
        <p>
          {t(
            'New versions download by themselves in the background. When one is ready you can restart now to install it, or it installs the next time you close Yomi. Your library and settings are kept.'
          )}
        </p>
        <p className="sub">
          {s ? `${t('Version {v}.', { v: s.current })} ` : ''}
          {line}
        </p>
        {s?.state === 'downloading' && (
          <div className="progbar" aria-hidden="true">
            <span style={{ width: `${s.percent}%` }} />
          </div>
        )}
      </div>
      {s?.state === 'ready' ? (
        <button className="primary" onClick={() => void window.api.updateInstall()}>
          {t('Restart and update')}
        </button>
      ) : (
        <button
          className="primary"
          disabled={!s || busy || s.state === 'dev'}
          onClick={() => void window.api.appUpdateCheck().then(setS)}
        >
          {s?.state === 'checking' ? t('Checking…') : t('Check for updates')}
        </button>
      )}
    </section>
  )
}

/** Download new chapters of followed series by themselves (each series can still be switched on its own card). */
function AutoDownloadSetting(): React.JSX.Element {
  const [on, setOn] = useState<boolean | null>(null)
  useEffect(() => {
    void window.api.updatesStatus().then((s) => setOn(s.autoDownload))
    return window.api.onUpdates((s) => setOn(s.autoDownload))
  }, [])
  return (
    <section className="setting">
      <div className="settext">
        <h2>{t('Auto-download new chapters')}</h2>
        <p>
          {t(
            'When a series you follow gets a new chapter, Yomi downloads it for you so it is ready to read, even offline. You can also turn this on or off for each series on its card in Following.'
          )}
        </p>
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={on ?? false}
          disabled={on === null}
          onChange={(e) => {
            setOn(e.target.checked)
            void window.api.updatesSetAutoDownload(e.target.checked)
          }}
        />
        <span className="track" aria-hidden="true" />
        <span>{t('For all followed series')}</span>
      </label>
    </section>
  )
}

/** Opt-in AniList tracking: off until you add a client ID and connect an account. */
function TrackingSetting(): React.JSX.Element {
  const [s, setS] = useState<AniListStatus | null>(null)
  const [clientId, setClientId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [imported, setImported] = useState<AniListImportResult | null>(null)

  useEffect(() => {
    void window.api.anilistStatus().then((st) => {
      setS(st)
      setClientId(st.clientId)
    })
  }, [])

  const saveId = async (id: string): Promise<AniListStatus> => {
    const next = await window.api.anilistSetClientId(id.trim())
    setS(next)
    setClientId(next.clientId)
    return next
  }

  const connect = async (): Promise<void> => {
    setBusy(true)
    setError('')
    setImported(null)
    try {
      await saveId(clientId)
      setS(await window.api.anilistConnect())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async (): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      setS(await window.api.anilistDisconnect())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const doImport = async (): Promise<void> => {
    setBusy(true)
    setError('')
    setImported(null)
    try {
      setImported(await window.api.anilistImport())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const connected = s?.connected ?? false
  return (
    <section className="setting">
      <div className="settext">
        <h2>{t('Tracking')}</h2>
        <p>
          {t(
            'Connect AniList to update your reading progress when you finish a chapter. This stays off until you add a client ID and sign in. Linked series, and how to register a client, are explained in the README.'
          )}
        </p>
        <p className="sub">
          {connected
            ? s?.name
              ? t('Connected as {name}.', { name: s.name })
              : t('Connected.')
            : s?.hasClientId
              ? t('Client ID saved. Press Connect AniList to sign in.')
              : t('No client ID yet. Register an AniList API client and paste the ID below.')}
        </p>
        <label className="setfieldwrap">
          <span>{t('Client ID')}</span>
          <input
            className="setfield"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={clientId}
            disabled={busy}
            placeholder={t('AniList client ID')}
            onChange={(e) => setClientId(e.target.value)}
            onBlur={() => {
              if (clientId.trim() !== (s?.clientId ?? '')) void saveId(clientId)
            }}
          />
        </label>
        {error && <p className="sub">{error}</p>}
        {imported && (
          <p className="sub">
            {t(
              'Import finished: {updated} updated, {skipped} already ahead or equal, {failed} failed. Local progress never moved backward.',
              { updated: num(imported.updated), skipped: num(imported.skipped), failed: num(imported.failed) }
            )}
          </p>
        )}
      </div>
      <div className="settingcol">
        {connected ? (
          <button className="primary" disabled={busy} onClick={() => void disconnect()}>
            {t('Disconnect')}
          </button>
        ) : (
          <button
            className="primary"
            disabled={busy || !clientId.trim()}
            onClick={() => void connect()}
          >
            {busy ? t('Connecting…') : t('Connect AniList')}
          </button>
        )}
        {connected && (
          <button className="mini" disabled={busy} onClick={() => void doImport()}>
            {t('Import progress from AniList')}
          </button>
        )}
      </div>
    </section>
  )
}

