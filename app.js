/* ═══════════════════════════════════════════════════════════
   APP.JS — ZenScripts
═══════════════════════════════════════════════════════════ */

const PAGE_SIZE = 12;

let allScripts = [];
let filtered   = [];
let page       = 1;
let activeCategory = 'all';
let activeTag      = 'all';
let searchQuery    = '';
let sortMode       = 'popular';

/* ── Fetch data.json and boot ── */
fetch('data.json')
  .then(r => r.json())
  .then(data => {
    allScripts = data.scripts;
    buildNav(data.site);
    buildPartners(data.partners);
    buildBanners(data.adBanners);
    buildCategories(data.categories);
    buildSidebarStats(data.scripts);
    applyFilters();
    bindEvents();
  })
  .catch(err => console.error('Failed to load data.json:', err));

/* ── Navbar scroll effect ── */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
});

/* ── Build nav logo/title from site data ── */
function buildNav(site) {
  document.title = site.name + ' — Free Scripts Hub';
}

/* ── Build partner cards ── */
function buildPartners(partners) {
  const grid = document.getElementById('partners-grid');
  if (!grid) return;
  grid.innerHTML = partners.map(p => `
    <a class="partner-card" href="${p.url}" target="_blank" rel="noopener">
      <div class="partner-top">
        <div class="partner-logo-wrap">
          <img
            class="partner-logo"
            src="${p.logo}"
            alt="${p.name}"
            onerror="this.style.display='none'"
          />
          <div class="partner-name-wrap">
            <div class="partner-name">${p.name}</div>
            <div class="partner-tagline">${p.tagline}</div>
          </div>
        </div>
        <div class="partner-badge" style="color:${p.badgeColor};border-color:${p.badgeColor};background:${p.badgeColor}18;">
          ${p.badge}
        </div>
      </div>
      <div class="partner-desc">${p.description}</div>
      <div class="partner-platforms">
        ${p.platforms.map(pl => `<span class="partner-platform">${pl}</span>`).join('')}
      </div>
      <div class="partner-footer">
        <span class="partner-highlight">${p.highlight}</span>
        <span class="partner-visit">Visit ${p.name} →</span>
      </div>
    </a>
  `).join('');
}

/* ── Build ad banners ── */
function buildBanners(banners) {
  banners.forEach(b => {
    if (b.position === 'hero-bottom') {
      const slot = document.getElementById('slot-hero');
      if (slot) slot.innerHTML = wideBanner(b);
    }
    if (b.position === 'mid-content') {
      const slot = document.getElementById('slot-mid');
      if (slot) slot.innerHTML = wideBanner(b);
    }
    if (b.position === 'sidebar') {
      const slot = document.getElementById('slot-sidebar');
      if (slot) slot.innerHTML = boxBanner(b);
    }
    if (b.position === 'pre-footer') {
      const slot = document.getElementById('slot-footer');
      if (slot) slot.innerHTML = wideBanner(b);
    }
  });
}

function wideBanner(b) {
  return `
    <a class="ad-banner" href="ad-form.html">
      <span class="ad-label">${b.label}</span>
      <div class="ad-text">
        <span class="ad-cta">${b.cta}</span>
        <span class="ad-sub">${b.subtext}</span>
      </div>
      <span class="ad-arrow">→</span>
    </a>
  `;
}

function boxBanner(b) {
  return `
    <a class="ad-banner-box" href="ad-form.html">
      <span class="ad-label">${b.label}</span>
      <span class="ad-cta">${b.cta}</span>
      <span class="ad-sub">${b.subtext}</span>
      <span class="ad-arrow">→</span>
    </a>
  `;
}

/* ── Build category tabs ── */
function buildCategories(categories) {
  const tabs = document.getElementById('cat-tabs');
  if (!tabs) return;
  tabs.innerHTML = categories.map(c => `
    <button class="cat-tab ${c.id === 'all' ? 'active' : ''}" data-cat="${c.id}">
      <span>${c.icon}</span>
      <span>${c.name}</span>
    </button>
  `).join('');
}

