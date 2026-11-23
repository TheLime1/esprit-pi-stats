import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import './directory.css';

const PAGE_SIZE = 12;
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
});

const sorts = {
  name: (a, b) => collator.compare(a.repo.name, b.repo.name),
  stars: (a, b) => (b.repo.stars || 0) - (a.repo.stars || 0),
  date: (a, b) => b.created - a.created,
  contributors: (a, b) => b.contributors.length - a.contributors.length,
};

function profileUrl(login) {
  return `https://github.com/${encodeURIComponent(login)}`;
}

export default function Directory({ repositories }) {
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState('name');
  const [page, setPage] = useState(1);
  const [expandedUrl, setExpandedUrl] = useState(null);
  const search = useRef(null);
  const resultsStart = useRef(null);

  useEffect(() => {
    function focusSearch(event) {
      if (event.defaultPrevented || event.key !== '/' || event.ctrlKey || event.metaKey ||
          event.altKey || event.target?.closest?.('input, textarea, select, [contenteditable="true"], dialog') ||
          document.querySelector('dialog[open]') || !search.current?.getClientRects().length) return;
      event.preventDefault();
      search.current.focus();
    }
    document.addEventListener('keydown', focusSearch);
    return () => document.removeEventListener('keydown', focusSearch);
  }, []);

  const indexed = useMemo(() => repositories.map(repo => {
    const contributors = repo.contributors || [];
    return {
      repo, contributors,
      created: Date.parse(repo.created_at) || 0,
      text: [repo.name, repo.owner, ...contributors].join(' ').toLowerCase(),
    };
  }), [repositories]);
  const sorted = useMemo(() => [...indexed].sort(sorts[order]), [indexed, order]);
  const term = query.trim().toLowerCase();
  const matches = useMemo(() => term ? sorted.filter(row => row.text.includes(term)) : sorted, [sorted, term]);
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const activePage = Math.min(page, pages);
  const offset = (activePage - 1) * PAGE_SIZE;
  const visible = matches.slice(offset, offset + PAGE_SIZE);

  function updateQuery(value) {
    setQuery(value);
    setPage(1);
    setExpandedUrl(null);
  }

  function changePage(next) {
    setPage(next);
    setExpandedUrl(null);
    resultsStart.current?.focus({ preventScroll: true });
    resultsStart.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  return (
    <section className="directory" id="directory" aria-labelledby="directory-title">
      <div className="directory-heading">
        <h2 id="directory-title">Repository directory</h2>
        <span className="directory-result-count" role="status">
          {matches.length.toLocaleString()} {term ? 'matching ' : ''}{matches.length === 1 ? 'repository' : 'repositories'}
        </span>
      </div>
      <div className="directory-tools">
        <label className="directory-search">
          <Icon name="search" size={19} />
          <input ref={search} type="search" aria-label="Search repositories, owners or contributors"
            placeholder="Search repositories, owners, contributors…" value={query}
            onChange={event => updateQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Escape') { event.preventDefault(); updateQuery(''); event.currentTarget.blur(); }
            }} />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <label className="directory-sort">
          <Icon name="sort" size={16} />
          <select aria-label="Sort repositories" value={order} onChange={event => {
            setOrder(event.target.value);
            setPage(1);
            setExpandedUrl(null);
          }}>
            <option value="name">Name (A–Z)</option>
            <option value="stars">Most stars</option>
            <option value="date">Newest first</option>
            <option value="contributors">Most contributors</option>
          </select>
          <Icon name="chevronDown" size={14} />
        </label>
      </div>

      <div className="directory-results" ref={resultsStart} tabIndex={-1} role="region" aria-label="Repository results">
        {visible.length > 0 ? (
          <table className="directory-table" aria-label="Repository directory">
            <thead>
              <tr><th scope="col">Repository</th><th scope="col">Contributors</th><th scope="col">Stars</th><th scope="col">Created</th></tr>
            </thead>
            <tbody>
              {visible.map(({ repo, contributors, created }, index) => {
                const isOpen = expandedUrl === repo.url;
                const detailId = `directory-contributors-${offset + index}`;
                return (
                  <Fragment key={repo.url}>
                    <tr className="directory-row">
                      <td className="directory-project">
                        <div className="directory-project-inner">
                          <span className="directory-folder"><Icon name="folder" size={18} /></span>
                          <div className="directory-project-info">
                            <a className="directory-name" href={repo.url} target="_blank" rel="noreferrer">
                              {repo.name}<Icon name="arrowUpRight" size={13} />
                            </a>
                            <a className="directory-owner" href={profileUrl(repo.owner)} target="_blank" rel="noreferrer">@{repo.owner}</a>
                          </div>
                        </div>
                      </td>
                      <td className="directory-people">
                        {contributors.length > 0 ? (
                          <button className="directory-people-button" type="button"
                            aria-label={`${contributors.length} contributor${contributors.length === 1 ? '' : 's'} to ${repo.name}`}
                            aria-expanded={isOpen} aria-controls={isOpen ? detailId : undefined}
                            onClick={() => setExpandedUrl(isOpen ? null : repo.url)}>
                            <Icon name="users" size={15} />{contributors.length}
                            <Icon name="chevronDown" size={12} />
                          </button>
                        ) : <span className="directory-zero"><Icon name="users" size={15} />0</span>}
                      </td>
                      <td className="directory-stars"><span><Icon name="star" size={14} />{repo.stars || 0}</span></td>
                      <td className="directory-date">{created ? <time dateTime={repo.created_at}>{dateFormat.format(created)}</time> : '—'}</td>
                    </tr>
                    {isOpen && (
                      <tr className="directory-details" id={detailId}>
                        <td colSpan={4}><div><strong>Contributors</strong>
                          {contributors.map(login => <a key={login} href={profileUrl(login)} target="_blank" rel="noreferrer">@{login}</a>)}
                        </div></td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="directory-empty">
            <Icon name="search" size={22} />
            <h3>{term ? 'No matching repositories' : 'No repositories yet'}</h3>
            {term && <button type="button" onClick={() => { updateQuery(''); search.current?.focus(); }}>Clear search</button>}
          </div>
        )}
      </div>
      {matches.length > PAGE_SIZE && (
        <nav className="directory-pagination" aria-label="Directory pages">
          <span>{offset + 1}–{offset + visible.length} of {matches.length}</span>
          <div>
            <button type="button" disabled={activePage === 1} aria-label="Previous page" onClick={() => changePage(activePage - 1)}><Icon name="chevronLeft" size={16} /></button>
            <label className="directory-page-picker">
              <select value={activePage} aria-label="Jump to page" onChange={event => changePage(Number(event.target.value))}>
                {Array.from({ length: pages }, (_, i) => <option key={i + 1} value={i + 1}>Page {i + 1} of {pages}</option>)}
              </select>
              <Icon name="chevronDown" size={12} />
            </label>
            <button type="button" disabled={activePage === pages} aria-label="Next page" onClick={() => changePage(activePage + 1)}><Icon name="chevronRight" size={16} /></button>
          </div>
        </nav>
      )}
    </section>
  );
}
