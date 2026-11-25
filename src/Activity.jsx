import { memo, useMemo, useState } from 'react'
import Icon from './Icon'

const monthName = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' })
const monthYear = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })

function getMonths(repositories, generatedAt) {
  const end = new Date(generatedAt)
  if (Number.isNaN(end.valueOf())) return []
  const bins = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11 + i, 1))
    return { key: date.toISOString().slice(0, 7), label: monthName.format(date), date: monthYear.format(date), count: 0 }
  })
  const lookup = new Map(bins.map(bin => [bin.key, bin]))
  for (const row of repositories) {
    const bin = lookup.get(row.created_at?.slice(0, 7))
    if (bin) bin.count += 1
  }
  return bins
}

export default memo(function Activity({ repositories, generatedAt }) {
  const months = useMemo(() => getMonths(repositories, generatedAt), [repositories, generatedAt])
  const [active, setActive] = useState(null)
  const peak = months.reduce((best, month) => month.count > (best?.count ?? -1) ? month : best, null)
  const selected = months.find(month => month.key === active) ?? peak
  return (
    <section className="activity-panel" aria-label="Repository creation activity">
      <div className="activity-caption"><span><Icon name="activity" size={15} /> Creation activity</span><span>12 months</span></div>
      {selected && <>
        <div className="activity-reading"><strong>{selected.count}</strong><span>created in <b>{selected.date}</b></span></div>
        <div className="activity-chart" aria-label="Monthly repository counts">
          {months.map(month => <button type="button" key={month.key}
            className={month.key === selected.key ? 'activity-month selected' : 'activity-month'}
            aria-label={month.date + ': ' + month.count + ' repositories'}
            onFocus={() => setActive(month.key)} onPointerEnter={() => setActive(month.key)} onClick={() => setActive(month.key)}>
            <span className="activity-column"><i style={{ height: (100 * month.count / Math.max(1, peak.count)) + '%' }} /></span>
            <span className="activity-label">{month.label}</span>
          </button>)}
        </div>
      </>}
    </section>
  )
})
