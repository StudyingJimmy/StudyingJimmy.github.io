/* ============================================================
   Jimmy Yang · Cosmic Homepage
   Meteor → Shatter → Typewriter → Nebula Formation
   ============================================================ */

// --- Canvas Setup -------------------------------------------
const canvas = document.getElementById('cosmicCanvas');
const ctx = canvas.getContext('2d');

let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => {
  resize();
  repositionNebulae();
});

// --- Theme --------------------------------------------------
const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

function getTheme() { return localStorage.getItem('theme') || 'dark'; }
function setTheme(t) { html.setAttribute('data-theme', t); localStorage.setItem('theme', t); }
setTheme(getTheme());

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
}

// --- Animation Phases ---------------------------------------
const Phase = { STARS: 0, METEOR: 1, SHATTER: 2, TYPEWRITER: 3, GATHER: 4, NEBULA: 5, IDLE: 6 };
let phase = Phase.STARS;
let phaseStart = 0;
let animTime = 0;

// --- Utility ------------------------------------------------
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function dist(a, b) { const dx = a.x - b.x; const dy = a.y - b.y; return Math.sqrt(dx*dx + dy*dy); }
function lerp(a, b, t) { return a + (b - a) * t; }
function hsl(h, s, l, a) { return a != null ? `hsla(${h},${s}%,${l}%,${a})` : `hsl(${h},${s}%,${l}%)`; }

// --- Particle -----------------------------------------------
class Particle {
  constructor(x, y, vx, vy, life, color, size) {
    this.x = x; this.y = y;
    this.vx = vx || 0; this.vy = vy || 0;
    this.life = life; this.maxLife = life;
    this.color = color;
    this.size = size || rand(1.5, 3.5);
    this.alive = true;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }
  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Star ---------------------------------------------------
class Star {
  constructor() {
    this.x = rand(0, W);
    this.y = rand(0, H);
    this.baseAlpha = rand(0.4, 1.0);
    this.phase = rand(0, Math.PI * 2);
    this.speed = rand(0.3, 1.5);
    this.size = rand(0.8, 2.5);
  }
  draw(ctx, t) {
    const alpha = this.baseAlpha + Math.sin(t * this.speed + this.phase) * 0.2;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Meteor ------------------------------------------------
class Meteor {
  constructor() {
    this.x = W + 120;
    this.y = -120;
    const angle = Math.PI / 4; // 45 deg
    const speed = rand(900, 1100);
    this.vx = -Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.targetX = W * 0.5;
    this.targetY = H * 0.62;
    this.size = 8;
    this.trail = [];
    this.alive = true;
    this.impacted = false;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Trail
    this.trail.push(new Particle(this.x, this.y,
      rand(-15, 15), rand(-15, 15), rand(0.3, 0.8), '#ff8844', rand(2, 6)));
    if (this.trail.length > 60) this.trail.shift();

    // Check impact
    if (!this.impacted && this.y >= this.targetY && this.x <= this.targetX + 50) {
      this.impacted = true;
      this.alive = false;
      return 'impact';
    }
    return null;
  }
  draw(ctx) {
    // Glow
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 30);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.2, '#ffcc66');
    grad.addColorStop(0.6, '#ff6622');
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 30, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Trail
    this.trail.forEach(p => { p.life -= 0.016; p.draw(ctx); });
  }
}

// --- Nebula -------------------------------------------------
const NEBULA_DEFS = [
  { label: '个人信息',   url: 'about/',        hue: 35,  sat: 90, light: 55, id: 'about' },
  { label: '个人项目',   url: 'projects/',      hue: 195, sat: 85, light: 55, id: 'projects' },
  { label: '学术研究',   url: 'research/',      hue: 265, sat: 75, light: 60, id: 'research' },
  { label: '工程问题',   url: 'engineering/',   hue: 170, sat: 70, light: 50, id: 'engineering' },
  { label: '技术小结',   url: 'notes/',         hue: 335, sat: 75, light: 58, id: 'notes' },
];

class Nebula {
  constructor(def, index) {
    this.label = def.label;
    this.url = def.url;
    this.hue = def.hue;
    this.sat = def.sat;
    this.light = def.light;
    this.id = def.id;
    this.cx = 0;
    this.cy = 0;
    this.radius = 80;
    this.particles = [];
    this.index = index;
    this.angle = 0;
    this.rotSpeed = rand(0.1, 0.3);
    this.formed = false;
  }
  setPosition(cx, cy) { this.cx = cx; this.cy = cy; }