/* ── Build sidebar stats ── */
function buildSidebarStats(scripts) {
  const card = document.getElementById('sidebar-stats');
  if (!card) return;
  const totalDownloads = scripts.reduce((a, s) => a + (s.downloads || 0), 0);
  const totalScripts   = scripts.length;
  const games = [...new Set(scripts.map(s => s.game))].length;
  card.innerHTML = `
    <h3>📊 Site Stats</h3>
    <div class="sidebar-stat-row"><span>Total Scripts</span><span>${totalScripts}</span></div>
    <div class="sidebar-stat-row"><span>Total Downloads</span><span>${formatNum(totalDownloads)}</span></div>
    <div class="sidebar-stat-row"><span>Games Covered</span><span>${games}</span></div>
    <div class="sidebar-stat-row"><span>Always Free</span><span>✅</span></div>
  `;
}

/* ── Apply all filters and render ── */
function applyFilters() {
  let results = [...allScripts];

  if (activeCategory !== 'all') {
    results = results.filter(s => s.category === activeCategory);
  }

  if (activeTag !== 'all') {
    results = results.filter(s => s.tags && s.tags.includes(activeTag));
  }

  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    results = results.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.game.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  }

  if (sortMode === 'popular') {
    results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  } else if (sortMode === 'newest') {
    results.sort((a, b) => allScripts.indexOf(a) - allScripts.indexOf(b));
  } else if (sortMode === 'az') {
    results.sort((a, b) => a.name.localeCompare(b.name));
  }

  filtered = results;
  page = 1;
  renderScripts();
}

/* ── Render script cards ── */
function renderScripts() {
  const grid      = document.getElementById('scripts-grid');
  const noResults = document.getElementById('no-results');
  const loadWrap  = document.getElementById('load-more-wrap');
  const countEl   = document.getElementById('result-count');

  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResults.classList.remove('hidden');
    loadWrap.classList.add('hidden');
    if (countEl) countEl.textContent = '0 scripts found';
    return;
  }

  noResults.classList.add('hidden');

  const slice = filtered.slice(0, page * PAGE_SIZE);
  grid.innerHTML = slice.map(s => scriptCard(s)).join('');

  if (countEl) {
    countEl.textContent = `${filtered.length} script${filtered.length !== 1 ? 's' : ''} found`;
  }

  if (slice.length < filtered.length) {
    loadWrap.classList.remove('hidden');
  } else {
    loadWrap.classList.add('hidden');
  }

  grid.querySelectorAll('.script-card').forEach((card, i) => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('script-dl-btn')) return;
      openModal(slice[i]);
    });
  });
}

/* ── Script card HTML ── */
function scriptCard(s) {
  const tags = (s.tags || []).map(t => {
    if (t === 'new')         return `<span class="tag tag-new-pill">🟢 New</span>`;
    if (t === 'popular')     return `<span class="tag tag-pop-pill">🔥 Popular</span>`;
    if (t === 'recommended') return `<span class="tag tag-rec-pill">⭐ Recommended</span>`;
    return '';
  }).join('');

  const features = (s.features || []).slice(0, 3).map(f =>
    `<span class="feature-pill">${f}</span>`
  ).join('');

  return `
    <div class="script-card">
      <div class="script-card-top">
        <div>
          <div class="script-game">${s.game}</div>
          <div class="script-name">${s.name}</div>
        </div>
        <span class="script-version">${s.version || ''}</span>
      </div>
      <div class="script-desc">${s.description}</div>
      ${tags ? `<div class="script-tags">${tags}</div>` : ''}
      ${features ? `<div class="script-features">${features}</div>` : ''}
      <div class="script-footer">
        <span class="script-downloads">⬇️ ${formatNum(s.downloads || 0)}</span>
        <button class="script-dl-btn" onclick="handleDownload('${s.downloadUrl}', '${s.name.replace(/'/g, "\\'")}')">
          Download
        </button>
      </div>
    </div>
  `;
}

