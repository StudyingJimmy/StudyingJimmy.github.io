/* ============================================================
   Jimmy Yang · Cosmic Homepage v2.1
   Meteor → Glass → Scatter → Typewriter + Nebula Formation
   ============================================================ */

// --- Canvas Setup -------------------------------------------
const canvas = document.getElementById('cosmicCanvas');
const ctx = canvas.getContext('2d');
let W, H, cx, cy;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  cx = W * 0.5;
  cy = H * 0.48;
}
resize();
window.addEventListener('resize', resize);

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
const Phase = { STARS: 0, METEOR: 1, GLASS: 2, TYPEWRITER: 3, IDLE: 4 };
let phase = Phase.STARS;

// --- Utility ------------------------------------------------
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function dist(a, b) { const dx = a.x - b.x; const dy = a.y - b.y; return Math.sqrt(dx*dx + dy*dy); }
function lerp(a, b, t) { return a + (b - a) * t; }

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
    const a = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * a, 0, Math.PI * 2);
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
  draw(ctx, t, boost) {
    const amp = 0.25 + (boost || 0) * 0.6;
    const freq = 1 + (boost || 0) * 2.5;
    const a = this.baseAlpha + Math.sin(t * this.speed * freq + this.phase) * amp;
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * (1 + (boost || 0) * 0.8), 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Meteor (grows as it approaches) ------------------------
class Meteor {
  constructor() {
    this.startX = W + 150;
    this.startY = -150;
    this.x = this.startX;
    this.y = this.startY;
    this.targetX = cx;
    this.targetY = H * 0.58;
    const totalDist = Math.sqrt((this.startX-this.targetX)**2 + (this.startY-this.targetY)**2);
    this.duration = 0.8;
    this.speed = totalDist / this.duration;
    const angle = Math.atan2(this.targetY - this.startY, this.targetX - this.startX);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.trail = [];
    this.alive = true;
    this.elapsed = 0;
  }
  update(dt) {
    this.elapsed += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const progress = this.elapsed / this.duration;
    const scale = 0.3 + progress * progress * 4.5;
    const trailSize = rand(3, 8) * scale;
    this.trail.push(new Particle(this.x, this.y,
      rand(-25, 25), rand(-25, 25), rand(0.4, 1.2), '#ff8844', trailSize));
    if (this.trail.length > 80) this.trail.shift();
    const d = dist({x: this.x, y: this.y}, {x: this.targetX, y: this.targetY});
    if (d < 60) { this.alive = false; return 'impact'; }
    return null;
  }
  draw(ctx) {
    const progress = Math.min(1, this.elapsed / this.duration);
    const scale = 0.3 + progress * progress * 4.5;
    const glowR = 40 * scale;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.15, '#ffeebb');
    grad.addColorStop(0.4, '#ff8833');
    grad.addColorStop(0.7, '#ff3300');
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
    this.trail.forEach(p => { p.life -= 0.02; p.draw(ctx); });
  }
}

// --- Glass Shatter ------------------------------------------
class GlassShatter {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.lines = [];
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      this.lines.push({
        angle,
        len: rand(60, Math.min(W, H) * 0.6),
        cx: x + rand(-30, 30),
        cy: y + rand(-30, 30),
        life: rand(0.3, 0.7),
        maxLife: rand(0.3, 0.7),
        width: rand(0.5, 2.5),
      });
    }
    this.flashAlpha = 1.0;
    this.alive = true;
    this.elapsed = 0;
  }
  update(dt) {
    this.elapsed += dt;
    this.flashAlpha = Math.max(0, 1 - this.elapsed / 0.15);
    this.lines.forEach(l => l.life -= dt);
    if (this.elapsed > 0.55) this.alive = false;
  }
  draw(ctx) {
    if (this.flashAlpha > 0) {
      ctx.globalAlpha = this.flashAlpha * 0.6;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
    }
    this.lines.forEach(l => {
      if (l.life <= 0) return;
      const a = Math.max(0, l.life / l.maxLife);
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = l.width * a;
      ctx.beginPath();
      ctx.moveTo(l.cx, l.cy);
      const ex = l.cx + Math.cos(l.angle) * l.len;
      const ey = l.cy + Math.sin(l.angle) * l.len;
      ctx.lineTo(ex, ey);
      if (l.len > 100) {
        const mx = l.cx + Math.cos(l.angle) * l.len * 0.5;
        const my = l.cy + Math.sin(l.angle) * l.len * 0.5;
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(l.angle + 0.6) * l.len * 0.25, my + Math.sin(l.angle + 0.6) * l.len * 0.25);
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(l.angle - 0.5) * l.len * 0.2, my + Math.sin(l.angle - 0.5) * l.len * 0.2);
      }
      ctx.stroke();
    });
  }
}

