import { getClassName } from './repo-class.js'

const dateFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
})

export function formatDate(value) {
  const time = Date.parse(value)
  return Number.isFinite(time) ? dateFormat.format(time) : 'Date unavailable'
}

function topEntries(counts, limit) {
  return Array.from(counts, ([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit)
}

export function summarize(repositories) {
  const contributors = new Map()
  const logins = new Map()
  const classes = new Map()
  let stars = 0
  let largestTeam = null
  let latest = null

  for (const repo of repositories) {
    const members = repo.contributors ?? []
    stars += repo.stars || 0
    for (const member of members) {
      const login = member.toLowerCase()
      if (!logins.has(login)) logins.set(login, member)
      contributors.set(login, (contributors.get(login) ?? 0) + 1)
    }
    const className = getClassName(repo.name)
    if (className) classes.set(className, (classes.get(className) ?? 0) + 1)
    if (!largestTeam || members.length > (largestTeam.contributors?.length ?? 0)) largestTeam = repo
    if (repo.created_at && (!latest || repo.created_at > latest.created_at)) latest = repo
  }

  const topRepos = repositories.map(repo => ({
    label: repo.name, value: repo.stars || 0, href: repo.url,
  })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)).slice(0, 5)
  return {
    stars, contributors: contributors.size, largestTeam, latest, topRepos,
    topClasses: topEntries(classes, 6),
    topPeople: topEntries(contributors, 5).map(person => ({
      ...person, label: logins.get(person.label),
      href: 'https://github.com/' + encodeURIComponent(logins.get(person.label)),
    })),
  }
}
