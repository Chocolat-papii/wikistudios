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

// Independent random slide teasers for each Selected Work gallery.
const galleries = [...document.querySelectorAll('.gallery-window')];
const timers = new Map();
function scheduleGallery(gallery) {
  clearTimeout(timers.get(gallery));
  if (prefersReducedMotion) return;
  timers.set(gallery, setTimeout(() => teaseGallery(gallery), 2800 + Math.random() * 7200));
}
function teaseGallery(gallery) {
  if (document.hidden || gallery.matches(':hover, :focus-within')) return scheduleGallery(gallery);
  const track = gallery.querySelector('.gallery-track');
  if (!track) return;
  const images = track.querySelectorAll('img');
  const direction = Math.random() < .5 ? -1 : 1;
  const shift = direction < 0 ? -33.333 : 0;
  track.style.transform = `translateX(${shift}%)`;
  gallery.classList.add('is-teasing');
  setTimeout(() => {
    track.style.transform = 'translateX(0)';
    gallery.classList.remove('is-teasing');
    scheduleGallery(gallery);
  }, 700 + Math.random() * 650);
}
galleries.forEach(gallery => {
  scheduleGallery(gallery);
  gallery.addEventListener('mouseenter', () => { clearTimeout(timers.get(gallery)); gallery.querySelector('.gallery-track').style.transform = 'translateX(0)'; });
  gallery.addEventListener('mouseleave', () => scheduleGallery(gallery));
  gallery.addEventListener('focusin', () => clearTimeout(timers.get(gallery)));
  gallery.addEventListener('focusout', () => scheduleGallery(gallery));
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) galleries.forEach(scheduleGallery); });

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
