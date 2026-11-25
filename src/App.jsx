import { lazy, memo, Suspense, useEffect, useMemo, useState } from 'react'
import Icon from './Icon'
import Directory from './Directory'
import Activity from './Activity'
import { BentoGrid, BentoGridItem } from './components/ui/BentoGrid'

const Analytics = lazy(() => import('./Analytics'))
const Presentation = lazy(() => import('./Presentation'))
const source = 'https://github.com/TheLime1/esprit-pi-stats'
const number = new Intl.NumberFormat('en')
const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

const Summary = memo(function Summary({ repositories }) {
  const metrics = useMemo(() => {
    const contributors = new Set(), owners = new Set()
    let stars = 0
    for (const row of repositories) {
      if (row.owner) owners.add(row.owner.toLowerCase())
      for (const user of row.contributors ?? []) contributors.add(user.toLowerCase())
      stars += row.stars || 0
    }
    return [
      ['folder', 'Repositories', repositories.length], ['users', 'Contributors', contributors.size],
      ['star', 'GitHub stars', stars], ['owner', 'Unique owners', owners.size],
    ]
  }, [repositories])
  return <section aria-label="Snapshot totals"><BentoGrid>{metrics.map(([icon, label, value]) =>
    <BentoGridItem key={label} icon={<Icon name={icon} size={22} />} title={number.format(value)} description={label} />
  )}</BentoGrid></section>
})

const getView = () => window.location.hash === '#analytics' ? 'analytics' : 'directory'
const empty = []
export default function App() {
  const [view, setView] = useState(getView)
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  const [presenting, setPresenting] = useState(false)
  const [snapshot, setSnapshot] = useState(null)
  const [failed, setFailed] = useState(false)
  const [request, setRequest] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(import.meta.env.BASE_URL + 'data.json', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Snapshot unavailable')
        const data = await response.json()
        if (!Array.isArray(data.repositories) || !Number.isFinite(Date.parse(data.generated_at))) throw new Error('Invalid snapshot')
        setSnapshot(data)
      }).catch(error => { if (error.name !== 'AbortError') setFailed(true) })
    return () => controller.abort()
  }, [request])

  useEffect(() => {
    function followHash() {
      const target = window.location.hash
      if (['#analytics', '#directory', '#top', ''].includes(target)) setView(getView())
    }
    window.addEventListener('hashchange', followHash)
    return () => window.removeEventListener('hashchange', followHash)
  }, [])

  useEffect(() => {
    if (snapshot && window.location.hash === '#' + view) {
      document.getElementById(view)?.scrollIntoView({ block: 'start' })
    }
  }, [view, snapshot])

  function toggleTheme() {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('esprit-theme', next) } catch { /* The theme still works for this visit. */ }
    setDark(!dark)
  }

  const repos = snapshot?.repositories ?? empty
  return (
    <>
      <a className="skip" href="#dashboard-content">Skip to dashboard</a>
      <header className="site-header"><div className="frame topbar">
        <a className="wordmark" href="#top" aria-label="ESPRIT PI Stats home"><img src={import.meta.env.BASE_URL + 'mark.svg'} alt="" width="32" height="32" />ESPRIT <span>PI Stats</span></a>
        <nav className="primary-nav" aria-label="Dashboard views">
          <a href="#directory" aria-current={view === 'directory' ? 'page' : undefined}><Icon name="grid" size={15} />Directory</a>
          <a href="#analytics" aria-current={view === 'analytics' ? 'page' : undefined}><Icon name="chart" size={16} />Analytics</a>
        </nav>
        <div className="header-actions">
          <button className="theme-button" onClick={toggleTheme} aria-label={'Switch to ' + (dark ? 'light' : 'dark') + ' theme'}><Icon name={dark ? 'sun' : 'moon'} /></button>
          <button className="present-button" onClick={() => setPresenting(true)} disabled={!snapshot}><Icon name="present" size={16} />Present</button>
        </div>
      </div></header>
      <main className="frame" id="top">
        <div className="overview">
          <div className="overview-title">
            <div className="eyebrow"><span className="signal" />ESPRIT PROJECT INDEX</div>
            <h1>Repository <em>tracker.</em></h1>
            <p>Explore ESPRIT’s integrated projects and the people building them on GitHub.</p>
            {snapshot && <div className="snapshot-date"><Icon name="calendar" size={14} />Updated <time dateTime={snapshot.generated_at}>{date.format(new Date(snapshot.generated_at))}</time><span className="date-divider" />Every two weeks</div>}
          </div>
          {snapshot && <Activity repositories={repos} generatedAt={snapshot.generated_at} />}
        </div>
        {snapshot ? <>
          <Summary repositories={repos} />
          <div id="dashboard-content" tabIndex="-1">
            <div hidden={view !== 'directory'}><Directory repositories={repos} /></div>
            {view === 'analytics' && <div id="analytics"><Suspense fallback={<p role="status">Loading analytics…</p>}><Analytics repositories={repos} /></Suspense></div>}
          </div>
        </> : <div className="load-state" role="status">{failed ? <><strong>Couldn’t load the repository snapshot.</strong><button onClick={() => { setFailed(false); setRequest(request + 1) }}>Try again</button></> : 'Loading the repository snapshot…'}</div>}
      </main>
      <footer className="frame site-footer"><span>ESPRIT PI Stats</span><a href={source} target="_blank" rel="noreferrer">View source <Icon name="arrowUpRight" size={14} /></a></footer>
      {presenting && <Suspense fallback={<p role="status" className="presentation-loading">Opening presentation…</p>}><Presentation repositories={repos} onClose={() => setPresenting(false)} /></Suspense>}
    </>
  )
}
