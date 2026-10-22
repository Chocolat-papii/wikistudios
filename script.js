const header = document.querySelector('#site-header');
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
const themeToggle = document.querySelector('.theme-toggle');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function updateHeader() { header?.classList.toggle('scrolled', window.scrollY > 30); }
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

// Light/dark mode with a saved preference.
let savedTheme = null;
try { savedTheme = localStorage.getItem('wikihub-theme'); } catch {}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark';
  themeToggle?.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  themeToggle?.setAttribute('aria-pressed', String(dark));
  themeToggle?.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
  try { localStorage.setItem('wikihub-theme', theme); } catch {}
}
applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
themeToggle?.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

menuToggle?.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  document.body.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  mobileMenu.setAttribute('aria-hidden', String(!open));
});
mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mobileMenu.classList.remove('open');
  document.body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  mobileMenu?.setAttribute('aria-hidden', 'true');
}));

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealItems.forEach((el, index) => { el.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`; observer.observe(el); });
} else revealItems.forEach(el => el.classList.add('visible'));

// Selected Work galleries: the cover teases the next frame, but only user input advances it.
const galleries = [...document.querySelectorAll('.gallery-window')];
const galleryTimers = new Map();
const galleryState = new Map();

function getGalleryState(gallery) {
  if (!galleryState.has(gallery)) galleryState.set(gallery, { index: 0, pointerStartX: null, pointerStartY: null });
  return galleryState.get(gallery);
}

function renderGallery(gallery, index, animate = true) {
  const state = getGalleryState(gallery);
  const track = gallery.querySelector('.gallery-track');
  const images = [...(track?.querySelectorAll('img') || [])];
  if (!track || !images.length) return;
  state.index = Math.max(0, Math.min(index, images.length - 1));
  track.style.transition = animate ? '' : 'none';
  track.style.transform = `translateX(-${state.index * 100}%)`;
  const prev = gallery.querySelector('.gallery-prev');
  const next = gallery.querySelector('.gallery-next');
  if (prev) prev.disabled = state.index === 0;
  if (next) next.disabled = state.index === images.length - 1;
  const current = gallery.querySelector('.gallery-current');
  const total = gallery.querySelector('.gallery-total');
  if (current) current.textContent = String(state.index + 1).padStart(2, '0');
  if (total) total.textContent = String(images.length).padStart(2, '0');
  images.forEach((image, imageIndex) => image.setAttribute('aria-hidden', String(imageIndex !== state.index)));
}

function scheduleGalleryTease(gallery) {
  clearTimeout(galleryTimers.get(gallery));
  if (prefersReducedMotion || document.hidden || gallery.matches(':hover, :focus-within')) return;
  galleryTimers.set(gallery, setTimeout(() => teaseGallery(gallery), 3000 + Math.random() * 6500));
}

function teaseGallery(gallery) {
  if (prefersReducedMotion || document.hidden || gallery.matches(':hover, :focus-within')) {
    scheduleGalleryTease(gallery); return;
  }
  const state = getGalleryState(gallery);
  if (state.index !== 0) { scheduleGalleryTease(gallery); return; }
  gallery.classList.add('is-teasing');
  setTimeout(() => {
    gallery.classList.remove('is-teasing');
    scheduleGalleryTease(gallery);
  }, 700 + Math.random() * 300);
}

galleries.forEach(gallery => {
  const state = getGalleryState(gallery);
  const images = gallery.querySelectorAll('.gallery-track img');
  renderGallery(gallery, 0, false);

  gallery.querySelector('.gallery-prev')?.addEventListener('click', event => {
    event.stopPropagation(); gallery.classList.remove('is-teasing');
    renderGallery(gallery, state.index - 1); scheduleGalleryTease(gallery);
  });
  gallery.querySelector('.gallery-next')?.addEventListener('click', event => {
    event.stopPropagation(); gallery.classList.remove('is-teasing');
    renderGallery(gallery, state.index + 1); scheduleGalleryTease(gallery);
  });

  gallery.addEventListener('pointerdown', event => {
    if (event.target.closest('.gallery-control')) return;
    state.pointerStartX = event.clientX; state.pointerStartY = event.clientY;
  });
  gallery.addEventListener('pointerup', event => {
    if (state.pointerStartX === null || event.target.closest('.gallery-control')) return;
    const dx = event.clientX - state.pointerStartX;
    const dy = event.clientY - state.pointerStartY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      gallery.classList.remove('is-teasing');
      renderGallery(gallery, state.index + (dx < 0 ? 1 : -1));
      scheduleGalleryTease(gallery);
    }
    state.pointerStartX = state.pointerStartY = null;
  });
  gallery.addEventListener('pointercancel', () => { state.pointerStartX = state.pointerStartY = null; });
  gallery.addEventListener('mouseenter', () => {
    clearTimeout(galleryTimers.get(gallery)); gallery.classList.remove('is-teasing');
  });
  gallery.addEventListener('mouseleave', () => scheduleGalleryTease(gallery));
  gallery.addEventListener('focusin', () => clearTimeout(galleryTimers.get(gallery)));
  gallery.addEventListener('focusout', () => scheduleGalleryTease(gallery));

  gallery.setAttribute('tabindex', '0');
  gallery.setAttribute('aria-label', `Image gallery with ${images.length} frames`);
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); renderGallery(gallery, state.index + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); renderGallery(gallery, state.index - 1); }
  });
  scheduleGalleryTease(gallery);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    galleries.forEach(gallery => { clearTimeout(galleryTimers.get(gallery)); gallery.classList.remove('is-teasing'); });
  } else galleries.forEach(scheduleGalleryTease);
});

// Subtle scroll parallax for image-led sections.
const parallaxItems = [
  { el: document.querySelector('.film-media img'), strength: .11 },
  { el: document.querySelector('.aerial-image img'), strength: .075 },
  { el: document.querySelector('.hero-rails'), strength: .035 }
];
function updateParallax() {
  if (prefersReducedMotion) return;
  const vh = window.innerHeight || 800;
  parallaxItems.forEach(({el, strength}) => {
    if (!el) return;
    const rect = el.parentElement.getBoundingClientRect();
    if (rect.bottom < -100 || rect.top > vh + 100) return;
    const y = (rect.top + rect.height / 2 - vh / 2) * -strength;
    el.style.setProperty('--parallax-y', `${y.toFixed(1)}px`);
  });
}
let queued = false;
window.addEventListener('scroll', () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { updateParallax(); queued = false; });
}, { passive: true });
window.addEventListener('resize', updateParallax);
updateParallax();

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