// --- Nebula (larger, elliptical orbits, labels at center) ---
const NEBULA_DEFS = [
  { label: '个人信息', url: 'about/',       hue: 35,  sat: 90, light: 55 },
  { label: '个人项目', url: 'projects/',     hue: 195, sat: 85, light: 55 },
  { label: '学术研究', url: 'research/',     hue: 270, sat: 75, light: 60 },
  { label: '工程问题', url: 'engineering/',  hue: 170, sat: 70, light: 50 },
  { label: '技术小结', url: 'notes/',        hue: 340, sat: 80, light: 58 },
];

// Single shared elliptical orbit — wide, flat, around center text
const ORBIT_RX = 0.50;  // wide horizontal
const ORBIT_RY = 0.18;  // flat vertical — keeps clear of center text
const ORBIT_SPEED = 0.08;
const ORBIT_CY = 0.50;  // orbit center y (same as text center)
const NEBULA_COUNT = 5;

class Nebula {
  constructor(def, index) {
    this.label = def.label;
    this.url = def.url;
    this.hue = def.hue;
    this.sat = def.sat;
    this.light = def.light;
    this.cx = 0; this.cy = 0;
    this.radius = 140; // larger, galaxy-scale
    this.particles = []; // starts EMPTY — no particles before meteor
    this.index = index;
    // Evenly spaced along the shared orbit
    this.orbitOffset = (Math.PI * 2 / NEBULA_COUNT) * index;
    this.hovered = false;
    this.hasParticles = false;
    // Pre-compute gas cloud offsets (static — avoids per-frame flicker)
    this.gasBlobs = [];
    for (let i = 0; i < 5; i++) {
      this.gasBlobs.push({
        dx: rand(-0.3, 0.3),
        dy: rand(-0.3, 0.3),
        s: rand(0.4, 0.7),
        a: rand(0.03, 0.08),
        hueShift: rand(-12, 12),
      });
    }
  }

  getOrbitPos(t) {
    const base = Math.min(W, H);
    const angle = this.orbitOffset + t * ORBIT_SPEED;
    const orbitCy = H * ORBIT_CY;
    return {
      x: cx + Math.cos(angle) * base * ORBIT_RX,
      y: orbitCy + Math.sin(angle) * base * ORBIT_RY,
    };
  }

  update(dt, t) {
    const pos = this.getOrbitPos(t);
    this.cx = pos.x;
    this.cy = pos.y;
    if (!this.hasParticles) return;

    this.particles.forEach(p => {
      if (p.gravitating) {
        const dx = this.cx - p.x;
        const dy = this.cy - p.y;
        const d = Math.sqrt(dx*dx + dy*dy) || 1;
        const force = this.hovered ? 600 / d : 150 / d;
        p.vx += (dx / d) * force * dt;
        p.vy += (dy / d) * force * dt;
        p.vx *= this.hovered ? 0.94 : 0.975;
        p.vy *= this.hovered ? 0.94 : 0.975;
        if (d < (this.hovered ? 5 : 18)) { p.gravitating = false; p.vx = 0; p.vy = 0; }
      } else {
        p.orbitAngle += p.orbitSpeed * dt * (this.hovered ? 2.5 : 1);
        const or = this.hovered ? p.orbitRadius * 0.35 : p.orbitRadius;
        const tx = this.cx + Math.cos(p.orbitAngle) * or;
        const ty = this.cy + Math.sin(p.orbitAngle * 0.6) * or * 0.55;
        p.x = lerp(p.x, tx, this.hovered ? 0.15 : 0.04);
        p.y = lerp(p.y, ty, this.hovered ? 0.15 : 0.04);
      }
      p.update(dt);
      if (!p.alive) {
        p.x = this.cx + rand(-this.radius, this.radius);
        p.y = this.cy + rand(-this.radius, this.radius);
        p.life = rand(3, 8);
        p.alive = true;
        p.gravitating = false;
        p.orbitAngle = rand(0, Math.PI * 2);
        p.orbitRadius = rand(10, this.radius);
      }
    });
  }

