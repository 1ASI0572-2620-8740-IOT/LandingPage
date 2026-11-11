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

// Dynamic year
const yearEl = document.querySelector('#year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// Contact form handling
const form = document.querySelector('#contact-form');
const message = document.querySelector('.form-message');
let formMessageKey = '';
document.addEventListener('languagechange', () => {
  menuToggle?.setAttribute('aria-label', t(navigation?.classList.contains('open') ? 'Close menu' : 'Open menu'));
  if (modal?.open && modalTitle && videoTitleKey) modalTitle.textContent = t(videoTitleKey);
  if (message) message.textContent = formMessageKey ? t(formMessageKey) : '';
});

form?.querySelectorAll('input, textarea').forEach((input) => {
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    if (message && message.textContent) {
      message.textContent = '';
      formMessageKey = '';
    }
  });
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  form.querySelectorAll('input, textarea').forEach((input) => input.setAttribute('aria-invalid', String(!input.validity.valid)));
  if (!form.checkValidity()) {
    formMessageKey = 'Complete the required fields to send your message.';
    message.textContent = t(formMessageKey);
    form.reportValidity();
    return;
  }
  formMessageKey = 'This form does not send messages yet; write to hola@hydroguard.pe.';
  message.textContent = t(formMessageKey);
});
