/* ============================================================
   Jimmy Yang · Cosmic Homepage v2
   Meteor → Glass Shatter → Typewriter + Nebula Formation
   ============================================================ */

// --- Canvas Setup -------------------------------------------
const canvas = document.getElementById('cosmicCanvas');
const ctx = canvas.getContext('2d');
let W, H, cx, cy; // cx,cy = screen center

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
const Phase = { STARS: 0, METEOR: 1, SHATTER: 2, GLASS: 3, TYPEWRITER: 4, IDLE: 5 };
let phase = Phase.STARS;
let phaseStart = 0;

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
  draw(ctx, t) {
    const a = this.baseAlpha + Math.sin(t * this.speed + this.phase) * 0.25;
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Meteor (v2 — grows larger as it approaches) ------------
class Meteor {
  constructor() {
    this.startX = W + 150;
    this.startY = -150;
    this.x = this.startX;
    this.y = this.startY;
    this.targetX = cx;
    this.targetY = H * 0.58;
    const totalDist = Math.sqrt((this.startX-this.targetX)**2 + (this.startY-this.targetY)**2);
    // total travel time ~0.8s
    this.duration = 0.8;
    this.speed = totalDist / this.duration;
    const angle = Math.atan2(this.targetY - this.startY, this.targetX - this.startX);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.trail = [];
    this.alive = true;
    this.impacted = false;
    this.elapsed = 0;
  }
  update(dt) {
    this.elapsed += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Scale: grows from 0.3 to 4 as it approaches
    const progress = this.elapsed / this.duration;
    const scale = 0.3 + progress * progress * 4.5; // quadratic growth

    // Trail
    const trailSize = rand(3, 8) * scale;
    this.trail.push(new Particle(this.x, this.y,
      rand(-25, 25), rand(-25, 25), rand(0.4, 1.2), '#ff8844', trailSize));
    if (this.trail.length > 80) this.trail.shift();

    // Check impact
    const d = dist({x: this.x, y: this.y}, {x: this.targetX, y: this.targetY});
    if (!this.impacted && d < 60) {
      this.impacted = true;
      this.alive = false;
      return 'impact';
    }
    return null;
  }
  draw(ctx) {
    const progress = Math.min(1, this.elapsed / this.duration);
    const scale = 0.3 + progress * progress * 4.5;
    const glowR = 40 * scale;

    // Outer glow
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

    // Hot core
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Trail
    this.trail.forEach(p => { p.life -= 0.02; p.draw(ctx); });
  }
}

// --- Glass Shatter Effect -----------------------------------
class GlassShatter {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.lines = [];
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const len = rand(60, Math.min(W, H) * 0.6);
      this.lines.push({
        angle, len,
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
    // White flash
    if (this.flashAlpha > 0) {
      ctx.globalAlpha = this.flashAlpha * 0.6;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
    }

    // Crack lines
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
      // Small branches
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

// --- Nebula (v2 — orbiting + laser focus hover) -------------
const NEBULA_DEFS = [
  { label: '个人信息',   url: 'about/',        hue: 35,  sat: 90, light: 55 },
  { label: '个人项目',   url: 'projects/',      hue: 195, sat: 85, light: 55 },
  { label: '学术研究',   url: 'research/',      hue: 270, sat: 75, light: 60 },
  { label: '工程问题',   url: 'engineering/',   hue: 170, sat: 70, light: 50 },
  { label: '技术小结',   url: 'notes/',         hue: 340, sat: 80, light: 58 },
];

// Each nebula's orbit params around center (cx, cy)
const NEBULA_ORBITS = [
  { r: 0.22, speed: 0.12, offset: 0 },           // 个人信息
  { r: 0.28, speed: 0.09, offset: Math.PI*0.45 }, // 个人项目
  { r: 0.25, speed: 0.15, offset: Math.PI*0.85 }, // 学术研究
  { r: 0.20, speed: 0.11, offset: Math.PI*1.3 },  // 工程问题
  { r: 0.30, speed: 0.08, offset: Math.PI*1.7 },  // 技术小结
];

class Nebula {
  constructor(def, orbit, index) {
    this.label = def.label;
    this.url = def.url;
    this.hue = def.hue;
    this.sat = def.sat;
    this.light = def.light;
    this.cx = 0; this.cy = 0;
    this.radius = 75;
    this.particles = [];
    this.index = index;
    this.orbitR = orbit.r;
    this.orbitSpeed = orbit.speed;
    this.orbitOffset = orbit.offset;
    this.hovered = false;
  }

  getOrbitPos(t) {
    const angle = this.orbitOffset + t * this.orbitSpeed;
    const r = Math.min(W, H) * this.orbitR;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r * 0.65,
    };
  }

  spawnParticles(count) {
    for (let i = 0; i < count; i++) {
      const p = new Particle(
        rand(0, W), rand(0, H), 0, 0, rand(3, 8),
        `hsl(${this.hue},${this.sat}%,${rand(this.light-15, this.light+15)}%)`,
        rand(1, 3.5));
      p.orbitAngle = rand(0, Math.PI * 2);
      p.orbitRadius = rand(10, this.radius);
      p.orbitSpeed = rand(0.3, 0.9);
      p.gravitating = true;
      p.nebula = this;
      this.particles.push(p);
    }
  }

  update(dt, t) {
    // Update nebula center from orbit
    const pos = this.getOrbitPos(t);
    this.cx = pos.x;
    this.cy = pos.y;

    this.particles.forEach(p => {
      if (p.gravitating) {
        const dx = this.cx - p.x;
        const dy = this.cy - p.y;
        const d = Math.sqrt(dx*dx + dy*dy) || 1;
        // Laser focus: stronger pull when hovered
        const force = this.hovered ? 600 / d : 150 / d;
        p.vx += (dx / d) * force * dt;
        p.vy += (dy / d) * force * dt;
        const damp = this.hovered ? 0.94 : 0.975;
        p.vx *= damp;
        p.vy *= damp;
        const settleDist = this.hovered ? 5 : 18;
        if (d < settleDist) {
          p.gravitating = false;
          p.vx = 0; p.vy = 0;
        }
      } else {
        // Orbit around nebula center
        p.orbitAngle += p.orbitSpeed * dt * (this.hovered ? 2.5 : 1);
        const or = this.hovered ? p.orbitRadius * 0.35 : p.orbitRadius;
        const tx = this.cx + Math.cos(p.orbitAngle) * or;
        const ty = this.cy + Math.sin(p.orbitAngle * 0.6) * or * 0.55;
        const lf = this.hovered ? 0.15 : 0.04;
        p.x = lerp(p.x, tx, lf);
        p.y = lerp(p.y, ty, lf);
      }
      p.update(dt);
      if (!p.alive) {
        p.x = this.cx + rand(-this.radius, this.radius);
        p.y = this.cy + rand(-this.radius, this.radius);
        p.life = rand(3, 8);
        p.alive = true;
        p.gravitating = false;
        p.orbitAngle = rand(0, Math.PI*2);
        p.orbitRadius = rand(10, this.radius);
      }
    });
  }

  draw(ctx, t) {
    // Glow (brighter when hovered)
    const glowAlpha = this.hovered ? 0.35 : 0.12;
    const glowR = this.hovered ? this.radius * 2.5 : this.radius * 1.5;
    const glow = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, glowR);
    glow.addColorStop(0, `hsla(${this.hue},${this.sat}%,${this.light}%,${glowAlpha})`);
    glow.addColorStop(0.5, `hsla(${this.hue},${this.sat}%,${this.light}%,${glowAlpha*0.4})`);
    glow.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Particles — brighter when hovered
    this.particles.forEach(p => {
      const origColor = p.color;
      if (this.hovered) {
        // Intensify color
        p.color = `hsla(${this.hue},${this.sat}%,${Math.min(100, this.light+20)}%,1)`;
      }
      p.draw(ctx);
      p.color = origColor;
    });

    // Core spark when hovered
    if (this.hovered) {
      const spark = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, this.radius * 0.6);
      spark.addColorStop(0, '#fff');
      spark.addColorStop(0.3, `hsla(${this.hue},${this.sat}%,${this.light+20}%,0.6)`);
      spark.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = spark;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, this.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  contains(mx, my) {
    return dist({x: mx, y: my}, {x: this.cx, y: this.cy}) < this.radius + 20;
  }
}

// --- Global State -------------------------------------------
let stars = [];
let meteor = null;
let glassShatter = null;
let shatterParticles = [];
let scatteredParticles = []; // colorful background particles
let nebulae = [];
let impactPoint = { x: 0, y: 0 };

// Typewriter
const typeLines = [
  { el: document.getElementById('line1'), text: "Hello, I'm",         speed: 55,  delay: 0 },
  { el: document.getElementById('line2'), text: 'Jimmy Yang',          speed: 80,  delay: 500 },
  { el: document.getElementById('line3'), text: '{ AN AI Engineer }', speed: 50,  delay: 450 },
  { el: document.getElementById('line4'), text: 'Welcome to my universe', speed: 42, delay: 600 },
];
let twIndex = 0, twChar = 0, twTimer = 0, twActive = false, twDone = false;

// Labels
const labelContainer = document.getElementById('nebulaLabels');
let labelEls = [];
let hoveredNebula = null;

// Timing (sped up ~1s)
const METEOR_START = 0.3;
const GATHER_START = 2.2;    // Start gathering right after glass shatter
const LABELS_SHOW = 5.0;

// --- Initialize ---------------------------------------------
function initStars() {
  stars = [];
  for (let i = 0; i < 200; i++) stars.push(new Star());
}

function initNebulae() {
  nebulae = NEBULA_DEFS.map((def, i) => {
    const n = new Nebula(def, NEBULA_ORBITS[i], i);
    n.spawnParticles(140);
    return n;
  });

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

function triggerShake() {
  document.body.classList.add('shaking');
  setTimeout(() => document.body.classList.remove('shaking'), 500);
}

// --- Colorful Scatter ---------------------------------------
function createColorfulScatter(x, y) {
  const hues = [35, 195, 270, 170, 340, 15, 50, 220, 300, 160];
  const count = 320;
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(60, 550);
    const hue = hues[randInt(0, hues.length - 1)];
    scatteredParticles.push(new Particle(x, y,
      Math.cos(angle) * speed, Math.sin(angle) * speed,
      rand(1.5, 4.5),
      `hsl(${hue},${rand(60,100)}%,${rand(40,70)}%)`,
      rand(1.5, 5)));
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
      twIndex++; twChar = 0;
      twTimer = -cur.delay;
      if (twIndex < typeLines.length) {
        typeLines[twIndex].el.classList.add('visible');
        typeLines[twIndex].el.classList.add('typing');
      }
    }
  }
}

// --- Gather scatter into nebulae -----------------------------
function startGather() {
  // Assign each scattered particle to nearest nebula
  scatteredParticles.forEach(p => {
    let best = null, bestD = Infinity;
    nebulae.forEach(n => {
      const d = dist(p, n);
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
    }
  });
  scatteredParticles = [];
}

// --- Labels -------------------------------------------------
function showLabels() {
  labelEls.forEach(({ el, nebula }) => {
    el.style.left = nebula.cx + 'px';
    el.style.top = (nebula.cy + nebula.radius + 25) + 'px';
    el.classList.add('visible');
  });
}
function updateAllLabelPositions() {
  labelEls.forEach(({ el, nebula }) => {
    el.style.left = nebula.cx + 'px';
    el.style.top = (nebula.cy + nebula.radius + 25) + 'px';
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

  // Clear
  ctx.clearRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Stars
  stars.forEach(s => s.draw(ctx, globalTime));

  // --- Meteor ---
  if (!meteor && globalTime > METEOR_START) {
    meteor = new Meteor();
    phase = Phase.METEOR;
    phaseStart = globalTime;
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
      phaseStart = globalTime;
    }
  }

  // --- Glass Shatter ---
  if (glassShatter && glassShatter.alive) {
    glassShatter.update(dt);
    glassShatter.draw(ctx);
    if (!glassShatter.alive) {
      glassShatter = null;
      // Start typewriter after glass fades
      if (!twActive && !twDone) {
        startTypewriter();
        phase = Phase.TYPEWRITER;
        phaseStart = globalTime;
      }
    }
  }

  // --- Scattered particles (twinkle between shatter & gather) ---
  scatteredParticles.forEach(p => {
    p.vy += 15 * dt;
    p.update(dt);
  });
  scatteredParticles.forEach(p => p.draw(ctx));
  scatteredParticles = scatteredParticles.filter(p => p.alive);

  // --- Typewriter ---
  updateTypewriter(dt);

  // --- Start gathering during typewriter ---
  if (twActive && !twDone && globalTime > GATHER_START && scatteredParticles.length > 0) {
    startGather();
  }

  // --- Nebulae (always drawing if they have particles) ---
  let allFormed = true;
  nebulae.forEach(n => {
    n.hovered = (n === hoveredNebula);
    n.update(dt, globalTime);
    n.draw(ctx, globalTime);
    if (n.particles.some(p => p.gravitating)) allFormed = false;
  });

  // --- Show labels when formed ---
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
  if (phase < Phase.TYPEWRITER) return;
  const pos = getPos(e);
  let found = null;
  for (const n of nebulae) {
    if (n.contains(pos.x, pos.y)) { found = n; break; }
  }
  if (found !== hoveredNebula) {
    // Reset previous
    if (hoveredNebula) hoveredNebula.hovered = false;
    hoveredNebula = found;
    if (found) found.hovered = true;
    canvas.style.cursor = found ? 'pointer' : 'default';
  }
}
function handleClick(e) {
  if (phase < Phase.TYPEWRITER) return;
  const pos = getPos(e);
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