  spawnParticles(count, scattered) {
    for (let i = 0; i < count; i++) {
      let x, y;
      if (scattered) {
        // Start from random position, gravitate toward center
        const a = rand(0, Math.PI * 2);
        const r = rand(30, Math.max(W, H) * 0.5);
        x = this.cx + Math.cos(a) * r;
        y = this.cy + Math.sin(a) * r;
      } else {
        const a = rand(0, Math.PI * 2);
        const r = rand(5, this.radius);
        x = this.cx + Math.cos(a) * r;
        y = this.cy + Math.sin(a) * r;
      }
      const p = new Particle(x, y, 0, 0, rand(3, 8),
        hsl(this.hue, this.sat, rand(this.light - 15, this.light + 15)),
        rand(1, 3.5));
      p.homeX = this.cx;
      p.homeY = this.cy;
      p.orbitAngle = rand(0, Math.PI * 2);
      p.orbitRadius = rand(15, this.radius);
      p.orbitSpeed = rand(0.3, 0.9);
      p.gravitating = scattered || false;
      p.nebula = this;
      this.particles.push(p);
    }
  }

  update(dt, globalParticles) {
    this.angle += this.rotSpeed * dt;
    this.particles.forEach(p => {
      if (p.gravitating) {
        // Pull toward center
        const dx = this.cx - p.x;
        const dy = this.cy - p.y;
        const d = Math.sqrt(dx*dx + dy*dy) || 1;
        const force = 180 / d;
        p.vx += (dx / d) * force * dt;
        p.vy += (dy / d) * force * dt;
        p.vx *= 0.97;
        p.vy *= 0.97;
        if (d < 20) { p.gravitating = false; p.vx = 0; p.vy = 0; }
      } else {
        // Orbit
        p.orbitAngle += p.orbitSpeed * dt;
        const tx = this.cx + Math.cos(p.orbitAngle) * p.orbitRadius;
        const ty = this.cy + Math.sin(p.orbitAngle * 0.7) * p.orbitRadius * 0.6;
        p.x = lerp(p.x, tx, 0.05);
        p.y = lerp(p.y, ty, 0.05);
      }
      p.update(dt);
      if (!p.alive) {
        p.x = this.cx + rand(-this.radius, this.radius);
        p.y = this.cy + rand(-this.radius, this.radius);
        p.life = rand(3, 8);
        p.alive = true;
        p.gravitating = false;
      }
    });
  }

  draw(ctx, t) {
    // Soft glow
    const glow = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, this.radius * 1.4);
    glow.addColorStop(0, hsl(this.hue, this.sat, this.light, 0.12));
    glow.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.radius * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Particles
    this.particles.forEach(p => p.draw(ctx));
  }

  contains(mx, my) {
    return dist({x: mx, y: my}, {x: this.cx, y: this.cy}) < this.radius + 15;
  }
}

// --- Global State -------------------------------------------
let stars = [];
let meteor = null;
let shatterParticles = [];
let nebulae = [];
let allNebulaParticles = []; // reference for global draw
let impactPoint = { x: 0, y: 0 };

// Typewriter targets
const typeLines = [
  { el: document.getElementById('line1'), text: "Hello, I'm",         speed: 55,  delay: 0 },
  { el: document.getElementById('line2'), text: 'Jimmy Yang',          speed: 80,  delay: 600 },
  { el: document.getElementById('line3'), text: '{ AN AI Engineer }', speed: 50,  delay: 500 },
  { el: document.getElementById('line4'), text: 'Welcome to my universe', speed: 45, delay: 700 },
];
let typewriterIndex = 0;
let typewriterChar = 0;
let typewriterTimer = 0;
let typewriterActive = false;
let typewriterDone = false;

// Nebula labels (DOM)
const labelContainer = document.getElementById('nebulaLabels');
let labelEls = [];

// Hover tracking
let hoveredNebula = null;

// --- Initialize ---------------------------------------------
function initStars() {
  stars = [];
  for (let i = 0; i < 200; i++) stars.push(new Star());
}

function repositionNebulae() {
  const positions = [
    { x: W * 0.35, y: H * 0.22 },  // 个人信息 — upper-mid left
    { x: W * 0.72, y: H * 0.2 },   // 个人项目 — upper right
    { x: W * 0.2,  y: H * 0.55 },  // 学术研究 — mid left
    { x: W * 0.68, y: H * 0.55 },  // 工程问题 — mid right
    { x: W * 0.45, y: H * 0.78 },  // 技术小结 — lower center
  ];
  nebulae.forEach((n, i) => {
    if (positions[i]) n.setPosition(positions[i].x, positions[i].y);
  });
}

