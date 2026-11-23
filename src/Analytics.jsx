import { useMemo } from 'react'
import { formatDate, summarize } from './analytics-model.js'
import { BentoGrid } from './components/ui/BentoGrid'
import './analytics.css'

function Ranking({ title, unit, rows, featured = false }) {
  return (
    <section className={'ranking-panel' + (featured ? ' ranking-featured' : '')} aria-label={title}>
      <header className="ranking-heading"><h3>{title}</h3><span>{unit}</span></header>
      {rows.length ? (
        <ol className="ranking-list">
          {rows.map(({ label, value, href }, index) => (
            <li key={href ?? label}>
              <span className="ranking-position" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div className="ranking-record">
                <div className="ranking-data">
                  {href ? <a href={href}>{label}</a> : <span>{label}</span>}
                  <strong>{value.toLocaleString()}</strong>
                </div>
                <div className="ranking-track" aria-hidden="true">
                  <span style={{ width: (value / (rows[0].value || 1) * 100) + '%' }} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="ranking-empty">No entries in this snapshot.</p>}
    </section>
  )
}

export default function Analytics({ repositories }) {
  const stats = useMemo(() => summarize(repositories), [repositories])
  const team = stats.largestTeam
  const newRepo = stats.latest
  return (
    <section className="index-analytics" aria-labelledby="analytics-title">
      <h2 id="analytics-title">Analytics</h2>
      <BentoGrid className="ranking-grid">
        <Ranking title="Most starred repositories" unit="Stars" rows={stats.topRepos} featured />
        <Ranking title="Top contributors" unit="Repositories" rows={stats.topPeople} />
        <Ranking title="Largest classes" unit="Repositories" rows={stats.topClasses} />
      </BentoGrid>
      <dl className="analytics-notes">
        <div>
          <dt>Largest project team</dt>
          <dd>{team ? <><a href={team.url}>{team.name}</a><small>{team.contributors?.length ?? 0} contributors</small></> : '—'}</dd>
        </div>
        <div>
          <dt>Average stars</dt>
          <dd><b>{repositories.length ? (stats.stars / repositories.length).toFixed(1) : '—'}</b><small>per repository</small></dd>
        </div>
        <div>
          <dt>Newest repository</dt>
          <dd>{newRepo ? <><a href={newRepo.url}>{newRepo.name}</a><small>{formatDate(newRepo.created_at)}</small></> : '—'}</dd>
        </div>
      </dl>
    </section>
  )
}
