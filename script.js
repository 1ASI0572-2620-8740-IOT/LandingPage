// Mobile navigation toggle
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');
const t = (key) => window.HydroGuardI18n?.t(key) || key;
function closeMenu() {
  navigation?.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', t('Open menu'));
}

menuToggle?.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', t(isOpen ? 'Close menu' : 'Open menu'));
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    closeMenu();
  });
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && navigation?.classList.contains('open')) {
    closeMenu();
    menuToggle?.focus();
  }
});
// Do not leave a hidden navigation link focused when the menu is collapsed.
navigation?.addEventListener('focusout', (event) => {
  if (!navigation.contains(event.relatedTarget) && event.relatedTarget !== menuToggle) closeMenu();
});

// Scroll reveal animations
const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      if (entry.target.classList.contains('hero-visual')) {
        animateCounters();
      }
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 }) : null;

document.querySelectorAll('.reveal').forEach((element) => {
  observer?.observe(element);
  element.classList.add('reveal-ready');
  if (!observer) element.classList.add('is-visible');
});

// Counter animation for IoT dashboard
let countersAnimated = false;
function animateCounters() {
  if (countersAnimated) return;
  countersAnimated = true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const counters = document.querySelectorAll('[data-counter]');
  counters.forEach((el) => {
    const target = parseFloat(el.getAttribute('data-counter'));
    if (isNaN(target)) return;
    const isDecimal = target % 1 !== 0;
    const duration = 1200;
    const startTime = performance.now();

    function update(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = ease * target;
      el.textContent = isDecimal ? current.toFixed(1) : Math.round(current);
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = isDecimal ? target.toFixed(1) : String(target);
      }
    }
    requestAnimationFrame(update);
  });
}

// Fallback in case hero-visual was already in view or observer triggered before script
setTimeout(() => {
  const heroVisual = document.querySelector('.hero-visual');
  if (heroVisual && heroVisual.classList.contains('is-visible')) {
    animateCounters();
  }
}, 300);

// Video Modal handling
const modal = document.querySelector('#video-modal');
const modalTitle = document.querySelector('#modal-title');
const modalClose = document.querySelector('.modal-close');
let videoTrigger;
let videoTitleKey;

document.querySelectorAll('[data-video]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    videoTrigger = trigger;
    videoTitleKey = trigger.classList.contains('team-video-link') ? 'The HydroLink team' : 'HydroGuard product';
    if (modalTitle && trigger.dataset.video) {
      modalTitle.textContent = t(videoTitleKey);
    }
    modal?.showModal();
  });
});
modal?.addEventListener('close', () => videoTrigger?.focus());

modalClose?.addEventListener('click', () => {
  modal?.close();
});

modal?.addEventListener('click', (event) => {
  if (event.target === modal) {
    modal.close();
  }
});

const evidenceViewer = document.querySelector('#evidence-viewer');
if (typeof evidenceViewer?.showModal === 'function') {
  const image = evidenceViewer.querySelector('img');
  const caption = evidenceViewer.querySelector('figcaption');
  const title = evidenceViewer.querySelector('.evidence-viewer-title');
  const position = evidenceViewer.querySelector('.evidence-position');
  let photos = [];
  let currentPhoto = 0;
  let openingPhoto;

  function showEvidencePhoto(index) {
    currentPhoto = (index + photos.length) % photos.length;
    const photo = photos[currentPhoto];
    image.src = photo.href;
    caption.textContent = photo.querySelector('span').textContent;
    title.textContent = photo.closest('.evidence-album').querySelector('h3').textContent;
    position.textContent = `${currentPhoto + 1} / ${photos.length}`;
  }

  document.querySelectorAll('.evidence-album').forEach((album) => {
    const albumPhotos = [...album.querySelectorAll('[data-evidence-photo]')];
    albumPhotos.forEach((photo, index) => {
      photo.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openingPhoto = photo;
        photos = albumPhotos;
        showEvidencePhoto(index);
        evidenceViewer.showModal();
      });
    });
  });

  evidenceViewer.querySelectorAll('[data-evidence-step]').forEach((button) => {
    button.addEventListener('click', () => {
      showEvidencePhoto(currentPhoto + Number(button.dataset.evidenceStep));
    });
  });
  evidenceViewer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    showEvidencePhoto(currentPhoto + (event.key === 'ArrowRight' ? 1 : -1));
  });
  evidenceViewer.addEventListener('close', () => openingPhoto?.focus());
  evidenceViewer.addEventListener('click', (event) => {
    if (event.target !== evidenceViewer) return;
    const bounds = evidenceViewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) {
      evidenceViewer.close();
    }
  });
  document.addEventListener('languagechange', () => {
    if (evidenceViewer.open) showEvidencePhoto(currentPhoto);
  });
}