function initNebulae() {
  nebulae = NEBULA_DEFS.map((def, i) => {
    const n = new Nebula(def, i);
    n.spawnParticles(130, true); // Start scattered
    return n;
  });
  repositionNebulae();

  // Create label DOM elements
  labelEls.forEach(item => { if (item.el && item.el.remove) item.el.remove(); });
  labelEls = [];
  nebulae.forEach(n => {
    const el = document.createElement('a');
    el.className = 'nebula-label';
    el.textContent = n.label;
    el.href = n.url;
    el.style.left = n.cx + 'px';
    el.style.top = (n.cy + n.radius + 30) + 'px';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = n.url;
    });
    labelContainer.appendChild(el);
    labelEls.push({ el, nebula: n });
  });
}

// --- Screen Shake -------------------------------------------
function triggerShake() {
  document.body.classList.add('shaking');
  setTimeout(() => document.body.classList.remove('shaking'), 500);
}

// --- Shatter ------------------------------------------------
function createShatter(x, y) {
  const count = 260;
  const colors = ['#ff8844', '#ffaa33', '#ff6622', '#ffcc66', '#fff', '#ff9944', '#ff5500'];
  for (let i = 0; i < count; i++) {
    const angle = rand(-Math.PI * 0.7, -Math.PI * 0.1); // mostly upward fan
    const speed = rand(80, 500);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    shatterParticles.push(new Particle(x, y, vx, vy, rand(1.2, 3.5),
      colors[randInt(0, colors.length - 1)], rand(2, 7)));
  }
}

// --- Typewriter ---------------------------------------------
function startTypewriter() {
  typewriterIndex = 0;
  typewriterChar = 0;
  typewriterActive = true;
  typewriterDone = false;
  typeLines.forEach(l => { l.el.textContent = ''; l.el.classList.add('visible'); });
  // Show first line with cursor
  typeLines[0].el.classList.add('typing');
}

function updateTypewriter(dt) {
  if (!typewriterActive || typewriterDone) return;

  const current = typeLines[typewriterIndex];
  if (!current) { typewriterDone = true; typewriterActive = false; return; }

  typewriterTimer += dt * 1000;
  const interval = current.speed;

  if (typewriterChar === 0 && typewriterTimer < current.delay) return;

  if (typewriterTimer >= interval) {
    typewriterTimer = 0;
    if (typewriterChar < current.text.length) {
      current.el.textContent += current.text[typewriterChar];
      typewriterChar++;
    } else {
      // Line done
      current.el.classList.remove('typing');
      typewriterIndex++;
      typewriterChar = 0;
      typewriterTimer = -current.delay; // offset for next line's delay
      if (typewriterIndex < typeLines.length) {
        typeLines[typewriterIndex].el.classList.add('visible');
        typeLines[typewriterIndex].el.classList.add('typing');
      }
    }
  }
}

// --- Gather -------------------------------------------------
function startGather() {
  // Reset nebula particles to scattered positions
  nebulae.forEach(n => {
    n.particles.forEach(p => {
      const a = rand(0, Math.PI * 2);
      const r = rand(50, Math.max(W, H) * 0.5);
      p.x = n.cx + Math.cos(a) * r;
      p.y = n.cy + Math.sin(a) * r;
      p.vx = 0; p.vy = 0;
      p.gravitating = true;
      p.alive = true;
      p.life = rand(3, 8);
    });
  });
}

// --- Show Nebula Labels -------------------------------------
function showLabels() {
  labelEls.forEach(({ el, nebula }) => {
    el.classList.add('visible');
    updateLabelPosition(el, nebula);
  });
}

function updateLabelPosition(el, nebula) {
  el.style.left = nebula.cx + 'px';
  el.style.top = (nebula.cy + nebula.radius + 25) + 'px';
}

function updateAllLabelPositions() {
  labelEls.forEach(({ el, nebula }) => updateLabelPosition(el, nebula));
}

// --- Main Loop ----------------------------------------------
let lastTime = 0;
let globalTime = 0;

// Meteor phase timing
const METEOR_START = 0.4;    // seconds after page load
const TYPEWRITER_START = 2.8; // after impact
const GATHER_START = 5.5;
const LABELS_SHOW = 7.5;

