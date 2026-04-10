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
          <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#6b6b8a;">
            <div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div>
            <h3 style="color:#f0f0ff;margin-bottom:8px;">Failed to load scripts</h3>
            <p>Make sure data.json is in the same folder as index.html</p>
            <p style="margin-top:8px;font-size:0.8rem;opacity:0.6;">${err.message}</p>
          </div>
        `;
      }
    });

  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
});

/* ── Partners ── */
function buildPartners(partners) {
  const grid = document.getElementById('partners-grid');
  if (!grid || !partners.length) return;
  grid.innerHTML = partners.map(p => `
    <a class="partner-card" href="${safe(p.url)}" target="_blank" rel="noopener">
      <div class="partner-top">
        <div class="partner-logo-wrap">
          <img class="partner-logo" src="${safe(p.logo)}" alt="${safe(p.name)}" onerror="this.style.display='none'" />
          <div>
            <div class="partner-name">${safe(p.name)}</div>
            <div class="partner-tagline">${safe(p.tagline)}</div>
          </div>
        </div>
        <div class="partner-badge" style="color:${safe(p.badgeColor)};border-color:${safe(p.badgeColor)};background:${safe(p.badgeColor)}18;">
          ${safe(p.badge)}
        </div>
      </div>
      <div class="partner-desc">${safe(p.description)}</div>
      <div class="partner-platforms">
        ${(p.platforms || []).map(pl => `<span class="partner-platform">${safe(pl)}</span>`).join('')}
      </div>
      <div class="partner-footer">
        <span class="partner-highlight">${safe(p.highlight)}</span>
        <span class="partner-visit">Visit ${safe(p.name)} →</span>
      </div>
    </a>
  `).join('');
}

/* ── Banners ── */
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
    slot.innerHTML = b.position === 'sidebar' ? boxBanner(b) : wideBanner(b);
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

/* ── Categories ── */
function buildCategories(categories) {
  const tabs = document.getElementById('cat-tabs');
  if (!tabs) return;
  tabs.innerHTML = categories.map(c => `
    <button class="cat-tab ${c.id === 'all' ? 'active' : ''}" data-cat="${safe(c.id)}">
      <span>${safe(c.icon)}</span>
      <span>${safe(c.name)}</span>
    </button>
  `).join('');
}

/* ── Apply Filters ── */
function applyFilters() {
  let results = [...allScripts];

  if (activeCategory !== 'all') {
    results = results.filter(s => s.category === activeCategory);
  }
  if (activeTag !== 'all') {
    results = results.filter(s => Array.isArray(s.tags) && s.tags.includes(activeTag));
  }

  const q = searchQuery.trim().toLowerCase();
  if (q !== '') {
    results = results.filter(s =>
      (s.name        || '').toLowerCase().includes(q) ||
      (s.game        || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.features    || []).some(f => f.toLowerCase().includes(q))
    );
  }

  if (sortMode === 'popular') {
    results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  } else if (sortMode === 'newest') {
    results.sort((a, b) => allScripts.indexOf(b) - allScripts.indexOf(a));
  } else if (sortMode === 'az') {
    results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  filtered = results;
  page     = 1;
  renderScripts(false);
}

/* ── Render Scripts ── */
function renderScripts(append) {
  const grid     = document.getElementById('scripts-grid');
  const noRes    = document.getElementById('no-results');
  const loadWrap = document.getElementById('load-more-wrap');
  const countEl  = document.getElementById('result-count');

  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noRes)    noRes.classList.remove('hidden');
    if (loadWrap) loadWrap.classList.add('hidden');
    if (countEl)  countEl.textContent = '0 scripts found';
    return;
  }

  if (noRes) noRes.classList.add('hidden');

  const start = append ? (page - 1) * PAGE_SIZE : 0;
  const end   = page * PAGE_SIZE;
  const slice = filtered.slice(start, end);

  const fragment = document.createDocumentFragment();
  slice.forEach(s => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = scriptCard(s);
    const card = wrapper.firstElementChild;

    card.addEventListener('click', e => {
      if (e.target.closest('.script-dl-btn')) return;
      openModal(s);
    });

    const dlBtn = card.querySelector('.script-dl-btn');
    if (dlBtn) {
      dlBtn.addEventListener('click', e => {
        e.stopPropagation();
        handleDownload(s.downloadUrl);
      });
    }
    fragment.appendChild(card);
  });

  if (append) {
    grid.appendChild(fragment);
  } else {
    grid.innerHTML = '';
    grid.appendChild(fragment);
  }

  if (countEl) {
    countEl.textContent = `${filtered.length} script${filtered.length !== 1 ? 's' : ''} found`;
  }
  if (loadWrap) {
    if (end < filtered.length) {
      loadWrap.classList.remove('hidden');
    } else {
      loadWrap.classList.add('hidden');
    }
  }
}

/* ── Script Card ── */
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
        ${s.version ? `<span class="script-version">${safe(s.version)}</span>` : ''}
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

/* ── Modal ── */
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
    ${s.version ? `<div class="modal-version">Version: ${safe(s.version)}</div>` : ''}
    ${tags      ? `<div class="modal-tags">${tags}</div>` : ''}
    <div class="modal-desc">${safe(s.description)}</div>
    ${features  ? `<div class="modal-section-title">Features</div><div class="modal-features">${features}</div>` : ''}
    ${executors ? `<div class="modal-section-title">Compatible With</div><div class="modal-executors">${executors}</div>` : ''}
    <div class="modal-downloads">⬇️ ${formatNum(s.downloads || 0)} downloads</div>
    <a class="modal-dl-btn ${!hasLink ? 'modal-dl-disabled' : ''}"
      href="${hasLink ? safe(s.downloadUrl) : 'javascript:void(0)'}"
      ${hasLink ? 'target="_blank" rel="noopener"' : ''}>
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

/* ── Helpers ── */
function buildTags(tags) {
  if (!Array.isArray(tags) || !tags.length) return '';
  return tags.map(t => {
    if (t === 'new')         return '<span class="tag tag-new-pill">🟢 New</span>';
    if (t === 'popular')     return '<span class="tag tag-pop-pill">🔥 Popular</span>';
    if (t === 'recommended') return '<span class="tag tag-rec-pill">⭐ Recommended</span>';
    return '';
  }).join('');
}

function buildFeaturePills(features, limit) {
  if (!Array.isArray(features) || !features.length) return '';
  const list = limit ? features.slice(0, limit) : features;
  return list.map(f => '<span class="feature-pill">' + safe(f) + '</span>').join('');
}

function buildExecutorPills(executors) {
  if (!Array.isArray(executors) || !executors.length) return '';
  return executors.map(e => '<span class="modal-executor">' + safe(e) + '</span>').join('');
}

function safe(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNum(n) {
  if (!n || isNaN(n)) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

/* ── Bind Events ── */
function bindEvents() {

  /* Hamburger */
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
      });
    });
  }

  /* Search */
  const searchInput = document.getElementById('search');
  const clearBtn    = document.getElementById('search-clear');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchQuery = searchInput.value;
      if (clearBtn) {
        clearBtn.style.display = searchQuery ? 'block' : 'none';
      }
      searchTimeout = setTimeout(() => applyFilters(), 250);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchQuery = '';
        if (clearBtn) clearBtn.style.display = 'none';
        clearTimeout(searchTimeout);
        applyFilters();
      }
    });
  }

  if (clearBtn) {
    clearBtn.style.display = 'none';
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      clearBtn.style.display = 'none';
      clearTimeout(searchTimeout);
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
  const catTabs = document.getElementById('cat-tabs');
  if (catTabs) {
    catTabs.addEventListener('click', e => {
      const tab = e.target.closest('.cat-tab');
      if (!tab) return;
      document.querySelectorAll('.cat-tab').forEach(t =>
        t.classList.remove('active')
      );
      tab.classList.add('active');
      activeCategory = tab.dataset.cat;
      applyFilters();
    });
  }

  /* Tag filters */
  const tagRow = document.querySelector('.tag-row');
  if (tagRow) {
    tagRow.addEventListener('click', e => {
      const btn = e.target.closest('.tag-btn');
      if (!btn) return;
      document.querySelectorAll('.tag-btn').forEach(b =>
        b.classList.remove('active')
      );
      btn.classList.add('active');
      activeTag = btn.dataset.tag;
      applyFilters();
    });
  }

  /* Load more */
  const loadMoreBtn = document.getElementById('load-more');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      page++;
      renderScripts(true);
    });
  }

  /* Clear all filters */
  const clearAll = document.getElementById('clear-all');
  if (clearAll) {
    clearAll.addEventListener('click', resetFilters);
  }

  /* Modal close */
  const modalClose = document.getElementById('modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  /* Modal overlay click */
  const modalOverlay = document.getElementById('modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  /* Keyboard shortcuts */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const si = document.getElementById('search');
      if (si) si.focus();
    }
  });
}

/* ── Reset Filters ── */
function resetFilters() {
  searchQuery    = '';
  activeCategory = 'all';
  activeTag      = 'all';
  sortMode       = 'popular';

  const searchInput = document.getElementById('search');
  if (searchInput) searchInput.value = '';

  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.style.display = 'none';

  const sortEl = document.getElementById('sort');
  if (sortEl) sortEl.value = 'popular';

  document.querySelectorAll('.cat-tab').forEach(t =>
    t.classList.remove('active')
  );
  const allTab = document.querySelector('.cat-tab[data-cat="all"]');
  if (allTab) allTab.classList.add('active');

  document.querySelectorAll('.tag-btn').forEach(b =>
    b.classList.remove('active')
  );
  const allTag = document.querySelector('.tag-btn[data-tag="all"]');
  if (allTag) allTag.classList.add('active');

  clearTimeout(searchTimeout);
  applyFilters();
}