// Dynamic year
const yearEl = document.querySelector('#year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Contact form handling. Configure only the public Formspree endpoint in index.html.
const form = document.querySelector('#contact-form');
const message = document.querySelector('.form-message');
const submitLabel = document.querySelector('#contact-submit-label');
const submitButton = form?.querySelector('button[type="submit"]');
const fields = form ? [...form.querySelectorAll('[name="name"], [name="email"], [name="message"]')] : [];
let formMessageKey = '';
let sending = false;
function renderContact() {
  if (message) message.textContent = formMessageKey ? t(formMessageKey) : '';
  fields.forEach((input) => { if (input.validity.customError) input.setCustomValidity(t('This field is required.')); });
  if (submitLabel) submitLabel.textContent = t(sending ? 'Sending…' : 'Send message');
}
function contactStatus(key, state) {
  formMessageKey = key;
  if (message) message.dataset.state = state;
  renderContact();
}
function configuredEndpoint() {
  const endpoint = form?.dataset.formspreeEndpoint || '';
  // Reject placeholders and arbitrary destinations; this is a public form ID, not a secret.
  return /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint) ? endpoint : '';
}
document.addEventListener('languagechange', () => {
  menuToggle?.setAttribute('aria-label', t(navigation?.classList.contains('open') ? 'Close menu' : 'Open menu'));
  if (modal?.open && modalTitle && videoTitleKey) modalTitle.textContent = t(videoTitleKey);
  renderContact();
});
fields.forEach((input) => {
  input.addEventListener('input', () => {
    input.setCustomValidity('');
    input.removeAttribute('aria-invalid');
    if (!sending) contactStatus('', 'idle');
  });
});
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (sending) return;
  fields.forEach((input) => {
    input.setCustomValidity(input.value.trim() ? '' : t('This field is required.'));
    input.setAttribute('aria-invalid', String(!input.validity.valid));
  });
  if (!form.checkValidity()) {
    contactStatus('Check the required fields and enter a valid email address.', 'error');
    fields.find((input) => !input.validity.valid)?.focus();
    form.reportValidity();
    return;
  }
  const endpoint = configuredEndpoint();
  if (!endpoint) {
    contactStatus('Contact submission is currently unavailable. Please try again later.', 'error');
    return;
  }
  const payload = Object.fromEntries(fields.map((input) => [input.name, input.value.trim()]));
  sending = true;
  submitButton.disabled = true;
  fields.forEach((input) => { input.readOnly = true; });
  submitButton.setAttribute('aria-busy', 'true');
  contactStatus('Sending your request…', 'sending');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'omit'
    });
    if (!response.ok) {
      if (response.status === 429) contactStatus('The submission limit was reached. Please try again later.', 'error');
      else if (response.status === 400 || response.status === 422) contactStatus('The service rejected the request. Check your details and try again.', 'error');
      else contactStatus('The service could not accept your request. Please try again later.', 'error');
      return;
    }
    const result = await response.json();
    // A successful HTTP status alone must not turn an arbitrary JSON body into success.
    // Support affirmative boolean markers, including providers that omit `ok`.
    const isObject = result !== null && typeof result === 'object' && !Array.isArray(result);
    const knownFields = isObject && Object.keys(result).every((key) => ['ok', 'success', 'next'].includes(key));
    const affirmative = isObject && (result.ok === true || result.success === true);
    const validFlags = isObject && ['ok', 'success'].every((key) => !(key in result) || result[key] === true);
    const validNext = isObject && (!('next' in result) ||
      (typeof result.next === 'string' && /^(\/(?!\/)|https:\/\/formspree\.io\/)/.test(result.next)));
    if (!knownFields || !affirmative || !validFlags || !validNext) {
      contactStatus('The service did not confirm acceptance. Your details have been kept.', 'error');
      return;
    }
    form.reset();
    fields.forEach((input) => { input.setCustomValidity(''); input.removeAttribute('aria-invalid'); });
    contactStatus('The service received your request. Thank you!', 'success');
  } catch {
    // A lost response does not prove rejection. Never retry automatically.
    contactStatus('We could not confirm receipt. Your details have been kept; retrying may send a duplicate.', 'error');
  } finally {
    clearTimeout(timeout);
    sending = false;
    submitButton.disabled = false;
    fields.forEach((input) => { input.readOnly = false; });
    submitButton.removeAttribute('aria-busy');
    renderContact();
  }
});
renderContact();
// Enable native submit controls only after the handler and initial state are ready.
if (submitButton) submitButton.disabled = false;