function loop(timestamp) {
  requestAnimationFrame(loop);

  const rawDt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
  const dt = Math.min(rawDt, 0.05); // Cap to avoid spiral
  lastTime = timestamp;
  globalTime += dt;

  // --- Clear ---
  ctx.clearRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // --- Stars (always visible) ---
  stars.forEach(s => s.draw(ctx, globalTime));

  // --- Phase: Meteor ---
  if (!meteor && globalTime > METEOR_START) {
    meteor = new Meteor();
    phase = Phase.METEOR;
    phaseStart = globalTime;
  }

  if (meteor && meteor.alive) {
    const result = meteor.update(dt);
    meteor.draw(ctx);
    if (result === 'impact') {
      impactPoint = { x: meteor.x, y: meteor.y };
      createShatter(impactPoint.x, impactPoint.y);
      triggerShake();
      phase = Phase.SHATTER;
      phaseStart = globalTime;
    }
  }

  // --- Phase: Shatter ---
  shatterParticles.forEach(p => {
    p.vy += 20 * dt; // gravity
    p.update(dt);
  });
  shatterParticles.forEach(p => p.draw(ctx));
  shatterParticles = shatterParticles.filter(p => p.alive);

  // --- Phase: Typewriter ---
  if (!typewriterActive && !typewriterDone && globalTime > TYPEWRITER_START) {
    startTypewriter();
    phase = Phase.TYPEWRITER;
    phaseStart = globalTime;
  }
  updateTypewriter(dt);

  // --- Phase: Gather ---
  if (phase === Phase.TYPEWRITER && globalTime > GATHER_START && typewriterDone) {
    startGather();
    phase = Phase.GATHER;
    phaseStart = globalTime;
  }

  // --- Nebula Update & Draw (only from GATHER onward) ---
  let allFormed = true;
  if (phase >= Phase.GATHER) {
    nebulae.forEach(n => {
      n.update(dt);
      n.draw(ctx, globalTime);
      if (n.particles.some(p => p.gravitating)) allFormed = false;
    });
  }

  // --- Phase: Nebula ---
  if (phase === Phase.GATHER && allFormed && globalTime > phaseStart + 1) {
    phase = Phase.NEBULA;
    phaseStart = globalTime;
  }

  if (phase === Phase.NEBULA && globalTime > LABELS_SHOW) {
    showLabels();
    phase = Phase.IDLE;
  }

  // --- Update label positions (for resize) ---
  if (phase === Phase.IDLE) updateAllLabelPositions();

  // --- Final global alpha reset ---
  ctx.globalAlpha = 1;
}

// --- Mouse / Touch Interaction ------------------------------
function getEventPos(e) {
  if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function handleMove(e) {
  if (phase < Phase.NEBULA && phase !== Phase.IDLE) return;
  const pos = getEventPos(e);
  let found = null;
  for (const n of nebulae) {
    if (n.contains(pos.x, pos.y)) { found = n; break; }
  }
  if (found !== hoveredNebula) {
    hoveredNebula = found;
    canvas.style.cursor = found ? 'pointer' : 'default';
  }
}

function handleClick(e) {
  if (phase < Phase.NEBULA && phase !== Phase.IDLE) return;
  const pos = getEventPos(e);
  for (const n of nebulae) {
    if (n.contains(pos.x, pos.y)) {
      window.location.href = n.url;
      return;
    }
  }
}

window.addEventListener('mousemove', handleMove, { passive: true });
window.addEventListener('touchmove', handleMove, { passive: true });
window.addEventListener('click', handleClick);
window.addEventListener('touchstart', (e) => {
  handleMove(e);
  handleClick(e);
}, { passive: false });

// --- Skip animation on click (UX) ---------------------------
let skipClicked = false;
canvas.addEventListener('dblclick', () => {
  if (phase < Phase.NEBULA) {
    skipClicked = true;
    globalTime = GATHER_START + 1;
    if (meteor) meteor.alive = false;
    shatterParticles = [];
    if (!typewriterActive && !typewriterDone) {
      typeLines.forEach(l => { l.el.textContent = l.text; l.el.classList.add('visible'); });
      typewriterDone = true;
      typewriterActive = false;
    }
    startGather();
    phase = Phase.GATHER;
    phaseStart = globalTime;
  }
});

// --- Boot ---------------------------------------------------
function boot() {
  if (!canvas || !ctx) {
    console.error('Canvas not supported');
    document.body.innerHTML = '<div style="color:#fff;text-align:center;padding:4rem;"><h1>Jimmy Yang</h1><p>AN AI Engineer</p><nav style="margin-top:2rem;"><a href="about/">个人信息</a> · <a href="projects/">个人项目</a> · <a href="research/">学术研究</a> · <a href="engineering/">工程问题</a> · <a href="notes/">技术小结</a></nav></div>';
    return;
  }
  // Hide fallback
  const fallback = document.getElementById('fallback');
  if (fallback) fallback.style.display = 'none';

  initStars();
  initNebulae();
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