/* ── Open modal ── */
function openModal(s) {
  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  if (!overlay || !body) return;

  const tags = (s.tags || []).map(t => {
    if (t === 'new')         return `<span class="tag tag-new-pill">🟢 New</span>`;
    if (t === 'popular')     return `<span class="tag tag-pop-pill">🔥 Popular</span>`;
    if (t === 'recommended') return `<span class="tag tag-rec-pill">⭐ Recommended</span>`;
    return '';
  }).join('');

  const features = (s.features || []).map(f =>
    `<span class="modal-feature">${f}</span>`
  ).join('');

  const executors = (s.executor || []).map(e =>
    `<span class="modal-executor">${e}</span>`
  ).join('');

  body.innerHTML = `
    <div class="modal-game">${s.game}</div>
    <div class="modal-name">${s.name}</div>
    <div class="modal-version">Version: ${s.version || 'N/A'}</div>
    ${tags ? `<div class="modal-tags">${tags}</div>` : ''}
    <div class="modal-desc">${s.description}</div>
    ${features ? `
      <div class="modal-section-title">Features</div>
      <div class="modal-features">${features}</div>
    ` : ''}
    ${executors ? `
      <div class="modal-section-title">Compatible With</div>
      <div class="modal-executors">${executors}</div>
    ` : ''}
    <div class="modal-downloads">⬇️ ${formatNum(s.downloads || 0)} downloads</div>
    <a class="modal-dl-btn" href="${s.downloadUrl}" ${s.downloadUrl !== '#' ? 'target="_blank" rel="noopener"' : ''}>
      ⬇️ Download Script
    </a>
  `;

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/* ── Close modal ── */
function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

/* ── Handle download ── */
function handleDownload(url, name) {
  if (url && url !== '#') {
    window.open(url, '_blank', 'noopener');
  }
}

/* ── Format numbers ── */
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

/* ── Bind all events ── */
function bindEvents() {

  /* Hamburger */
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
    });
  }

  /* Search input */
  const searchInput = document.getElementById('search');
  const clearBtn    = document.getElementById('search-clear');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      clearBtn.style.display = searchQuery ? 'block' : 'none';
      applyFilters();
    });
  }
  if (clearBtn) {
    clearBtn.style.display = 'none';
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearBtn.style.display = 'none';
      applyFilters();
    });
  }

  /* Sort */
  const sortEl = document.getElementById('sort');
  if (sortEl) {
    sortEl.addEventListener('change', () => {
      sortMode = sortEl.value;
      applyFilters();
    });
  }

  /* Category tabs */
  document.addEventListener('click', e => {
    if (e.target.closest('.cat-tab')) {
      const tab = e.target.closest('.cat-tab');
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.cat;
      applyFilters();
    }
  });

  /* Tag filters */
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTag = btn.dataset.tag;
      applyFilters();
    });
  });

  /* Load more */
  const loadMoreBtn = document.getElementById('load-more');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      page++;
      renderScripts();
    });
  }

  /* Clear all filters */
  const clearAll = document.getElementById('clear-all');
  if (clearAll) {
    clearAll.addEventListener('click', () => {
      searchQuery    = '';
      activeCategory = 'all';
      activeTag      = 'all';
      sortMode       = 'popular';
      const searchInput = document.getElementById('search');
      if (searchInput) searchInput.value = '';
      const clearBtn = document.getElementById('search-clear');
      if (clearBtn) clearBtn.style.display = 'none';
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      const allTab = document.querySelector('.cat-tab[data-cat="all"]');
      if (allTab) allTab.classList.add('active');
      document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      const allTag = document.querySelector('.tag-btn[data-tag="all"]');
      if (allTag) allTag.classList.add('active');
      applyFilters();
    });
  }

  /* Modal close button */
  const modalClose = document.getElementById('modal-close');
  if (modalClose) modalClose.addEventListener('click', closeModal);

  /* Modal overlay click outside */
  const modalOverlay = document.getElementById('modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });
  }
