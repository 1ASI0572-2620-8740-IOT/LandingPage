// Mobile navigation toggle
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Abrir menú');
  });
});

// Scroll reveal animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      if (entry.target.classList.contains('hero-visual')) {
        animateCounters();
      }
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

// Counter animation for IoT dashboard
let countersAnimated = false;
function animateCounters() {
  if (countersAnimated) return;
  countersAnimated = true;
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

document.querySelectorAll('[data-video]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    if (modalTitle && trigger.dataset.video) {
      modalTitle.textContent = trigger.dataset.video;
    }
    modal?.showModal();
  });
});

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

form?.querySelectorAll('input, textarea').forEach((input) => {
  input.addEventListener('input', () => {
    if (message && message.textContent) {
      message.textContent = '';
    }
  });
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    message.textContent = 'Completa los campos requeridos para enviar tu mensaje.';
    form.reportValidity();
    return;
  }
  const formData = new FormData(form);
  const fullName = (formData.get('name') || '').toString().trim();
  const firstName = fullName.split(' ')[0] || 'amigo';
  message.textContent = `Gracias, ${firstName}. Recibimos tu mensaje y te contactaremos pronto.`;
  form.reset();
});
