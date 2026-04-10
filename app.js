/* ═══════════════════════════════════════════════════════════
   APP.JS — ZenScripts Hub
═══════════════════════════════════════════════════════════ */

const PAGE_SIZE    = 12;
let allScripts     = [];
let filtered       = [];
let page           = 1;
let activeCategory = 'all';
let activeTag      = 'all';
let searchQuery    = '';
let sortMode       = 'popular';
let searchTimeout  = null;

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  fetch('./data.json')
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => {
      if (!data.scripts || !Array.isArray(data.scripts)) {
        throw new Error('scripts array missing from data.json');
      }
      allScripts = data.scripts;
      buildPartners(data.partners    || []);
      buildBanners(data.adBanners    || []);
      buildCategories(data.categories || []);
      applyFilters();
      bindEvents();
    })
    .catch(err => {
      console.error('Failed to load data.json:', err);
      const grid = document.getElementById('scripts-grid');
      if (grid) {
        grid.innerHTML = `
          <div style="
            grid-column: 1/-1;
            text-align: center;
            padding: 60px 20px;
            color: #6b6b8a;
          ">
            <div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div>
            <h3 style="color:#f0f0ff;margin-bottom:8px;">Failed to load scripts</h3>
            <p>Make sure data.json is in the same folder as index.html</p>
            <p style="margin-top:8px;font-size:0.8rem;opacity:0.6;">
              ${err.message}
            </p>
          </div>
        `;
      }
    });

  /* Navbar scroll effect */
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

});

/* ══════════════════════════════════════
   PARTNERS
══════════════════════════════════════ */
function buildPartners(partners) {
  const grid = document.getElementById('partners-grid');
  if (!grid || !partners.length) return;

  grid.innerHTML = partners.map(p => `
    <a class="partner-card" href="${safe(p.url)}" target="_blank" rel="noopener">
      <div class="partner-top">
        <div class="partner-logo-wrap">
          <img
            class="partner-logo"
            src="${safe(p.logo)}"
            alt="${safe(p.name)}"
            onerror="this.style.display='none'"
          />
          <div>
            <div class="partner-name">${safe(p.name)}</div>
            <div class="partner-tagline">${safe(p.tagline)}</div>
          </div>
        </div>
        <div class="partner-badge" style="
          color: ${safe(p.badgeColor)};
          border-color: ${safe(p.badgeColor)};
          background: ${safe(p.badgeColor)}18;
        ">
          ${safe(p.badge)}
        </div>
      </div>
      <div class="partner-desc">${safe(p.description)}</div>
      <div class="partner-platforms">
        ${(p.platforms || []).map(pl =>
          `<span class="partner-platform">${safe(pl)}</span>`
        ).join('')}
      </div>
      <div class="partner-footer">
        <span class="partner-highlight">${safe(p.highlight)}</span>
        <span class="partner-visit">Visit ${safe(p.name)} →</span>
      </div>
    </a>
  `).join('');
}

/* ══════════════════════════════════════
   BANNERS
══════════════════════════════════════ */
function buildBanners(banners) {
  const slotMap = {
    'hero-bottom': 'slot-hero',
    'mid-content': 'slot-mid',
    'pre-footer':  'slot-footer',
    'sidebar':     'slot-sidebar'
  };

  banners.forEach(b => {
    const slotId = slotMap[b.position];
    if (!slotId) return;
    const slot = document.getElementById(slotId);
    if (!slot) return;
    slot.innerHTML = b.position === 'sidebar'
      ? boxBanner(b)
      : wideBanner(b);
  });
}

function wideBanner(b) {
  return `
    <a class="ad-banner" href="./ad-form.html">
      <span class="ad-label">${safe(b.label)}</span>
      <div class="ad-text">
        <span class="ad-cta">${safe(b.cta)}</span>
        <span class="ad-sub">${safe(b.subtext)}</span>
      </div>
      <span class="ad-arrow">→</span>
    </a>
  `;
}

function boxBanner(b) {
  return `
    <a class="ad-banner-box" href="./ad-form.html">
      <span class="ad-label">${safe(b.label)}</span>
      <span class="ad-cta">${safe(b.cta)}</span>
      <span class="ad-sub">${safe(b.subtext)}</span>
      <span class="ad-arrow">→</span>
    </a>
  `;
}

