/* ═══════════════════════════════════════════════════════════
   ADFORM.JS — ZenScripts Ad Form
═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Navbar scroll ── */
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  });

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
    { inputId: 'adTitle', countId: 'count-adTitle', max: 80 },
    { inputId: 'adDesc',  countId: 'count-adDesc',  max: 300 },
    { inputId: 'adCta',   countId: 'count-adCta',   max: 30 },
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
      const startDate = document.getElementById('startDate');
      const endDate   = document.getElementById('endDate');
      if (!startDate || !endDate) return;

      const today = new Date();
      const end   = new Date();
      end.setDate(today.getDate() + days);

      startDate.value = formatDate(today);
      endDate.value   = formatDate(end);

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

  /* ── Set min date for date inputs ── */
  const today = formatDate(new Date());
  const startInput = document.getElementById('startDate');
  const endInput   = document.getElementById('endDate');
  if (startInput) startInput.min = today;
  if (endInput)   endInput.min   = today;

  if (startInput) {
    startInput.addEventListener('change', () => {
      if (endInput) endInput.min = startInput.value;
    });
  }

  /* ── Form validation ── */
  const form = document.getElementById('ad-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateForm()) {
      submitForm();
    }
  });

  /* ── Clear error on input ── */
  const allInputs = form.querySelectorAll('input, textarea, select');
  allInputs.forEach(input => {
    input.addEventListener('input', () => {
      clearError(input.id);
      input.classList.remove('invalid');
    });
    input.addEventListener('change', () => {
      clearError(input.id);
      input.classList.remove('invalid');
    });
  });

  function validateForm() {
    let valid = true;

    /* Required text/email/url fields */
    const required = [
      { id: 'firstName',  label: 'First name is required.' },
      { id: 'lastName',   label: 'Last name is required.' },
      { id: 'email',      label: 'Email address is required.' },
      { id: 'company',    label: 'Company or brand name is required.' },
      { id: 'adUrl',      label: 'Destination URL is required.' },
      { id: 'adTitle',    label: 'Ad headline is required.' },
      { id: 'adDesc',     label: 'Ad description is required.' },
      { id: 'startDate',  label: 'Start date is required.' },
      { id: 'endDate',    label: 'End date is required.' },
    ];

    required.forEach(({ id, label }) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!el.value.trim()) {
        showError(id, label);
        el.classList.add('invalid');
        valid = false;
      }
    });

    /* Email format */
    const emailEl = document.getElementById('email');
    if (emailEl && emailEl.value.trim()) {
      const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailReg.test(emailEl.value.trim())) {
        showError('email', 'Please enter a valid email address.');
        emailEl.classList.add('invalid');
        valid = false;
      }
    }

    /* URL format */
    const urlEl = document.getElementById('adUrl');
    if (urlEl && urlEl.value.trim()) {
      try {
        new URL(urlEl.value.trim());
      } catch {
        showError('adUrl', 'Please enter a valid URL including https://');
        urlEl.classList.add('invalid');
        valid = false;
      }
    }

    /* Placement radio */
    const placementChosen = form.querySelector('input[name="placement"]:checked');
    if (!placementChosen) {
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

  /* ── Submit form ── */
  function submitForm() {
    const btn = document.getElementById('submit-btn');
    if (btn) {
      btn.textContent = 'Submitting...';
      btn.disabled = true;
    }

    /* Simulate submission — replace with real fetch/API call */
    setTimeout(() => {
      showSuccess();
    }, 1200);
  }

  function showSuccess() {
    const formEl    = document.getElementById('ad-form');
    const successEl = document.getElementById('form-success');
    const detailsEl = document.getElementById('success-details');

    if (formEl)    formEl.classList.add('hidden');
    if (successEl) {
      successEl.classList.remove('hidden');
      successEl.classList.add('visible');
    }

    /* Show summary of what was submitted */
    if (detailsEl) {
      const placement = document.querySelector('input[name="placement"]:checked')?.value || 'N/A';
      const placementLabels = {
        hero:    'Hero Banner',
        mid:     'Mid-Content Banner',
        sidebar: 'Sidebar Box',
        footer:  'Pre-Footer Banner',
      };

      const rows = [
        { label: 'Name',      value: `${document.getElementById('firstName')?.value} ${document.getElementById('lastName')?.value}` },
        { label: 'Email',     value: document.getElementById('email')?.value },
        { label: 'Company',   value: document.getElementById('company')?.value },
        { label: 'Placement', value: placementLabels[placement] || placement },
        { label: 'Start',     value: document.getElementById('startDate')?.value },
        { label: 'End',       value: document.getElementById('endDate')?.value },
        { label: 'Budget',    value: document.getElementById('budget')?.value || 'Not specified' },
      ];

      detailsEl.innerHTML = rows.map(r => `
        <div class="sdet-row">
          <span>${r.label}</span>
          <span>${r.value || 'N/
