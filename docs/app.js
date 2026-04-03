/* =============================================
   ESPRIT PI Stats — Application Logic
   Loads data.json and renders the repo cards, 
   charts, and handles UI interactions.
   ============================================= */

// ---- CONFIG ----
// The user will provide the raw JSON URL; fallback to local path
const DATA_URL = './data.json';

// ---- STATE ----
let allRepos = [];
let currentSort = 'name';
let chartsRendered = false;
let currentSlideIndex = 0;
const totalSlides = 5;

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

// Navigation Tabs
const navBtns = document.querySelectorAll('.nav-btn[data-target]');
const tabPanes = document.querySelectorAll('.tab-pane');
const mainContent = document.getElementById('mainContent');

// Theme toggle
const themeToggle = document.getElementById('themeToggle');

// Presentation Mode
const presentationOverlay = document.getElementById('presentationOverlay');
const startPresentationBtn = document.getElementById('startPresentationBtn');
const closePresentationBtn = document.getElementById('closePresentationBtn');
const prevSlideBtn = document.getElementById('prevSlideBtn');
const nextSlideBtn = document.getElementById('nextSlideBtn');
const slideIndicatorsContainer = document.getElementById('slideIndicators');
const slides = document.querySelectorAll('.slide');

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

// Extract Class from Repo Name
function extractClass(name) {
    const parts = name.split('-');
    return parts.length >= 3 ? parts[2] : 'Other';
}

// ---- RENDER STATS ----
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
    
    // Setup Presentation slides data
    document.getElementById('slideTotalRepos').textContent = repos.length;
    document.getElementById('slideTotalStars').textContent = totalStars;
    document.getElementById('slideTotalContribs').textContent = allContribs.size;
    
    // Top repo
    if(repos.length > 0) {
        let topRepo = [...repos].sort((a,b) => (b.stars || 0) - (a.stars || 0))[0];
        document.getElementById('slideTopRepo').textContent = topRepo.name;
        document.getElementById('slideTopRepoStars').textContent = `${topRepo.stars} Stars`;
        
        let mostCollab = [...repos].sort((a,b) => (b.contributors?.length || 0) - (a.contributors?.length || 0))[0];
        document.getElementById('mostCollabRepo').textContent = mostCollab.name;
        document.getElementById('mostCollabCount').textContent = `${mostCollab.contributors?.length || 0} contributors`;
        
        document.getElementById('avgStars').textContent = (totalStars / repos.length).toFixed(1);
        
        let latest = [...repos].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
        document.getElementById('latestRepo').textContent = latest.name;
        document.getElementById('latestRepoDate').textContent = formatDate(latest.created_at);
        
        // Count Classes
        let classTally = {};
        repos.forEach(r => { 
            let c = extractClass(r.name);
            classTally[c] = (classTally[c] || 0) + 1;
        });
        let topClassEntry = Object.entries(classTally).sort((a,b) => b[1] - a[1])[0];
        if(topClassEntry) {
            document.getElementById('slideTopClass').textContent = topClassEntry[0];
            document.getElementById('slideTopClassCount').textContent = `${topClassEntry[1]} Repositories`;
        }
    }
}