/* ══════════════════════════════════════
   CATEGORIES
══════════════════════════════════════ */
function buildCategories(categories) {
  const tabs = document.getElementById('cat-tabs');
  if (!tabs) return;

  tabs.innerHTML = categories.map(c => `
    <button
      class="cat-tab ${c.id === 'all' ? 'active' : ''}"
      data-cat="${safe(c.id)}"
    >
      <span>${safe(c.icon)}</span>
      <span>${safe(c.name)}</span>
    </button>
  `).join('');
}

/* ══════════════════════════════════════
   FILTERS
══════════════════════════════════════ */
function applyFilters() {
  let results = [...allScripts];

  /* Category filter */
  if (activeCategory !== 'all') {
    results = results.filter(s => s.category === activeCategory);
  }

  /* Tag filter */
  if (activeTag !== 'all') {
    results = results.filter(s =>
      Array.isArray(s.tags) && s.tags.includes(activeTag)
    );
  }

  /* Search filter */
  const q = searchQuery.trim().toLowerCase();
  if (q !== '') {
    results = results.filter(s =>
      (s.name        || '').toLowerCase().includes(q) ||
      (s.game        || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.features    || []).some(f => f.toLowerCase().includes(q))
    );
  }

  /* Sort */
  if (sortMode === 'popular') {
    results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  } else if (sortMode === 'newest') {
    /* newest = last added in JSON = reverse original index */
    results.sort((a, b) =>
      allScripts.indexOf(b) - allScripts.indexOf(a)
    );
  } else if (sortMode === 'az') {
    results.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  }

  filtered = results;
  page     = 1;
  renderScripts(false); /* false = full re-render */
}

/* ══════════════════════════════════════
   RENDER SCRIPTS
══════════════════════════════════════ */
function renderScripts(append = false) {
  const grid     = document.getElementById('scripts-grid');
  const noRes    = document.getElementById('no-results');
  const loadWrap = document.getElementById('load-more-wrap');
  const countEl  = document.getElementById('result-count');

  if (!grid) return;

  /* No results */
  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noRes)    noRes.classList.remove('hidden');
    if (loadWrap) loadWrap.classList.add('hidden');
    if (countEl)  countEl.textContent = '0 scripts found';
    return;
  }

  if (noRes) noRes.classList.add('hidden');

  /* Slice for current page */
  const start = append ? (page - 1) * PAGE_SIZE : 0;
  const end   = page * PAGE_SIZE;
  const slice = filtered.slice(start, end);

  /* Build fragment */
  const fragment = document.createDocumentFragment();
  slice.forEach(s => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = scriptCard(s);
    const card = wrapper.firstElementChild;

    /* Click card → open modal */
    card.addEventListener('click', e => {
      if (e.target.closest('.script-dl-btn')) return;
      openModal(s);
    });

    /* Click download button */
    const dlBtn = card.querySelector('.script-dl-btn');
    if (dlBtn) {
      dlBtn.addEventListener('click', e => {
        e.stopPropagation();
        handleDownload(s.downloadUrl);
      });
    }

    fragment.appendChild(card);
  });

  /* Append or replace */
  if (append) {
    grid.appendChild(fragment);
  } else {
    grid.innerHTML = '';
    grid.appendChild(fragment);
    /* Smooth scroll to top of grid on filter change */
    grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* Update count */
  if (countEl) {
    countEl.textContent =
      `${filtered.length} script${filtered.length !== 1 ? 's' : ''} found`;
  }

  /* Load more button */
  if (loadWrap) {
    if (end < filtered.length) {
      loadWrap.classList.remove('hidden');
    } else {
      loadWrap.classList.add('hidden');
    }
  }
}

