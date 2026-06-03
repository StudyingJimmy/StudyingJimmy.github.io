/* ============================================================
   Jimmy Yang · Personal Hub
   Theme toggle + shared utilities
   ============================================================ */

const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

// --- Theme --------------------------------------------------
function getTheme() {
  return localStorage.getItem('theme') || 'dark';
}

function setTheme(t) {
  html.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
}

setTheme(getTheme());

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
}
