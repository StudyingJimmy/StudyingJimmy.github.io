/* ============================================================
   Personal Homepage — Jimmy Yang
   Interactive Features
   ============================================================ */

// --- Theme Toggle --------------------------------------------
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function getStoredTheme() {
  return localStorage.getItem('theme') || 'dark';
}

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// Init theme
setTheme(getStoredTheme());

themeToggle.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  setTheme(next);
});

// --- Scroll Spy for Navigation Dots -------------------------
const sections = document.querySelectorAll('section[id]');
const navDots = document.querySelectorAll('.nav-dot');
const navContainer = document.getElementById('navDots');

function updateActiveDot() {
  const scrollPos = window.scrollY + window.innerHeight / 3;

  let currentId = '';
  sections.forEach(section => {
    const top = section.offsetTop;
    if (scrollPos >= top) {
      currentId = section.getAttribute('id');
    }
  });

  navDots.forEach(dot => {
    const isActive = dot.getAttribute('data-section') === currentId;
    dot.classList.toggle('active', isActive);
  });

  // Hide nav dots when at the very top (hero takes full view)
  if (window.scrollY < 100) {
    navContainer.style.opacity = '0';
    navContainer.style.pointerEvents = 'none';
  } else {
    navContainer.style.opacity = '1';
    navContainer.style.pointerEvents = 'auto';
  }
}

// Throttled scroll listener
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateActiveDot();
      ticking = false;
    });
    ticking = true;
  }
});

// --- Scroll Reveal Animations -------------------------------
const revealElements = document.querySelectorAll(
  '.about, .experience, .skills, .education, .projects, .contact'
);

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

revealElements.forEach(el => {
  el.classList.add('reveal');
  revealObserver.observe(el);
});

// --- CSS for nav dots transition (added via JS) -------------
navContainer.style.transition = 'opacity 0.3s ease';
// Init nav state
navContainer.style.opacity = '0';
navContainer.style.pointerEvents = 'none';

// --- Smooth scroll for nav dots -----------------------------
navDots.forEach(dot => {
  dot.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = dot.getAttribute('data-section');
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
