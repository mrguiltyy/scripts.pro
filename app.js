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
function buildPartners(