/* ══════════════════════════════════════
   SCRIPT CARD HTML
══════════════════════════════════════ */
function scriptCard(s) {
  const tags     = buildTags(s.tags);
  const features = buildFeaturePills(s.features, 3);

  return `
    <div class="script-card">
      <div class="script-card-top">
        <div>
          <div class="script-game">${safe(s.game)}</div>
          <div class="script-name">${safe(s.name)}</div>
        </div>
        ${s.version
          ? `<span class="script-version">${safe(s.version)}</span>`
          : ''}
      </div>
      <div class="script-desc">${safe(s.description)}</div>
      ${tags     ? `<div class="script-tags">${tags}</div>`         : ''}
      ${features ? `<div class="script-features">${features}</div>` : ''}
      <div class="script-footer">
        <span class="script-downloads">⬇️ ${formatNum(s.downloads || 0)}</span>
        <button class="script-dl-btn">Download</button>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════
   MODAL
══════════════════════════════════════ */
function openModal(s) {
  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  if (!overlay || !body) return;

  const tags      = buildTags(s.tags);
  const features  = buildFeaturePills(s.features);
  const executors = buildExecutorPills(s.executor);
  const hasLink   = s.downloadUrl && s.downloadUrl !== '#';

  body.innerHTML = `
    <div class="modal-game">${safe(s.game)}</div>
    <div class="modal-name">${safe(s.name)}</div>
    ${s.version
      ? `<div class="modal-version">Version: ${safe(s.version)}</div>`
      : ''}
    ${tags ? `<div class="modal-tags">${tags}</div>` : ''}
    <div class="modal-desc">${safe(s.description)}</div>
    ${features
      ? `<div class="modal-section-title">Features</div>
         <div class="modal-features">${features}</div>`
      : ''}
    ${executors
      ? `<div class="modal-section-title">Compatible With</div>
         <div class="modal-executors">${executors}</div>`
      : ''}
    <div class="modal-downloads">
      ⬇️ ${formatNum(s.downloads || 0)} downloads
    </div>
    <a
      class="modal-dl-btn ${!hasLink ? 'modal-dl-disabled' : ''}"
      href="${hasLink ? safe(s.downloadUrl) : 'javascript:void(0)'}"
      ${hasLink ? 'target="_blank" rel="noopener"' : ''}
    >
      ⬇️ ${hasLink ? 'Download Script' : 'Coming Soon'}
    </a>
  `;

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function handleDownload(url) {
  if (url && url !== '#') {
    window.open(url, '_blank', 'noopener');
  }
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function buildTags(tags) {
  if (!Array.isArray(tags) || !tags.length) return '';
  return tags.map(t => {
    if (t === 'new')         return `<span class="tag tag-new-pill">🟢 New</span>`;
    if (t === 'popular')     return `<span class="tag tag-pop-pill">/* ═══════════════════════════════════════════════════════════
   APP.JS — ZenScripts Hub
═══════════════════════════════════════════════════════════ */

const PAGE_SIZE    = 12;
let allScripts     = [];
let filtered       = [];
let page           = 1;
let activeCategory = 'all';
let activeTag      = 'all';
let searchQuery    = '';
let sortMode       = 'popular';
let searchTimeout  = null;

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  fetch('./data.json')
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => {
      if (!data.scripts || !Array.isArray(data.scripts)) {
        throw new Error('scripts array missing from data.json');
      }
      allScripts = data.scripts;
      buildPartners(data.partners    || []);
      buildBanners(data.adBanners    || []);
      buildCategories(data.categories || []);
      applyFilters();
      bindEvents();
    })
    .catch(err => {
      console.error('Failed to load data.json:', err);
      const grid = document.getElementById('scripts-grid');
      if (grid) {
        grid.innerHTML = `
          <div style="
            grid-column: 1/-1;
            text-align: center;
            padding: 60px 20px;
            color: #6b6b8a;
          ">
            <div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div>
            <h3 style="color:#f0f0ff;margin-bottom:8px;">Failed to load scripts</h3>
            <p>Make sure data.json is in the same folder as index.html</p>
            <p style="margin-top:8px;font-size:0.8rem;opacity:0.6;">
              ${err.message}
            </p>
          </div>
        `;
      }
    });

  /* Navbar scroll effect */
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

});