  draw(ctx, t) {
    if (!this.hasParticles) return;
    ctx.globalAlpha = 1; // Reset — prevents bleed from previous draws
    const { cx, cy, radius, hue, sat, light, hovered } = this;

    // --- Layer 1: Wide outer halo (very faint, large) ---
    const outerR = radius * 2.2;
    const g1 = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, outerR);
    g1.addColorStop(0, `hsla(${hue},${sat}%,${light}%,0.06)`);
    g1.addColorStop(0.5, `hsla(${hue},${sat}%,${light}%,0.03)`);
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2); ctx.fill();

    // --- Layer 2: Irregular gas clouds (pre-computed offsets) ---
    const gasR = radius * 1.3;
    this.gasBlobs.forEach(o => {
      const ox = cx + o.dx * radius;
      const oy = cy + o.dy * radius;
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, gasR * o.s);
      g.addColorStop(0, `hsla(${hue + o.hueShift},${sat}%,${light}%,${o.a})`);
      g.addColorStop(0.6, `hsla(${hue + o.hueShift},${sat}%,${light-10}%,${o.a * 0.3})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ox, oy, gasR * o.s, 0, Math.PI * 2); ctx.fill();
    });

    // --- Layer 3: Inner glow ---
    const innerR = radius * 0.9;
    const g3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
    g3.addColorStop(0, `hsla(${hue},${sat}%,${Math.min(100, light + 10)}%,0.18)`);
    g3.addColorStop(0.4, `hsla(${hue},${sat}%,${light}%,0.1)`);
    g3.addColorStop(1, 'transparent');
    ctx.fillStyle = g3;
    ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.fill();

    // --- Layer 4: Dense particle dust ---
    this.particles.forEach(p => {
      const origColor = p.color;
      if (hovered) p.color = `hsla(${hue},${sat}%,${Math.min(100, light + 20)}%,1)`;
      p.draw(ctx);
      p.color = origColor;
    });

    ctx.globalAlpha = 1;
    // --- Layer 5: Core (subtle when idle, bright when hovered) ---
    const coreR = radius * (hovered ? 0.4 : 0.15);
    const coreAlpha = hovered ? 0.9 : 0.2;
    const g5 = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    g5.addColorStop(0, hovered ? '#fff' : `hsla(${hue},40%,80%,0.5)`);
    g5.addColorStop(0.3, `hsla(${hue},40%,${hovered ? 90 : 70}%,${coreAlpha})`);
    g5.addColorStop(1, 'transparent');
    ctx.fillStyle = g5;
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.fill();
  }

  contains(mx, my) {
    return dist({x: mx, y: my}, {x: this.cx, y: this.cy}) < this.radius;
  }
}

// --- Global State -------------------------------------------
let stars = [];
let meteor = null;
let glassShatter = null;
let scatteredParticles = [];
let nebulae = [];
let impactPoint = { x: 0, y: 0 };

const typeLines = [
  { el: document.getElementById('line1'), text: "Hello, I'm",         speed: 55,  delay: 0 },
  { el: document.getElementById('line2'), text: 'Jimmy Yang',          speed: 80,  delay: 500 },
  { el: document.getElementById('line3'), text: '{ AN AI Engineer }', speed: 50,  delay: 450 },
  { el: document.getElementById('line4'), text: 'Welcome to my universe', speed: 42, delay: 600 },
];
let twIndex = 0, twChar = 0, twTimer = 0, twActive = false, twDone = false;

const labelContainer = document.getElementById('nebulaLabels');
let labelEls = [];
let hoveredNebula = null;

const METEOR_START = 0.3;
const GATHER_START = 2.2;
const LABELS_SHOW = 4.8;

// --- Init ---------------------------------------------------
function initStars() {
  stars = [];
  for (let i = 0; i < 200; i++) stars.push(new Star());
}

function initNebulae() {
  // Create nebulae with NO particles — they're empty until meteor scatters
  nebulae = NEBULA_DEFS.map((def, i) => new Nebula(def, i));

  labelEls.forEach(item => { if (item.el && item.el.remove) item.el.remove(); });
  labelEls = [];
  nebulae.forEach(n => {
    const el = document.createElement('a');
    el.className = 'nebula-label';
    el.textContent = n.label;
    el.href = n.url;
    // Position will be updated in label position functions
    el.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = n.url;
    });
    labelContainer.appendChild(el);
    labelEls.push({ el, nebula: n });
  });
}

function triggerShake() {
  document.body.classList.add('shaking');
  setTimeout(() => document.body.classList.remove('shaking'), 500);
}

// --- Colorful Scatter (only appears AFTER meteor impact) ----
function createColorfulScatter(x, y) {
  const hues = [35, 195, 270, 170, 340, 15, 50, 220, 300, 160];
  const count = 650;
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(60, 560);
    const hue = hues[randInt(0, hues.length - 1)];
    scatteredParticles.push(new Particle(x, y,
      Math.cos(angle) * speed, Math.sin(angle) * speed,
      rand(1.5, 5.5),
      `hsl(${hue},${rand(60, 100)}%,${rand(40, 70)}%)`,
      rand(1, 3.5)));
  }
}

// --- Typewriter ---------------------------------------------
function startTypewriter() {
  twIndex = 0; twChar = 0; twActive = true; twDone = false;
  typeLines.forEach(l => { l.el.textContent = ''; l.el.classList.add('visible'); });
  typeLines[0].el.classList.add('typing');
}
function updateTypewriter(dt) {
  if (!twActive || twDone) return;
  const cur = typeLines[twIndex];
  if (!cur) { twDone = true; twActive = false; return; }
  twTimer += dt * 1000;
  if (twChar === 0 && twTimer < cur.delay) return;
  if (twTimer >= cur.speed) {
    twTimer = 0;
    if (twChar < cur.text.length) {
      cur.el.textContent += cur.text[twChar];
      twChar++;
    } else {
      cur.el.classList.remove('typing');
      twIndex++; twChar = 0; twTimer = -cur.delay;
      if (twIndex < typeLines.length) {
        typeLines[twIndex].el.classList.add('visible');
        typeLines[twIndex].el.classList.add('typing');
      }
    }
  }
}

// --- Gather scattered particles into nebulae ----------------
function startGather() {
  scatteredParticles.forEach(p => {
    let best = null, bestD = Infinity;
    nebulae.forEach(n => {
      const d = dist(p, {x: n.cx, y: n.cy});
      if (d < bestD) { bestD = d; best = n; }
    });
    if (best) {
      p.gravitating = true;
      p.nebula = best;
      p.orbitAngle = rand(0, Math.PI * 2);
      p.orbitRadius = rand(10, best.radius);
      p.orbitSpeed = rand(0.3, 0.9);
      p.life = rand(3, 8);
      p.maxLife = p.life;
      best.particles.push(p);
      best.hasParticles = true;
    }
  });
  scatteredParticles = [];
}

// --- Labels — positioned at nebula CENTER --------------------
function showLabels() {
  labelEls.forEach(({ el, nebula }) => {
    el.style.left = nebula.cx + 'px';
    el.style.top = nebula.cy + 'px';
    el.classList.add('visible');
  });
}
function updateAllLabelPositions() {
  labelEls.forEach(({ el, nebula }) => {
    el.style.left = nebula.cx + 'px';
    el.style.top = nebula.cy + 'px';
  });
}

// --- Main Loop ----------------------------------------------
let lastTime = 0;
let globalTime = 0;

function loop(timestamp) {
  requestAnimationFrame(loop);
  const rawDt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
  const dt = Math.min(rawDt, 0.05);
  lastTime = timestamp;
  globalTime += dt;

  ctx.clearRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Stars (sparkle intensely when hovering a nebula)
  const sparkle = hoveredNebula ? 1 : 0;
  stars.forEach(s => s.draw(ctx, globalTime, sparkle));

  // --- Meteor ---
  if (!meteor && globalTime > METEOR_START) {
    meteor = new Meteor();
    phase = Phase.METEOR;
  }
  if (meteor && meteor.alive) {
    const r = meteor.update(dt);
    meteor.draw(ctx);
    if (r === 'impact') {
      impactPoint = { x: meteor.x, y: meteor.y };
      glassShatter = new GlassShatter(impactPoint.x, impactPoint.y);
      createColorfulScatter(impactPoint.x, impactPoint.y);
      triggerShake();
      phase = Phase.GLASS;
    }
  }

  // --- Glass Shatter ---
  if (glassShatter && glassShatter.alive) {
    glassShatter.update(dt);
    glassShatter.draw(ctx);
    if (!glassShatter.alive) {
      glassShatter = null;
      if (!twActive && !twDone) {
        startTypewriter();
        phase = Phase.TYPEWRITER;
      }
    }
  }

  // --- Scattered particles ---
  scatteredParticles.forEach(p => { p.vy += 15 * dt; p.update(dt); });
  scatteredParticles.forEach(p => p.draw(ctx));
  scatteredParticles = scatteredParticles.filter(p => p.alive);

  // --- Typewriter ---
  updateTypewriter(dt);

  // --- Gather: assign scattered particles to nebulae ---
  if (twActive && !twDone && globalTime > GATHER_START && scatteredParticles.length > 0) {
    startGather();
  }

  // --- Nebulae (draw only if they have particles) ---
  let allFormed = true;
  nebulae.forEach(n => {
    n.hovered = (n === hoveredNebula);
    n.update(dt, globalTime);
    if (n.hasParticles) {
      n.draw(ctx, globalTime);
      if (n.particles.some(p => p.gravitating)) allFormed = false;
    }
  });

  // --- Show labels ---
  if (allFormed && globalTime > LABELS_SHOW && phase !== Phase.IDLE) {
    showLabels();
    phase = Phase.IDLE;
  }
  if (phase === Phase.IDLE) updateAllLabelPositions();

  ctx.globalAlpha = 1;
}

// --- Interaction --------------------------------------------
function getPos(e) {
  if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}
function handleMove(e) {
  if (phase !== Phase.IDLE) return;
  const pos = getPos(e);
  let found = null;
  for (const n of nebulae) {
    if (n.contains(pos.x, pos.y)) { found = n; break; }
  }
  if (found !== hoveredNebula) {
    if (hoveredNebula) hoveredNebula.hovered = false;
    hoveredNebula = found;
    if (found) found.hovered = true;
    canvas.style.cursor = found ? 'pointer' : 'default';
  }
}
function handleClick(e) {
  if (phase !== Phase.IDLE) return;
  const pos = getPos(e);
  for (const n of nebulae) {
    if (n.contains(pos.x, pos.y)) { window.location.href = n.url; return; }
  }
}
window.addEventListener('mousemove', handleMove, { passive: true });
window.addEventListener('touchmove', handleMove, { passive: true });
window.addEventListener('click', handleClick);
window.addEventListener('touchstart', (e) => { handleMove(e); handleClick(e); }, { passive: false });

// --- Skip (double-click) ------------------------------------
canvas.addEventListener('dblclick', () => {
  if (phase < Phase.IDLE) {
    if (meteor) meteor.alive = false;
    glassShatter = null;
    scatteredParticles = [];
    if (!twActive && !twDone) {
      typeLines.forEach(l => { l.el.textContent = l.text; l.el.classList.add('visible'); });
      twDone = true; twActive = false;
    }
    startGather();
    globalTime = LABELS_SHOW;
    phase = Phase.IDLE;
  }
});

// --- Boot ---------------------------------------------------
function boot() {
  if (!canvas || !ctx) {
    document.body.innerHTML = '<div style="color:#fff;text-align:center;padding:4rem;"><h1>Jimmy Yang</h1><p>AN AI Engineer</p><nav style="margin-top:2rem;"><a href="about/">个人信息</a> · <a href="projects/">个人项目</a> · <a href="research/">学术研究</a> · <a href="engineering/">工程问题</a> · <a href="notes/">技术小结</a></nav></div>';
    return;
  }
  document.getElementById('fallback').style.display = 'none';
  initStars();
  initNebulae();
  requestAnimationFrame(loop);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
