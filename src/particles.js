/* Floating ambient particles: warm dust motes + occasional tiny hearts.
   Drawn on a full-screen canvas behind the scenes but above the bg. */

import { state } from "./state.js";

export class Particles {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.motes = [];
    this.hearts = [];
    this.running = false;
    this.rafId = 0;
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize, { passive: true });
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    const target = Math.min(60, Math.floor((w * h) / 36000));
    this.motes.length = 0;
    for (let i = 0; i < target; i++) {
      this.motes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.9,
        vy: -(0.06 + Math.random() * 0.22),
        vx: (Math.random() - 0.5) * 0.12,
        a: 0.12 + Math.random() * 0.3,
        hue: Math.random() > 0.25 ? 0 : 1, // rose or gold tint
      });
    }
    this.hearts.length = 0;
    if (state.reducedMotion) this.stop();
  }

  heartPath(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y + s * 0.32);
    c.bezierCurveTo(x, y, x - s * 0.5, y - s * 0.18, x - s * 0.5, y + s * 0.1);
    c.bezierCurveTo(x - s * 0.5, y + s * 0.3, x, y + s * 0.44, x, y + s * 0.5);
    c.bezierCurveTo(x, y + s * 0.44, x + s * 0.5, y + s * 0.3, x + s * 0.5, y + s * 0.1);
    c.bezierCurveTo(x + s * 0.5, y - s * 0.18, x, y, x, y + s * 0.32);
    c.fill();
  }

  seedHeart(explode = false) {
    const x = explode ? this.w / 2 + (Math.random() - 0.5) * 200 : Math.random() * this.w;
    const y = explode ? this.h * 0.52 : this.h + 20;
    this.hearts.push({
      x,
      y,
      s: explode ? 3 + Math.random() * 6 : 3 + Math.random() * 7,
      vy: explode ? -(0.5 + Math.random() * 1.1) : -(0.2 + Math.random() * 0.5),
      vx: (Math.random() - 0.5) * (explode ? 0.9 : 0.15),
      a: explode ? 0.5 + Math.random() * 0.3 : 0.1 + Math.random() * 0.18,
      life: 1,
      decay: explode ? 0.006 + Math.random() * 0.01 : 0.0015,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.05,
    });
  }

  burstHearts() {
    if (state.reducedMotion) return;
    for (let i = 0; i < 10; i++) this.seedHeart(true);
  }

  start() {
    if (state.reducedMotion || this.running) return;
    this.running = true;
    const step = () => {
      if (!this.running) return;
      const c = this.ctx;
      c.clearRect(0, 0, this.w, this.h);

      for (const m of this.motes) {
        m.y += m.vy;
        m.x += m.vx + Math.sin(m.y * 0.008) * 0.06;
        if (m.y < -6) {
          m.y = this.h + 6;
          m.x = Math.random() * this.w;
        }
        const tw = 0.7 + 0.3 * Math.sin(m.y * 0.01 + m.r);
        c.globalAlpha = m.a * tw;
        c.fillStyle = m.hue ? "rgba(246,168,160,1)" : "rgba(232,195,145,1)";
        c.beginPath();
        c.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        c.fill();
      }

      if (this.hearts.length < 8 && Math.random() < 0.008) this.seedHeart(false);

      c.globalAlpha = 1;
      for (let i = this.hearts.length - 1; i >= 0; i--) {
        const h = this.hearts[i];
        h.y += h.vy;
        h.x += h.vx;
        h.rot += h.vrot;
        h.life -= h.decay;
        if (h.life <= 0) {
          this.hearts.splice(i, 1);
          continue;
        }
        c.save();
        c.translate(h.x, h.y);
        c.rotate(h.rot);
        c.globalAlpha = Math.max(0, h.a * h.life);
        c.fillStyle = "rgba(246,168,160,1)";
        this.heartPath(c, 0, 0, h.s);
        c.restore();
      }
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }
}