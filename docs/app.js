/* =============================================
   ESPRIT PI Stats — Application Logic
   Loads data.json and renders the repo cards
   ============================================= */

// ---- CONFIG ----
// The user will provide the raw JSON URL; fallback to local path
const DATA_URL = './data.json';

// ---- STATE ----
let allRepos = [];
let currentSort = 'name';

// ---- DOM ----
const reposGrid      = document.getElementById('reposGrid');
const loading        = document.getElementById('loading');
const emptyState     = document.getElementById('emptyState');
const searchInput    = document.getElementById('searchInput');
const resultsCount   = document.getElementById('resultsCount');
const filterBtns     = document.querySelectorAll('.filter-btn');
const totalReposEl   = document.getElementById('totalRepos');
const totalContribEl = document.getElementById('totalContributors');
const totalStarsEl   = document.getElementById('totalStars');
const totalOwnersEl  = document.getElementById('totalOwners');
const lastUpdatedEl  = document.getElementById('lastUpdated');

// ---- UTILS ----
function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function animateCount(el, target) {
    const duration = 800;
    const start = performance.now();
    const from = 0;

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(from + (target - from) * eased).toLocaleString();
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ---- RENDER ----
function renderStats(repos) {
    const totalStars = repos.reduce((s, r) => s + (r.stars || 0), 0);
    const allContribs = new Set();
    const allOwners = new Set();

    repos.forEach(r => {
        allOwners.add(r.owner);
        (r.contributors || []).forEach(c => allContribs.add(c));
    });

    animateCount(totalReposEl, repos.length);
    animateCount(totalContribEl, allContribs.size);
    animateCount(totalStarsEl, totalStars);
    animateCount(totalOwnersEl, allOwners.size);
}

function createCard(repo, index) {
    const contribs = repo.contributors || [];
    const showMax = 4;
    const shown = contribs.slice(0, showMax);
    const extra = contribs.length - showMax;

    const contribHtml = shown
        .map(c => `<a href="https://github.com/${c}" target="_blank" rel="noopener" class="contributor-chip">${c}</a>`)
        .join('')
        + (extra > 0 ? `<span class="contributor-more">+${extra}</span>` : '');

    const card = document.createElement('a');
    card.href = repo.url;
    card.target = '_blank';
    card.rel = 'noopener';
    card.className = 'repo-card';
    card.style.animationDelay = `${index * 0.04}s`;

    card.innerHTML = `
        <div class="repo-card-header">
            <span class="repo-name">${repo.name}</span>
            <span class="repo-stars">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ${repo.stars}
            </span>
        </div>
        <div class="repo-owner">
            <span class="repo-owner-avatar">
                <img src="https://github.com/${repo.owner}.png?size=44" alt="${repo.owner}" loading="lazy"
                     onerror="this.style.display='none'; this.parentElement.textContent='${(repo.owner || '?')[0].toUpperCase()}'">
            </span>
            <span class="repo-owner-name">${repo.owner}</span>
        </div>
        <div class="repo-meta">
            <span class="repo-meta-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${formatDate(repo.created_at)}
            </span>
            <span class="repo-meta-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                ${contribs.length} contributor${contribs.length !== 1 ? 's' : ''}
            </span>
        </div>
        ${contribs.length > 0 ? `<div class="repo-contributors">${contribHtml}</div>` : ''}
        <span class="repo-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View on GitHub
        </span>
    `;

    return card;
}

function renderCards(repos) {
    reposGrid.innerHTML = '';

    if (repos.length === 0) {
        emptyState.style.display = 'flex';
        resultsCount.textContent = '0 results';
        return;
    }

    emptyState.style.display = 'none';
    resultsCount.textContent = `${repos.length} result${repos.length !== 1 ? 's' : ''}`;

    repos.forEach((repo, i) => {
        reposGrid.appendChild(createCard(repo, i));
    });
}

// ---- SORT & FILTER ----
function sortRepos(repos, key) {
    const sorted = [...repos];
    switch (key) {
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'stars':
            sorted.sort((a, b) => (b.stars || 0) - (a.stars || 0));
            break;
        case 'date':
            sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            break;
        case 'contributors':
            sorted.sort((a, b) => (b.contributors || []).length - (a.contributors || []).length);
            break;
    }
    return sorted;
}

function filterAndRender() {
    const q = searchInput.value.trim().toLowerCase();
    let filtered = allRepos;

    if (q) {
        filtered = allRepos.filter(r => {
            const searchable = [
                r.name,
                r.owner,
                ...(r.contributors || []),
            ].join(' ').toLowerCase();
            return searchable.includes(q);
        });
    }

    filtered = sortRepos(filtered, currentSort);
    renderCards(filtered);
}

// ---- EVENTS ----
searchInput.addEventListener('input', filterAndRender);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.dataset.sort;
        filterAndRender();
    });
});

// Keyboard shortcut: / focuses search
document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
    }
    if (e.key === 'Escape') {
        searchInput.value = '';
        searchInput.blur();
        filterAndRender();
    }
});

// ---- INIT ----
async function init() {
    try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        allRepos = data.repositories || [];
        loading.style.display = 'none';

        renderStats(allRepos);
        filterAndRender();

        if (data.generated_at) {
            lastUpdatedEl.textContent = formatDate(data.generated_at);
        }
    } catch (err) {
        loading.innerHTML = `
            <p style="color: var(--red-light);">Failed to load data</p>
            <p style="font-size: 0.82rem; color: var(--muted-dim);">
                Make sure <code>data.json</code> exists in the docs folder.<br>
                Run: <code>esprit-tracker all-repos --json docs/data.json</code>
            </p>
        `;
        console.error('Failed to load data:', err);
    }
}

init();