// ---- RENDER CHARTS ----
function renderCharts(repos) {
    if(chartsRendered) return;
    
    // Get colors based on theme
    const isDark = document.body.classList.contains('theme-dark');
    const textColor = isDark ? '#f5f5f4' : '#1d1d1b';
    const gridColor = isDark ? 'rgba(189, 188, 188, 0.1)' : 'rgba(29, 29, 27, 0.1)';
    const primaryColor = '#c90c0f';
    const primaryGlow = 'rgba(201, 12, 15, 0.6)';

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Inter', sans-serif";

    // 1. Top 5 Stars
    const topStars = [...repos].sort((a,b) => (b.stars||0) - (a.stars||0)).slice(0, 5);
    new Chart(document.getElementById('starsChart'), {
        type: 'bar',
        data: {
            labels: topStars.map(r => r.name.length > 20 ? r.name.substring(0, 20)+'...' : r.name),
            datasets: [{
                label: 'Stars',
                data: topStars.map(r => r.stars),
                backgroundColor: primaryColor,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, grid: { color: gridColor } }, x: { grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });

    // 2. Class Distribution
    let classCounts = {};
    repos.forEach(r => {
        let cls = extractClass(r.name);
        classCounts[cls] = (classCounts[cls] || 0) + 1;
    });
    // Sort and limit to top 6 classes
    let sortedClasses = Object.entries(classCounts).sort((a,b)=>b[1]-a[1]);
    let topClasses = sortedClasses.slice(0, 6);
    let topLabels = topClasses.map(x=>x[0]);
    let topData = topClasses.map(x=>x[1]);
    
    new Chart(document.getElementById('classChart'), {
        type: 'doughnut',
        data: {
            labels: topLabels,
            datasets: [{
                data: topData,
                backgroundColor: [primaryColor, '#e8383b', '#ff7b7d', '#bdbcbc', '#737373', '#404040'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });

    // 3. Top Contributors across all repos
    let cCounts = {};
    repos.forEach(r => {
        (r.contributors||[]).forEach(c => {
            cCounts[c] = (cCounts[c] || 0) + 1;
        });
    });
    let topContribs = Object.entries(cCounts).sort((a,b)=>b[1]-a[1]).slice(0, 5);
    
    new Chart(document.getElementById('contribsChart'), {
        type: 'bar',
        data: {
            labels: topContribs.map(x=>x[0]),
            datasets: [{
                label: 'Repositories contributed to',
                data: topContribs.map(x=>x[1]),
                backgroundColor: primaryGlow,
                borderColor: primaryColor,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, grid: { color: gridColor }, ticks: { stepSize: 1 } }, y: { grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });

    chartsRendered = true;
}

// ---- REPO CARDS ----
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

// Tabs logic
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        tabPanes.forEach(pane => {
            if(pane.id === targetId) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
        
        // Lazy load charts when clicking numbers tab
        if(targetId === 'tab-numbers') {
            renderCharts(allRepos);
        }
    });
});

// Search & Sort filters
searchInput.addEventListener('input', filterAndRender);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.dataset.sort;
        filterAndRender();
    });
});

// Presentation Mode Logic
function showSlide(index) {
    slides.forEach((sl, i) => {
        sl.classList.toggle('active', i === index);
    });
    document.querySelectorAll('.slide-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

// Generate dots
for(let i=0; i<totalSlides; i++) {
    const dot = document.createElement('div');
    dot.className = i===0 ? 'slide-dot active' : 'slide-dot';
    dot.addEventListener('click', () => { currentSlideIndex = i; showSlide(currentSlideIndex); });
    slideIndicatorsContainer.appendChild(dot);
}

startPresentationBtn.addEventListener('click', () => {
    presentationOverlay.classList.add('active');
    currentSlideIndex = 0;
    showSlide(currentSlideIndex);
});

closePresentationBtn.addEventListener('click', () => {
    presentationOverlay.classList.remove('active');
});

prevSlideBtn.addEventListener('click', () => {
    currentSlideIndex = (currentSlideIndex - 1 + totalSlides) % totalSlides;
    showSlide(currentSlideIndex);
});

nextSlideBtn.addEventListener('click', () => {
    currentSlideIndex = (currentSlideIndex + 1) % totalSlides;
    showSlide(currentSlideIndex);
});

// Theme Toggle
function setTheme(isDark) {
    if(isDark) {
        document.body.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
    } else {
        document.body.classList.add('theme-light');
        document.body.classList.remove('theme-dark');
    }
    localStorage.setItem('esprit-theme', isDark ? 'dark' : 'light');
    
    // Destroy and re-render charts completely to apply new colors
    if(chartsRendered) {
        // Find existing charts and destroy
        Object.values(Chart.instances).forEach(chart => chart.destroy());
        chartsRendered = false;
        if(document.getElementById('tab-numbers').classList.contains('active')) {
             renderCharts(allRepos);
        }
    }
}

themeToggle.addEventListener('click', () => {
    const isCurrentlyDark = document.body.classList.contains('theme-dark');
    setTheme(!isCurrentlyDark);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Search focus
    if (e.key === '/' && document.activeElement !== searchInput && !presentationOverlay.classList.contains('active')) {
        e.preventDefault();
        searchInput.focus();
    }
    // Escape handles search clear or close presentation
    if (e.key === 'Escape') {
        if(presentationOverlay.classList.contains('active')) {
            presentationOverlay.classList.remove('active');
        } else {
             searchInput.value = '';
             searchInput.blur();
             filterAndRender();
        }
    }
    // Presentation arrows
    if(presentationOverlay.classList.contains('active')) {
        if(e.key === 'ArrowRight') {
            nextSlideBtn.click();
        } else if (e.key === 'ArrowLeft') {
            prevSlideBtn.click();
        }
    }
});


// ---- INIT ----
async function init() {
    // Load saved theme
    const savedTheme = localStorage.getItem('esprit-theme');
    if(savedTheme === 'light') setTheme(false); // defaults to dark
    else setTheme(true);

    try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        allRepos = data.repositories || [];
        loading.style.display = 'none';
        mainContent.style.display = 'block';

        renderStats(allRepos);
        filterAndRender();

        if (data.generated_at) {
            lastUpdatedEl.textContent = formatDate(data.generated_at);
        }
    } catch (err) {
        loading.innerHTML = `
            <p style="color: var(--red-light);">Failed to load data</p>
            <p style="font-size: 0.82rem; color: var(--text-muted-dim);">
                Make sure <code>data.json</code> exists in the docs folder.<br>
                Run: <code>esprit-tracker all-repos --json docs/data.json</code>
            </p>
        `;
        console.error('Failed to load data:', err);
    }
}

init();
