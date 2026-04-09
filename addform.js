/* ═══════════════════════════════════════════════════════════
   ADFORM.JS — ZenScripts
═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Navbar scroll ── */
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  /* ── Hamburger ── */
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
    });
  }

  /* ── Character counters ── */
  const counters = [
    { inputId: 'adTitle', countId: 'count-adTitle', max: 80  },
    { inputId: 'adDesc',  countId: 'count-adDesc',  max: 300 },
    { inputId: 'adCta',   countId: 'count-adCta',   max: 30  },
    { inputId: 'notes',   countId: 'count-notes',   max: 500 },
  ];
  counters.forEach(({ inputId, countId, max }) => {
    const input   = document.getElementById(inputId);
    const counter = document.getElementById(countId);
    if (!input || !counter) return;
    const update = () => {
      const len = input.value.length;
      counter.textContent = `${len} / ${max}`;
      counter.style.color = len >= max * 0.9 ? '#ef4444' : '';
    };
    input.addEventListener('input', update);
    update();
  });

  /* ── Duration pills ── */
  const pills = document.querySelectorAll('.dur-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const days      = parseInt(pill.dataset.days);
      const startEl   = document.getElementById('startDate');
      const endEl     = document.getElementById('endDate');
      if (!startEl || !endEl) return;
      const today = new Date();
      const end   = new Date();
      end.setDate(today.getDate() + days);
      startEl.value = formatDate(today);
      endEl.value   = formatDate(end);
      clearError('startDate');
      clearError('endDate');
    });
  });

  function formatDate(d) {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  /* ── Min dates ── */
  const today      = formatDate(new Date());
  const startInput = document.getElementById('startDate');
  const endInput   = document.getElementById('endDate');
  if (startInput) startInput.min = today;
  if (endInput)   endInput.min   = today;
  if (startInput) {
    startInput.addEventListener('change', () => {
      if (endInput) endInput.min = startInput.value;
    });
  }

  /* ── Clear errors on input ── */
  const form = document.getElementById('ad-form');
  if (!form) return;

  form.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input',  () => { clearError(el.id); el.classList.remove('invalid'); });
    el.addEventListener('change', () => { clearError(el.id); el.classList.remove('invalid'); });
  });

  /* ── Form submit ── */
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (validateForm()) submitForm();
  });

  /* ── Validation ── */
  function validateForm() {
    let valid = true;

    const required = [
      { id: 'firstName', msg: 'First name is required.' },
      { id: 'lastName',  msg: 'Last name is required.' },
      { id: 'email',     msg: 'Email address is required.' },
      { id: 'company',   msg: 'Company or brand name is required.' },
      { id: 'adUrl',     msg: 'Destination URL is required.' },
      { id: 'adTitle',   msg: 'Ad headline is required.' },
      { id: 'adDesc',    msg: 'Ad description is required.' },
      { id: 'startDate', msg: 'Start date is required.' },
      { id: 'endDate',   msg: 'End date is required.' },
    ];

    required.forEach(({ id, msg }) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!el.value.trim()) {
        showError(id, msg);
        el.classList.add('invalid');
        valid = false;
      }
    });

    /* Email format */
    const emailEl = document.getElementById('email');
    if (emailEl && emailEl.value.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
        showError('email', 'Please enter a valid email address.');
        emailEl.classList.add('invalid');
        valid = false;
      }
    }

    /* URL format */
    const urlEl = document.getElementById('adUrl');
    if (urlEl && urlEl.value.trim()) {
      try { new URL(urlEl.value.trim()); }
      catch {
        showError('adUrl', 'Please enter a valid URL including https://');
        urlEl.classList.add('invalid');
        valid = false;
      }
    }

    /* Placement */
    if (!form.querySelector('input[name="placement"]:checked')) {
      showError('placement', 'Please select an ad placement.');
      valid = false;
    }

    /* Date logic */
    const startVal = document.getElementById('startDate')?.value;
    const endVal   = document.getElementById('endDate')?.value;
    if (startVal && endVal && endVal <= startVal) {
      showError('endDate', 'End date must be after start date.');
      document.getElementById('endDate').classList.add('invalid');
      valid = false;
    }

    /* Checkboxes */
    const agreeTerms = document.getElementById('agreeTerms');
    if (agreeTerms && !agreeTerms.checked) {
      showError('agreeTerms', 'You must agree to the advertising guidelines.');
      valid = false;
    }

    const agreeContact = document.getElementById('agreeContact');
    if (agreeContact && !agreeContact.checked) {
      showError('agreeContact', 'You must agree to be contacted.');
      valid = false;
    }

    return valid;
  }

  function showError(id, msg) {
    const el = document.getElementById('err-' + id);
    if (el) el.textContent = msg;
  }

  function clearError(id) {
    const el = document.getElementById('err-' + id);
    if (el) el.textContent = '';
  }

  /* ── Submit ── */
  function submitForm() {
    const btn = document.getElementById('submit-btn');
    if (btn) { btn.textContent = 'Submitting...'; btn.disabled = true; }
    setTimeout(() => showSuccess(), 1200);
  }

  /* ── Success screen ── */
  function showSuccess() {
    const formEl    = document.getElementById('ad-form');
    const successEl = document.getElementById('form-success');
    const detailsEl = document.getElementById('success-details');

    if (formEl)    formEl.classList.add('hidden');
    if (successEl) successEl.classList.remove('hidden');

    if (detailsEl) {
      const placement = form.querySelector('input[name="placement"]:checked')?.value || 'N/A';
      const labels    = { hero: 'Hero Banner', mid: 'Mid-Content Banner', sidebar: 'Sidebar Box', footer: 'Pre-Footer Banner' };
      const rows = [
        { label: 'Name',      value: `${document.getElementById('firstName')?.value || ''} ${document.getElementById('lastName')?.value || ''}`.trim() },
        { label: 'Email',     value: document.getElementById('email')?.value     || '' },
        { label: 'Company',   value: document.getElementById('company')?.value   || '' },
        { label: 'Placement', value: labels[placement] || placement },
        { label: 'Start',     value: document.getElementById('startDate')?.value || '' },
        { label: 'End',       value: document.getElementById('endDate')?.value   || '' },
        { label: 'Budget',    value: document.getElementById('budget')?.value    || 'Not specified' },
      ];
      detailsEl.innerHTML = rows.map(r => `
        <div class="sdet-row">
          <span>${r.label}</span>
          <span>${r.value || 'N/A'}</span>
        </div>
      `).join('');
    }
  }

  /* ── Submit another ── */
  const submitAnother = document.getElementById('submit-another');
  if (submitAnother) {
    submitAnother.addEventListener('click', () => {
      const formEl    = document.getElementById('ad-form');
      const successEl = document.getElementById('form-success');
      const btn       = document.getElementById('submit-btn');

      if (formEl)    { formEl.reset(); formEl.classList.remove('hidden'); }
      if (successEl) successEl.classList.add('hidden');
      if (btn)       { btn.textContent = 'Submit Ad Order →'; btn.disabled = false; }

      counters.forEach(({ countId, max }) => {
        const el = document.getElementById(countId);
        if (el) el.textContent = `0 / ${max}`;
      });

      document.querySelectorAll('.dur-pill').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.ferr').forEach(el => el.textContent = '');
      document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

      const formCard = document.querySelector('.form-card');
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

});