/* ══════════════════════════════════════
   PARTNERS
══════════════════════════════════════ */
function buildPartners(partners) {
  const grid = document.getElementById('partners-grid');
  if (!grid || !partners.length) return;

  grid.innerHTML = partners.map(p => `
    <a class="partner-card" href="${safe(p.url)}" target="_blank" rel="noopener">
      <div class="partner-top">
        <div class="partner-logo-wrap">
          <img
            class="partner-logo"
            src="${safe(p.logo)}"
            alt="${safe(p.name)}"
            onerror="this.style.display='none'"
          />
          <div>
            <div class="partner-name">${safe(p.name)}</div>
            <div class="partner-tagline">${safe(p.tagline)}</div>
          </div>
        </div>
        <div class="partner-badge" style="
          color: ${safe(p.badgeColor)};
          border-color: ${safe(p.badgeColor)};
          background: ${safe(p.badgeColor)}18;
        ">
          ${safe(p.badge)}
        </div>
      </div>
      <div class="partner-desc">${safe(p.description)}</div>
      <div class="partner-platforms">
        ${(p.platforms || []).map(pl =>
          `<span class="partner-platform">${safe(pl)}</span>`
        ).join('')}
      </div>
      <div class="partner-footer">
        <span class="partner-highlight">${safe(p.highlight)}</span>
        <span class="partner-visit">Visit ${safe(p.name)} →</span>
      </div>
    </a>
  `).join('');
}

/* ══════════════════════════════════════
   BANNERS
══════════════════════════════════════ */
function buildBanners(banners) {
  const slotMap = {
    'hero-bottom': 'slot-hero',
    'mid-content': 'slot-mid',
    'pre-footer':  'slot-footer',
    'sidebar':     'slot-sidebar'
  };

  banners.forEach(b => {
    const slotId = slotMap[b.position];
    if (!slotId) return;
    const slot = document.getElementById(slotId);
    if (!slot) return;
    slot.innerHTML = b.position === 'sidebar'
      ? boxBanner(b)
      : wideBanner(b);
  });
}

function wideBanner(b) {
  return `
    <a class="ad-banner" href="./ad-form.html">
      <span class="ad-label">${safe(b.label)}</span>
      <div class="ad-text">
        <span class="ad-cta">${safe(b.cta)}</span>
        <span class="ad-sub">${safe(b.subtext)}</span>
      </div>
      <span class="ad-arrow">→</span>
    </a>
  `;
}

function boxBanner(b) {
  return `
    <a class="ad-banner-box" href="./ad-form.html">
      <span class="ad-label">${safe(b.label)}</span>
      <span class="ad-cta">${safe(b.cta)}</span>
      <span class="ad-sub">${safe(b.subtext)}</span>
      <span class="ad-arrow">→</span>
    </a>
  `;
}

/* ══════════════════════════════════════
   CATEGORIES
══════════════════════════════════════ */
function buildCategories(categories) {
  const tabs = document.getElementById('cat-tabs');
  if (!tabs) return;

  tabs.innerHTML = categories.map(c => `
    <button
      class="cat-tab ${c.id === 'all' ? 'active' : ''}"
      data-cat="${safe(c.id)}"
    >
      <span>${safe(c.icon)}</span>
      <span>${safe(c.name)}</span>
    </button>
  `).join('');
}

/* ══════════════════════════════════════
   FILTERS
══════════════════════════════════════ */
function applyFilters() {
  let results = [...allScripts];

  /* Category filter */
  if (activeCategory !== 'all') {
    results = results.filter(s => s.category === activeCategory);
  }

  /* Tag filter */
  if (activeTag !== 'all') {
    results = results.filter(s =>
      Array.isArray(s.tags) && s.tags.includes(activeTag)
    );
  }

  /* Search filter */
  const q = searchQuery.trim().toLowerCase();
  if (q !== '') {
    results = results.filter(s =>
      (s.name        || '').toLowerCase().includes(q) ||
      (s.game        || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.features    || []).some(f => f.toLowerCase().includes(q))
    );
  }

  /* Sort */
  if (sortMode === 'popular') {
    results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  } else if (sortMode === 'newest') {
    /* newest = last added in JSON = reverse original index */
    results.sort((a, b) =>
      allScripts.indexOf(b) - allScripts.indexOf(a)
    );
  } else if (sortMode === 'az') {
    results.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  }

  filtered = results;
  page     = 1;
  renderScripts(false); /* false = full re-render */
}

