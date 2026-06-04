/* ============================================================
   Jimmy Yang · Cosmic Homepage v2.1
   Meteor → Glass → Scatter → Typewriter + Nebula Formation
   ============================================================ */

// --- Canvas Setup -------------------------------------------
const canvas = document.getElementById('cosmicCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let W, H, cx, cy;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  cx = W * 0.5;
  cy = H * 0.48;
  if (canvas) {
    canvas.width = W;
    canvas.height = H;
  }
}
resize();
window.addEventListener('resize', resize);

// --- Theme (smooth CSS transition, no overlay) ---------------
const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
function getTheme() {
  return localStorage.getItem('theme')
    || (document.body.classList.contains('cosmic') ? 'dark' : 'light');
}
function setTheme(t) { html.setAttribute('data-theme', t); localStorage.setItem('theme', t); }
setTheme(getTheme());

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = html.getAttribute('data-theme') === 'dark';
    setTheme(isDark ? 'light' : 'dark');
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
    this.ox = rand(0, W);
    this.oy = rand(0, H);
    this.x = this.ox; this.y = this.oy;
    this.depth = rand(0.2, 1.0);
    this.baseAlpha = rand(0.4, 1.0);
    this.phase = rand(0, Math.PI * 2);
    this.speed = rand(0.3, 1.5);
    this.size = rand(0.8, 2.5) * (1.3 - this.depth * 0.5);
    // Warp mode
    this.warpAngle = 0;
    this.warpDist = 0;
    this.warpSpeed = 0;
  }
  update(px, py) { const f = (1 - this.depth) * 0.025; this.x = this.ox + px * f; this.y = this.oy + py * f; }
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
  // Switch to warp tunnel mode
  initWarp() {
    const dx = this.ox - cx, dy = this.oy - cy;
    this.warpAngle = Math.atan2(dy, dx);
    this.warpDist = Math.sqrt(dx*dx + dy*dy) || 1;
    this.warpSpeed = this.warpDist * rand(0.8, 2.5);
  }
  updateWarp(dt, t) {
    this.warpSpeed += this.warpDist * 0.8 * dt;
    this.warpDist += this.warpSpeed * dt;
    // Space distortion: sinusoidal perpendicular offset
    const distort = Math.sin(t * 2 + this.warpDist * 0.01) * 5;
    const px = Math.cos(this.warpAngle + Math.PI / 2) * distort;
    const py = Math.sin(this.warpAngle + Math.PI / 2) * distort;
    this.x = cx + Math.cos(this.warpAngle) * this.warpDist + px;
    this.y = cy + Math.sin(this.warpAngle) * this.warpDist + py;
    const diag = Math.sqrt(W*W + H*H);
    if (this.warpDist > diag * 0.8) {
      this.warpAngle = rand(0, Math.PI * 2);
      this.warpDist = rand(15, 50);
      this.warpSpeed = this.warpDist * rand(0.5, 1.5);
      this.size = rand(0.5, 2.5);
    }
  }
  drawWarp(ctx) {
    // Brightness/dim based on distance (near=dim, far=bright trail)
    const diag = Math.sqrt(W*W + H*H);
    const t = Math.min(1, this.warpDist / (diag * 0.5));
    const alpha = 0.15 + t * 0.85;
    const sz = 0.8 + t * 3.5;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    // Motion streak: elongated toward center
    const streak = t * 12;
    const sx = Math.cos(this.warpAngle) * streak;
    const sy = Math.sin(this.warpAngle) * streak;
    ctx.beginPath();
    ctx.moveTo(this.x + sx, this.y + sy);
    ctx.lineTo(this.x - sx, this.y - sy);
    ctx.lineWidth = sz * 0.6;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.stroke();
    // Core dot
    ctx.beginPath();
    ctx.arc(this.x, this.y, sz, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Meteor (thermal trail + lag + wobble + dust) -----------
class Meteor {
  constructor() {
    this.startX = W + 150;
    this.startY = -150;
    this.x = this.startX; this.y = this.startY;
    this.targetX = cx; this.targetY = H * 0.58;
    const totalDist = Math.sqrt((this.startX-this.targetX)**2 + (this.startY-this.targetY)**2);
    this.duration = 0.8;
    this.speed = totalDist / this.duration;
    const angle = Math.atan2(this.targetY - this.startY, this.targetX - this.startX);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.headAngle = angle; // direction of motion
    this.trail = [];    // {x, y, age} time-series accumulation
    this.dust = [];     // emitted particles with physics
    this.alive = true;
    this.elapsed = 0;
  }
  update(dt) {
    this.elapsed += dt;
    // Wobble: sinusoidal offset perpendicular to motion
    const perpX = -Math.sin(this.headAngle);
    const perpY = Math.cos(this.headAngle);
    const wobble = Math.sin(this.elapsed * 18) * 12 + Math.sin(this.elapsed * 37) * 5;
    this.x += this.vx * dt + perpX * wobble * 0.1;
    this.y += this.vy * dt + perpY * wobble * 0.1;
    const progress = this.elapsed / this.duration;
    const scale = 0.3 + progress * progress * 15;

    // Trail accumulation — stack points with age
    this.trail.push({
      x: this.x + perpX * wobble * 0.6,
      y: this.y + perpY * wobble * 0.6,
      age: 1.0,
      scale,
    });
    // Age existing trail points
    this.trail.forEach(p => p.age -= 0.03);
    this.trail = this.trail.filter(p => p.age > 0);
    if (this.trail.length > 200) this.trail.splice(0, this.trail.length - 200);

    // Dust emission — small particles ejected along path
    if (Math.random() < 0.7) {
      this.dust.push({
        x: this.x + rand(-20, 20) * scale,
        y: this.y + rand(-20, 20) * scale,
        vx: rand(-40, 40), vy: rand(-40, 20),
        life: rand(0.4, 1.2), maxLife: rand(0.4, 1.2),
        size: rand(1, 3.5),
      });
    }
    this.dust.forEach(d => {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 15 * dt; // gravity
      d.life -= dt;
    });
    this.dust = this.dust.filter(d => d.life > 0);
    if (this.dust.length > 300) this.dust.splice(0, this.dust.length - 300);

    const d = dist({x: this.x, y: this.y}, {x: this.targetX, y: this.targetY});
    if (d < 100) { this.alive = false; return 'impact'; }
    return null;
  }
  draw(ctx) {
    const progress = Math.min(1, this.elapsed / this.duration);
    const scale = 0.3 + progress * progress * 15;
    const glowR = 50 * scale;

    // --- Thermal trail (continuous line with thermal gradient) ---
    if (this.trail.length > 2) {
      // Wide glow layer
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(255,120,20,0.6)';
      ctx.beginPath(); ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        const p = this.trail[i];
        ctx.lineWidth = (1 + p.age * 6) * p.scale;
        ctx.strokeStyle = `rgba(255,${Math.floor(100+p.age*100)},${Math.floor(30+p.age*30)},${p.age*0.5})`;
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      // Core line
      ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(255,200,100,0.8)';
      ctx.beginPath(); ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        const p = this.trail[i];
        ctx.lineWidth = (0.5 + p.age * 2.5) * p.scale;
        ctx.strokeStyle = `rgba(255,${Math.floor(180+p.age*75)},${Math.floor(100+p.age*100)},${p.age*0.7})`;
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      // White hot core
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        const p = this.trail[i];
        if (p.age < 0.3) continue;
        ctx.lineWidth = 1 * p.scale * p.age;
        ctx.strokeStyle = `rgba(255,255,255,${p.age*0.8})`;
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // --- Dust particles (grey ash + embers) ---
    this.dust.forEach(d => {
      const a = Math.max(0, d.life / d.maxLife);
      // Grey ash
      ctx.globalAlpha = a * 0.4;
      ctx.fillStyle = `rgba(180,160,140,1)`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.size * a, 0, Math.PI*2); ctx.fill();
      // Ember glow on some
      if (d.size > 2) {
        ctx.globalAlpha = a * 0.3;
        ctx.fillStyle = '#ff9944';
        ctx.beginPath(); ctx.arc(d.x, d.y, d.size * 2 * a, 0, Math.PI*2); ctx.fill();
      }
    });

    // --- Irregular flame head ---
    const flameBlobs = 8;
    for (let i = 0; i < flameBlobs; i++) {
      const ba = (i/flameBlobs)*Math.PI*2 + this.elapsed*3;
      const bx = this.x + Math.cos(ba)*glowR*rand(0.2,0.55);
      const by = this.y + Math.sin(ba)*glowR*rand(0.2,0.55);
      const br = glowR * rand(0.3, 0.7);
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, `rgba(255,${randInt(150,220)},${randInt(40,120)},0.7)`);
      g.addColorStop(0.5, `rgba(255,${randInt(80,150)},0,0.35)`);
      g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fill();
    }
    // Main glow overlay
    const mainG = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR*0.6);
    mainG.addColorStop(0, '#fff'); mainG.addColorStop(0.2, '#ffeebb');
    mainG.addColorStop(0.5, 'rgba(255,150,50,0.4)'); mainG.addColorStop(1, 'transparent');
    ctx.fillStyle = mainG;
    ctx.beginPath(); ctx.arc(this.x, this.y, glowR*0.6, 0, Math.PI*2); ctx.fill();
    // Hot core
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(this.x, this.y, 6*scale, 0, Math.PI*2); ctx.fill();
    // Spark embers
    for (let i = 0; i < 5; i++) {
      const sa = rand(0, Math.PI*2); const sr = glowR * rand(0.5, 0.9);
      ctx.globalAlpha = rand(0.4, 0.9); ctx.fillStyle = '#ffcc44';
      ctx.beginPath();
      ctx.arc(this.x+Math.cos(sa)*sr, this.y+Math.sin(sa)*sr, rand(1,3), 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// --- Glass Shatter (jittered cracks + rotation + debris) ----
class GlassShatter {
  constructor(x, y) {
    this.x = x; this.y = y;
    const diag = Math.sqrt(W*W + H*H);
    // Fractal seed distribution — strong center clustering
    const seeds = [{x, y}];
    const count = 55;
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI*2);
      const d = diag * Math.pow(Math.random(), 5) * 1.2;
      seeds.push({x: x + Math.cos(a)*d, y: y + Math.sin(a)*d});
    }
    // Build crack edges with jittered paths
    this.cracks = [];
    for (let i = 0; i < seeds.length; i++) {
      const si = seeds[i];
      const dists = [];
      for (let j = i+1; j < seeds.length; j++) {
        const d = Math.sqrt((si.x-seeds[j].x)**2 + (si.y-seeds[j].y)**2);
        if (d < diag*0.5) dists.push({j, d});
      }
      dists.sort((a,b) => a.d-b.d);
      dists.slice(0, 3).forEach(n => {
        const sj = seeds[n.j];
        const isPri = i===0;
        this.cracks.push({
          points: this.jitterPath(si, sj, isPri ? 5 : 3),
          isPrimary: isPri,
          progress: 0,
          delay: rand(0, 0.1),
          life: rand(0.3, 0.8), maxLife: rand(0.3, 0.8),
          baseWidth: isPri ? rand(1.5, 3.5) : rand(0.5, 1.5),
        });
      });
    }
    // Fragment rotation + displacement
    this.fragments = seeds.map(s => {
      const dx = s.x - x, dy = s.y - y;
      const dist = Math.sqrt(dx*dx+dy*dy) || 1;
      return {
        sx: s.x, sy: s.y,
        ox: (dx/dist) * rand(3, 15),
        oy: (dy/dist) * rand(3, 15),
        rot: rand(-0.03, 0.03),
        settled: false,
      };
    });
    // Glass debris — tiny chips along cracks
    this.chips = [];
    for (let i = 0; i < 80; i++) {
      this.chips.push({
        x: x + rand(-diag*0.3, diag*0.3),
        y: y + rand(-diag*0.3, diag*0.3),
        vx: rand(-80, 80), vy: rand(-80, 80),
        life: rand(0.2, 0.6), maxLife: rand(0.2, 0.6),
        size: rand(0.5, 2),
      });
    }
    this.ringR = 0; this.ringMax = diag*0.6;
    this.flashAlpha = 1.0; this.alive = true; this.elapsed = 0;
  }
  // Generate jagged intermediate points along a crack
  jitterPath(p1, p2, steps) {
    const pts = [{x: p1.x, y: p1.y}];
    for (let i = 1; i < steps; i++) {
      const r = i / steps;
      const px = p1.x + (p2.x-p1.x)*r;
      const py = p1.y + (p2.y-p1.y)*r;
      const jit = 8 * (1 - Math.abs(r-0.5)*2); // max jitter at midpoint
      pts.push({x: px + (Math.random()-0.5)*jit, y: py + (Math.random()-0.5)*jit});
    }
    pts.push({x: p2.x, y: p2.y});
    return pts;
  }
  update(dt) {
    this.elapsed += dt;
    this.flashAlpha = Math.max(0, 1 - this.elapsed/0.06);
    this.ringR += dt * Math.max(W,H)*2;
    this.cracks.forEach(c => {
      c.delay -= dt;
      if (c.delay <= 0 && c.progress < 1) c.progress = Math.min(1, c.progress + dt*10);
      if (c.progress >= 1) c.life -= dt;
    });
    this.fragments.forEach(f => {
      if (this.elapsed > 0.3 && !f.settled) {
        f.ox *= 0.88; f.oy *= 0.88; f.rot *= 0.88;
        if (Math.abs(f.ox) < 0.3) f.settled = true;
      }
    });
    this.chips.forEach(ch => { ch.x += ch.vx*dt; ch.y += ch.vy*dt; ch.life -= dt; });
    if (this.elapsed > 1.5) this.alive = false;
  }
  draw(ctx) {
    // Flash
    if (this.flashAlpha > 0) {
      ctx.globalAlpha = this.flashAlpha*0.8; ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
    }
    // Shockwave
    if (this.ringR < this.ringMax) {
      ctx.globalAlpha = Math.max(0, 0.5-this.elapsed/0.5);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5*(1-this.elapsed/1.5);
      ctx.beginPath(); ctx.arc(this.x, this.y, this.ringR, 0, Math.PI*2); ctx.stroke();
    }
    // Center glow
    const cr = 30 + this.elapsed*180;
    const ca = Math.max(0, 0.7-this.elapsed/0.6);
    if (ca > 0) {
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, cr);
      g.addColorStop(0, `rgba(255,255,255,${ca})`);
      g.addColorStop(0.4, `rgba(255,200,100,${ca*0.5})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, cr, 0, Math.PI*2); ctx.fill();
    }
    // Glass chips (tiny bright specks)
    this.chips.forEach(ch => {
      if (ch.life <= 0) return;
      const a = Math.max(0, ch.life/ch.maxLife);
      ctx.globalAlpha = a; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ch.x, ch.y, ch.size*a, 0, Math.PI*2); ctx.fill();
    });
    // Cracks with screen blend + crystalline width wobble
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'screen';
    this.cracks.forEach(c => {
      if (c.delay > 0 || c.progress <= 0 || c.life <= 0 || c.points.length < 2) return;
      const p = c.progress;
      const ep = 1 - Math.pow(1-p, 3);
      const a = Math.max(0, c.life/c.maxLife);
      const maxIdx = Math.floor((c.points.length-1) * ep);
      const wobble = 1 + Math.sin(p*20)*0.4; // crystalline fluctuation
      // Glow layer
      ctx.shadowBlur = c.isPrimary ? 10 : 4;
      ctx.shadowColor = 'rgba(200,230,255,0.8)';
      ctx.globalAlpha = a*0.5;
      ctx.strokeStyle = 'rgba(180,210,255,0.9)';
      ctx.lineWidth = (c.baseWidth+2)*wobble;
      ctx.beginPath(); ctx.moveTo(c.points[0].x, c.points[0].y);
      for (let i = 1; i <= maxIdx; i++) ctx.lineTo(c.points[i].x, c.points[i].y);
      ctx.stroke();
      // Core
      ctx.shadowBlur = 0;
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = c.baseWidth*wobble;
      ctx.beginPath(); ctx.moveTo(c.points[0].x, c.points[0].y);
      for (let i = 1; i <= maxIdx; i++) ctx.lineTo(c.points[i].x, c.points[i].y);
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over'; // reset
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
// Mouse parallax (3D rotation feel)
let mx = 0, my = 0;     // raw mouse position
let pmx = 0, pmy = 0;   // smoothed parallax offset

// --- Particle Arc (quantum connection between nearby particles)
const MAX_ARCS = 20;
let arcs = [];
class ArcFlash {
  constructor(x1, y1, x2, y2) {
    this.segs = [];
    this.buildFractal(x1, y1, x2, y2, 30);
    this.life = rand(0.04, 0.12);
    this.maxLife = this.life;
    this.flicker = rand(0.4, 1.0);
    this.alive = true;
    this.accentHue = rand(0,1) < 0.5 ? 195 : 275;
  }
  buildFractal(x1, y1, x2, y2, displace) {
    if (displace < 5) { this.segs.push({x1,y1,x2,y2}); return; }
    let mx = (x1+x2)/2, my = (y1+y2)/2;
    mx += (Math.random()-0.5) * displace;
    my += (Math.random()-0.5) * displace;
    this.buildFractal(x1, y1, mx, my, displace*0.5);
    this.buildFractal(mx, my, x2, y2, displace*0.5);
  }
  update(dt) { this.life -= dt; this.flicker = rand(0.3,1.0); if (this.life <= 0) this.alive = false; }
  draw(ctx, temp) {
    const a = Math.max(0, this.life / this.maxLife) * this.flicker;
    if (a < 0.02 || this.segs.length === 0) return;
    const glowCol = temp > 0.5 ? '#fff' : `hsla(${this.accentHue},80%,70%,1)`;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 8; ctx.shadowColor = glowCol;
    ctx.globalAlpha = a * 0.25; ctx.strokeStyle = glowCol; ctx.lineWidth = 2;
    ctx.beginPath(); this.segs.forEach(s => { ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); }); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.6;
    ctx.beginPath(); this.segs.forEach(s => { ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); }); ctx.stroke();
  }
}

// --- Center Energy Core state ---
let centerPulse = 0;      // 0..1, triggered by lightning/burst
let burstTimer = rand(8, 15);
let burstActive = 0;      // 0..1, burst intensity
let colorTemp = 0;        // 0=cold blue, 1=white hot

// Lightning v4 — midpoint displacement fractal + flicker + color edge
class Lightning {
  constructor(fromCenter = false) {
    let sx, sy, ex, ey;
    if (fromCenter) {
      sx = cx; sy = cy;
      const a = rand(0, Math.PI * 2);
      const len = rand(80, 280);
      ex = sx + Math.cos(a) * len;
      ey = sy + Math.sin(a) * len;
    } else {
      const edge = randInt(0, 3);
      if (edge === 0)      { sx = rand(0, W); sy = -10; }
      else if (edge === 1) { sx = W + 10; sy = rand(0, H); }
      else if (edge === 2) { sx = rand(0, W); sy = H + 10; }
      else                 { sx = -10; sy = rand(0, H); }
      ex = cx + rand(-200, 200);
      ey = cy + rand(-150, 150);
    }
    // Store all paths (trunk + branches) as arrays of {x,y}
    this.segs = []; // flat array of {x1,y1,x2,y2} for batch rendering
    this.buildFractal(sx, sy, ex, ey, Math.max(W, H) * 0.18, true);
    this.life = rand(0.04, 0.45);
    this.maxLife = this.life;
    this.alive = true;
    this.flicker = rand(0.3, 1.0);
    this.flickerTimer = rand(0.015, 0.06); // random flicker interval
    this.triggeredPulse = !fromCenter;
    this.accentHue = rand(0,1) < 0.5 ? 195 : 275;
  }
  buildFractal(x1, y1, x2, y2, displace, isTrunk) {
    if (displace < 4) {
      this.segs.push({x1, y1, x2, y2});
      return;
    }
    let mx = (x1+x2)/2, my = (y1+y2)/2;
    mx += (Math.random()-0.5) * displace;
    my += (Math.random()-0.5) * displace;
    this.buildFractal(x1, y1, mx, my, displace*0.5, isTrunk);
    this.buildFractal(mx, my, x2, y2, displace*0.5, isTrunk);
    if (isTrunk && Math.random() < 0.12 && displace > 12) {
      const ba = Math.atan2(y2-y1, x2-x1) + (rand(0,1)<0.5?-1:1)*rand(0.8,1.4);
      const bl = displace * rand(1.5, 3);
      this.buildFractal(mx, my, mx+Math.cos(ba)*bl, my+Math.sin(ba)*bl, displace*0.3, false);
    }
  }
  update(dt) {
    this.life -= dt;
    this.flickerTimer -= dt;
    if (this.flickerTimer <= 0) {
      this.flicker = rand(0.2, 1.0);
      this.flickerTimer = rand(0.01, 0.07);
    }
    if (this.life <= 0) { this.alive = false; if (this.triggeredPulse) { centerPulse = 1.0; this.triggeredPulse = false; } }
  }
  draw(ctx, temp) {
    const a = Math.max(0, this.life / this.maxLife) * this.flicker;
    if (a < 0.02 || this.segs.length === 0) return;
    const isHot = temp > 0.5;
    const glowCol = isHot ? '#ffffff' : `hsla(${this.accentHue},80%,70%,1)`;
    ctx.lineCap = 'round';
    // Batch: draw ALL segments in ONE path per layer
    // Layer 1: glow
    ctx.shadowBlur = 14; ctx.shadowColor = glowCol;
    ctx.globalAlpha = a * 0.3; ctx.strokeStyle = glowCol; ctx.lineWidth = 4;
    ctx.beginPath();
    this.segs.forEach(s => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
    ctx.stroke();
    // Layer 2: mid
    ctx.shadowBlur = 5; ctx.shadowColor = '#aaddff';
    ctx.globalAlpha = a * 0.55; ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 2;
    ctx.beginPath();
    this.segs.forEach(s => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
    ctx.stroke();
    // Layer 3: core
    ctx.shadowBlur = 0;
    ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    this.segs.forEach(s => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
    ctx.stroke();
  }
}

const METEOR_START = 0.3;
const GATHER_START = 2.2;
const LABELS_SHOW = 4.8;
let bolts = [];
let boltTimer = 0;
let boltBurst = 0;

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

  // Stars: static during animation, warp tunnel in IDLE
  if (phase === Phase.IDLE) {
    const freeze = hoveredNebula ? 0.08 : 0.75;
    stars.forEach(s => { s.updateWarp(dt * freeze, globalTime); s.drawWarp(ctx); });

    // --- Center Energy Core ---
    const coreBase = 22;
    const coreR = coreBase + Math.sin(globalTime * 2) * 4 + centerPulse * 50 + burstActive * 120;
    const coreAlpha = 0.15 + centerPulse * 0.7 + burstActive * 1.0;
    const coreCol = colorTemp > 0.5
      ? `rgba(255,255,255,` : `rgba(180,220,255,`;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.5);
    g.addColorStop(0, coreCol + (coreAlpha * 1.2) + ')');
    g.addColorStop(0.3, coreCol + (coreAlpha * 0.5) + ')');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2); ctx.fill();

    // Decay center pulse / burst
    centerPulse = Math.max(0, centerPulse - dt * 3);
    burstActive = Math.max(0, burstActive - dt * 2);
    colorTemp += (0 - colorTemp) * 2 * dt; // recover toward cold

    // --- Particle Arc Lightning ---
    for (let i = 0; i < stars.length; i += 8) {
      for (let j = i + 4; j < stars.length; j += 8) {
        const a = stars[i], b = stars[j];
        const d = Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
        if (d < 80 && Math.random() < 0.002) {
          arcs.push(new ArcFlash(a.x, a.y, b.x, b.y));
          if (arcs.length > MAX_ARCS) arcs.shift();
        }
      }
    }
    arcs.forEach(a => { a.update(dt * (freeze || 0.75)); a.draw(ctx, colorTemp); });
    arcs = arcs.filter(a => a.alive);

    // --- Edge Lightning ---
    boltTimer -= dt;
    if (boltTimer <= 0) {
      const count = boltBurst > 0 ? boltBurst : (Math.random() < 0.12 ? randInt(2, 3) : 1);
      for (let i = 0; i < count; i++) {
        setTimeout(() => { if (phase === Phase.IDLE) bolts.push(new Lightning()); }, i * rand(40, 150));
      }
      boltTimer = rand(1.5, 6);
      boltBurst = 0;
      if (bolts.length > 3) bolts.splice(0, bolts.length - 3);
    }
    const boltDt = hoveredNebula ? dt * 0.15 : dt;
    bolts.forEach(b => { b.update(boltDt); b.draw(ctx, colorTemp); });
    bolts = bolts.filter(b => b.alive);
    if (!hoveredNebula && Math.random() < 0.001) boltBurst = randInt(2, 3);

    // --- Energy Burst (center glow only, no outward bolts) ---
    burstTimer -= dt;
    if (burstTimer <= 0 && !hoveredNebula) {
      burstActive = 1.0;
      colorTemp = 1.0;
      burstTimer = rand(7, 22);
    }
  } else {
    const sparkle = hoveredNebula ? 1 : 0;
    stars.forEach(s => s.draw(ctx, globalTime, sparkle));
  }

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

  // --- Show labels + activate warp ---
  if (allFormed && globalTime > LABELS_SHOW && phase !== Phase.IDLE) {
    showLabels();
    phase = Phase.IDLE;
    stars.forEach(s => s.initWarp()); // kick off time tunnel
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
  const pos = getPos(e);
  mx = pos.x; my = pos.y; // always track for parallax
  if (phase !== Phase.IDLE) return;
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

// --- Skip (double-click, homepage only) ---------------------
if (canvas) canvas.addEventListener('dblclick', () => {
  if (phase >= Phase.IDLE) return;

  // 1. Kill meteor + glass
  if (meteor) meteor.alive = false;
  glassShatter = null;

  // 2. Show all text immediately, clean up typewriter state
  typeLines.forEach(l => {
    l.el.textContent = l.text;
    l.el.classList.add('visible');
    l.el.classList.remove('typing');
  });
  twDone = true;
  twActive = false;

  // 3. Transfer scattered particles to nebulae (MUST do before clearing)
  if (scatteredParticles.length > 0) {
    startGather();
  }
  scatteredParticles = [];

  // 4. Force every nebula particle to be settled at its correct orbit position
  nebulae.forEach(n => {
    const pos = n.getOrbitPos(globalTime);
    if (!n.hasParticles) {
      // Direct seed if no particles were assigned
      for (let i = 0; i < 130; i++) {
        const p = new Particle(
          pos.x + rand(-n.radius, n.radius),
          pos.y + rand(-n.radius, n.radius),
          0, 0, rand(3, 8),
          `hsl(${n.hue},${n.sat}%,${rand(n.light - 15, n.light + 15)}%)`,
          rand(1, 3.5));
        p.orbitAngle = rand(0, Math.PI * 2);
        p.orbitRadius = rand(10, n.radius);
        p.orbitSpeed = rand(0.3, 0.9);
        p.gravitating = false;
        p.nebula = n;
        n.particles.push(p);
      }
      n.hasParticles = true;
    } else {
      // Teleport all gravitating particles to settled orbit positions
      n.particles.forEach(p => {
        if (p.gravitating) {
          p.x = pos.x + rand(-n.radius, n.radius);
          p.y = pos.y + rand(-n.radius, n.radius);
          p.vx = 0; p.vy = 0;
          p.gravitating = false;
          p.orbitAngle = rand(0, Math.PI * 2);
          p.orbitRadius = rand(10, n.radius);
          p.orbitSpeed = rand(0.3, 0.9);
          p.life = rand(3, 8);
          p.maxLife = p.life;
        }
      });
    }
  });

  // 5. Show labels immediately
  showLabels();

  // 6. Enter idle + warp
  phase = Phase.IDLE;
  stars.forEach(s => s.initWarp());
});

// --- Boot ---------------------------------------------------
function boot() {
  // Only run cosmic animation on homepage (where canvas exists)
  if (!canvas) return;
  if (!ctx) {
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