/* ══════════════════════════════════════
   RENDER SCRIPTS
══════════════════════════════════════ */
function renderScripts(append = false) {
  const grid     = document.getElementById('scripts-grid');
  const noRes    = document.getElementById('no-results');
  const loadWrap = document.getElementById('load-more-wrap');
  const countEl  = document.getElementById('result-count');

  if (!grid) return;

  /* No results */
  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noRes)    noRes.classList.remove('hidden');
    if (loadWrap) loadWrap.classList.add('hidden');
    if (countEl)  countEl.textContent = '0 scripts found';
    return;
  }

  if (noRes) noRes.classList.add('hidden');

  /* Slice for current page */
  const start = append ? (page - 1) * PAGE_SIZE : 0;
  const end   = page * PAGE_SIZE;
  const slice = filtered.slice(start, end);

  /* Build fragment */
  const fragment = document.createDocumentFragment();
  slice.forEach(s => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = scriptCard(s);
    const card = wrapper.firstElementChild;

    /* Click card → open modal */
    card.addEventListener('click', e => {
      if (e.target.closest('.script-dl-btn')) return;
      openModal(s);
    });

    /* Click download button */
    const dlBtn = card.querySelector('.script-dl-btn');
    if (dlBtn) {
      dlBtn.addEventListener('click', e => {
        e.stopPropagation();
        handleDownload(s.downloadUrl);
      });
    }

    fragment.appendChild(card);
  });

  /* Append or replace */
  if (append) {
    grid.appendChild(fragment);
  } else {
    grid.innerHTML = '';
    grid.appendChild(fragment);
    /* Smooth scroll to top of grid on filter change */
    grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* Update count */
  if (countEl) {
    countEl.textContent =
      `${filtered.length} script${filtered.length !== 1 ? 's' : ''} found`;
  }

  /* Load more button */
  if (loadWrap) {
    if (end < filtered.length) {
      loadWrap.classList.remove('hidden');
    } else {
      loadWrap.classList.add('hidden');
    }
  }
}

/* ══════════════════════════════════════
   SCRIPT CARD HTML
══════════════════════════════════════ */
function scriptCard(s) {
  const tags     = buildTags(s.tags);
  const features = buildFeaturePills(s.features, 3);

  return `
    <div class="script-card">
      <div class="script-card-top">
        <div>
          <div class="script-game">${safe(s.game)}</div>
          <div class="script-name">${safe(s.name)}</div>
        </div>
        ${s.version
          ? `<span class="script-version">${safe(s.version)}</span>`
          : ''}
      </div>
      <div class="script-desc">${safe(s.description)}</div>
      ${tags     ? `<div class="script-tags">${tags}</div>`         : ''}
      ${features ? `<div class="script-features">${features}</div>` : ''}
      <div class="script-footer">
        <span class="script-downloads">⬇️ ${formatNum(s.downloads || 0)}</span>
        <button class="script-dl-btn">Download</button>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════
   MODAL
══════════════════════════════════════ */
function openModal(s) {
  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  if (!overlay || !body) return;

  const tags      = buildTags(s.tags);
  const features  = buildFeaturePills(s.features);
  const executors = buildExecutorPills(s.executor);
  const hasLink   = s.downloadUrl && s.downloadUrl !== '#';

  body.innerHTML = `
    <div class="modal-game">${safe(s.game)}</div>
    <div class="modal-name">${safe(s.name)}</div>
    ${s.version
      ? `<div class="modal-version">Version: ${safe(s.version)}</div>`
      : ''}
    ${tags ? `<div class="modal-tags">${tags}</div>` : ''}
    <div class="modal-desc">${safe(s.description)}</div>
    ${features
      ? `<div class="modal-section-title">Features</div>
         <div class="modal-features">${features}</div>`
      : ''}
    ${executors
      ? `<div class="modal-section-title">Compatible With</div>
         <div class="modal-executors">${executors}</div>`
      : ''}
    <div class="modal-downloads">
      ⬇️ ${formatNum(s.downloads || 0)} downloads
    </div>
    <a
      class="modal-dl-btn ${!hasLink ? 'modal-dl-disabled' : ''}"
      href="${hasLink ? safe(s.downloadUrl) : 'javascript:void(0)'}"
      ${hasLink ? 'target="_blank" rel="noopener"' : ''}
    >
      ⬇️ ${hasLink ? 'Download Script' : 'Coming Soon'}
    </a>
  `;

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function handleDownload(url) {
  if (url && url !== '#') {
    window.open(url, '_blank', 'noopener');
  }
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function buildTags(tags) {
  if (!Array.isArray(tags) || !tags.length) return '';
  return tags.map(t => {
    if (t === 'new')         return `<span class="tag tag-new-pill">🟢 New</span>`;
    if (t === 'popular')     return `<span class="tag tag-pop-pill">
